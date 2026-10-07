# Animal anatomy and facets: a plan

Date: 2026-10-07. Code: commit `258df9d` (`main`). Reference: `docs/reference/lowpoly-animals.png`
(design 1). Earlier reports: `2026-10-06-skinned-bodies-plan.md`, `2026-10-06-cute-furry-spec.md`,
`2026-10-07-facet-look.md`, and the review `docs/reviews/2026-10-07-mockup-match.md`.

The user wrote on 2026-10-07: "The polygons for the animals are not looking good. also, their
lower body are too human-like (e.g. legs too long, too thick) and lacks animal traits." This
report measures the reference animals and our animals, builds throwaway prototypes of new legs
and of five facet looks, and gives a plan in small stages.

This report is research. It changes no code. The experiment stayed in a scratch patch (section 8).

## 1. Summary

- **The legs are the main fault.** All 19 species use one human leg: a thigh tube 0.68 H wide, a
  lower leg 0.48 to 0.40 H wide, and a shoe foot 0.48 H wide. The small species of the reference
  have lower legs of 0.27 to 0.34 H and paws of about 0.27 H. Our lower legs are 1.2 to 1.6 times
  too thick, and our feet 1.8 times too wide. The reference thigh is a haunch, a part of the body
  on the seat, and it is not a separate tube.
- **Our legs are not longer than the reference legs.** Our seat is 0.92 H high. The reference
  seats are 1.15 to 1.7 H high. Our legs look long because two thick columns of constant width
  hang from the seat to the floor, as trousers do.
- **Prototype of the legs.** A haunch on the seat, a thin lower leg, and a foot for each group:
  a long flat foot for the rabbit, a hock and a small paw for the fox, the cat, the dog, the wolf,
  and the deer, and a round pad for the heavy species. The prototype keeps the seat, the hip, the
  torso, and the head. With it, 1,960 of 1,972 unit tests pass, also the footprints, the layout,
  the hidden heads, and the shots. The 12 failures are 6 pins of the old leg and 6 tests of the
  rest laps and the violin arm (gaps of -0.032 to 0.004 H).
- **No new bone.** No pose turns the legs (design 4.7), so the metatarsus and the paw are rigid
  on `foot`, with the `foot` bone at the hock.
- **The facet size is not the fault of the polygons.** On the back of the conductor in the play
  view, every variant has facets of 0.24 to 0.36 H, and the reference bear has 0.28 H. The
  faults are of structure: the color borders are sawtooth lines (about 6 teeth on each cheek of
  the fox), the normal jitter makes the faces mottled, and the head is a ball of rings with no
  planes of the face.
- **Recommendation for the polygons: variant p8.** Color borders that cut the triangles along a
  straight line, and flat fur shading with no jitter. The largest body grows from 1,976 to 2,094
  triangles (budget 2,600), and the scene of `perf-60.mid` from 133,656 to 140,634 (budget
  200,000).
- **Stages.** Two tracks for two agents: the look track (L1 cut borders, L2 flat fur) and the
  anatomy track (A1 to A5). Only A1 changes the rest laps. The pose work (the stopped contrabass
  and bow task, the rest and play clearance tests) comes after A1. The total is about 15 hours
  of agent time, plus the reviews.

![The reference animals against main](2026-10-07-animal-anatomy-plan/reference-vs-main.png)

## 2. Method

- **Reference crops.** Crops of `lowpoly-animals.png` (1588 × 986 px) at 2× to 4×, with a grid
  in the source pixels, for each species group. The head height H is the unit: the rabbits and
  the foxes have H = 37 px, the cat 48 px, the wolf 45 px, and the bear 70 px. The camera looks
  down at about 35°, so an upright part and the head shrink by the same factor. The values are
  estimates with an error of about 15%.
- **Our animals.** `pnpm screenshots <scratch> --play --sheet` on `258df9d`, and gallery views
  `gallery.html?page=species&only=<species>&zoom=1.45&target=0.55&turn=215` (a view from the
  front left, as the reference camera) and `&turn=270` (a side view). The `turn` query is part of
  the experiment patch only.
- **Prototypes.** An experiment patch adds a knob module `anat-knobs.ts` that reads `?anat=` in
  the browser and `ANAT` in Node: the leg form, the fur crease, the normal jitter, the factor of
  the ring turns, the side counts, and the cut borders.
- **Facet measure.** The script of the facet look report (section 2.1 there): the facet size,
  the luma step, and the share of the luma change at edges, at 46 px for each H. This report adds
  two measures: the reversal rate (the part of neighbor edge steps along a profile that change
  sign) and the mean length of the connected edge lines, in H. The script gives the mockup bear
  the same values as the facet look report (0.31 H, 8.7%, 0.69), so the method repeats.
- **Views of the facets.** The play view of the default demo after 6 s at 1440 × 900 with a
  device scale of 2, and gallery close views at `zoom=2.3&target=0.85`. The gallery light is flat,
  so its steps are small.

## 3. Lower body

### 3.1 The reference animals

How the animals sit on our kind of chair in the reference:

- On the seat, the haunch fills the seat from the chair back to the front edge. The lower leg
  hangs from the front edge to the floor, and the paw or the foot rests on the floor.
- No species of the reference folds its legs on a chair. Only the meerkat sits on its haunches
  on the piano bench, with folded hind legs and small hind paws on the bench.
- The hippos (contrabass), the elephant (timpani), and the bear (conductor) stand.

| Group | Species of the reference | Seat | Thigh | Lower leg | Foot or paw | Traits |
|---|---|---|---|---|---|---|
| Hare | rabbit | 1.5 to 1.7 H | a haunch about 1.5 H long and 0.9 H high, as one form with the lower torso | about 0.3 H wide, hangs to the floor and slants a little forward | long and narrow: about 0.27 H wide and 0.8 to 0.9 H long (foreshortened to 0.55 H), flat on the floor, toes forward | round haunches, puff tail at the seat |
| Digitigrade | fox, cat, wolf, dog | 0.75 H (cat, large head) to 1.5 H (wolf) | a short haunch on the seat. The wolf sits on the front edge, with the thigh 30° down | 0.3 to 0.4 H wide. Dark on the fox and the dog | small and round: 0.27 H (fox) to 0.4 H (cat) wide | bushy tail that hangs behind the seat (fox, wolf), dark hands of the fox |
| Pillar, seated | panda | not measured | merges with the round body | black, thick, with no narrow ankle | a round pad | round belly |
| Pillar, standing | bear, hippo | none | inside the body | bear: about 0.65 H long and 0.65 H wide below the body, 15% of the height of 4.3 H | round pads. The hippo has toenails | small ball tail (bear), wide belly |
| Folded | meerkat | bench | folded under the body | hidden | small paw on the bench | sits upright on its haunches |

The bear of the reference is 4.3 H tall and 1.95 H wide at the belly. Our bear is 3.2 H tall.
The reference heads are smaller than ours: the seated height (seat to crown) is 2.75 H for the
cat and 3.2 H for the wolf, against 2.3 H on our bodies (decision D5, section 7).

### 3.2 Our animals

| Part | Value on `258df9d` (design 4.5) | Against the reference |
|---|---|---|
| Thigh | a tube 0.68 H long, 0.68 H wide at the hip and 0.60 H at the knee | the reference has a haunch, with no separate thigh tube |
| Lower leg | 1.12 H on a chair, 0.48 H wide at the knee and 0.40 H at the ankle | 1.2 to 1.6 times too thick |
| Foot | a shoe 0.65 long, 0.48 wide, 0.28 high | 1.8 times too wide, and the same shoe for each species |
| Seat | 0.35 m = 0.92 H | the reference seats are 1.15 to 1.7 H |
| Standing legs | torso base 0.77 H, so the legs are 24% of the height of the bear | the reference bear has 15% |
| Species traits | the same leg for all species | a haunch, a hock, paws, and long rabbit feet |

### 3.3 The leg forms of the prototype

Each diagram is a side view of a seated left leg. The animal faces left. `o` is a joint and the
bone of the part is in brackets.

```text
 main (all species)        hare (rabbit)             digitigrade (fox, cat, dog, wolf, deer)
 seat ===========          seat ===========          seat ===========
  (thigh)                   (thigh)                   (thigh)
  [  hip ====== knee]o     (  haunch    )o knee      (  haunch    )o knee
      0.68 H wide  ||        0.88 H wide  \            0.80 H wide  |  [shin]
                   ||  [shin]  [shin]      \  0.32 H                 \  0.30 H
                   ||  0.48              0.24\                        o hock 0.34 H
                   ||  to 0.40 H         ankle o                     /  [foot]
                   ||                 ______[foot]______           (paw) 0.36 x 0.28 H
            [__shoe__] 0.65 x 0.48 H  long foot 0.86 x 0.27 H
 floor ===========================================================================

 pillar, seated (panda, polar bear, hippo, ...)     pillar, standing (bear, elephant, badger)
 seat ===========                                    torso base 0.77 H above the floor
  (  haunch    )o knee 0.52 H wide                    ( round body )
                ||  [shin] 0.50 to 0.48 H                ||    ||    a column 0.6 H wide
                ||                                       ||    ||    with no knee narrowing
              (pad) 0.52 x 0.50 H                      (pad)  (pad)
 floor ===================================================================
```

The prototype values, in H (the girth scales the radii):

```typescript
/** The leg group of a species (design 4.3). */
export type LegForm = 'hare' | 'digitigrade' | 'pillar' | 'small-paw';

/** The forms of one leg group, in H. All parts are rigid in the bind pose (design 4.7). */
export interface LegShape {
  /** The haunch on the seat: its radius at the hip, height / width, and the length behind the hip. */
  readonly haunch: { readonly radius: number; readonly flat: number; readonly back: number };
  /** The knee: in front of the hip, above the seat, and its radius. */
  readonly knee: { readonly forward: number; readonly height: number; readonly radius: number };
  /** The radii of the lower leg at the knee and at the ankle (or the hock). */
  readonly shin: readonly [knee: number, ankle: number];
  /** The hock of a digitigrade leg: above the floor, behind the knee, and the metatarsus radius. */
  readonly hock: { readonly height: number; readonly back: number; readonly radius: number } | null;
  /** The foot or the paw. The heel is behind the ankle (or behind the paw point). */
  readonly foot: {
    readonly length: number;
    readonly width: number;
    readonly height: number;
    readonly heelBack: number;
  };
  /** The radius of the straight leg of a standing body. */
  readonly standingRadius: number;
}
```

| Value | hare | digitigrade | pillar | small-paw |
|---|---|---|---|---|
| haunch radius, flat, back | 0.44, 0.78, 0.26 | 0.40, 0.80, 0.22 | 0.44, 0.78, 0.24 | as hare |
| knee forward, height, radius | 0.55, 0.22, 0.20 | 0.60, 0.22, 0.19 | 0.60, 0.22, 0.26 | as hare |
| lower leg radii | 0.16, 0.12 | 0.15, 0.10 | 0.25, 0.24 | as hare |
| hock height, back, radius | none | 0.34, 0.14, 0.09 | none | none |
| foot length, width, height | 0.86, 0.27, 0.17 | 0.36, 0.28, 0.17 | 0.50, 0.52, 0.20 | 0.50, 0.26, 0.15 |
| standing radius | 0.20 | 0.18 | 0.30 | 0.20 |
| species | rabbit | fox-red, fox-tan, wolf, cat, dog, deer | bear, polar bear, panda, hippo, elephant, rhino, pig, beaver, badger | mouse, meerkat, monkey, penguin |

The haunch is the first rings of the thigh tube: an oval ring (`SweepRing.flat`) wider than it is
high, with a round end behind the hip that sinks into the torso. The thigh keeps 0.85 of the
haunch radius up to 0.6 of the way to the knee. Thus the haunch reads as a part of the body on
the seat. The deer gets the digitigrade leg in the prototype. A small hoof in place of the paw is
part of stage A2.

![The legs of main and of the prototype in the play view](2026-10-07-animal-anatomy-plan/legs-prototype.png)

In the play view, the rabbits of main wear thick trousers and boots. The prototype rabbits have
thin lower legs and long feet, and the foxes have a hock and small dark paws.

## 4. Polygons

### 4.1 The measures do not separate the looks

The conductor back in the play view (46 px for each H). The reference rows use the patches of
section 8. A reversal rate of 0 to 1 and an edge length in H are the two new measures.

| Image | Size (H) | Step (%) | Share | Reversal | Edge length (H) |
|---|---|---|---|---|---|
| reference bear back | 0.28 | 7.2 | 0.65 | 0.63 | 1.48 |
| reference rabbit torso | 0.41 | 11.7 | 0.62 | 0.53 | 0.53 |
| reference fox torso | 0.24 | 18.2 | 0.68 | 0.59 | 1.09 |
| reference hippo body | 0.35 | 11.7 | 0.54 | 0.80 | 0.69 |
| `mockup.png` bear back | 0.31 | 8.7 | 0.69 | 0.49 | 1.55 |
| main (crease 10°, jitter 0.02 H) | 0.25 | 10.1 | 0.77 | 0.70 | 1.43 |
| p1: flat, no jitter | 0.24 | 10.5 | 0.76 | 0.68 | 1.42 |
| p3: flat, aligned rings, 10 sides | 0.36 | 13.6 | 0.73 | 0.77 | 1.40 |
| p8: flat, cut borders | 0.25 | 10.8 | 0.76 | 0.69 | 1.43 |
| p9: main shading, cut borders | 0.24 | 9.7 | 0.77 | 0.68 | 1.39 |

All variants are within about 30% of the reference in size, and the reversal rate and the edge
length are the same for all. The patches of the gallery close views were 0.35 H wide and gave
noisy values (for example 0.18 to 1.79 H for one variant), so this report does not use them.
Thus the facet look of 2026-10-07 already has the right facet scale. The faults are below.

### 4.2 What makes the reference facets good and ours bad

| Item | Reference | Ours (`258df9d`) |
|---|---|---|
| Color borders | straight lines along the facet edges: one line from the eye to the jaw on each cheek of the fox, a straight white chest | sawtooth lines: about 6 teeth on each cheek of the fox and along the chest stripe. `splitByCentroid()` gives each triangle one color, and the turned rings put the triangles in a zigzag |
| Faces of the facets | flat and clean, with crisp edges | mottled: the crease of 10° joins some faces, and the jitter of 0.02 H turns each face normal by 5° to 10° at random, so the shade changes with no form behind it |
| Head | 6 to 8 large planes on the visible face: the forehead, two cheeks, the long muzzle with a ridge | a ball of 10 rings with 12 corners. The edges follow the rings and do not follow the features |
| Facet arrangement | uneven triangles along the form | a regular lattice of diamonds from the half turns of the rings |
| Lower body | a haunch and thin legs (section 3) | two thick tubes and shoes |

### 4.3 The variants

All variants have the prototype legs, except main. "Cut" means that the color borders cut the
triangles (section 4.4).

| Id | Crease | Jitter | Rings | Borders | Look in the play view and the close view |
|---|---|---|---|---|---|
| main | 10° | 0.02 H | turned | centroid | mottled, sawtooth face |
| p0 | 10° | 0.02 H | turned | centroid | as main, with the new legs |
| p1 | 0° | 0 | turned | centroid | crisp diamonds, sawtooth face |
| p2 | 0° | 0 | aligned | centroid | horizontal bands on the head, as a lamp shade |
| p3 | 0° | 0 | aligned, trunk 10 sides, legs 6 | centroid | the largest planes on the body, bands on the head |
| p4 | 0° | 0 | quarter turns | centroid | long thin triangles |
| p6, p9 | 10° | 0.02 H | turned | cut | clean face and chest, still mottled, a faint seam at the cut |
| p5, p8 | 0° | 0 | turned | cut | clean face and chest, crisp facets |
| p7 | 0° | 0 | aligned, 10 sides | cut | clean borders, bands on the head |

p5, p6, and p7 had a face border that rose 0.45 H for each H to the front, and the white came
over the eyes. p8 and p9 use 0.3 H for each H.

![The fox heads of the variants beside the reference](2026-10-07-animal-anatomy-plan/polygon-variants.png)

![p0 and p8 close up](2026-10-07-animal-anatomy-plan/close-p0-p8.png)

### 4.4 Recommendation: p8

1. **Cut color borders.** A new mesh helper splits each triangle at the zero line of a field and
   gives each piece the color of its side. The belly stripe uses the field of its angle, and the
   face uses a plane that rises 0.3 H for each H to the front, and a plane at 0.2 H behind the
   head center for the nape. The dog cap, the panda shoulder band, and the socks can use the same
   helper.

   ```typescript
   /**
    * Splits the triangles of a corner list at the zero line of a field. A triangle that crosses
    * the line becomes three triangles, so the border is a straight line on each face.
    *
    * @param corners The corners, 9 numbers for each triangle.
    * @param field A value for a point: below 0 is inside.
    * @returns The triangles inside, and the triangles outside.
    */
   export function splitByField(
     corners: readonly number[],
     field: (point: Vec3) => number,
   ): [inside: number[], outside: number[]];
   ```

2. **Flat fur.** The `fur` finish gets the crease 0°, and `FUR_JITTER` and the jittered corners go
   away. The other finishes keep 60°. The user saw flat shading as golf balls on 2026-10-06, with
   the small equal facets of 16 sides (`2026-10-06-fur-shading.md`). The lean grid of 12 sides
   has larger facets, and p8 shows no golf ball in the play view. This is decision D2.
3. **Keep the grid.** 12 corners on the trunk and the head, turned rings, arms of 6 sides, legs of
   8 sides. The aligned rings of p2, p3, and p7 give bands on the heads.
4. **Later, planes on the heads.** The heads of the fox, the wolf, and the cat need large face
   planes to look as the reference heads. That is a separate stage (L3) and a user decision (D6).

With the knobs of the look alone (`crease:0,jit:0,cut:1`), 5 of 1,972 unit tests fail. 4 tests
pin the centroid colors: three in `trunk.test.ts` (the waist blend, the shoulders under the chin,
the belly color of the lower face) and one in `face-patterns.test.ts`. One test in
`scene/geometry.test.ts` pins the jitter of 0.02 H.

Triangles with p8 and the prototype legs (`count.ts`, section 8):

| Model | main | p8 | Budget |
|---|---|---|---|
| Largest body | 1,976 (panda) | 2,094 (panda) | 2,600 |
| Rabbit | 1,692 | 1,810 | 2,600 |
| Bear | 1,896 | 1,886 | 2,600 |
| Scene of `perf-60.mid` | 133,656 | 140,634 | 200,000 |

## 5. Rig and poses

### 5.1 No new bone

The skeleton has `thighL/R`, `shinL/R`, and `footL/R` (design 4.7). No pose turns the legs, so
each leg part keeps its bind place relative to `hips`. A rigid part on any leg bone stays in its
place. Thus both new legs use the bones of today:

```text
 bone      main                       hare                       digitigrade
 thigh     hip, 0.30 H above seat     hip (haunch)               hip (haunch)
 shin      knee, 0.68 H in front      knee, 0.55 H in front,     knee, 0.60 H in front,
                                      0.22 H above the seat      0.22 H above the seat
 foot      ankle, 0.10 H above floor  ankle, 0.10 H above floor  hock, 0.34 H above floor,
           shoe on foot               long foot on foot          0.14 H behind the knee;
                                                                 metatarsus and paw on foot
```

A `metatarsal` (or `hock`) bone helps only when a pose bends the hock, for example a walk or a
stand-up. It costs a change of `BoneName`, of the bone order and the parents in `rig.ts`, and of
each test that reads a bone index or a bone list, because each skeleton has all bones. Nothing
needs it now. Decision D3 assumes no new bone.

### 5.2 What changes in the pose code

| Item | Change with the prototype legs | Stage |
|---|---|---|
| Rest laps (`lapPoint()` reads the hip, the knee, and the top of the leg mesh) | the lap at the knee (along 1) falls from 0.510 H to 0.384 H (hare) and 0.332 H (digitigrade), at 0.75 from 0.574 H to 0.515 and 0.457 H. At 0.5 it stays at about 0.6 H | A1 |
| Rest clearance tests | the right forearm of the rabbit, the fox, and the cat goes up to 0.032 H into the haunch, the left forearm of the deer up to 0.016 H. The rested violin and viola come 0.000 to 0.004 m from the body (limit 0.02 m) | A1 retunes the lap places of `pose/hands.ts` and `pose/bowed-rig.ts` |
| Play clearance test | the right forearm of the rabbit goes 0.019 H into the legs at 0.40 s | A1 |
| `bowed.test.ts` | the bow rests on the right thigh: 2 tests | A1 |
| Seat height | none: the chair stays 0.35 m, and the hip stays 0.3 H above the seat if the haunch has radius × flat = 0.3 H. The prototype had 0.34 H | A1 |
| Chair clearance | none: the forward move reads the torso. The haunch is up to 0.08 m wider than the seat on each side, as in the reference | A1 |
| Standing players | the torso base stays at 0.77 H. The standing arm hang (rest clearance row 20 of `2026-10-07-rest-clearance.md`) reads the legs, so its angle can change | A4 |
| Footprints and layout | the toes reach 0.90 to 0.92 H in front of the hip (was 1.11 H), so the boxes shrink. The hare toes reached 1.17 H in the prototype. A heel 0.36 H behind the ankle keeps them at 1.11 H | A1, A3 |
| Shot planner stability, hidden heads | no test failed. The heads do not move | none |
| Contrabass high stool | the feet rest on the foot ring as before | none |

Only A1 changes the laps. A2 to A5 change parts below the knee or standing bodies, which have no
lap. Thus the pose work (the stopped contrabass and bow task, the rest and play clearance tests)
starts after A1, and best after A4.

## 6. Stages

Each stage is one branch, green on each commit, merged with `tools/merge-branch.sh`.

```text
 look agent:     L1 cut borders ──> L2 flat fur ──> (L3 head planes, if D6)
                                       ^
                                       └─ after the spotlight pool merges (scene/player.ts)
 anatomy agent:  A1 haunch, thin legs, laps ──> A2 hock, paws ──> A3 hare foot
                                                   ──> A4 standing legs ──> A5 dark socks, hands
 pose work:      starts after A1 (laps), best after A4
```

| Stage | Change | Files | Laps | Done when | Screenshots to compare | Cost |
|---|---|---|---|---|---|---|
| L1 Cut borders | `splitByField()` in `models/mesh.ts`. The belly stripe, the face, the nape, and the dog cap use it. Tests: no triangle crosses a border, each border vertex lies on its plane, the left half mirrors the right half | `models/mesh.ts`, `models/trunk.ts`, tests, design 4.3 | no | the border of the fox cheek is one straight line, no sawtooth on the chests of the fox, the wolf, the cat, the rabbit, and the penguin | `--sheet`, gallery close views of the fox, the wolf, the dog, the panda, the penguin, `--play` | 2 h |
| L2 Flat fur | `fur` crease 0°, no jitter. The shading tests of the crease and the jitter change. The decision rows of the crease in `2026-10-06-fur-shading.md`, and the rows of stage F (the crease of 10° and the jitter) in `2026-10-06-skinned-bodies.md`, change | `models/mesh.ts`, `models/shading.ts`, `scene/player.ts` (one line), `scene/geometry.test.ts` (one test), tests, design 4.5 | no | the play view shows crisp facets with no mottle, and the conductor back keeps a facet size of 0.2 to 0.35 H | `--play`, gallery close views, the conductor back | 1.5 h |
| L3 Head planes (optional, D6) | feature rings for the long muzzle species: a flat forehead plane, cheek planes, a muzzle ridge | `models/head.ts`, `models/snouts.ts` | no | the fox head shows 6 to 8 large face planes in a close view | `--shots`, gallery close views | 4 to 6 h |
| A1 Haunch and thin legs | `LegForm` on `SpeciesParams`, the haunch rings, the thin lower legs, the plantigrade foot for all groups. The lap places of the hands, the violin, and the bows move to keep 0.01 H and 0.02 m | `models/legs.ts`, `models/species.ts`, `models/body-frame.ts`, `pose/hands.ts`, `pose/bowed-rig.ts`, tests, design 4.3, 4.5, 4.7 | yes | `rest-clearance.test.ts`, `play-clearance.test.ts`, and `bowed.test.ts` pass with no new limit, the toes stay within 1.11 H | `--sheet`, `--play`, gallery `&rest` of the rabbit, the fox, the cat, the deer, the polar bear | 4 to 5 h |
| A2 Hock and paws | the digitigrade group: the hock on `foot`, the metatarsus, the small round paw, a hoof for the deer | `models/legs.ts`, tests, design 4.5 | no | the side view of the fox shows the hock 0.34 H above the floor | gallery side views of the fox, the cat, the dog, the wolf, the deer | 2 h |
| A3 Hare foot | the long flat foot of the rabbit, 0.86 × 0.27 H, toes within 1.11 H | `models/legs.ts`, tests | no | the rabbit foot is 3 times as long as it is wide | gallery views of the rabbit, `--play` | 1 h |
| A4 Standing legs | pillars of 0.6 H for the bear, the elephant, the badger. A standing digitigrade leg for the soloists (knee forward, hock back) | `models/legs.ts`, tests | no (standing bodies have no lap) | the conductor back view shows two short columns with pads | `--play`, gallery views of the bear, the badger, a standing fox soloist | 2.5 h |
| A5 Dark socks and hands | the fox gets dark lower legs from the knee and dark hands, as the reference | `models/species.ts`, `models/legs.ts`, design 4.5 | no | the red foxes show black hands and lower legs | `--sheet`, `--play` | 0.5 h |

The two agents share no source file. They share one design file,
`docs/design/04-stage-cast-look.md`, in different sections: the look agent edits the materials
of 4.5 and the color bullets of 4.3, and the anatomy agent edits the species table of 4.3, the
leg rows of 4.5, and 4.7. `tools/merge-branch.sh` rebases the second branch, and its agent
resolves a conflict there. L2 touches `scene/player.ts` and `scene/geometry.test.ts`, so it
starts after the spotlight pool of `src/scene/` merges.

Total: L1 2 h, L2 1.5 h, A1 to A5 10 to 11 h, plus about 1 h of review for each stage. L3 adds
4 to 6 h.

## 7. Decisions for the user

The user does not take questions now. Each row gives the recommendation, and this plan assumes
it.

| Id | Choice | Recommendation (assumed) | Reason |
|---|---|---|---|
| D1 | The rabbit on a chair: lower legs to the floor, or legs folded on the seat (design 1 says "the rabbits sit on large folded hind legs") | lower legs to the floor with long flat feet | every rabbit of the reference sits so. Only the meerkat folds its legs. Stage A1 also corrects the sentence of design 1 |
| D2 | The fur shading: flat (p8), or the crease of 10° with jitter (p9) | flat, as its own stage L2 | the facets are crisp, as in the reference. L1 gives the larger gain alone, so a rejection of L2 loses little |
| D3 | A new leg bone | no | no pose turns the legs |
| D4 | The hippo of the contrabass stands in the reference | keep the high stool | a standing hippo changes the contrabass hold, the footprints, and the stopped contrabass task |
| D5 | The reference heads are smaller (seated height 2.75 to 3.2 H, seats of 1.15 to 1.7 H) | keep the head size and the chair | a change moves every hold, the camera, and the hidden heads. The user asked about the lower body |
| D6 | Planes on the heads (L3) | after L1 and L2, if the screenshots still show round heads | the cost is 4 to 6 h |
| D7 | Dark lower legs and hands of the fox | yes (A5) | the reference foxes have them |
| D8 | "Legs too long" | keep the seat and the leg length, and make the legs thin, with a hock and a slant | the reference legs are as long, but thin |

## 8. How to repeat the numbers

The scratch folder of this session holds the files:
`/private/tmp/claude-501/-Users-xueqiaoxu-proj-zoophony/bbc72698-2ea8-4111-b511-ab4feb30dd03/scratchpad/anatomy-plan/`.

- `experiment.patch` and `anat-knobs.ts`: the knobs on `258df9d`. The query `?anat=` or the env
  variable `ANAT` sets them. For example `legs:animal,crease:0,jit:0,cut:1` is p8, and
  `legs:animal,crease:0,jit:0,tw:0,trunk:10,leg:6` is p3.
- `shoot.ts`, `make_jobs.py`, `run.sh`: start Vite on port 5397, take the gallery and play shots
  in headless Chromium with ANGLE on Metal, and stop the server and the browser.
- `measure.py`: the facet measure, with the reversal rate and the edge length.
- `count.ts`: the triangles of each body and of the scene of `perf-60.mid`.
- `laps.ts`: the lap heights, the knee, and the toe reach.
- `grid.py`, `crop.py`, `labeled.py`: the crops of the reference and the images of this report.

The facet patches: reference bear back (845, 610, 945, 720) at H = 70 px, rabbit torso (401, 567,
420, 597) at 37 px, fox torso (648, 432, 666, 474) at 37 px, hippo body (722, 190, 748, 230) at
60 px, and the play view conductor back (1020, 985, 1150, 1060) at 90 px.

```bash
SCRATCH=<scratch folder>
git apply $SCRATCH/experiment.patch && cp $SCRATCH/anat-knobs.ts src/models/anat-knobs.ts
ANAT='legs:animal,crease:0,jit:0,cut:1' node $SCRATCH/count.ts
ANAT='legs:animal' pnpm test               # 12 failures, section 5.2
ANAT='crease:0,jit:0,cut:1' pnpm test      # 5 failures, section 4.4
zsh $SCRATCH/run.sh rabbit,fox-red tqc,play 'p8=legs:animal,crease:0,jit:0,cut:1'
```

## 9. Addendum: the newest reference

The user added `docs/reference/orchestra-latest.png` while this plan was in work. It shows our
own cast in the low-poly style. These findings come from crops at 3 times the size. H is the
head height, with an error of about 15%. The images `reference-vs-main.png` and
`polygon-variants.png` now use the crops of this image.

| Species | Finding | Change to the plan |
|---|---|---|
| Rabbit (H 40 px), fox | A large haunch fills the seat. The lower leg is about 0.3 H wide and hangs to the floor. The rabbit has a long flat foot. The fox has dark lower legs and black hands. | None. This confirms the prototype legs and D1 and D7. |
| Polar bear (H 50 px) | A small head on a large round body, about 3 H deep from the side. From the bench to the crown it is about 3.4 H. The haunch sits on the bench, and the lower leg is 0.7 to 0.9 H thick. | The pillar lower leg of the bears and the panda gets a radius of 0.35 to 0.4 H (0.25 H in section 3.3). |
| Penguin | An egg body with the dark hood as one form with the body, and small orange paddle feet. No leg shows. About 2.4 H tall. | New `LegForm` value `'webbed'`: the torso goes down to just above the feet as a hem (D9). The standing base of 0.77 H stays, so the choir height, the folder hold, and the choir shots do not change. Stage A4 adds the hem. |
| Bear (H 65 px) | Short legs, about 0.8 H long and 0.75 H wide below the body (about 16% of its height), and a small ball tail. | None. This matches the standing pillar of A4. |
| Hippo | It stands at the contrabass, as in `lowpoly-animals.png`. | D4 holds: the high stool stays for now. A standing hippo is a later stage, because it changes the contrabass hold and the footprints. |
| Wolf, cat, elephant | The same forms as in `lowpoly-animals.png`. The wolf sits on the front edge of the chair with thin legs. | None. |
| Dog, cat (colors) | The dogs are cream labradors with no brown cap. The cat is plain gray, with no stripes. | D10: a later cast colors task, outside the anatomy work. |

**Scene.** The camera looks down from higher than in `mockup.png`, so the whole stage shows. The
stage and the podium have cut corners, and the stage has a raised edge. One warm spotlight from
above lights the conductor and the middle of the orchestra. The penguin choir stands on risers
behind the contrabasses.
