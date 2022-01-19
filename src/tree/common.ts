import { TreeItem, TreeItemCollapsibleState } from "vscode";

export class CommonTreeEntity extends TreeItem {
  constructor(
    public readonly label: string,
    public readonly packageName: string,
    public readonly folderName: string,
    public readonly isRoot: boolean,
    public readonly collapsibleState?: TreeItemCollapsibleState
  ) {
    super(label, collapsibleState);
  }
}
