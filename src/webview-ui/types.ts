export type { RealmFieldInfo, RealmSchemaInfo, QueryResult, RealmRow } from '@shared/types';

export interface FilterRow {
  id: string;
  logic: string;
  field: string;
  operator: string;
  value: string;
}

export type TabType = 'visual' | 'rql';
