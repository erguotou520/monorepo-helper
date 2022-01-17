import * as vscode from 'vscode';

export function showInfo(message: string, duration = 5000) {
  vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: message,
      cancellable: false,
    },
    async (progress) => {
      setTimeout(() => {
        progress.report({ increment: 100 });
      }, duration);
   }
  );
}