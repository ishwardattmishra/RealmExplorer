import React from 'react';
import { QueryResult, RealmSchemaInfo } from '../types';
import { SmartCell } from './SmartCell';

interface DataTableProps {
    results: QueryResult | null;
    visibleKeys: string[];
    currentSchema?: RealmSchemaInfo;
    selectedRow: Record<string, any> | null;
    onSelectRow: (row: Record<string, any>) => void;
    loading: boolean;
    error: string | null;
}

export const DataTable: React.FC<DataTableProps> = ({
    results,
    visibleKeys,
    currentSchema,
    selectedRow,
    onSelectRow,
    loading,
    error
}) => {
    return (
        <div className="table-viewport">
            {loading && <div className="overlay"><div className="spinner"></div></div>}
            {error && <div className="error">{error}</div>}
            
            {results && results.data.length > 0 ? (
                <table>
                    <thead>
                        <tr>
                            {visibleKeys.map(key => (
                                <th key={key}>{key}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {results.data.map((row, i) => {
                            const rowKey = (currentSchema?.primaryKey && row[currentSchema.primaryKey]) || i;
                            return (
                                <tr 
                                    key={rowKey} 
                                    className={selectedRow === row ? 'selected' : ''}
                                    onClick={() => onSelectRow(row)}
                                >
                                    {visibleKeys.map((key) => (
                                        <td key={key}>
                                            <SmartCell 
                                                value={row[key]} 
                                                typeInfo={currentSchema?.properties[key]} 
                                            />
                                        </td>
                                    ))}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            ) : results && !loading && (
                <div className="empty-state">
                    <div className="empty-state-icon">🔍</div>
                    <h3>No results found</h3>
                </div>
            )}
        </div>
    );
};
