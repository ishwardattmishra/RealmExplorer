import React from 'react';

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
}) => {
  const captionId = 'realm-data-table-caption';

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
            </tr>
          </thead>
          <tbody>
            {results.data.map((row, i) => {
              const rowKey = (currentSchema?.primaryKey && row[currentSchema.primaryKey]) ?? i;
              const selected = rowSelected(selectedRow, row, currentSchema);
              return (
                <tr
                  key={String(rowKey)}
                  className={selected ? 'selected' : ''}
                  tabIndex={0}
                  aria-selected={selected}
                  onClick={() => onSelectRow(row)}
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
