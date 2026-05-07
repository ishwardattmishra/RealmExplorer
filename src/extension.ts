import * as vscode from 'vscode';
import * as path from 'path';
import { RealmBackend } from './services/realm-backend';
import { RealmPanel } from './webview/RealmPanel';
import { RealmSchemaProvider } from './providers/SchemaProvider';

export function activate(context: vscode.ExtensionContext) {
    const realmBackend = new RealmBackend();
    const schemaProvider = new RealmSchemaProvider(realmBackend);
    
    vscode.window.registerTreeDataProvider('realm-schema', schemaProvider);

    context.subscriptions.push(
        vscode.commands.registerCommand('realm.openFile', async (uri?: vscode.Uri) => {
            let filePath: string | undefined;
            
            if (uri) {
                filePath = uri.fsPath;
            } else {
                const uris = await vscode.window.showOpenDialog({
                    canSelectFiles: true,
                    canSelectFolders: false,
                    canSelectMany: false,
                    filters: {
                        'Realm Files': ['realm']
                    }
                });
                if (uris && uris.length > 0) {
                    filePath = uris[0].fsPath;
                }
            }

            if (filePath) {
                try {
                    await realmBackend.openRealm(filePath);
                    schemaProvider.refresh();
                    vscode.window.showInformationMessage(`Opened Realm: ${path.basename(filePath)}`);
                    vscode.commands.executeCommand('realm.runQuery');
                } catch (err) {
                    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
                    vscode.window.showErrorMessage(`Failed to open Realm: ${errorMessage}`);
                }
            }
        }),

        vscode.commands.registerCommand('realm.refreshSchema', () => {
            schemaProvider.refresh();
        }),

        vscode.commands.registerCommand('realm.runQuery', (objectType?: string) => {
            if (!realmBackend.isOpen()) {
                vscode.window.showErrorMessage('Please open a Realm file first.');
                return;
            }
            RealmPanel.createOrShow(context.extensionUri, realmBackend, objectType);
        })
    );
}

export function deactivate() {
    // Cleanup if needed
}
