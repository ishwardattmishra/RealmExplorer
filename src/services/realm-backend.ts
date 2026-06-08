import type { QueryResult, RealmSchemaInfo } from '../shared/types';
import type { ILogger } from './ilogger';
import type { IRealmBackend } from './irealm-backend';
import { createLoggerFacade } from './logger';
import { QueryExecutor } from './query-executor';
import { RealmSession } from './realm-session';
import { mapRealmSchemaToInfo } from './schema-mapper';
import { TypeCoercer } from './type-coercer';



/**
 * Facade over session, schema mapping, type coercion, and query execution.
 */
export class RealmBackend implements IRealmBackend {
  private readonly session = new RealmSession();
  private readonly typeCoercer: TypeCoercer;
  private readonly queryExecutor: QueryExecutor;
  /** Last opened file path, needed for reopenRealm */
  private currentFilePath: string | undefined;
  /** Cached schema to avoid re-reading on every getSchema() / CRUD call */
  private cachedSchema: RealmSchemaInfo[] | undefined;

  constructor(private readonly logger: ILogger = createLoggerFacade()) {
    this.typeCoercer = new TypeCoercer(this.logger);
    this.queryExecutor = new QueryExecutor(this.session, this.typeCoercer, this.logger);
  }

  async openRealm(filePath: string, readOnly = true): Promise<RealmSchemaInfo[]> {
    this.logger.info(`Opening Realm: ${filePath} (readOnly: ${readOnly})`);
    try {
      this.logger.info('Calling Realm.open...');
      await this.session.open(filePath, readOnly);
      this.currentFilePath = filePath;
      this.cachedSchema = undefined; // invalidate cache
      this.logger.info('Realm opened successfully');

      const schema = this.getSchema();
      this.logger.info(`Loaded schema with ${schema.length} object types`);
      return schema;
    } catch (error) {
      this.logger.error('Failed to open Realm:', error);
      throw error;
    }
  }

  async reopenRealm(writeable: boolean): Promise<RealmSchemaInfo[]> {
    if (!this.currentFilePath) {
      throw new Error('No Realm file has been opened yet.');
    }
    this.logger.info(`Reopening Realm (writeable: ${writeable})`);
    return this.openRealm(this.currentFilePath, !writeable);
  }

  getSchema(): RealmSchemaInfo[] {
    if (!this.session.isOpen()) {
      return [];
    }

    if (this.cachedSchema) {
      return this.cachedSchema;
    }

    try {
      const realm = this.session.getRealmOrThrow();
      this.cachedSchema = mapRealmSchemaToInfo(realm, this.logger);
      return this.cachedSchema;
    } catch (error) {
      this.logger.error('Error reading schema:', error);
      return [];
    }
  }

  /** Look up cached schema for a single object type. */
  private getSchemaForType(objectType: string): RealmSchemaInfo | undefined {
    return this.getSchema().find((s) => s.name === objectType);
  }

  async executeQuery(
    objectType: string,
    filter: string,
    args: unknown[],
    page: number,
    pageSize: number,
    limit?: number
  ): Promise<QueryResult> {
    try {
      return await this.queryExecutor.executeQuery(objectType, filter, args, page, pageSize, limit);
    } catch (error) {
      this.logger.error('Query execution failed:', error);
      throw error;
    }
  }

  async countQuery(
    objectType: string,
    filter: string,
    args: unknown[] = []
  ): Promise<{ count: number; executionTimeMs: number }> {
    try {
      return await this.queryExecutor.countQuery(objectType, filter, args);
    } catch (error) {
      this.logger.error('Count query failed:', error);
      throw error;
    }
  }

  closeRealm(): void {
    if (!this.session.isOpen()) {
      return;
    }
    this.logger.info('Closing Realm');
    this.cachedSchema = undefined; // invalidate cache
    try {
      this.session.close();
    } catch (error) {
      this.logger.error('Error closing Realm:', error);
    }
  }

  isOpen(): boolean {
    return this.session.isOpen();
  }

  invalidateSchemaCache(): void {
    this.cachedSchema = undefined;
  }

  // ── CRUD ────────────────────────────────────────────────────────────────────

  /**
   * Insert a new row. Declared async for IRealmBackend interface compliance;
   * the underlying realm.write() is synchronous.
   */
  async insertRow(objectType: string, data: Record<string, unknown>): Promise<void> {
    this.logger.info(`Inserting row into ${objectType}`, data);
    const realm = this.session.getRealmOrThrow();
    realm.write(() => {
      realm.create(objectType, data);
    });
  }

  /**
   * Update a single field on an existing row by primary key. Declared async for
   * IRealmBackend interface compliance; the underlying realm.write() is synchronous.
   */
  async updateRow(
    objectType: string,
    primaryKey: unknown,
    field: string,
    value: unknown
  ): Promise<void> {
    this.logger.info(`Updating ${objectType}[pk=${String(primaryKey)}].${field}`);
    const realm = this.session.getRealmOrThrow();
    const schema = this.getSchemaForType(objectType);
    if (!schema?.primaryKey) {
      throw new Error(`Cannot update: "${objectType}" has no primary key.`);
    }
    const obj = realm.objectForPrimaryKey(objectType, primaryKey as Parameters<typeof realm.objectForPrimaryKey>[1]);
    if (!obj) {
      throw new Error(`Object not found: ${objectType}[pk=${String(primaryKey)}]`);
    }
    realm.write(() => {
      (obj as Record<string, unknown>)[field] = value;
    });
  }

  /**
   * Update multiple fields across multiple rows in a single write transaction.
   */
  async updateRows(
    objectType: string,
    updates: Array<{ primaryKey: unknown; field: string; value: unknown }>
  ): Promise<void> {
    this.logger.info(`Updating ${updates.length} fields in ${objectType}`);
    const realm = this.session.getRealmOrThrow();
    const schema = this.getSchemaForType(objectType);
    if (!schema?.primaryKey) {
      throw new Error(`Cannot update: "${objectType}" has no primary key.`);
    }
    realm.write(() => {
      for (const update of updates) {
        const obj = realm.objectForPrimaryKey(objectType, update.primaryKey as Parameters<typeof realm.objectForPrimaryKey>[1]);
        if (!obj) {
          throw new Error(`Object not found: ${objectType}[pk=${String(update.primaryKey)}]`);
        }
        (obj as Record<string, unknown>)[update.field] = update.value;
      }
    });
  }

  /**
   * Delete a row by primary key. Declared async for IRealmBackend interface compliance;
   * the underlying realm.write() is synchronous.
   */
  async deleteRow(objectType: string, primaryKey: unknown): Promise<void> {
    this.logger.info(`Deleting ${objectType}[pk=${String(primaryKey)}]`);
    const realm = this.session.getRealmOrThrow();
    const schema = this.getSchemaForType(objectType);
    if (!schema?.primaryKey) {
      throw new Error(`Cannot delete: "${objectType}" has no primary key.`);
    }
    const obj = realm.objectForPrimaryKey(objectType, primaryKey as Parameters<typeof realm.objectForPrimaryKey>[1]);
    if (!obj) {
      throw new Error(`Object not found: ${objectType}[pk=${String(primaryKey)}]`);
    }
    realm.write(() => {
      realm.delete(obj);
    });
  }
}
