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

  let realmBackend: RealmBackend | undefined;
  let schemaProvider: RealmSchemaProvider | undefined;

  // Try to initialize Realm backend - may fail if native module missing
  try {
    // Ensure realm native module is available for this platform
    const realmAvailable = await RealmInstaller.ensureRealmInstalled(context);
    
    if (!realmAvailable) {
      Logger.warn('Realm module not available - extension functionality will be limited');
      vscode.window.showWarningMessage(
        'Realm Explorer: Native module not available for your platform. Commands will be registered but may not work.',
        'Show Logs'
      ).then(action => {
        if (action === 'Show Logs') {
          Logger.showOutput();
        }
      });
    } else {
      Logger.info('Realm module ready');
    }

    realmBackend = new RealmBackend();
    activeRealmBackend = realmBackend;
    schemaProvider = new RealmSchemaProvider(realmBackend);

    context.subscriptions.push(vscode.window.registerTreeDataProvider('realm-schema', schemaProvider));

    context.subscriptions.push({
      dispose: () => {
        realmBackend?.closeRealm();
        if (activeRealmBackend === realmBackend) {
          activeRealmBackend = undefined;
        }
      },
    });
  } catch (error) {
    Logger.error('Failed to initialize Realm backend:', error);
    vscode.window.showErrorMessage(
      `Realm Explorer: Failed to initialize. Realm module may be missing or incompatible with your platform. Error: ${toErrorMessage(error)}`,
      'Show Logs'
    ).then(action => {
      if (action === 'Show Logs') {
        Logger.showOutput();
      }
    });
  }

  /** Shared callback: refreshes the schema tree + context key after any close path. */
  const onRealmClosed = () => {
    schemaProvider?.refresh();
    vscode.commands.executeCommand('setContext', 'realm.isOpen', false);
  };

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
        if (!realmBackend) {
          vscode.window.showErrorMessage('Realm Explorer: Backend not initialized. Realm module may be missing.');
          return;
        }
        try {
          await realmBackend.openRealm(filePath);
          schemaProvider?.refresh();
          await vscode.commands.executeCommand('setContext', 'realm.isOpen', true);
          vscode.window.showInformationMessage(`Opened Realm: ${path.basename(filePath)}`);
          vscode.commands.executeCommand('realm.runQuery');
        } catch (err) {
          vscode.window.showErrorMessage(`Failed to open Realm: ${toErrorMessage(err)}`);
        }
      }
    }),

    vscode.commands.registerCommand('realm.refreshSchema', () => {
      schemaProvider?.refresh();
    }),

    vscode.commands.registerCommand('realm.runQuery', (objectType?: string) => {
      if (!realmBackend) {
        vscode.window.showErrorMessage('Realm Explorer: Backend not initialized. Realm module may be missing.');
        return;
      }
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
      if (!realmBackend) {
        vscode.window.showInformationMessage('Realm Explorer: Backend not initialized.');
        return;
      }
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
