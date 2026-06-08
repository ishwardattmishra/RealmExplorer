/* eslint-disable no-console */
import * as fs from 'fs';
import * as path from 'path';
import { inspect } from 'node:util';
import * as vscode from 'vscode';

import type { ILogger } from './ilogger';

export class Logger {
  private static logPath: string | undefined;
  private static outputChannel: vscode.OutputChannel | undefined;

  /** Buffered log lines awaiting async flush to disk. */
  private static writeBuffer: string[] = [];
  /** Max buffer size in characters before an immediate flush is scheduled. */
  private static readonly BUFFER_CHAR_LIMIT = 4096;
  /** Interval handle for periodic flushing. */
  private static flushTimer: ReturnType<typeof setInterval> | undefined;

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

    // Periodic flush every 500ms
    this.flushTimer = setInterval(() => void this.flush(), 500);

    this.info(`Logger initialized. Log file: ${this.logPath}`);
  }

  public static dispose(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }
    // Final synchronous flush to avoid losing last messages
    this.flushSync();
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
      this.writeBuffer.push(formattedMessage + '\n');
      // If buffer is large, schedule an immediate async flush
      const bufferSize = this.writeBuffer.reduce((sum, s) => sum + s.length, 0);
      if (bufferSize >= this.BUFFER_CHAR_LIMIT) {
        void this.flush();
      }
    }
  }

  /** Asynchronously flush the write buffer to disk. */
  public static async flush(): Promise<void> {
    if (this.writeBuffer.length === 0 || !this.logPath) {
      return;
    }
    // Swap the buffer atomically so new writes go to a fresh array
    // while the old batch is being written — no lines are dropped.
    const batch = this.writeBuffer.join('');
    this.writeBuffer = [];
    try {
      await fs.promises.appendFile(this.logPath, batch);
    } catch (err) {
      console.error('Failed to write to log file:', err);
    }
  }

  /** Synchronous flush — only used during dispose() to guarantee final writes. */
  private static flushSync(): void {
    if (this.writeBuffer.length === 0 || !this.logPath) {
      return;
    }
    const batch = this.writeBuffer.join('');
    this.writeBuffer = [];
    try {
      fs.appendFileSync(this.logPath, batch);
    } catch (err) {
      console.error('Failed to write to log file during dispose:', err);
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
