import * as path from 'path';
import * as vscode from 'vscode';

import type { IRealmBackend } from '../services/irealm-backend';
import type { ILogger } from '../services/ilogger';
import { createLoggerFacade, createWebviewNonce } from '../services/logger';
import { dispatchWebviewMessage } from './webview-message-dispatch';

export class RealmPanel {
  public static currentPanel: RealmPanel | undefined;
  private static readonly viewType = 'realmQuery';
  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private readonly _logger: ILogger;
  private _disposables: vscode.Disposable[] = [];

  public static createOrShow(
    extensionUri: vscode.Uri,
    backend: IRealmBackend,
    initialObjectType?: string,
    logger: ILogger = createLoggerFacade()
  ) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (RealmPanel.currentPanel) {
      RealmPanel.currentPanel._panel.reveal(column);
      if (initialObjectType) {
        RealmPanel.currentPanel._panel.webview.postMessage({
          command: 'selectObjectType',
          objectType: initialObjectType,
        });
      }
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      RealmPanel.viewType,
      'Realm Query',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [
          vscode.Uri.file(path.join(extensionUri.fsPath, 'media')),
          vscode.Uri.file(path.join(extensionUri.fsPath, 'out', 'webview-ui')),
        ],
      }
    );

    RealmPanel.currentPanel = new RealmPanel(panel, extensionUri, backend, logger, initialObjectType);
  }

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    backend: IRealmBackend,
    logger: ILogger,
    initialObjectType?: string
  ) {
    this._panel = panel;
    this._extensionUri = extensionUri;
    this._logger = logger;

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    this._panel.webview.onDidReceiveMessage(
      async (message: unknown) => {
        this._logger.info(`Received message from webview`, message);
        await dispatchWebviewMessage(message, {
          postMessage: (msg) => this._panel.webview.postMessage(msg),
          backend,
          logger: this._logger,
        });
      },
      null,
      this._disposables
    );

    this._update(backend, initialObjectType);
  }

  public dispose() {
    RealmPanel.currentPanel = undefined;
    this._panel.dispose();
    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }

  private _update(backend: IRealmBackend, initialObjectType?: string) {
    const webview = this._panel.webview;
    this._panel.title = 'Realm Query Explorer';
    const nonce = createWebviewNonce();
    this._panel.webview.html = this._getHtmlForWebview(webview, backend, initialObjectType, nonce);
  }

  private _getHtmlForWebview(
    webview: vscode.Webview,
    backend: IRealmBackend,
    initialObjectType: string | undefined,
    nonce: string
  ) {
    const schema = backend.getSchema();
    const schemaJson = JSON.stringify(schema);
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.file(path.join(this._extensionUri.fsPath, 'out', 'webview-ui', 'main.js'))
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.file(path.join(this._extensionUri.fsPath, 'out', 'webview-ui', 'main.css'))
    );
    const logoUri = webview.asWebviewUri(
      vscode.Uri.file(path.join(this._extensionUri.fsPath, 'media', 'logo.png'))
    );

    const csp = [
      `default-src 'none'`,
      `style-src ${webview.cspSource}`,
      `script-src 'nonce-${nonce}'`,
      `img-src ${webview.cspSource} https: data:`,
      `font-src ${webview.cspSource}`,
    ].join('; ');

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy" content="${csp}">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" type="text/css" href="${styleUri}">
    <title>Realm Query</title>
</head>
<body>
    <div id="root"></div>
    <script nonce="${nonce}">
        window.INITIAL_SCHEMA = ${schemaJson};
        window.INITIAL_TYPE = ${JSON.stringify(initialObjectType ?? '')};
        window.LOGO_URI = ${JSON.stringify(logoUri.toString())};
    </script>
    <script nonce="${nonce}" type="module" src="${scriptUri}"></script>
</body>
</html>`;
  }
}
