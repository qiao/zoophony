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
