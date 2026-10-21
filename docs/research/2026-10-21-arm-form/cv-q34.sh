#!/bin/zsh
# Renders the q34 views of main and of each variant: <role>:<name>[:<glb>] ...
S=/private/tmp/claude-501/-Users-xueqiaoxu-proj-zoophony/c225625d-02db-4313-8c42-aa5b65f91182/scratchpad/af/q34
mkdir -p $S
for item in "$@"; do
  role=${item%%:*}; rest=${item#*:}; n=${rest%%:*}; glb=${rest#*:}
  if [ "$glb" = "$n" ]; then
    pnpm close-views $role $S/$n --zoom 1.5 --scale 2 > $S/$n.log 2>&1
  else
    pnpm close-views $role $S/$n --zoom 1.5 --scale 2 --glb $glb > $S/$n.log 2>&1
  fi
  echo "$n $?"
done
