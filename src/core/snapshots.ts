// File: src/core/snapshots.ts
// Core snapshot logic — creates git-based snapshots without polluting main history.
// Changed: added working-tree stash backup + restore to protect uncommitted changes.

import { SimpleGit } from "simple-git";
import { SNAPSHOT_BRANCH, branchExists } from "./git-utils.js";
import { loadMeta, saveMeta, SnapshotMeta, Meta } from "../utils/config.js";

const getBranchCommit = async (
  git: SimpleGit,
  branch: string,
): Promise<string> => (await git.raw(["rev-parse", branch])).trim();

const stashBackup = async (git: SimpleGit, id: number): Promise<boolean> => {
  try {
    const status = await git.status();
    const hasChanges = status.files.length > 0;
    if (!hasChanges) return false;

    const stashMsg = `safesandbox-stash-backup:${id}`;
    await git.stash(["push", "--include-untracked", "-m", stashMsg]);
    return true;
  } catch {
    return false;
  }
};

const restoreStash = async (git: SimpleGit): Promise<void> => {
  try {
    await git.stash(["pop"]);
  } catch {
    // If pop fails, user can manually inspect `git stash list`
  }
};

export const createSnapshot = async (
  git: SimpleGit,
  cwd: string,
  reason: string,
  filesChanged: number,
): Promise<SnapshotMeta> => {
  // --- backup user changes before snapshot ----------------------------
  let didStash = false;
  try {
    didStash = await stashBackup(git, Date.now());
  } catch {
    // Non-fatal: continue snapshotting even if backup fails
  }
  // -------------------------------------------------------------------

  await git.add(["--all"]);
  const tree = (await git.raw(["write-tree"])).trim();

  const exists = await branchExists(git, SNAPSHOT_BRANCH);
  let parent: string | undefined;
  if (exists) {
    parent = await getBranchCommit(git, SNAPSHOT_BRANCH);
  }

  let meta: Meta;
  try {
    meta = await loadMeta(cwd);
  } catch {
    meta = { version: 1, snapshots: [] };
  }

  const id =
    meta.snapshots.length > 0
      ? meta.snapshots[meta.snapshots.length - 1].id + 1
      : 1;
  const message = `safesnapshot:${id}\n\nReason: ${reason}`;

  const args = ["commit-tree", tree];
  if (parent) args.push("-p", parent);
  args.push("-m", message);
  const commit = (await git.raw(args)).trim();

  await git.raw(["update-ref", `refs/heads/${SNAPSHOT_BRANCH}`, commit]);

  // --- restore original working tree ---------------------------------
  // Unstage everything — restore index to HEAD without touching working tree
  await git.raw(["read-tree", "HEAD"]);

  // Restore user's original stash (staged + unstaged + untracked)
  if (didStash) {
    await restoreStash(git);
  }
  // -------------------------------------------------------------------

  const snapshot: SnapshotMeta = {
    id,
    commit,
    timestamp: new Date().toISOString(),
    reason,
    filesChanged,
  };

  meta.snapshots.push(snapshot);
  await saveMeta(cwd, meta);

  return snapshot;
};
