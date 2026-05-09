import type { QueryResult, RealmSchemaInfo } from '../shared/types';
import type { ILogger } from './ilogger';
import type { IRealmBackend } from './irealm-backend';
import { createLoggerFacade } from './logger';
import { QueryExecutor } from './query-executor';
import { RealmSession } from './realm-session';
import { mapRealmSchemaToInfo } from './schema-mapper';
import { TypeCoercer } from './type-coercer';

export type { QueryResult, RealmFieldInfo, RealmSchemaInfo, RealmRow } from '../shared/types';

/**
 * Facade over session, schema mapping, type coercion, and query execution.
 */
export class RealmBackend implements IRealmBackend {
  private readonly session = new RealmSession();
  private readonly typeCoercer: TypeCoercer;
  private readonly queryExecutor: QueryExecutor;

  constructor(private readonly logger: ILogger = createLoggerFacade()) {
    this.typeCoercer = new TypeCoercer(this.logger);
    this.queryExecutor = new QueryExecutor(this.session, this.typeCoercer, this.logger);
  }

  async openRealm(filePath: string, readOnly = true): Promise<RealmSchemaInfo[]> {
    this.logger.info(`Opening Realm: ${filePath} (readOnly: ${readOnly})`);
    try {
      this.logger.info('Calling Realm.open...');
      await this.session.open(filePath, readOnly);
      this.logger.info('Realm opened successfully');

      const schema = this.getSchema();
      this.logger.info(`Loaded schema with ${schema.length} object types`);
      return schema;
    } catch (error) {
      this.logger.error('Failed to open Realm:', error);
      throw error;
    }
  }

  getSchema(): RealmSchemaInfo[] {
    if (!this.session.isOpen()) {
      return [];
    }

    try {
      const realm = this.session.getRealmOrThrow();
      return mapRealmSchemaToInfo(realm, this.logger);
    } catch (error) {
      this.logger.error('Error reading schema:', error);
      return [];
    }
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
    try {
      this.session.close();
    } catch (error) {
      this.logger.error('Error closing Realm:', error);
    }
  }

  isOpen(): boolean {
    return this.session.isOpen();
  }
}
