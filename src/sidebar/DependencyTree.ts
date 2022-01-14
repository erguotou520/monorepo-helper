import * as vscode from 'vscode';
import { getMonorepoPackages, PackageInfo } from './packages';
export class DependencyTreeEntity extends vscode.TreeItem {
  constructor(
    public readonly level: number,
    public readonly label: string,
    public readonly version: string,
    public readonly collapsibleState?: vscode.TreeItemCollapsibleState,
    public readonly dependencies?: [string, string][],
    public readonly devDependencies?: [string, string][],
  ) {
    super(label, collapsibleState ?? vscode.TreeItemCollapsibleState.None);
    this.level = level;
    this.dependencies = dependencies;
    this.devDependencies = devDependencies;
    this.description = version;
    this.tooltip = `${label}@${version}`;
    // this.iconPath = '../../assets/logo.svg';
    this.version = version;
    if (level === 2) {
      if (label === 'dependencies') {
        this.contextValue = 'addDep';
      } else if (label === 'devDependencies') {
        this.contextValue = 'addDevDep';
      }
    } else if (level === 3) {
      this.contextValue = 'removeDep';
    }
  }
}

export class DependencyTree implements vscode.TreeDataProvider<DependencyTreeEntity> {
  packagePromise: Promise<PackageInfo[]>;
  private _onDidChangeTreeData: vscode.EventEmitter<
    DependencyTreeEntity | undefined | void
  > = new vscode.EventEmitter<DependencyTreeEntity | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<DependencyTreeEntity | undefined | void> = this
    ._onDidChangeTreeData.event;

  constructor(
  ) {
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

  getChildren(element?: DependencyTreeEntity): Thenable<DependencyTreeEntity[]> {
    if (!element) {
      return this.packagePromise.then(packages => {
        return packages?.map(pkg => {
          return new DependencyTreeEntity(
            1,
            pkg.pkg.name!,
            pkg.pkg.version!,
            vscode.TreeItemCollapsibleState.Collapsed,
          );
        }) ?? [];
      });
    }
    return this.packagePromise.then(packages => {
      if (element.label === 'dependencies') {
        console.log(element);
        return element.dependencies!.map(dep => {
          return new DependencyTreeEntity(
            3,
            dep[0],
            dep[1],
            vscode.TreeItemCollapsibleState.None,
          );
        });
      }
      if (element.label === 'devDependencies') {
        return element.devDependencies!.map(dep => {
          return new DependencyTreeEntity(
            3,
            dep[0],
            dep[1],
            vscode.TreeItemCollapsibleState.None,
          );
        });
      }

      const project = packages.find(pkg => pkg.pkg.name === element.label);
      return [
          new DependencyTreeEntity(
            2,
            'dependencies',
            '',
            vscode.TreeItemCollapsibleState.Collapsed,
            project ? Object.keys(project.pkg.dependencies ?? {}).map(dep => ([dep, project.pkg.dependencies![dep]])) : [],
            [],
          ),
          new DependencyTreeEntity(
            2,
            'devDependencies',
            '',
            vscode.TreeItemCollapsibleState.Collapsed,
            [],
            project ? Object.keys(project.pkg.devDependencies ?? {}).map(dep => ([dep, project.pkg.devDependencies![dep]])) : [],
          ),
        ];
      
    });
  }

  addDep(element: DependencyTreeEntity): void {
    console.log(element.label);
  }

  addDevDep(element: DependencyTreeEntity): void {
    console.log(element.label);
  }

  removeDep(element: DependencyTreeEntity): void {
    console.log(element.label);
  }
}

export default function register() {
  const dependencyTree = new DependencyTree();
  vscode.window.registerTreeDataProvider('monoDependencies', dependencyTree);
  vscode.commands.registerCommand('monoDependencies.refreshDeps', () => dependencyTree.refresh());
  vscode.commands.registerCommand('monoDependencies.removeDeps', (node: DependencyTreeEntity) => dependencyTree.removeDep(node));
  vscode.commands.registerCommand('monoDependencies.addDep', (node: DependencyTreeEntity) => dependencyTree.addDep(node));
  vscode.commands.registerCommand('monoDependencies.addDevDep', (node: DependencyTreeEntity) => dependencyTree.addDevDep(node));
}