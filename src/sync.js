import { watch } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { resolveTargets } from "./targets.js";

export const SOURCE_FILE = ".ai-rules.md";

export class MissingSourceError extends Error {
  constructor(cwd) {
    super(`Missing ${SOURCE_FILE} in project root: ${cwd}`);
    this.name = "MissingSourceError";
  }
}

export async function syncRules(options) {
  const { cwd, only, check = false } = options;
  const sourcePath = path.join(cwd, SOURCE_FILE);
  const targets = resolveTargets(only);
  const sourceContent = await readSourceFile(sourcePath, cwd);
  const results = [];

  for (const target of targets) {
    const absoluteTargetPath = path.join(cwd, target.filePath);

    if (check) {
      const status = await getCheckStatus(absoluteTargetPath, sourceContent);
      results.push({ target, status });
      continue;
    }

    await mkdir(path.dirname(absoluteTargetPath), { recursive: true });
    await writeFile(absoluteTargetPath, sourceContent, "utf8");
    results.push({ target, status: "generated" });
  }

  return {
    sourceFile: SOURCE_FILE,
    results,
    ok: check ? results.every((result) => result.status === "up-to-date") : true
  };
}

export async function watchRules(options) {
  const { cwd, only, onRun, onError } = options;
  const sourcePath = path.join(cwd, SOURCE_FILE);
  onRun(await syncRules({ cwd, only }));

  let debounceTimer;
  const watcher = watch(sourcePath, { persistent: true }, () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      runWatchedSync({ cwd, only, onRun, onError });
    }, 100);
  });

  return watcher;
}

async function runWatchedSync(options) {
  const { cwd, only, onRun, onError } = options;

  try {
    const result = await syncRules({ cwd, only });
    onRun(result);
  } catch (error) {
    onError(error);
  }
}

async function readSourceFile(sourcePath, cwd) {
  try {
    return await readFile(sourcePath, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new MissingSourceError(cwd);
    }

    throw error;
  }
}

async function getCheckStatus(filePath, sourceContent) {
  try {
    const existingContent = await readFile(filePath, "utf8");
    return existingContent === sourceContent ? "up-to-date" : "out-of-date";
  } catch (error) {
    if (error.code === "ENOENT") {
      return "missing";
    }

    throw error;
  }
}
