import React from 'react';

interface DetailsPanelProps {
    selectedRow: any;
    onClose: () => void;
}

export const DetailsPanel: React.FC<DetailsPanelProps> = ({
    selectedRow,
    onClose
}) => {
    return (
        <aside className="details-panel">
            <div className="details-header">
                <h3>Document Details</h3>
                <button className="mini-btn" onClick={onClose}>✕</button>
            </div>
            <div className="details-content">
                <pre className="json-view">
                    {JSON.stringify(selectedRow, null, 2)}
                </pre>
            </div>
        </aside>
    );
};
