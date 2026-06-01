# ai-rules-sync

Write your AI coding rules once. Sync them everywhere.

Generate rule files for Claude Code, Codex, Cursor, GitHub Copilot, and other AI coding tools from a single `.ai-rules.md` file.

## Install

Run it directly in any project:

```bash
npx ai-rules-sync
```

Or install it as a dev dependency:

```bash
npm install --save-dev ai-rules-sync
```

## Usage

Create `.ai-rules.md` in your project root:

```md
# Project Rules

- Use TypeScript.
- Prefer simple solutions.
- Do not over-engineer.
- Follow the existing file structure.
- Do not modify unrelated files.
- Run tests before finalizing changes.
```

Then run:

```bash
npx ai-rules-sync
```

It generates:

```txt
CLAUDE.md
AGENTS.md
.cursor/rules/project.mdc
.github/copilot-instructions.md
```

Missing folders are created automatically.

## Options

Check whether generated files are up to date:

```bash
npx ai-rules-sync --check
```

Regenerate files whenever `.ai-rules.md` changes:

```bash
npx ai-rules-sync --watch
```

Generate one target:

```bash
npx ai-rules-sync --only cursor
```

Supported targets are `claude`, `codex`, `cursor`, and `copilot`.

## License

MIT
