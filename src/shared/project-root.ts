import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Root `package.json` `name` for this monorepo (MCP server + shared `data/`). */
export const ROOT_PACKAGE_NAMES: readonly string[] = ["tartarus-workspace"];

function readPackageJsonName(dir: string): string | null {
  const pkgPath = path.join(dir, "package.json");
  if (!fs.existsSync(pkgPath)) return null;
  try {
    const raw = fs.readFileSync(pkgPath, "utf8");
    const parsed = JSON.parse(raw) as { name?: unknown };
    return typeof parsed.name === "string" ? parsed.name : null;
  } catch {
    return null;
  }
}

/**
 * Resolve the monorepo root (directory with root package.json / Soul.xml)
 * starting from a directory path (e.g. __dirname of the caller).
 */
export function resolveMonorepoRootFromDir(startDir: string): string {
  let dir = startDir;
  for (let i = 0; i < 24; i++) {
    const pkgName = readPackageJsonName(dir);
    if (pkgName && ROOT_PACKAGE_NAMES.includes(pkgName)) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  dir = startDir;
  for (let i = 0; i < 24; i++) {
    if (
      fs.existsSync(path.join(dir, "package.json")) ||
      fs.existsSync(path.join(dir, "Soul.xml"))
    ) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  return startDir;
}

/** Resolve monorepo root from `import.meta.url` of the calling module. */
export function resolveMonorepoRootFromImportMeta(importMetaUrl: string): string {
  return resolveMonorepoRootFromDir(path.dirname(fileURLToPath(importMetaUrl)));
}
