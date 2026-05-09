/* eslint-disable no-console */
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { inspect } from 'node:util';
import * as vscode from 'vscode';

import type { ILogger } from './ilogger';

export class Logger {
  private static logPath: string | undefined;
  private static outputChannel: vscode.OutputChannel | undefined;

  public static initialize(extensionContext: vscode.ExtensionContext) {
    this.outputChannel = vscode.window.createOutputChannel('Realm Explorer');

    if (extensionContext.storageUri) {
      if (!fs.existsSync(extensionContext.storageUri.fsPath)) {
        fs.mkdirSync(extensionContext.storageUri.fsPath, { recursive: true });
      }
      this.logPath = path.join(extensionContext.storageUri.fsPath, 'realm-explorer.log');
    } else {
      this.logPath = path.join(process.cwd(), 'realm-explorer.log');
    }

    this.info(`Logger initialized. Log file: ${this.logPath}`);
  }

  public static dispose(): void {
    this.outputChannel?.dispose();
    this.outputChannel = undefined;
    this.logPath = undefined;
  }

  public static info(message: string, ...args: unknown[]) {
    this.log('INFO', message, ...args);
  }

  public static error(message: string, ...args: unknown[]) {
    this.log('ERROR', message, ...args);
  }

  public static warn(message: string, ...args: unknown[]) {
    this.log('WARN', message, ...args);
  }

  private static serializeArgs(args: unknown[]): string {
    if (args.length === 0) {
      return '';
    }
    try {
      const formatted = args.map((a) =>
        inspect(a, { depth: 8, maxArrayLength: 32, breakLength: 100, compact: false })
      );
      return ` ${formatted.join(' | ')}`;
    } catch {
      return ' [unserializable args]';
    }
  }

  private static log(level: string, message: string, ...args: unknown[]) {
    const timestamp = new Date().toISOString();
    const argStr = this.serializeArgs(args);
    const formattedMessage = `[${timestamp}] [${level}] ${message}${argStr}`;

    if (level === 'ERROR') {
      console.error(formattedMessage);
    } else {
      console.log(formattedMessage);
    }

    if (this.outputChannel) {
      this.outputChannel.appendLine(formattedMessage);
    }

    if (this.logPath) {
      try {
        fs.appendFileSync(this.logPath, formattedMessage + '\n');
      } catch (err) {
        console.error('Failed to write to log file:', err);
      }
    }
  }

  public static getLogPath(): string | undefined {
    return this.logPath;
  }

  public static showOutput() {
    if (this.outputChannel) {
      this.outputChannel.show();
    }
  }
}

/** ILogger adapter for default static Logger (dependency injection tests can pass a mock). */
export function createLoggerFacade(): ILogger {
  return {
    info: (message, ...args) => Logger.info(message, ...args),
    error: (message, ...args) => Logger.error(message, ...args),
    warn: (message, ...args) => Logger.warn(message, ...args),
  };
}

/** Random nonce for webview Content-Security-Policy (extension host only). */
export function createWebviewNonce(): string {
  return crypto.randomBytes(16).toString('base64');
}
