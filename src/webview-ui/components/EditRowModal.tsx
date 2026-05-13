import React, { useEffect, useRef, useState } from 'react';

import type { RealmRow, RealmSchemaInfo } from '../types';
import { vscode } from '../vscode';

interface EditRowModalProps {
  /** undefined = adding a new row; defined = editing existing row */
  row: RealmRow | null;
  objectType: string;
  currentSchema: RealmSchemaInfo;
  onClose: () => void;
}

/** Non-queryable / non-editable field types for embedded / object links */
const SKIP_TYPES = new Set(['object', 'linkingObjects', 'list', 'set', 'dictionary']);

/**
 * Coerces a text input value to the right JS type for a given Realm field type.
 */
function coerceValue(rawValue: string, fieldType: string): unknown {
  const t = fieldType.toLowerCase();
  if (rawValue === '' || rawValue === 'null') {
    return null;
  }
  if (t === 'int' || t === 'double' || t === 'float') {
    const n = Number(rawValue);
    return isNaN(n) ? rawValue : n;
  }
  if (t === 'bool') {
    return rawValue.toLowerCase() === 'true' || rawValue === '1';
  }
  if (t === 'date') {
    const d = new Date(rawValue);
    return isNaN(d.getTime()) ? rawValue : d.toISOString();
  }
  return rawValue;
}

export const EditRowModal: React.FC<EditRowModalProps> = ({ row, objectType, currentSchema, onClose }) => {
  const isNew = row === null;

  // Build initial field state from schema
  const editableFields = Object.entries(currentSchema.properties).filter(
    ([, info]) => !SKIP_TYPES.has(info.type)
  );

  const [fields, setFields] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const [key] of editableFields) {
      const val = row?.[key];
      init[key] = val === null || val === undefined ? '' : String(val);
    }
    return init;
  });

  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const firstInputRef = useRef<HTMLInputElement | HTMLSelectElement | null>(null);

  useEffect(() => {
    // Focus the first input when modal opens
    firstInputRef.current?.focus();
  }, []);

  const handleChange = (key: string, value: string) => {
    setFields((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleSave = () => {
    setSaving(true);

    if (isNew) {
      // Build the full data object
      const data: Record<string, unknown> = {};
      for (const [key, rawValue] of Object.entries(fields)) {
        const fieldType = currentSchema.properties[key]?.type ?? 'string';
        data[key] = coerceValue(rawValue, fieldType);
      }
      vscode.postMessage({ command: 'insertRow', objectType, data });
    } else {
      // Send one updateRow message per changed field
      const pk = currentSchema.primaryKey;
      const primaryKey = pk ? row![pk] : undefined;

      for (const [key, rawValue] of Object.entries(fields)) {
        const original = row![key];
        const originalStr = original === null || original === undefined ? '' : String(original);
        if (rawValue === originalStr) {
          continue; // unchanged
        }
        const fieldType = currentSchema.properties[key]?.type ?? 'string';
        const value = coerceValue(rawValue, fieldType);
        vscode.postMessage({ command: 'updateRow', objectType, primaryKey, field: key, value });
      }
    }
    // onClose will be called by App when mutationSuccess is received
    setSaving(false);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label={isNew ? 'Add new row' : 'Edit row'} onKeyDown={handleKeyDown}>
      <div className="modal-dialog">
        <div className="modal-header">
          <h3>{isNew ? `Add Row — ${objectType}` : `Edit Row — ${objectType}`}</h3>
          <button type="button" className="mini-btn" onClick={onClose} aria-label="Close dialog">✕</button>
        </div>

        <div className="modal-body">
          {editableFields.map(([key, info], idx) => {
            const isPk = key === currentSchema.primaryKey;
            const isDisabledWhenEditing = !isNew && isPk;
            const fieldType = info.type.toLowerCase();
            const inputType =
              fieldType === 'int' || fieldType === 'double' || fieldType === 'float'
                ? 'number'
                : fieldType === 'date'
                ? 'datetime-local'
                : fieldType === 'bool'
                ? 'checkbox-like'
                : 'text';

            return (
              <div key={key} className="modal-field">
                <label htmlFor={`modal-field-${key}`} className="modal-field-label">
                  {key}
                  <span className="field-type-badge">{info.type}</span>
                  {isPk && <span className="field-pk-badge">PK</span>}
                  {info.optional && <span className="field-optional-badge">?</span>}
                </label>
                {fieldType === 'bool' ? (
                  <select
                    id={`modal-field-${key}`}
                    value={fields[key]}
                    onChange={(e) => handleChange(key, e.currentTarget.value)}
                    disabled={isDisabledWhenEditing}
                    ref={idx === 0 ? (firstInputRef as React.RefObject<HTMLSelectElement>) : undefined}
                  >
                    <option value="">— select —</option>
                    <option value="true">true</option>
                    <option value="false">false</option>
                  </select>
                ) : (
                  <input
                    id={`modal-field-${key}`}
                    type={inputType === 'checkbox-like' ? 'text' : inputType}
                    value={fields[key]}
                    onChange={(e) => handleChange(key, e.currentTarget.value)}
                    disabled={isDisabledWhenEditing}
                    placeholder={info.optional ? 'null' : ''}
                    ref={idx === 0 ? (firstInputRef as React.RefObject<HTMLInputElement>) : undefined}
                    className={fieldErrors[key] ? 'input-error' : ''}
                  />
                )}
                {fieldErrors[key] && <span className="field-error-msg">{fieldErrors[key]}</span>}
              </div>
            );
          })}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : isNew ? 'Add Row' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};
