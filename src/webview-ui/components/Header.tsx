import React, { useEffect, useRef, useState } from 'react';

import type { QueryResult, RealmSchemaInfo } from '../types';

interface HeaderProps {
  results: QueryResult | null;
  currentSchema?: RealmSchemaInfo;
  visibleColumns: Set<string>;
  onToggleColumn: (column: string) => void;
  onSelectAllColumns: () => void;
  onClearAllColumns: () => void;
  onExport: () => void;
  onCloseDB: () => void;
  isOpen: boolean;
}

const COLUMN_MENU_ID = 'realm-column-picker-menu';
const COLUMN_BTN_ID = 'realm-column-picker-btn';

export const Header: React.FC<HeaderProps> = ({
  results,
  currentSchema,
  visibleColumns,
  onToggleColumn,
  onSelectAllColumns,
  onClearAllColumns,
  onExport,
  onCloseDB,
  isOpen,
}) => {
  const [showColumnPicker, setShowColumnPicker] = useState(false);
  const [confirmingClose, setConfirmingClose] = useState(false);
  const columnPickerRef = useRef<HTMLDivElement>(null);
  const confirmTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (columnPickerRef.current && !columnPickerRef.current.contains(event.target as Node)) {
        setShowColumnPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-cancel close confirmation after 4 s if user doesn't act
  useEffect(() => {
    if (confirmingClose) {
      confirmTimeoutRef.current = setTimeout(() => setConfirmingClose(false), 4000);
    }
    return () => {
      if (confirmTimeoutRef.current) clearTimeout(confirmTimeoutRef.current);
    };
  }, [confirmingClose]);

  const handleCloseRequest = () => setConfirmingClose(true);
  const handleCloseCancel = () => setConfirmingClose(false);
  const handleCloseConfirm = () => {
    setConfirmingClose(false);
    onCloseDB();
  };

  useEffect(() => {
    if (!showColumnPicker) {
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowColumnPicker(false);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [showColumnPicker]);

  const logoSrc = typeof globalThis.LOGO_URI === 'string' ? globalThis.LOGO_URI : '';

  return (
    <header className="main-header">
      <div className="title-section">
        {logoSrc ? (
          <img
            src={logoSrc}
            alt=""
            style={{ width: '24px', height: '24px', borderRadius: '4px' }}
          />
        ) : null}
        <h2>Realm Explorer</h2>
        {results && <span className="count-badge">{results.totalCount} objects</span>}
      </div>
      <div className="action-section" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <div className="popover-container" ref={columnPickerRef}>
          <button
            type="button"
            id={COLUMN_BTN_ID}
            className="btn btn-secondary"
            aria-expanded={showColumnPicker}
            aria-controls={COLUMN_MENU_ID}
            aria-haspopup="true"
            onClick={() => setShowColumnPicker(!showColumnPicker)}
          >
            Columns
          </button>
          {showColumnPicker && currentSchema && (
            <div
              id={COLUMN_MENU_ID}
              className="popover-menu"
              role="menu"
              aria-label="Select visible columns"
            >
              <div className="popover-header">
                <span>SELECT COLUMNS</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" className="link-action" onClick={onSelectAllColumns}>
                    All
                  </button>
                  <button type="button" className="link-action" onClick={onClearAllColumns}>
                    None
                  </button>
                </div>
              </div>
              {Object.keys(currentSchema.properties).map((prop) => (
                <div
                  key={prop}
                  className="popover-item"
                  role="menuitemcheckbox"
                  aria-checked={visibleColumns.has(prop)}
                  onClick={() => onToggleColumn(prop)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onToggleColumn(prop);
                    }
                  }}
                  tabIndex={0}
                >
                  <input type="checkbox" checked={visibleColumns.has(prop)} readOnly tabIndex={-1} aria-hidden="true" />
                  <span>{prop}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <button type="button" className="btn btn-secondary" onClick={onExport} disabled={!results}>
          Export JSON
        </button>

        {isOpen && (
          <span className="close-db-separator" aria-hidden="true" />
        )}

        {isOpen && !confirmingClose && (
          <button
            type="button"
            id="realm-close-db-btn"
            className="btn btn-close-db"
            onClick={handleCloseRequest}
            title="Close the current Realm database"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" clipRule="evenodd" d="M7.116 8 1 1.884 1.884 1 8 7.116 14.116 1 15 1.884 8.884 8 15 14.116 14.116 15 8 8.884 1.884 15 1 14.116 7.116 8z"/>
            </svg>
            Close DB
          </button>
        )}

        {isOpen && confirmingClose && (
          <div className="close-db-confirm-group" role="group" aria-label="Confirm close database">
            <span className="close-db-confirm-label">Close DB?</span>
            <button
              type="button"
              id="realm-close-db-confirm-btn"
              className="btn btn-close-db-confirm"
              onClick={handleCloseConfirm}
              autoFocus
            >
              Confirm
            </button>
            <button
              type="button"
              id="realm-close-db-cancel-btn"
              className="btn btn-secondary"
              onClick={handleCloseCancel}
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
