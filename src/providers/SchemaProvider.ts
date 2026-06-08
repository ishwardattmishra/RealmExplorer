import * as vscode from 'vscode';

import type { IRealmBackend } from '../services/irealm-backend';

export class RealmSchemaProvider implements vscode.TreeDataProvider<SchemaItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<SchemaItem | undefined | void> =
    new vscode.EventEmitter<SchemaItem | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<SchemaItem | undefined | void> = this._onDidChangeTreeData.event;

  constructor(private realmBackend: IRealmBackend) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: SchemaItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: SchemaItem): Promise<SchemaItem[]> {
    if (!this.realmBackend.isOpen()) {
      return [];
    }

    if (element) {
      if (element.contextValue === 'objectType') {
        const schema = this.realmBackend.getSchema();
        const objectSchema = schema.find((s) => s.name === element.label);
        if (objectSchema) {
          return Object.entries(objectSchema.properties).map(([name, info]) => {
            return new SchemaItem(
              name,
              `${info.type}${info.optional ? '?' : ''}`,
              vscode.TreeItemCollapsibleState.None,
              'property'
            );
          });
        }
      }
      return [];
    }

    const schema = this.realmBackend.getSchema();
    return Promise.all(
      schema.map(async (s) => {
        let detail: string;
        if (s.embedded) {
          detail = 'embedded';
        } else {
          try {
            const { count } = await this.realmBackend.countQuery(s.name, '');
            detail = `${count} object${count !== 1 ? 's' : ''}`;
          } catch {
            detail = 'error';
          }
        }
        const item = new SchemaItem(
          s.name,
          detail,
          vscode.TreeItemCollapsibleState.Collapsed,
          'objectType'
        );
        if (!s.embedded) {
          item.command = {
            command: 'realm.runQuery',
            title: 'Run Query',
            arguments: [s.name],
          };
        }
        return item;
      })
    );
  }
}

export class SchemaItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    private readonly detail: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly contextValue: string
  ) {
    super(label, collapsibleState);
    this.tooltip = `${this.label} — ${this.detail}`;
    this.description = this.detail;
  }
}
