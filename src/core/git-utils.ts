import { simpleGit, SimpleGit } from "simple-git";

export const SNAPSHOT_BRANCH = "safesandbox/snapshots";
export const EMPTY_TREE = "4b825dc642cb6eb9a060e54bf8d69288fbee4904";

export const getGit = (cwd: string): SimpleGit => simpleGit(cwd);

export const ensureRepo = async (cwd: string): Promise<SimpleGit> => {
  const git = getGit(cwd);
  const isRepo = await git.checkIsRepo();
  if (!isRepo) {
    throw new Error('Not a git repository. Run "git init" first or use a git-backed project.');
  }
  return git;
};

export const branchExists = async (git: SimpleGit, branch: string): Promise<boolean> => {
  try {
    await git.raw(["rev-parse", "--verify", branch]);
    return true;
  } catch {
    return false;
  }
};
