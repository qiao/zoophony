# The wrist of the polar bear pianist

Date 2026-10-28. Round `sixth-polar-wrist`. Decisions:
[`2026-10-27-polar-wrist.md`](../decisions/2026-10-27-polar-wrist.md). The probes, their outputs,
and the images are in [`2026-10-27-polar-wrist/`](2026-10-27-polar-wrist/). Each command runs
from the root of the tree. Copy a probe of `probes/` to `scratch/` before you run it. "Main" is
`8b5a37ea9`.

## 1. The question

The user said on 2026-10-27: "there's a crease around the bear's wrist", with image 49: a paw of
the pianist on the keys from above, with a lip and a dark slit where the paw bends down. The
target: a wrist that bends with a soft, round turn, with no hard line or groove, at rest, in the
play, and in the moves.

## 2. The angle

Image 49 looks over the left shoulder down the forearm to the paw, with the keys at the top and
the floor at the left. `probes/wristcam.ts` writes cameras around each posed wrist for
`pnpm close-views play --camera-file`. The view from behind left at 60° (`u49-cameras.webp`,
`u49-angle.webp`) gives that frame. The manager crops of the role views ("chord, left", 40°) show
the crease best: a dark wedge that points into the outer side of the left paw at the wrist line
(`gallery-left-paw-e40.webp`). From behind left, the right paw shows a light V notch at the wrist
(`wrists-30s.webp`, `wrists-rest.webp`, top left).

## 3. The cause

No wrist face folds on `main` (`fold.txt`). The crease comes from the wrist band of the arm copy
of 2026-10-24 (`polar_bear_arms.py`): the bridge from the last ring of the tube to the cut loop of
the paw.

| Measure | User mesh | Copy of `main` | Copy of the round | Output |
|---|---|---|---|---|
| Faces with a corner below 12° in the wrist band, L / R | 0 / 4 | 25 / 21 | 1 / 0 | `thin.txt` |
| Band width from the last ring to the cut loop, L | | 1.8 to 14.6 mm | 14.1 to 17.9 mm | `band.txt` |

- **The cut.** The paw of the T-pose turns 14° down from the forearm. The last ring stands at the
  joint at a right angle to the line halfway between the forearm and the paw, and the cut stood
  at a right angle to the paw, 0.1 of the paw from the joint. The band was 2 mm wide from the
  back of the arm to the palm (clock −112 to −178). The cut does not cross the ring, so no lip
  of the hippo kind forms: the area that faces back toward the elbow is 0.3% to 1.3%
  (`wrist-main.txt`).
- **The thin faces.** The Bisect left loop vertices 1° or less apart around the arm at three
  places, and the bridge joins 16 ring vertices to 36 loop vertices. The copy has no clean of the
  cut or of the bridge, and a face of 0.1 mm² sits at the back of the left wrist
  (`source-edges.txt`, `source-wrist.webp`).
- **The bind.** The seated bind turns each paw 26° from its forearm. The thin faces meet at up to
  115° there (`bind-edges-main-L.txt`). The app splits the normals at each edge over its crease
  angle of 40°, so the split stays in each pose and shows as a hard line around the wrist.

## 4. The fixes and the tries

`probes/variant.sh` builds each try with copies of the two scripts
(`probes/variant-arms.diff`, `variant-legs.diff`), `pnpm rig-mesh polar-bear --check --set
'source=...;paintedWeights=...;heatSource=...' --keep <dir>` rigs it (`rig-variants.txt`), and
`probes/wrist.ts --glb` measures it (`tries.txt`). The band of the probe runs from 50 mm before
each wrist joint to 20 mm past it.

| Try | Hard edges at rest, L / R | Largest jump | Concave °·cm at rest, L / R |
|---|---|---|---|
| `main` | 30.2 / 9.8 cm | 113° | 474 / 161 |
| Old cut, clean, smooth | 28.7 / 19.7 cm | 76° | 452 / 293 |
| Parallel cut 0.10, clean, smooth | 17.7 / 16.6 cm | 76° | 340 / 305 |
| Parallel cut 0.15, clean, smooth | 16.8 / 25.4 cm | 73° | 146 / 263 |
| Parallel cut 0.25, smooth, no clean | 11.9 / 34.3 cm | 84° | 198 / 472 |
| Parallel cut 0.25, clean, smooth | 8.0 / 17.0 cm | 61° | 132 / 105 |
| Skin normals of the wrist alone | 6.6 / 3.2 cm | 45° | 474 / 161 |
| Cut 0.25, clean, smooth, skin normals | 0 / 0 cm | 0° | 132 / 105 |
| **Cut 0.25, clean, smooth, snap, skin normals** | **0 / 0 cm** | **0°** | **132 / 83** |

The parallel cut 0.25 with no smooth stopped `polar_bear_legs.py`: the JPEG of the arm image
leaked into the free columns of the strip. The smooth with no snap made each wrist about 4 mm
thinner at the joint than the user mesh (`sections.txt`), and the outline of the paw showed a
waist at rest (`snap-choice.webp`, middle). A half snap left a waist of about 2.5 mm. The full
snap keeps the joint within 3 mm of the user mesh, as the copy of `main`.

## 5. The measures

| Measure | `main` | Round | Output |
|---|---|---|---|
| Hard edges in the play, p95, L / R | 29.8 / 9.5 cm | 0 / 0 cm | `wrist-main.txt`, `wrist-round.txt` |
| Concave °·cm in the play, p95, L / R | 653 / 254 | 132 / 175 | same |
| Sharpest concave edge in the play, L / R | 88° / 60° | 82° / 62° | same |
| Bind edges of the band over 40°, L / R | 12 (115°) / 1 (53°) | 9 (96°) / 6 (59°) | same |
| Triangles, packed mesh gzip | 5,106, 32,400 B | 5,056, 32,208 B | `rig-check.txt` |
| First download | 835,633 B | 836,397 B (+764 B, the rim list) | `size.txt` |

The wrist bend of the pose does not change (`posture.txt` of `probes/posture.ts` of
`2026-10-27-polar-bench/`): rest L 15.0°, R 8.1°, play mean L −0.1° [−6.7°, 6.1°], R −2.3°
[−11.6°, 4.6°].

| Gate | Result | Output |
|---|---|---|
| `pnpm arm-check --all --base main` | No `FAIL`. Each pianist value equals `main`. The rest folds of the pianist and the left paw twist of the bassist stay `OPEN` as on `main` | `gate-all.txt` |
| `pnpm fold-probe pianist --base main --faces 60` | rest 34, play 33, lift 34, as `main`. Each listed face keeps its shares, and no face is new | `fold.txt` |
| `pnpm pose-depth pianist --base main` | No `GROWS`, each depth within 0.1 cm of `main` | `depth.txt` |
| `pnpm carry-check violinist,fox-violinist,violist --base main` | Each value of `main` | `carry.txt` |
| `pnpm body-probe --base main` | Only the polar bear bodies and the pianist change. The joints stay, and 1,492 of 1,492 pose sets are equal | `body-probe.txt` |
| `pnpm rig-mesh polar-bear --check` | Reach 0.463 m, seat 0.166 m, and the form of `main` within 0.0 mm. Before the relax of the bind, no face of `forearm_seg3_R` or `wrist_R` turns over (faces of both on `main`) | `rig-check.txt` |

The weights change only on the forearms and the paws, from |x| 0.36 units out
(`weights-diff.txt`). The change of `rig_mesh.py` adds an optional key, so no other species
changes (`body-probe.txt`).

## 6. The images

The images are in `images/`. `main` is above or left of the round in each image.

- `u49-angle.webp`, `u49-cameras.webp`: image 49 beside the cameras over the left shoulder at
  30 s of `boulanger-matin` (`--camera-file` of `probes/wristcam.ts --sides L --dist 0.7`).
- `wrists-30s.webp`, `wrists-rest.webp`: each wrist from 6 directions at 0.45 m and 0.4 m, at 30 s
  and at rest (`--pause`, `probes/wristcam.ts`). The V notch and the jagged wedges of `main` go.
- `gallery-left-paw-e40.webp`, `gallery-right-paw-e40.webp`: the paws of the role views at 40°.
- `sheet-e20-<view>.webp`, `sheet-e40-<view>.webp`: chord, between, far-left, far-right, and rest
  from the front, the back, each side, ±35°, and ±150° (`pnpm close-views pianist <dir> --views
  front,back,left,right,35,-35,150,-150 --moments chord,between,far-left,far-right,rest
  --elevation <e> --zoom 1.6 --scale 2 --sheet --box 0,0.1,1,0.55 --base main`). The lid hides
  the arms from the front and from −35°.
- `snap-choice.webp`: `main`, the smooth with no snap, and the round, at rest.
- `source-wrist.webp`: the left wrist of the user mesh, the copy of `main`, and the copy of the
  round, from the top, the front, the back, and below (`probes/srcedges.py`).

No image shows a new crease, notch, dent, or fold.

## 7. Open

- One edge of the left wrist band, on the palm side, stays concave up to 82° in the play, at a
  groove of the paw of the user mesh. It shades soft with the skin normals.
- Each paw keeps about 0.35 of the wrist helper, so it turns about two thirds of the hand turn.
- `polar_bear_legs.py` stops when the arm image leaks into the free columns of the strip.
