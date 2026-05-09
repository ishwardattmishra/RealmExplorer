import React from 'react';

import type { FilterRow, RealmSchemaInfo, TabType } from '../types';

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

const OPERATORS = ['==', '!=', '>', '<', '>=', '<=', 'CONTAINS', 'BEGINSWITH', 'ENDSWITH'] as const;

export const FilterPanel: React.FC<FilterPanelProps> = ({
  activeTab,
  onTabChange,
  visualFilters,
  onVisualFiltersChange,
  rqlFilter,
  onRqlFilterChange,
  currentSchema,
  onAddFilterRow,
}) => {
  const updateFilterRow = (id: string, updates: Partial<FilterRow>) => {
    onVisualFiltersChange(visualFilters.map((row) => (row.id === id ? { ...row, ...updates } : row)));
  };

  const removeFilterRow = (id: string) => {
    onVisualFiltersChange(visualFilters.filter((row) => row.id !== id));
  };

  const visualPanelId = 'filter-panel-visual';
  const rqlPanelId = 'filter-panel-rql';

  return (
    <section className="filter-section" aria-label="Query filters">
      <div className="tab-container" role="tablist" aria-label="Filter mode">
        <button
          type="button"
          role="tab"
          id="tab-visual"
          aria-selected={activeTab === 'visual'}
          aria-controls={visualPanelId}
          className={`tab-item ${activeTab === 'visual' ? 'active' : ''}`}
          onClick={() => onTabChange('visual')}
        >
          Visual Filter
        </button>
        <button
          type="button"
          role="tab"
          id="tab-rql"
          aria-selected={activeTab === 'rql'}
          aria-controls={rqlPanelId}
          className={`tab-item ${activeTab === 'rql' ? 'active' : ''}`}
          onClick={() => onTabChange('rql')}
        >
          Raw RQL
        </button>
      </div>

      {activeTab === 'visual' ? (
        <div
          id={visualPanelId}
          role="tabpanel"
          aria-labelledby="tab-visual"
          className="filter-box"
        >
          {visualFilters.length === 0 ? (
            <div className="filter-row">
              <button type="button" className="mini-btn" onClick={onAddFilterRow}>
                + Add Filter
              </button>
            </div>
          ) : (
            visualFilters.map((row, index) => (
              <div key={row.id} className="filter-row">
                {index > 0 ? (
                  <select
                    aria-label={`Row ${index + 1} logic`}
                    value={row.logic}
                    onChange={(e) => updateFilterRow(row.id, { logic: e.currentTarget.value })}
                  >
                    <option value="AND">AND</option>
                    <option value="OR">OR</option>
                  </select>
                ) : (
                  <span className="filter-label">WHERE</span>
                )}
                <select
                  aria-label={`Row ${index + 1} field`}
                  value={row.field}
                  onChange={(e) => updateFilterRow(row.id, { field: e.currentTarget.value })}
                >
                  <option value="">Select field...</option>
                  {currentSchema &&
                    Object.keys(currentSchema.properties).map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                </select>
                <select
                  aria-label={`Row ${index + 1} operator`}
                  value={row.operator}
                  onChange={(e) => updateFilterRow(row.id, { operator: e.currentTarget.value })}
                >
                  {OPERATORS.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  aria-label={`Row ${index + 1} value`}
                  placeholder="Value"
                  value={row.value}
                  onChange={(e) => updateFilterRow(row.id, { value: e.currentTarget.value })}
                />
                {index === 0 && (
                  <button type="button" className="mini-btn" onClick={onAddFilterRow}>
                    + Add Row
                  </button>
                )}
                {index > 0 && (
                  <button
                    type="button"
                    className="mini-btn"
                    aria-label={`Remove filter row ${index + 1}`}
                    onClick={() => removeFilterRow(row.id)}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      ) : (
        <div id={rqlPanelId} role="tabpanel" aria-labelledby="tab-rql">
          <label htmlFor="rql-textarea" className="sr-only">
            Raw RQL filter
          </label>
          <textarea
            id="rql-textarea"
            className="rql-input"
            placeholder="e.g. age > 21 AND name CONTAINS 'John'"
            value={rqlFilter}
            onChange={(e) => onRqlFilterChange(e.currentTarget.value)}
          />
        </div>
      )}
    </section>
  );
};
