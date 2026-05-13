import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

import { toErrorMessage } from './shared/error-utils';
import { Logger } from './services/logger';
import { RealmBackend } from './services/realm-backend';
import { RealmSchemaProvider } from './providers/SchemaProvider';
import { RealmPanel } from './webview/RealmPanel';
import { RealmInstaller } from './services/realm-installer';

let activeRealmBackend: RealmBackend | undefined;

export async function activate(context: vscode.ExtensionContext) {
  Logger.initialize(context);
  Logger.info('Realm Explorer extension activating...');

  // Ensure realm native module is available for this platform
  const realmAvailable = await RealmInstaller.ensureRealmInstalled(context);
  
  if (!realmAvailable) {
    Logger.warn('Realm module not available - extension functionality will be limited');
    // Continue activation but show warning in UI
  } else {
    Logger.info('Realm module ready');
  }

  const realmBackend = new RealmBackend();
  activeRealmBackend = realmBackend;
  const schemaProvider = new RealmSchemaProvider(realmBackend);

  /** Shared callback: refreshes the schema tree + context key after any close path. */
  const onRealmClosed = () => {
    schemaProvider.refresh();
    vscode.commands.executeCommand('setContext', 'realm.isOpen', false);
  };

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
          await vscode.commands.executeCommand('setContext', 'realm.isOpen', true);
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
      RealmPanel.createOrShow(context.extensionUri, realmBackend, objectType, undefined, onRealmClosed);
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
    }),

    vscode.commands.registerCommand('realm.closeFile', () => {
      if (!realmBackend.isOpen()) {
        vscode.window.showInformationMessage('No Realm file is currently open.');
        return;
      }
      realmBackend.closeRealm();
      onRealmClosed();
      // Close the query panel if open
      if (RealmPanel.currentPanel) {
        RealmPanel.currentPanel.dispose();
      }
      vscode.window.showInformationMessage('Realm file closed.');
    })
  );
}

export function deactivate() {
  activeRealmBackend?.closeRealm();
  activeRealmBackend = undefined;
  Logger.dispose();
}
