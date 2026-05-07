import { useState, useCallback } from 'react';
import { vscode } from '../vscode';
import { QueryResult } from '../types';

export function useRealmQuery() {
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [results, setResults] = useState<QueryResult | null>(null);

    const executeQuery = useCallback((params: {
        objectType: string;
        filter: string;
        args?: any[];
        page: number;
        pageSize: number;
        limit?: number;
        countOnly?: boolean;
    }) => {
        if (!params.objectType) return;
        
        setError(null);
        setLoading(true);
        
        if (!params.countOnly) {
            setResults(null);
        }

        vscode.postMessage({
            command: params.countOnly ? 'countQuery' : 'executeQuery',
            objectType: params.objectType,
            filter: params.filter,
            args: params.args || [],
            page: params.page,
            pageSize: params.pageSize,
            limit: params.limit
        });
    }, []);

    return {
        loading,
        setLoading,
        error,
        setError,
        results,
        setResults,
        executeQuery
    };
}
