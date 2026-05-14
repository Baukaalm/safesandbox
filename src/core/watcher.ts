import chokidar, { FSWatcher } from "chokidar";
import { SimpleGit } from "simple-git";
import path from "node:path";
import fs from "node:fs/promises";
import ignore, { Ignore } from "ignore";
import { createSnapshot } from "./snapshots.js";
import { loadConfig } from "../utils/config.js";
import { formatDuration } from "../utils/format.js";

const IMPORTANT_FILES = new Set([
  "package.json",
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "Cargo.lock",
  "Gemfile.lock",
  "composer.lock",
  "poetry.lock",
  "bun.lockb",
  "docker-compose.yml",
  "docker-compose.yaml",
  "Dockerfile",
  ".env",
  ".env.local",
  "tsconfig.json",
  "vite.config.ts",
  "vite.config.js",
  "vitest.config.ts",
  "vitest.config.js",
  "jest.config.js",
  "jest.config.ts",
]);

type OnSnapshot = (payload: {
  id: number;
  reason: string;
  filesChanged: number;
  durationMs: number;
}) => void;

const loadGitignore = async (cwd: string): Promise<Ignore> => {
  const ig = ignore();
  try {
    const raw = await fs.readFile(path.join(cwd, ".gitignore"), "utf-8");
    ig.add(raw);
  } catch {
    // no .gitignore — that's fine
  }
  return ig;
};

export const startWatcher = async (
  cwd: string,
  git: SimpleGit,
  onSnapshot: OnSnapshot,
): Promise<FSWatcher> => {
  const cfg = await loadConfig(cwd);
  const ig = await loadGitignore(cwd);

  const configIgnored = cfg.ignoredPaths.map((p) =>
    p.startsWith("*") ? p : `**/${p}/**`,
  );

  const watcher = chokidar.watch(cwd, {
    ignored: [
      ...configIgnored,
      "**/.git/**",
      "**/.vscode/**",
      "**/.idea/**",
      "**/*.log",
      "**/.DS_Store",
    ],
    ignoreInitial: true,
    persistent: true,
    cwd,
  });

  let changedPaths = new Set<string>();
  let firstChangeAt = 0;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let cooldownUntil = 0;

  const COOLDOWN_MS = 3000;

  const flush = async () => {
    debounceTimer = null;
    const batch = changedPaths;
    if (batch.size === 0) return;

    const count = batch.size;
    const duration = Date.now() - firstChangeAt;

    const files = Array.from(batch);
    const hasImportant = files.some((f) => IMPORTANT_FILES.has(path.basename(f)));

    if (count < cfg.thresholdFiles && !hasImportant) {
      return;
    }

    const reason =
      hasImportant && count < cfg.thresholdFiles
        ? `${path.basename(files.find((f) => IMPORTANT_FILES.has(path.basename(f)))!)} modified`
        : `${count} files changed in ${formatDuration(duration)}`;

    // Enter cooldown immediately so filesystem events triggered by the
    // snapshot creation itself (git add, git reset) are ignored.
    cooldownUntil = Date.now() + COOLDOWN_MS;
    changedPaths = new Set();
    firstChangeAt = 0;

    try {
      const snapshot = await createSnapshot(git, cwd, reason, count);
      if (!snapshot) {
        // Tree identical to previous snapshot — nothing changed meaningfully
        return;
      }
      onSnapshot({ id: snapshot.id, reason, filesChanged: count, durationMs: duration });
    } catch (err) {
      console.error("[SafeSandbox] Failed to create snapshot:", err);
    }
  };

  const onChange = (filePath: string) => {
    if (Date.now() < cooldownUntil) {
      return;
    }
    if (filePath.startsWith(".safesandbox")) return;
    if (ig.ignores(filePath)) return;
    changedPaths.add(filePath);
    if (firstChangeAt === 0) firstChangeAt = Date.now();
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      void flush();
    }, cfg.thresholdSeconds * 1000);
  };

  watcher.on("add", onChange).on("change", onChange).on("unlink", onChange);

  return watcher;
};
