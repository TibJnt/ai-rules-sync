import test from "node:test";
import assert from "node:assert/strict";

import { parseArgs } from "../src/cli.js";

test("parseArgs supports flags and --only values", () => {
  assert.deepEqual(parseArgs(["--check", "--only", "cursor"]), {
    check: true,
    watch: false,
    only: "cursor",
    help: false
  });

  assert.deepEqual(parseArgs(["--only=claude"]), {
    check: false,
    watch: false,
    only: "claude",
    help: false
  });
});

test("parseArgs rejects incompatible modes", () => {
  assert.throws(() => parseArgs(["--check", "--watch"]), /either --check or --watch/);
});
