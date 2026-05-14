import path from "node:path";
import fs from "node:fs/promises";
import chalk from "chalk";
import { ensureRepo, SNAPSHOT_BRANCH, branchExists, EMPTY_TREE } from "../core/git-utils.js";
import { saveMeta, getConfigDir, saveConfig } from "../utils/config.js";

const AGENTS_MD_SECTION = `
## SafeSandbox

SafeSandbox is running in this repository and auto-creates restore points as you work.

### Prohibited actions

- \`git reset --hard\` — use \`safesandbox rollback <id>\` instead
- \`git clean -fd\` — use \`safesandbox rollback <id>\` instead
- Mass deletion of files without explicit user instruction
- Modifying \`.safesandbox/\` directory

### Required behavior

- Before a large refactor, run: \`safesandbox snapshot "before <task>"\`
- After significant changes, report a brief summary of what was touched
- Prefer small, focused diffs over large sweeping rewrites
- If unsure about a destructive operation — ask the user first

### Restore workflow

\`\`\`bash
safesandbox timeline          # see history
safesandbox rollback latest   # undo last AI session
safesandbox rollback <id>     # restore specific snapshot
\`\`\`
`;

const writeAgentsMd = async (cwd: string): Promise<boolean> => {
  const file = path.join(cwd, "AGENTS.md");
  const marker = "## SafeSandbox";
  try {
    const existing = await fs.readFile(file, "utf-8");
    if (existing.includes(marker)) return false;
    await fs.writeFile(file, existing.trimEnd() + "\n" + AGENTS_MD_SECTION);
  } catch {
    await fs.writeFile(file, `# Agent Rules${AGENTS_MD_SECTION}`);
  }
  return true;
};

export const initCommand = async () => {
  const cwd = process.cwd();
  try {
    const git = await ensureRepo(cwd);

    const dir = getConfigDir(cwd);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, ".gitignore"), "*\n");

    if (!(await branchExists(git, SNAPSHOT_BRANCH))) {
      const initCommit = (
        await git.raw(["commit-tree", EMPTY_TREE, "-m", "safesandbox init"])
      ).trim();
      await git.raw(["update-ref", `refs/heads/${SNAPSHOT_BRANCH}`, initCommit]);
    }

    await saveMeta(cwd, { version: 1, snapshots: [] });
    await saveConfig(cwd, {
      thresholdFiles: 5,
      thresholdSeconds: 10,
      maxSnapshots: 200,
      ignoredPaths: ["node_modules", ".git", "dist", "build", ".safesandbox"],
    });

    const wroteRules = await writeAgentsMd(cwd);

    console.log(chalk.green("✓ SafeSandbox initialized"));
    console.log(chalk.gray(`  Snapshot branch: ${SNAPSHOT_BRANCH}`));
    console.log(chalk.gray(`  Metadata: ${dir}`));
    if (wroteRules) {
      console.log(chalk.gray(`  Agent rules: AGENTS.md`));
    }
  } catch (err) {
    console.error(chalk.red("Error:"), err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
};
