import chalk from "chalk";
import { getGit, SNAPSHOT_BRANCH, branchExists } from "../core/git-utils.js";
import { assertInitialized, loadMeta, loadConfig } from "../utils/config.js";
import { formatRelativeTime } from "../utils/format.js";

const getBranchSize = async (git: ReturnType<typeof getGit>): Promise<string> => {
  try {
    const out = await git.raw(["count-objects", "-v"]);
    const sizeMatch = out.match(/size-pack:\s+(\d+)/);
    if (sizeMatch) {
      const kb = parseInt(sizeMatch[1], 10);
      if (kb < 1024) return `${kb} KB`;
      return `${(kb / 1024).toFixed(1)} MB`;
    }
  } catch {
    // ignore
  }
  return "unknown";
};

export const statusCommand = async () => {
  const cwd = process.cwd();
  try {
    await assertInitialized(cwd);
    const git = getGit(cwd);
    const meta = await loadMeta(cwd);
    const cfg = await loadConfig(cwd);

    const branchOk = await branchExists(git, SNAPSHOT_BRANCH);
    const total = meta.snapshots.length;
    const last = total > 0 ? meta.snapshots[total - 1] : null;
    const size = await getBranchSize(git);

    console.log();
    console.log(chalk.bold("SafeSandbox status"));
    console.log();
    console.log(`  Snapshots   ${chalk.cyan(total.toString())}${last ? chalk.gray(` (last: #${last.id} — ${last.reason} ${formatRelativeTime(last.timestamp)})`) : ""}`);
    console.log(`  Branch      ${branchOk ? chalk.green("✓ " + SNAPSHOT_BRANCH) : chalk.red("✗ missing")}`);
    console.log(`  Pack size   ${chalk.gray(size)}`);
    console.log();
    console.log(chalk.gray("  Config:"));
    console.log(chalk.gray(`    thresholdFiles:   ${cfg.thresholdFiles}`));
    console.log(chalk.gray(`    thresholdSeconds: ${cfg.thresholdSeconds}`));
    console.log(chalk.gray(`    maxSnapshots:     ${"maxSnapshots" in cfg ? (cfg as { maxSnapshots?: number }).maxSnapshots ?? "unlimited" : "unlimited"}`));
    console.log();

    if (total > 50) {
      console.log(chalk.yellow(`  ⚠ ${total} snapshots accumulated. Consider running:`));
      console.log(chalk.yellow(`    safesandbox prune --keep 50`));
      console.log();
    }
  } catch (err) {
    console.error(chalk.red("Error:"), err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
};
