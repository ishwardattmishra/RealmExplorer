import { useEffect } from 'react';
import { RealmSchemaInfo, QueryResult } from '../types';

interface MessageHandlers {
    onSelectObjectType?: (objectType: string) => void;
    onResults?: (results: QueryResult) => void;
    onError?: (message: string) => void;
    onSchema?: (schema: RealmSchemaInfo[]) => void;
}

export function useVSCodeMessage(handlers: MessageHandlers) {
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            const message = event.data;
            switch (message.command) {
                case 'selectObjectType':
                    handlers.onSelectObjectType?.(message.objectType);
                    break;
                case 'results':
                    handlers.onResults?.(message.results);
                    break;
                case 'error':
                    handlers.onError?.(message.message);
                    break;
                case 'schema':
                    handlers.onSchema?.(message.schema);
                    break;
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [handlers]);
}
