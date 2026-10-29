# The follow-up fixes of 2026-10-28

Date 2026-10-28. Decisions: [`2026-10-28-followups.md`](../decisions/2026-10-28-followups.md). The
logs and the images are in [`2026-10-28-followups/`](2026-10-28-followups/). Each command runs from
the root of the tree. "Main" is the commit before each fix.

## 1. The questions

After the round of the tails, the bench, and the arm lumps
([`2026-10-28-tails.md`](2026-10-28-tails.md), [`2026-10-28-arm-smooth.md`](2026-10-28-arm-smooth.md)),
the user said:

- "the dog tail still seems weird. it's too bulky at the root"
- "the cat's elbow has an area that's too bright"
- "the hippo's arm is still not fixed"
- "the penguine's head has unnatural gradient between black and white. Make it look more like the
  original mesh"
- "at around 00:26 of boulanger-matin, the red fox's bow arm is going up and down too rapidly.
  same issue for the rabbit at around 00:37"

## 2. The dog tail

`tail_probe.py` (a wrapper of `tail_curl()`, in the scratch tree) gave the section of the source
tail along its middle line: a round tube of about 0.048 units radius, but the slices at the root
also hold vertices of the rump with a small tail share. In Blender, the bind mesh colored by the
tail share shows a band with a share of 0.3 to 0.7 from the tail up over the rump. The curl moves
each of these vertices a part of the way, so the band made a wide web between the back and the
hanging tail.

| Variant | Chair m | Body move | Look from the side |
|---|---:|---:|---|
| `main` (radius 0.085, blend 0.3 to 0.8, thin 0.7) | 0.255 | | wide web |
| thin 0.7 or 0.55 nearer the root | 0.252 to 0.257 | 4 to 6 mm | wide web |
| blend 0.15 to 0.6 | 0.274 | 19.5 mm | web a little narrower |
| radius 0.065 | 0.268 | 16.9 mm | narrower root, short tail |
| root 0.02 to 0.08 | 0.283 | 64.7 mm | the tail goes under the rump |
| blend 0.45 to 0.65, thin 0.55 | 0.267 | 0.5 mm | slimmer from the back, web from the side |
| the same and radius 0.065 (chosen) | 0.276 | 17.6 mm | slim root, low on the rump |

The values come from `dog-v-table.txt`, `dog-w-table.txt`, `dog-b-table.txt`, and
`dog-c-table.txt` (`pnpm rig-mesh dog --check --keep <file> --set <changes>`). With the chosen
values, the play folds of the cellist fall from 5.5% to 4.7% of the samples (`dog-fold.txt`), the
depths stay equal (`dog-depth.txt`), and `pnpm arm-check cellist --base main` gives no `FAIL`. The
deeper chair moves the cat violist and the conductor of `bach-bwv1048` and `mozart-k525` from a
few samples on (`dog-body-probe.txt`). `dog-left.webp`, `dog-back.webp`, and `dog-az-120.webp`
show `main`, the blend variant, and the two combined variants.

## 3. The bow arm in fast repeated notes

At 25.76 s to 26.19 s (seat 1, the red fox in the app) and from 37.45 s (seat 0, the rabbits) of
`boulanger-matin`, the violins play repeated notes of 0.053 s: about 19 notes a second. Each note
took its own bow of 3 cm to 4 cm (`BOW_MOTION.length`), so the arm reversed 19 times a second.
A measured tremolo is now a run of at least 4 notes of one pitch, each shorter than 0.09 s, and
each stroke moves the bow 1.2 cm and back (`measuredTremolo()` of `pose/strokes.ts`). No source of
`docs/reference/string-technique.md` gives the stroke length of a measured tremolo.
`bow-arm-pairs.webp` crops the bow arm of the red fox in 16 frames from 25.70 s: on `main` the paw
jumps between the frames, and with the rule it stays nearly still. The rule changes 7,141 strokes
of `beethoven-1`, 4,010 of `boulanger-matin`, and 1,182 of `beethoven-8` (`measured-count.txt`).

## 4. The penguin head

In Blender, the texture of the source has a sharp edge between the black and the white through
the faces. The rig gives each face one color, the mean of its texture samples, so a face across
the edge took a gray or a tan. With `colors.split` 0.3, a face whose samples spread over 0.3 of
Oklab lightness takes the mean of the larger of its light and dark halves (`face_colors()`).
`penguin-head.webp` shows `main` above the fix from six directions: the gray band is gone, and the
edge is a zigzag along the faces. Only the penguin colors change (`penguin-body-probe.txt`), and
the first download grows by 116 B.

## 5. The bright elbow

The image of the user shows orange fur, a black forearm with a zigzag edge, and an upright bow:
the colors of the red fox at rest, not of the gray cat. In the role views of the red fox violinist,
the inner right elbow at rest has a faint light crease from az60, and no face of that elbow folds
at rest (`pnpm fold-probe fox-violinist`). The play camera of `close-views play --at` stood too
near the next player to show it. The place and the time of the image are a question for the user.
