import { useCallback, useState } from 'react';

import type { WebviewToExtensionMessage } from '@shared/webview-protocol';
import { vscode } from '../vscode';
import type { QueryResult } from '../types';

export function useRealmQuery() {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<QueryResult | null>(null);

  const executeQuery = useCallback(
    (params: {
      objectType: string;
      filter: string;
      args?: unknown[];
      page: number;
      pageSize: number;
      limit?: number;
      countOnly?: boolean;
    }) => {
      if (!params.objectType) {
        return;
      }

      setError(null);
      setLoading(true);

      if (!params.countOnly) {
        setResults(null);
      }

      const payload: WebviewToExtensionMessage = params.countOnly
        ? {
            command: 'countQuery',
            objectType: params.objectType,
            filter: params.filter,
            args: params.args ?? [],
          }
        : {
            command: 'executeQuery',
            objectType: params.objectType,
            filter: params.filter,
            args: params.args ?? [],
            page: params.page,
            pageSize: params.pageSize,
            limit: params.limit,
          };

      vscode.postMessage(payload);
    },
    []
  );

  return {
    loading,
    setLoading,
    error,
    setError,
    results,
    setResults,
    executeQuery,
  };
}
