"""Prints the main columns of the first table of a log of pnpm pose-depth --gaps: the depths of the
arms in the body and in the harp, the head gap, and the share of the note targets within 5 mm.

    python3 -I pdtab.py <log> [<column>,...]
"""
import sys
lines=open(sys.argv[1]).read().split('\n')
tabs=[i for i,l in enumerate(lines) if l.startswith('| variant')]
hdr=[c.strip() for c in lines[tabs[0]].split('|')[1:-1]]
want=sys.argv[2].split(',') if len(sys.argv)>2 else ['play paws>body cm','play forearms>body cm','play upper arms>body cm','play paws>harp cm','play forearms>harp cm','play upper arms>harp cm','play head~harp gap cm','rest forearms>body cm','lower forearms>body cm','lower paws>body cm','targets within 5 mm %']
idx=[hdr.index(w) for w in want if w in hdr]
print('variant |', ' | '.join(hdr[i].replace(' cm','') for i in idx))
for l in lines[tabs[0]+2:]:
    if not l.startswith('|'): break
    c=[x.strip() for x in l.split('|')[1:-1]]
    name=c[0].replace('deer.harpScale=','s').replace(';harpPlace.side=',' sd').replace(';harpPlace.turn=',' t').replace(';harpPlace.front=',' f')
    print(name, '|', ' | '.join(c[i] for i in idx))
