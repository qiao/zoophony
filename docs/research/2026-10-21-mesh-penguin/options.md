# Options of the penguin mesh

The user slept, so the agent chose option A by the user rules: the size of the egg penguin, and
the limbs of a mesh of the user as they are, with the props fit to them (2026-10-10). The user can
choose another option. Then change the config, rig again, and fit the folder again.

| Option | Arm factor | Reach m | Folder drop, forward from the head center | Folder middle below the crown | Spare reach m | Source |
|---|---|---|---|---|---|---|
| A (chosen) | 1 | 0.238 | 0.272 m, 0.239 m (1.25 H, 1.1 H) | 0.37 of the body height | 0.016 | `folder-probe.txt` |
| B | 1.25 | 0.291 | 0.4 m, 0.26 m (1.84 H, 1.2 H) | 0.51 of the body height | 0.015 | `folder-probe-arms125.txt` |
| Reference | | | | 0.51 to 0.56 of the body height | | `2026-10-11-penguin-body.md` |

Option B puts the folder at the height of the folders of `orchestra-latest.png` and
`orchestra-side.png`, with flippers 1.25 times as long as the flippers of the mesh. The spare
reach of option B comes from the static probe (`folder-probe.ts 1.25`), with no sweep.

| Size | Head top m | Against `main` |
|---|---|---|
| `main` (egg body) | 1.043 | |
| Round, the crown of the mesh | 1.044 standing, 1.049 at a note (head lift) | +0.1% (`balance.txt`) |
