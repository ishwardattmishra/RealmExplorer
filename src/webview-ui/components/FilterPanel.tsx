import React from 'react';
import { FilterRow, RealmSchemaInfo, TabType } from '../types';

interface FilterPanelProps {
    activeTab: TabType;
    onTabChange: (tab: TabType) => void;
    visualFilters: FilterRow[];
    onVisualFiltersChange: (filters: FilterRow[]) => void;
    rqlFilter: string;
    onRqlFilterChange: (filter: string) => void;
    currentSchema?: RealmSchemaInfo;
    onAddFilterRow: () => void;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
    activeTab,
    onTabChange,
    visualFilters,
    onVisualFiltersChange,
    rqlFilter,
    onRqlFilterChange,
    currentSchema,
    onAddFilterRow
}) => {
    const operators = ['==', '!=', '>', '<', '>=', '<=', 'CONTAINS', 'BEGINSWITH', 'ENDSWITH'];

    const updateFilterRow = (id: string, updates: Partial<FilterRow>) => {
        onVisualFiltersChange(visualFilters.map(row => 
            row.id === id ? { ...row, ...updates } : row
        ));
    };

    const removeFilterRow = (id: string) => {
        onVisualFiltersChange(visualFilters.filter(row => row.id !== id));
    };

    return (
        <section className="filter-section">
            <div className="tab-container">
                <div 
                    className={`tab-item ${activeTab === 'visual' ? 'active' : ''}`} 
                    onClick={() => onTabChange('visual')}
                >
                    Visual Filter
                </div>
                <div 
                    className={`tab-item ${activeTab === 'rql' ? 'active' : ''}`} 
                    onClick={() => onTabChange('rql')}
                >
                    Raw RQL
                </div>
            </div>

            {activeTab === 'visual' ? (
                <div className="filter-box">
                    {visualFilters.length === 0 ? (
                        <div className="filter-row">
                            <button className="mini-btn" onClick={onAddFilterRow}>+ Add Filter</button>
                        </div>
                    ) : (
                        visualFilters.map((row, index) => (
                            <div key={row.id} className="filter-row">
                                {index > 0 ? (
                                    <select 
                                        value={row.logic} 
                                        onChange={(e) => updateFilterRow(row.id, { logic: e.target.value })}
                                    >
                                        <option value="AND">AND</option>
                                        <option value="OR">OR</option>
                                    </select>
                                ) : (
                                    <span className="filter-label">WHERE</span>
                                )}
                                <select 
                                    value={row.field} 
                                    onChange={(e) => updateFilterRow(row.id, { field: e.target.value })}
                                >
                                    <option value="">Select field...</option>
                                    {currentSchema && Object.keys(currentSchema.properties).map(p => (
                                        <option key={p} value={p}>{p}</option>
                                    ))}
                                </select>
                                <select 
                                    value={row.operator} 
                                    onChange={(e) => updateFilterRow(row.id, { operator: e.target.value })}
                                >
                                    {operators.map(o => <option key={o} value={o}>{o}</option>)}
                                </select>
                                <input 
                                    type="text" 
                                    placeholder="Value" 
                                    value={row.value} 
                                    onChange={(e) => updateFilterRow(row.id, { value: e.target.value })} 
                                />
                                {index === 0 && <button className="mini-btn" onClick={onAddFilterRow}>+ Add Row</button>}
                                {index > 0 && <button className="mini-btn" onClick={() => removeFilterRow(row.id)}>✕</button>}
                            </div>
                        ))
                    )}
                </div>
            ) : (
                <textarea 
                    className="rql-input"
                    placeholder="e.g. age > 21 AND name CONTAINS 'John'"
                    value={rqlFilter}
                    onChange={(e) => onRqlFilterChange(e.target.value)}
                />
            )}
        </section>
    );
};
