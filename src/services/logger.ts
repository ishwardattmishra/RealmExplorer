/* eslint-disable no-console */
import * as fs from 'fs';

import * as path from 'path';
import * as vscode from 'vscode';

export class Logger {
    private static logPath: string | undefined;
    private static outputChannel: vscode.OutputChannel | undefined;

    public static initialize(extensionContext: vscode.ExtensionContext) {
        // Create an output channel for real-time viewing
        this.outputChannel = vscode.window.createOutputChannel('Realm Explorer');
        
        // Define log file path in the extension's storage directory
        if (extensionContext.storageUri) {
            if (!fs.existsSync(extensionContext.storageUri.fsPath)) {
                fs.mkdirSync(extensionContext.storageUri.fsPath, { recursive: true });
            }
            this.logPath = path.join(extensionContext.storageUri.fsPath, 'realm-explorer.log');
        } else {
            // Fallback to a temporary directory if no storage URI is available
            this.logPath = path.join(process.cwd(), 'realm-explorer.log');
        }

        this.info(`Logger initialized. Log file: ${this.logPath}`);
    }

    public static info(message: string, ...args: any[]) {
        this.log('INFO', message, ...args);
    }

    public static error(message: string, ...args: any[]) {
        this.log('ERROR', message, ...args);
    }

    public static warn(message: string, ...args: any[]) {
        this.log('WARN', message, ...args);
    }

    private static log(level: string, message: string, ...args: any[]) {
        const timestamp = new Date().toISOString();
        const argStr = args.length > 0 ? ` ${JSON.stringify(args)}` : '';
        const formattedMessage = `[${timestamp}] [${level}] ${message}${argStr}`;

        // 1. Log to console
        if (level === 'ERROR') {
            console.error(formattedMessage);
        } else {
            console.log(formattedMessage);
        }

        // 2. Log to VS Code Output Channel
        if (this.outputChannel) {
            this.outputChannel.appendLine(formattedMessage);
        }

        // 3. Log to file
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
