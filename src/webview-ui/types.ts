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

export interface QueryResult {
    data: any[];
    totalCount: number;
    page: number;
    pageSize: number;
    executionTimeMs: number;
}

export interface FilterRow {
    id: string;
    logic: string;
    field: string;
    operator: string;
    value: string;
}

export type TabType = 'visual' | 'rql';
