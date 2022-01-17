import * as vscode from "vscode";
import { runCommand } from "../utils/command";
import { getMonorepoPackages, PackageInfo } from "../utils/packages";
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
      isRoot ? `(root)${name}` : name,
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
    // const child = runCommand()
    console.log(node);
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
          false
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
