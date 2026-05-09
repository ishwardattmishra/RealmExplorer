import React, { useMemo } from 'react';

import type { RealmRow } from '../types';

interface DetailsPanelProps {
  selectedRow: RealmRow;
  onClose: () => void;
}

function safeStringify(value: RealmRow): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return '[Unable to serialize row]';
  }
}

export const DetailsPanel: React.FC<DetailsPanelProps> = ({ selectedRow, onClose }) => {
  const json = useMemo(() => safeStringify(selectedRow), [selectedRow]);

  return (
    <aside className="details-panel" aria-label="Document details">
      <div className="details-header">
        <h3>Document Details</h3>
        <button type="button" className="mini-btn" onClick={onClose} aria-label="Close details panel">
          ✕
        </button>
      </div>
      <div className="details-content">
        <pre className="json-view">{json}</pre>
      </div>
    </aside>
  );
};
