import React, { useEffect, useMemo, useRef, useState } from 'react';

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

/** Types that can have auto-generated values */
const AUTO_GEN_TYPES = new Set(['objectid', 'uuid']);

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

/**
 * Generate a pseudo-random ObjectId-like string (24 hex chars).
 */
function generateObjectId(): string {
  const ts = Math.floor(Date.now() / 1000).toString(16).padStart(8, '0');
  const rest = Array.from({ length: 16 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
  return ts + rest;
}

/**
 * Generate a pseudo-random UUID v4 string.
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Get a placeholder hint for a given field type */
function getPlaceholder(fieldType: string, isOptional: boolean): string {
  const t = fieldType.toLowerCase();
  if (isOptional) return 'Leave empty for null';
  switch (t) {
    case 'string':
      return 'Enter text…';
    case 'int':
      return 'e.g. 42';
    case 'double':
    case 'float':
      return 'e.g. 3.14';
    case 'bool':
      return '';
    case 'date':
      return '';
    case 'objectid':
      return '24-character hex string';
    case 'uuid':
      return 'e.g. 550e8400-e29b-41d4-a716-446655440000';
    case 'decimal128':
      return 'e.g. 1234.5678';
    case 'data':
      return 'Base64 encoded binary';
    default:
      return '';
  }
}

/** Validate a field value and return an error message or empty string */
function validateField(rawValue: string, fieldType: string, isOptional: boolean): string {
  if (rawValue === '' || rawValue === 'null') {
    if (!isOptional) return 'This field is required';
    return '';
  }
  const t = fieldType.toLowerCase();
  if (t === 'int') {
    if (!/^-?\d+$/.test(rawValue)) return 'Must be a whole number';
  }
  if (t === 'double' || t === 'float') {
    if (isNaN(Number(rawValue))) return 'Must be a valid number';
  }
  if (t === 'objectid') {
    if (!/^[0-9a-fA-F]{24}$/.test(rawValue)) return 'Must be a 24-character hex string';
  }
  if (t === 'uuid') {
    if (!/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(rawValue)) {
      return 'Must be a valid UUID format';
    }
  }
  if (t === 'date') {
    const d = new Date(rawValue);
    if (isNaN(d.getTime())) return 'Must be a valid date';
  }
  return '';
}

export const EditRowModal: React.FC<EditRowModalProps> = ({ row, objectType, currentSchema, onClose }) => {
  const isNew = row === null;

  // Build initial field state from schema
  const editableFields = useMemo(() =>
    Object.entries(currentSchema.properties).filter(
      ([, info]) => !SKIP_TYPES.has(info.type)
    ),
    [currentSchema]
  );

  // Partition fields: PK first, then required, then optional
  const sortedFields = useMemo(() => {
    const pk = currentSchema.primaryKey;
    return [...editableFields].sort(([aKey, aInfo], [bKey, bInfo]) => {
      // PK always first
      if (aKey === pk) return -1;
      if (bKey === pk) return 1;
      // Required before optional
      const aOpt = aInfo.optional ? 1 : 0;
      const bOpt = bInfo.optional ? 1 : 0;
      if (aOpt !== bOpt) return aOpt - bOpt;
      // Then alphabetical
      return aKey.localeCompare(bKey);
    });
  }, [editableFields, currentSchema.primaryKey]);

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
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const firstInputRef = useRef<HTMLInputElement | HTMLSelectElement | null>(null);

  useEffect(() => {
    // Focus the first input when modal opens
    setTimeout(() => firstInputRef.current?.focus(), 50);
  }, []);

  const handleChange = (key: string, value: string) => {
    setFields((prev) => ({ ...prev, [key]: value }));
    setTouched((prev) => new Set(prev).add(key));
    // Live validation
    const fieldInfo = currentSchema.properties[key];
    if (fieldInfo) {
      const err = validateField(value, fieldInfo.type, !!fieldInfo.optional);
      setFieldErrors((prev) => {
        const next = { ...prev };
        if (err) {
          next[key] = err;
        } else {
          delete next[key];
        }
        return next;
      });
    }
  };

  const handleAutoGenerate = (key: string, fieldType: string) => {
    const t = fieldType.toLowerCase();
    let generated = '';
    if (t === 'objectid') {
      generated = generateObjectId();
    } else if (t === 'uuid') {
      generated = generateUUID();
    }
    handleChange(key, generated);
  };

  const handleSave = () => {
    // Validate all fields first
    const errors: Record<string, string> = {};
    for (const [key, info] of sortedFields) {
      const err = validateField(fields[key] ?? '', info.type, !!info.optional);
      if (err) {
        errors[key] = err;
      }
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setTouched(new Set(sortedFields.map(([k]) => k)));
      return;
    }

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

  const handleReset = () => {
    const init: Record<string, string> = {};
    for (const [key] of editableFields) {
      const val = row?.[key];
      init[key] = val === null || val === undefined ? '' : String(val);
    }
    setFields(init);
    setFieldErrors({});
    setTouched(new Set());
  };

  const handleKeyDown = (e: { key: string }) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  const changedCount = useMemo(() => {
    if (isNew) return 0;
    let count = 0;
    for (const [key] of editableFields) {
      const original = row?.[key];
      const originalStr = original === null || original === undefined ? '' : String(original);
      if (fields[key] !== originalStr) count++;
    }
    return count;
  }, [isNew, editableFields, fields, row]);

  const hasErrors = Object.keys(fieldErrors).length > 0;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label={isNew ? 'Add new row' : 'Edit row'} onKeyDown={handleKeyDown}>
      <div className="modal-dialog">
        <div className="modal-header">
          <div className="modal-header-left">
            <h3>{isNew ? 'Insert New Row' : 'Edit Row'}</h3>
            <span className="modal-object-type">{objectType}</span>
          </div>
          <div className="modal-header-right">
            {!isNew && changedCount > 0 && (
              <span className="modal-change-count">{changedCount} field{changedCount !== 1 ? 's' : ''} changed</span>
            )}
            <button type="button" className="mini-btn modal-close-btn" onClick={onClose} aria-label="Close dialog">✕</button>
          </div>
        </div>

        <div className="modal-body">
          {sortedFields.map(([key, info], idx) => {
            const isPk = key === currentSchema.primaryKey;
            const isDisabledWhenEditing = !isNew && isPk;
            const fieldType = info.type.toLowerCase();
            const isAutoGennable = isNew && isPk && AUTO_GEN_TYPES.has(fieldType);
            const showError = touched.has(key) && fieldErrors[key];
            const inputType =
              fieldType === 'int' || fieldType === 'double' || fieldType === 'float'
                ? 'number'
                : fieldType === 'date'
                ? 'datetime-local'
                : 'text';

            // Determine if value changed from original
            const originalStr = row?.[key] === null || row?.[key] === undefined ? '' : String(row?.[key]);
            const isChanged = !isNew && fields[key] !== originalStr;

            return (
              <div
                key={key}
                className={`modal-field ${isPk ? 'modal-field-pk' : ''} ${isChanged ? 'modal-field-changed' : ''}`}
              >
                <label htmlFor={`modal-field-${key}`} className="modal-field-label">
                  <span className="modal-field-name">{key}</span>
                  <span className="modal-badges">
                    <span className="field-type-badge">{info.type}</span>
                    {isPk && <span className="field-pk-badge">PK</span>}
                    {info.optional && <span className="field-optional-badge">optional</span>}
                    {!info.optional && !isPk && <span className="field-required-dot" title="Required">●</span>}
                  </span>
                </label>
                <div className="modal-field-input-row">
                  {fieldType === 'bool' ? (
                    <select
                      id={`modal-field-${key}`}
                      value={fields[key]}
                      onChange={(e) => handleChange(key, e.currentTarget.value)}
                      disabled={isDisabledWhenEditing}
                      ref={idx === 0 ? (firstInputRef as React.RefObject<HTMLSelectElement>) : undefined}
                      className={showError ? 'input-error' : ''}
                    >
                      <option value="">— select —</option>
                      <option value="true">true</option>
                      <option value="false">false</option>
                    </select>
                  ) : (
                    <input
                      id={`modal-field-${key}`}
                      type={inputType}
                      value={fields[key]}
                      onChange={(e) => handleChange(key, e.currentTarget.value)}
                      disabled={isDisabledWhenEditing}
                      placeholder={getPlaceholder(info.type, !!info.optional)}
                      ref={idx === 0 ? (firstInputRef as React.RefObject<HTMLInputElement>) : undefined}
                      className={showError ? 'input-error' : ''}
                      step={fieldType === 'double' || fieldType === 'float' ? 'any' : undefined}
                    />
                  )}
                  {isAutoGennable && (
                    <button
                      type="button"
                      className="btn btn-auto-gen"
                      onClick={() => handleAutoGenerate(key, info.type)}
                      title={`Auto-generate ${info.type}`}
                    >
                      ⚡ Generate
                    </button>
                  )}
                </div>
                {showError && <span className="field-error-msg">{fieldErrors[key]}</span>}
                {isChanged && !showError && (
                  <span className="field-changed-msg">Modified</span>
                )}
              </div>
            );
          })}
        </div>

        <div className="modal-footer">
          <div className="modal-footer-left">
            <span className="modal-field-count">
              {sortedFields.length} field{sortedFields.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="modal-footer-right">
            {!isNew && (
              <button type="button" className="btn btn-ghost" onClick={handleReset} disabled={saving}>
                Reset
              </button>
            )}
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSave}
              disabled={saving || hasErrors}
            >
              {saving ? (
                <>
                  <span className="btn-spinner" />
                  Saving…
                </>
              ) : isNew ? (
                '+ Insert Row'
              ) : (
                `Save ${changedCount > 0 ? `(${changedCount})` : ''}`
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
