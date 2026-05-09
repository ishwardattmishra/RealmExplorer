import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

import { toErrorMessage } from './shared/error-utils';
import { Logger } from './services/logger';
import { RealmBackend } from './services/realm-backend';
import { RealmSchemaProvider } from './providers/SchemaProvider';
import { RealmPanel } from './webview/RealmPanel';

let activeRealmBackend: RealmBackend | undefined;

export function activate(context: vscode.ExtensionContext) {
  Logger.initialize(context);
  Logger.info('Realm Explorer extension activating...');

  const realmBackend = new RealmBackend();
  activeRealmBackend = realmBackend;
  const schemaProvider = new RealmSchemaProvider(realmBackend);

  context.subscriptions.push(vscode.window.registerTreeDataProvider('realm-schema', schemaProvider));

  context.subscriptions.push({
    dispose: () => {
      realmBackend.closeRealm();
      if (activeRealmBackend === realmBackend) {
        activeRealmBackend = undefined;
      }
    },
  });

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
            'Realm Files': ['realm'],
          },
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
          vscode.window.showErrorMessage(`Failed to open Realm: ${toErrorMessage(err)}`);
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
    }),

    vscode.commands.registerCommand('realm.showLogs', async () => {
      Logger.showOutput();
      const logPath = Logger.getLogPath();
      if (logPath && fs.existsSync(logPath)) {
        try {
          const doc = await vscode.workspace.openTextDocument(logPath);
          await vscode.window.showTextDocument(doc);
        } catch (err) {
          vscode.window.showErrorMessage(`Could not open log file: ${toErrorMessage(err)}`);
        }
      } else {
        vscode.window.showInformationMessage('Log file not found or not yet created.');
      }
    })
  );
}

export function deactivate() {
  activeRealmBackend?.closeRealm();
  activeRealmBackend = undefined;
  Logger.dispose();
}
