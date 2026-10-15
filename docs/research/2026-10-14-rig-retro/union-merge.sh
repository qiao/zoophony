#!/bin/zsh
# Checks the union merge of docs/design.md in a temporary repository: two branches that each add
# a decision line, a merge and a rebase of them, the same case with no .gitattributes, and two
# branches that change one line. Usage, from the root of the repository:
#
#     zsh docs/research/2026-10-14-rig-retro/union-merge.sh
set -euo pipefail
root=$PWD
work=$(mktemp -d "${TMPDIR:-/tmp}/union-merge-XXXXXX")
trap 'rm -rf "$work"' EXIT

# Makes a repository with docs/design.md of the working tree, and the attributes of $1.
setup() {
  local dir=$work/$1
  mkdir -p $dir/docs
  cd $dir
  git init -q -b main .
  git config user.email probe@example.com
  git config user.name probe
  cp $root/docs/design.md docs/design.md
  if [ "$2" = union ]; then
    printf 'docs/design.md merge=union\n' > .gitattributes
  fi
  git add .
  git commit -qm base
}

# Adds a decision line after the line of the fox flute on a new branch $1 from main.
add_line() {
  git checkout -q -b $1 main
  perl -0pi -e "s/(- \\[\`2026-10-14-fox-flute\\.md\`\\][^\\n]*\\n)/\$1- [\`2026-10-15-$1.md\`](decisions\\/2026-10-15-$1.md): the decisions of round $1.\\n/" docs/design.md
  git commit -qam $1
}

for mode in union none; do
  setup $mode $mode
  add_line a
  add_line b
  git checkout -q a
  if git merge -q --no-edit b > /dev/null 2>&1; then
    echo "$mode, merge: no conflict, $(grep -c '2026-10-15-' docs/design.md) new lines"
  else
    echo "$mode, merge: conflict"
    git merge --abort
  fi
  git checkout -q b
  if git rebase -q a > /dev/null 2>&1; then
    echo "$mode, rebase of b onto a: no conflict, $(grep -c '2026-10-15-' docs/design.md) new lines"
  else
    echo "$mode, rebase of b onto a: conflict"
    git rebase --abort
  fi
done

# The risk: two branches change the same line of the fox flute in other ways.
setup risk union
for side in a b; do
  git checkout -q -b $side main
  perl -0pi -e "s/(- \\[\`2026-10-14-fox-flute\\.md\`\\]\\(decisions\\/2026-10-14-fox-flute\\.md\\): )/\$1(changed by $side) /" docs/design.md
  git commit -qam $side
done
git checkout -q a
git merge -q --no-edit b > /dev/null 2>&1
echo "union, one line changed on both sides: $(grep -c '2026-10-14-fox-flute.md`' docs/design.md) lines of the fox flute after the merge"
