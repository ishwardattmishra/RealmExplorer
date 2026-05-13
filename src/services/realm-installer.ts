import * as child_process from 'child_process';
import * as path from 'path';
import * as vscode from 'vscode';

import { Logger } from './logger';

/**
 * Checks if realm native module is available for current platform.
 * If missing, attempts to install it.
 */
export class RealmInstaller {
  private static isInstalling = false;
  private static installAttempted = false;

  /**
   * Ensures realm module is available. Returns true if ready, false if failed.
   */
  static async ensureRealmInstalled(context: vscode.ExtensionContext): Promise<boolean> {
    // Check if realm is already available
    try {
      require.resolve('realm');
      Logger.info('Realm module is available');
      return true;
    } catch {
      Logger.warn('Realm module not found for current platform');
    }

    // Don't retry if we already attempted
    if (this.installAttempted) {
      Logger.warn('Realm installation already attempted and failed');
      return false;
    }

    // Don't start multiple installs
    if (this.isInstalling) {
      Logger.info('Realm installation already in progress');
      return false;
    }

    // Check if user wants auto-install
    const config = vscode.workspace.getConfiguration('realm');
    const autoInstall = config.get<boolean>('autoInstallNativeModule', true);

    if (!autoInstall) {
      Logger.info('Auto-install disabled by user');
      await this.showManualInstallMessage();
      return false;
    }

    // Attempt installation
    return await this.installRealm(context);
  }

  private static async installRealm(context: vscode.ExtensionContext): Promise<boolean> {
    this.isInstalling = true;
    this.installAttempted = true;

    try {
      const extensionPath = context.extensionPath;
      const realmPath = path.join(extensionPath, 'node_modules', 'realm');

      Logger.info('Starting realm native module installation...');

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Realm Explorer',
          cancellable: false,
        },
        async (progress) => {
          progress.report({ message: 'Installing native module for your platform...' });

          // Run prebuild-install to download platform-specific binary
          const command = 'npm run install --prefix node_modules/realm';
          const options = {
            cwd: extensionPath,
            stdio: 'pipe' as const,
            env: { ...process.env },
          };

          try {
            child_process.execSync(command, options);
            Logger.info('Realm installation completed successfully');
            return true;
          } catch (error) {
            Logger.error('Failed to install realm:', error);

            // Try alternative: direct prebuild-install
            try {
              progress.report({ message: 'Trying alternative installation method...' });
              const altCommand = 'npx prebuild-install --runtime napi';
              child_process.execSync(altCommand, { ...options, cwd: realmPath });
              Logger.info('Realm installation completed via alternative method');
              return true;
            } catch (altError) {
              Logger.error('Alternative installation also failed:', altError);
              throw altError;
            }
          }
        }
      );

      // Verify installation worked
      try {
        delete require.cache[require.resolve('realm')];
        require.resolve('realm');
        vscode.window.showInformationMessage('Realm Explorer: Native module installed successfully!');
        return true;
      } catch {
        throw new Error('Module still not available after installation');
      }
    } catch (error) {
      Logger.error('Realm installation failed:', error);
      await this.showInstallationFailedMessage(error);
      return false;
    } finally {
      this.isInstalling = false;
    }
  }

  private static async showManualInstallMessage(): Promise<void> {
    const message =
      'Realm Explorer requires a platform-specific native module. Please install it manually or enable auto-install in settings.';
    const action = await vscode.window.showWarningMessage(message, 'Enable Auto-Install', 'Show Logs');

    if (action === 'Enable Auto-Install') {
      await vscode.workspace.getConfiguration('realm').update('autoInstallNativeModule', true, true);
      vscode.window.showInformationMessage('Auto-install enabled. Please reload the window.');
    } else if (action === 'Show Logs') {
      Logger.showOutput();
    }
  }

  private static async showInstallationFailedMessage(error: unknown): Promise<void> {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const message = `Realm Explorer: Failed to install native module. The extension may not work on your platform. Error: ${errorMsg}`;

    const action = await vscode.window.showErrorMessage(message, 'Show Logs', 'Report Issue');

    if (action === 'Show Logs') {
      Logger.showOutput();
    } else if (action === 'Report Issue') {
      vscode.env.openExternal(
        vscode.Uri.parse('https://github.com/ishwardattmishra/RealmExplorer/issues/new')
      );
    }
  }
}
