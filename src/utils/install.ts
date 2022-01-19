import { getManageTool } from "./packages";

export type CommandReturn = string[] | undefined;

export function getInstallCommand(): CommandReturn {
  return {
    npm: ["npm", "install"],
    yarn: ["yarn", "install"],
    pnpm: ["pnpm", "install"],
  }[getManageTool()];
}

export function getInstallDepCommand(
  deps: string[],
  {
    isDev,
    packageName,
    folderName,
  }: {
    isDev: boolean;
    packageName?: string;
    folderName?: string;
  }
): CommandReturn {
  return {
    npm: [
      "npm",
      "add",
      ...deps,
      ...(isDev ? ["-D"] : ["--save"]),
      ...(folderName ? ["-w", folderName] : []),
    ],
    yarn: [
      "yarn",
      ...(packageName ? ["workspace", packageName] : ["-W"]),
      "add",
      ...deps,
      ...(isDev ? ["-D"] : []),
    ],
    pnpm: [
      "pnpm",
      ...(packageName ? ["--filter", packageName] : ["-W"]),
      "add",
      ...deps,
      ...(isDev ? ["-D"] : []),
    ],
  }[getManageTool()];
}

export function getRemoveDepsCommand(
  dep: string,
  {
    isDev,
    packageName,
    folderName,
  }: {
    isDev: boolean;
    packageName?: string;
    folderName?: string;
  }
): CommandReturn {
  return {
    npm: [
      "npm",
      "uninstall",
      ...(isDev ? ["-D"] : ["--save"]),
      ...(folderName ? ["-w", folderName] : []),
      dep,
    ],
    yarn: [
      "yarn",
      ...(packageName ? ["workspace", packageName] : ["-W"]),
      "remove",
      dep,
    ],
    pnpm: [
      "pnpm",
      "remove",
      dep,
      ...(packageName ? ["--filter", packageName] : []),
    ],
  }[getManageTool()];
}

export function getScriptCommand(
  script: string,
  {
    packageName,
    folderName,
  }: {
    packageName?: string;
    folderName?: string;
  }
): CommandReturn {
  return {
    npm: ["npm", "run", script, folderName ? `--workspace=${folderName}` : ""],
    yarn: ["yarn", ...(folderName ? ["--cwd", folderName] : []), script],
    pnpm: [
      "pnpm",
      "run",
      script,
      ...(packageName ? ["--filter", packageName] : []),
    ],
  }[getManageTool()];
}
