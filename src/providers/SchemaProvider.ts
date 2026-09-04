import * as vscode from 'vscode';

import type { IRealmBackend } from '../services/irealm-backend';

export class RealmSchemaProvider implements vscode.TreeDataProvider<SchemaItem | DropHintItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<SchemaItem | DropHintItem | undefined | void> =
    new vscode.EventEmitter<SchemaItem | DropHintItem | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<SchemaItem | DropHintItem | undefined | void> = this._onDidChangeTreeData.event;

  constructor(private realmBackend: IRealmBackend) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: SchemaItem | DropHintItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: SchemaItem | DropHintItem): Promise<(SchemaItem | DropHintItem)[]> {
    if (!this.realmBackend.isOpen()) {
      // Return a placeholder so the tree is never empty — required for drag-and-drop
      return [new DropHintItem()];
    }

    if (element) {
      if (element instanceof DropHintItem) {
        return [];
      }
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

/**
 * Invisible placeholder that keeps the tree non-empty so drag-and-drop has a
 * valid drop target even before a Realm file is opened.
 */
export class DropHintItem extends vscode.TreeItem {
  constructor() {
    super('Drop a .realm file here to open', vscode.TreeItemCollapsibleState.None);
    this.iconPath = new vscode.ThemeIcon('inbox');
    this.contextValue = 'dropHint';
    this.command = {
      command: 'realm.openFile',
      title: 'Open Realm File',
    };
  }
}

