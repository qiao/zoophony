#!/bin/zsh
# Rigs each animal again with the rig tool of the round, and lists each rig file that changes.
W=/private/tmp/claude-501/-Users-xueqiaoxu-proj-zoophony/51e57e32-cee6-44dc-94fc-af50332f7a46/scratchpad/cat-arm/rigs
cd $W
for a in badger bear beaver cat deer dog elephant fox hippo monkey mouse panda penguin pig polar-bear rabbit rhino wolf; do
  pnpm rig-mesh $a > ../rigs-$a.log 2>&1; echo "$a exit $?"
done
git status --short | command grep -v node_modules
echo "rerig done"
