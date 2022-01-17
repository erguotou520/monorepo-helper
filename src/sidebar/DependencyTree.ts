import * as vscode from "vscode";
import * as rimraf from "rimraf";
import { runCommand } from "./command";
import {
  getInstallCommand,
  getInstallDepCommand,
  getRemoveDepsCommand,
} from "./install";
import { getMonorepoPackages, PackageInfo } from "./packages";
import { resolve } from "path";
import outputChannel from "../output/channel";
import { showInfo } from "../utils";

export class ProjectTreeEntity extends vscode.TreeItem {
  constructor(
    public readonly name: string,
    public readonly folderName: string,
    public readonly isRoot: boolean,
    public readonly version: string,
    public readonly collapsibleState?: vscode.TreeItemCollapsibleState
  ) {
    super(isRoot ? `(root)${name}` : name, collapsibleState ?? vscode.TreeItemCollapsibleState.None);
    this.id = name;
    this.folderName = folderName;
    this.isRoot = isRoot;
    this.description = version;
    this.tooltip = `${name}@${version}`;
    this.version = version;
    this.contextValue = "parent";
  }
}

export class DependencyTypeTreeEntity extends vscode.TreeItem {
  constructor(
    public readonly dependencyType: "dependencies" | "devDependencies",
    public readonly packageName: string,
    public readonly folderName: string,
    public readonly isRoot: boolean,
    public readonly dependencies?: [string, string][],
    public readonly devDependencies?: [string, string][],
    public readonly collapsibleState?: vscode.TreeItemCollapsibleState
  ) {
    super(
      dependencyType,
      collapsibleState ?? vscode.TreeItemCollapsibleState.None
    );
    this.dependencyType = dependencyType;
    this.packageName = packageName;
    this.folderName = folderName;
    this.dependencies = dependencies;
    this.devDependencies = devDependencies;
    const depCount =
      dependencyType === "dependencies"
        ? dependencies!.length
        : devDependencies!.length;
    this.description = `count: ${depCount}`;
    this.tooltip = `${dependencyType}*${depCount}`;
    this.contextValue = "parent";
  }
}

export class DependencyTreeEntity extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly version: string,
    public readonly packageName: string,
    public readonly folderName: string,
    public readonly dependencyType: "dependencies" | "devDependencies",
    public readonly isRoot: boolean,
    public readonly collapsibleState?: vscode.TreeItemCollapsibleState
  ) {
    super(label, collapsibleState ?? vscode.TreeItemCollapsibleState.None);
    this.version = version;
    this.packageName = packageName;
    this.folderName = folderName;
    this.dependencyType = dependencyType;
    this.description = version;
    this.tooltip = `${label}@${version}`;
    this.contextValue = "node";
  }
}

export class DependencyTree
  implements vscode.TreeDataProvider<vscode.TreeItem>
{
  packagePromise: Promise<PackageInfo[]>;
  private _onDidChangeTreeData: vscode.EventEmitter<
    DependencyTreeEntity | undefined | void
  > = new vscode.EventEmitter<DependencyTreeEntity | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<
    DependencyTreeEntity | undefined | void
  > = this._onDidChangeTreeData.event;

  constructor() {
    // super();
    this.packagePromise = getMonorepoPackages();
  }

  refresh(): void {
    this.packagePromise = getMonorepoPackages(true);
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: DependencyTreeEntity): vscode.TreeItem {
    return element;
  }

  getChildren(element?: vscode.TreeItem): Thenable<vscode.TreeItem[]> {
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
      if (element instanceof DependencyTypeTreeEntity) {
        const depType = element.dependencyType;
        const dep =
          depType === "dependencies"
            ? element.dependencies
            : element.devDependencies;
        return (
          dep?.map(([name, version]) => {
            return new DependencyTreeEntity(
              name,
              version,
              element.packageName,
              element.folderName,
              depType,
              element.isRoot,
              vscode.TreeItemCollapsibleState.None
            );
          }) ?? []
        );
      }
      const el = element as ProjectTreeEntity;
      const project = packages.find((pkg) => pkg.pkg.name === element.id);
      return [
        new DependencyTypeTreeEntity(
          "dependencies",
          el.name,
          el.folderName,
          el.isRoot,
          project
            ? Object.keys(project.pkg.dependencies ?? {}).map((dep) => [
                dep,
                project.pkg.dependencies![dep],
              ])
            : [],
          [],
          vscode.TreeItemCollapsibleState.Collapsed
        ),
        new DependencyTypeTreeEntity(
          "devDependencies",
          el.name,
          el.folderName,
          el.isRoot,
          [],
          project
            ? Object.keys(project.pkg.devDependencies ?? {}).map((dep) => [
                dep,
                project.pkg.devDependencies![dep],
              ])
            : [],
          vscode.TreeItemCollapsibleState.Collapsed
        ),
      ];
    });
  }

  async installDeps(element: DependencyTreeEntity): Promise<void> {
    const command = getInstallCommand();
    if (command) {
      await runCommand(command);
      await this.refresh();
    }
  }

  addDep(element: DependencyTreeEntity): Thenable<void> {
    return vscode.window
      .showInputBox({
        title: "Enter dependency names",
        placeHolder: "eg: react react-dom axios",
      })
      .then(async (v) => {
        const dep = v?.trim();
        if (dep) {
          const command = getInstallDepCommand(dep.split(/[, ，;]/), {
            isDev: false,
            packageName: element.isRoot ? undefined : element.packageName,
            folderName: element.isRoot ? undefined : element.folderName,
          });
          if (command) {
            await runCommand(command);
            await this.refresh();
          }
        }
      });
  }

  addDevDep(element: DependencyTreeEntity): Thenable<void> {
    return vscode.window
      .showInputBox({
        title: "Enter dev dependency names",
        placeHolder: "eg: babel prettier eslint",
      })
      .then(async (v) => {
        const dep = v?.trim();
        if (dep) {
          const command = getInstallDepCommand(dep.split(/[, ，;]/), {
            isDev: true,
            packageName: element.isRoot ? undefined : element.packageName,
            folderName: element.isRoot ? undefined : element.folderName,
          });
          if (command) {
            await runCommand(command);
            await this.refresh();
          }
        }
      });
  }

  async removeDep(element: DependencyTreeEntity): Promise<void> {
    const command = getRemoveDepsCommand(element.label, {
      isDev: element.dependencyType === "devDependencies",
      packageName: element.isRoot ? undefined : element.packageName,
      folderName: element.isRoot ? undefined : element.folderName,
    });
    if (command) {
      await runCommand(command);
      await this.refresh();
    }
  }

  clearAllDeps(element: DependencyTreeEntity): Promise<void> {
    const subNodeModules = "packages/*/node_modules";
    const nodeModules = "node_modules";
    outputChannel.appendLine(`Clearing ${subNodeModules}`);
    return new Promise((_resolve, _reject) => {
      vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "Clearing node_modules",
        },
        (progress, _token) => {
          progress.report({
            increment: 0,
            message: "Start to clear packages node_modules",
          });
          return new Promise<void>((_resolve1, _reject1) => {
            rimraf(
              resolve(
                vscode.workspace.workspaceFolders![0].uri.path,
                subNodeModules
              ),
              (error) => {
                if (error) {
                  vscode.window.showErrorMessage(
                    "Failed to clear packages node_modules"
                  );
                  progress.report({
                    increment: 100,
                    message: "Failed to clear packages node_modules",
                  });
                  _reject1();
                  _reject();
                } else {
                  progress.report({
                    increment: 50,
                    message: "Start to clear root node_modules",
                  });
                  outputChannel.appendLine(`Clearing ${nodeModules}`);
                  rimraf(
                    resolve(
                      vscode.workspace.workspaceFolders![0].uri.path,
                      nodeModules
                    ),
                    (error) => {
                      if (error) {
                        progress.report({
                          increment: 50,
                          message: "Failed to clear root node_modules",
                        });
                        vscode.window.showErrorMessage(
                          "Failed to clear root node_modules"
                        );
                        _reject1();
                        _reject();
                      } else {
                        progress.report({
                          increment: 50,
                          message: "Node_modules cleared!",
                        });
                        showInfo("Node_modules cleared!");
                        _resolve1();
                        _resolve();
                      }
                    }
                  );
                }
              }
            );
          });
        }
      );
    });
  }

  async clearAllAndInstallDeps(element: DependencyTreeEntity): Promise<void> {
    await this.clearAllDeps(element);
    await this.installDeps(element);
  }
}

export default function register() {
  const dependencyTree = new DependencyTree();
  vscode.window.registerTreeDataProvider("monoDependencies", dependencyTree);
  vscode.commands.registerCommand("monoDependencies.refreshDeps", () =>
    dependencyTree.refresh()
  );
  vscode.commands.registerCommand(
    "monoDependencies.addDep",
    (node: DependencyTreeEntity) => dependencyTree.addDep(node)
  );
  vscode.commands.registerCommand(
    "monoDependencies.addDevDep",
    (node: DependencyTreeEntity) => dependencyTree.addDevDep(node)
  );
  vscode.commands.registerCommand(
    "monoDependencies.removeDep",
    (node: DependencyTreeEntity) => dependencyTree.removeDep(node)
  );
  vscode.commands.registerCommand(
    "monoDependencies.installDeps",
    (node: DependencyTreeEntity) => dependencyTree.installDeps(node)
  );
  vscode.commands.registerCommand(
    "monoDependencies.clearAllDeps",
    (node: DependencyTreeEntity) => dependencyTree.clearAllDeps(node)
  );
  vscode.commands.registerCommand(
    "monoDependencies.clearAllAndInstallDeps",
    (node: DependencyTreeEntity) => dependencyTree.clearAllAndInstallDeps(node)
  );
}
