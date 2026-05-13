import React, { useState } from 'react';

import type { QueryResult, RealmRow, RealmSchemaInfo } from '../types';
import { SmartCell } from './SmartCell';

interface DataTableProps {
  results: QueryResult | null;
  visibleKeys: string[];
  currentSchema?: RealmSchemaInfo;
  selectedRow: RealmRow | null;
  onSelectRow: (row: RealmRow) => void;
  loading: boolean;
  error: string | null;
  editMode: boolean;
  onEditRow: (row: RealmRow) => void;
  onDeleteRow: (row: RealmRow) => void;
}

function rowSelected(
  selectedRow: RealmRow | null,
  row: RealmRow,
  currentSchema?: RealmSchemaInfo
): boolean {
  if (!selectedRow) {
    return false;
  }
  const pk = currentSchema?.primaryKey;
  if (pk && pk in row && pk in selectedRow) {
    return selectedRow[pk] === row[pk];
  }
  return selectedRow === row;
}

export const DataTable: React.FC<DataTableProps> = ({
  results,
  visibleKeys,
  currentSchema,
  selectedRow,
  onSelectRow,
  loading,
  error,
  editMode,
  onEditRow,
  onDeleteRow,
}) => {
  const captionId = 'realm-data-table-caption';
  const [confirmDeleteKey, setConfirmDeleteKey] = useState<unknown>(null);

  const getPk = (row: RealmRow) => {
    const pk = currentSchema?.primaryKey;
    return pk ? row[pk] : undefined;
  };

  const handleDeleteClick = (e: React.MouseEvent, row: RealmRow) => {
    e.stopPropagation();
    const pkVal = getPk(row);
    if (confirmDeleteKey !== null && confirmDeleteKey === pkVal) {
      // Second click = confirmed
      onDeleteRow(row);
      setConfirmDeleteKey(null);
    } else {
      setConfirmDeleteKey(pkVal ?? row);
    }
  };

  const handleEditClick = (e: React.MouseEvent, row: RealmRow) => {
    e.stopPropagation();
    setConfirmDeleteKey(null);
    onEditRow(row);
  };

  return (
    <div className="table-viewport" aria-busy={loading} aria-describedby={error ? 'realm-table-error' : undefined}>
      {loading && (
        <div className="overlay" aria-live="polite" aria-label="Loading query results">
          <div className="spinner" />
        </div>
      )}
      {error && (
        <div id="realm-table-error" className="error" role="status" aria-live="polite">
          {error}
        </div>
      )}

      {results && results.data.length > 0 ? (
        <table aria-labelledby={captionId}>
          <caption id={captionId} className="sr-only">
            Query results
          </caption>
          <thead>
            <tr>
              {visibleKeys.map((key) => (
                <th key={key} scope="col">
                  {key}
                </th>
              ))}
              {editMode && (
                <th scope="col" className="actions-col">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {results.data.map((row, i) => {
              const rowKey = (currentSchema?.primaryKey && row[currentSchema.primaryKey]) ?? i;
              const selected = rowSelected(selectedRow, row, currentSchema);
              const pkVal = getPk(row);
              const awaitingConfirm = confirmDeleteKey !== null && confirmDeleteKey === (pkVal ?? row);

              return (
                <tr
                  key={String(rowKey)}
                  className={selected ? 'selected' : ''}
                  tabIndex={0}
                  aria-selected={selected}
                  onClick={() => {
                    setConfirmDeleteKey(null);
                    onSelectRow(row);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectRow(row);
                    }
                  }}
                >
                  {visibleKeys.map((key) => (
                    <td key={key}>
                      <SmartCell value={row[key]} typeInfo={currentSchema?.properties[key]} />
                    </td>
                  ))}
                  {editMode && (
                    <td className="actions-col" onClick={(e) => e.stopPropagation()}>
                      <div className="row-actions">
                        <button
                          type="button"
                          className="action-btn action-edit"
                          onClick={(e) => handleEditClick(e, row)}
                          title="Edit this row"
                          aria-label="Edit row"
                        >
                          ✏
                        </button>
                        {awaitingConfirm ? (
                          <span className="delete-confirm">
                            <button
                              type="button"
                              className="action-btn action-delete-confirm"
                              onClick={(e) => handleDeleteClick(e, row)}
                              title="Click again to confirm deletion"
                            >
                              ✓ Confirm
                            </button>
                            <button
                              type="button"
                              className="action-btn action-cancel"
                              onClick={(e) => { e.stopPropagation(); setConfirmDeleteKey(null); }}
                              title="Cancel"
                            >
                              ✕
                            </button>
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="action-btn action-delete"
                            onClick={(e) => handleDeleteClick(e, row)}
                            title="Delete this row"
                            aria-label="Delete row"
                          >
                            🗑
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        results &&
        !loading && (
          <div className="empty-state">
            <div className="empty-state-icon" aria-hidden="true">
              🔍
            </div>
            <h3>No results found</h3>
          </div>
        )
      )}
    </div>
  );
};
