# Prints the arm pairs of the goal from the variant table of pnpm pose-depth.
# Usage: python3 pdtab.py <pose-depth output>...
import sys
want = ['play forearms>body', 'play forearms>contrabass', 'play upper arms>body',
        'play upper arms>contrabass', 'lower forearms>body', 'lower forearms>contrabass',
        'lower upper arms>body', 'lower upper arms>contrabass', 'play paws>body', 'targets within 5'] 
goal = [5.8, 5.7, 6.0, 7.2, 5.5, 4.1, 5.4, 2.8, 99, 0]
print('| variant | pFb | pFc | pUb | pUc | lFb | lFc | lUb | lUc | pPb | tgt% | worst |')
for path in sys.argv[1:]:
    head = None
    for line in open(path):
        if line.startswith('| variant |'):
            head = [c.strip().replace(' cm', '').replace(' mm', '').replace(' %', '') for c in line.strip().strip('|').split('|')]
            continue
        if head and line.startswith('|') and not line.startswith('|---'):
            cells = [c.strip() for c in line.strip().strip('|').split('|')]
            row = dict(zip(head, cells))
            vals = []
            worst = 0.0
            for w, g in zip(want, goal):
                v = row.get(w, next((row[k] for k in row if k.startswith(w)), '-'))
                vals.append(v)
                try:
                    if g != 99 and g != 0:
                        worst = max(worst, float(v) - g)
                except ValueError:
                    pass
            print('| ' + row['variant'][:90] + ' | ' + ' | '.join(vals) + f' | {worst:+.1f} |')
        elif head and not line.startswith('|'):
            head = None
