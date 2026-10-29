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

### 4.1 The cut along the edge

The user then asked why the head cannot use the look of the mesh, and chose the cut of the faces
along the edge of the texture over a small texture. `edge_cut.py` of
[`2026-10-28-penguin-edge/`](2026-10-28-penguin-edge/) gives each vertex a side by the Oklab
lightness 0.5 of the texture, splits each edge between the sides where the texture changes, and
splits each face along the line between its two new vertices (`assets/models/penguin/README.md`).
The first cut also split the faces at the black and orange root of the beak, and the jaw folded in
1,539 samples (`rig-check-first.txt`). So the orange of the beak and of the feet (a chroma above
0.06 and a lightness under 0.8) stays uncut: 178 faces split, and the mesh has 3,549 triangles.
The folds and the arm gate stay as on `main` (`fold.txt`), the flippers go 1.3 cm into the body
(1.1 cm, `depth.txt`), and the first download is 839,852 B. `head.webp` shows `main` (the split
rule alone) above the cut: the white cheek patch has the curved outline of the mesh. The files of this
section are in `2026-10-28-penguin-edge/`.

### 4.2 The black band under the flipper

The user then said: "check the rigged glb and the original glb, the rigged one has extra black area
and bump under the arm". In Blender, the flipper of the mesh joins the body along its inner side,
and the texture paints the black flipper larger than the faces that follow the arm
(`penguin-flank-map.webp`: green for an arm share of 0.5 or more, red for black faces with less).
When the flipper rises to the folder, the red band stays on the white side as a black tongue with
a hook, the outline of the flipper tip. The rigs before the cut show the same band as a gray
smear. The `cut` of the arm seam (height 0.55) removed only 29 faces and left the band. The rule
`colors.flank` gives the white of the side to the black faces forward of a line from the armpit to
the lower side (`flank_faces()`). `penguin-flank.webp` shows `main` and two lines. The line from
(0.62, 0.06) to (0.26, -0.06) gives one smooth edge from the armpit to the lower back. Only the
penguin colors change, and the first download is 841,903 B. The round bump at the armpit stays a
little visible from az90, as a shade on the black side.

## 5. The hippo bow arm

With a fill light, the right arm of `main` at rest shows a bulge in the upper arm, a kink at the
back of the elbow, and a bump on the top of the forearm (`hippo-rest.webp`, top row). The arm
smoothing of the source tube cannot remove them, because the bend of the rest pose makes them: in
the rest, the upper arm turns about 64° from the seated bind (`rest-turns.ts`, the mean turns of
the 9 rest samples of `armSamples()`).

A rule of `raise` at these turns now smooths the posed skin with Taubin rounds before its relax
(`smooth` of `raise_shape()`), and the shape gives the smooth arm back at rest. In the play, the
upper arm lies 75° to 115° from the rule turn, so the shape has no weight there (fade 10° to 25°).

| Variant | Rest folds | Shape | Look at rest |
|---|---:|---|---|
| Upper arm and clavicle, 6 or 12 rounds | 100% | 5 faces of the root stay turned | softer elbow, forearm bump stays |
| Whole arm, 6 or 10 rounds | 100% | the root folds | |
| Second upper arm segment to the wrist, no relax, 6 rounds | 0% | no turned face | smoother |
| The same, 10 rounds (chosen) | 0% | no turned face | smoothest elbow line and forearm |

The values come from `hippo-table-root.txt` and `hippo-table.txt`. The play folds stay 3.2% of
the samples (`hippo-fold.txt`), the depths and the arm look stay as on `main`, and only the
correctives of the hippo change. The arm gate gives `FAIL` on the right stretch p95: 0.22 against
0.16 (`hippo-arm-check.txt`). The gate counts the stretch from the rest sample, and the shape
shortens one inner elbow edge at rest to 0.148 of the upper arm below the bind (0.084 on `main`).
From the bind, the play stretch is 0.084 on both (`hippo-stretch.txt`, `hippo-stretch-main.txt`).

## 6. The fill light

The key light of the stage comes from the back, so the role views from the back and the sides were
nearly black. Each close view now has a light of 2 lux from the camera, about a third of the key
(`fill-light.webp`). A base commit before it renders with no fill, so the hippo images use a base
after it.

## 7. The bright elbow

The image of the user shows orange fur, a black forearm with a zigzag edge, and an upright bow:
the colors of the red fox at rest. The cat is gray in each play view. With the fill light, the role
view of the red fox violinist from az45 at rest matches the image (`fox-elbow-main.webp`). The bend
of the rest pose makes a ridge of faceted faces at the inner right elbow, and no face of that elbow
folds at rest (`pnpm fold-probe fox-violinist`). So the red fox takes the rest shape of the hippo
(section 5): the mean turns of its 14 rest samples, 10 rounds, and no relax (`fox-table.txt`).

The fox mesh also serves the tan fox flutist. Its rest lies 22.6° from the rule turn, and the play
of the red fox 31° to 59° (`fade-angles.ts`), so the fade is 8° to 18°. `fox-rest.webp` shows
`main`, 6 rounds, and 10 rounds (chosen) at rest and at the frog: the inner elbow is a smooth
curve, and the frog stays as on `main`. The folds and the arm gate of both foxes stay as on
`main` (`fox-arm-check.txt`), and the first download grows by 795 B.
