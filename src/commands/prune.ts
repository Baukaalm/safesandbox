import chalk from "chalk";
import readline from "node:readline";
import { getGit, SNAPSHOT_BRANCH } from "../core/git-utils.js";
import { assertInitialized, loadMeta, saveMeta } from "../utils/config.js";
import { SnapshotMeta } from "../utils/config.js";
import { SimpleGit } from "simple-git";

type PruneOptions = {
  keep?: string;
  olderThan?: string;
  force?: boolean;
};

const ask = (question: string): Promise<string> => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (ans) => { rl.close(); resolve(ans); }));
};

const parseOlderThan = (val: string): Date | null => {
  const m = val.match(/^(\d+)d$/);
  if (!m) return null;
  const d = new Date();
  d.setDate(d.getDate() - parseInt(m[1], 10));
  return d;
};

const dropCommits = async (git: SimpleGit, keep: SnapshotMeta[]): Promise<void> => {
  if (keep.length === 0) {
    // Delete the branch entirely and recreate with no history
    await git.raw(["update-ref", "-d", `refs/heads/${SNAPSHOT_BRANCH}`]);
    return;
  }
  // Re-point branch tip to the newest kept commit
  const newest = keep[keep.length - 1];
  await git.raw(["update-ref", `refs/heads/${SNAPSHOT_BRANCH}`, newest.commit]);
};

export const pruneCommand = async (opts: PruneOptions = {}) => {
  const cwd = process.cwd();
  try {
    await assertInitialized(cwd);
    const git = getGit(cwd);
    const meta = await loadMeta(cwd);

    if (meta.snapshots.length === 0) {
      console.log(chalk.gray("No snapshots to prune."));
      return;
    }

    const keepN = opts.keep !== undefined ? parseInt(opts.keep, 10) : undefined;
    const olderThanDate = opts.olderThan ? parseOlderThan(opts.olderThan) : null;

    if (opts.olderThan && !olderThanDate) {
      throw new Error("Invalid --older-than format. Use e.g. --older-than 7d");
    }
    if (keepN !== undefined && (isNaN(keepN) || keepN < 0)) {
      throw new Error("--keep must be a non-negative integer");
    }

    let toDelete: SnapshotMeta[] = [];

    if (keepN !== undefined) {
      toDelete = meta.snapshots.slice(0, Math.max(0, meta.snapshots.length - keepN));
    } else if (olderThanDate) {
      toDelete = meta.snapshots.filter((s) => new Date(s.timestamp) < olderThanDate);
    } else {
      throw new Error("Specify --keep <n> or --older-than <days>d");
    }

    if (toDelete.length === 0) {
      console.log(chalk.gray("Nothing to prune."));
      return;
    }

    const kept = meta.snapshots.filter((s) => !toDelete.includes(s));

    console.log();
    console.log(chalk.bold(`Pruning ${toDelete.length} snapshot(s), keeping ${kept.length}`));
    console.log(chalk.gray(`  Oldest kept: ${kept.length > 0 ? `#${kept[0].id} — ${kept[0].reason}` : "none"}`));
    console.log();

    if (!opts.force) {
      const ans = await ask("Continue? [y/N] ");
      if (ans.trim().toLowerCase() !== "y") {
        console.log(chalk.gray("Prune cancelled."));
        return;
      }
    }

    await dropCommits(git, kept);
    await saveMeta(cwd, { ...meta, snapshots: kept });

    // Run git gc to reclaim disk space
    await git.raw(["gc", "--prune=now", "--quiet"]).catch(() => null);

    console.log(chalk.green(`✓ Pruned ${toDelete.length} snapshot(s)`));
    if (kept.length > 0) {
      console.log(chalk.gray(`  ${kept.length} snapshot(s) remain, starting at #${kept[0].id}`));
    }
  } catch (err) {
    console.error(chalk.red("Error:"), err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
};
