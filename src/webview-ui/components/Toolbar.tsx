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
                    <label>Object Type</label>
                    <select value={objectType} onChange={(e) => onObjectTypeChange(e.target.value)}>
                        {schema.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                    </select>
                </div>
                <div className="input-group">
                    <label>Page Size</label>
                    <select value={pageSize} onChange={(e) => onPageSizeChange(Number(e.target.value))}>
                        {[20, 50, 100, 500].map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                </div>
                <div className="input-group">
                    <label>Total Limit</label>
                    <input 
                        type="number" 
                        value={limit} 
                        onChange={(e) => onLimitChange(Number(e.target.value))}
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
