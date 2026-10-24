"""Sums up a paw trace table of `pnpm arm-check --trace` read from stdin.

Prints the first row (rest), the last row (play), the largest change of each twist in one step,
the largest swing of each paw, and the rows where a twist passes 180 degrees.
"""

import sys

rows = []
for line in sys.stdin:
    if not line.startswith("| ") or "Wall" in line or "---" in line:
        continue
    cells = [c.strip() for c in line.strip().strip("|").split("|")]
    try:
        rows.append([float(c) for c in cells])
    except ValueError:
        continue
if not rows:
    print("no rows")
    sys.exit(0)
first, last = rows[0], rows[-1]
print(f"  start  L twist {first[1]:5.0f} swing {first[3]:4.0f} forearm {first[5]:4.0f} | R twist {first[6]:5.0f} swing {first[8]:4.0f} forearm {first[10]:4.0f}")
print(f"  end    L twist {last[1]:5.0f} swing {last[3]:4.0f} forearm {last[5]:4.0f} | R twist {last[6]:5.0f} swing {last[8]:4.0f} forearm {last[10]:4.0f}")


def worst(i):
    best = (0, 0)
    for k in range(1, len(rows)):
        d = rows[k][i] - rows[k - 1][i]
        d = (d + 180) % 360 - 180
        if abs(d) > abs(best[0]):
            best = (d, rows[k][0])
    return best


cross = [r[0] for k, r in enumerate(rows[1:], 1) if abs(r[1] - rows[k - 1][1]) > 180]
crossR = [r[0] for k, r in enumerate(rows[1:], 1) if abs(r[6] - rows[k - 1][6]) > 180]
wl, wr = worst(1), worst(6)


def window(i, n=10):
    best = 0
    for k in range(n, len(rows)):
        d = (rows[k][i] - rows[k - n][i] + 180) % 360 - 180
        best = max(best, abs(d))
    return best

print(
    f"  most step L {wl[0]:5.0f} at {wl[1]:.2f}  R {wr[0]:5.0f} at {wr[1]:.2f} | max swing L {max(r[3] for r in rows):4.0f} R {max(r[8] for r in rows):4.0f}"
    f" | 0.1s L {window(1):4.0f} R {window(6):4.0f}"
    f" | max forearm L {max(r[5] for r in rows):4.0f} R {max(r[10] for r in rows):4.0f} | L passes 180 at {cross} R at {crossR}"
)
