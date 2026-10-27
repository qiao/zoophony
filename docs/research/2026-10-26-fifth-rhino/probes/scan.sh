#!/bin/zsh
# Usage: scratch/scan.sh <out> <variant>... ; each variant is a hold change text. Runs wind-grip and
# pose-depth (boulanger) and prints a compact table.
out=$1; shift
args=(); for v in "$@"; do args+=(--set "$v"); done
pnpm wind-grip tubist "${args[@]}" > $out.grip.txt 2>&1
pnpm pose-depth tubist --demo boulanger-matin "${args[@]}" > $out.depth.txt 2>&1
python3 - $out <<'PY'
import sys
out=sys.argv[1]
g=[l for l in open(out+'.grip.txt') if l.startswith('| tree') or l.startswith('| tuba')]
lines=open(out+'.depth.txt').read().split('\n')
t=[];cur=[]
for l in lines:
    if l.startswith('|'): cur.append(l)
    elif cur: t.append(cur); cur=[]
d=t[0]; hdr=[c.strip() for c in d[0].split('|')[1:-1]]
rows=d[2:]
for gi,(gl,dl) in enumerate(zip(g,rows)):
    gc=[c.strip() for c in gl.split('|')[1:-1]]
    dc=[c.strip() for c in dl.split('|')[1:-1]]
    name=gc[0].replace('tuba@rhino.','')
    print(gi, name[:220])
    print('   grasp L play/lift/rest/lower:', ' / '.join(gc[i].split()[1] for i in (1,3,5,7)),
          '  R:', ' / '.join(gc[i].split()[1] for i in (2,4,6,8)),
          '  tips L', ' / '.join(gc[i].split()[3] for i in (1,3,5,7)))
    worst={}
    for h,v in zip(hdr[1:],dc[1:]):
        if h.startswith('target'): continue
        pair=h.split(' ',1)[1]
        try: worst[pair]=max(worst.get(pair,0),float(v))
        except: pass
    print('   depth max:', ', '.join(f'{k.replace(" cm","")} {v}' for k,v in worst.items() if v>0))
PY
