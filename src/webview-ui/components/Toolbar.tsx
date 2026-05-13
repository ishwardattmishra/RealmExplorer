import React from 'react';

import type { RealmSchemaInfo } from '../types';

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
  editMode: boolean;
  onAddRow: () => void;
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
  loading,
  editMode,
  onAddRow,
}) => {
  return (
    <section className="toolbar" aria-label="Query parameters">
      <div className="toolbar-row">
        <div className="input-group">
          <label htmlFor="object-type-select">Object Type</label>
          <select
            id="object-type-select"
            value={objectType}
            onChange={(e) => onObjectTypeChange(e.currentTarget.value)}
          >
            {schema.map((s) => (
              <option
                key={s.name}
                value={s.name}
                disabled={s.embedded === true}
                title={s.embedded ? 'Embedded objects cannot be queried directly' : undefined}
              >
                {s.name}{s.embedded ? ' [embedded]' : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="input-group">
          <label htmlFor="page-size-select">Page Size</label>
          <select
            id="page-size-select"
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.currentTarget.value))}
          >
            {[20, 50, 100, 500].map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div className="input-group">
          <label htmlFor="total-limit-input">Total Limit</label>
          <input
            id="total-limit-input"
            type="number"
            value={limit}
            onChange={(e) => onLimitChange(Number(e.currentTarget.value))}
            min={1}
            max={50000}
            style={{ width: '80px' }}
          />
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={onRunQuery}
          disabled={loading || !objectType}
          aria-busy={loading}
        >
          Run Query
        </button>
        {editMode && (
          <button
            type="button"
            id="realm-add-row-btn"
            className="btn btn-success"
            onClick={onAddRow}
            disabled={!objectType}
            title="Add a new row to the current object type"
          >
            + Add Row
          </button>
        )}
      </div>
    </section>
  );
};
