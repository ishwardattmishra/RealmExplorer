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
