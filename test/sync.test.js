import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import { MissingSourceError, syncRules } from "../src/sync.js";

const RULES = `# Project Rules

- Use TypeScript.
- Prefer simple solutions.
`;

test("syncRules generates every target from .ai-rules.md", async () => {
  const cwd = await createTempProject();

  try {
    await writeFile(path.join(cwd, ".ai-rules.md"), RULES, "utf8");

    const result = await syncRules({ cwd });

    assert.equal(result.ok, true);
    assert.deepEqual(
      result.results.map((item) => item.target.filePath),
      [
        "CLAUDE.md",
        "AGENTS.md",
        ".cursor/rules/project.mdc",
        ".github/copilot-instructions.md"
      ]
    );

    for (const filePath of result.results.map((item) => item.target.filePath)) {
      assert.equal(await readFile(path.join(cwd, filePath), "utf8"), RULES);
    }
  } finally {
    await removeTempProject(cwd);
  }
});

test("syncRules checks whether targets match the source", async () => {
  const cwd = await createTempProject();

  try {
    await writeFile(path.join(cwd, ".ai-rules.md"), RULES, "utf8");
    await syncRules({ cwd });
    await writeFile(path.join(cwd, "AGENTS.md"), "stale\n", "utf8");

    const result = await syncRules({ cwd, check: true });

    assert.equal(result.ok, false);
    assert.deepEqual(
      result.results.map((item) => [item.target.id, item.status]),
      [
        ["claude", "up-to-date"],
        ["codex", "out-of-date"],
        ["cursor", "up-to-date"],
        ["copilot", "up-to-date"]
      ]
    );
  } finally {
    await removeTempProject(cwd);
  }
});

test("syncRules does not rewrite targets that already match the source", async () => {
  const cwd = await createTempProject();

  try {
    await writeFile(path.join(cwd, ".ai-rules.md"), RULES, "utf8");
    await syncRules({ cwd, only: "codex" });

    const targetPath = path.join(cwd, "AGENTS.md");
    const before = await stat(targetPath);

    const result = await syncRules({ cwd, only: "codex" });
    const after = await stat(targetPath);

    assert.deepEqual(
      result.results.map((item) => [item.target.id, item.status]),
      [["codex", "up-to-date"]]
    );
    assert.equal(after.mtimeMs, before.mtimeMs);
    assert.equal(await readFile(targetPath, "utf8"), RULES);
  } finally {
    await removeTempProject(cwd);
  }
});

test("syncRules can target only Cursor", async () => {
  const cwd = await createTempProject();

  try {
    await writeFile(path.join(cwd, ".ai-rules.md"), RULES, "utf8");

    const result = await syncRules({ cwd, only: "cursor" });

    assert.deepEqual(
      result.results.map((item) => item.target.filePath),
      [".cursor/rules/project.mdc"]
    );
    assert.equal(await readFile(path.join(cwd, ".cursor/rules/project.mdc"), "utf8"), RULES);
  } finally {
    await removeTempProject(cwd);
  }
});

test("syncRules fails when the source file is missing", async () => {
  const cwd = await createTempProject();

  try {
    await assert.rejects(() => syncRules({ cwd }), MissingSourceError);
  } finally {
    await removeTempProject(cwd);
  }
});

async function createTempProject() {
  return await mkdtemp(path.join(os.tmpdir(), "ai-rules-sync-"));
}

async function removeTempProject(cwd) {
  await rm(cwd, { recursive: true, force: true });
}
