import * as vscode from 'vscode';
import { join } from 'path';
import { readFile } from 'fs/promises';
import { getPackages, Packages } from '@manypkg/get-packages';

export let _packages: PackageInfo[];

export interface PackageInfo {
  folderName: string;
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
      _packages = [
        {
          folderName: packages.root.dir,
          pkg: packages.root.packageJson
        },
        ...packages.packages.map(pkg => ({
          folderName: pkg.dir,
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