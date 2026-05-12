// File: src/core/snapshots.ts
// Core snapshot logic — creates git-based snapshots without polluting main history.

import { SimpleGit } from "simple-git";
import { SNAPSHOT_BRANCH, branchExists } from "./git-utils.js";
import { loadMeta, saveMeta, SnapshotMeta, Meta } from "../utils/config.js";

const getBranchCommit = async (
  git: SimpleGit,
  branch: string,
): Promise<string> => (await git.raw(["rev-parse", branch])).trim();

export const createSnapshot = async (
  git: SimpleGit,
  cwd: string,
  reason: string,
  filesChanged: number,
): Promise<SnapshotMeta | null> => {
  await git.add(["--all"]);

  const tree = (await git.raw(["write-tree"])).trim();

  const exists = await branchExists(git, SNAPSHOT_BRANCH);

  if (exists) {
    const headTree = (await git.raw(["rev-parse", `${SNAPSHOT_BRANCH}^{tree}`])).trim();
    if (tree === headTree) {
      // Unstage files after snapshot, but keep working tree unchanged.
      await git.raw(["reset"]);
      return null;
    }
  }

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

  if (parent) {
    args.push("-p", parent);
  }

  args.push("-m", message);

  const commit = (await git.raw(args)).trim();

  await git.raw(["update-ref", `refs/heads/${SNAPSHOT_BRANCH}`, commit]);

  // Unstage files after snapshot, but keep working tree unchanged.
  await git.raw(["reset"]);

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