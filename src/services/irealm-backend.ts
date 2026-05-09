import type { QueryResult, RealmSchemaInfo } from '../shared/types';

export interface IRealmBackend {
  openRealm(filePath: string, readOnly?: boolean): Promise<RealmSchemaInfo[]>;
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
}
