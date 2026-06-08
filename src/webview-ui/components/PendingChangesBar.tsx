import React, { useMemo } from 'react';

interface PendingChangesBarProps {
  /** Map from pk string → { field: value } */
  pendingChanges: Map<string, Record<string, unknown>>;
  onApply: () => void;
  onDiscard: () => void;
  applying: boolean;
}

export const PendingChangesBar: React.FC<PendingChangesBarProps> = ({
  pendingChanges,
  onApply,
  onDiscard,
  applying,
}) => {
  const stats = useMemo(() => {
    let totalFields = 0;
    pendingChanges.forEach((fields) => {
      totalFields += Object.keys(fields).length;
    });
    return { rows: pendingChanges.size, fields: totalFields };
  }, [pendingChanges]);

  if (stats.fields === 0) {
    return null;
  }

  return (
    <div className="pending-bar" role="status" aria-live="polite">
      <div className="pending-bar-info">
        <span className="pending-bar-dot" />
        <span className="pending-bar-text">
          <strong>{stats.fields}</strong> unsaved change{stats.fields !== 1 ? 's' : ''}
          {stats.rows > 1 ? ` across ${stats.rows} rows` : ''}
        </span>
      </div>
      <div className="pending-bar-actions">
        <button
          type="button"
          className="btn btn-ghost pending-bar-discard"
          onClick={onDiscard}
          disabled={applying}
        >
          Discard
        </button>
        <button
          type="button"
          className="btn btn-apply"
          onClick={onApply}
          disabled={applying}
        >
          {applying ? (
            <>
              <span className="btn-spinner" />
              Applying…
            </>
          ) : (
            <>
              ✓ Apply Updates
            </>
          )}
        </button>
      </div>
    </div>
  );
};
