import chalk from "chalk";
import ora from "ora";
import { getGit } from "../core/git-utils.js";
import { assertInitialized } from "../utils/config.js";
import { startWatcher } from "../core/watcher.js";

export const watchCommand = async () => {
  const cwd = process.cwd();
  try {
    await assertInitialized(cwd);
    const git = getGit(cwd);

    const spinner = ora("Watching for changes...").start();

    const watcher = await startWatcher(cwd, git, ({ id, reason, limitWarning }) => {
      spinner.stop();
      console.log();
      console.log(chalk.cyan.bold("[SafeSandbox]"));
      console.log(`Snapshot #${id} created`);
      console.log(`Reason: ${reason}`);
      if (limitWarning) {
        console.log();
        console.log(chalk.yellow.bold(`⚠  Snapshot limit reached (${limitWarning.current}/${limitWarning.max})`));
        console.log(chalk.yellow(`   Your Git repo is accumulating snapshot history.`));
        console.log(chalk.yellow(`   Too many snapshots slow down Git and can cause it to hang.`));
        console.log(chalk.gray(`   Run prune to clean up and reclaim disk space:`));
        console.log(chalk.cyan(`     safesandbox prune --keep 50`));
        console.log(chalk.cyan(`     safesandbox prune --older-than 7d`));
        console.log(chalk.gray(`   Or raise the limit in .safesandbox/config.json → "maxSnapshots".`));
        console.log(chalk.gray(`   Note: pruned snapshots cannot be recovered.`));
      }
      spinner.start("Watching for changes...");
    });

    const stop = () => {
      void watcher.close().then(() => {
        spinner.stop();
        console.log(chalk.gray("\nStopped watching."));
        process.exit(0);
      });
    };

    process.on("SIGINT", stop);
    process.on("SIGTERM", stop);
  } catch (err) {
    console.error(chalk.red("Error:"), err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
};
