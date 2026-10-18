# The face of the panda: round eye patches and a thin smile line

Date 2026-10-18. Round `panda-smile`. Decisions:
[`2026-10-18-panda-face.md`](../decisions/2026-10-18-panda-face.md). The probes and their outputs
are in [`2026-10-18-panda-face/`](2026-10-18-panda-face/). Each command runs from the root of the
tree.

## 1. The question

The user said: "the panda look very sad. make it smile/ more positive". The eye patches of the
panda mesh are tall, with a sharp upper inner point near the middle of the forehead. The point
reads as raised inner brows, a worried face. The question: which face rules of the rig, with no
move of a vertex, make the face happier, and how do the patches compare with the reference?

## 2. The measures

Phase 1 made a mock: the face colors of `src/models/studio/panda.ts` changed by rule, rendered in
the gallery of the app (`variants.webp`). The user chose variant 1 (round patches) and a thin smile
line. Phase 2 put the two rules into the rig (`colors.patch` and `colors.smile` of
`tools/mesh-rigs/panda.json`).

The patches in the app, with the head width at the eye height (0.516 m):

| Patch | Faces | Width x height | Front area |
|---|---|---|---|
| `9752889e`, left | 46 | 23.1% x 38.1% | 4.3% |
| `9752889e`, right | 40 | 22.7% x 38.8% | 4.3% |
| round, left | 37 | 23.0% x 18.0% | 2.5% |
| round, right | 31 | 22.4% x 21.8% | 2.4% |
| reference `orchestra-side.png`, panda 2 | 157 px | 22% x 27% | 3.5% |
| reference `orchestra-latest.png`, middle panda | 129 px | 21% x 23% | 3.0% |

The sizes are in percent of the head width, and the front area in percent of the head width
squared. `node docs/research/2026-10-18-panda-face/face-probe.ts [<module>]` gives the patches of
the app (`face-probe-base.txt`, `face-probe-round.txt`). `ref_patch.py` counts the dark pixels of
the near patch of a reference crop (`ref-side-p2.txt`, `ref-latest.txt`). The head of a reference
panda is about 66 px wide at the eye row of the printed map.

The rules and their faces (`rig-log.txt`, from `pnpm rig-mesh panda`):

| Rule | Faces | Change |
|---|---|---|
| `colors.patch` | 18 (9 left, 9 right) | A dark face with a corner outside the circle of radius 0.0475 u around the middle of the patch takes the color of the nearest light fur face. |
| `colors.smile`, first band | 18 | The top of the lower lip along the crease between the lips takes the dark of the patches. |
| `colors.smile`, second band | 13 | The underside of the upper lip at the corners takes the dark of the patches. |

The smile line in the app (`face-probe-width1.txt`, `face-probe-round.txt`):

| Line | Faces | Width | Rise of the corners | Faces that touch the nose or a patch |
|---|---|---|---|---|
| width 1 (first band) | 18 | 19.0 cm | 2.7 cm | 0 |
| width 2 (both bands) | 31 | 22.5 cm | 4.4 cm | 0 |

`widths.webp` shows the two widths in the gallery light, at rest and in the play pose, from the
front, from a three-quarter view, and from 30° above. The light holes in the patches stay 0. The
pea eyes keep their places, because the circle holds each old eye. The packed mesh goes from
29,748 B to 29,718 B after gzip, and the first download from 504,114 B to 504,085 B
(`pnpm size --base 9752889e`). `pnpm body-probe --base 9752889e` changes only the colors of the
five panda bodies and of the trombone player.

## 3. The result

The round patches remove the sharp point. They keep the width of the old patches (23% of the head
width), and their height (18% to 22%) is a little below the reference (23% to 27%). The front area
of the reference patch (3.0% to 3.5%) lies between the old patch (4.3%) and the round patch
(2.5%), so the reference patches are not smaller than the old ones. They are shorter and rounder.

Width 2 is the chosen smile. Width 1 reads as a closed smile from the front, but the mouthpiece and
the paw hide most of it in the play pose. The corners of width 2 rise 4.4 cm and show beside the
mouthpiece. From 30° above, the mouthpiece and the paws hide the mouth at both widths.

## 4. The mouth corner (round `panda-mouth`)

The user said on 2026-10-18: "The corner of the mouth has a big area of black". The second band of
`colors.smile` took 13 faces under the upper lip at the corners. Seven of them turn to the side
(the x of the normal away from the middle plane 0.69 to 0.85, one face of 7.4 cm²), so they show as
a dark block in a side view. The new band option `outward` limits the x of the normal. With 0.6,
the band takes 6 faces that point down or forward (`mouth-rig-log.txt`).

Dark pixels of the gallery shots at zoom 5 (`mouth-counts.txt`): the line is the forward faces on
the lower lip, and the corner is the other dark faces of the mouth.

| View | main line | main corner | round line | round corner |
|---|---|---|---|---|
| rest, front | 314 | 216 | 269 | 15 |
| rest, 35° right | 262 | 444 | 265 | 0 |
| rest, 60° right | 167 | 497 | 165 | 0 |
| rest, side right | 81 | 409 | 81 | 0 |
| rest, 60° left | 533 | 408 | 412 | 17 |
| rest, side left | 353 | 355 | 265 | 0 |
| play, 60° right | 192 | 439 | 189 | 0 |
| play, side right | 102 | 391 | 102 | 0 |
| stage side shot (Brahms 2, 700 s) | 122 | 61 | 109 | 0 |

`mouth-marker.ts` writes a module with the line in green and the corner in blue, and
`mouth_count.py` counts these pixels in a shot. The shots of the normal colors have 0 marker
pixels. The geometric split counts one face of the old corner band as line on `main`. In each view,
the corner of the round is at most 17 px, below the line of the same view. From the front, the
line keeps its ends a little up and reads as a closed smile (`mouth-before-after.webp`). The rigs
of the fox, the rabbit, the cat, and the dog keep their bytes, and the first download grows by 1 B
(`pnpm size --base d6485c4d`).
