# Prints the play share of the faces of the goal from a fold-probe output (one tree).
import sys, re
want = ['477', '461', '68', '1356', '617', '618', '323', '338', '240', '286', '480', '248', '249']
for path in sys.argv[1:]:
    shares = {}
    total = None
    for line in open(path):
        m = re.match(r'\| play \| (\d+) \| (\d+) \|', line)
        if m and total is None:
            total = m.group(0)
        cells = [c.strip() for c in line.strip().strip('|').split('|')]
        if len(cells) > 4 and cells[0] in want and cells[0] not in shares and '%' in cells[2]:
            shares[cells[0]] = cells[2]
    print(path.split('/')[-1], total, ' '.join(f'{f}:{shares.get(f, "<top")}' for f in want))
