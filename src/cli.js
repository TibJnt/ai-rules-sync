import process from "node:process";

import { MissingSourceError, SOURCE_FILE, syncRules, watchRules } from "./sync.js";

const HELP_TEXT = `AI Rules Sync

Usage:
  ai-rules-sync [--check] [--watch] [--only <target>]

Targets:
  claude   CLAUDE.md
  codex    AGENTS.md
  cursor   .cursor/rules/project.mdc
  copilot  .github/copilot-instructions.md

Options:
  --check          Check whether generated files are up to date.
  --watch          Regenerate files whenever .ai-rules.md changes.
  --only <target>  Generate or check a single target.
  -h, --help       Show this help message.
`;

export async function runCli(argv, environment) {
  const options = parseArgs(argv);
  const { cwd, stdout, stderr } = environment;

  if (options.help) {
    stdout.write(HELP_TEXT);
    return 0;
  }

  try {
    if (options.watch) {
      return await runWatchMode({ cwd, stdout, stderr, only: options.only });
    }

    const result = await syncRules({
      cwd,
      only: options.only,
      check: options.check
    });

    writeResult(stdout, result, { check: options.check });
    return result.ok ? 0 : 1;
  } catch (error) {
    writeError(stderr, error);
    return 1;
  }
}

export function parseArgs(argv) {
  const options = {
    check: false,
    watch: false,
    only: null,
    help: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--check") {
      options.check = true;
      continue;
    }

    if (arg === "--watch") {
      options.watch = true;
      continue;
    }

    if (arg === "--only") {
      const value = argv[index + 1];

      if (!value || value.startsWith("-")) {
        throw new Error("Missing target after --only.");
      }

      options.only = value;
      index += 1;
      continue;
    }

    if (arg.startsWith("--only=")) {
      const value = arg.slice("--only=".length);

      if (!value) {
        throw new Error("Missing target after --only=.");
      }

      options.only = value;
      continue;
    }

    if (arg === "-h" || arg === "--help") {
      options.help = true;
      continue;
    }

    throw new Error(`Unknown option "${arg}".`);
  }

  if (options.check && options.watch) {
    throw new Error("Use either --check or --watch, not both.");
  }

  return options;
}

function writeResult(stdout, result, options) {
  stdout.write("AI Rules Sync\n\n");
  stdout.write(`✅ Found ${result.sourceFile}\n`);

  for (const { target, status } of result.results) {
    stdout.write(`${formatStatus(status, options.check)} ${formatTarget(target, status)}\n`);
  }

  if (options.check && !result.ok) {
    stdout.write("\nGenerated files are not up to date.\n");
    return;
  }

  stdout.write("\nDone.\n");
}

function formatStatus(status, check) {
  if (!check || status === "up-to-date") {
    return "✅";
  }

  return "❌";
}

function formatTarget(target, status) {
  if (status === "generated") {
    return target.generatedLabel;
  }

  if (status === "up-to-date") {
    return `${target.checkLabel} is up to date`;
  }

  if (status === "missing") {
    return `${target.checkLabel} is missing`;
  }

  return `${target.checkLabel} is out of date`;
}

async function runWatchMode(options) {
  const { cwd, stdout, stderr, only } = options;

  try {
    const watcher = await watchRules({
      cwd,
      only,
      onRun: (result) => writeResult(stdout, result, { check: false }),
      onError: (error) => writeError(stderr, error)
    });

    stdout.write(`\nWatching ${SOURCE_FILE} for changes. Press Ctrl+C to stop.\n`);

    return await new Promise((resolve) => {
      process.once("SIGINT", () => {
        watcher.close();
        stdout.write("\nStopped.\n");
        resolve(0);
      });
    });
  } catch (error) {
    writeError(stderr, error);
    return 1;
  }
}

function writeError(stderr, error) {
  stderr.write("AI Rules Sync\n\n");

  if (error instanceof MissingSourceError) {
    stderr.write(`❌ Missing ${SOURCE_FILE}\n`);
    return;
  }

  stderr.write(`❌ ${error.message}\n`);
}
