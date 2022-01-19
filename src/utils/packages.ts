import { getPackages } from "@manypkg/get-packages";
import { getRootPath } from ".";
import outputChannel from "./channel";

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
    scripts?: Record<string, string>;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
}

export async function getMonorepoPackages(
  refresh = false
): Promise<PackageInfo[]> {
  // cache
  if (!refresh && _packages) {
    return _packages;
  }
  const dir = getRootPath();
  if (dir) {
    try {
      const packages = await getPackages(dir);
      outputChannel.appendLine(`get packages: ${packages.packages.length}`);
      _manageTool = packages.tool;
      _packages = [
        {
          folderName: packages.root.dir,
          isRoot: true,
          pkg: packages.root.packageJson,
        },
        ...packages.packages.map((pkg) => ({
          folderName: pkg.dir,
          isRoot: false,
          pkg: pkg.packageJson,
        })),
      ];
      return _packages;
    } catch (error) {
      //
      console.error(error);
    }
  }
  return [];
}
