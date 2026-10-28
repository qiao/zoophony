#!/bin/zsh
# rerig.sh: in a clean tree of the round, rigs each animal again with the rig tool of the tree,
# and lists each file that changes (none: each rig gives its file byte for byte).
for a in badger bear beaver cat deer dog elephant fox hippo monkey mouse panda penguin pig polar-bear rabbit rhino wolf; do
  pnpm rig-mesh $a > /dev/null 2>&1; echo "$a exit $?"
done
git status --short | command grep -v node_modules
echo "rerig done"
