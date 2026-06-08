/** Random nonce for webview Content-Security-Policy (extension host only). */
export function createWebviewNonce(): string {
  // Dynamic import avoids loading crypto at module-init time for logger consumers
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const crypto = require('crypto') as typeof import('crypto');
  return crypto.randomBytes(16).toString('base64');
}
