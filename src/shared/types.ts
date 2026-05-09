/**
 * Shared DTOs for extension host and webview UI.
 */

export interface RealmFieldInfo {
  name: string;
  type: string;
  optional?: boolean;
  objectType?: string;
}

export interface RealmSchemaInfo {
  name: string;
  primaryKey?: string;
  properties: Record<string, RealmFieldInfo>;
}

/** One row in a query result page (Realm object JSON or plain value). */
export type RealmRow = Record<string, unknown>;

export interface QueryResult {
  data: RealmRow[];
  totalCount: number;
  page: number;
  pageSize: number;
  executionTimeMs: number;
}
