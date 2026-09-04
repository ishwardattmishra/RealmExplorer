import * as vscode from 'vscode';

export class RealmDragAndDropController implements vscode.TreeDragAndDropController<vscode.TreeItem> {
  readonly dropMimeTypes: readonly string[] = [
    'text/uri-list',
  ];
  readonly dragMimeTypes: readonly string[] = [];

  public async handleDrop(
    _target: vscode.TreeItem | undefined,
    dataTransfer: vscode.DataTransfer,
    _token: vscode.CancellationToken
  ): Promise<void> {
    const uriListItem = dataTransfer.get('text/uri-list');
    if (!uriListItem) {
      return;
    }

    try {
      const rawUriList = await uriListItem.asString();
      if (!rawUriList) {
        return;
      }

      const lines = rawUriList
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && !line.startsWith('#'));

      if (lines.length === 0) {
        return;
      }

      // Prioritize .realm file if present, otherwise take the first line
      const realmLine = lines.find((line) => line.toLowerCase().endsWith('.realm')) ?? lines[0];

      let uri: vscode.Uri;
      if (realmLine.startsWith('file://') || realmLine.startsWith('file%3A')) {
        uri = vscode.Uri.parse(realmLine, true);
      } else {
        // Treat as a raw filesystem path
        uri = vscode.Uri.file(realmLine);
      }

      await vscode.commands.executeCommand('realm.openFile', uri);
    } catch (error) {
      void vscode.window.showErrorMessage(
        `Failed to open dropped file: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
