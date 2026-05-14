import chalk from "chalk";
import readline from "node:readline";
import fs from "node:fs/promises";
import path from "node:path";
import { SimpleGit } from "simple-git";
import { getGit, SNAPSHOT_BRANCH } from "../core/git-utils.js";
import { createSnapshot } from "../core/snapshots.js";
import { assertInitialized, loadMeta } from "../utils/config.js";

const ask = (question: string): Promise<string> => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) =>
    rl.question(question, (ans) => {
      rl.close();
      resolve(ans);
    }),
  );
};

const getChangedFiles = async (
  git: SimpleGit,
  commit: string,
): Promise<string> => {
  try {
    // Compare HEAD to the snapshot. If no HEAD (fresh repo), fall back to
    // listing the snapshot's files so the output is still informative.
    const hasHead = await git.raw(["rev-parse", "--verify", "HEAD"]).then(() => true).catch(() => false);
    if (hasHead) {
      const diff = await git.diff(["--stat", "HEAD", commit]);
      return diff || "(no changes)";
    }
    const files = (await git.raw(["ls-tree", "-r", "--name-only", commit]))
      .trim()
      .split("\n")
      .filter(Boolean);
    return files.length ? `Will restore ${files.length} file(s):\n` + files.map(f => `  ${f}`).join("\n") : "(no changes)";
  } catch {
    return "";
  }
};

const resolveCommit = async (
  git: SimpleGit,
  cwd: string,
  id: number,
): Promise<string | undefined> => {
  try {
    const meta = await loadMeta(cwd);
    const snapshot = meta.snapshots.find((s) => s.id === id);

    if (snapshot) {
      return snapshot.commit;
    }
  } catch {
    // fall through
  }

  try {
    const hash = (
      await git.raw([
        "log",
        SNAPSHOT_BRANCH,
        "--grep",
        `safesnapshot:${id}`,
        "-1",
        "--format=%H",
      ])
    ).trim();

    if (hash) {
      return hash;
    }
  } catch {
    // ignore
  }

  return undefined;
};

const removeNewFiles = async (git: SimpleGit, cwd: string, targetCommit: string): Promise<void> => {
  const snapshotFiles = new Set(
    (await git.raw(["ls-tree", "-r", "--name-only", targetCommit])).trim().split("\n").filter(Boolean),
  );
  const status = await git.status();
  const allTracked = await git.raw(["ls-files"]);
  const trackedFiles = new Set(allTracked.trim().split("\n").filter(Boolean));
  const untracked = status.not_added;

  const toDelete = [
    ...Array.from(trackedFiles).filter((f) => !snapshotFiles.has(f)),
    ...untracked,
  ];

  for (const f of toDelete) {
    const abs = path.join(cwd, f);
    await fs.rm(abs, { recursive: true, force: true });
  }
};

export const rollbackCommand = async (idStr: string, opts: { force?: boolean } = {}) => {
  const cwd = process.cwd();

  try {
    await assertInitialized(cwd);

    const git = getGit(cwd);

    const isLatest = idStr === "latest";
    let id: number;

    if (isLatest) {
      const meta = await loadMeta(cwd);
      if (meta.snapshots.length === 0) throw new Error("No snapshots yet.");
      id = meta.snapshots[meta.snapshots.length - 1].id;
    } else {
      id = parseInt(idStr, 10);
      if (Number.isNaN(id) || id <= 0) {
        throw new Error("Snapshot ID must be a positive integer or 'latest'.");
      }
    }

    const commit = await resolveCommit(git, cwd, id);

    if (!commit) {
      throw new Error(`Snapshot #${id} not found.`);
    }

    const summary = await getChangedFiles(git, commit);
    const status = await git.status();
    const dirty = !status.isClean();

    console.log();
    console.log(chalk.bold(`Rolling back to snapshot #${id}`));
    console.log(chalk.gray(commit.slice(0, 7)));
    console.log();

    if (summary) {
      console.log(chalk.bold("Files that will change:"));
      console.log(summary);
      console.log();
    }

    if (dirty) {
      console.log(
        chalk.yellow(
          "You have uncommitted changes. SafeSandbox will create an emergency backup snapshot before rollback.\n",
        ),
      );
    }

    if (!opts.force) {
      const answer = await ask("Continue? [y/N] ");
      if (answer.trim().toLowerCase() !== "y") {
        console.log(chalk.gray("Rollback cancelled."));
        return;
      }
    }

    if (dirty) {
      const backup = await createSnapshot(
        git,
        cwd,
        `pre-rollback backup before snapshot #${id}`,
        status.files.length,
      );

      if (backup) {
        console.log(chalk.gray(`Created emergency backup snapshot #${backup.snapshot.id} before rollback.`));
      } else {
        console.log(chalk.gray("Working tree identical to last snapshot — no emergency backup needed."));
      }
    }

    await git.raw(["checkout", commit, "--", "."]);
    await removeNewFiles(git, cwd, commit);
    await git.raw(["reset"]);

    console.log();
    console.log(chalk.green(`✓ Rolled back to snapshot #${id}`));
  } catch (err) {
    console.error(
      chalk.red("Error:"),
      err instanceof Error ? err.message : String(err),
    );
    process.exit(1);
  }
};