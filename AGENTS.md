# Agent Rules
## SafeSandbox

SafeSandbox is running in this repository and auto-creates restore points as you work.

### Prohibited actions

- `git reset --hard` — use `safesandbox rollback <id>` instead
- `git clean -fd` — use `safesandbox rollback <id>` instead
- Mass deletion of files without explicit user instruction
- Modifying `.safesandbox/` directory

### Required behavior

- Before a large refactor, run: `safesandbox snapshot "before <task>"`
- After significant changes, report a brief summary of what was touched
- Prefer small, focused diffs over large sweeping rewrites
- If unsure about a destructive operation — ask the user first

### Restore workflow

```bash
safesandbox timeline          # see history
safesandbox rollback latest   # undo last AI session
safesandbox rollback <id>     # restore specific snapshot
```
