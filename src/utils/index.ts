import * as vscode from "vscode";

export function showInfo(message: string, duration = 5000) {
  vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: message,
      cancellable: false,
    },
    async (progress) => {
      progress.report({ increment: 100 });
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          resolve();
        }, duration);
      });
    }
  );
}

export function getRootPath(): string | undefined {
  return vscode.workspace.workspaceFolders?.[0].uri.fsPath;
}
