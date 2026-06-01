export const TARGETS = [
  {
    id: "claude",
    aliases: ["claude-code"],
    filePath: "CLAUDE.md",
    generatedLabel: "Generated CLAUDE.md",
    checkLabel: "CLAUDE.md"
  },
  {
    id: "codex",
    aliases: ["agents"],
    filePath: "AGENTS.md",
    generatedLabel: "Generated AGENTS.md",
    checkLabel: "AGENTS.md"
  },
  {
    id: "cursor",
    aliases: [],
    filePath: ".cursor/rules/project.mdc",
    generatedLabel: "Generated .cursor/rules/project.mdc",
    checkLabel: ".cursor/rules/project.mdc"
  },
  {
    id: "copilot",
    aliases: ["github", "github-copilot"],
    filePath: ".github/copilot-instructions.md",
    generatedLabel: "Generated .github/copilot-instructions.md",
    checkLabel: ".github/copilot-instructions.md"
  }
];

export function resolveTargets(only) {
  if (!only) {
    return TARGETS;
  }

  const normalizedOnly = only.trim().toLowerCase();
  const target = TARGETS.find((candidate) => {
    return candidate.id === normalizedOnly || candidate.aliases.includes(normalizedOnly);
  });

  if (!target) {
    const supportedTargets = TARGETS.map((candidate) => candidate.id).join(", ");
    throw new Error(`Unknown target "${only}". Use one of: ${supportedTargets}.`);
  }

  return [target];
}
