# The brows of the wolf

Date 2026-10-20. The manager did this round in the live Blender of the user, through Blender MCP,
and in the head views of the app. Decisions:
[`2026-10-20-wolf-face.md`](../decisions/2026-10-20-wolf-face.md). The outputs and images are in
[`2026-10-20-wolf-brows/`](2026-10-20-wolf-brows/). The base is `716c7496`.

## 1. The question

After round `wolf-face`, the user sent a screenshot of the stage and said: "the face is still sad,
mainly due to the eye brow?". The user asked for a fix with Blender and Blender MCP.

## 2. The cause

The manager loaded `wolf.rig.glb` in Blender, showed the color of each face with flat light, and
listed the faces around the eyes with their lightness. A 4x crop of the head view of the app
(`pnpm close-views clarinetist <dir> --target head`) shows the same shape:

- Over each eye, a gray band rises from the outer side to the inner top. The two bands make the
  shape `/ \`, the brows of a sad face with raised inner ends.
- The lower edge of the dark cap lies at about 0.81 m between the eyes and goes down to about
  0.75 m at the outer corners of the eyes, in the rig.
- The faces of the bands lie back from the front of the muzzle (source z below 0.1), out to
  |x| 0.1, and the gray of the eye rims is near Oklab lightness 0.66. The `colors.patch` rule of
  round `wolf-face` took only faces with z above 0.1, |x| below 0.07, and lightness below 0.6. So it
  changed 8 faces between the eyes and kept the bands.

## 3. The variants

Each variant is one `--set` of `pnpm rig-mesh wolf --check --keep <dir>`. The manager loaded each
kept GLB file in Blender beside the base, and rendered the head views of the app with
`close-views --glb` (`patch-variants.txt`).

| Variant | Box (x max, y max, z min) | Line y | Dark limit | Faces | Look |
|---|---|---|---|---|---|
| base | 0.07, 0.80, 0.1 | 0.775 | 0.6 | 8 | the bands stay |
| box wider | 0.09 to 0.13, 0.80, 0.1 | 0.775 | 0.6 | 12 to 13 | no visible change |
| line higher | 0.10, 0.82, 0.1 | 0.79 to 0.80 | 0.6 | 17 to 21 | the middle gets lighter, the bands stay |
| box deeper (V1) | 0.10, 0.82, 0.0 | 0.79 | 0.6 | 54 | the bands go, a thin gray edge stays over each eye |
| dark 0.68 (chosen) | 0.10, 0.82, 0.0 | 0.79 | 0.68 | 71 | the gray over the eyes goes |
| dark 0.72 | 0.10, 0.82, 0.0 | 0.79 | 0.72 | 80 | as 0.68 |

A line at y 0.81 with a box to y 0.83 failed: the rule keeps the most common color of the dark
faces that stay inside the line, and no dark face stayed.

![The eyes at 4x: base, V1, dark 0.68, dark 0.72](2026-10-20-wolf-brows/eyes.webp)

![The head views of the app: the base above, dark 0.68 below](2026-10-20-wolf-brows/head-views.webp)

## 4. The result

With dark 0.68, the gray cap ends at a level line over the eyes, and the eyes sit in light fur, as
in `wolf-turnaround.png`. The top and the back of the head stay gray. A thin shadow of the deep
eye socket stays at the outer corner of each eye. It is almost level, and it comes from the light
on the shape, not from a color.

- `pnpm arm-check clarinetist --base 716c7496` gives the values of the base (`arm-check.txt`).
- `pnpm body-probe --base 716c7496`: only the colors of the wolf bodies and of the wolf player
  change. The joints stay the same.
- The rig has no fold in the rest, the play, or the lift.

## 5. The crease of the brow ridge

The user sent a screenshot of the stage from about 40° to the side and said: "still sad". The
manager compared the head views of the app at 60° and from the front:

- A thin dark line goes from the back of each eye toward the ear, and over each eye it goes down
  to the outer side (`/ \`). It stays when the gray around it becomes light fur (a patch box out
  to |x| 0.16 took 203 faces), so it is no color.
- In Blender, no face near the eyes has a dark color, other than the eyes. The source has sharp
  edges of 40° to 110° over each eye: the crease of the brow ridge, at y 0.875 to 0.925, |x| up to
  0.07, and z 0.05 to 0.13 in the units of the source before the proportions.
- Edge flips in a box around the eyes (`refine.flip` with a box, 25 and 34 more flips) changed the
  split of the faces, but the line stayed (`flips.webp`). The manager did not keep that code.

The user chose to soften the crease. The new rule `soften` moves the vertices of the sharp edges in
a box toward the mean of their neighbors, before the proportions (`soften-variants.txt`):

| Most move | In the app | Look |
|---|---|---|
| 0.003 u | 5.6 mm | the line is weaker |
| 0.006 u (chosen) | 1.1 cm | the line is almost gone, from the front and at 60° |
| 0.010 u | 1.9 cm | the line is gone, and the forehead changes its form |

With no limit, the fur tufts in the box moved up to 0.039 u (7 cm).

![The eye at 60° and from the front: now, 0.003, 0.006, 0.010](2026-10-20-wolf-brows/soften.webp)

![The head views of the app: before above, 0.006 below](2026-10-20-wolf-brows/soften-views.webp)

- The 75 vertices move at most 0.006 u. The eye joints move 2 to 3 mm, and H goes down by 0.9 mm.
- `pnpm arm-check clarinetist --base 7f67fd9e` gives the values of the base
  (`soften-arm-check.txt`).
- `pnpm hold-fit clarinetist`: no fold, each note within 0.0 mm, and the mouthpiece 1.2 cm in the
  head (`soften-hold-fit.txt`).
- `pnpm body-probe --base 7f67fd9e`: only the wolf bodies and the wolf player change.

## 6. The black wedge beside the nose

The user said: "the wolf's nose has a large black triangle". In Blender, one face of 7.4 cm² at the
left of the muzzle top had the black of the nose and its gloss. Its mirror face has 0.97 cm². It
covers the edge of the black nose of the texture, and the share 0.34 of dark samples (`eyeShare`)
made it black. The new rule `noseShare` makes a face in the nose box dark only from its own share:

| noseShare | Faces that keep the fur |
|---|---|
| 0.5 (chosen) | 1, the large face |
| 0.6 | 3 |
| 0.75 | 5 |

At 0.5, the wedge is gone, and the nose keeps its black tip. Only the colors of the wolf change, and
`pnpm arm-check clarinetist --base 764288f7` gives the values of the base (`nose-arm-check.txt`).

![The head views of the app: before above, noseShare 0.5 below](2026-10-20-wolf-brows/nose.webp)

## 7. The haunch on the seat

The user said: "the wolf's hip is not touching the chair". The body of round `wolf-face` is 0.9422
times as large, and the `sit` rule of the rig moved the haunch down by at most 0.03 u (5.6 cm). The
underside of the haunch behind the hip joints then stayed up to 12.9 cm above the seat
(`sit-variants.txt`):

| sit.most | Gap behind the hip joints | Folds |
|---|---|---|
| 0.03 (before) | 12.9 cm | none |
| 0.05 | 9.7 cm | 27% of the play |
| 0.07 | 6.7 cm | none |
| 0.09 (chosen) | 3.9 cm | none |
| 0.11 | 2.8 cm | the tail, 31% of the play |
| 0.13 | 2.6 cm | the tail, 64% of the play |

With 0.09, the chair is 0.323 m deep (was 0.365 m), and the wolf sits deeper on it. The players near
the wolves move with the layout, in the demos with wolves only. `pnpm arm-check clarinetist --base
c4010197` gives the values of the base (`sit-arm-check.txt`), and `pnpm pose-depth clarinetist`
keeps each part within its limit.
