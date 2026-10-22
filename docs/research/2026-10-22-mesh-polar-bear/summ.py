import sys,re
for f in sys.argv[1:]:
    lines=open(f).read().splitlines()
    i=next(k for k,l in enumerate(lines) if l.startswith('| variant | play'))
    head=[c.strip() for c in lines[i].strip('|').split('|')]
    want=['play paws>body cm','play forearms>body cm','play upper arms>body cm','play paws>case cm','play claws>case cm','play head~case gap cm','lower forearms>body cm','lower upper arms>body cm','target L mm','target R mm','targets within 5 mm %']
    print(f.split('/')[-1], '|', ' | '.join(w.replace(' cm','').replace(' mm','') for w in want))
    for l in lines[i+2:]:
        if not l.startswith('|'): break
        c=[x.strip() for x in l.strip('|').split('|')]
        print('  ', c[0], '|', ' | '.join(c[head.index(w)] if w in head else '-' for w in want))
