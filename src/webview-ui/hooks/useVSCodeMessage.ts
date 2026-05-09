import { useEffect, useRef } from 'react';

import { isExtensionToWebviewMessage } from '@shared/webview-protocol';
import type { ExtensionToWebviewMessage } from '@shared/webview-protocol';
import type { QueryResult, RealmSchemaInfo } from '../types';

interface MessageHandlers {
  onSelectObjectType?: (objectType: string) => void;
  onResults?: (results: QueryResult) => void;
  onError?: (message: string) => void;
  onSchema?: (schema: RealmSchemaInfo[]) => void;
}

export function useVSCodeMessage(handlers: MessageHandlers) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const data: unknown = event.data;
      if (!isExtensionToWebviewMessage(data)) {
        return;
      }
      const message: ExtensionToWebviewMessage = data;
      switch (message.command) {
        case 'selectObjectType':
          handlersRef.current.onSelectObjectType?.(message.objectType);
          break;
        case 'results':
          handlersRef.current.onResults?.(message.results);
          break;
        case 'error':
          handlersRef.current.onError?.(message.message);
          break;
        case 'schema':
          handlersRef.current.onSchema?.(message.schema);
          break;
        case 'count':
          break;
        default:
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);
}
