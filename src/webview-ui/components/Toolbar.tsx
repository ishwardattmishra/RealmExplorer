import React from 'react';
import { RealmSchemaInfo } from '../types';

interface ToolbarProps {
    schema: RealmSchemaInfo[];
    objectType: string;
    onObjectTypeChange: (type: string) => void;
    pageSize: number;
    onPageSizeChange: (size: number) => void;
    limit: number;
    onLimitChange: (limit: number) => void;
    onRunQuery: () => void;
    loading: boolean;
}

export const Toolbar: React.FC<ToolbarProps> = ({
    schema,
    objectType,
    onObjectTypeChange,
    pageSize,
    onPageSizeChange,
    limit,
    onLimitChange,
    onRunQuery,
    loading
}) => {
    return (
        <section className="toolbar">
            <div className="toolbar-row">
                <div className="input-group">
                    <label htmlFor="object-type-select">Object Type</label>
                    <select 
                        id="object-type-select"
                        value={objectType} 
                        onChange={(e) => onObjectTypeChange((e.target as HTMLSelectElement).value)}
                    >
                        {schema.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                    </select>
                </div>
                <div className="input-group">
                    <label htmlFor="page-size-select">Page Size</label>
                    <select 
                        id="page-size-select"
                        value={pageSize} 
                        onChange={(e) => onPageSizeChange(Number((e.target as HTMLSelectElement).value))}
                    >
                        {[20, 50, 100, 500].map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                </div>
                <div className="input-group">
                    <label htmlFor="total-limit-input">Total Limit</label>
                    <input 
                        id="total-limit-input"
                        type="number" 
                        value={limit} 
                        onChange={(e) => onLimitChange(Number((e.target as HTMLInputElement).value))}
                        min="1"
                        max="50000"
                        style={{ width: '80px' }}
                    />
                </div>
                <button 
                    className="btn btn-primary" 
                    onClick={onRunQuery} 
                    disabled={loading || !objectType}
                >
                    ▶ Run Query
                </button>
            </div>
        </section>
    );
};
