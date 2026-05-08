import * as vscode from 'vscode';
import * as path from 'path';
import { RealmBackend } from '../services/realm-backend';

export class RealmPanel {
    public static currentPanel: RealmPanel | undefined;
    private static readonly viewType = 'realmQuery';
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];

    public static createOrShow(extensionUri: vscode.Uri, backend: RealmBackend, initialObjectType?: string) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        if (RealmPanel.currentPanel) {
            RealmPanel.currentPanel._panel.reveal(column);
            if (initialObjectType) {
                RealmPanel.currentPanel._panel.webview.postMessage({ 
                    command: 'selectObjectType', 
                    objectType: initialObjectType 
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
                    vscode.Uri.file(path.join(extensionUri.fsPath, 'out', 'webview-ui'))
                ]
            }
        );

        RealmPanel.currentPanel = new RealmPanel(panel, extensionUri, backend, initialObjectType);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, backend: RealmBackend, initialObjectType?: string) {
        this._panel = panel;
        this._extensionUri = extensionUri;

        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        this._panel.webview.onDidReceiveMessage(
            async message => {
                switch (message.command) {
                    case 'executeQuery': {
                        try {
                            const results = await backend.executeQuery(
                                message.objectType,
                                message.filter,
                                message.args || [],
                                message.page || 1,
                                message.pageSize || 20,
                                message.limit
                            );
                            this._panel.webview.postMessage({ command: 'results', results });
                        } catch (err) {
                            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
                            this._panel.webview.postMessage({ command: 'error', message: errorMessage });
                        }
                        break;
                    }
                    case 'countQuery': {
                        try {
                            const countResult = await backend.countQuery(
                                message.objectType,
                                message.filter,
                                message.args || []
                            );
                            this._panel.webview.postMessage({ 
                                command: 'count', 
                                count: countResult.count,
                                executionTimeMs: countResult.executionTimeMs
                            });
                        } catch (err) {
                            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
                            this._panel.webview.postMessage({ command: 'error', message: errorMessage });
                        }
                        break;
                    }
                    case 'getSchema': {
                        const schema = backend.getSchema();
                        this._panel.webview.postMessage({ command: 'schema', schema });
                        break;
                    }
                }
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

    private _update(backend: RealmBackend, initialObjectType?: string) {
        const webview = this._panel.webview;
        this._panel.title = 'Realm Query Explorer';
        this._panel.webview.html = this._getHtmlForWebview(webview, backend, initialObjectType);
    }

    private _getHtmlForWebview(webview: vscode.Webview, backend: RealmBackend, initialObjectType?: string) {
        const schema = backend.getSchema();
        const schemaJson = JSON.stringify(schema);
        const scriptUri = webview.asWebviewUri(vscode.Uri.file(
            path.join(this._extensionUri.fsPath, 'out', 'webview-ui', 'main.js')
        ));
        const styleUri = webview.asWebviewUri(vscode.Uri.file(
            path.join(this._extensionUri.fsPath, 'out', 'webview-ui', 'main.css')
        ));
        const logoUri = webview.asWebviewUri(vscode.Uri.file(
            path.join(this._extensionUri.fsPath, 'media', 'logo.png')
        ));

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" type="text/css" href="${styleUri}">
    <title>Realm Query</title>
</head>
<body>
    <div id="root"></div>
    <script>
        window.INITIAL_SCHEMA = ${schemaJson};
        window.INITIAL_TYPE = ${JSON.stringify(initialObjectType || '')};
        window.LOGO_URI = "${logoUri}";
    </script>
    <script type="module" src="${scriptUri}"></script>
</body>
</html>`;
    }
}
