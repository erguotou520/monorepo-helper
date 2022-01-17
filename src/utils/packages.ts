import * as vscode from 'vscode';
import { getPackages, Packages } from '@manypkg/get-packages';

let _packages: PackageInfo[];
let _manageTool: string;

export function getManageTool() {
  return _manageTool;
}

export interface PackageInfo {
  folderName: string;
  isRoot: boolean;
  pkg: {
    name?: string;
    version?: string;
    scripts?: Record<string, string>
    dependencies?: Record<string, string>
    devDependencies?: Record<string, string>
  }
}

export async function getMonorepoPackages(refresh = false): Promise<PackageInfo[]> {
  // cache
  if (!refresh && _packages) {
    return _packages;
  }
  const dir = vscode.workspace.workspaceFolders?.[0].uri.path;
  if (dir) {
    try {
      const packages = await getPackages(dir);
      _manageTool = packages.tool;
      _packages = [
        {
          folderName: packages.root.dir,
          isRoot: true,
          pkg: packages.root.packageJson
        },
        ...packages.packages.map(pkg => ({
          folderName: pkg.dir,
          isRoot: false,
          pkg: pkg.packageJson
        }))
      ];
      return _packages;
    } catch (error) {
      //
      console.error(error);
    }
  }
  return [];
}