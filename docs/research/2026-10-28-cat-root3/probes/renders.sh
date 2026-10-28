#!/bin/zsh
# The image set of the round, in the try tree at the branch head, main as the base.
SP=/private/tmp/claude-501/-Users-xueqiaoxu-proj-zoophony/51e57e32-cee6-44dc-94fc-af50332f7a46/scratchpad/r3
cd $SP/try
M=frog,tip,crossing,rest,lift15,lift30,lift50,lift80,lower20,lower50,lower80
pnpm close-views play $SP/img/user51 --demo boulanger-matin --at cat --time 30 --azimuth -72 --azimuth -45 --azimuth -110 --azimuth 72 --azimuth 110 --azimuth 150 --azimuth -150 --elevation 28 --zoom 3.5 --base main > $SP/img/user51.log 2>&1; echo "user51 $?"
pnpm close-views play $SP/img/user51-rest --demo boulanger-matin --at cat --time 30 --pause --azimuth -72 --azimuth -35 --azimuth -90 --azimuth 0 --azimuth 72 --azimuth 110 --azimuth 150 --azimuth -150 --elevation 28 --zoom 3.5 --base main > $SP/img/user51-rest.log 2>&1; echo "rest $?"
for e in 20 40; do
  pnpm close-views violist $SP/img/e$e --base main --sheet --moments $M --views front,back,left,right,35,-35,150,-150 --box 0.1,0.12,0.8,0.62 --scale 2 --elevation $e > $SP/img/e$e.log 2>&1; echo "e$e $?"
done
pnpm close-views violist $SP/img/root --base main --sheet --moments $M --views front,left,-35,-72,-110,-150,35,150 --zoom 2.4 --elevation 28 --box 0.25,0.15,0.5,0.45 --scale 2 > $SP/img/root.log 2>&1; echo "root $?"
pnpm close-views violist $SP/img/rootR --base main --sheet --moments $M --views right,72,110,150,back --zoom 2.4 --elevation 28 --box 0.25,0.15,0.5,0.45 --scale 2 > $SP/img/rootR.log 2>&1; echo "rootR $?"
echo renders done
