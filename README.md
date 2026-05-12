# SafeSandbox

> **Infinite undo for AI coding agents.**

SafeSandbox is a local-first developer tool that automatically creates snapshots and checkpoints while AI coding agents (Cursor, Claude Code, Codex, Aider, etc.) modify your repository.

<p align="center">
  <img
    src="assets/demo.gif"
    width="800"
    alt="SafeSandbox demo: init, watch in the background, two snapshots after file changes, timeline, rollback, and restored files"
  />
</p>
<p align="center">
  <em>Auto-captures every AI edit — rollback in seconds with one command.</em>
</p>

## What it does

- **Automatic snapshots** — detects bursts of file changes and creates restore points
- **Rollback** — restore your codebase to any previous snapshot in seconds
- **Timeline** — view a human-readable history of what changed
- **Protection from destructive AI edits** — never lose working code again

## What it is NOT

- Not a cloud service — everything stays on your machine
- Not a remote IDE
- Not a Docker container
- Not an AI model
- Not a code editor

## What it IS

- A local CLI tool
- A filesystem watcher (via chokidar)
- A git-based snapshot manager

## Installation

```bash
npm install -g safesandbox
# or
pnpm add -g safesandbox
```

Or run without installing:

```bash
npx safesandbox init
```

## Quick Start

```bash
# 1. Initialize SafeSandbox in your repo
cd my-project
safesandbox init

# 2. Start watching for changes
safesandbox watch

# 3. Let your AI agent work...
# SafeSandbox auto-creates snapshots when it detects bursts of edits

# 4. View timeline
safesandbox timeline

# 5. Roll back if something goes wrong
safesandbox rollback 12
```

## Commands

### `safesandbox init`

Sets up SafeSandbox in the current repository. Creates:

- `.safesandbox/` directory with metadata storage
- A hidden snapshot branch for internal commits
- Config file with default thresholds

### `safesandbox watch`

Starts filesystem monitoring. Detects:

- Multiple rapid file changes
- Deleted files
- `package.json` changes
- Lockfile changes (`package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, `bun.lockb`)

Snapshots are batched — not every single file write triggers one. You will see output like:

```
[SafeSandbox]
Snapshot #12 created
Reason: 24 files changed in 8 seconds
```

### `safesandbox timeline`

Shows snapshot history:

```
#14 — 24 files changed
#13 — package.json modified
#12 — deleted docker-compose.yml
```

### `safesandbox rollback <id>`

Restores the repository to the state at snapshot `<id>`. Asks for confirmation before destructive changes.

## How it works

SafeSandbox uses **git internally** for snapshots:

- A hidden branch stores internal commits
- Metadata maps snapshot IDs to commit hashes
- Rollback uses `git checkout` + `git restore` for safe, precise restoration

No Docker. No overlayfs. No cloud. Just your local git repo + a smart watcher.

## Configuration

After `init`, a config file lives at `.safesandbox/config.json`:

```json
{
  "thresholdFiles": 5,
  "thresholdSeconds": 10,
  "ignoredPaths": ["node_modules", ".git", "dist", "build", ".safesandbox"]
}
```

- `thresholdFiles` — minimum files changed to trigger a snapshot
- `thresholdSeconds` — time window for batching changes

## Example session

```bash
$ cd my-cursor-project

$ safesandbox init
[SafeSandbox] Initialized in /Users/me/my-cursor-project

$ safesandbox watch
[SafeSandbox] Watching for changes...

# ... you prompt Cursor to "add auth" ...

[SafeSandbox]
Snapshot #1 created
Reason: 12 files changed in 6 seconds

# ... you prompt again, it deletes something important ...

[SafeSandbox]
Snapshot #2 created
Reason: 3 files changed in 4 seconds

$ safesandbox timeline
#2 — 3 files changed
#1 — 12 files changed (auth feature)

$ safesandbox rollback 1
[SafeSandbox] This will restore 12 files to the state at snapshot #1.
Are you sure? (y/N) y
[SafeSandbox] Rolled back to snapshot #1.
```

## Requirements

- Node.js >= 20
- Git repository (run `git init` first if needed)

## License

MIT
