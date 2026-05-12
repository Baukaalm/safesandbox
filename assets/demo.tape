Set FontSize 16
Set Width 960
Set Height 600
Set TypingSpeed 50ms
Set Shell "zsh"
Set Theme "Dracula"

Hide

# Setup demo repo
Type "mkdir -p /tmp/demo-project && cd /tmp/demo-project && git init && safesandbox init"
Enter
Sleep 2s

Type "clear"
Enter

Show
Sleep 500ms

# Start watch in background
Type "safesandbox watch &"
Enter
Sleep 1s

# Simulate AI agent edits
Type "# AI agent starts editing..."
Enter
Type "printf 'const app = {}' > app.js"
Enter
Sleep 500ms
Type "mkdir routes && printf 'module.exports = {}' > routes/index.js"
Enter
Sleep 500ms
Type "printf 'name: demo' > config.js"
Enter
Sleep 5s

# Snapshot appears, now check timeline
Type "safesandbox timeline"
Enter
Sleep 2s

# More AI changes
Type "# AI deletes routes and modifies app..."
Enter
Type "rm -rf routes"
Enter
Sleep 500ms
Type "printf 'const x = 1' >> app.js"
Enter
Sleep 5s

# Timeline again
Type "safesandbox timeline"
Enter
Sleep 2s

# Stop watch
Type "kill %1"
Enter
Sleep 500ms

# Rollback
Type "safesandbox rollback 1"
Enter
Sleep 1s
Type "y"
Enter
Sleep 2s

# Verify
Type "ls"
Enter
Sleep 1s

Type "# All files restored in seconds ✓"
Enter

Sleep 3s
