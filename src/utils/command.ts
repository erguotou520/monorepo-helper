import * as vscode from "vscode";
import { ProgressLocation } from "vscode";
import { ChildProcessWithoutNullStreams, spawn } from "child_process";
import outputChannel from "./channel";
import { getRootPath } from ".";

export function runCommand(
  command: string[],
  onGetChild?: (child: ChildProcessWithoutNullStreams) => void
) {
  return new Promise<void>((resolve, reject) => {
    vscode.window.withProgress(
      {
        location: ProgressLocation.Notification,
        title: command.join(" "),
        cancellable: true,
      },
      (progress, token) => {
        const [child, promise] = runScript(command);
        token.onCancellationRequested(() => {
          outputChannel.appendLine(`Command cancelled: ${command.join(" ")}`);
          child?.kill();
        });

        let _timeout: NodeJS.Timeout;

        onGetChild?.(child);

        return promise
          .then(() => {
            resolve();
          })
          .catch(() => {
            reject();
          })
          .finally(() => {
            if (_timeout) {
              clearTimeout(_timeout);
            }
          });
      }
    );
  });
}

export function runScript(
  command: string[]
): [ChildProcessWithoutNullStreams, Promise<void>] {
  outputChannel.appendLine(`Running command: ${command.join(" ")}`);
  outputChannel.show();
  const child = spawn(command[0], command.slice(1), {
    cwd: getRootPath(),
    stdio: "pipe",
    shell: "/bin/bash",
  });
  child.stdout?.setEncoding("utf8");
  child.stderr?.setEncoding("utf8");

  function pipeOutput(chunk: any) {
    outputChannel.append(chunk.toString());
  }

  child.stdout?.on("data", pipeOutput);
  child.stderr?.on("data", pipeOutput);

  return [
    child,
    new Promise((resolve, reject) => {
      child.on("error", (error) => {
        vscode.window.showErrorMessage(error.message);
        reject();
      });
      child.on("close", (code, signal) => {
        if (code !== 0) {
          reject(code);
        } else {
          outputChannel.appendLine(
            `Command: ${command.join(" ")} ${
              "manuallyStopped" in child ? "was stoped" : "finished"
            }!`
          );
          resolve();
        }
      });
    }),
  ];
}

export function killProcess(
  child: ChildProcessWithoutNullStreams,
  name: string
) {
  return new Promise<void>((resolve) => {
    let timeout: NodeJS.Timeout;

    vscode.window.withProgress(
      {
        title: `Stopping ${name}`,
        location: ProgressLocation.Window,
      },
      (_process) => {
        return new Promise<void>((resolve1) => {
          function onStoped() {
            if (timeout) {
              clearTimeout(timeout);
            }
            resolve();
            resolve1();
          }

          child.once("exit", onStoped);
          child.once("error", onStoped);

          // @ts-ignore
          child["manuallyStopped"] = true;
          process.kill(child.pid);
          timeout = setTimeout(() => {
            child?.kill();
          }, 3000);
        });
      }
    );
  });
}
