// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import dependencyTreeRegister from './tree/dependencies';
import scriptTreeRegister from './tree/scripts';
import { showInfo } from './utils';

let scriptDispose: () => void;

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	
	dependencyTreeRegister();
	scriptDispose = scriptTreeRegister();

}

// this method is called when your extension is deactivated
export function deactivate() {
	showInfo('deactivate');
	scriptDispose();
}
