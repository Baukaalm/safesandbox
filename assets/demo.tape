Require safesandbox

Output assets/demo.gif

Set FontSize 15
Set Width 960
Set Height 560
Set TypingSpeed 35ms
Set Shell "zsh"
Set Theme "Dracula"

Hide
Type "bash $SAFESANDBOX_ROOT/assets/demo-setup.sh && cd /tmp/agentdemo"
Enter
Sleep 1s
Show
Sleep 300ms

Type "ls src/"
Enter
Sleep 1500ms

Type "safesandbox init"
Enter
Sleep 2s

Type `safesandbox snapshot "clean project"`
Enter
Sleep 2s

Type "rm src/auth.js src/db.js"
Enter
Sleep 500ms

Type `echo "TODO: rewrite" > src/app.js`
Enter
Sleep 500ms

Type "touch src/temp_1.js src/temp_2.js src/WIP.js"
Enter
Sleep 1s

Type "ls src/"
Enter
Sleep 1500ms

Type "cat src/app.js"
Enter
Sleep 2s

Type "safesandbox rollback 1"
Enter
Sleep 1500ms
Type "y"
Enter
Sleep 2s

Type "ls src/"
Enter
Sleep 1500ms

Type "cat src/app.js"
Enter
Sleep 3s
