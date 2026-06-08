import type { QueryResult, RealmSchemaInfo } from '../shared/types';

export interface IRealmBackend {
  openRealm(filePath: string, readOnly?: boolean): Promise<RealmSchemaInfo[]>;
  reopenRealm(writeable: boolean): Promise<RealmSchemaInfo[]>;
  getSchema(): RealmSchemaInfo[];
  executeQuery(
    objectType: string,
    filter: string,
    args: unknown[],
    page: number,
    pageSize: number,
    limit?: number
  ): Promise<QueryResult>;
  countQuery(
    objectType: string,
    filter: string,
    args?: unknown[]
  ): Promise<{ count: number; executionTimeMs: number }>;
  closeRealm(): void;
  isOpen(): boolean;
  /** Clear any cached schema so the next getSchema() re-reads from Realm. */
  invalidateSchemaCache(): void;
  insertRow(objectType: string, data: Record<string, unknown>): Promise<void>;
  updateRow(objectType: string, primaryKey: unknown, field: string, value: unknown): Promise<void>;
  updateRows(objectType: string, updates: Array<{ primaryKey: unknown; field: string; value: unknown }>): Promise<void>;
  deleteRow(objectType: string, primaryKey: unknown): Promise<void>;
}
