# The smoothing of the rebuilt arm tubes

Date 2026-10-28. Decisions: [`2026-10-28-arm-smooth.md`](../decisions/2026-10-28-arm-smooth.md).
The rig logs, the probe outputs, and the images are in
[`2026-10-28-arm-smooth/`](2026-10-28-arm-smooth/). Each command runs from the root of the tree.
"Main" is `1aea48ff1`.

## 1. The question

The user gave three close images of the stage and said: "the hippo's arm has lumps / dents and is
not holding the bow properly", "the wolf's arm has unexpected dents / bends", and "the cat's arm
has unexpected lumps".

## 2. The source and the copy

In Blender, the arm of each mesh of the user is a clean low-poly tube of a few large flat faces.
The arm copies (`wolf-arms.glb`, `cat-arms.glb`, `hippo-arms.glb`) replace it with a dense quad
tube, and a Shrinkwrap puts each ring onto the source surface (`step_wrap()` of
`tools/blender/violin_arms.py`). So the rings copy each sharp ridge between the big faces, and the
tube is wavy. The wolf copy has a pit at the back of each elbow. In the app, the crease angle
shades the small faces of the tube smooth, so each ridge shows as a soft lump or dent.

## 3. The fix

`armSmooth` of a rig config runs Taubin rounds (`taubin()`) on the source vertices of the arm
tubes after the weights. Each vertex moves by its weight on the bones of `bones`.
`pnpm rig-mesh <animal> --check --keep <dir> --set 'armSmooth=<json>'` gives each variant.

| Variant | Largest move | Play folds | Other result |
|---|---|---|---|
| Wolf, `main` | | `neck` 10,661, `upper_arm_seg1_R` 58 samples | |
| Wolf, 6 rounds (chosen) | 0.0144 u | `neck` 51, `upper_arm_seg1_R` 0 | |
| Wolf, 12 rounds | 0.0198 u | `upper_arm_seg0_R` 10,573 | the root folds |
| Cat, `main` | | right arm at most 8 faces | |
| Cat, 4 rounds on the bow arm (chosen) | 0.0048 u | right arm at most 5 faces | |
| Cat, 8 rounds on the bow arm | 0.0066 u | `hand_R` 18,236 samples | the bow paw folds |
| Hippo, `main` | | 8.9% of the samples, 3 faces | |
| Hippo, 6 rounds on the whole tubes | 0.0230 u | 100% | the root folds |
| Hippo, no first segment | 0.0163 u | 24.5% | the elbow folds |
| Hippo, the middles of the tubes (chosen) | 0.0083 u | 3.2%, 1 face | |

The hippo elbow has rings with a set gap for its helper bone, and its root joins the side wall,
so the hippo smooths only the second and the third upper arm segments and the last three forearm
segments.

## 4. The gates

| Gate | Wolf | Cat | Hippo |
|---|---|---|---|
| `pnpm arm-check <role> --base main` | each value of `main` or better | each value of `main` or better | each value of `main`; the left paw twist stays `OPEN` |
| `pnpm arm-look <role>`, right crumple share | 1.4% (2.5%) | 23.9% (23.9%), `FAIL` as on `main` | 7.8% (7.8%) |
| `pnpm fold-probe <role> --base main`, play | at most 6 faces (7) | at most 19 faces (21) | 3.2% of the samples (8.9%) |
| `pnpm pose-depth <role> --base main` | the upper arms 1.2 cm into the body (1.0 cm) | no `GROWS` | no `GROWS` |
| `pnpm body-probe --base main` | only the wolf bodies | only the cat bodies | the hippo bodies, and the conductor and two timpanists from a few samples on |

The first download is 837,996 B. The outputs are `gate-arm-check-*.txt`, `arm-look-*.txt`,
`fold-*.txt`, `depth-*.txt`, and `body-probe-*.txt`.

## 5. The cat bow arm

At the tip of the bow, thin dark wavy folds cross the right shoulder of the cat, and at the frog
a dent sits under the armpit (`cat-right-az120.webp`). They lie at the root, outside the tube, so
the smoothing does not change them. A rim of skin normals of 0.14 or 0.18 units around the
shoulder joints (`rootNormals.radius`, 0.1 on `main`) did not remove them
(`cat-rims-right.webp`, `cat-rig-check-rims.txt`), so they are folds of the geometry. Before the
raise shape of the bow arm of the round `cat-root3`, the crumple share was 27.8%.

## 6. The images

`main` is above the fix in each image (`pnpm close-views <role> <dir> --glb <file> --base main
--sheet --views <views> --moments <moments> --scale 3 --box <box>`).

- `wolf-az120-right.webp`: the wolf at rest, at a note, and between notes, from az120 (the angle
  of the image of the user) and the right. `wolf-sm-<view>.webp`: the four directions.
- `cat-right-az120.webp`: the cat bow arm at the frog, the tip, and a crossing.
  `cat-final-<view>.webp`: the four directions, against the commit before the fix.
- `hippo-az120-az150.webp`: the hippo at rest, at the frog, and at the tip, from az120 (the angle
  of the image of the user) and az150. `hippo-sm-<view>.webp`: the four directions.

The changes are small: the forearm of the wolf in the play and the underside of the hippo forearm
at rest are calmer. No view shows a new fold, notch, or dark line.

## 7. Open

- The folds of the root of the cat bow arm stay (section 5).
- The hippo bow at rest: the stick goes through the middle of the round paw, and the frog end
  hides inside it, so the paw reads as a lid on the stick. The right rest hold is a choice for
  the user.
