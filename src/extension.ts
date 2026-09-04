import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

import { toErrorMessage } from './shared/error-utils';
import { Logger } from './services/logger';
import { RealmBackend } from './services/realm-backend';
import { RealmSchemaProvider } from './providers/SchemaProvider';
import { RecentFilesProvider } from './providers/RecentFilesProvider';
import { RealmDragAndDropController } from './providers/RealmDragAndDropController';
import { RealmPanel } from './webview/RealmPanel';

let activeRealmBackend: RealmBackend | undefined;

/**
 * Converts a hex or base64 string to ArrayBuffer for Realm encryption key.
 * Realm requires 64-byte (512-bit) encryption keys.
 */
function parseEncryptionKey(input: string): ArrayBuffer | null {
  // Try hex format (128 hex chars = 64 bytes)
  if (/^[0-9a-fA-F]{128}$/.test(input)) {
    const bytes = new Uint8Array(64);
    for (let i = 0; i < 64; i++) {
      bytes[i] = parseInt(input.substr(i * 2, 2), 16);
    }
    return bytes.buffer;
  }
  
  // Try base64 format
  try {
    const base64 = input.replace(/[^A-Za-z0-9+/=]/g, '');
    const binary = Buffer.from(base64, 'base64');
    if (binary.length === 64) {
      // Create a new Uint8Array and copy the buffer data
      const bytes = new Uint8Array(64);
      for (let i = 0; i < 64; i++) {
        bytes[i] = binary[i];
      }
      return bytes.buffer;
    }
  } catch (e) {
    // Fall through to null
  }
  
  return null;
}

export async function activate(context: vscode.ExtensionContext) {
  Logger.initialize(context);
  Logger.info('Realm Explorer extension activating...');

  let realmBackend: RealmBackend | undefined;
  let schemaProvider: RealmSchemaProvider | undefined;
  const recentFilesProvider = new RecentFilesProvider(context.globalState);
  const dndController = new RealmDragAndDropController();

  // Try to initialize Realm backend
  try {
    realmBackend = new RealmBackend();
    activeRealmBackend = realmBackend;
    Logger.info('Realm module ready');

    schemaProvider = new RealmSchemaProvider(realmBackend);

    const schemaTreeView = vscode.window.createTreeView('realm-schema', {
      treeDataProvider: schemaProvider,
      dragAndDropController: dndController,
      showCollapseAll: true,
    });

    const recentTreeView = vscode.window.createTreeView('realm-recent', {
      treeDataProvider: recentFilesProvider,
      dragAndDropController: dndController,
      showCollapseAll: true,
    });

    context.subscriptions.push(schemaTreeView, recentTreeView);

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
    void vscode.window.showErrorMessage(
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

      if (uri && typeof uri.fsPath === 'string') {
        filePath = uri.fsPath;
      } else {
        const uris = await vscode.window.showOpenDialog({
          canSelectFiles: true,
          canSelectFolders: false,
          canSelectMany: false,
          filters: {
            'Realm Files': ['realm'],
            'All Files': ['*'],
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
        
        // Try opening without encryption first
        try {
          await realmBackend.openRealm(filePath, false);
          recentFilesProvider.push(filePath);
          schemaProvider?.refresh();
          await vscode.commands.executeCommand('setContext', 'realm.isOpen', true);
          vscode.window.showInformationMessage(`Opened Realm: ${path.basename(filePath)}`);
          vscode.commands.executeCommand('realm.runQuery');
        } catch (err) {
          const errMsg = toErrorMessage(err);
          
          // Check if error is encryption-related
          const isEncryptionError = errMsg.toLowerCase().includes('encrypt') || 
                                   errMsg.toLowerCase().includes('decrypt') ||
                                   errMsg.toLowerCase().includes('invalid key');
          
          if (isEncryptionError) {
            // Prompt for encryption key
            const keyInput = await vscode.window.showInputBox({
              prompt: 'This Realm file appears to be encrypted. Enter the encryption key (64 bytes as hex or base64)',
              password: true,
              ignoreFocusOut: true,
              placeHolder: '128 hex characters or base64 string',
            });
            
            if (keyInput) {
              const encryptionKey = parseEncryptionKey(keyInput);
              
              if (!encryptionKey) {
                vscode.window.showErrorMessage(
                  'Invalid encryption key format. Expected 64 bytes as 128 hex characters or base64 string.'
                );
                return;
              }
              
              // Try opening with encryption key
              try {
                await realmBackend.openRealm(filePath, false, encryptionKey);
                recentFilesProvider.push(filePath);
                schemaProvider?.refresh();
                await vscode.commands.executeCommand('setContext', 'realm.isOpen', true);
                vscode.window.showInformationMessage(`Opened encrypted Realm: ${path.basename(filePath)}`);
                vscode.commands.executeCommand('realm.runQuery');
              } catch (keyErr) {
                vscode.window.showErrorMessage(`Failed to open Realm with provided key: ${toErrorMessage(keyErr)}`);
              }
            }
          } else {
            vscode.window.showErrorMessage(`Failed to open Realm: ${errMsg}`);
          }
        }
      }
    }),

    vscode.commands.registerCommand('realm.refreshSchema', () => {
      realmBackend?.invalidateSchemaCache();
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
      const targetObjectType = typeof objectType === 'string' ? objectType : undefined;
      RealmPanel.createOrShow(context.extensionUri, realmBackend, targetObjectType, undefined, onRealmClosed);
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
    }),

    vscode.commands.registerCommand('realm.openRecentFile', async (filePath: string) => {
      await vscode.commands.executeCommand('realm.openFile', vscode.Uri.file(filePath));
    }),

    vscode.commands.registerCommand('realm.clearRecentFiles', () => {
      recentFilesProvider.clear();
      vscode.window.showInformationMessage('Recent files history cleared.');
    }),

    vscode.commands.registerCommand('realm.removeRecentFile', (item: { filePath: string }) => {
      recentFilesProvider.remove(item.filePath);
    })
  );
}

export function deactivate() {
  activeRealmBackend?.closeRealm();
  activeRealmBackend = undefined;
  Logger.dispose();
}
