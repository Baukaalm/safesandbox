import path from "node:path";
import fs from "node:fs/promises";
import chalk from "chalk";
import { ensureRepo, SNAPSHOT_BRANCH, branchExists, EMPTY_TREE } from "../core/git-utils.js";
import { saveMeta, getConfigDir, saveConfig } from "../utils/config.js";

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
      ignoredPaths: ["node_modules", ".git", "dist", "build", ".safesandbox"],
    });

    console.log(chalk.green("✓ SafeSandbox initialized"));
    console.log(chalk.gray(`  Snapshot branch: ${SNAPSHOT_BRANCH}`));
    console.log(chalk.gray(`  Metadata: ${dir}`));
  } catch (err) {
    console.error(chalk.red("Error:"), err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
};
