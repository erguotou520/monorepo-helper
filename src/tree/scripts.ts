import { ChildProcessWithoutNullStreams } from "child_process";
import * as vscode from "vscode";
import { showInfo } from "../utils";
import { killProcess, runScript } from "../utils/command";
import { getScriptCommand } from "../utils/install";
import {
  getManageTool,
  getMonorepoPackages,
  PackageInfo,
} from "../utils/packages";
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
    this.contextValue = "node";
  }
}

export class RunningScriptTreeEntity extends CommonTreeEntity {
  constructor(
    public readonly packageName: string,
    public readonly folderName: string,
    public readonly isRoot: boolean,
    public readonly script: string,
    public readonly scriptCommand: string,
    public readonly child: ChildProcessWithoutNullStreams
  ) {
    super(
      script,
      packageName,
      folderName,
      isRoot,
      vscode.TreeItemCollapsibleState.None
    );
    this.description = "running";
    this.tooltip = scriptCommand;
    this.contextValue = "runningNode";
  }
}

interface ProcessInfo {
  packageName: string;
  folderName: string;
  isRoot: boolean;
  script: string;
  scriptCommand: string;
  child: ChildProcessWithoutNullStreams;
}

export class ScriptTree implements vscode.TreeDataProvider<CommonTreeEntity> {
  packagePromise: Promise<PackageInfo[]>;
  processPool: ProcessInfo[];
  private _onDidChangeTreeData: vscode.EventEmitter<
    CommonTreeEntity | undefined | void
  > = new vscode.EventEmitter<CommonTreeEntity | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<
    CommonTreeEntity | undefined | void
  > = this._onDidChangeTreeData.event;

  constructor() {
    // super();
    this.packagePromise = getMonorepoPackages();
    this.processPool = [];
  }

  killAll() {
    for (const task of this.processPool) {
      killProcess(task.child, task.script);
    }
  }

  runScript(element: CommonTreeEntity) {
    const node = element as ScriptTreeEntity;
    const command = getScriptCommand(node.label, {
      packageName: node.isRoot ? undefined : node.packageName,
      folderName: node.isRoot ? undefined : node.folderName,
    });
    if (command) {
      const [child, promise] = runScript(command);
      const _process: ProcessInfo = {
        packageName: node.packageName,
        folderName: node.folderName,
        isRoot: false,
        script: node.label,
        scriptCommand: node.scriptCommand,
        child,
      };
      this.processPool.push(_process);
      this.refresh();
      promise
        .then(() => {
          showInfo(`Command "${command.join(" ")}" finished!`);
        })
        .finally(() => {
          this.refresh();
          const index = this.processPool.findIndex(
            (item) => item.child === child
          );
          if (index !== -1) {
            this.processPool.splice(index, 1);
          }
        });
    }
  }

  async stopScript(element: CommonTreeEntity) {
    const index = this.processPool.findIndex(
      (item) =>
        item.packageName === element.packageName &&
        item.folderName === element.folderName &&
        item.script === element.label
    );
    if (index !== -1) {
      await killProcess(
        this.processPool[index].child,
        this.processPool[index].script
      );
      this.processPool.splice(index, 1);
    }
  }

  async reRunScript(element: CommonTreeEntity) {
    await this.stopScript(element);
    this.runScript(element);
  }

  refresh(force = false): void {
    if (force) {
      this.packagePromise = getMonorepoPackages(true);
    }
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: CommonTreeEntity): CommonTreeEntity {
    if (element instanceof ScriptTreeEntity) {
      if (
        this.processPool.some(
          (item) =>
            item.packageName === element.packageName &&
            item.folderName === element.folderName &&
            item.script === element.label
        )
      ) {
        element.contextValue = "runningNode";
      }
    }
    return element;
  }

  getChildren(element?: CommonTreeEntity): Thenable<CommonTreeEntity[]> {
    if (!element) {
      return this.packagePromise.then((packages) => {
        return [
          ...(packages?.map((pkg) => {
            return new ProjectTreeEntity(
              pkg.pkg.name!,
              pkg.folderName!,
              pkg.isRoot,
              pkg.pkg.version!,
              vscode.TreeItemCollapsibleState.Collapsed
            );
          }) ?? []),
          new CommonTreeEntity(
            "Running scripts",
            "",
            "",
            false,
            vscode.TreeItemCollapsibleState.Expanded
          ),
        ];
      });
    }
    return this.packagePromise.then((packages) => {
      if (element instanceof ProjectTreeEntity) {
        const project = packages.find(
          (pkg) => pkg.pkg.name === element.packageName
        );
        return Object.keys(project?.pkg.scripts ?? {}).map((scriptName) => {
          return new ScriptTreeEntity(
            scriptName,
            project!.pkg.scripts![scriptName]!,
            project!.pkg.name!,
            project!.folderName!,
            project!.isRoot
          );
        });
      } else if (element.label === "Running scripts") {
        return this.processPool.map((item) => {
          return new RunningScriptTreeEntity(
            item.packageName,
            item.folderName,
            item.isRoot,
            item.script,
            item.scriptCommand,
            item.child
          );
        });
      }
      return [];
    });
  }
}

export default function register(): () => void {
  const scriptTree = new ScriptTree();
  vscode.window.registerTreeDataProvider("monoScripts", scriptTree);
  vscode.commands.registerCommand("monoScripts.refreshScripts", () =>
    scriptTree.refresh(true)
  );
  vscode.commands.registerCommand(
    "monoScripts.runScript",
    (node: CommonTreeEntity) => scriptTree.runScript(node)
  );
  vscode.commands.registerCommand(
    "monoScripts.stopScript",
    (node: CommonTreeEntity) => scriptTree.stopScript(node)
  );
  vscode.commands.registerCommand(
    "monoScripts.reRunScript",
    (node: CommonTreeEntity) => scriptTree.reRunScript(node)
  );
  vscode.commands.registerCommand(
    "monoScripts.stopAllScripts",
    (node: CommonTreeEntity) => scriptTree.killAll()
  );
  return scriptTree.killAll;
}
