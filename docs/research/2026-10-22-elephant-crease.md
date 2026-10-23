# The elephant arm crease

Date 2026-10-22. The user: "elephant.glb is good but elephant.rig.glb is problematic. it's armpit
is missing". Decisions: [`2026-10-22-elephant-crease.md`](../decisions/2026-10-22-elephant-crease.md).

## Cause

In the source mesh, each hanging upper arm is one solid with the trunk: no surface lies between
them. Horizontal slices of the source (`slices.py`) show the outline of the trunk turn out at a
concave crease at the front and at the back of the upper arm, about 0.15 u from the middle plane.
The plane of the arm split lay at 0.18 u. So the free arm was only the outer shell of the arm,
about 0.055 u deep for a length of 0.15 u, and the cut closed it with a flat face. The strips
between the shell and the crease stayed on the trunk. In each raised pose, the arm showed as a
thin plate with no armpit. The renders of each rig step (`rig_stages.py`) show the shell and its
flat caps.

## Fix

The rule `weights.armCrease` finds the concave edges of the crease, fits a plane through them, and
puts the arm out of that plane in the free arm. The cut then closes the whole arm, and the trunk
keeps the line of its side.

| Measure | main | crease |
|---|---:|---:|
| `arm-look timpanist` section, left / right (limit 0.44) | 0.32 / 0.35 | 0.55 / 0.47 |
| `arm-look timpanist` crease share, left / right (limit 14.6%) | 3.4% / 3.4% | 0.8% / 4.9% |
| `fold-probe timpanist`, samples with a fold | 0 | 0 |
| `arm-check timpanist`, flat p5 left / right | 0.86 / 0.78 | 0.96 / 0.95 |
| Triangles | 3,152 | 3,152 |
| `pnpm size` | 729,789 B | 729,673 B |

`arm-check timpanist --base main` passes on both arms. `body-probe --base main` changes only the
five elephant bodies and the timpanist.

## Images

Main on the left of each pair, the crease on the right: `back-zoom-main.webp` and
`back-zoom-crease.webp` (from the back, zoom 2.2), and `az150-main.webp` and `az150-crease.webp`
(az 150, elevation 15). `--demo brahms-2 --at elephant --time 60`.

## Open

The cut of the right side has a cap face with a smallest angle of 3.2°. No view shows it. Other
meshes with an arm that is one solid with the trunk can take the rule: the rabbit, the rhino, and
the panda.
