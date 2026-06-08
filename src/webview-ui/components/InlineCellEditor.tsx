import React, { useEffect, useRef, useState } from 'react';

import type { RealmFieldInfo } from '../types';

interface InlineCellEditorProps {
  value: unknown;
  fieldInfo: RealmFieldInfo;
  onSave: (value: unknown) => void;
  onCancel: () => void;
}

/**
 * Coerce a raw string from the inline editor into the appropriate JS type
 * for the given Realm field type.
 */
function coerceInlineValue(raw: string, fieldType: string): unknown {
  const t = fieldType.toLowerCase();
  if (raw === '' || raw === 'null') {
    return null;
  }
  if (t === 'int' || t === 'double' || t === 'float') {
    const n = Number(raw);
    return isNaN(n) ? raw : n;
  }
  if (t === 'bool') {
    return raw.toLowerCase() === 'true' || raw === '1';
  }
  if (t === 'date') {
    const d = new Date(raw);
    return isNaN(d.getTime()) ? raw : d.toISOString();
  }
  return raw;
}

/**
 * Format a value for display in the inline editor input.
 */
function formatForEdit(value: unknown, fieldType: string): string {
  if (value === null || value === undefined) {
    return '';
  }
  const t = fieldType.toLowerCase();
  if (t === 'date' && typeof value === 'string') {
    // Convert ISO string to datetime-local format
    try {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        return d.toISOString().slice(0, 16);
      }
    } catch {
      // fall through
    }
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

export const InlineCellEditor: React.FC<InlineCellEditorProps> = ({
  value,
  fieldInfo,
  onSave,
  onCancel,
}) => {
  const fieldType = fieldInfo.type.toLowerCase();
  const [rawValue, setRawValue] = useState(() => formatForEdit(value, fieldType));
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement | null>(null);

  useEffect(() => {
    // Focus and select on mount
    const el = inputRef.current;
    if (el) {
      el.focus();
      if ('select' in el && typeof el.select === 'function') {
        el.select();
      }
    }
  }, []);

  const handleSave = () => {
    const coerced = coerceInlineValue(rawValue, fieldType);
    onSave(coerced);
  };

  const handleKeyDown = (e: { key: string; preventDefault: () => void }) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      handleSave();
    }
  };

  const handleBlur = () => {
    // Save on blur — common inline-edit UX pattern
    handleSave();
  };

  const inputType =
    fieldType === 'int' || fieldType === 'double' || fieldType === 'float'
      ? 'number'
      : fieldType === 'date'
        ? 'datetime-local'
        : 'text';

  if (fieldType === 'bool') {
    return (
      <select
        ref={inputRef as React.RefObject<HTMLSelectElement>}
        className="inline-cell-editor inline-cell-select"
        value={rawValue}
        onChange={(e) => {
          setRawValue(e.currentTarget.value);
        }}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        onClick={(e) => e.stopPropagation()}
      >
        <option value="">null</option>
        <option value="true">true</option>
        <option value="false">false</option>
      </select>
    );
  }

  return (
    <input
      ref={inputRef as React.RefObject<HTMLInputElement>}
      className="inline-cell-editor"
      type={inputType}
      value={rawValue}
      onChange={(e) => setRawValue(e.currentTarget.value)}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      onClick={(e) => e.stopPropagation()}
      placeholder={fieldInfo.optional ? 'null' : ''}
      step={fieldType === 'double' || fieldType === 'float' ? 'any' : undefined}
    />
  );
};
