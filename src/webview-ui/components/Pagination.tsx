import React from 'react';
import { QueryResult } from '../types';

interface PaginationProps {
    results: QueryResult | null;
    currentPage: number;
    onPageChange: (page: number) => void;
    pageSize: number;
}

export const Pagination: React.FC<PaginationProps> = ({
    results,
    currentPage,
    onPageChange,
    pageSize
}) => {
    const totalPages = results ? Math.ceil(results.totalCount / pageSize) : 1;

    return (
        <footer className="pagination-bar">
            <div className="status-info">
                <span>Showing {results?.data.length || 0} of {results?.totalCount || 0}</span>
                {results && (
                    <span style={{ marginLeft: '12px', opacity: 0.7 }}>
                        Query took {results.executionTimeMs}ms
                    </span>
                )}
            </div>
            <div className="pagination-controls">
                <button 
                    className="mini-btn" 
                    disabled={currentPage <= 1} 
                    onClick={() => onPageChange(currentPage - 1)}
                >
                    Prev
                </button>
                <span>Page {currentPage} of {totalPages}</span>
                <button 
                    className="mini-btn" 
                    disabled={!results || currentPage >= totalPages} 
                    onClick={() => onPageChange(currentPage + 1)}
                >
                    Next
                </button>
            </div>
        </footer>
    );
};
