#!/usr/bin/env node

import { Command } from "commander";
import { initCommand } from "./commands/init.js";
import { watchCommand } from "./commands/watch.js";
import { timelineCommand } from "./commands/timeline.js";
import { rollbackCommand } from "./commands/rollback.js";
import { snapshotCommand } from "./commands/snapshot.js";

const program = new Command();

program
  .name("safesandbox")
  .description("Infinite undo for AI coding agents")
  .version("0.4.1");

program
  .command("init")
  .description("Initialize SafeSandbox in the current repository")
  .action(initCommand);

program
  .command("watch")
  .description("Start watching for changes and create snapshots automatically")
  .action(watchCommand);

program
  .command("snapshot [memo]")
  .description("Manually create a snapshot with an optional label")
  .action(snapshotCommand);

program
  .command("timeline")
  .description("Show snapshot history")
  .action(timelineCommand);

program
  .command("rollback <id>")
  .description("Restore repository state to a snapshot (use 'latest' for the most recent)")
  .option("-f, --force", "skip confirmation prompt")
  .action((id, opts) => rollbackCommand(id, opts));

program.parse();
