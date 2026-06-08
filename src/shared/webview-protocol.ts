import type { QueryResult, RealmSchemaInfo } from './types';

/** Messages sent from the extension host to the webview. */
export type ExtensionToWebviewMessage =
  | { command: 'results'; results: QueryResult }
  | { command: 'error'; message: string }
  | { command: 'schema'; schema: RealmSchemaInfo[] }
  | { command: 'selectObjectType'; objectType: string }
  | { command: 'count'; count: number; executionTimeMs: number }
  | { command: 'realmClosed' }
  | { command: 'mutationSuccess'; action: 'insert' | 'update' | 'delete' }
  | { command: 'mutationError'; message: string };

/** Messages sent from the webview to the extension host. */
export type WebviewToExtensionMessage =
  | {
      command: 'executeQuery';
      objectType: string;
      filter: string;
      args: unknown[];
      page: number;
      pageSize: number;
      limit?: number;
    }
  | {
      command: 'countQuery';
      objectType: string;
      filter: string;
      args: unknown[];
    }
  | { command: 'getSchema' }
  | { command: 'closeRealm' }
  | { command: 'reopenRealm'; writeable: boolean }
  | {
      command: 'insertRow';
      objectType: string;
      data: Record<string, unknown>;
    }
  | {
      command: 'updateRow';
      objectType: string;
      primaryKey: unknown;
      field: string;
      value: unknown;
    }
  | {
      command: 'updateRows';
      objectType: string;
      updates: Array<{ primaryKey: unknown; field: string; value: unknown }>;
    }
  | {
      command: 'deleteRow';
      objectType: string;
      primaryKey: unknown;
    }
  | {
      command: 'exportData';
      objectType: string;
      data: Record<string, unknown>[];
    };

export type WebviewCommand = WebviewToExtensionMessage['command'];

export function isWebviewToExtensionMessage(data: unknown): data is WebviewToExtensionMessage {
  if (!data || typeof data !== 'object') {
    return false;
  }
  const cmd = (data as { command?: unknown }).command;
  const validCommands: WebviewCommand[] = [
    'executeQuery',
    'countQuery',
    'getSchema',
    'closeRealm',
    'reopenRealm',
    'insertRow',
    'updateRow',
    'updateRows',
    'deleteRow',
    'exportData',
  ];
  if (!validCommands.includes(cmd as WebviewCommand)) {
    return false;
  }
  if (cmd === 'getSchema' || cmd === 'closeRealm') {
    return true;
  }
  if (cmd === 'reopenRealm') {
    return typeof (data as { writeable?: unknown }).writeable === 'boolean';
  }
  if (cmd === 'insertRow') {
    const o = data as { objectType?: unknown; data?: unknown };
    return typeof o.objectType === 'string' && typeof o.data === 'object' && o.data !== null;
  }
  if (cmd === 'updateRow') {
    const o = data as { objectType?: unknown; primaryKey?: unknown; field?: unknown };
    return typeof o.objectType === 'string' && 'primaryKey' in (data as object) && typeof o.field === 'string';
  }
  if (cmd === 'updateRows') {
    const o = data as { objectType?: unknown; updates?: unknown };
    return typeof o.objectType === 'string' && Array.isArray(o.updates);
  }
  if (cmd === 'deleteRow') {
    const o = data as { objectType?: unknown };
    return typeof o.objectType === 'string' && 'primaryKey' in (data as object);
  }
  if (cmd === 'exportData') {
    const o = data as { objectType?: unknown; data?: unknown };
    return typeof o.objectType === 'string' && Array.isArray(o.data);
  }
  const o = data as { objectType?: unknown; filter?: unknown; args?: unknown };
  if (typeof o.objectType !== 'string' || typeof o.filter !== 'string') {
    return false;
  }
  if (o.args !== undefined && !Array.isArray(o.args)) {
    return false;
  }
  if (cmd === 'executeQuery') {
    const q = data as { page?: unknown; pageSize?: unknown; limit?: unknown };
    if (q.page !== undefined && typeof q.page !== 'number') {
      return false;
    }
    if (q.pageSize !== undefined && typeof q.pageSize !== 'number') {
      return false;
    }
    if (q.limit !== undefined && typeof q.limit !== 'number') {
      return false;
    }
  }
  return true;
}

/** Type guard for messages from the extension host → webview. */
export function isExtensionToWebviewMessage(data: unknown): data is ExtensionToWebviewMessage {
  if (!data || typeof data !== 'object' || !('command' in data)) {
    return false;
  }
  const cmd = (data as { command: unknown }).command;
  if (typeof cmd !== 'string') {
    return false;
  }
  switch (cmd) {
    case 'selectObjectType':
      return typeof (data as { objectType?: unknown }).objectType === 'string';
    case 'results':
      return (
        'results' in data &&
        typeof (data as { results?: unknown }).results === 'object' &&
        (data as { results?: unknown }).results !== null
      );
    case 'error':
      return typeof (data as { message?: unknown }).message === 'string';
    case 'schema':
      return Array.isArray((data as { schema?: unknown }).schema);
    case 'count':
      return (
        typeof (data as { count?: unknown }).count === 'number' &&
        typeof (data as { executionTimeMs?: unknown }).executionTimeMs === 'number'
      );
    case 'realmClosed':
      return true;
    case 'mutationSuccess':
      return typeof (data as { action?: unknown }).action === 'string';
    case 'mutationError':
      return typeof (data as { message?: unknown }).message === 'string';
    default:
      return false;
  }
}
