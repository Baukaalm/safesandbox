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

    const result = await createSnapshot(git, cwd, reason, filesChanged);

    if (!result) {
      console.log(chalk.gray("Nothing changed since last snapshot — skipped."));
      return;
    }

    console.log(chalk.green(`✓ Snapshot #${result.snapshot.id} created`));
    console.log(chalk.gray(`  Reason: ${reason}`));
    if (result.limitWarning) {
      console.log();
      console.log(chalk.yellow.bold(`⚠  Snapshot limit reached (${result.limitWarning.current}/${result.limitWarning.max})`));
      console.log(chalk.yellow(`   Too many snapshots slow down Git and can cause it to hang.`));
      console.log(chalk.gray(`   Clean up: safesandbox prune --keep 50`));
      console.log(chalk.gray(`   Or raise "maxSnapshots" in .safesandbox/config.json`));
      console.log(chalk.gray(`   Note: pruned snapshots cannot be recovered.`));
    }
  } catch (err) {
    console.error(chalk.red("Error:"), err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
};
