// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import dependencyTreeRegister from "./tree/dependencies";
import scriptTreeRegister from "./tree/scripts";
import outputChannel from "./utils/channel";

let scriptDispose: () => void;

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  outputChannel.appendLine("active");
  dependencyTreeRegister();
  scriptDispose = scriptTreeRegister();
}

// this method is called when your extension is deactivated
export function deactivate() {
  outputChannel.appendLine("deactivate");
  scriptDispose();
}
