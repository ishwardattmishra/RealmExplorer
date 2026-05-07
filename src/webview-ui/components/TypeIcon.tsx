import React, { useMemo } from 'react';

export const TypeIcon: React.FC<{ type: string }> = ({ type }) => {
    const icon = useMemo(() => {
        switch (type.toLowerCase()) {
            case 'int':
            case 'double':
            case 'float': return '🔢';
            case 'string': return 'abc';
            case 'bool': return '✔';
            case 'date': return '📅';
            case 'decimal128': return '💰';
            case 'data': return '📦';
            case 'uuid': return '🪪';
            case 'objectid': return '🆔';
            case 'mixed': return '🌈';
            case 'dictionary': return '📖';
            case 'set': return '⬢';
            case 'list': return '[]';
            case 'object': return '{}';
            default: return '📄';
        }
    }, [type]);
    return <span className="cell-type-icon">{icon}</span>;
};
