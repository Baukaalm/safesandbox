Require safesandbox

Output assets/demo.mp4
Output assets/demo.gif

Set FontSize 16
Set Width 960
Set Height 560
Set TypingSpeed 40ms
Set Shell "zsh"
Set Theme "Dracula"

Hide
Type "rm -rf /tmp/demo && mkdir /tmp/demo && cd /tmp/demo && git init"
Enter
Sleep 1s
Show
Sleep 500ms

Type "safesandbox init"
Enter
Sleep 2s

Type "set +m; safesandbox watch &"
Enter
Sleep 2s

Type "for i in 1 2 3 4 5 6; do echo x > g$i.txt; done"
Enter
Wait+Screen@45s /Snapshot #1 created/

Type "rm g*.txt"
Enter
Sleep 18s

Type "kill %1"
Enter
Sleep 2s

Type "safesandbox timeline"
Enter
Sleep 2s

Type `printf 'y\n' | safesandbox rollback 1`
Enter
Sleep 2s

Type "ls g*.txt"
Enter
Sleep 3s
