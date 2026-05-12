import chalk from "chalk";
import { getGit } from "../core/git-utils.js";
import { assertInitialized } from "../utils/config.js";
import { createSnapshot } from "../core/snapshots.js";

export const snapshotCommand = async (memo: string | undefined) => {
  const cwd = process.cwd();
  try {
    await assertInitialized(cwd);
    const git = getGit(cwd);

    const status = await git.status();
    const filesChanged = status.files.length;
    const reason = memo?.trim() || "manual snapshot";

    const snapshot = await createSnapshot(git, cwd, reason, filesChanged);

    if (!snapshot) {
      console.log(chalk.gray("Nothing changed since last snapshot — skipped."));
      return;
    }

    console.log(chalk.green(`✓ Snapshot #${snapshot.id} created`));
    console.log(chalk.gray(`  Reason: ${reason}`));
  } catch (err) {
    console.error(chalk.red("Error:"), err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
};
