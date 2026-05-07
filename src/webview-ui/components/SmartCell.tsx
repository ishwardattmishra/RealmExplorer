import React from 'react';
import { RealmFieldInfo } from '../types';
import { TypeIcon } from './TypeIcon';

interface SmartCellProps {
    value: any;
    typeInfo?: RealmFieldInfo;
}

export const SmartCell: React.FC<SmartCellProps> = ({ value, typeInfo }) => {
    if (value === null || value === undefined) return <em style={{ opacity: 0.5 }}>null</em>;
    
    let displayValue = '';
    
    if (value && (value instanceof ArrayBuffer || ArrayBuffer.isView(value))) {
        displayValue = `<Binary ${value.byteLength} bytes>`;
    } else if (value && typeof value === 'object' && value.$numberDecimal) {
        // Handle Decimal128 as returned by toJSON
        displayValue = value.$numberDecimal;
    } else if (typeof value === 'object') {
        displayValue = JSON.stringify(value).substring(0, 50) + (JSON.stringify(value).length > 50 ? '...' : '');
    } else {
        displayValue = String(value);
    }

    return (
        <span title={String(value)}>
            {typeInfo && <TypeIcon type={typeInfo.type} />}
            {displayValue}
        </span>
    );
};
