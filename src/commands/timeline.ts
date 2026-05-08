import chalk from "chalk";
import { assertInitialized, loadMeta } from "../utils/config.js";
import { formatRelativeTime } from "../utils/format.js";

export const timelineCommand = async () => {
  const cwd = process.cwd();
  try {
    await assertInitialized(cwd);
    const meta = await loadMeta(cwd);

    if (meta.snapshots.length === 0) {
      console.log(chalk.gray("No snapshots yet. Run 'safesandbox watch' and make some changes."));
      return;
    }

    for (let i = meta.snapshots.length - 1; i >= 0; i--) {
      const s = meta.snapshots[i];
      console.log(`${chalk.bold(`#${s.id}`)} — ${s.reason}    ${chalk.gray(formatRelativeTime(s.timestamp))}`);
    }
  } catch (err) {
    console.error(chalk.red("Error:"), err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
};
