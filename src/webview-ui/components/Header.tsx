import React, { useState, useRef, useEffect } from 'react';
import { QueryResult, RealmSchemaInfo } from '../types';

interface HeaderProps {
    results: QueryResult | null;
    objectType: string;
    currentSchema?: RealmSchemaInfo;
    visibleColumns: Set<string>;
    onToggleColumn: (column: string) => void;
    onSelectAllColumns: () => void;
    onClearAllColumns: () => void;
    onExport: () => void;
}

export const Header: React.FC<HeaderProps> = ({
    results,
    objectType,
    currentSchema,
    visibleColumns,
    onToggleColumn,
    onSelectAllColumns,
    onClearAllColumns,
    onExport
}) => {
    const [showColumnPicker, setShowColumnPicker] = useState(false);
    const columnPickerRef = useRef<HTMLDivElement>(null);

    // Close column picker when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (columnPickerRef.current && !columnPickerRef.current.contains(event.target as Node)) {
                setShowColumnPicker(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <header className="main-header">
            <div className="title-section">
                <img 
                    src={(globalThis as any).LOGO_URI} 
                    alt="Logo" 
                    style={{ width: '24px', height: '24px', borderRadius: '4px' }} 
                />
                <h2>Realm Explorer</h2>
                {results && <span className="count-badge">{results.totalCount} objects</span>}
            </div>
            <div className="action-section" style={{ display: 'flex', gap: '8px' }}>
                {/* Column Picker */}
                <div className="popover-container" ref={columnPickerRef}>
                    <button className="btn btn-secondary" onClick={() => setShowColumnPicker(!showColumnPicker)}>
                        👁️ Columns
                    </button>
                    {showColumnPicker && currentSchema && (
                        <div className="popover-menu">
                            <div className="popover-header">
                                <span>SELECT COLUMNS</span>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <span className="link-action" onClick={onSelectAllColumns}>All</span>
                                    <span className="link-action" onClick={onClearAllColumns}>None</span>
                                </div>
                            </div>
                            {Object.keys(currentSchema.properties).map(prop => (
                                <div key={prop} className="popover-item" onClick={() => onToggleColumn(prop)}>
                                    <input type="checkbox" checked={visibleColumns.has(prop)} readOnly />
                                    <span>{prop}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <button 
                    className="btn btn-secondary" 
                    onClick={onExport} 
                    disabled={!results}
                >
                    📥 Export JSON
                </button>
            </div>
        </header>
    );
};
