#!/usr/bin/env node

import { Command } from "commander";
import { initCommand } from "./commands/init.js";
import { watchCommand } from "./commands/watch.js";
import { timelineCommand } from "./commands/timeline.js";
import { rollbackCommand } from "./commands/rollback.js";
import { snapshotCommand } from "./commands/snapshot.js";
import { pruneCommand } from "./commands/prune.js";
import { statusCommand } from "./commands/status.js";

const program = new Command();

program
  .name("safesandbox")
  .description("Infinite undo for AI coding agents")
  .version("0.5.0");

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

program
  .command("prune")
  .description("Delete old snapshots to free disk space")
  .option("--keep <n>", "keep the N most recent snapshots")
  .option("--older-than <days>", "delete snapshots older than N days (e.g. 7d)")
  .option("-f, --force", "skip confirmation prompt")
  .action(pruneCommand);

program
  .command("status")
  .description("Show snapshot count, last snapshot, and branch size")
  .action(statusCommand);

program.parse();
