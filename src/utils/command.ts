import * as vscode from 'vscode';
import { ProgressLocation } from 'vscode';
import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import outputChannel from './channel';

export function runCommand(command: string[]) {
  outputChannel.appendLine(`Running command: ${command.join(' ')}`);
  const ret = new Promise<void>((resolve, reject) => {
    vscode.window.withProgress({
      location: ProgressLocation.Notification,
      title: command.join(' '),
      cancellable: true
    }, (progress, token) => {
      return new Promise<void>((resolve1, reject1) => {
        let child: ChildProcessWithoutNullStreams;
        token.onCancellationRequested(() => {
          outputChannel.appendLine(`Command cancelled: ${command.join(' ')}`);
          child?.kill();
        });

        let left = 100;
        let _timeout: NodeJS.Timeout;
        progress.report({ increment: 0, message: "Task running" });
  
        function fakeIncrease() {
          if (left > 0) {
            const increment = Math.floor(Math.random() * Math.min(5, left));
            left -= increment;
            progress.report({ increment });
            _timeout = setTimeout(() => {
              fakeIncrease();
            }, 1000);
          }
        }
  
        fakeIncrease();
  
        child = spawn(command[0], command.slice(1), {
          cwd: vscode.workspace.workspaceFolders![0].uri.path,
          stdio: 'pipe',
        });
        child.stdout?.setEncoding('utf8');
        child.stderr?.setEncoding('utf8');
  
        function pipeOutput(chunk: any) {
          outputChannel.append(chunk.toString());
        }
  
        child.stdout?.on('data', pipeOutput);
        child.stderr?.on('data', pipeOutput);
  
        child.on('close', (code) => {
          if (_timeout) {
            clearTimeout(_timeout);
          }
          if (code !== 0) {
            console.log(1);
            // vscode.window.showErrorMessage(stderr);
            reject1();
            reject();
          } else {
            progress.report({ increment: left, message: "Finished!" });
            resolve1();
            resolve();
          }
        });
  
        child.on('error', (error) => {
          console.log('2');
          vscode.window.showErrorMessage(error.message);
          reject1();
          reject();
        });
      });
    });
  });
  return ret;
}
