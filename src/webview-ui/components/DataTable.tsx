import React, { useCallback, useState } from 'react';

import type { QueryResult, RealmRow, RealmSchemaInfo } from '../types';
import { InlineCellEditor } from './InlineCellEditor';
import { SmartCell } from './SmartCell';

interface DataTableProps {
  results: QueryResult | null;
  visibleKeys: string[];
  currentSchema?: RealmSchemaInfo;
  selectedRow: RealmRow | null;
  onSelectRow: (row: RealmRow) => void;
  loading: boolean;
  error: string | null;
  onEditRow: (row: RealmRow) => void;
  onDeleteRow: (row: RealmRow) => void;
  onInlineEdit?: (row: RealmRow, field: string, value: unknown) => void;
  /** Map from pk string → { field: value } */
  pendingChanges?: Map<string, Record<string, unknown>>;
  /** Set of `${pkValue}-${field}` keys that were just edited successfully */
  recentlyEdited?: Set<string>;
}

/** Non-editable / complex field types that should skip inline editing */
const SKIP_INLINE_TYPES = new Set(['object', 'linkingObjects', 'list', 'set', 'dictionary']);

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

export const DataTable: React.FC<DataTableProps> = React.memo(({
  results,
  visibleKeys,
  currentSchema,
  selectedRow,
  onSelectRow,
  loading,
  error,
  onEditRow,
  onDeleteRow,
  onInlineEdit,
  pendingChanges,
  recentlyEdited,
}) => {
  const captionId = 'realm-data-table-caption';
  const [confirmDeleteKey, setConfirmDeleteKey] = useState<unknown>(null);
  /** Track which cell is being inline-edited: `rowIndex:fieldName` */
  const [editingCell, setEditingCell] = useState<{ rowIndex: number; field: string } | null>(null);

  const getPk = (row: RealmRow) => {
    const pk = currentSchema?.primaryKey;
    return pk ? row[pk] : undefined;
  };

  const handleDeleteClick = (e: { stopPropagation: () => void }, row: RealmRow) => {
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

  const handleEditClick = (e: { stopPropagation: () => void }, row: RealmRow) => {
    e.stopPropagation();
    setConfirmDeleteKey(null);
    onEditRow(row);
  };

  const canInlineEdit = useCallback((field: string): boolean => {
    if (!currentSchema) return false;
    // Don't allow inline editing of primary key
    if (field === currentSchema.primaryKey) return false;
    const fieldInfo = currentSchema.properties[field];
    if (!fieldInfo) return false;
    if (SKIP_INLINE_TYPES.has(fieldInfo.type)) return false;
    return true;
  }, [currentSchema]);

  const handleCellDblClick = (e: { stopPropagation: () => void }, rowIndex: number, field: string) => {
    if (!onInlineEdit) return;
    if (!canInlineEdit(field)) return;
    e.stopPropagation();
    setEditingCell({ rowIndex, field });
  };

  const handleInlineSave = (row: RealmRow, field: string, value: unknown) => {
    setEditingCell(null);
    onInlineEdit?.(row, field, value);
  };

  const handleInlineCancel = () => {
    setEditingCell(null);
  };

  const getCellEditKey = (row: RealmRow, field: string): string => {
    const pkVal = getPk(row);
    return `${String(pkVal)}-${field}`;
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
              {visibleKeys.map((key) => {
                const isPk = key === currentSchema?.primaryKey;
                const fieldInfo = currentSchema?.properties[key];
                return (
                  <th key={key} scope="col" className={isPk ? 'pk-column' : ''}>
                    <span className="th-content">
                      {key}
                      {isPk && <span className="th-pk-indicator" title="Primary Key">🔑</span>}
                      {fieldInfo && (
                        <span className="th-type-badge">{fieldInfo.type}</span>
                      )}
                    </span>
                  </th>
                );
              })}
              <th scope="col" className="actions-col">
                Actions
              </th>
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
                  {visibleKeys.map((key) => {
                    const isEditing = editingCell?.rowIndex === i && editingCell?.field === key;
                    const isPk = key === currentSchema?.primaryKey;
                    const fieldInfo = currentSchema?.properties[key];
                    const editKey = getCellEditKey(row, key);
                    const wasRecentlyEdited = recentlyEdited?.has(editKey);
                    const isEditable = canInlineEdit(key);
                    
                    const pkString = String(pkVal);
                    const hasPendingChange = pendingChanges?.has(pkString) && key in pendingChanges.get(pkString)!;
                    const displayValue = hasPendingChange 
                      ? pendingChanges.get(pkString)![key] 
                      : row[key];

                    return (
                      <td
                        key={key}
                        className={[
                          isEditable ? 'editable-cell' : '',
                          isPk ? 'pk-cell' : '',
                          wasRecentlyEdited ? 'cell-just-edited' : '',
                          hasPendingChange ? 'cell-pending-change' : '',
                        ].filter(Boolean).join(' ')}
                        onDblClick={(e: { stopPropagation: () => void }) => handleCellDblClick(e, i, key)}
                        title={isEditable ? 'Double-click to edit' : undefined}
                      >
                        {isEditing && fieldInfo ? (
                          <InlineCellEditor
                            value={displayValue}
                            fieldInfo={fieldInfo}
                            onSave={(value) => handleInlineSave(row, key, value)}
                            onCancel={handleInlineCancel}
                          />
                        ) : (
                          <SmartCell value={displayValue} typeInfo={currentSchema?.properties[key]} />
                        )}
                      </td>
                    );
                  })}
                  <td className="actions-col" onClick={(e) => e.stopPropagation()}>
                    <div className="row-actions">
                      <button
                        type="button"
                        className="action-btn action-edit"
                        onClick={(e) => handleEditClick(e, row)}
                        title="Edit all fields"
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
            <p className="empty-state-hint">Use the <strong>+ Add Row</strong> button above to insert data.</p>
          </div>
        )
      )}
    </div>
  );
});
