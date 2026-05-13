import type { ExtensionToWebviewMessage } from '../shared/webview-protocol';
import { isWebviewToExtensionMessage } from '../shared/webview-protocol';
import type { WebviewToExtensionMessage } from '../shared/webview-protocol';
import { toErrorMessage } from '../shared/error-utils';
import type { IRealmBackend } from '../services/irealm-backend';
import type { ILogger } from '../services/ilogger';

export type PanelHandlerContext = {
  postMessage: (msg: ExtensionToWebviewMessage) => void;
  backend: IRealmBackend;
  logger: ILogger;
  /** Called after the realm is closed so the extension host can refresh the schema tree and context key. */
  onRealmClosed?: () => void;
};

type HandlerFn = (message: WebviewToExtensionMessage, ctx: PanelHandlerContext) => Promise<void>;

const WEBVIEW_MESSAGE_HANDLERS: Record<WebviewToExtensionMessage['command'], HandlerFn> = {
  executeQuery: async (message, ctx) => {
    const msg = message as Extract<WebviewToExtensionMessage, { command: 'executeQuery' }>;
    try {
      const results = await ctx.backend.executeQuery(
        msg.objectType,
        msg.filter,
        msg.args ?? [],
        msg.page ?? 1,
        msg.pageSize ?? 20,
        msg.limit
      );
      ctx.logger.info(`Query results ready, sending to webview. Records: ${results.data.length}`);
      ctx.postMessage({ command: 'results', results });
    } catch (err) {
      const errorMessage = toErrorMessage(err);
      ctx.logger.error(`Error executing query: ${errorMessage}`);
      ctx.postMessage({ command: 'error', message: errorMessage });
    }
  },

  countQuery: async (message, ctx) => {
    const msg = message as Extract<WebviewToExtensionMessage, { command: 'countQuery' }>;
    try {
      const countResult = await ctx.backend.countQuery(msg.objectType, msg.filter, msg.args ?? []);
      ctx.logger.info(`Count result: ${countResult.count}`);
      ctx.postMessage({
        command: 'count',
        count: countResult.count,
        executionTimeMs: countResult.executionTimeMs,
      });
    } catch (err) {
      const errorMessage = toErrorMessage(err);
      ctx.logger.error(`Error counting: ${errorMessage}`);
      ctx.postMessage({ command: 'error', message: errorMessage });
    }
  },

  getSchema: async (_message, ctx) => {
    ctx.logger.info('Fetching schema for webview');
    const schema = ctx.backend.getSchema();
    ctx.postMessage({ command: 'schema', schema });
  },

  closeRealm: async (_message, ctx) => {
    ctx.logger.info('Closing Realm by webview request');
    ctx.backend.closeRealm();
    ctx.postMessage({ command: 'realmClosed' });
    ctx.onRealmClosed?.();
  },

  reopenRealm: async (message, ctx) => {
    const msg = message as Extract<WebviewToExtensionMessage, { command: 'reopenRealm' }>;
    try {
      ctx.logger.info(`Reopening Realm (writeable: ${msg.writeable})`);
      await ctx.backend.reopenRealm(msg.writeable);
      const schema = ctx.backend.getSchema();
      ctx.postMessage({ command: 'schema', schema });
    } catch (err) {
      const errorMessage = toErrorMessage(err);
      ctx.logger.error(`Error reopening Realm: ${errorMessage}`);
      ctx.postMessage({ command: 'error', message: errorMessage });
    }
  },

  insertRow: async (message, ctx) => {
    const msg = message as Extract<WebviewToExtensionMessage, { command: 'insertRow' }>;
    try {
      await ctx.backend.insertRow(msg.objectType, msg.data);
      ctx.postMessage({ command: 'mutationSuccess', action: 'insert' });
    } catch (err) {
      const errorMessage = toErrorMessage(err);
      ctx.logger.error(`Error inserting row: ${errorMessage}`);
      ctx.postMessage({ command: 'mutationError', message: errorMessage });
    }
  },

  updateRow: async (message, ctx) => {
    const msg = message as Extract<WebviewToExtensionMessage, { command: 'updateRow' }>;
    try {
      await ctx.backend.updateRow(msg.objectType, msg.primaryKey, msg.field, msg.value);
      ctx.postMessage({ command: 'mutationSuccess', action: 'update' });
    } catch (err) {
      const errorMessage = toErrorMessage(err);
      ctx.logger.error(`Error updating row: ${errorMessage}`);
      ctx.postMessage({ command: 'mutationError', message: errorMessage });
    }
  },

  deleteRow: async (message, ctx) => {
    const msg = message as Extract<WebviewToExtensionMessage, { command: 'deleteRow' }>;
    try {
      await ctx.backend.deleteRow(msg.objectType, msg.primaryKey);
      ctx.postMessage({ command: 'mutationSuccess', action: 'delete' });
    } catch (err) {
      const errorMessage = toErrorMessage(err);
      ctx.logger.error(`Error deleting row: ${errorMessage}`);
      ctx.postMessage({ command: 'mutationError', message: errorMessage });
    }
  },
};

export async function dispatchWebviewMessage(raw: unknown, ctx: PanelHandlerContext): Promise<void> {
  if (!isWebviewToExtensionMessage(raw)) {
    ctx.logger.warn('Ignoring invalid webview message', raw);
    return;
  }
  const message = raw;
  const handler = WEBVIEW_MESSAGE_HANDLERS[message.command];
  await handler(message, ctx);
}
