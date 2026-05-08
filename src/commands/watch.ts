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

    const watcher = await startWatcher(cwd, git, ({ id, reason }) => {
      spinner.stop();
      console.log();
      console.log(chalk.cyan.bold("[SafeSandbox]"));
      console.log(`Snapshot #${id} created`);
      console.log(`Reason: ${reason}`);
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
