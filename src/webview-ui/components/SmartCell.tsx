import React from 'react';

import type { RealmFieldInfo } from '../types';
import { TypeIcon } from './TypeIcon';

interface SmartCellProps {
  value: unknown;
  typeInfo?: RealmFieldInfo;
}

export const SmartCell: React.FC<SmartCellProps> = ({ value, typeInfo }) => {
  if (value === null || value === undefined) {
    return <em style={{ opacity: 0.5 }}>null</em>;
  }

  let displayValue = '';

  if (value && (value instanceof ArrayBuffer || ArrayBuffer.isView(value))) {
    displayValue = `<Binary ${value.byteLength} bytes>`;
  } else if (value && typeof value === 'object' && '$numberDecimal' in value) {
    displayValue = String((value as { $numberDecimal: string }).$numberDecimal);
  } else if (typeof value === 'object') {
    const json = JSON.stringify(value);
    displayValue = json.length > 50 ? `${json.substring(0, 50)}...` : json;
  } else {
    displayValue = String(value);
  }

  const titleText = typeof value === 'object' ? displayValue : String(value);

  return (
    <span title={titleText}>
      {typeInfo && <TypeIcon type={typeInfo.type} />}
      {displayValue}
    </span>
  );
};
