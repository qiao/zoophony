# The string models

Date 2026-10-29. Round `string-models`. Decisions:
[`2026-10-29-string-models.md`](../decisions/2026-10-29-string-models.md). The probes and their
outputs are in [`2026-10-29-string-models/`](2026-10-29-string-models/). Each command runs from the
root of the tree. "Base" is `9ecc8a9bd`.

## 1. The question

The user said: "make the models of the string instruments more detailed, polished, and realistic".
On the base, the body outline of the violin, the viola, the cello, and the contrabass had no
corners. The neck, the fingerboard, the tailpiece, the bridge, and the chin rest were boxes, the
scroll was a disk, the four strings were one strip, and the bow was a square stick. The goal is a
well-made low-poly copy of a real instrument, with the anchors of the holds and of the play targets
unchanged.

## 2. The real proportions

| Measure | Real | Model, as a share of the body | Source |
|---|---|---|---|
| Violin body length | 356 mm | 1 (0.24 m before the scale) | [Johannsson][hj] |
| Upper bout | 168 mm (0.472) | 0.472 | [Johannsson][hj] |
| C-bout | 112 mm (0.315) | 0.315 | [Johannsson][hj] |
| Lower bout | 206 mm (0.579) | 0.567 | [Johannsson][hj] |
| Rib height | 30 mm (0.084) | 0.098 | [Johannsson][hj] |
| Cello body length | 750 to 756 mm | violin form | [NMM][nmm], [Toft][toft] |
| Cello rib height | 112 to 121 mm (0.16) | 0.098 | [NMM][nmm], [Vidal][vidal] |
| Bow length | 746 mm | 0.45 m before the scale | [Edinburgh][ed] |
| Bow stick at the frog, at the tip | 8.9 mm, 7.0 mm | 8.6 mm, 5.3 mm (violin) | [Edinburgh][ed] |
| Bow head height | 23.5 mm | 20 mm (violin) | [Edinburgh][ed] |
| Frog top length | 45.7 mm | 41 mm (violin) | [Edinburgh][ed] |

- The double bass has sloped shoulders, a flat back with a break in the upper bout toward the neck
  block, and machine heads in place of friction pegs ([double bass][db]).
- The bow has a frog with a metal ferrule where the hair comes out, an eye, a slide, an octagonal
  screw button, and a head with a face at the tip ([Edinburgh][ed]).
- The model keeps the outer size of each body, so the lower bout stays 2 percent narrower than
  real. The cello keeps the depth of the violin form, because a deeper body moves the back into
  the chest of the dog (open problem).

[hj]: https://hansjohannsson.com/resources/mesvioli.html
[nmm]: https://emuseum.nmmusd.org/objects/13787/violoncello
[toft]: https://timtoftviolins.com/product/john-owen-leeds-1931/
[vidal]: https://luthiervidal.com/en/violoncellos-and-accessories/cello-instruments/cello/cello-school-mirecourt.html
[ed]: https://collections.ed.ac.uk/mimed/record/18452
[db]: https://www.newworldencyclopedia.org/entry/Double_bass

## 3. The model

The strings stay at `VIOLIN.stringHeight` over the whole length, because the bow contact and the
fingerboard target read that height. A real string slopes down about 5° from the bridge to the
nut, so the real fingerboard can lie close to the top. In the model, the board keeps the top height
and the end thickness of the base board, and it tapers in width and thickness to the nut. A
thicker or higher board failed the clearance of the hippo (section 4).

| Instrument with its bow | Base triangles | Round triangles |
|---|---|---|
| violin | 452 | 1,188 |
| viola | 452 | 1,188 |
| cello | 450 | 1,150 |
| contrabass | 450 | 1,174 |

`node docs/research/2026-10-29-string-models/tri.ts` counts them.

## 4. The measures

`pnpm pose-depth <role> --demo boulanger-matin --demo beethoven-1 --demo brahms-2 --base
9ecc8a9bd` (logs `pd-<role>.log`). The table gives each measure that changes by 0.2 cm or more,
in cm. No measure passes its limit (1.5 cm, 2.0 cm for an instrument in the body).

| Role | Moment | Measure | Base | Round |
|---|---|---|---|---|
| violinist (rabbit) | play | instrument in body | 1.8 | 1.9 |
| violinist (rabbit) | lower | instrument in body | 1.7 | 1.9 |
| violinist (red fox) | rest | forearms in violin | 0.1 | 0.5 |
| violinist (rabbit) | play, lower | upper arms in violin | 0.6 | 0.0 |
| violinist (rabbit) | lift | forearms in violin | 0.5 | 0.0 |
| cellist (dog) | lift, lower | paws in cello | 1.0 | 1.2 |
| bassist (hippo) | play | paws in contrabass | 1.5 | 1.3 |
| bassist (hippo) | rest | paws in contrabass | 1.4 | 0.9 |
| bassist (hippo) | rest | forearms in contrabass | 1.5 | 0.9 |

Two variants failed the bassist before the final model, and the model changed for each:

| Variant | Measure | Base | Variant |
|---|---|---|---|
| board top 4 mm higher (before the scale) | play paws in contrabass | 1.5 | 2.4 |
| wedge board, underside 4.5 mm lower at the body end | play paws in contrabass | 1.5 | 1.9 |
| solid neck under the first positions | lift forearms in contrabass | 1.5 | 1.7 |

The left paw of the hippo passes through the board in a high position, and its wrist through the
middle of the neck near the nut. The base box neck left a gap under the board there. The final
neck is open under the first positions, with two thin side walls (`NECK_OPEN`).

`pnpm pose-depth <role> <demos> --targets` on each tree (logs `pdt-*.log`): the share of the
targets within 5 mm is the same on both trees. The worst bow error drops (bassist 120.0 mm to
90.8 mm), because `VIOLIN.stringsWidth` is now the real width of the four strings at the bridge.

`pnpm clip-probe --base 9ecc8a9bd --jobs 4` (log `clip-probe.log`): each of the 15 files passes,
with the same value as the base in each measure.

The varnish: `varnish.py` measures the mean color of the varnish pixels in a box of a play frame
(log `varnish.txt`). The cello hue is 19.4° on the app and 19.0° on `orchestra-latest.png`, and
the violin hue is 16.6° on the app and 20.3° on the reference. So the app is not more orange, and
the colors stay. The app is brighter (value 0.61 against 0.44 on the cello), which comes from the
light.

The four strings: a play frame at 1440 × 900 at the cameras `orchestra` and `violins`, a strip of
six frames 0.05 s apart, and close shots at the dog, the rabbit, and the hippo show four fine lines
over the black board. No light bar shows, and the lines stay steady from frame to frame.

The cost: `pnpm frame-compare 9ecc8a9bd e41b571f2 --runs 2` (log `frame-compare.txt`), the
paused test `src/models/budget.test.ts` (log `scene-budget.txt`), and `pnpm size --base 9ecc8a9bd`
(log `size.txt`). The scene of `perf-60.mid` was over its budget of 200,000 triangles on the base
too, because of the studio bodies.

| Measure | Base | Round |
|---|---|---|
| Main thread p50 / p95 | 3.73 / 4.96 ms | 4.36 / 5.60 ms |
| GPU p50 / p95 | 7.79 / 7.95 ms | 7.90 / 8.09 ms |
| Frame rate with no cap | 130.3 fps | 125.8 fps |
| Triangles of the scene of `perf-60.mid` | 265,421 | 282,169 |
| First download, gzip | 842,979 B | 846,290 B |

## 5. The result

The models get the corners, the dark edges, the f-holes, the scroll and the pegs, the bridge, the
tailpiece, the chin rest, four strings, the shaped bow, and the double bass form. Each instrument
with its bow has at most 1,188 triangles, within the new budget of 1,200. The clearance stays
within the limits.

The smaller chin rest moves the seats of the default demo. On the base, a violin at the radius
2.72 m touched an item in front, so `fitRow()` placed row 0 at 2.76 m, and the first violins sat
between -70.0° and -9.9°. The new chin rest clears at 2.72 m, and the first violins sit between
-89.9° and -12.8°, the mirror of the violas and the cellos (`rows.ts`). The clip probe passes with
this layout. The cello keeps the depth of the violin form, and the strings stay parallel to the
body (open tasks of `TODO.md`).
