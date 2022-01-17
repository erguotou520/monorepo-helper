import * as vscode from "vscode";
import { showInfo } from "../utils";
import outputChannel from "../utils/channel";
import { runCommand, runScript } from "../utils/command";
import { getScriptCommand } from "../utils/install";
import { getManageTool, getMonorepoPackages, PackageInfo } from "../utils/packages";
import { CommonTreeEntity } from "./common";

export class ProjectTreeEntity extends CommonTreeEntity {
  constructor(
    public readonly name: string,
    public readonly folderName: string,
    public readonly isRoot: boolean,
    public readonly version: string,
    public readonly collapsibleState?: vscode.TreeItemCollapsibleState
  ) {
    super(
      isRoot ? `(root)${name}[${getManageTool()}]` : name,
      name,
      folderName,
      isRoot,
      collapsibleState ?? vscode.TreeItemCollapsibleState.None
    );
    this.description = version;
    this.tooltip = `${name}@${version}`;
    this.version = version;
  }
}

export class ScriptTreeEntity extends CommonTreeEntity {
  constructor(
    public readonly label: string,
    public readonly scriptCommand: string,
    public readonly packageName: string,
    public readonly folderName: string,
    public readonly isRoot: boolean,
    public readonly collapsibleState?: vscode.TreeItemCollapsibleState
  ) {
    super(
      label,
      packageName,
      folderName,
      isRoot,
      collapsibleState ?? vscode.TreeItemCollapsibleState.None
    );
    this.scriptCommand = scriptCommand;
    this.tooltip = scriptCommand;
    this.contextValue = 'node';
  }
}

interface ProcessInfo {
  packageName: string;
  folderName: string;
  isRoot: boolean;
  script: string;
}

export class ScriptTree implements vscode.TreeDataProvider<CommonTreeEntity> {
  packagePromise: Promise<PackageInfo[]>;
  processMap: Map<ProcessInfo, number>;
  private _onDidChangeTreeData: vscode.EventEmitter<
    CommonTreeEntity | undefined | void
  > = new vscode.EventEmitter<CommonTreeEntity | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<
    CommonTreeEntity | undefined | void
  > = this._onDidChangeTreeData.event;

  constructor() {
    // super();
    this.packagePromise = getMonorepoPackages();
    this.processMap = new Map();
  }

  dispose() {
    this.processMap.forEach((pid, info) => {
      process.kill(pid);
    });
  }

  runScript(element: CommonTreeEntity) {
    const node = element as ScriptTreeEntity;
    const command = getScriptCommand(node.label, {
      packageName: node.isRoot ? undefined : node.packageName,
      folderName: node.isRoot ? undefined : node.folderName,
    });
    if (command) {
      const _process = { packageName: node.packageName, folderName: node.folderName, isRoot: false, script: node.scriptCommand };
      // element.contextValue = 'running';
      vscode.commands.executeCommand('setContext', 'viewItem == runningNode', true);
      showInfo(`Running ${command.join(' ')}`);
      const [child, promise] = runScript(command);
      this.processMap.set(
        _process,
        child.pid
      );
      promise.then(() => {
        showInfo(`Command "${command.join(' ')}" finished!`);
      }).finally(() => {
        // element.contextValue = 'node';
        vscode.commands.executeCommand('setContext', 'viewItem == node', true);
        this.refresh();
        this.processMap.delete(_process);
      });
    }
  }

  refresh(): void {
    this.packagePromise = getMonorepoPackages(true);
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: CommonTreeEntity): CommonTreeEntity {
    return element;
  }

  getChildren(element?: CommonTreeEntity): Thenable<CommonTreeEntity[]> {
    if (!element) {
      return this.packagePromise.then((packages) => {
        return (
          packages?.map((pkg) => {
            return new ProjectTreeEntity(
              pkg.pkg.name!,
              pkg.folderName!,
              pkg.isRoot,
              pkg.pkg.version!,
              vscode.TreeItemCollapsibleState.Collapsed
            );
          }) ?? []
        );
      });
    }
    return this.packagePromise.then((packages) => {
      const el = element as ProjectTreeEntity;
      const project = packages.find((pkg) => pkg.pkg.name === el.packageName);
      return Object.keys(project?.pkg.scripts ?? {}).map((scriptName) => {
        return new ScriptTreeEntity(
          scriptName,
          project!.pkg.scripts![scriptName]!,
          project!.pkg.name!,
          project!.folderName!,
          project!.isRoot
        );
      });
    });
  }
}

export default function register(): () => void {
  const scriptTree = new ScriptTree();
  vscode.window.registerTreeDataProvider("monoScripts", scriptTree);
  vscode.commands.registerCommand("monoScripts.refreshScripts", () =>
    scriptTree.refresh()
  );
  vscode.commands.registerCommand(
    "monoScripts.runScript",
    (node: CommonTreeEntity) => scriptTree.runScript(node)
  );
  return scriptTree.dispose;
}
