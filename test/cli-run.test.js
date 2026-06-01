import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import { runCli } from "../src/cli.js";

test("runCli generates every target and prints the success output", async () => {
  const cwd = await createTempProject();
  const stdout = createWritableCapture();
  const stderr = createWritableCapture();

  try {
    await writeFile(path.join(cwd, ".ai-rules.md"), "# Rules\n\n- Ship it.\n", "utf8");

    const exitCode = await runCli([], { cwd, stdout, stderr });

    assert.equal(exitCode, 0);
    assert.equal(stderr.content, "");
    assert.match(stdout.content, /AI Rules Sync/);
    assert.match(stdout.content, /Generated CLAUDE\.md/);
    assert.match(stdout.content, /Generated \.github\/copilot-instructions\.md/);
    assert.equal(await readFile(path.join(cwd, "AGENTS.md"), "utf8"), "# Rules\n\n- Ship it.\n");
  } finally {
    await removeTempProject(cwd);
  }
});

test("runCli returns a failing status when --check finds drift", async () => {
  const cwd = await createTempProject();
  const stdout = createWritableCapture();
  const stderr = createWritableCapture();

  try {
    await writeFile(path.join(cwd, ".ai-rules.md"), "# Rules\n", "utf8");
    await writeFile(path.join(cwd, "CLAUDE.md"), "old\n", "utf8");

    const exitCode = await runCli(["--check", "--only", "claude"], { cwd, stdout, stderr });

    assert.equal(exitCode, 1);
    assert.equal(stderr.content, "");
    assert.match(stdout.content, /CLAUDE\.md is out of date/);
  } finally {
    await removeTempProject(cwd);
  }
});

test("runCli reports a missing source file", async () => {
  const cwd = await createTempProject();
  const stdout = createWritableCapture();
  const stderr = createWritableCapture();

  try {
    const exitCode = await runCli([], { cwd, stdout, stderr });

    assert.equal(exitCode, 1);
    assert.equal(stdout.content, "");
    assert.match(stderr.content, /Missing \.ai-rules\.md/);
  } finally {
    await removeTempProject(cwd);
  }
});

function createWritableCapture() {
  return {
    content: "",
    write(chunk) {
      this.content += chunk;
    }
  };
}

async function createTempProject() {
  return await mkdtemp(path.join(os.tmpdir(), "ai-rules-sync-cli-"));
}

async function removeTempProject(cwd) {
  await rm(cwd, { recursive: true, force: true });
}
