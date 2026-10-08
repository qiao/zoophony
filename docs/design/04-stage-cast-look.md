# 4. Stage, cast, and look

## 4.1 Look

- Low-poly shapes with soft shading, low polygon counts, and matte colors from the reference
  image. The shading smooths the small angles between the faces of a curved part, and keeps the
  hard edges of a box or a plate (4.5, materials).
- One warm spotlight from above, with soft shadows, so that the faceted scene keeps the look of a
  toy model. It makes a pool of light near the conductor, and the stage edges stay dark.
- A visible beam of warm light falls on the stage from above, with haze and dust motes.
- A dark concert hall with two balcony tiers and rows of small warm lamps stands around the
  stage, as in `scene.png` (1). The lamps bloom, and in a close shot they become soft discs.
- A square stage of glossy walnut planks with cut corners, a raised lip, and no steps, as in
  `orchestra-latest.png` (1), yellow chairs, and black music stands.
- Post effects make the image of a film: a bloom, a depth of field in the close shots, a warm
  color grade, a vignette, and a fine grain (light and render, 4.5).
- The bear conductor stands on a podium at the front center. A chamber group of at most 5
  players has no conductor and no podium (4.2).

## 4.2 Layout

The sections go into arcs in the standard order, with no gaps between the used sections. The
stage size follows the player count. Thus a string quartet sits close together on a small stage.

The standard order is the American seating of a professional orchestra, with the contrabasses
in a line at the back, as the Vienna Philharmonic seats them. The user chose this on 2026-10-05
(`docs/research/seating.md`, sections 3 and 6). The diagram shows it from above.

```text
                          back of the stage
┌──────────────────────────────────────────────────────────────────┐
│                        choir (on risers)                         │
│ row 4:  percussion  contrabasses  timpani  trombones  tuba       │
│ row 3:        horns   clarinets | bassoons   trumpets            │
│ row 2:  keyboard  harp   flutes | oboes                          │
│ row 1: 1st violins  2nd violins | violas  cellos  (other desks)  │
│ row 0: 1st violins  2nd violins | violas  cellos  (first desks)  │
│     soloist (piano)        [bear on the podium]                  │
└──────────────────────────────────────────────────────────────────┘
                        front of the stage
```

- The strings sit in wedges. From left to right, the first violins, the second violins, the
  violas, and the cellos. The first desk of each string seat (its players 0 and 1) sits in the
  front row, and its other desks sit in the row behind it. The violins sit left of the
  conductor, and the violas and the cellos sit right of the conductor. The rows spread to the
  side edges, as the rabbits and the flutes of the reference image do (4.5, seat geometry).
- The woodwinds sit in a block of two rows in the middle: the flutes and the oboes in front, the
  clarinets and the bassoons behind them. The harp sits at the left of the front woodwind row.
  The horns sit left of the clarinets, and the trumpets right of the bassoons.
- A keyboard of the orchestra (a celesta, a harpsichord, or an organ that is not the soloist of
  3.8) sits at the left of the harp, behind the violins, as the celesta and the piano of a
  professional orchestra. With no harp and no woodwinds, it sits in the middle behind the
  strings, as the continuo harpsichord of a baroque orchestra. Thus its case no longer stands in
  front of the first violins (UX audit 2026-10-06, N1).
- The back row holds, from left to right, the percussion, the contrabasses, the timpani, the
  trombones, and the tuba. The choir stands on risers behind the orchestra. The vocal soloists of
  3.8 stand in front of the choir, on the lowest level of the risers, as in many performances of
  a choral symphony. A place at the front, beside the conductor, would cover the first violins or
  the cellos in the default view (N1).
- The soloist of 3.8 stands or sits at the front left of the conductor, as in a concerto. The
  user decided this on 2026-10-06 (UX audit 2026-10-05, AM3). A piano seat (3.8) is always
  the soloist, so the piano stands there, as the solo piano of a concerto. Another soloist, such
  as the solo flute of K. 315, leaves its section row and stands next to the podium (4.5, seat
  geometry). It has no music stand, because a soloist plays from memory.
- **Chamber group.** The user decided on 2026-10-06 that a score with at most 5 players (a solo,
  a duo, a trio, a quartet, or a quintet) has no conductor and no podium (UX audit 2026-10-06,
  N9). A conductor for one pianist looked wrong, and the shots of the back of the bear were the
  weakest frames of the film. The players sit in a small arc at the stage center and face each
  other a little, as a real chamber group does. A score with 6 players or more keeps the
  conductor, and so does a score with no players, so that the stage is not empty.
  `chamberFormOf()` of `models/cast.ts` gives one of three forms:

  ```text
     solo              recital                     arc (a string quartet)
                    ┌───────────────┐
                    │ (P)    piano   )                  (V2)  (Va)
      (X)           └──────────────(  )            (V1)            (Vc)
                               (S)
   ────────────────────────────── audience ──────────────────────────────
   X: the player alone, P: the pianist, S: the partner in the crook of the piano,
   V1, V2, Va, Vc: the first violin, the second violin, the viola, and the cello
  ```

  - **Solo.** One player sits or stands at the stage center and faces the audience, with no music
    stand. A pianist sits at the piano, with the case at the stage center.
  - **Recital.** A pianist and one other player: the partner stands or sits in the crook of the
    piano, as in a recital, and turns a little to the pianist.
  - **Arc.** Two to five players in one arc, centered on the middle of the stage. A keyboard sits
    at the left end, then the strings, the harp, the winds, the percussion, and the singers, in
    the order of the rows. Thus a string quartet sits in the classic quartet half circle: the
    first violin, the second violin, the viola, and the cello from left to right.
  - The soloist rule of 3.8 and the front-left place of the soloist do not apply: no player
    leaves the group. A player alone and the partner of a pianist stand when their instrument
    stands as a soloist (4.5). The players of an arc sit.
  - The stage follows the rule of 4.5 with its minimum of 5 m, so the piano solo of the audit has
    a stage of 5.00 m (8.06 m with the conductor). 4.5 gives the values.
- Larger species sit farther back, so that a big animal hides no smaller animal. The user asked
  for this on 2026-10-05, and said that a species can change its instrument. A species of the
  size 1.2 or more plays only the contrabass, the timpani, the trombone, or the tuba. The
  strings have species of the size 1.05 or less, and the piano 1.1 or less. The section map of
  4.3 follows the rule (`docs/research/seating.md`, section 5). Thus the large species sit in
  the back row, and only the bear stands in front of them.
- A test of `scene/` draws the bind pose silhouettes of the players and the conductor of each
  demo and of the choir test file (`models/test-choir.ts`) in the default view at 1440 × 900,
  with a depth buffer. In each demo and in the choir test file, a large species hides less than
  10% of the head of each smaller animal. Until 2026-10-05, the lowest riser level was 0.25 m
  high. Then the elephant of the timpani hid 18.1% of the head of one penguin of the choir test
  file, and this pair had a limit of 20%. The removed Handel demo had the same case (17.8%). In
  the Beethoven 9 demo, the two hippos of the contrabasses hid up to 100% of the heads of four
  penguins. With the lowest level at 1.0 m, no large species hides 5% of a head. With the rows of
  step 4, the hippo hid 59.0% of the head of a bassoon beaver in Boulanger, and the elephant
  23.5% of a penguin head.

## 4.3 Species

All animals use one parametric biped body. Each species changes only its parameters.

```typescript
interface SpeciesParams {
  ears: 'long' | 'pointed' | 'round' | 'large-round' | 'floppy' | 'large-flap' | 'small'
    | 'side-round' | 'antlered' | 'low-round' | 'none';
  snout: 'short' | 'long' | 'blunt' | 'broad' | 'pointed' | 'buck-teeth' | 'trunk' | 'flat-nose'
    | 'horn' | 'beak' | 'roman' | 'tapered' | 'round';
  tail: 'none' | 'puff' | 'bushy' | 'thin' | 'flat';
  /** The leg group (4.5): the haunch, the lower leg, and the foot. */
  legs: 'hare' | 'digitigrade' | 'hoofed' | 'pillar' | 'small-paw' | 'webbed';
  /** Height scale. 1.0 is the rabbit of the reference image. */
  size: number;
  /** The width of the torso and the thickness of the limbs. Default 1.0. The meerkat has
   * 0.75. */
  girth?: number;
  colors: { fur: string; belly: string; accent: string };
  /** The parts that get the accent color (4.5). */
  accentParts: readonly AccentPart[];
  /** The eyes (4.5). */
  eyes: EyeLook;
  /** Face pattern, for example the eye patches of the panda. */
  facePattern: 'none' | 'eye-patches' | 'cap' | 'stripe' | 'forehead-stripes'
    | 'face-disc' | 'eye-rings';
  /** The forms of the body (4.5). With no value, each form has its default. */
  form?: BodyForm;
  /** The skeleton (below). Each value that it does not give has its default. */
  proportions?: Partial<BodyProportions>;
  /** The hand-made body from the Blender build (4.4). With no value, the body is parametric. */
  sculpt?: Sculpt;
}

interface EyeLook {
  /** An almond wider than high with its outer end up, an upright oval, or a small bead. */
  form: 'almond' | 'oval' | 'bead';
  /** The iris color. The eye then has a black pupil. With no value, the eye is black. */
  iris?: string;
  /** The turn of the right eye out from the front of the face, in degrees. With no value,
   * the place of `eyePlace()`: 26° for the low eyes and 29° for the high eyes. */
  out?: number;
}

interface BodyForm {
  /** The extra half width of the cheeks of the head, in H. Default 0.03. */
  cheeks?: number;
  /** The width of the head at the cheeks, in H. All head rings scale to it. Default: the
   * width that the cheeks give (1.32 for 0.03). */
  headWidth?: number;
  /** The forward move of the rings above the eyes, in H. Default 0, at most 0.08. */
  brow?: number;
  /** The large face planes of the head (4.5). With no value, the round head of the rings. */
  facets?: 'canine' | 'feline' | 'retriever' | 'leporine' | 'ursine' | 'spheniscine';
  /** The forward bulge of the belly, as a factor of the half width. Default 1.16. */
  belly?: number;
  /** The half width of the neck ring, in H. Default 0.36, at least 0.3. */
  neck?: number;
}

/** The skeleton of a species (`models/proportions.ts`). Each length is in H, except `H`. */
interface BodyProportions {
  /** The head height `H`, in meters. Default: 0.38 m × size (4.5). */
  headHeight: number;
  /** The head center above the base of the torso. Default 1.8 (head top 2.3 above the seat). */
  headCenter: number;
  /** The head center in front of the axis of the torso. Default 0. The neck leans to it. */
  headForward: number;
  /** The shoulder joints above the base of the torso. Default 0.98. */
  shoulderHeight: number;
  /** Each shoulder joint from the middle, times the girth. Default 0.52. */
  shoulderSpread: number;
  /** The upper arm and the forearm. Default 0.7 and 0.65. */
  upperArm: number;
  forearm: number;
  /** Each hip joint from the middle, times the girth. Default 0.32. */
  hipSpread: number;
  /** The seated knee in front of the hip joint and above the seat. Default: the leg group. */
  seatedKnee: { forward: number; height: number };
  /** The factor of the depth of the torso at the front and at the back. Default 1. */
  torsoDepth: number;
  /** The base of the torso above the floor for a standing body. Default 0.77. */
  standingBase: number;
}
```

| Species | cheeks | headWidth | brow | belly | neck | Look in the references |
|---|---|---|---|---|---|---|
| rabbit | 0.03 | 1.32 | 0.02 | 1.14 | 0.36 | round cheeks |
| fox (both colors) | 0.05 | 1.2 | 0.04 | 1.08 | 0.36 | a slim chest, a white ruff on the cheeks, a head 1.2 wide (`mockup.png`) |
| wolf | 0.05 | 1.12 | 0.04 | 1.08 | 0.36 | a slim chest, a white ruff on the cheeks, a head 1.1 wide (`mockup.png`) |
| cat | 0.04 | 1.08 | 0.03 | 1.12 | 0.36 | a head 1.0 wide (`mockup.png`) |
| dog | 0.02 | 1.22 | 0.04 | 1.14 | 0.36 | |
| deer | -0.03 | 1.2 | 0.02 | 1.08 | 0.3 | a narrow head, a slim neck |
| meerkat | 0.03 | 1.32 | 0.02 | 1.08 | 0.3 | a slim neck |
| mouse | 0.04 | 1.34 | 0 | 1.14 | 0.36 | |
| monkey | 0.02 | 1.3 | 0.06 | 1.14 | 0.36 | a strong brow |
| bear | 0.01 | 1.28 | 0.05 | 1.22 | 0.36 | a round belly (`scene.png` 05) |
| polar bear, panda | 0.02 | 1.3 | 0.05 | 1.22 | 0.36 | a round belly |
| hippo | 0.01 | 1.28 | 0.03 | 1.2 | 0.36 | heavy |
| rhino, elephant, pig, beaver, badger | 0.04 | 1.34 | 0.03 | 1.2 | 0.36 | heavy |
| penguin | 0 | 1.04 | 0 | 1.2 | 0.4 | the hood is the narrow top of the egg body (`orchestra-latest.png`) |

The values start from the table of plan 2.5 (`docs/research/2026-10-06-skinned-bodies-plan.md`),
with the bellies 0.08 larger for the belly of 1.16 of the cute torso, and with no neck below 0.3
(spec 4, stage A3). The deer has the cheeks -0.03 (a head 1.20 wide), and the bear and the hippo
have 0.01 (1.28 wide). Thus the head of the deer keeps 0.03 m from the neck of the harp, the head
of the hippo from the neck of the contrabass, and the left hand of the conductor from its head.
With the default cheeks, these gaps were 0.022, 0.0296, and 0.0197 m.

The skeleton of each species (`BodyProportions`) is one table. `proportionsOf()` fills each value
that `SpeciesParams.proportions` does not give with its default, and the frame of the body
(`models/body-frame.ts`) holds the result. The trunk, the arms, and the legs read the head center,
the joints, the arm lengths, the seated knee, and the torso depth from it. The seated knee of each
leg group is in `SEATED_KNEES`: 0.66 in front of the hip and 0.22 above the seat, and 0.68 and
0.24 for the pillar group. On 2026-10-07, the user chose option A of
`docs/research/2026-10-07-proportions.md`: the skeletons follow the model sheets, with a smaller
head in meters (fox × 0.86, rabbit × 0.77, dog × 0.79), a longer torso, and the shoulder joints
under the chin. Stage P0 added the table with the values of before. Stage P1 gave the red fox and
the tan fox their own skeleton:

| Value | Default | Foxes |
|---|---|---|
| `headHeight` | 0.38 m × size | 0.327 m |
| `headCenter` | 1.8 | 2.05 |
| `shoulderHeight` | 0.98 | 1.47 |
| `shoulderSpread` | 0.52 | 0.35 |
| `upperArm`, `forearm` | 0.7, 0.65 | 0.81, 0.75 (the meters of the default) |
| `hipSpread` | 0.32 | 0.38 |
| `seatedKnee` | 0.66 forward, 0.22 high | 0.78 forward, 0.12 high |

The crown of a seated fox is 1.197 m above the floor, as in `fox-views.png`. The report gave the
knee 0.90 in front of the hip. Then the toes were 1.22 in front of the hip, past the 1.11 that
keeps the music stands clear. The knee at 0.78 (0.255 m) keeps the length of the haunch in meters
of the sheet within its error.

Stage P1 also gives the rabbit its own skeleton, from `rabbit-views.png`:

| Value | Default | Rabbit |
|---|---|---|
| `headHeight` | 0.38 m × size | 0.293 m (× 0.77) |
| `headCenter` | 1.8 | 2.1 (crown 1.112 m above the floor on the chair) |
| `shoulderHeight`, `shoulderSpread` | 0.98, 0.52 | 1.41, 0.53 |
| `upperArm`, `forearm` | 0.7, 0.65 | 0.91, 0.84 (the arms of before in meters) |
| `hipSpread` | 0.32 | 0.43 |
| `seatedKnee` | 0.66 forward, 0.22 high | 1.0 forward, 0.22 high |
| `torsoDepth` | 1 | 0.67 |

The report gave the seated knee 1.30 in front of the hip. There, the knee was under the bow hand
of the violin at the tip of a down-bow, and the hand went 0.13 H into the thigh (Boulanger at
66 s). In the side view of the sheet, the haunch is 0.53 m long from its back to the front of
the knee (317 px for each meter). With the back of the sculpt haunch 0.46 H behind the hip joint
and the knee 0.23 H thick, the knee of the sheet is about 1.1 in front of the hip. With the knee at
1.0, the bow hand stays out of the legs.

Stage P2 gives the wolf its own skeleton, from the wolves of `orchestra-side.png` and
`orchestra-latest.png` (`docs/research/2026-10-08-dog-family.md`). The scenes give the crown
(2.9 Hv above the seat), the shoulder joints (1.67 Hv), and the width with the arms (1.4 Hv). Hv
is the visible head height of the report, 0.92 H. The hips and the knee are those of the foxes:

| Value | Default | Wolf |
|---|---|---|
| `headHeight` | 0.38 m × size (0.361 m) | 0.315 m (× 0.87) |
| `headCenter` | 1.8 | 2.14 (crown 1.191 m above the floor on the chair, as before) |
| `shoulderHeight`, `shoulderSpread` | 0.98, 0.52 | 1.54, 0.45 |
| `upperArm`, `forearm` | 0.7, 0.65 | 0.8, 0.745 (the arms of before in meters) |
| `hipSpread` | 0.32 | 0.38 |
| `seatedKnee` | 0.66 forward, 0.22 high | 0.78 forward, 0.12 high |

The scenes give a seat of 1.4 Hv. A head of 0.25 m gives it, but then the crown of the wolf is
0.11 m lower than before. The wolf keeps the height of its body, and its seat is 1.21 Hv.

Stage P2 also gives the dog its own skeleton, from the dog table of the report and
`dog-views.png`:

| Value | Default | Dog |
|---|---|---|
| `headHeight` | 0.38 m × size (0.399 m) | 0.315 m (× 0.79) |
| `headCenter` | 1.8 | 2.95 (crown 3.76 Hv above the seat, sheet 3.90) |
| `shoulderHeight`, `shoulderSpread` | 0.98, 0.52 | 2.02 (2.20 Hv, as the sheet), 0.8 |
| `upperArm`, `forearm` | 0.7, 0.65 | 0.92, 1.06 (1.0 and 1.15 Hv, sheet 0.95 and 1.15) |
| `hipSpread` | 0.32 | 0.5 |
| `seatedKnee` | 0.66 forward, 0.22 high | 1.05 forward, 0.2 high |

The crown of the seated dog is 1.44 m above the floor (1.27 m before). The sheet has a chair of
0.45 m, and its crown is 1.17 m above the seat, against 1.09 m here. With the head center 3.09
(the crown of the sheet), the taller dogs hid more of the violas in the close shots, and only 50
of 83 section and solo shots were low (limit 50, N4 of 5.6). With 2.95, 51 are low. With the
upper arm of the sheet (0.87), the bow reached the hair of the cello only from 0.045 m (limit
0.03 m). The shoulders with the arms are 2.26 Hv wide (sheet 2.48, 1.51 before): the sheet
measures the arms out on the cello, and the bow arm of a wider body passes farther from the
strings.

Stage P3 gives the polar bear its own skeleton, from `polar-bear-views.png` (the sheet). Its
visible head Hv (the chin to the crown, with no ears) is 0.854 H: the crown 0.5 above the head
center, and the chin 0.354 below it. Thus Hv is 0.35 m, as in the sheet.

| Value | Default | Polar bear | Sheet, in Hv |
|---|---|---|---|
| `headHeight` | 0.38 m × size | 0.41 m (× 0.98) | Hv 0.35 m |
| `headCenter` | 1.8 | 2.4 (crown 2.9, 1.64 m above the floor on the bench) | crown 3.40 |
| `headForward` | 0 | 0.6 | about 0.8 in the side view |
| `shoulderHeight` | 0.98 | 1.51 | 1.77 |
| `shoulderSpread` | 0.52 | 0.63, times the girth 1.3: 0.82 | shoulders 2.62 wide with the arms |
| `upperArm`, `forearm` | 0.7, 0.65 | 0.85, 1.09 | 1.00, 1.28 |
| `hipSpread` | 0.32 | 0.45, times the girth: 0.585 | knees 1.85 apart |
| `seatedKnee` | 0.68 forward, 0.24 high (pillar) | 1.05 forward, 0.1 high | haunch 2.45 long, knee top 1.66 above the floor |

The girth of 1.3 (4.5) makes the torso of the parametric body 1.3 times as wide and as deep.
The knees are closer than in the sheet, so that the body on a chair stays inside the seat arc of
0.95 m (4.5): with the hips 0.54 from the middle, it was 1.00 m wide at the haunches. The front
of the keys stays 0.55 H + 0.05 m in front of the seat center (4.6), so the knees are under the
keys, as in the side view of the sheet. The sheet has the keys 0.68 m in front of the bench
center. The bench keeps its place of 4.6.

Stage P3 also gives the bear on the podium its own skeleton, from the bear of
`orchestra-latest.png` and `orchestra-side.png`. The scenes show it from behind and from the
side: about 4.5 Hv from the floor to the crown (ours had 3.41 Hv), a head 1.3 Hv wide, a torso
2.2 Hv wide, short legs, and short arms. The user also asked for shorter arms (2026-10-07).

| Value | Default | Bear | Scenes, in Hv |
|---|---|---|---|
| `headHeight` | 0.38 m × size (0.513 m) | 0.45 m (× 0.88) | Hv about 0.39 m |
| `standingBase` | 0.77 | 0.9 | legs about 1.0 |
| `headCenter` | 1.8 | 2.45 (crown 3.85 above the floor, 1.73 m) | crown 4.5 to 4.6 |
| `shoulderHeight`, `shoulderSpread` | 0.98, 0.52 | 1.7, 0.62 | shoulders about 3.0 above the floor |
| `upperArm`, `forearm` | 0.7, 0.65 | 0.66, 0.62 (0.576 m, 0.83 of the 0.693 m of before) | short arms |
| `hipSpread` | 0.32 | 0.4 | legs 1.0 apart |

The bear stays near its height of before (1.76 m to the ear tips with its sculpt, 1.63 m before), as option A
asks. Arms of 1.20 H put the baton beyond 97% of the reach of the arm at beat 30 of the
conductor test, and the left hand beyond it in a loud mirror.

A height map moves the torso with the table:

- Below the shoulder joints, each height of the torso scales with the joints: the rings, the
  `hips`, `spine`, and `chest` bones, the blend bands of the waist and the chest (4.7), and the
  shoulder band of accent arms.
- Above the joints, the top ring of the torso and the `neck` bone keep their part of the way from
  the joints to the neck ring.
- The neck ring and the `head` bone stay 0.5 below the head center, and the head keeps its form.
  A neck ring that is not above the joints is an error.
- A skeleton with a forward head (`headForward`) moves the head center, the `head` bone, and the
  neck ring forward by that distance. The top ring of the torso and the `neck` bone move forward
  by their part of the way from the joints to the neck ring, so the neck leans forward. The
  joints and the torso below them do not move.
- The default skeleton keeps each height to the bit, because the map adds moves of 0.

```text
 height above the base of the torso (H)
   headCenter -----  head center (the head keeps its form)
       - 0.5  -----  neck ring, `head` bone
                     top ring 1.2, `neck` 1.05: same part of the way
   shoulderHeight -  shoulder joints (default 0.98)
                     rings, `chest` 0.75, `spine` 0.45, `hips` 0.15: scale with the joints
   0 --------------  base of the torso (the seat)
```

The cat, the wolf, the foxes, and the dog have a `headWidth` (review `2026-10-07-mockup-match.md`,
gap 5): the heads of `mockup.png` are 1.0 (cat), 1.1 (wolf), and 1.2 (fox) of their height wide,
and the cute head of 1.32 made each species a round ball. All rings of the head scale to the
width, and the ears move in or out with the surface under their base. The other species have
the width that their cheeks give, which the table also shows.

The species of `lowpoly-animals.png` and `orchestra-latest.png` have a faceted head (`facets`,
4.5): `canine` for the foxes and the wolf, `feline` for the cat, `retriever` for the dog,
`leporine` for the rabbit, `ursine` for the bear, the polar bear, and the panda, and
`spheniscine` for the penguin. The other species keep the round head of the rings.

| Section | Species | Section | Species |
|---|---|---|---|
| Violin, first seat | rabbit (reference) | Flute | fox, light tan (reference) |
| Violin, second seat | fox, red-orange with a white face (reference) | Oboe | mouse |
| Viola | cat | Clarinet | wolf (`animals.webp`) |
| Cello | dog | Bassoon | beaver |
| Contrabass | hippo | Horn | pig |
| Harp | deer | Trumpet | monkey |
| Piano | polar bear | Trombone | panda |
| Timpani | elephant | Tuba | rhino |
| Percussion | badger | Choir | penguin |
| Conductor | bear (reference) | | |

- The fox plays in two sections, as in the reference image. The two fox colors of the reference
  make the two sections look different.
  `SpeciesId` names them `fox-red` and `fox-tan`.
- The penguins have black and white bodies, which look like choir robes.
- Larger species, farther back (4.2, user decision of 2026-10-05). The large species of the
  size 1.2 or more play only the contrabass, the timpani, the trombone, and the tuba: the hippo
  plays the contrabass, the elephant the timpani, the panda the trombone, and the rhino the
  tuba. The strings have species of the size 1.05 or less: the rabbit, the red fox, the cat,
  and the dog. The piano has the polar bear (1.1). The user chose it on 2026-10-06, in place of
  the meerkat (0.85). On 2026-10-06, in the default view and the three other wide views (5.6),
  the polar bear hid 0% of the head of each other animal at the sizes 1.0 to 1.15, as the
  meerkat did. On 2026-10-07, in the bind pose at 1440 × 900, the polar bear of Boulanger hides
  5.7% of the head of a horn pig in the default view (25°), and 44.7% in the frontal wide view
  (20°). The bench of a larger pianist moves the case of a keyboard in row 2: the celesta of Boulanger
  hides 8.9% of the head of a horn pig in the frontal wide view, against 3.2% with the meerkat.
  On 2026-10-08, with the skeleton and the sculpt of stage P3, the polar bear, the bear, and
  the panda hide less than 0.5% of each head in the default view at 1440 × 900.
  The elephant of `orchestra.webp` played a cello in the front rows, where it hid the bassoons
  behind it. The panda played the cello until the dog (1.05) reached the full bow hair with a
  shoulder turn of 40° (5.3). The pig plays the horn. The badger plays the percussion. The bear
  conducts from the podium.
- The celesta, the harpsichord, the clavinet, and the organs are seats of the piano section
  (3.8), so the polar bear plays them too. The merge rule of 3.7 gives one keyboard seat, so a
  second species of the section never shows. The meerkat keeps its parameters in this section and
  in 4.5, but no section plays it.
- The wolves play the clarinets. The user decided this on 2026-10-05: the gray animal with a
  clarinet of `animals.webp` is a wolf. It has gray fur, a white face and chest, pointed ears,
  and a bushy tail. The raccoons of `orchestra.webp` left the cast, with the face pattern `mask`
  and the tail `ringed`, so the cast kept 18 species. The polar bear makes 19, and 18 of them
  play.
- Further seats of a section alternate their species variants. For example, a third violin seat
  uses rabbits again, and a fourth uses red-orange foxes.

The shape parameters of each species (4.5 gives the size and the colors):

| Species | ears | snout | tail | facePattern | eyes |
|---|---|---|---|---|---|
| rabbit | long | tapered | puff | none | oval |
| fox (both colors) | pointed | long | bushy | none | almond |
| wolf | pointed | long | bushy | none | almond |
| elephant | large-flap | trunk | thin | none | bead |
| bear | round | short | puff | none | bead |
| cat | pointed | short | thin | none | almond |
| hippo | small | broad | thin | none | bead |
| deer | antlered | long | puff | none | oval |
| panda | round | round | puff | eye-patches | bead |
| mouse | large-round | pointed | thin | none | oval |
| beaver | small | buck-teeth | flat | none | bead |
| dog | floppy | blunt | bushy | none | oval |
| monkey | side-round | short | thin | face-disc | oval |
| pig | pointed | flat-nose | thin | none | bead |
| rhino | small | horn | thin | none | bead |
| badger | small | long | puff | stripe | bead |
| meerkat | small | pointed | thin | eye-patches | oval |
| penguin | none | beak | none | eye-rings | oval |
| polar bear | low-round | roman | puff | none | bead |

The leg group of each species (4.5, thigh, shin, foot), as the animals of `lowpoly-animals.png`
and `orchestra-latest.png`:

| Leg group | Species | Look in the references |
|---|---|---|
| hare | rabbit | a large haunch, a thin lower leg, a long flat foot |
| digitigrade | foxes, wolf, cat, dog | a haunch, a thin lower leg back to a hock, a small paw |
| hoofed | deer | the digitigrade leg, with a small hoof |
| pillar | bear, polar bear, panda, hippo, elephant, rhino, pig, beaver, badger | a haunch, a thick lower leg with no narrow ankle, a round pad |
| small-paw | mouse, meerkat, monkey | the haunch and the lower leg of the hare, a small paw |
| webbed | penguin | no visible leg: an egg body down to small orange paddle feet |

- `forehead-stripes` (the cat before stage P2 of 2026-10-08, no species now) are two thin short stripes on the forehead in the accent color,
  0.03 H wide and 0.28 H apart. The first three stripes of 0.05 H looked like a grille (review
  of step 4, the weak species).
  `stripe` (the badger) is a white stripe from the nose over the head, between two black stripes
  over the eyes.
- `eye-patches` (the panda and the meerkat) are two ovals of 0.26 × 0.42 H around the eyes,
  turned 40° so that their lower ends point down and out, as the patches of the pandas of
  `mockup.png`. They were 0.3 × 0.4 H and nearly round before the heads of 2026-10-07, and
  0.24 × 0.32 H before the larger eyes of the polished images. Each patch, face disc, and eye
  ring is an oval of 48 triangles (an icosphere of 20 before, with a ragged outline). `cap` (the beagle dog before stage P2 of 2026-10-08, no species now) is the accent color over
  the head down to 0.14 H below the edge of the lower face,
  with a blaze of the belly color, 0.26 H wide, down the middle of the face, as the beagles of
  `mockup.png`. The cap colors the faces of the head itself and adds no part. Its borders cut
  the triangles of the head, and its lower edge follows the border of the lower face (below). The
  blaze of whole triangles had sawtooth borders. The first dog had
  one round patch around the left eye (`eye-patch`), in `#8a5a36`. The cream dog with brown
  floppy ears does not look like the tan meerkat and the tan fox, as the first tan dog did
  (review of step 4, the weak species).
  `face-disc` (the monkey) is a large face of the belly color around the eyes: an oval of 0.4 ×
  0.44 H around each eye. On the eye rings, the eye patches, and the face disc, the eyes stand
  0.02 H further out than the eyes of the other species, so that the patch does not hide the
  larger eyes of the polished images.
  `eye-rings` (the penguin) is an oval of the belly color of 0.28 × 0.34 H around each eye (0.22 ×
  0.32 H before the eyes of the cute face), as
  the white eye ring of an Adélie penguin. Its eyes stand 0.02 H further out than the eyes of
  the other species, so that they show above the rings. The black eyes on the black head of the
  penguin did not show in a close shot (UX audit 2026-10-06, N8).
- `antlered` (the deer) is two ears that point out to the sides, and two antlers of the belly
  color on the head. `side-round` (the monkey) is two round ears at the sides of the head, at the
  height of the eyes. With pointed ears, the deer looked like the fox, and with round ears on the
  top of the head, the monkey looked like the bear.
- The belly color also colors the muzzle and the lower face: the cheeks, the jaw, and the face up
  to the eyes. Thus the fox and the wolf get their white cheeks from it, as in `animals.webp`. The
  forehead and the back of the head keep the fur color, and so does the top of a long muzzle.
  The upper border of the lower face is level under the eyes, in front of a plane 0.45 H in front
  of the head center, and it drops by 0.3 H for each H behind that plane, down to the back of
  the jaw, as the white cheeks of the foxes of `lowpoly-animals.png`. The nape, behind a plane
  0.2 H behind the head center, keeps the fur color. Before 2026-10-07, the border was level, and
  the faces that turned to the back made the nape.
- On the torso, the belly color is a stripe down the front: within 40° of the front at the chest,
  and within 20° at the base. Thus the stripe narrows down, as the white chest of the fox in
  `animals.webp`. All front faces of the first torso had the belly color, and the fox looked
  white in the front view.
- A color border of the trunk grid cuts the triangles along a straight line on each face
  (`splitByField()` of `models/mesh.ts`), as the borders of `lowpoly-animals.png`. Before
  2026-10-07, each triangle got one color from its centroid, and the turned rings made each
  border a sawtooth line (`docs/research/2026-10-07-animal-anatomy-plan.md`, 4.2). A cut between
  two rings of two bones blends the bones by its height (4.7), so the cut stays on the face in
  each pose. A field with a bend cuts one plane at a time: the head above the jaw ring splits at
  the plane of the bend of the face border first, and the cap at the middle plane, at the plane
  of the head center, and at the sides of the blaze. On a large face of a faceted head (4.5),
  one cut across a bend missed the border by up to 0.016 H.

## 4.4 Models

- Code builds the instruments and the parametric bodies from low-poly shapes. There are no
  texture files.
- A species with a sculpt gets a hand-made body (`SpeciesParams.sculpt`). The user chose these
  bodies on 2026-10-07 (option C), because the parametric bodies stayed far from
  `orchestra-latest.png`. Blender builds them around the bones of the rig (`tools/blender/`, the
  plan `docs/research/2026-10-07-blender-models-plan.md`), and `node tools/build-sculpt.ts
  <species>` packs them into `models/sculpts/<species>.ts`. The packed modules are in the
  repository, so CI needs no Blender. The red fox, the tan fox, the wolf, the dog, the rabbit,
  the polar bear, the bear, and the panda have a sculpt.
- `buildBiped()` puts the mesh of the sculpt in place of the parametric parts. The bones and the
  body points (the palms, the finger blocks, the mouth, and the head center) stay those of the
  parametric body, so the poses and the holds do not change. A test compares the bones of each
  sculpt with the current skeleton.
- A sculpt holds the body above the legs one time, and the legs of two stances: seated on a seat
  of 0.35 m, and standing. The seated legs fit each seat with a drop of 0.35 m from the seat to
  the feet: the chair, the stool, and the high stool with its foot ring. The sculpt of a species
  that plays the piano also holds the legs on the bench of the piano (0.45 m), between the seated
  and the standing legs (`sculptStances()` of `tools/sculpt-rig.ts`). On the bench, the body of
  another species stays parametric.
- A sculpt keeps the rules of the parametric body: at most 2,600 triangles, at most two bones for
  each vertex (4.7), the triangles of the trunk on one joint each, the eyes, the ears, the hands,
  and the feet rigid, and the footprint, the shoulder joints, and the clearance of the arms of the
  tests. Its arms are two rigid capsules on `upperArm` and `forearm`, which overlap at the elbow,
  and its legs are two rigid shells on `thigh` and `shin`, which overlap at the knee.
- The foxes, the wolf, and the dog share one recipe of the dog family
  (`tools/blender/canine.py`). Each species file gives its measures in H, and the accent parts of
  the species (4.5) give the colors of the hands, the lower legs, the feet, the ears, and the
  nose.
- The red fox follows `fox-views.png` on the skeleton of 4.3: a skull 0.94 wide and 0.88 high
  around the head center with a flat crown 0.76 wide, cheek tufts 1.24 apart at 0.17 below the
  head center, and a ball at each side of the chin, so that the lower face is a V from the tufts
  to the chin. The muzzle is short, with a nose 0.14 wide at its tip 0.8 in front of the head
  center.
- The ears of the red fox are 0.58 above their bone, with a base 0.36 wide that runs down the
  side of the head, as the ears of the sheet: its inner corner is 0.1 above the bone, its outer
  corner 0.22 below it, and the base turns 20° so that the inside faces the front and out. The
  tip leans 0.3 to the front. The top 0.35 of each ear has the accent color, and so do the faces
  that point back and out, down to 0.7 of the ear height from the tip, as the dark backs of the
  side view. A light inside of 0.75 of the ear size has a rim of fur around it.
- The large eyes of 4.5 are 0.085 below their bones and 0.05 further out, as in the sheet. Each
  has a white almond 0.34 wide and 0.18 high with its top 0.028 in the lid color, a round iris
  0.176 wide that fills the height of the white, a pupil of 0.45 of the iris, and a light of
  0.022 at the upper inner side of the pupil. The poles of these parts point to the front, so
  that the outline of each part is its widest ring. A blink scales each eye toward its bone.
- The white of the lower face of the red fox starts 0.08 below the head center, just under the
  eyes. It goes back to a border 0.15 in front of the head center, which leans back by 0.5 for each
  1 down, so that the cheek patch and the throat are white, as the side view of the sheet. Along
  the muzzle, the border falls by 0.3 for each 1 to the front, so that the top of the muzzle keeps
  the fur color to the nose. The torso is a pear 0.8 wide under narrow shoulders. A pear 0.84 wide
  left 0.006 between the torso and the right upper arm of the standing violin soloist, below the
  0.01 of the rest pose test (5.2). The torso has a white bib on its front, as the sheet: 0.48 wide
  at the shoulder joints, 0.68 wide at 0.66 above the base of the torso, and from there a V down to
  a point 0.15 above the base, between the haunches. The hands and the lower 1/4 of the forearms
  have the accent color, as the short gloves of the sheet. The haunches are round. The paws and the
  lower 0.52 of each lower leg, from the hock, are dark socks, and the paws are 0.44 long. In the
  sheet, the dark starts 0.094 m below the seat, 0.26 m above the floor. Each lower leg has balls
  of 3 rings, so that the cut of the sock keeps the budget. The brush of the tail has a radius of
  0.3 and a round white tip. The tail goes back through the open chair back and hangs on the right
  side behind the chair, 0.333 m behind the seat center at most. It does not lie on the seat as in
  `fox-views.png`, because the packed rows of the layout follow its box. With the brush on the seat
  (0.58 m high), or with the depth of 0.345 m of the first sculpt, the harp row of Boulanger moved
  to the left, and the flute solos needed cameras above 40° (5.6, N4).
- The tan fox has the forms and the large eyes of the red fox. Its accent ears, hands, lower
  legs, and feet (`#755035`) and its amber iris come from its species (4.5).
- The wolf follows the wolves of `orchestra-side.png` and `orchestra-latest.png` on the skeleton
  of 4.3: a wedge head with a skull 0.88 wide and a flat crown 0.72 wide, a long muzzle with the
  nose 0.97 in front of the head center, and the amber almond eyes of 4.5. White cheek ruffs
  point down and back, with tufts 0.48 out and 0.3 below the head center and a ball at each side
  of the chin. The white of the lower face goes up to 0.1 below the head center, back to a border
  0.1 in front of it that leans back, and down the throat. The ears have a base 0.32 wide from
  0.06 above to 0.16 below the ear bone, turned 15°, a tip 0.55 above the bone that leans 0.24
  out, and a dark inside of 0.7 of the ear with a rim of fur. The torso is broad: 0.96 wide at
  the belly and 0.76 at the chest. A pointed bib on the front is 0.6 wide at the shoulder joints
  and 0.84 wide at 0.8 above the base of the torso, with a V down to a point 0.12 above the base.
  The hands and the lower 0.15 of the forearms have the belly color, as the light hands of the
  scenes (`hand_region` of `canine.py`). The legs and the paws are gray. The trunk has 500
  triangles after the decimate, and the sculpt has 2,534 triangles seated and 2,550 standing.
- The dog follows the golden retriever of `dog-views.png` on the skeleton of 4.3. Its trunk has
  one fur color (`plain`), and only the nose has the accent color. The skull is 1.0 wide with a
  flat crown, and the broad muzzle ends in a large black nose 0.84 in front of the head center.
  The dark eyes are 0.17 × 0.13 with a light. Soft ears hang from the top of the head down its
  sides to the jaw (`ear_hang`): flaps 0.42 wide and 0.14 thick. A thick neck (1.0 wide) stands
  under broad sloped shoulders (`neck`, `yoke`), and the arms are 0.48 to 0.24 thick
  (`arm_radii`). Long fur hangs at the front of the chest (`chest_ruff`), behind each elbow
  (`arm_feather`), and under each thigh (`leg_feather`). The paws are 0.68 long. The tail is a
  plume that hangs from the seat behind the chair to 0.15 m above the floor, with a light tip.
  The standing stance keeps its tip above the floor, so it is 1.1 Hv long (sheet 1.59). Its
  depth stays 0.333 m behind the seat center, as the fox (4.4 above). The hands grow 0.05 to
  their backs and the finger balls 0.03 up the hand (`hand_back`, `finger_lift`), so that the
  bow keeps 0.015 H from the palm and stays out of the fingers in the cello hold. The trunk has
  520 triangles, and the sculpt has 2,126 triangles seated and 2,142 standing.
- The rabbit has its own recipe family (`tools/blender/leporine.py`) and follows
  `rabbit-views.png` on its own skeleton (4.3). Soft forms (`kit.blob()`, a metaball) melt into
  each other with no fold, so the head and the torso are round. The head is 1.23 long and 1.02
  wide at the cheeks, with the crown 0.54 above the head center and full cheeks low on the sides.
  The round eyes of 0.24 × 0.28 have the brown iris of 4.5, a black pupil lens two thirds as wide,
  and a light. They lie 0.33 from the middle and 0.44 in front of the head center, 0.14 above
  the eye bones, as in the sheet. The leaf ears are 0.46 wide, with a pink inside of 0.8 of the
  leaf, and their tips are 0.88 above the crown. The arms are soft capsules 0.38 to 0.28 thick,
  and the round paws grow 0.05 toward the back of the hand, so the palm side keeps the gap of the
  bow. The thighs end in round haunches, the lower legs narrow from 0.32 to 0.24, and the long
  round feet are 0.54 wide and 0.5 high with a flat sole. The knee of the sculpt is 0.2 high and
  0.19 long, 0.06 behind the knee bone, and the top of the lower leg is 0.1 under the knee, so
  that the bow hand of the violin stays out of the thigh at the tip of a down-bow. The sculpt has
  2,436 triangles in each stance.
- The bears have their own recipe family (`tools/blender/ursine.py`). The polar bear follows
  `polar-bear-views.png` on its own skeleton (4.3), in the cream of the sheet (4.5). Soft forms
  (`kit.blob()`) give a small round head with a straight muzzle and a black nose 0.62 to 0.8 in
  front of the head center, with a dark mouth line under it. The small round ears (radius 0.11)
  sit 0.35 from the middle at the sides of the crown, and their tops reach the crown. The small
  black eyes of 0.1 × 0.11 lie on the head surface, 28° out from the front, so the front view and
  the side view both show them. The thick neck leans forward to the head (`headForward`), and a
  round back rises behind it. The torso is a round pear on a round seat 2.2 wide at the back, and
  its belly is 1.48 wide, so that the forearms of the rest pose pass over the thighs. The arms are
  soft capsules 0.6 to 0.38 thick, the paws are 0.4 wide with five black claws, and the thick
  haunches end in thick lower legs and large feet with black pads under them and four black
  claws at the front. The sculpt holds the legs of the chair, of the bench, and of the standing
  stance, with 2,528 triangles in each.
- The bear on the podium has the recipe of the bears (`tools/blender/bear.py`) on its own
  skeleton (4.3): a tall pear that stands on short thick legs, as the bear of
  `orchestra-latest.png` from behind. Its round head is 1.0 wide at the skull, with round ears
  (radius 0.12) on its top corners, small black eyes 30° out from the front, and a short muzzle
  of the accent color with a dark brown nose. Its nape is a fold under the back of the head, as
  in the reference. The body is 1.44 wide at the belly and 1.56 at the seat, the arms are soft
  capsules 0.52 to 0.36 thick with round paws and no claws, and the feet have dark brown pads.
  It has 2,276 triangles in each stance.
- The panda has the recipe of the bears (`tools/blender/panda.py`) on the default skeleton,
  because its heights in `orchestra-side.png` are within 10% of ours (4.3). It follows the
  pandas of `orchestra-latest.png`: a white round head 0.88 wide at the skull, black round ears
  (radius 0.13), black eye patches of 0.22 × 0.42 on the head surface around the eyes, turned
  25° so that their lower ends point down and out, small black eyes that stand out of the
  patches, and a short white muzzle with a dark nose. A black band goes over the shoulders and
  the upper back from the chin down to 0.75 above the seat at the front and 0.7 at the back. It
  joins the black arms and paws, and a white front of the chest 0.6 wide stays between the
  arms, above the white belly. The legs and the feet are black. Plane cuts give the straight
  borders of the band and of the white front. The upper back is shallow, so that the panda sits
  0.04 m forward on its chair (`chairForward()`), and the stage sides keep their places. It has
  2,486 triangles on the chair.
- Each player is one `SkinnedMesh`. The generator merges the body, the instrument, and the bow
  into one mesh. Each vertex follows one or two bones (4.7). A rigid part follows one bone. A
  skinned part can blend a parent bone and its child bone at a joint.
- This gives one draw call for each player (4.5, materials), plus the shadow pass. One
  `Mesh` for each part would give about 25 draw calls for each animal, which is too many for an
  integrated GPU.
- The static props (the stage, the chairs, the stands, and the podium) merge into a few meshes.
- The body has one module for each area: `models/trunk.ts` (the torso, the neck, and the head
  with the eyes, the ears, the snout, and the face pattern), `models/tails.ts`,
  `models/arms.ts`, and `models/legs.ts`. `buildBiped()` (`models/biped.ts`) calls them in this
  order, so the order of the parts in the mesh stays the same. The areas read their shared
  values from `models/body-frame.ts`: the stance, the head height `H`, the girth, the joints
  where the limbs meet the trunk, and the overlap of the shoulder dome and the torso (4.7). The
  frame holds the skeleton of the species (`BodyProportions` of `models/proportions.ts`, 4.3),
  and each area reads its lengths and heights from it.
- The rig JSON of the Blender build (`tools/sculpt-rig.ts`) carries the skeleton of the species,
  so that a recipe can read the heights of the torso from it.

## 4.5 Visual values

The colors come from samples of the reference image. The image shows lit and shaded colors, so
each base color below is a little lighter than its darkest sample. Tune the light first, until a
screenshot of the default view looks like the reference. Change a base color only when a
measurement shows that no light value can match the reference.

The review of step 3 made one such change. The darkest areas of the reference are the most
saturated (0.46 to 0.49), so the dark sample `#7a5646` gave the stage top too much saturation. No
light color and no tone mapping brought the lit top below 0.44, against 0.25 to 0.34 in the
reference. The stage top `#7a6359` with the spotlight `#fff6ec` gives 0.38 to 0.40.

The polished images made a second change. In `mockup.png`, the lit head of the bear has 0.60 of
the red, 0.64 of the green, and 0.70 of the blue of a lit fox (sRGB, means of small areas). The
first bear fur `#5a3c32` had 0.38 of the red of the fox fur `#f0934c`, and a light change moves
both species the same way. The bear fur `#93603a` had the ratios of the image: a mid warm brown.
The belly and the muzzle follow it.

The light of 2026-10-07 made a third change (`docs/decisions/2026-10-07-cast-colors.md`). Under
the key light `#ffca98`, the back of the bear had a value of 79 against 37 in `mockup.png`, and
its lit head 135 against 87. The fur `#533621` gives 40 and 88. The fox fur darkens by the same
factor, so the ratios of the second change stay near.

The model sheet `fox-views.png` made a fourth change (`docs/research/2026-10-08-fox-look.md`).
On the views page, the red fox fur `#915125` gave a lit value of 94 with a saturation of 0.85,
against 160 and 0.66 in the sheet, and its white a lavender hue of 280. The fur `#ac6236`, the
belly `#eee2e0`, and the accent `#603a2a` give 113 with a hue of 24 for the fur, 204 with a hue
of 19 for the white, and 49 for the hands on the views page. In the default view, the lit head
has 143 with a hue of 19, against 104 to 153 with a hue of 17 to 22 for the foxes of
`orchestra-latest.png`. The lighter fur `#b5602d` gave the lit head 152 and the side 108 (75 to 90
in the image), so no fur color gives the value of the sheet on the views page and keeps the
default view in its range.

The wolves of the scenes made a fifth change (`docs/research/2026-10-08-dog-family.md`). In the
default view, the wolf fur `#645e6f` gave the lit head a value of 138 to 154 with a hue of 19 and
a saturation of 0.39 to 0.40, against 121 to 162, a hue of 16, and 0.19 to 0.30 for the wolves of
`orchestra-side.png` and `orchestra-latest.png`. The warm key light adds the saturation. The
bluer fur `#585e7c` gives 123 to 137 with a hue of 17 and a saturation of 0.25.

The golden retriever of `dog-views.png` and the dogs of `orchestra-latest.png` made a sixth change
(`docs/research/2026-10-08-dog-family.md`). The dog was a gray beagle with a brown cap and brown
ears (`#bcb1c0`, `#c9bfd0`, `#44270f`). It is golden now, with one color on the whole body and a
black nose. In the default view, the fur `#f2d08e` gives the lit head a value of 236 with a hue
of 35 and a saturation of 0.55, as the sheet (235 to 250, a hue of 34, 0.53 to 0.59). The dogs of
`orchestra-latest.png` are paler (241 to 244, a hue of 34 to 38, 0.39 to 0.46). The fur `#d29a52`
gave 147 to 222 with a hue of 23 and a saturation of 0.67 to 0.74.

The cats of `orchestra-side.png` and `orchestra-latest.png` made a seventh change. They are plain
gray with no stripes, with pink inner ears and a pink nose. Their lit heads have a value of 124 to
142 with a hue of 17 to 20 and a saturation of 0.17 to 0.22. The fur `#75707a` gave 127 with a
saturation of 0.40 in the default view, and the bluer fur `#747a98` gives 126 with a hue of 22
and a saturation of 0.24. The accent `#d9928c` colors the inner ears and the nose, in place of
the forehead stripes `#4e4b54`.

One world unit is one meter.

**Scene colors**

| Item | Color | Note |
|---|---|---|
| Background | `#0b0807` | The clear color behind the hall. The hall covers almost all of the view. The CSS gradient of the page (`radial-gradient(ellipse at 50% 45%, #201c19, #0b0908 75%)`) shows only before the first frame. |
| Hall | wall `#30241c`, panel `#281e17`, balcony `#3c2c21`, gilded edge `#8c6c4a`, underside `#120d0a` | Baked light (hall, below). |
| Hall lamps | linear (9, 5.2, 2.4), glow linear (0.45, 0.2, 0.075) | The lamp bodies are above 1, so that the bloom takes them. A soft glow disc around each lamp (hall, below). |
| Hall floor | far `#100b08`, at the stage edge `#3a2416` | Baked spill of the stage light (hall, below). |
| Spotlight | `#ffca98` | Warm orange. `#ffc3a0` until 2026-10-07: under the light of 2026-10-07, the stage had a hue of 17 to 20 against 22 to 25 in `mockup.png`. In `mockup.png`, the white rabbits show a hue of about 20 and a saturation of 0.3 to 0.4. The color `#fff6ec` of `orchestra.webp` gave the yellow hue 34. |
| Visible beam | `#ffcf9e` | Haze in the cone (below). `#ffd9b0` until 2026-10-07: with the stronger beam, it read gray (a saturation of 0.15 to 0.25 against 0.40 in `mockup.png`). |
| Stage planks | `#3b2618` | Dark walnut. Each plank is up to 20% lighter or darker. Lines between the planks `#301c0f`. The key light of 2026-10-07 lights the players to the values of `mockup.png` (white fur up to 170 to 220), and the first planks `#76523a` were then 150 to 206 in the pool against 110 to 133. The planks `#4b3220` gave the wood at the front of the stage a median of 81 against 65 in `mockup.png`, also with the fall-off of the light behind the podium (key light, below). The planks of the scene details have 0.62 of that color in linear values, and give 67. |
| Stage edge | `#5e3c24` | The raised lip around the top, as the edge of `orchestra-latest.png`. It gets a baked light of 0.25 of its base color (`SIDE_GLOW` in `scene/stage.ts`) on its outer face, its top, and its inner bevel: the parts within 0.1 m of the outline. Until 2026-10-07, a chamfer of 0.04 in `#8c5a36` ran around the top edge. On the top of the lip, which faces up into the key light, that color gave a bright orange line around the stage, and the lip of `orchestra-latest.png` is only a little lighter than the planks. |
| Stage skirt | `#3c2416`, grooves `#26160d` | The four sides of the stage: panels of 0.5 m with grooves of 0.03 m. A baked light of 0.8 of the base color stands for the light of the lit floor, and it falls by 0.6 from 0.2 of the half side to the corners. With no baked light, the skirt had a value of 4 against 33 in `mockup.png`. |
| Riser treads | `#553620`, edge `#7b5335` | The boards and the front edge of each tread of the choir risers, a little lighter than the stage planks, as the risers of `orchestra-side.png`. The risers stand at the back, outside the pool of the stage lights (light and render, below), and the plank color made a dark wall there. |
| Podium | `#6c4429`, side panels `#58371f`, top plate `#80532f`, top panel `#73492a` | A wooden box with cut corners under a lighter top plate of 0.04 m, as the podium of `orchestra-latest.png` and `orchestra-side.png`. A darker panel sits inside a frame of the body color on each of the four main sides. The top has a frame of the plate color, a dark groove of the plank lines (`#301c0f`), and a panel inside them. |
| Chairs | `#cdb27a` | Pale yellow wood. |
| Music stands | `#1e1a16` | The post and the legs. The two large faces of the desk are `#544840`, a warm gray, and its four narrow faces `#a08b7a`, a lighter edge. The conductor stand has the same desk. Sheet music `#ece6d6`. With a black desk, two to four stands were the largest shapes of some close shots and cut the image (UX audit 2026-10-05, SC9). The first proposal `#2e2722` still looked black in the shade of the desk back. |

**Species colors**

| Species | Size | Fur | Belly and face | Accent |
|---|---|---|---|---|
| rabbit | 1.0 | `#ece6ff` | `#f4f0ff` | inner ears and nose `#e9a7a5` |
| fox, violins | 1.0 | `#ac6236` | `#eee2e0` | lower legs, feet, and hands `#603a2a` |
| fox, flutes | 1.0 | `#997657` | `#eee4e4` | ears, lower legs, feet, and hands `#755035` |
| wolf | 0.95 | `#585e7c` | `#ece8ff` | inner ears `#4a4450` |
| elephant | 1.35 | `#75708c` | `#85809a` | inner ears `#887884` |
| bear (conductor) | 1.35 | `#533621` | `#583c27` | muzzle `#735d4b` |
| cat | 0.95 | `#747a98` | `#e4dff4` | inner ears and nose `#d9928c` |
| hippo | 1.35 | `#77709d` | `#9890b8` | nose and inner ears `#575073` |
| deer | 1.1 | `#a8774c` | `#e5d3b8` | nose and feet `#3a2a20` |
| panda | 1.2 | `#e2dcee` | `#e2dcee` | patches `#46434c` |
| mouse | 0.75 | `#9a8b7e` | `#c9bcae` | inner ears `#d6a59a` |
| beaver | 0.95 | `#6a4630` | `#8c6a52` | tail `#3e2e26` |
| dog | 1.05 | `#f2d08e` | `#f8e8c0` | nose `#1d1a19` |
| monkey | 0.95 | `#8a5a3a` | `#d9b892` | hands and feet `#5a3a26` |
| pig | 1.05 | `#d99a8e` | `#e6b2a8` | snout `#c98276` |
| rhino | 1.35 | `#8e8a84` | `#a6a29b` | horn `#cfc6b5` |
| badger | 0.95 | `#7d7a76` | `#e6e1d8` | face stripes `#24211e` |
| meerkat | 0.85 | `#b99a6e` | `#d8c3a0` | eye patches and ears `#2a1f17` |
| penguin | 0.9 | `#1f1d1c` | `#ece8e0` | beak and feet `#d98a3a` |
| polar bear | 1.1 | `#f4e9dd` | `#e8dccb` | nose `#1a1715` |

All species have eyes `#15110e` with a light `#f6f2ea`, and a nose `#2a1d15`, unless their accent
parts include the nose. An iris color of the species (`eyes.iris`, 4.3) makes the eye a ring of
that color around a pupil of `#15110e`: amber for the cat, the tan fox, and the wolf, brown for
the red fox, and dark brown for the rabbit.
The front teeth of the beaver are `#f1ead9`.
The inside of an ear has the belly color, unless the accent parts include the inner ears or the
ears.

The accent color goes to these parts. The face pattern of 4.3 is also in the accent color, except
the middle stripe of `stripe` (the badger) and `face-disc` (the monkey), which have the belly
color. The antlers of the deer also have the belly color.

```typescript
type AccentPart = 'inner-ears' | 'ears' | 'nose' | 'snout' | 'horn' | 'beak' | 'arms' | 'hands'
  | 'legs' | 'lower-legs' | 'feet' | 'tail' | 'face-pattern';
```

Accent arms color the upper arms, the forearms, and a band over the shoulders: the back and the
sides of the torso above 0.9 H. Accent legs color the thighs, the knees, and the shins. Accent lower
legs color the leg from the knee down, as the dark legs and hands of the foxes of
`lowpoly-animals.png` and `orchestra-latest.png`: the foxes have accent lower legs, feet, and hands.
Before, only the sock below 0.45 of the shin had the color of their feet. The panda has accent arms
and legs, as the black arms, shoulders, and legs of the pandas in the polished images. The first
panda had white arms and legs with black hands and feet.

| Species | Accent parts | Species | Accent parts |
|---|---|---|---|
| rabbit | inner-ears, nose | cat | inner-ears, nose |
| fox, violins | lower-legs, feet, hands | hippo | nose, inner-ears |
| fox, flutes | ears, lower-legs, feet, hands | deer | nose, feet |
| wolf | inner-ears | panda | face-pattern, ears, arms, hands, legs, feet |
| elephant | inner-ears | mouse | inner-ears |
| bear | snout | beaver | tail |
| dog | nose | monkey | hands, feet |
| pig | snout | rhino | horn |
| badger | face-pattern | meerkat | face-pattern, ears |
| penguin | beak, feet | polar bear | nose |

**Instrument colors**

| Instrument | Colors |
|---|---|
| Violin, viola | arched top and scroll `#b0562c`, edges, ribs, and neck `#7a3a20`, f-holes, pegs, fingerboard, tailpiece, and chin rest `#1b1714`, bridge `#e3c99a`, bow stick `#3b2a20`, bow hair `#e8e2d4`, strings `#9a9080` (one strip of 0.008 m at the model size, so that the strings show no light bar). All wood has the `varnish` finish. The first violin was one flat slab of `#9c5a43` |
| Cello, contrabass | arched top and scroll `#b8622e`, edges, ribs, and neck `#7e3f1f`, the same dark parts, bridge, and bow. The first wood was `#a8643e` |
| Flute, piccolo | metal `#c9c6bf` |
| Clarinet | `#1f1b19` with the `lacquer` finish, with silver rings and keys `#c9c6bf`, as the black clarinet of the wolf in `mockup.png`. The first clarinet of `animals.webp` was `#d6d1c6` with dark rings `#3a3530` |
| Oboe | `#2a2522` with metal keys `#c9c6bf` |
| Bassoon | `#7a4a2e`, with a metal bocal `#c9c6bf` |
| Horn, trumpet, trombone, tuba | metal `#dcb052` (`#c9a14a` before the polished images). Each bell is open: its rim turns back into the bell, so that the opening shows the lit inside of the flare, as the bells of the polished images. The tubes have 6 sides and the bells 12. The first bells had a flat cap of 8 sides |
| Timpani | copper kettles `#c27a44` with a silver hoop `#c9c6bf` of 0.035 m at the top, heads `#efe9dc`, three legs `#1e1a16`. Each kettle is a deep round bowl of 16 faces on its legs, as the timpani of `scene.png` (08). Its radius is cos(π/8) / cos(π/16) of the radius of the first bowl of 8 faces, so that it keeps its box. The first kettles were cones of `#b0703f` on a stem |
| Drums | shells `#8a2f2a`, heads `#efe9dc` |
| Stands of the drums and the tambourine, cymbal straps | `#1e1a16`, the color of the music stands |
| Tambourine | shell `#8a2f2a`, head `#efe9dc`, jingles `#c9c6bf` |
| Xylophone | bars `#b07a45`, frame `#3a2a22` |
| Mallets, sticks, and beaters | sticks `#cdb27a`. Felt balls of the timpani mallets and of the bass drum beater `#efe9dc`, balls of the xylophone mallets `#8a2f2a`, and the triangle beater `#c9c6bf` |
| Cymbals, triangle | metal `#dcb052`, metal `#c9c6bf` |
| Piano | case `#15120f` with the `lacquer` finish (the rim, the lid, the prop, the desk, the legs, and the bench), white keys `#f2eee6`, black keys `#15120f`, and sheet music `#ece6d6` on the desk, as the piano of `scene.png` (08). The open case shows a dark well, as the piano of `mockup.png` (`PIANO_INSIDE` in `models/instruments/piano.ts`): the rim wall is 0.08 of the rim outline thick, the soundboard `#5a3c22` lies 0.14 below the top of the rim, a dark gold iron plate `#6b5226` with the `metal` finish lies across the front 0.22 of the well, 0.08 below the top, and 16 strings `#a89064` of 0.016 run 0.06 below the top from the plate to the rim wall at the tail. Until 2026-10-07, a gold plate `#b8913f` lay on the top of the rim, and it read as a flat gold tray: a value of 80 with a saturation of 0.75 in the default view, against 40 in `mockup.png` (review of 2026-10-07, gap 10). Strings of 0.008 gave a pattern of dots in the default view |
| Harp | frame `#b07a45`, strings `#e8e2d4` |
| Baton | `#ece6d6` |
| Choir folder | `#2a2522`, with pages `#ece6d6` (the sheet music) |

**Materials**

- All meshes share one `MeshStandardMaterial` with vertex colors and crease normals
  (`models/shading.ts`). The corners at one point weld into one vertex, also across two bones,
  so that the seam of the torso between `spine` and `chest` stays smooth. A corner gets the mean
  normal of the faces at its vertex that turn from its own face by at most the crease angle of
  its finish. Each face counts with the angle of its corner. The geometry calculates the normals
  one time for each model. The first material had `flatShading: true`, and the small equal
  facets of the polished cast made each round part look like a golf ball under the spotlight
  (user report of 2026-10-06).
- The crease angle is 60° for each finish except `fur`. The faces of a head turn by up to 53° at
  the crown, and the faces of the round balls of the hands and the puff tails by 36° to 60°. A
  crease of 35° kept a hard line around the crown of each head.
- The fur has the crease angle 0°: each face of the fur keeps its own normal, so the bodies
  show clean flat facets with crisp edges, as the animals of `lowpoly-animals.png`
  (`docs/research/2026-10-07-animal-anatomy-plan.md`, 4.2). A face that the cut of a color
  border splits (4.3) keeps one normal on both pieces, so the cut does not show in the shading.
  From the facet look to stage L2 of 2026-10-07, the fur had 10°, and each welded vertex moved
  by up to 0.02 H for the face normals only (`FUR_JITTER`, now removed), for the uneven facets of
  `mockup.png`. The jitter made the faces mottled, with changes of the shade and no form behind
  them, and it moved each corner of a cut off the plane of its face. The golf ball look of the
  flat shading of 2026-10-06 came from the small equal facets of the grid of 16 sides. The grid
  of 12 sides has larger facets, and the play view shows no golf ball. The fur of 60° looked
  like soft plastic. The ends of the limbs, the soles, the boxes, and the plates turn by 70° to
  90°, so they keep their hard edges in the other finishes. The 6 sides of a tube of a brass
  instrument turn by 60°, so the tubes look round.
- The stage keeps flat shading in its own material (`scene/stage.ts`), because its planks are
  flat boxes.
- The vertex colors of a player hold a baked ambient occlusion (`shadeMesh()` in
  `models/shading.ts`), so that the folds stay dark in the light of the hall: the neck under the
  head, the hips above the thighs, and the knees. Each triangle within 0.12 m of a vertex counts
  as a disc. The triangles of one grid cell of 0.06 m, one main bone (4.7), and one main
  direction merge into one disc. A disc in front of the vertex that turns its front to the vertex hides
  `A cos θv cos θd / (π d² + A)` of its sky. The light of the vertex is `1 - 4.5 × sum`, and
  at least 0.4. A convex part does not shade itself. With the factor 3, the folds were hard to
  see in the back view of the orchestra.
- The bones of the body shade each other. An arm and a piece in a hand (the bow, a mallet, the
  baton, and the trombone slide) shade only their parent and their children, because a raised
  arm leaves the side of the torso: an occlusion of the bind pose would stay there as a dark
  stripe. The props and the stage get no occlusion. A filler (`MeshData.fillers`), a rigid ball
  inside the skin of a joint (4.7), shades nothing, because the skin hides it in the bind pose.
- The neck band is the set of triangles with a corner on `neck`: the bands of the trunk grid
  from the top ring of the torso to the jaw ring of the head (Neck, below). At each vertex of
  the band, `shadeMesh()` turns each normal that points down to the horizontal, and keeps its
  direction around the vertical. The occlusion leaves at least 0.6 of the light there
  (`NECK_BAND`). The head is 1.0 to 1.32 wide and the neck ring 0.72, so the faces of the band
  point down by up to 56°, and the head left 0.4 of the light on the throat. In the default view,
  the nape of the conductor had a luma of 17 against 37 on its back, and each rabbit had a dark
  collar under the chin (92 against 160 on its chest). Now the nape has 31 and the collar 123,
  so the neck reads as a soft continuation of the head and the chest, as in `mockup.png`. A
  deeper back of the top ring of the torso only moved the dark faces down to the shoulders, and
  a wider neck ring made the throat darker in the close views.
- The material has no fur shading. The user decided on 2026-10-07: no fur for now. A soft edge
  of the fur (`FUR_SHEEN`, 2026-10-06) was to multiply the diffuse light near the outline of each
  part, but its code tested `USE_SKINNING`, which three.js defines only in the vertex shader. Thus
  the edge never reached a pixel, and its removal changed no image (the art direction spec of
  2026-10-06, 3.1).
- The normals and the occlusion of the 22 player models of `perf-60.mid` take 0.18 and 0.44 of
  the time of `buildPlayer()` for the same models in one run in Node (14 ms and 35 ms against
  78 ms, at a load average of 79 on the development Mac). Each kind of player gets its
  geometry one time for each scene (`createPlayers()`).
- Each triangle has a finish (`Finish` in `models/mesh.ts`). The `uv` of its vertices points at
  the texel of its finish in a table of one texel for each finish. The table is the roughness
  map (green) and the metalness map (blue) of the material. Its red channel is not read. Thus
  each player mesh costs one draw call, and each part gets its own roughness and metalness.

| Finish | Roughness | Metalness | Crease | Parts |
|---|---|---|---|---|
| `matte` | 0.85 | 0 | 60° | Cloth, raw wood, the stage and the props. On a body: the noses, the inner ears, the teeth, the tusks, the antlers, the horn, and the beak. |
| `varnish` | 0.38 | 0 | 60° | The varnished wood of the bowed strings. |
| `lacquer` | 0.22 | 0 | 60° | The black lacquer of the piano. |
| `metal` | 0.3 | 0.35 | 60° | Brass, copper, and silver. The environment map of the hall is dark (light and render), so a higher metalness makes metal look black. The first metal group had 0.4 and 0.3. A smaller roughness gives the brass and the copper the sharper highlights of the polished images. |
| `fur` | 0.85 | 0 | 0° | The fur of the bodies: the trunk grid, the muzzles, the elephant trunk, the outer ears, the face patterns, the arms, the hands, the legs, the feet, and the tails. |

**Light and render**

The values of this block come from samples of `mockup.png` and of `scene.png` (1), against
screenshots of the frontal default view of 2026-10-06 at 1280 × 720. The decision file
[`2026-10-06-polished-look.md`](../decisions/2026-10-06-polished-look.md) gives the samples.

- One `SpotLight` as the key light (`KEY_LIGHT` in `scene/lights.ts`), `#ffca98`, behind the
  orchestra at `(0, 1.2, -0.7) × S`, where `S` is the stage side. It aims at 0.5 of the way
  from the stage center to the podium center, or at the stage center with no podium. A solo
  turns it to the soloed players (the solo light, below). Angle 34°,
  penumbra 1: three.js dims the light from the axis to the edge of the cone. The stage sides and
  the back corners stay dark, as in `mockup.png`. The shadows fall to the front and fan out to
  the left and the right, as the shadows of the chairs in `mockup.png`, and the gloss of the
  light on the planks lies on both sides of the podium. It is the only light that casts shadows.
  Until the spotlight pool of 2026-10-07, the key stood 0.15 S right of the axis. Its gloss lay
  right of the podium only (wood of 104 left and 149 right of the podium, against 152 and 138 in
  `mockup.png`), and all shadows fell to the front left. The shadow map size and filter follow the tier (2.6). Until 2026-10-07, the key
  stood above the stage center (angle 29°, aim 0.35). Its shadows were short and lay under the
  chairs, so the stage looked even (scene polish of 2026-10-07). The values of `orchestra.webp`
  (45° and penumbra 0.5) lit the full stage evenly.
- The shadow camera holds each point of the stage that the cone lights, from the stage top up to
  3 m (`keyShadowFrustum()`): its half angle is the angle of the farthest stage corner, at most
  the cone angle, plus 3°. The near and the far planes hold the corners with 0.5 m to spare. The
  depth bias is -0.0005. The normal bias moves each receiver along its normal past the blur disc
  of its tier: the size of one texel at the aim point, `2 × d × tan(half angle) / map size` for
  the distance `d` from the light to the aim point, times the blur radius plus 2. For
  `S = 11.19`, this gives 6.2 cm on the high tier, 7.5 cm on the medium tier, and 15 cm on the
  low tier. The first normal bias of 0.01 m showed a cross-hatch pattern on the lit faces in
  close shots, for example on the cello body (UX audit 2026-10-05, SC5). The contact shadows
  under the chairs and the feet stay attached.
- The soft shadow edge takes 12 samples of a Vogel disc with no turn (`scene/shadow-chunk.ts`).
  three.js r186 takes 5 samples, turned for each pixel by a noise, and the noise showed as a
  dither on the lit faces of close shots (UX audit 2026-10-06, SC5). The patch changes the shader
  chunk of three.js one time, before the first material compiles, and fails when the chunk
  changes in an update of three.js.
- The intensity of the key light is `9 × d²` candela, so its aim point gets 9 lux on a face that
  looks at the light, on each stage size. The scene polish of 2026-10-07 gives the samples of the
  default view.
- One `HemisphereLight` as fill: sky `#302a26`, ground `#2c241e`, intensity 5. It is low and
  nearly neutral, so that the shadows stay deep. A warm fill made the shadows red.
- Two soft `SpotLight`s as side lights (`SIDE_LIGHT`, `#ffd2a0`): at `(±1.1, 0.7, 0.7) × S`,
  high at the front corners of the hall. Each one crosses the stage and aims at the middle of
  the section on the other side, `(∓0.3, 0, 0.1) × S`: angle 28°, penumbra 0.8, 2.1 lux at the
  aim point, no shadow. The players of a section face the conductor, so the side light from the
  other side lights their fronts. The back of the bear gets the light at a low angle and stays
  a darker brown. The key light from behind draws the warm edges on the heads and the shoulders.
  Until 2026-10-07, a rim light behind the orchestra and a front light above the audience had
  these two places. The front light lit the back of the bear to a value of 71 to 113 against 37
  in `mockup.png` when the players had the light of the image.
- Each light costs GPU time on each lit pixel. A separate pool light cost about 0.4 ms on the
  development Mac at 2880 × 1800, so the stage lights get the pool from a factor in the shader.
- The pool of the stage lights (`LIGHT_POOL` and `poolFactor()` in `scene/light-pool.ts`): each
  `SpotLight` gives a place of the stage the factor `0.4 + 0.6 × exp(-(dx² + dz²))`, with `dx` the
  distance across the stage from the pool center in units of `0.6 × S`, and `dz` the distance
  along the stage in units of `0.42 × S`. The pool center lies at 0.5 of the way from the stage
  center to the podium center, or at the stage center with no podium. The aim of the stage lights
  (`LightAim` in `scene/light-pool.ts`) holds the pool center and its radii, the floor 0.4, the
  center, the radii, and the boost of the hot spot, and the foot of the beam. A solo changes it
  (the solo light, below). The key light also gets a
  hot spot on the podium: `1 + 0.7 × exp(-(px² + pz²))` (`spotFactor()`), with `px` the distance
  across the stage from the podium center in units of `0.4 × S`, and `pz` the distance along the
  stage in units of `0.2 × S`. Until the wider pool of 2026-10-07, the hot spot had a radius of
  2 m on each axis. The fill light and the reflections keep their light. A patch of the light
  chunk of three.js multiplies each spotlight by the factor at the world position of the pixel,
  in the material of the players and the props and in the material of the stage. The gallery
  pages have no pool. The patch fails when the chunk changes in an update of three.js.
- In `mockup.png`, the light is a pool on the conductor and the middle of the orchestra: the
  lit wood falls from 162 to 177 beside the podium to 39 and 53 at the side edges of the stage
  (0.24 and 0.33), and the players at the sides have 0.8 to 0.9 of the value of the players near
  the middle. Before the pool, the side lights lit the players at the sides as brightly as the
  players in the middle, and the key light lit the back row more brightly: the dogs at the right
  had a 90th percentile of 192 to 200 against 122 to 154, and the pandas in the back 230 against
  170. With the pool, the dogs have 175 to 198, the pandas 183, and the lit wood at the side
  edges 0.18 and 0.26 of the wood beside the podium. The spotlight pool of 2026-10-07 gives the
  samples.
- In `orchestra-latest.png`, the warm pool on the stage covers the conductor and most of the
  orchestra, and falls off only at the side edges and the front corners (user request of
  2026-10-07: "the bottom of the initial spotlight should be wider"). In the default view, the
  gloss of the key light gives most of the light of the planks, so the rough finish of the stage
  wood (materials, above) and the wide hot spot set the width of the pool. On the first screen of
  the default demo, the lit wood keeps 0.85 of its peak at 0.55 of the way from the podium to a
  side edge, and 0.37 to 0.49 at the edges (`orchestra-latest.png` about 0.75, and 0.32 to 0.44).
  The narrow pool before had 0.48 to 0.50, and 0.19 to 0.24. The decision file
  [`2026-10-07-spotlight.md`](../decisions/2026-10-07-spotlight.md) gives the samples.
- The pool of the stage lights (above) makes the stage behind the orchestra dark, as in
  `mockup.png`. From the scene details of 2026-10-07 until the spotlight pool of the same day,
  the direct diffuse light of the wood alone also fell off behind the podium, by
  `0.22 + 0.78 × exp(-t²)`, with `t` the distance behind the podium center in units of
  `0.55 × S`. Under the pool, that fall-off kept the median of the wood among the strings at 68
  against 76 in `mockup.png`, and it did not change the back of the stage (13 to 58 against 17
  to 53). Without it, the wood among the strings has 76.
- One weak `SpotLight` lights the face of the conductor. It stands 3.2 m in front of the bear,
  toward the orchestra, and 2.4 m above its face, which is 1.2 m above the podium top. It aims at
  the face: angle 16°, penumbra 0.6, decay 2, no shadow. Its intensity gives 3 lux at the face.
  The first stage spotlight came from about 74° above the bear, and the fur of the bear is dark,
  so in the conductor shot the face was dark brown on dark gray (UX audit 2026-10-05, FI1). With
  1.2 lux, the face stayed darker than the players. Choice F of the camera report kept the dim
  face. The audit reversed it.
- The visible beam (`scene/beam.ts`) is haze inside the cone of `models/beam.ts`: from the light
  to the circle of radius `0.75 × S` on the stage. The haze fills a narrower cone with the same
  apex, the haze cone: its radius is `0.25 × S` at the stage top and the radius of the light cone
  at the light (`hazeRadius()`). Haze in the full cone veiled the full orchestra in the frontal
  default view. The mesh is a lathe of the haze cone from 5 cm below the stage top up to the
  light, with a flat bottom, additive blending, no depth write, and no shadows. Its shader finds
  the length of each view ray in the haze cone with a quadratic, and takes 4, 3, or 2 samples of
  the density along it (high, medium, and low tier, 2.6). A ray leaves the cone at the first root
  after its entry and below the light. A ray that is steeper than the wall of the cone ends on
  the stage top, so a camera above the light also sees the beam. A change of the tier also
  changes the samples and the motes of the current beam. The density fades from the axis to the
  outline (from 0.5 of the radius), fades in over the first tenth below the light, and grows with
  the concentration of the light where the haze cone is narrow, as `(0.25 × S / radius)^0.8`, at
  most 3 times. A tiling value noise of 32 texels on each side drifts slowly through the haze,
  and changes the density by up to 40%. A camera inside the haze cone draws the back faces with
  no depth test, so a close shot also shows the beam. The color is `#ffcf9e`, and the strength
  is 4.0 (a view ray of `S` through the axis at full density scatters a linear light of 1.4).
- Until 2026-10-07, the haze filled a column of `0.3 × S` up to the height where the cone is
  narrower, with a strength of 2.0, a full density only at the light, and a concentration of at
  most 6 times. In the default view, the beam was not visible: the top of the frame sees the beam
  at 0.41 of the light height, where the density was 0.4, and the beam added a value of 4 to the
  hall behind it, against a shaft of 101 on a wall of 19 in `mockup.png`. The scene polish of
  2026-10-07 gives the samples.
- The beam reaches the stage and keeps the players clear (user reports of 2026-10-06). The
  density is 0.04 of the full density from the stage top up to 0.12 of the light height, and
  grows with a smoothstep to the full density at 0.45 of the light height. The concentration of
  the light makes the beam brighter above that. Thus the beam is brightest at the top, the
  default view shows a bright shaft at the top of the frame that fades out above the players,
  and the beam fades toward the stage with no edge, as in `mockup.png`. A depth pass renders the depth of the scene before the scene pass, at
  the size of the drawing buffer, with the light effects and the hall hidden (`BeamDepth`). The
  haze reads it, and three rules use it:
  - Each view ray ends on the scene.
  - A sample of the haze counts `smoothstep(0, 0.15 × S, g)`, with `g` the gap to the surface
    behind it, so the beam meets the stage softly.
  - An item on the stage gets no haze: a surface inside the stage square (with a fade over 0.3 m
    at each edge), from 0.03 to 0.2 m above the stage top up to 3 m, with a fade out to 4 m. The
    items are the players, the instruments, the stands, the chairs, and the risers. The highest
    head of the demos, with the ears, is 2.54 m. The stage top, the hall, and the air keep the
    haze, so the beam shows behind and between the players down to the stage.
- The measure of the beam compares each view with the same frame with no beam. On the players,
  the beam adds a mean value of 0.4 or less (of 255) in the default views, the high views, and
  the close shots, and 1.1 in the top view of Free mode. It takes 0.6% or less of their local
  contrast in these views, and 1.4% in the top view. The light of the beam alone falls with no
  step from the top of the frame to the stage: in the high view of the user report, from about
  120 to 12 at the stage top. A depth at half size gave a jagged edge of haze around each player.
  The first box rule of 2026-10-06 left the players clear, but the haze ended in the air with a
  flat bottom, far above the stage.
- The depth pass does not count as a frame of the renderer, and the scene pass after it skips the
  update of the world matrices. Thus the skeletons, the geometries, and the matrices update once
  in each frame. On the development Mac at 1440 × 900 at the device scale 2 with `perf-60.mid`,
  the frame took 2.45 to 2.53 ms with no beam, 2.53 to 2.60 ms with the box rule, and 2.90 to
  2.96 ms with the depth pass (CPU and GPU, with a sync after 60 frames). The depth pass costs
  about 0.25 ms of CPU time.
- Dust motes drift in the haze cone as points, from the stage top up: 140 on the high tier, 70
  on the medium tier, and none on the low tier. 350 bright motes read as a field of stars. Each
  mote has a size of 3 cm and a light of 1.0 at the axis, and twinkles slowly by 25%. The motes
  fade toward the stage with the square of the fade of the haze, and they fade in front of a
  surface and of an item as the haze does. With reduced motion, the noise, the motes, and the
  grain stand still (2.5).
- The camera multiplies the opacity of the beam by a factor (a manager decision of 2026-10-05).
  A close camera outside the cone sees the additive beam over the full image, and at the full
  opacity the close shots looked washed out. The factor is 1 in a wide or a high shot, and 0.15
  in a conductor, a section, or a solo shot (5.6). In Free mode, it follows the distance from the
  camera to the stage center: 0.15 at 0.45 of the default distance and nearer, 1 at 0.5 and
  farther, with a smoothstep between. Thus the wide shots (0.51 or more, camera below) and the
  high shots keep the full beam, and a user who orbits near the stage also gets a clear image.
  The end of the fade was 0.55 before the nearer default view of 2026-10-06. The close shots of
  the demos stand at 0.43 of the default distance or nearer: the farthest is a section shot of
  Eine kleine Nachtmusik on its small stage. With the first value 0.4, a change from Cinematic to
  Free mode in that shot changed the factor from 0.15 to 0.22. The factor 0.15 keeps a
  hint of the light. Since the sight lines of 5.6 (UX audit 2026-10-05, SC1), the planner keeps
  each close camera nearer than 0.44 of the default distance to the stage center. A section
  camera of that demo on the audience side stood at 0.46.
- The solo light (`soloAim()` in `scene/solo-light.ts`, user request of 2026-10-07): when the
  user solos one or more seats (2.4, 6.6), the key light, its pool, its hot spot, and the visible
  beam move to the players of these seats, and they move back when no seat is soloed. The pool and
  the hot spot center on the middle of the box of the places of the soloed players. Their radii
  cover the box: on each axis, 1.6 times the half size of the box plus 0.8 m, at least 1.6 m, and
  at most the radius of the pool with no solo. Thus a player at the edge of the box on one axis
  keeps 0.8 or more of the light of the pool. The hot spot gets the boost 0.7, also on a stage
  with no podium, and the floor of the pool falls from 0.4 to 0.25, so the other players step
  back. A seat with no players moves no light. The aim comes from the solo flags and the layout
  alone. A seek, a pause, a mute, or a new section size keeps it, and the scene gets the flags in
  each frame (`StageScene.solo()`).
- The key light turns to the center of the aim (`aimKeyLight()`) and keeps its place and its
  intensity, as a spotlight on a stand that turns. Its shadow camera follows the aim. The visible
  beam leans from the light above the stage center to a foot at the center of the aim
  (`beamAxes()`): each height keeps its circle of the haze cone, and the circle moves with the
  axis, by the foot at the stage top and by 0 at the light. In these axes, the cone stands
  straight, so the haze shader maps each view ray into them and keeps its formulas: the beam
  still reaches the stage and veils no player. The mesh of the cone gets the same shear, and the
  motes follow it. The beam of the solo reads as the same spotlight: its foot is on the soloed
  players, and its top stays at the light.
- The render loop eases the stage lights to a new aim with a time constant of 0.25 s, so they
  reach 95% of the way in 0.75 s. With reduced motion, they move at once (2.5). A new layout
  starts at the aim with no solo. In the default view of Boulanger at 1440 × 900 during play, a
  solo of the cellos takes the median value of the box of the conductor from 85 to 39 and of the
  first violins from 80 to 27, and raises the box of the cellos from 101 to 113. A solo of the
  celesta (the polar bear at the piano) raises its box from 48 to 65. A solo of two seats far
  apart, the cellos and the celesta, gives one pool between them, and its middle stays brighter
  than the soloed players at its edges. The decision file
  [`2026-10-07-spotlight.md`](../decisions/2026-10-07-spotlight.md) gives the samples.
- An environment map gives the reflections (`scene/environment.ts`): a PMREM of a dark room
  (`#0b0807`) with 10 warm lamp boxes (linear 6, 3.4, 1.6) around the horizon in two rows, and a
  warm box above (linear 3, 2, 1.2). Its intensity on each material is 0.6. The renderer makes it
  one time, and again after a restored WebGL context, because a lost context loses the content
  of the PMREM. Without that, the stage and the players were 2.6% darker after a loss of the
  context (review of step 8, U1). With no environment, the brass and the copper looked dim.
- Tone mapping is AgX with exposure 0.8, in the final pass of the post effects (below). The
  output color space is sRGB. ACES moved the dark wood to red (hue 12 to 15 and a saturation of
  0.86, against hue 22 and 0.65 in `mockup.png`). The gallery page keeps ACES with exposure 1.0.
  The views page uses AgX and the grade of the final pass (7.1).

**Hall**

The concert hall around the stage (`scene/hall.ts`) has the hall unit `h`: the stage side, but
at least 9 m.

- A ring of 36 flat wall faces of radius `1.45 × h`, 1.5 × h high, around a center `0.25 × h`
  in front of the stage center. Every second face is a darker panel.
- Two balcony tiers at `0.30 × h` and `0.56 × h` above the floor, `0.12 × h` and `0.10 × h`
  deep, with a rail of `0.05 × h` and a gilded edge on its top. Lamps of 0.14 m stand on each
  rail, 2.6 m apart.
- A row of low lamps of 0.12 m stands on the wall, `0.06 × h` above the floor and 3.4 m apart.
  The default view sees the wall behind the stage only up to about 1.2 m above the floor, below
  the balconies. Thus until 2026-10-07 it showed no lamp of the hall, and `mockup.png` shows warm
  lamps at the edges of the image.
- The row of low lamps has no lamp within 60° of the back of the hall (-z), seen from the ring
  center (`HALL.wallLamps.backGap`). The wall behind the stage is 13 m behind a stage of 11 m.
  Thus the default view showed four of these lamps 120 to 170 px above the back edge of the
  stage, in the dark, as lights that float above the orchestra (review of 2026-10-07,
  `docs/reviews/2026-10-07-mockup-match.md`, gap 11). `mockup.png` and `orchestra-latest.png`
  show no lamp behind the stage. The gap was 40° until the higher default view of
  `orchestra-latest.png` (camera, below). Then the lamp 42° from the back stood behind the
  composer line of the first screen at 1440 × 900, which got a shade (2.8), and the lamp 54°
  from the back stood at the edge of the play button of a screen of 667 × 375. The low lamps at
  the sides stay at the edges of the image, and in a lower view the lamps of the balconies show
  at the top of the image, on the rails.
- Each lamp has a soft glow (`createGlows()`): a point that faces the camera, with a radius of
  0.45 m on a rail and 0.7 m on the wall, a Gaussian fall-off, additive light, and no depth
  write. The disc moves toward the camera by its radius along the view ray, so the wall behind
  the lamp does not cut it. The glows have the cutaway of the hall. They look like the soft lamps
  of `mockup.png` and the out of focus lamps of `scene.png`. The bloom alone gave a lamp a halo of
  1 to 2 pixels in the wide views. The depth passes hide the glows, as the other light effects.
  With a glow light of (1.1, 0.52, 0.2), the middle of a glow had a value of 157 against 54 in
  `mockup.png`.
- The shell takes no light. Its vertex colors hold a baked light: an ambient part of 0.18 of the
  base color, plus a glow from a point `0.25 × h` above the stage center. The glow is 2.2 at the
  stage, halves at `0.7 × h`, and is stronger on faces that point to the stage. It fades to 0.35
  at the top of the walls.
- The floor takes no light either. Its color goes from `#3a2416` at the stage edge to `#100b08`
  far away, and the spill halves at `0.12 × S` from the edge. The lights cost about 0.7 ms on the
  large floor.
- The floor is polished: its shader adds the reflection of the key light outside the stage, as a
  Blinn-Phong highlight with the exponent 60 and 0.015 of the color of the key light. For the
  default view, the highlight lies on the floor in front of the podium, a warm smear of a value of
  about 32, as the smear of 20 to 35 below the podium in `mockup.png`. It costs no light.
- All faces point into the hall. A camera outside the ring, as in the default view, sees no part
  of the hall within 75° of its own direction from the ring center, so the near balconies do not
  stand in front of the stage. The cut opens with a smoothstep from 0.85 to 1.0 of the radius.
  The vertex shader drops each cut quad and lamp as a whole. A discard in the fragment shader
  cost the hidden surface removal of the tile GPUs of Apple.

**Post effects**

The scene renders into a target with MSAA (4 samples), then the post effects make the image of
the canvas (`scene/post.ts`).

```text
scene ──> [scene target, MSAA] ──┬──> bloom down 1/2 ... ──> bloom up ──────────┐
                                 └──> blur prepare 1/2 ──> blur gather 1/2 ──┐  │
scene ──> [depth 1/2] ──────────────────────^ (only with a shallow focus)    v  v
          [scene target] ───────────────────────────────────────────────> final pass ──> canvas
```

- The scene target holds packed floats (R11F_G11F_B10F) with `EXT_color_buffer_float`, else half
  floats. With neither, the scene renders to the canvas with no post effects. The packed format
  halved the time of the scene pass on the development Mac (1.9 ms against 3.4 ms).
- The bloom keeps the light above 1.8 with a soft knee of 0.5, and adds 0.14 of a blur of 6
  levels (2.6). Each level of the upsample has its own target: a second write to a target cost
  0.4 ms for each level.
- The depth of field follows a thin lens. In a shot, the focus is the distance to the point that
  the camera looks at: the subject of the shot (5.6). The blur disc of a
  point at the view depth `d` is `A / (2 × s × tan(fov / 2)) × |1 - s / d|` of the image height,
  at most 1.5% behind the focus and 0.35% in front of it (about 3.5 px at 900 px). The section and
  the solo shots over the shoulder of the conductor focus on their subject, and the full limit
  blurred the bear in front to discs of 10 to 31.5 px (the middle of each close shot of the five
  demos with a conductor, 2026-10-07). In view 02 of `scene.png`, the bear in front is only a
  little soft. The conductor shots keep 2.7 to 4.9 px on the bear. The aperture `A` is 0.025 m up to a focus distance `s` of `1.0 × S`, and closes
  to 0 at `1.5 × S` with a smoothstep. Thus a close shot at 4 m blurs the back of the hall to a
  disc of about 1.2% of the image height, and the wide views
  keep the full stage sharp and skip the blur passes. A separate depth pass at half size gives
  the depth: the resolve of the depth of the multisample target cost 2.1 ms. The hall keeps its
  own material in the depth pass (`allowOverride = false`), so that the pass also drops the
  parts of the cutaway. The override material of the pass has no cutaway, and a camera near the
  ring wall got the depth of a cut balcony (review of step 8, U2). The gather takes
  32 samples (16 on the medium tier) on a golden angle spiral at half size. A sample behind the
  pixel blurs at most as much as the pixel, so a sharp subject keeps its outline.
- In Free mode, the focus is the first thing on the view axis in the middle of the frame
  (`freeFocusDistance()`): the column of a player (a vertical cylinder of radius 0.3 m from the
  stage top up to 0.3 m above the middle of its head), the stage top in the stage square, or
  else the orbit target. The focus moves to a new distance with a time constant of 80 ms (about
  0.3 s), at once with reduced motion, so a drag across the players does not make the blur
  flicker. Free mode has no depth of field: its aperture share is 0, so the frame skips the blur
  passes. The user found the zoomed view too blurry with a share of 0.25, and the area in focus of
  the close shots too small with an aperture of 0.07 m and a limit of 3.5% (2026-10-07), so the
  shots now have 0.025 m and 1.5%. Until 2026-10-07, Free mode had the full aperture and the
  focus on the orbit target, 0.25 m below the stage center. A zoom to the old near limit of 2 m
  put the camera among the players, and blurred all of them (bug report of 2026-10-07). At the
  new near limit at 25° in Boulanger (the orbit limits below), the focus is on the stage top behind
  the conductor, 6.7 m away. The hall wall 25 m away then gets a disc of 3 px at the height
  900 px (13 px with the full aperture), and the head of the conductor 3 m away gets 5 px
  (7 px). At a top view, the focus is on the heads under the camera or on the stage top between
  them. The default view keeps the full stage sharp.
- The final pass does the depth of field, the bloom, the tone mapping, and then a grade on the
  display values: a lift of (0.004, 0.004, 0.003), a gain of (1.0, 1.0, 0.97), a blend of 0.25
  to an S curve, and a saturation of 1.0 in the middle tones and 0.45 in the shadows. With 1.25
  and 0.7, the lit stage had a saturation of 0.68 against 0.55 in `mockup.png`, the dark floor
  0.72 against 0.47, and the warm lift made the dark areas redder (hue 18 to 20 against 21 to 23,
  scene polish of 2026-10-07). A lift of the highlights then moves each channel toward white by
  `smoothstep(0.45, 1.0, c) × (1 - c)`, because AgX compresses the light parts: white fur reached
  a value of 170 at most (the 99th percentile of the rabbits), against 220 in `mockup.png`, and
  198 with the lift. Then a
  vignette takes up to 0.45 of the light from the corners, and a grain of 0.035 changes 24 times
  each second. The wall time sets the grain, so a display of 120 Hz shows the same grain rate.

**Camera**

- Perspective, vertical field of view 30°, near 0.1. The far plane is the current camera
  distance plus `3 × S`. Update it when the distance changes, so that a full zoom-out still
  shows the stage.
- The default view has an elevation of 33° and an azimuth of 0°: the camera stands on the
  audience axis and sees the back of the conductor, as `orchestra-latest.png` (1). The target is
  0.25 m below the top of the stage and 0.7 m behind its center (`DEFAULT_TARGET`). With the
  axes of the stage origin (below), the camera is at `target + d × (0, sin 33°, cos 33°)`, where
  `d` is the distance. The opening, the wide shots, and the closing of 5.6 look at the same
  target, and Free mode turns around it (2.5). Until 2026-10-06, the azimuth was 30° to the
  right, from the fit to `orchestra.webp` below.
- `orchestra-latest.png` wins over `mockup.png` for the default view (1). It shows the full
  stage with the podium at the bottom middle and the back row at the top. In its 1762 × 1240
  px, the highest back heads stand at 0.145 of the height, the front of the podium at 0.944,
  the front edge of the stage at about 1.0, and the players from 0.07 to 0.96 of the width. The
  depth of the orchestra in the image (from the highest back head to the front edge) is 0.68 of
  the width of the players. In the free area of 1088 × 832 px beside the open drawer, the view of
  Boulanger at 33° gives 0.142, 0.858, 0.906, 0.06 to 0.92, and 0.68. The view of 25° gave 0.151,
  0.741, 0.779, 0.06 to 0.93, and 0.55: the stage looked flat, and the floor in front of it took
  a fifth of the free area. A camera at 30° gives 0.64, and at 36° 0.72.
- The image has almost no perspective: the heads of the hippos 8 m behind the bear are 0.9 of
  the size of its head (0.68 in the view of a field of view of 30°). Thus no camera of 30° gives
  all its angles. It looks down at the kettles of the timpani at about 16° (the ellipse of a
  kettle head is 0.27 of its width), and the ratio of the top to the front of the podium gives
  20° to 27°. The view of 33° looks down at the podium at 41° and at the back row at 24°. The
  framing of the full stage wins over the angle of the podium. A narrower field of view with a
  farther camera would change the wide shots, the planner, and Free mode (5.6).
- The elevation was 25° above the target 0.25 m below the stage center from 2026-10-07 for
  `mockup.png`, and 28° above the stage top before. `mockup.png` looks down at the podium at
  about 17° to 26°, and at the kettles of the back row at about 11° (the ellipse of a kettle
  head is 0.19 to 0.20 of its width).
- The test of the hidden heads (4.2) sets the lowest camera. At 33°, no large animal hides 5% of
  the head of a smaller animal. At 25°, the hippo of the contrabasses of Beethoven 9 hid 7.8% of
  the head of a choir penguin. With the target on the stage top, 24° was the lowest whole degree
  that passed (8.8%, 10.6% at 23.5°, and 17.4% at 20°). The pairs where any animal hides 10% or
  more of the head of another animal go from 5 at 25° to 1: a rabbit of the violins of Bach
  hides 10.2% of the head of another rabbit.
- The target comes from the hall behind the title. With the target on the stage top at 24°, the
  lit rim of the hall stood behind the logo, so the logo got a shade (2.8), and a lamp glow
  touched the play button of a short screen of 844 × 390. At 25°, a target from 0.15 to 0.35 m
  below the stage top passed the end-to-end tests of both. At 33°, the targets 0.15, 0.25, and
  0.35 m below the stage top 0.7 m behind its center, and 0.5 and 0.8 m behind it 0.25 m below
  the stage top, pass the tests of the title shade and of the first screen at 1440 × 900,
  1280 × 720, 844 × 390, and 667 × 375. They need the gap of 60° of the low lamps of the hall
  (hall, below).
- The players keep their part of the width: 0.02 to 0.96 of the free area with the drawer open,
  for the six demos (0.04 to 0.95 at 25°).
- The default distance is `3.3 × S` when the viewport is as wide as it is tall, or wider. When
  the viewport is taller than wide, multiply the distance by its height divided by its width.
  The wide and high shots of 5.6, the planner, and the beam fade of Free mode use the default
  distance as their unit.
- **Landscape rule.** The user asked on 2026-10-06 for the view of `mockup.png`, where the stage
  fills the free area left of the open drawer (01, 2.8). The default view of a landscape
  viewport stands at `0.58 × max(1, 1.6 / aspect)` of the default distance, at most 1, and
  0.928 at the aspect 1. Thus the orchestra keeps its part of the width from the aspect 1 to
  the aspect 1.6, and a wider viewport keeps the distance of the aspect 1.6. At 1440 × 900 with
  the drawer open, the players of the demos fill 0.02 to 0.96 of the free area of 1088 px, as
  0.10 to 0.97 in `mockup.png` and 0.07 to 0.96 in `orchestra-latest.png`, and the front
  corners of the stage can leave the frame. With the drawer closed, they fill 0.14 to 0.85 of
  the width. The factor was 0.56 at 25°. At 33°, 0.56 put the players of K. 525 from 0.00 to
  0.98 of the free area. The earlier default view at the full
  default distance filled about 40% of the width. The wide variants and the moves of 5.6
  multiply the distance of this rule.
- **Portrait rule.** The user decided on 2026-10-06 that a portrait viewport gets a lower and
  more frontal view, so that the orchestra fills more of the tall screen. The stage corners can
  leave the frame (UX audit 2026-10-05, SC8). The rule applies to the default view and to each
  wide shot of 5.6. Its share `p` is a smoothstep from 0 at the aspect 1 to 1 at the aspect 0.6
  and below, so a turn of the screen or a resize changes the view with no jump:
  - The azimuth is multiplied by `1 - 0.8 × p`. The default view has the azimuth 0, so the rule
    turns only the wide variants of 5.6.
  - The elevation is `4° × p` lower: 33° becomes 29°.
  - The distance goes from the distance of the landscape rule at `p = 0` to 0.68 of the default
    distance at `p = 1`, linearly in `p`.
  - The zoom of a wide variant of 5.6 (for example 1.1 for a variant from the side) fits the
    players of its angle in a landscape view. The rule removes it by the share `p`, and keeps
    the move of the shot: the push-in, the arc, and the pull-out of the last shot.
- With the default distance alone, the stage of a phone of 390 × 844 was about 300 px wide, and
  the outermost player stood at 0.58 to 0.63 of the half width from the middle of the view. With
  the portrait rule, the animals of a phone are 1.47 times larger, and the outermost player
  stands at 0.73 to 0.77 of the half width (0.72 to 0.76 on a tablet of 820 × 1180). The values
  keep each player, with its feet and its head, in the frame of each wide shot at each aspect,
  between the title and the bar of 2.8. Thus the nearest wide camera of a phone stands at 0.63
  of the default distance (the pull-out of the last shot from 0.92), and the nearest wide camera
  of a desktop at 0.52 (the push-in of the opening to 0.92). Both are outside the beam fade of
  Free mode (0.5, light and render). The high shots stand at 0.75 of the default distance at
  each aspect, with neither rule, as view 09 of `scene.png`. `wideView()` in `shots/view.ts`
  holds the landscape rule and the portrait rule.
- The elevation and the first azimuth come from a fit of a perspective camera to the three
  visible top corners of the stage in `orchestra.webp` (1024 × 1024 px): left (114, 560), near
  (664, 750), and right (914.5, 474). The fit fixes the vertical field of view at 30° and the
  principal point at the image center. Its free values are the elevation, the azimuth, the distance, and a target offset
  on the stage. The best fit has an error of 6.7 px (RMS), with the target 0.05 × S to the left
  of the stage center. With the target at the stage center, the error is about 24 px. Use the
  stage center.
- **Frame.** The frame is the image of the field of view at the aspect of the canvas. The
  canvas fills the window, and `camera.setViewOffset` puts the middle of the frame in the middle
  of the free area: 34 px (half the bar height) above the middle of the canvas, 176 px left of
  it beside the open drawer of a wide window, and higher above the sheet of a phone (2.8). The
  camera also renders the area outside the frame, so the scene continues under the bar and the
  drawer. A change of the drawer moves the frame with a time constant of 50 ms: 98% of the move
  in 200 ms, at once with reduced motion. `viewFrame()` in `shots/frame.ts` holds the rule.
- A close shot of 5.6 (conductor, side, section, or solo) fits its full frame into the free area:
  the frame shrinks to `min(1, free width / width, free height / height)` of the canvas, for
  example to 832 / 900 above the bar of a desktop, and to 1088 / 1440 beside the open drawer.
  Thus the bar and the drawer cover no part of the frame that the planner tests. A wide view,
  a high view, and Free mode keep the full frame, so that the default view keeps the size of
  the landscape rule. A cut changes the fit at once. After a close shot, Free mode takes it to 0
  in the 0.4 s of the move of the orbit target (2.5), so the change of mode does not jump.
  Until the review of step 8, the bar covered the bottom of each frame, for example the body of
  the bear in the view over its shoulder (M4).
- While the play button of the first screen shows, the frame shrinks until the stage and the
  players are clear of it (2.8). The box of the stage is the slab from the floor up to the
  highest head plus 0.5 m. The frame shrinks toward the top of the box when the button stands
  below the stage, and toward its left edge when the button stands at its right. After the
  first play, the frame grows back with a time constant of 120 ms (about 0.4 s).
- The user decided on 2026-10-05 that the camera has an automatic mode (2.5, 5.6). The orbit
  limits apply in Free mode: elevation 10° to 80°, and distance up to 2 times the distance of
  the default view. The near limit keeps the camera 1 m outside the box of the stage and the
  players: the stage square and the space up to the highest head (`orbitMinDistance()`). It
  depends on the direction of the camera. In Boulanger (`S = 11.28`, highest point 1.87 m), it is
  5.7 m from the target at the 33° of the default view (1 m above the highest head), 8.1 m at 25°
  (1 m in front of the stage edge), and 3.2 m at 80°. With the target at the stage center and
  25°, it was 7.3 m. The near limit of 2 m from the stage center let a zoom put the camera
  among the players and in the head of the conductor, and the depth of field blurred all of them
  (bug report of 2026-10-07). While the orbit target moves to the stage center after a shot
  (2.5), the near limit is 2 m, so the first update keeps the camera of the shot. A close shot of
  5.6 is about 4 m from its target, so the first near limit of half the default distance (18.5 m
  for `S = 11.19`) pulled the camera back at the first update of the controls. The far plane
  rule and the frame apply to each frame of both modes.

**Body proportions**

The head height `H` is the unit. The default `H` is 0.38 m. Each species multiplies it by its
size (species colors, above), so all species keep their size relative to the size 1. For
example, the bear has `H` = 1.35 × 0.38 = 0.513 m. The first value 0.30 m made the animals 1.27
times too small relative to the chairs and the podium of the reference image (review of step
3). A species with its own skeleton (4.3) gives its own `H`: the foxes have 0.327 m, and the
rabbit has 0.293 m. The table below gives the values of the default skeleton.

| Part | Size in H |
|---|---|
| Head | The cute head of the polished images (spec `2026-10-06-cute-furry-spec.md`, 2.5): 1.0 tall and 1.32 wide at the cheeks. It is a loft of ten rings with 12 corners (`models/head.ts`): a round crown (0.6 wide 0.04 below the top), the brow, the full low cheeks, the face below the eyes, the jaw, and the chin. Every second ring turns by half a side, out from the widest ring, so that the head has triangle facets 0.23 across in the default view, as the heads of `mockup.png`. The head had eleven rings with 16 corners before the facet look of 2026-10-07. The ring 0.02 above the head center went away, and the variant of the report with eight rings had facets of 0.27 to 0.35 and a flatter face. The widest ring is 0.12 below the head center, and it has no turn, so its corners at the sides give the full width. The face is a little flat, and the front of the cheeks, 0.63 in front of the head center and 0.25 below it, carries the muzzle. The cheeks of a species (4.3, `form.cheeks`) widen or narrow the rings from 0.37 below to 0.16 above the head center. The head width of a species (4.3, `form.headWidth`) scales all rings, so that the cat, the wolf, the foxes, and the dog have the narrow heads of `mockup.png` (1.08 to 1.22). The round head before the cute face was 1.26 wide, with its widest ring 0.04 above the head center. With the widest ring 0.1 below it, the cheek of the deer came within 0.026 m of the harp neck (5.3). The spec also drops the head by 0.06. The drop moves the head center and the mouth, and 28 tests of the poses, the holds, the legs, and the shots then fail, so the head keeps its place. The head of `animals.webp` (nine rings of 12 corners) came to a point at the muzzle, and it looked sharp beside the polished images. The second head had a narrow flat crown and a wide jaw, and it looked like a helmet. The first head (an icosphere 0.9 wide) was narrower than the torso, and the heads looked small. A species with `form.facets` (4.3) has a faceted head above the jaw ring (`headCap()`): the convex hull of 17 to 23 points on each half (`HEAD_FACETS`) and the 12 corners of the jaw ring, as the heads of `lowpoly-animals.png` and `orchestra-latest.png`. The hull cuts at the middle plane, and the left half is the mirror image of the right half. The jaw ring is the lower edge of the hull, so the head welds to the neck band of the trunk grid with no gap. Points on one plane make one large face plane. The fox head has 70 triangles above the jaw ring, against 156 for the round head, and its front triangles are 1.7 times as large on average. The canine head has a flat crown, a forehead in two planes on each side with a ridge down the middle, a flat eye plane, wide cheek points 0.2 below the head center, and a lower face that drops straight to the jaw ring. The planes of the round head followed the rings, and the fox head read as a ball of 12 sides. The ursine head has one flat plane around each eye, so that the eye patch of the panda lies flat on it: on the first faceted head, the patch crossed an edge and its outer half sank into the head. Points 0.04 above the jaw ring keep the faces from the cheeks to the jaw narrow: with no such points, a large face pointed down from each cheek point and showed as a dark band under the white cheeks. The width of each faceted head is the width of the species (4.3). The spheniscine head of the penguin is the narrow top of its egg body, 1.04 wide: its jaw ring (0.83 wide) is as wide as the neck ring (0.8), so the hood grows out of the body with no fold, as the penguins of `orchestra-latest.png`. The head top and the head center keep their places, so the choir keeps its height. A head of 1.04 is the narrowest that keeps the hidden heads (4.2) under 10%: in Beethoven 9, a hippo hides 9.5% of the head of one penguin (7.8% with the round head, 10.3% with a head of 0.97, and 11.1% with 0.9). The cheeks are part of the key of the cache of the caps: with only the head width, the panda (cheeks 0.02) got the cap of the bear (0.01), and its head had a gap at the jaw ring. |
| Torso | The lower part of the trunk grid (below): a round pear of 12 sides and 8 rings from the seat to 1.2 above it, where the grid goes on to the neck ring and the head, so that the chest fills the space under the chin and no neck shows (spec `2026-10-06-cute-furry-spec.md`, 2.4). It is 1.28 wide at the hips, 1.0 at the chest bone (0.75) and at the shoulder joints (0.98), and 0.9 at 1.2 above the seat, and 0.72 of the half width deep at the back. The belly bulges forward to 1.16 of the half width at 0.3 of the height. The torso of a large species (size 1.2 or more) is 1.25 times wider, and of a medium species (1.05 to 1.15) 1.1 times, as the plump bears and pandas of `mockup.png` (user, 2026-10-07). The factor acts by half on the depth, and it fades out above the chest bone, so the shoulders stay inside the domes of the arms. The torso before the cute bodies was 1.35 tall, 0.9 wide at the shoulders, 0.82, 0.68, and 0.4 wide above them, and its belly was 1.08, so a band of the neck showed under the chin. The rings stand at the changes of the form: the base, 0.05, the hips (0.16), the belly (0.3), the waist (0.6), the chest bone, the shoulder joints, and the top. Thus the facets have the size of the facets of `mockup.png` (`docs/research/2026-10-07-facet-look.md`). The rings at 0.45, 0.87 (1.04 wide), and 1.09 went away with the facet look of 2026-10-07. The neighbor rings turn by half a side against each other, except the rings at 0.6 and 0.75: the ring of the belly and the ring of the shoulder joints have no turn, so their corners at the sides give the full width. Its top is under the chin. The torso is one welded loft with two blend bands of plan 2.3 (4.7): across the waist (0.25 to 0.55 above the seat) its corners blend `hips` into `spine`, and across the chest (0.6 to 0.9) `spine` into `chest`, with a smooth step of the weight. The pelvis below the waist band follows `hips`, which no pose turns, so its base does not swing against the thighs. The first torso was two closed lofts that met at the chest ring, and a turn of `chest` opened a step there. The pear of 8 sides of the second round (1.32 wide, a belly of 1.2, and a back of 0.85) had large flat faces, and it was too deep in the side view. The first torso (1.3 tall and 1.0 wide) with a long neck made the animals look thin, and the torso of 1.45 tall and 1.12 wide of the first round of the animal views looked tall and thin beside `animals.webp`. |
| Neck | A ring of the trunk grid, 0.72 wide, 0.4 deep at the front and 0.42 at the back, 1.3 above the seat: the height of the head bone, so that a turn of the head moves it little. The chest ring below it (0.9 wide) and the jaw ring of the head above it (1.0 wide, 0.37 below the head center) are wider, so the neck shows only as the fold under the chin. At the back, the neck ring (0.42), the jaw ring (0.46), and the face ring of the head (0.5, 0.25 below the head center) make the nape a nearly upright wall. With a neck of 0.3 and a jaw of 0.38 at the back, the faces under the back of the head pointed down by about 30°, and the default view showed a dark V under the head: the darkest 5% of the nape had a luma of 5 against 17 now, on a back of 43. A neck of 0.44 at the back reached the top rail of the chair of the rabbit. The faces under the head still point down, so the shading turns the normals of the neck band to the horizontal and keeps 0.6 of the light there (Materials, above). Then the nape has a luma of 31 on a back of 37 in the default view. The trunk grid is one welded loft of 12 sides from the seat to the crown: the torso rings, the neck ring, and the head rings from the jaw ring up. The torso corners blend `hips`, `spine`, and `chest` (Torso, above), the neck ring follows `neck`, the head rings follow `head`, and the bands between the rings join the bones (4.7). In the poses of the gallery, the normal of a band triangle turns at most 38° from the turn of its main bone, and no triangle shrinks below 0.53 of its area (the chin of a singing penguin). The first neck was a tube 0.6 wide from 1.05 to 1.5 above the seat in a ball head on a pear torso, and a band of it showed under the chin. |
| Upper arm, forearm, hand | 0.7, 0.65, 0.3 (a round mitten: two smooth balls for the palm and the fingers, 1.2 times the first mitten of two faceted balls of 0.26 × 0.18 × 0.20 and 0.24 × 0.16 × 0.18, as the paws of `mockup.png`). The balls grow toward the back of the hand, and the finger ball toward the knuckles, so that the palm side and the finger tips keep the places where the holds put the bow, the strings, and the keys (4.6). The palm ball has 8 sides and the finger ball 6, so a body keeps its budget. Each arm is one round tube of 6 sides (`sweep()`) from a dome over the shoulder joint to a cuff at the wrist: 0.40 wide at the shoulder and 0.32 at the elbow, as the chubby arms of `mockup.png`, and 0.24 at the wrist. A wrist of 0.26 or more put the frog end of the bow into the forearm (the stick lies 0.127 to the palm side of the hand), and an elbow of 0.34 brought the left forearm of the conductor 1.9 cm from its head in the lift of the count-in (limit 2 cm). The thin arms before were 0.34 to 0.24 wide, and the arms of 0.40 to 0.30 of the second round looked like boxes. The skin of the tube blends from `upperArm` to `forearm` with `smoothstep(-0.06, 0.06)` H around the elbow, so only the ring at the joint has two bones (0.5 each), and a bent elbow turns smoothly. A filler ball of 0.9 of the elbow radius on `forearm` fills the outer side of a deep bend: in each pose of the gallery, the outer side of a bent elbow is at least 0.6 of the elbow radius from the joint. The flat end of the first upper arm overlapped the forearm, and a bent elbow showed a notch. The rigid split of stage B2 showed a rim or a ball at the elbow. The shoulder joints are 0.52 from the middle, 0.98 above the seat. The dome is rigid on `upperArm` (decision D2 of the skinned bodies), so that the shoulder is a round ball of the arm radius. The joint is up to 0.074 out of the side of the torso, and in each pose the ball reaches at least 0.085 into the torso. The flat end of the first upper arm had its middle on the joint, so a raised arm showed a gap of up to 0.074 between the arm and the torso. The shoulder joint is 1.43 from the middle of the palm: 0.62 of the seated height. In the reference image, it is 0.55 to 0.62. The first arms (0.6 and 0.55, 0.51 of the seated height) did not reach the bow hair of the viola, the cello, and the contrabass, and 7 of the 11 other instruments (review of step 4, the reach of the arms). |
| Thigh, shin, foot | The leg group of the species (4.3) gives the seated leg (`SEATED_LEGS` of `models/legs.ts`). The thigh starts in a haunch: a flat oval ring at the hip joint, 0.88 wide and 0.62 high on the hare and the small-paw groups (radius 0.44, flat 0.7), and 0.80 wide and 0.62 high on the digitigrade and pillar groups (radius 0.40, flat 0.77). A round end 0.22 to 0.26 behind the hip sinks into the torso. The haunch reaches 0.31 below the hip, so it lies on the seat as a part of the body, and the hip keeps its place 0.3 above the seat. The middle ring of the thigh, at 0.6 of the way to the knee, keeps 0.91 to 0.98 of the radius at the hip. The knee is 0.22 above the seat (0.24 for pillar) and 0.66 in front of the hip (0.68 for pillar), a little lower than the hip, at the front of the seat. At 0.55 in front of the hip, the bow of the rest pose (5.3) lay inside the round belly. The thin lower leg hangs from the knee to the floor: 0.32 wide below the knee and 0.24 at the ankle on the hare and the small-paw groups, with the ankle 0.03 in front of the knee, and 0.30 and 0.22 on the digitigrade and hoofed groups, as the lower legs of 0.27 to 0.34 of `lowpoly-animals.png`. The digitigrade and hoofed legs have a hock, as the foxes, the cats, the dogs, and the wolves of `lowpoly-animals.png`: the lower leg goes from the knee back to the hock, 0.34 above the foot rest and 0.14 behind the knee, where the `foot` bone is. The long bones of the foot are a closed tube of 8 sides on `foot`, 0.18 wide, from 0.06 above the hock (inside the end of the lower leg) down and forward to the top of the paw, 0.06 in front of the knee. They have the color of the socks. The pillar group has a thick lower leg, 0.56 wide and 0.73 deep from the front to the back, as the polar bear of `orchestra-latest.png` (0.7 to 0.9 from the side). With legs of 0.68 to 0.62 wide, the two legs touched each other, and the leg of the panda touched the lone stand of a contrabass, so that the arc to the trombone grew to 1.63 m (limit 1.6 m). The top of the leg at the knee is 0.39 above the seat on the hare, 0.38 on the digitigrade group, and 0.50 on the pillar group (0.51 before). Each leg is one round tube of 8 sides (10 before the facet look of 2026-10-07) from the hip through the knee to the ankle (`sweep()` of `models/sweep.ts`). The rings of the knee turn around the line where the inner sides of the thigh and the shin meet, so the inner side of the knee is a fold and the outer side is a round corner. The middle of the turn lifts 0.035 off that line. The foot is a loft of 8 corners from a point at the heel to a point at the toes, with a flat sole on the floor and a round top: a long flat foot 0.27 wide, 0.81 long, and 0.15 high on the hare group (three times as long as it is wide, as the rabbits of `lowpoly-animals.png`, 0.8 to 0.9 by 0.27), a paw 0.26 wide, 0.5 long, and 0.15 high on the small-paw group, a paw 0.28 wide, 0.36 long, and 0.17 high on the digitigrade group, a hoof 0.20 wide, 0.26 long, and 0.18 high on the hoofed group, and a pad 0.56 wide, 0.7 long, and 0.24 high on the pillar group. The heel of the hare foot is 0.40 behind the ankle, the heel of the small paw 0.16, the heel of the pad 0.32, and the heel of the digitigrade paw 0.10 behind its place under the knee (the hoof 0.08), so that the toes end 0.90 to 1.10 in front of the hip. With the toes 0.05 m further forward than 1.11 or turned out 10°, the feet touched the legs of the shared music stands, and the stages grew by up to 0.4 m. Each music stand keeps 0.05 m from each player. With accent feet, the shin below a ring at 0.45 of its length also has the accent color, as the dark socks of the fox. The lower body of 2026-10-07 had one human leg for all species: a round thigh tube 0.68 wide at the hip and 0.60 at the knee, a shin of 0.48 to 0.40, the knee 0.68 in front of the hip at its height, and a shoe 0.48 wide and 0.65 long. The user saw it as too human: "legs too long, too thick", with no animal traits (2026-10-07). The first legs had a thigh, a faceted knee ball of 0.54, and a shin, each with flat ends, and the user saw "strangely looking knees" (2026-10-06). The first thin legs (0.34 and 0.26 wide) looked like stilts. The chair sets the length of the shin, because the feet rest on the floor as in the reference image. A seated hip is 0.3 above the seat and 0.32 from the middle, and the ankle is 0.1 above the floor, so the shin is the seat height plus 0.12 H (0.14 H for pillar): 1.04 H on a chair of 0.35 m at `H` 0.38 m. The first shin of 0.6 H left the feet 0.25 m above the floor. A standing body has the standing leg of its group (below). |
| Seated height | 2.3 from the seat to the top of the head. With the chair of 0.35 m (0.92 H), the head is 0.30 of the height of the seated rabbit, as in `animals.webp` (0.30 for the rabbit and 0.31 for the fox). The first value 2.6 put the heads on long necks, and 2.4 with the chair of 0.40 m gave 0.29. A species with its own skeleton (4.3) has the head top 0.5 above its head center: 2.6 for the rabbit, whose shoulders are just under the chin, as in `rabbit-views.png`. |
| Eyes | Two black eyes of the form of the species (4.3, `eyes.form`), as the eyes of `mockup.png` (0.07 to 0.17 high): an almond of 0.17 × 0.095 with its outer end 14° up (the cat, the foxes, and the wolf), an upright oval of 0.12 × 0.135 (the rabbit, the dog, the deer, the mouse, the monkey, the meerkat, and the penguin), or a bead of 0.08, 0.06 of the head width (the bears, the panda, the elephant, the hippo, and the other heavy species). The eyes of the cat (`#c9b03c`), the tan fox (`#c98a2e`), and the wolf (`#d2a443`) have an amber iris (`eyes.iris`) with a black pupil of 0.42 × 0.82 of the eye, which stands a quarter of the eye depth out of the iris, as the amber eyes of `mockup.png`. The two foxes have the large eyes of `fox-views.png` on their sculpts (4.4): a white almond of 0.34 × 0.18 (`#f2e9df`) with a dark upper lid (`#24160f`), a round iris 0.176 wide, a black pupil, and a light (`#f6f2ea`). The iris of the red fox is brown (`#6e3a1e`, the reference has `#62301a`). The rabbit has a dark brown iris (`#3d150a`) with a large black pupil, as the eyes of `rabbit-views.png` (`#2e0a04` to `#501004` around the pupil). Each eye lies on the face, half in the head surface, on the faces between the front and the sides (`eyePlace()`), so that the side view shows them too. Each species turns its eyes out from the front of the face by its own angle (`eyes.out`, `eyeDirection()`), as the eyes of `mockup.png`: 20° for the foxes and the wolf and 21° for the cat (0.33 to 0.40 of the head width apart, as the foxes and the cats of `lowpoly-animals.png` and `orchestra-latest.png`, 0.35 to 0.40. At 30° to 32°, they were 0.49 to 0.52 apart, and the faces looked wide), 28° to 34° for the dog, the bears, the panda, the hippo, and most other species (about 0.5 of the head width apart, as the cat of `mockup.png`), 40° for the deer, the mouse, and the rhino, 44° for the elephant, and 46° for the rabbit (0.65 of the head width apart, at the sides of the head). The penguin turns its eyes out by 40°, at the sides of its narrow hood in their white rings, as the penguins of `orchestra-side.png`. It had 26° (0.41 of the head width apart), the place of the cute eyes, on a round head of 1.26. The turn keeps the angle above the horizontal of the eye place. The low eyes are 0.57 below the head top, as in the polished images (0.51 to 0.57). Above a muzzle that starts high on the face (long, blunt, roman, and broad), the eyes stay 0.43 below the top, as the fox of the polished images (0.40): the low eyes sat on the top of the long muzzle, which hid their lower half. Each eye has the `lacquer` finish and one white light in `#f6f2ea` on the eye bone at its upper outer side: 0.34 of the eye height, and at least 0.026. The light lies on the front of the eye. The cute eyes of 2026-10-06 were black upright ovals of 0.18 × 0.21 for all species, with two lights of 0.075 and 0.032, and they were 1.2 to 3 times the eyes of `mockup.png` (review `2026-10-07-mockup-match.md`, gap 2). The eyes of the round head were 0.13 × 0.18 and 0.44 below the top, with one light of 0.04 above the middle, and the faces looked old. The eyes of `animals.webp` were 0.07 × 0.15 with no light, and they looked small. No mouth, except the choir jaw (4.7). |
| Ears | long 1.25 tall, pointed 0.55, round 0.34 (a thick disc 0.2 deep of 80 faces, as the round black ears of the pandas of `mockup.png`. It was 0.3 wide, 0.12 deep, and 20 faces, and it looked like a chip. Its base is 0.03 lower, so that the top of the ear keeps its height), large-round 0.7 (set high on the head and out to the sides, so that the mouse does not look like the bear), floppy 0.96 long and 0.36 wide (a flat leaf, a loft of 8 corners, that hangs from the side of the crown and curves out over the cheek to below the chin, with its outer face turned 20° to the front, as the beagle ears of `mockup.png`. The first floppy ear of 0.5 read as a brown cheek), large-flap 1.4 high and 0.59 wide, small 0.2, side-round 0.32, antlered 0.45 (pointing out to the sides) with antlers of 0.45, low-round 0.24 (a disc ear low on the side of the head, which leans out 58°, for the polar bear: its top is 0.39 above the head center, below the top of the head, and the round ears of the bear rise 0.1 above that top). The large-flap ear stands beside the face, from the top of the head to 0.9 below the head center, and turns out at 55° from the middle plane of the head, so that its front face and the inner ear show from the front, as the elephant of `mockup.png` (1.4 high). Its root is 0.42 out and 0.06 behind the head center. It reaches 0.25 past the cheeks, so that an elephant is 0.944 m wide at the ears, inside the seat arc of 0.95 m, and two elephants on neighbor seats keep apart (review of step 3, F12). The ears of `mockup.png` reach 0.5 of the head width past the cheeks, which needs 1.38 m. The first ear of 0.9 × 1.1 pointed back at 32° behind the head, and only its top corners showed, as the ears of a mouse. The long and the pointed ears are flat plates with a sharp outline, as in `animals.webp`: the long ear is a leaf 0.4 wide, and the pointed ear a triangle 0.42 wide at its base. An inner plate of 0.66 of the size lies on the front face. Each plate leans back 10°, and its front face turns out 30°, so that the side view shows the inner ear. |
| Snouts | short (two round cheeks of 0.30 × 0.25 low on the face, and the nose above them. On a narrow head, the cheeks and the nose scale by the factor of the head width (`headWidthFactor()`), so that the cat (0.81) has the small defined muzzle of `mockup.png`. The cheeks of 0.26 × 0.22 before the cute face read as two balls), long 0.43 in front of the face, a pointed cone 0.7 long that narrows from 0.68 wide to a tip of 0.14 with the nose of 0.12 on it, and the fur color on its top, as the fox and the wolf of `mockup.png` (it starts high on the face, so that its top continues the forehead. It was 0.25 from the polished images to the heads of 2026-10-07, and the fox looked like a cub. It was 0.38 and thinner before the polished images, and 0.32 in their first round, which looked long from above), blunt 0.43 (a long round muzzle, 0.66 along its axis, with a large nose on the top of its tip, for the beagle dog, as the beagles of `mockup.png`. It was 0.3 before the heads of 2026-10-07, and the dog looked like a pup), broad 0.34 (a broad deep muzzle for the hippo, 0.86 wide and 0.56 tall: two round lobes and a bridge between them that joins the face, with two nostrils on the top of its front, as the hippos of `mockup.png` and `scene.png`. The first broad muzzle was one flat ball 0.88 wide and 0.6 tall, 0.17 in front of the face, and the head read as a disc or a helmet from the camera), pointed 0.2 (a thin cone with a small nose at its tip, for the mouse and the meerkat), buck-teeth (a muzzle of 0.42 wide with two front teeth of 0.1 × 0.2 H in `#f1ead9` below it, for the beaver), trunk 1.4 (3 bones, from 0.3 below the head center: 0.5 and 0.5 down, so that it hangs 0.96 below its root, and a tip of 0.4 that turns to the front, as the long trunk of `mockup.png`. The first trunk hung 0.9 and curled its tip up, and it looked short. The tip keeps 0.03 m from the timpani in the bind pose, and two tusks of 0.34 in `#f1ead9` beside its root. It is one swept tube of 10 sides with a round curl of 0.13 at its last joint, so it has no ball at a bend. The first trunk had a tube for each segment and a faceted ball at each bend), flat-nose 0.4 wide and 0.3 tall, horn 0.4, beak 0.34 in front of the point of the face (a large wedge of two convex hulls, as the singing penguins of `orchestra-latest.png` and `orchestra-side.png`: an upper half of 7 points on each half with a ridge and flat sides, and a lower half of 5 points on the jaw. It was two thin cones of 0.2, and the beak did not show from the camera), round 0.18 (a short round muzzle for the panda, 0.42 along its axis and 0.5 wide at its base, with a large nose on the top of its tip, as the pandas of `mockup.png`. The panda had the short muzzle before the heads of 2026-10-07. A muzzle 0.08 lower and 0.03 wider took the left hand of the trombone 0.037 into it. The bear keeps the short muzzle: a round muzzle reached the conductor stand in the bow at the song end, and the left hand in a cue), tapered 0.33 (a soft muzzle for the rabbit, 0.62 along its axis and 0.6 wide at its base, that grows out of the face below the eyes and tapers to a round tip with a small nose, so that the head is an egg in the side view, as the rabbits of `mockup.png`. Its underside has the color of the muzzle, and its top and its sides the fur color. The rabbit had the short muzzle before the heads of 2026-10-07, and its head was a ball. A muzzle 0.08 lower and 0.04 wider brought the bow arm 0.04 into it), roman 0.27 (a long straight muzzle for the polar bear: it starts high on the face, so that its top continues the forehead in one line, as the Roman nose of a polar bear. It is 0.49 tall and 0.47 wide at its base, with a blunt tip, the fur color on its top, and a large nose of 0.16 tall on the top of its tip. The short muzzle of the bear reaches only 0.09 in front of the face). Each nose is a ball 1.3 times as wide as it is tall. A long or a pointed muzzle reaches past the mouth, so that the mouthpiece of a wind instrument is under the muzzle. The tip of the trunk is the nose, so the trunk has no nose ball. The flat nose is a disc with two nostrils in the nose color, for the pig. With the first width of 0.2, the disc was a small button, and the hippo looked like the pig. The horn stands on a large muzzle, and it is 0.26 wide at its base. The beak has an upper half on `head` and a lower half on `jaw`, so that the choir opens it (4.7). The long, the blunt, the roman, the tapered, and the round muzzle are faceted (`muzzleCorners()`): the convex hull of 9 to 13 points on each half, so that each has a few large planes, as the muzzles of `lowpoly-animals.png`. The long muzzle is a wedge with a ridge on its top that continues the forehead, two planes on each side, and a flat underside. The blunt muzzle of the dog is a box with a flat top, flat sides, and a flat front. The part in front of the face has at most 24 triangles, against 30 to 50 for the muzzles of 10 sides before. Each hull keeps its length and stays inside the muzzle of 10 sides that it replaces, so the holds and the clearances do not change. |
| Tails | puff 0.42 (a round ball of 10 sides and 5 rings, 1 bone), bushy 1.1, thin 0.7, flat 0.5 (2 bones). A tail of two bones is one closed round tube (`sweep()`) with a round tip: 6 sides for the thin tail, and 8 for the bushy and the flat tails (8, 10, and 8 before the facet look of 2026-10-07). With 6 sides, the bushy tail folded by 40.4° at its joint, and the flat paddle was too narrow. The ring at the joint turns half way between the two segments, a ring on each side of it keeps the bend round, and the skin blends `tail1` into `tail2` with `smoothstep(-0.08, 0.08)` H around the joint (4.7). The first puff was an icosahedron of 20 faces, and the first long tails were lathes and a box with flat ends. A tail of two bones leaves the body at the seat, goes back through the open back under the top rail of the chair, and hangs down. The puff sits low on the back and 0.26 behind the root of the tail, so that it stands 0.28 out of the back and shows at the seat in the back view, as in `animals.webp`. 0.14 behind the root, the round back hid most of it. The bushy tail is a brush 0.54 wide, and the last 0.45 of its second bone has the belly color. It leaves the body 0.3 behind the axis of the torso, goes down and back, and hangs to 0.12 m above the floor, less steeply on a standing player. With 0.03 m, or with a tail of 1.4 that left the body at the back of the hips, the stands of the clarinets of the reference composition touched the tails of the foxes, and `S` became 6.71 to 6.76 m. The flat tail is a stalk and an oval paddle of 0.45 H wide and 0.06 H thick. With 0.3 H, the chair hid it. |

A player that stands (the timpani, the percussion, the choir, and the conductor, 4.6) has short
straight legs. The soloist of 3.8 also stands when it plays the violin, the viola, the flute, the
oboe, the clarinet, the horn, the trumpet, or the trombone, as in a concerto: the agent decided
this on 2026-10-06 for the user decision of AM3. The soloist of the cello, the bassoon, or the
tuba sits on a chair, and the contrabass, the harp, and the piano keep their stools and the bench.
`supportOf()` in `models/player.ts` gives the support, and `PlayerCast.support` holds it. A
standing player is as tall as a seated one: its torso base is 0.77 H above the floor, and a seat
is 0.92 H high. The base of its torso is 0.77 H above the floor, the hip is 0.17 H above the
base, and the feet rest on the floor. Its legs (the hip height) are 30% of its height, and the
bear is 1.63 m tall. In the reference image, the legs of the bear are about 25% of its height.
The first rule (the legs of a chair, straight down) made them 41%, and the bear was 2.02 m tall
(review of step 4, F3).

The leg group (4.3) gives the standing leg (`STANDING_LEGS` of `models/legs.ts`), as the
standing players of `orchestra-latest.png` and `orchestra-side.png`:

- **pillar** (the bear, the elephant, the badger, and a standing panda or pig): a short column of
  0.60 to 0.56 H with no knee narrowing, 1.1 times as deep, on a round pad of 0.62 × 0.72 H. The
  knee is 0.45 H below the hip and 0.03 H forward. The leg, the spread of the knees (0.34 H from
  the middle), and the pad grow with the plump factor of the species, as the torso does: the bear
  and the elephant (1.25) stand on legs 0.75 H wide, 0.77 H long below the torso, and 0.1 H
  apart, as the bear of the references (about 0.8 H long and 0.75 H wide).
- **hare** and **small-paw** (a rabbit, mouse, or monkey soloist): a thin leg, 0.64 H at the hip
  and 0.30 to 0.24 H below the knee, with the knee 0.42 H below the hip and 0.06 H forward, on
  the foot of the seated leg.
- **digitigrade** and **hoofed** (a fox, cat, or wolf soloist): the knee 0.36 H below the hip and
  0.14 H forward, a lower leg of 0.28 to 0.20 H back to a hock 0.30 H above the floor, and the
  long bones of the foot down to the paw or the hoof under the knee.
- **webbed** (the penguin): no leg tube (decision D9 of the anatomy plan). A hem, a closed loft
  of 12 sides on `hips`, continues the pear of the torso down to 0.12 H above the floor. It
  narrows to 0.56 H wide at the bottom, and its front is flat below the belly. Its front has the
  belly color, cut at 20° as the torso stripe at its base. Paddle feet of 0.30 × 0.46 H stand
  0.16 H in front of the knees, so that the toes show in front of the hem from the camera above.
  The base of the torso stays 0.77 H above the floor, so the choir keeps its height and its holds.

The spread of the standing knees is for the default hip joints (0.32 H from the middle). A
skeleton with the hip joints further out (4.3) moves the knees out by the same distance, so that
the thighs stand upright. On the hips of 0.43 H of the rabbit, the knees at 0.30 H made the thighs
lean in by 17°. The standing knees of the foxes (hips of 0.38 H) move out by 0.06 H, and their
sculpts have the standing legs of these knees.

The standing legs of the cute bodies were one round leg for all species, 0.68 H wide at the hip
and 0.48 to 0.40 H below the knee, straight down from the hip, on a shoe 0.48 × 0.65 H.

The `girth` of a species scales the width and the depth of the torso, the thickness of the arms
and the legs, and the distance of the shoulders and the hips from the middle. The head, the hands,
and the feet keep their sizes. The meerkat has the girth 0.75, so it looks thin and upright, and
it does not look like the dog (review of step 4, the weak species). The bear has the girth 1.0.
The round torso of 1.28 H at the hips is then as wide as the head, as the bear of `animals.webp`.
With 1.15 and 1.25, the round bear was much wider than the bear of the image. The polar bear has
the girth 1.3, because `polar-bear-views.png` shows shoulders and a belly 1.5 to 1.6 times as wide
as before, and a torso 1.3 times as deep (4.3). The girth keeps the balls of its wide shoulder
joints inside the torso.

On a chair, the body moves forward on the seat until it is 0.01 m in front of the back posts and
the top rail. The tail does not count, because it goes through the open back. The torso goes
through the back otherwise. Below the rail, the back is open, so the rabbit and most species
need no move. The move is 0.042 m at the size 1.35, the bear too. The deeper back of the second round needed 0.071 m, and 0.114 m for the bear with the girth 1.15.
A floor instrument, such as the cello, moves with the body.

**Facets and triangle budgets**

- A head is a loft of ten rings with 12 corners (192 triangles, 288 with eleven rings of 16
  corners before the facet look of 2026-10-07). A faceted head has 66 to 88 triangles above the
  jaw ring, against 156 for the rings. A limb is a faceted tube of
  10 sides with four rings (80 triangles). Each ring turns by half a side against its neighbors,
  and the two inner rings bulge to 1.1 of the radius there, so the limb has small triangle
  facets and looks round, as in `animals.webp`. The upper arm starts in a dome of two rings and
  a point in place of a flat cap (120 triangles). An arm is one swept tube of 6 sides with a
  point, eight rings, and a cap (96 triangles), and a filler ball of 6 × 3 (24 triangles). The
  tube had 8 sides (128 triangles) before the facet look of 2026-10-07.
  A leg is one swept tube of 8 sides with nine
  rings and two caps (144 triangles, 180 with 10 sides before the facet look of 2026-10-07), in place of a thigh, a knee ball, and a shin. The first limbs
  had 6 sides and three rings (36 triangles), and the limbs before the polished images had 8
  sides. An antler has 6 sides. A
  torso is a loft of 8 rings with 12 corners (11 rings with 16 corners from the polished images to
  the facet look of 2026-10-07), and most neighbor rings turn by half a side against each
  other. The left half of a loft is the mirror image
  of its right half, facet by facet.
- A body has at most 2,600 triangles. An instrument has at most 800, except the timpani (1,200)
  and the piano (2,000). The open bells, the round kettles, and the lacquered piano of the
  polished images need more than the first budgets of 500 and of 1,500 for the piano. A chair or the piano bench has at most 120, and a stand at most 80. The round
  torso, head, and limbs of the third round of the animal views need more triangles than the
  first budget of 1,200. The finer facets of the polished images need more than the second
  budget of 1,800. Before the polished images, the bodies of the cast had 1,484 to 1,784
  triangles (the elephant with the timpani), and 764 to 1,076 before the third round.
- The full scene with 60 players has at most 200,000 triangles. Before the polished images, the
  scene of `perf-60.mid` had 117,514 (73,662 before the round bodies), and the budget was
  150,000.
- The frame cost of `perf-60.mid` (`tools/measure-frame.ts`, high tier, device scale 2, Apple M1
  Max) set the new budgets. With the old bodies, the GPU time was 2.48 ms (p50) and 3.34 ms
  (p95). With bodies of 1,972 to 2,336 triangles and one draw call for each player (4.5,
  materials), it was 1.82 ms and 2.88 ms, with a load average of 50 on the machine. The target
  of 9.7 is 4 ms. With all changes of the polished cast, the bodies have 2,016 to 2,400
  triangles, the instruments 36 to 1,032 (the timpani), and the scene of `perf-60.mid` 159,046.
  The GPU time was 2.38 to 2.92 ms (p50) and 3.11 to 3.33 ms (p95) in two runs, against 2.57 ms
  and 3.05 ms on `main` at the same time. Both ran at 30 fps in headless Chrome that day, with
  each frame under 4 ms of work, so the frame rate came from the machine or the page and not
  from the frame cost.
- The domes of the shoulders add 80 triangles to each body. The bodies then have 2,096 to 2,480
  triangles, and the scene of `perf-60.mid` has 165,222 (160,342 before the domes).
- The facet look of 2026-10-07 (`docs/research/2026-10-07-facet-look.md`) needs fewer triangles:
  12 corners on the trunk grid, 8 torso rings, 10 head rings, arms of 6 sides, legs of 8 sides,
  and tails of 6 and 8 sides. The bodies then have 1,480 (the penguin) to 1,940 triangles (the
  badger), against 2,364 before, and the scene of `perf-60.mid` has 132,282 (was 158,198).
- The cut color borders of 2026-10-07 (4.3) add 140 to 194 triangles to a body. The bodies then
  have 1,636 (the penguin) to 2,164 triangles (the panda), and the scene of `perf-60.mid` has
  143,016 (was 133,656).
- The faceted heads and muzzles of 2026-10-07 (Head and Snouts, above) have fewer triangles.
  The bodies then have 1,676 (the penguin) to 2,076 triangles (the panda), and the scene of
  `perf-60.mid` has 141,112 (was 143,940).
- A Vitest test in `models/` checks these budgets.

**Props and stage**

| Item | Values |
|---|---|
| Chair | Seat height 0.35, seat 0.42 × 0.40, back top 0.85, four legs. The back is two posts and one wide top rail of 0.10, and it is open below the rail, as on the chairs of `animals.webp`. In that image the seat is 0.77 to 1.07 H high (mean 0.91 H), and the chair of 0.45 m was 1.18 H: the legs of the animals looked long. 0.35 m is 0.92 H. The thighs lie flat on the seat, and the feet rest on the floor |
| Stool | For the harp: a seat of 0.36 × 0.36 at 0.35, the height of a chair seat, four legs, no back |
| High stool | For the contrabass: a seat of 0.36 × 0.36 at 0.70, four legs, a foot ring at 0.35, no back. The feet rest on the ring, so the shin keeps the length that it has on a chair |
| Music stand | Tripod base, post, desk 0.50 × 0.35 at a height of 1.05, tilted 30° to the player, a white sheet |
| Podium | A box of 0.9 × 0.9 × 0.25, with a top plate of 0.04 (`PODIUM_TRIM` in `models/stage.ts`). Each corner of the top plate is cut by 0.1 along each edge. The body stands 0.02 in under the plate. The frame of the top is 0.07 wide, the groove 0.012, and the frames of the side panels 0.05. A side panel stands 0.003 out of the body, so the podium keeps its box of 0.9 × 0.9 for the layout. |
| Conductor stand | In front of the conductor: a desk of 0.60 × 0.45 at a height of 0.70 above the podium top, just below the chest of the bear, with an open score. Its top edge is at the shoulders of the bear, as in `animals.webp`, and the desk is lower than the chest, as in `scene.png` (05). The post stands on the stage, 0.6 m in front of the podium center (toward -z), on a round base of radius 0.12 just in front of the podium. The desk leans back 30°, as on a music stand. The first height of 1.10 put the desk above the shoulders of the bear (0.90), and the beat had to stay at the height of its head (UX audit 2026-10-05, AM1). At 0.80, the head of the bear went into the top of the desk in the bow at the song end (5.4). The first post stood on the podium, 0.35 m in front of its center: the lower edge of the desk was 0.24 m in front of the bear, and the belly of the bear (0.36 m) went through the desk and the score (user report of 2026-10-06). |
| Stage | A slab of side `S`, 0.40 thick (stage origin, below), with no steps, as in `mockup.png`. Each corner is cut by `0.1 × S` along each edge (`STAGE_CORNER_CUT`), so the outline has eight sides, as in `orchestra-latest.png`. A raised lip runs around the top (`STAGE_LIP`): 0.1 wide, 0.045 above the stage top, with a round top and an inner bevel down to the planks. Its outer face goes down to 0.06 below the stage top, where the skirt starts. Until 2026-10-07, the slab was square, with a chamfer of 0.04 around the top edge. The footprints of the demos allow a cut of up to `0.115 × S` (the first violin of K. 525). Planks are 0.22 wide and run from the left to the right, as in `mockup.png`, with a line of 0.012 between two planks. Each plank is 2.4 to 4.8 long, and the joints of the rows are staggered. A deterministic hash sets the lengths and the tones. The stage has its own material: roughness 0.6, metalness 0, 2.0 times the direct gloss of the lights, and a grain along the planks that changes the color by up to 16% and the roughness by up to 0.12 (`scene/stage.ts`). The gloss of the key light gives most of the light of the planks in the default view, so the roughness sets the width of the pool of light on the stage (light and render, below). The roughness was 0.42 and the gloss full until 2026-10-07: the gloss of the key light in front of the podium was a pale spot of 178 with a saturation of 0.30, against a warm 133 and 0.55 in `mockup.png`. With the roughness 0.38 and 0.55 of the gloss, the pool was narrow (user request of 2026-10-07): the lit wood fell to 0.5 of the wood beside the podium at 0.55 of the way to the side edge, against 0.75 in `orchestra-latest.png`. The skirt and the chamfer get a baked light (scene colors). |
| Choir risers | Up to three levels, each 0.8 deep. The lowest level is 1.0 high, and each higher level 0.25 higher (seat geometry, below). Three steps of 0.2 deep stand in front of the lowest level, 0.25, 0.5, and 0.75 high, so the risers rise from the stage top in even steps of 0.25, as the wooden risers of `orchestra-latest.png` and `orchestra-side.png` (`RISER.steps`). No singer stands on the steps. Each level and each step is an arc block from the stage top to its height. Each tread has a lighter edge of 0.04 at its front and boards of at most 0.4 with a dark line of 0.012 between them, and the faces have the skirt color. Until 2026-10-07, the lowest level was a wall of 1.0 m with no steps, and the tops had the plank color |
| Floor | The floor of the hall at the bottom of the stage (y = -0.40), with the baked spill of the stage light (hall, above). |

**Stage origin**

The world origin is the stage center, on the top of the stage. The axes are the right-handed
axes of Three.js: +x points to the right as the audience sees it, +y points up, and +z points to
the audience (the front).

1. Place the soloist (seat geometry, below), then the seats in arcs around the podium center.
2. Calculate the half width `L`: the largest `|x|` of a seat, plus 0.5 m for the chair and 0.3 m
   of margin. `L` is also at least the largest `|x|` of a footprint box (seat geometry, below),
   plus 0.3 m. The footprints hold the risers, the piano, and the wide instruments.
3. Calculate the front distance `F` from the front edge to the podium center: 1.0 m. With a
   soloist, `F` is also at least the distance from the podium center to the front of its
   footprint, plus 0.3 m, so that the front edge stays 0.3 m in front of the piano case or of
   the instrument of the soloist.
4. Calculate the depth `D`: `F`, plus the largest distance behind the podium (along -z) of a
   seat, plus 0.5 m for the chair and 0.3 m of margin. The footprint boxes count as in step 2.
5. The stage side is `S = max(5, 2 × L, D)`. The front edge stays `F` in front of the podium
   center, so any extra depth goes to the back.
6. Spread the instrumental rows inside the stage (seat geometry, below). `S` does not change.
7. Move all items so that the stage center is the origin. The podium center is then at
   `(0, 0, S / 2 - F)`.

The first values (`F` 1.6 m, a margin of 1.2 m, and `S` at least 7) left the stage of the
reference composition 1.2 times too large (review of step 3). The seat arc and the row step
stay, because they match the reference.

The composition of the reference image (section 1) gives `S = 8.12`. Row 0 holds the first
desks: two first violins and two second violins left of 0°, and the cello right of it. Its
radius is 4 × 0.95 m / 80° = 2.72 m. Row 1 holds the other three violins, row 2 the two flutes,
and row 3 the three clarinets at the radius 6.32 m. Thus `D = 1.0 + 6.32 + 0.5 + 0.3 = 8.12`,
and `2 × L` is 7.93. A test of `layoutScene()` pins this value. With the rows of step 4, the
flutes and the clarinets shared one row, and `S` was 6.6 m. The reference image puts the flutes
at the front right, which is not the place of the flutes in a professional orchestra (4.2). The app shows the layout of the selected demo, with all its
players, and the conductor on the podium (a chamber group of 4.2 has no conductor).

The music stand of a string player stands 0.65 m in front of the row, between its seat and the
next seat on the right, because two string players share one stand. At 0.65 m, the back leg of a
stand keeps 0.1 m from the chair back of the row in front. At the first value 0.75 m, the gap was
0.015 m (review of step 3).

**Seat geometry**

The seats stand in arcs around the podium center. All players face the podium, except the
pianist. An angle of 0° points from the podium to the back (-z). Negative angles are on the left.
A seat at the angle `a` and the radius `r` is at `podium + (r × sin a, 0, -r × cos a)`.

- A seated player uses at least 0.95 m of arc, and a choir singer 0.60 m. The arc between two
  neighbors grows in steps of 0.02 m until their footprints keep 0.05 m apart, with their own
  stands and the stand between them. Thus the timpani (1.82 m wide) and the cellos with their
  shared stands get more arc.
- String players share one stand for each two players of a seat: the players 0 and 1, then 2
  and 3. The stand stands 0.65 m in front of the row, between the two seats. The last player of
  a seat with an odd count has its stand where a partner would share it, to its right.
- Woodwind and brass players have one stand each, in front of the player, 0.65 m from the row or
  further. The stand moves forward in steps of 0.02 m until it keeps 0.05 m from the player and
  its instrument. Thus the stand of a trombone stands in front of the slide.
- The first desk of each violin, viola, and cello seat (its players 0 and 1) sits in row 0.
  Its other desks (the players 2 and higher) sit in row 1. A string seat with one or two players
  sits only in row 0.
- Rows 0 and 1 hold the violins to the left of 0° and the violas and the cellos to the right,
  and each side spans at most 80°. Thus no string player sits behind the conductor, and the
  first violins sit at the front left (4.2), as the rabbits of the reference image. The other
  rows are centered on 0° and span at most 160°. The sections of a row follow the order of the
  table, from left to right. These spans set the radius of a packed row. After the stage size,
  the spread (below) lets a row reach ±90°.
- Row `n` has the radius `r(n) = max(r(n - 1) + 1.2, width(n) / 2.79)`, where `width(n)` is the
  arc length that its players need and 2.79 is 160° in radians. In rows 0 and 1, `width(n)` is
  two times the wider side. `r(-1)` is 1.2, so row 0 has a radius of at least 2.4. Thus a full row moves
  back until it fits into 160°. Then the row moves back in steps of 0.02 m until its footprints
  keep 0.05 m from the items in front: the rows in front, the piano, the podium, the conductor
  stand, and the conductor.
- The choir stands on risers behind the last instrumental row. Riser level `k` has the radius
  `r + 0.8 × k` and the height `1.0 + 0.25 × k`, where `r` is 1.2 m more than the radius of the
  last instrumental row. The singers fill the levels evenly, and the lower levels get the extra
  singers. The layout tries one, two, and three levels, and keeps the count that gives the
  smallest stage side. Fewer levels win a tie. Thus the 32 singers of the choir test file
  (`models/test-choir.ts`) stand on two levels (16 and 16) behind the timpani, and `S` is
  12.00 m. The removed Handel demo had the same choir: 12.04 m on two levels. With the rows of
  step 4, it had three levels (11, 11, and 10) and 10.94 m. With level 0 filled first, `S` was
  15.44 m (review of step 3, F13). If a level needs more than 160°, or if the risers touch the
  orchestra, all levels move back. Each level spans the angle of the widest level of singers.
  The footprint of the lowest level holds its steps, so the steps keep 0.05 m from the back row.
  After the stage size, all levels widen by the same wing on each side, up to 1.0 m of arc at the
  lowest level (`widenRisers()`), as the risers of `orchestra-latest.png` reach past the choir.
  The wing is the largest that keeps each box 0.3 m from the outline of the stage and 0.05 m
  from the other items, and the stage side does not change. Beethoven 9 gets the full wing
  (13.7° to 19.4°), and the choir test file 0.62 m (28.7° to 32.4°): a wider wing set the
  width of its stage and made it 12.89 m.
  The steps moved the risers 0.22 m back: Beethoven 9 has 11.84 m (11.62 m before), the choir
  test file 12.18 m (11.96 m), and `perf-60.mid` 13.67 m (13.45 m).
- The vocal soloists of 3.8 stand alone on level 0, centered, with 1.2 m of arc each, twice the
  arc of a singer of the choir. The choir then stands on levels 1 and 2. Thus the four soloists
  of Beethoven 9 stand in a wide row in front of the 8 singers of the choir, and `S` grows from
  11.18 m to 11.98 m (UX audit 2026-10-06, N8).
- A row with no players drops out, and the rows behind it move forward.
- After the stage size, each instrumental row spreads inside the stage, from the front (stage
  origin, step 6). The packed rows end at ±43° to ±74°, so the front corners of the stage stayed
  empty: the near corner of the default view was 0.29 to 0.48 S from the nearest seat, against
  0.10 S in the reference image. The left side and the right side of a row each get a factor
  `k`. Each arc between two neighbors on that side, and the arc from 0° to the innermost seat,
  grows to `k` times its packed length, but to at most 1.6 m. An arc that is already longer
  stays, for example the 2.17 m of two contrabasses with their shared stand. With no seat at 0°,
  the innermost arc of a centered row grows to at most 0.8 m, because the innermost seat of the
  other side shares the 1.6 m. In rows 0 and 1, the innermost arc is the gap of the conductor,
  and it has no limit. Thus rows 0 and 1 keep the violins left of 0° and the other strings right
  of it. An arc that is already longer than 1.6 m stays, for example the 1.84 m from a
  contrabass to the timpani.
- `k` is the largest value, in steps of 0.02 down from 1.6 / 0.95, that keeps these limits:
  each seat stays within ±90°, each footprint box keeps 0.3 m from the corner cuts, the side
  edges, the front edge, and the back edge (`boxOnStage()`), and each footprint keeps 0.05 m
  from the items of the other rows,
  the piano, the podium, and the conductor. The spread only makes the arcs of a row longer, so
  the items of one row stay apart. A check of the pairs of one row never acted in the test
  layouts or in 3,600 random layouts, so the layout has no such check, and the overlap test
  checks all pairs (review of step 4, P2). The left side spreads first. The choir and its risers keep their places.
  In the reference image, the seats reach ±90°, and two neighbors are 1.1 to 1.7 m apart.
- After its spread, row 1 moves its back desks toward the first desks of their seats in row 0,
  as the wedges of the strings of a professional orchestra (the wedge pass). The target angle of
  a back-desk player is the middle angle of the first desk of its seat. The players of one seat
  keep their packed arcs around it. Then a pass from 0° to the outside keeps each packed arc
  between two neighbors, and the packed arc from 0° to the innermost player, as a minimum. Each
  side of row 1 takes the largest blend `λ`, in steps of 0.1, between the spread angles
  (`λ = 0`) and the target angles (`λ = 1`) that keeps the limits of `k` (above). The rows
  behind row 1 spread after the pass. The arcs of row 1 can then be longer than 1.6 m.
- With the section size "Auto", the blends are: Beethoven 0.3 on the left and 0.9 on the right,
  Boulanger 0 and 1.0, Grieg 0 and 0.4, K. 315 0 and 0.5, and K. 488 0 and 0.8. The stage edge
  stops the first violins of row 1, and the harp stops the second violins of Boulanger. In
  Beethoven, the back-desk cello sits at 71°, behind the cellos of row 0 at 61° and 90°. With
  the spread alone, it sat at 30°, behind the violas. These values are for the demos of
  2026-10-05 before the user decision of that day (8.2). The test of the wedges now reads the
  Beethoven 9 demo.
- Thus the strings reach the side edges, as in the reference image. The near corner is 0.164 to
  0.273 S from the nearest seat for the six demos of 8.2, and 0.205 S for `perf-60.mid`. Before
  the user decision of 2026-10-05, it was 0.164 to 0.258 S for the five demos of that day. A row that sets
  the width (`2 × L`) cannot spread, so the back corners of the width-bound demos stay empty.
  A rectangular stage would remove them, and 4.1 keeps the square stage (review of step 4, F1).

```typescript
/** The limits of the spread of a row. */
interface SpreadLimits {
  /** The largest angle of a seat from 0°, in radians: 90°. */
  readonly maxAngle: number;
  /** The largest arc between two neighbors of a row, in meters: 1.6. */
  readonly maxArc: number;
}
```

The **footprint** of a player is one box for the parts of each bone in each band of 0.2 m of
height, in the bind pose, and the box of its seat. Thus the ears of the elephant, a tilted
cello, and the kettles of the timpani each have their own boxes. A music stand has a box for each
leg, the post, and the desk. A riser level has a box for each part of 5° of its arc. The overlap
test of `models/` places the footprints of all items of each demo layout, with each section
size, and of the 60 players of `perf-60.mid` (9.5). No two items touch, and each item is on the
stage.

| Row | Sections, from left to right |
|---|---|
| 0 | the first desk of: violins (first seat), violins (second and later seats), violas, cellos |
| 1 | the other desks of: violins (first seat), violins (second and later seats), violas, cellos |
| 2 | a keyboard of the orchestra (4.2), harp, flutes, oboes |
| 3 | horns, clarinets, bassoons, trumpets |
| 4 | percussion, contrabasses, timpani, trombones, tuba |
| 5 | choir, on the risers |

The rows follow the American seating with the contrabasses in a line at the back (4.2). With
the section size "Auto", the stage sides are: Boulanger 11.28 m (11.29 m with the neck tube, 11.19 m with the celesta at the
front left, and 11.80 m with the rows of step 4), Beethoven 9 11.84 m (11.62 m before the steps of
the risers of 2026-10-07, and 11.18 m with the vocal soloists in the choir), Eine kleine Nachtmusik
6.71 m, Bach 10.43 m, Beethoven 8 9.90 m, and K. 315 9.02 m (9.03 m with the neck tube, 8.98 m with the soloist 0.3 m to the front, 8.75 m with the first place of the
soloist, and 8.10 m). The choir test file gets 12.18 m (11.96 m before the steps of the risers, 11.98 m before the blend of the tail joint, and 12.00 m), and `perf-60.mid` 13.67 m (13.45 m before the steps of the risers, 13.41 m before the plump torsos, 14.73 m). The
demos that the user removed on 2026-10-05 (8.2) had Beethoven 5 9.96 m (10.05 m), Grieg 7.89 m
(7.32 m), and K. 488 9.55 m (8.91 m). In each orchestral demo, row 0 holds eight players, and
its radius is 3.36 m. Two cellos with their shared stand need 1.67 m of arc, so the right side
of row 0 sets the radius.

**Soloist.** The soloist of 3.8 stands outside the arcs, at the front left of the conductor
(4.2). A piano soloist sits at the piano (below). Another soloist stands or sits at 1.75 m to the
left of the podium center and 0.35 m toward the front. It faces the audience and turns 40° to
the conductor: its facing is 220°, and its front points to (0.64, 0, 0.77). Thus the default
view of 4.5, at the azimuth 30°, sees its face, and the soloist sees the conductor at its side.
The flute points away from the conductor, to the left of the audience. The agent chose these
values on 2026-10-06, and changed them after the second UX audit (2026-10-06, N1):

- The default view sees the first desk of the violins beside the soloist. A test draws the
  silhouettes of the soloist and of the first desk in each wide view of 5.6 at 1440 × 900. In
  the default view, with each section size, the K. 315 flute hides at most 8.9% of a first-desk
  player, and 4.4% of its head, arms, and violin. At the first place, 0.05 m to the front and
  turned 30°, it hid 17% of the second player of the first desk. With the wider heads of the
  cute face (2026-10-07), the place 1.8 m to the left and 0.3 m to the front hid 10% of the
  first violin. In the three other wide views
  with "Auto", a soloist hides at most 6% of the head, the arms, and the violin of a first-desk
  player. The frontal view sees the solo violin of the concertino of the second audit
  (`score/test-audit-files.ts`) in front of the first fox of the string ensemble: 20% of the
  fox, and 42% with "One per part", whose smaller rows put the fox right behind the soloist.
- A place farther left keeps a player of the first desk behind the soloist in some wide view,
  because the spread moves the first violins to the left edge. "One per part" puts the first
  desk on a smaller row, so a place 2.0 m to the left hid 39% of a first-desk player there. A
  place nearer to the conductor (1.4 m) put the middle of the bear into the frame of the solo
  shots of the flute.
- 0.35 m to the front moves the front edge forward, so the stage of K. 315 has the side 9.03 m
  (8.98 m at 0.3 m, and 8.75 m at the first place). At 0.05 m, the front of the flute and its player was 0.3 m from
  the front edge at `F` = 1.0 m.
- The turn of 40° keeps the middle of the bear 10% of the half width outside the frame of each
  solo shot of the K. 315 flute (`shots/shot-frames.test.ts`). With 30°, the margin was 1%.
- The rows keep 0.05 m from the soloist, as from the piano. The first violins of K. 315 sit
  behind it, as in the stage of a concerto.

A piano soloist stands outside the arcs. Its center (the center of the box around the case and the
open lid) is 2.0 m to the left of the podium center and 0.8 m toward the front. Its long axis
runs along x, with the keyboard at the left end. The pianist sits on the bench to the left of
the keyboard and faces +x, toward the conductor, as in a concerto. The conductor is ahead of the
pianist and a little to the left, and the audience sees the right side of the pianist. The lid
opens to the right of the pianist, to the audience. The pianist turns the head to the conductor
for cues.

A keyboard of the orchestra (4.2) is the leftmost member of row 2. It turns a quarter turn to
the left from the facing of its row: the pianist faces along the arc toward the middle of the
stage, and the case and the bench lie along the row. At 0°, this is the facing of the piano
soloist: the pianist faces +x, and the lid opens to the audience. The agent chose the turn on
2026-10-06 (UX audit 2026-10-06, N1). Facing the podium, the case of 2.3 m with the bench
pointed into the rows in front, and the row moved back. The celesta of Boulanger sits at -44°
and 5.9 m from the podium center, beside the harp. The harpsichord of Bach is the only member of
its row, so it sits behind the second and third violins, near the middle.

**Chamber group.** A chamber group (4.2) has no conductor and no podium, and the podium center
is only the center of its arc. The agent chose these values on 2026-10-06 (UX audit 2026-10-06,
N9):

- **Arc.** The players stand in one row centered on 0°, as a row of the orchestra, with the seat
  arcs and the stands of the seat geometry above. The radius is at least 2.4 m, the radius of
  row 0. It grows in steps of 0.02 m until each side of the row, with the room of its end
  players, spans at most 60°. Each player faces the podium center, so the players face each other
  a little: each of two players turns 11° to 13° from the audience to the middle, and the ends of
  the quartet test file turn 36°. The arc has no spread and no wedge pass. A keyboard turns a quarter turn, as a keyboard of
  the orchestra, so its case lies along the arc. A piano and a string quartet need a radius of
  more than 2.4 m.
- **Solo.** The player stands at 2.4 m behind the podium center, where the middle of the arc
  would be, and faces the audience (its facing is 180°). A pianist sits at the piano, with the
  center of the case there and the facing of a piano soloist.
- **Recital.** The case center of the piano is at that point. The partner stands 0.45 m from the
  case center toward the tail, in front of the curved side of the case, and moves toward the
  audience in steps of 0.02 m until it keeps 0.05 m from the piano. It faces the audience and
  turns 25° to the pianist: its facing is 155°. It has no music stand, as the soloist above.
- **Stage.** The rule of the stage origin applies from the middle of the group in place of the
  podium center: each seat needs 0.5 m for the chair and 0.3 m of margin on each side, and each
  footprint box 0.3 m. `S` is at least 5 m, and the middle of the group moves to the stage
  center. The test files of `models/test-chamber.ts` and the piano solo of the audit give 5.00 m
  (the piano solo, the duo of a violin and a piano, and the string quartet) and 5.02 m (the wind
  quintet). With the conductor, the piano solo and the duo had 8.06 m, and the quintet 5.63 m.
- No demo of 8.2 is a chamber group with a section size of 2.8: Eine kleine Nachtmusik has 9
  players with "Auto" and with "One per part", and 14 with "Full".

## 4.6 Model inventory

| Section | Instrument model | How the player holds it | Seat |
|---|---|---|---|
| violin | violin and bow | under the chin on the left shoulder, bow in the right hand | chair |
| viola | the violin model at 1.15 scale | as the violin | chair |
| cello | cello and bow | between the knees, end pin on the floor | chair |
| contrabass | the cello model at 1.6 scale | at the left side, bow in the right hand | high stool |
| harp | concert harp | between the knees, both hands on the strings | stool |
| piano | grand piano (also for the celesta and the organs) | both hands on the keys | bench |
| flute | silver tube (also for the piccolo and other pipes) | horizontal, to the right | chair |
| oboe | thin dark tube with a small bell | in front of the mouth, 30° forward from the vertical | chair |
| clarinet | black tube with silver rings, keys, and a bell | in front of the mouth, 25° forward from the vertical | chair |
| bassoon | tall wooden tube with a bocal | diagonal across the body | chair |
| horn | coiled tube with a bell | in the lap, right hand in the bell | chair |
| trumpet | tube with a forward bell | horizontal, forward | chair |
| trombone | tube with a slide and a bell | forward; the slide moves with the pitch | chair |
| tuba | large tube with an upward bell | in the lap | chair |
| timpani | two to four kettles, by the pitch range of the file | two mallets | stands |
| percussion, bass drum player | bass drum on a stand | one beater | stands |
| percussion, snare drum player | snare drum on a stand | two sticks | stands |
| percussion, cymbals player | a pair of crash cymbals | one cymbal in each hand | stands |
| percussion, small percussion player | a triangle and a tambourine | the triangle and its beater for keys 80, 81, and all other keys; the tambourine for key 54 | stands |
| percussion, mallet seat (programs 9-15, 112-119) | xylophone | two mallets | stands |
| choir | a music folder | both hands | stands on the risers |
| conductor | baton | right hand | stands on the podium |

`castScore(score)` of `models/cast.ts` gives each player its species (4.3) and its instrument.
A drum player gets the instrument of the first key group that it plays, in the order of 3.8. The
key group of a note uses the first drum kit of its seat. The kettle count of the timpani comes
from the highest note of the timpani seat.

```typescript
/** The species and the instrument of one player. */
interface PlayerCast {
  /** The index of the seat in `Score.seats`. */
  seatIndex: number;
  /** 0 is the principal player of the seat. */
  player: number;
  species: SpeciesId;
  instrument: InstrumentId;
  /** The kettle count of the timpani. The other instruments ignore it. */
  kettles: 2 | 3 | 4;
}

/** Pure. One entry for each player, in the order of `ScenePose.players` (5.1). */
declare function castScore(score: Score): PlayerCast[];
```

The violin is 0.51 m long, with a body of 0.305 × 0.171 m. The bow is 0.57 m long. The values fit
the animals of the reference image. The body is a plate with round edges and an arched top
(`plate()` of `models/primitives.ts`), with two f-holes beside the bridge, as the instruments of
the polished images. The new parts keep the box around the instrument of the first slab, so the
seat rows and the stage do not change.

- The violin and the bow keep the first model sizes of step 3 (violin 0.40 m, bow 0.45 m), which
  fit a rabbit with `H` 0.30 m. The builder scales them by the head height of the rabbit divided
  by 0.30: 1.27 at `H` 0.38 m. The table below gives the other instruments in meters at `H`
  0.38 m. A later change of `H` must scale them by the new `H` divided by 0.38. The chairs, the
  stands, the podium, and the steps keep their sizes in meters.
- The player holds the violin under the chin. Its tail end is 0.1 H to the left of the head
  center, 0.6 H below it, and 0.3 H in front of it. The violin points 70° to the left of the
  front and 8° down. Its top plate turns 50° from up to the front, so the audience sees it.
- The bow plays 0.14 m from the tail end, between the bridge and the fingerboard.

**Sizes and holds**

The hold gives the place of each piece in the bind pose of 4.7. An offset in `H` uses the head
height of the player. The model axes of 4.7 apply: the player faces -z, and its left is -x.

| Instrument | Size in meters | Hold in the bind pose |
|---|---|---|
| Violin | 0.51 long, body 0.305 × 0.171. Bow 0.57. | Under the chin (above). The stick lies in the fingers of the hanging right hand: 0.127 H to the inner side of the middle of the palm and 0.005 H above it, in the crease between the palm ball and the finger ball, 0.02 H from each with the fingers curled 45°. The bow points to the front (the side of the thumb), and the hair faces the inner side, away from the palm. The first grip was 0.07 H in front of the palm, inside the palm ball. The stick went through the hand, and its frog end went up to 0.13 H into the forearm of the dog (user report of 2026-10-06). |
| Viola | The violin at 1.15 scale: 0.59 long. The violin bow. | As the violin. |
| Cello | 1.20 from the tail end to the scroll, body 0.72 × 0.41. End pin 0.20. Bow 0.63. | The end pin stands 0.42 H + 0.44 m in front of the seat center and 0.085 m to the right. The cello leans back 25° to the chest, then 25° to the left, so that its neck passes the left of the head, as in `animals.webp`. The top plate faces (0.35, 0, -1), the front and a little to the right. The bow as on the violin. |
| Contrabass | The cello at 1.6 scale: 1.92 to the scroll, end pin 0.32. The cello bow. | At the left side: the end pin stands 0.2 H - 0.03 m to the left (0.07 m for the hippo) and 0.5 H + 0.25 m in front of the seat center. The axis leans along (-0.265, 1, 0.225), back to the player and to the left, so that the neck passes the left of the head. The top plate faces (0.55, 0, -1), the front and to the right. |
| Harp | 1.40 tall and 0.76 deep. 24 strings show the 47 strings of a concert harp, C1 to G7. | Between the knees: the base stands 0.15 H to the right of the seat center and 0.53 m in front of it. The harp leans back 12° to the player, and it turns 38° around the vertical: the top of the soundbox comes to the right shoulder, and the column goes to the front left. Thus the neck passes the right side of the face. With no turn, the neck went through the face of the deer (review of step 5, U1). The left hand plays from the left side of the strings, and the right hand from the right side. |
| Piano | A case of 1.40 × 2.0 from the front of the keys. The rim is 0.62 to 0.95 high, and the tops of the white keys are at 0.70. The 52 white keys fill 1.24. The lid opens 35° to the right of the player. At 45°, as the lid of `mockup.png`, it hid 26% and 55% of the heads of two horn players behind the piano in the default view of the default demo (scene details of 2026-10-07). | The front of the keys is 0.55 H + 0.05 m in front of the seat center. |
| Piano bench | A seat of 0.75 × 0.35 at 0.45, the first seat height of a chair. The white keys at 0.70 fit it, so the bench keeps it. | A static prop under the pianist, as a chair. |
| Choir folder | Two covers of 0.20 × 0.27, open 150°, with pages in the sheet music color. | In both hands, 1.0 H below the head center and 0.75 H in front of it. It leans back 35°, so that the pages face the eyes. |
| Flute | 0.57 long. | The hole of the lip plate is at the mouth. The flute points to the right, 10° to the front and 8° down. |
| Oboe | 0.55 long, with a small bell and metal keys. | The tip of the reed is at the mouth. The oboe hangs to the front, 30° from the vertical. |
| Clarinet | 0.57 long, with the black mouthpiece, silver rings and keys, and a bell. | The tip of the mouthpiece is at the mouth. The clarinet hangs to the front, 25° from the vertical, as in the reference image. |
| Bassoon | 1.15 long, with the boot, the wing joint, and the metal bocal. | The tip of the reed is at the mouth. The bassoon leans 35° to the left across the body, with the boot at the right hip. Its tube passes the left side of the head. |
| Horn | A coil 0.26 wide that leans back 20°, and a bell 0.26 wide. 0.59 from the mouthpiece to the bottom of the bell. | The mouthpiece is at the mouth. The coil stands low in front of the right side of the chest, with its middle 0.08 m to the right of the mouth and 0.10 m in front of it, and the bell opens to the right and to the back, above the right thigh. The hold turns the horn around the mouthpiece, with its lower end 10° forward and 10° to the right. With no turn, the coil and the bell went 0.17 H into the right thigh of the pig. The right palm is in the bell, and the left palm is on the valves. With the coil middle 0.24 m in front of the mouth, the left palm was out of reach of the arm (1.16 of 97% of the reach, review of step 4). |
| Trumpet | 0.41 long, with three valves and a bell 0.10 wide. | The mouthpiece is at the mouth. The trumpet points forward and 5° down. |
| Trombone | 0.95 long when closed, with a bell 0.18 wide. The slide moves 0.55 from the first position to the seventh. | The mouthpiece is at the mouth. The slide points forward and 15° down, with the bell at its left. The slide is a second piece on the `slide` bone, and the right palm holds its brace. |
| Tuba | 0.95 tall, with a bell 0.42 wide that opens up. | The mouthpiece is at the mouth, 0.72 m above the bottom bow. The body stands in the lap, and the bell is at the left of the head. |
| Timpani | Two to four kettles, the largest first, with heads 0.57, 0.52, 0.46, and 0.41 wide at 0.72. These are 0.7 of the real 32, 29, 26, and 23 inch kettles. The kettles play D2 to A2, F2 to C3, B♭2 to F3, and D3 to A3. Two kettles when the highest timpani note is C3 or lower, three up to F3, else four. Four kettles fill 1.82 × 0.96. Mallets 0.30 with felt balls. | The kettles stand in an arc of radius 0.72 around the player, the largest at the left, with 0.06 between their corners. A mallet in each hand. |
| Bass drum | 0.70 wide and 0.32 deep, on a frame, with its top at 0.87. A beater of 0.32. | At the front left of the player, with its middle at (-0.22, 0.52, -0.42). Its right head turns 30° from the right side to the player. The beater is in the right hand. It strikes the middle of the right head at 0.52, below the shoulders of the badger (0.63), so the drum keeps its place. |
| Snare drum | 0.30 wide and 0.13 deep on a tripod, with the top head at 0.48. Sticks of 0.30. | 0.55 in front of the player. A stick in each hand. The head is 0.15 below the shoulders of the badger, so the sticks slant down to it. At 0.62 and 0.33, the sticks struck the head from below, and the wrists went into the belly. |
| Cymbals | Two crash cymbals 0.40 wide, each with a strap. | One cymbal in each hand, with the inner faces to each other. The model has no instrument piece. In the bind pose, the strap is 0.12 m above the palm, so that the rim stays above the floor. With the strap at the palm, the rim of the meerkat cut 0.08 m into the floor (review of step 4, P1). |
| Small percussion | A triangle with sides of 0.17, and a metal beater of 0.15. A tambourine 0.22 wide on a tripod, at 0.48 (was 0.75, above the shoulders of the badger). | The triangle hangs from the left hand, and the beater is in the right hand. In the bind pose, the triangle points forward from the hand, as a mallet does, because it hung 0.08 m into the floor. The tambourine stands at the front right of the player, with its middle at (0.30, 0.48, -0.45), and leans 30° to the player. The beater in the right hand strikes it for key 54. |
| Xylophone | 30 bars from C5 to F7 at 0.48, on a frame with four legs. The natural bars are in the front row, 0.04 apart, and 0.30 to 0.17 long. The sharp bars are in the back row, 0.02 higher. 0.78 wide. Mallets of 0.30. | In front of the player, with the front edge of the bars 0.40 away. A mallet in each hand. A mallet strikes a natural bar at its middle, and a sharp bar 0.04 from its near end. The bars are 0.15 below the shoulders of the badger. At 0.72 and 0.30, the mallets struck the bars from below, and the wrists went into the belly. |
| Baton | 0.51 long with the handle. The first baton of 0.40 looked short (UX audit 2026-10-05, AM1). | In the right hand. |

In the bind pose, each mallet, stick, beater, the triangle, and the baton lies in the hanging
hand, 0.07 H in front of the palm, and points forward. No vertex of a player model is below the
floor: a test checks each species with each instrument.

**Instrument data**

`models/instruments/` builds each instrument as pure data with no scene-graph object of Three.js
(7.1).
`buildInstrument(id)` gives an `InstrumentModel`:

```typescript
interface InstrumentModel {
  id: InstrumentId;
  /** The parent of the `instrument` bone: `chest` or `root` (4.7). */
  parent: 'chest' | 'root';
  /** The rigid pieces. The main piece is first. */
  pieces: readonly InstrumentPiece[];
  /** The palms, the mouth, and the chin, as points on the pieces. `null` if not used. */
  grips: { palmL: PiecePoint | null; palmR: PiecePoint | null; mouth: PiecePoint | null; chin: PiecePoint | null };
  /** The points and lines that the arms and the mallets aim at in step 5. */
  targets: readonly PlayTarget[];
  /** The size of the box around the main piece, in meters. */
  size: Vec3;
}

interface InstrumentPiece {
  /** One bone of 4.7: `instrument`, `slide`, `bow`, `malletL`, `malletR`, or `baton`. */
  bone: InstrumentBone;
  /** Corner lists with a color and a finish, in the piece axes, in meters. */
  parts: readonly InstrumentPart[];
  /** The place of the piece in the bind pose. */
  hold: {
    anchor: 'floor' | 'head' | 'mouth' | 'palmL' | 'palmR' | 'instrument';
    /** The offset from the anchor in head heights, then in meters. */
    offsetH: Vec3;
    offset: Vec3;
    rotation: Quat;
  };
}
```

- Each piece is rigid and follows one bone (4.4). The origin of the piece axes is the bind
  position of its bone. Thus step 5 turns a mallet around the palm, and a bow around its grip.
- `holdInstrument(model, body)` places the pieces on the points of one body: the head center,
  the mouth, the two palms, and the floor under the middle of the body. The anchor `instrument` puts a piece in
  the axes of the instrument piece, for the trombone slide. `attachInstrument()` also adds the
  parts to the mesh of the player and gives the bind position of each bone. Thus one function
  attaches each instrument to each species.
- A target is a point or a line on a piece, with the unit normal of its surface. A line that
  follows the pitch, such as the piano keys, also gives the MIDI keys at its two ends.
- The white keys of the piano and the natural bars of the xylophone are evenly spaced, so a
  pitch is not linear along their lines. `pianoKeyPosition(key)` and `xylophoneBarPosition(key)`
  give the point of each key and the point where a mallet strikes each bar.
- The 24 strings of the harp show the 47 strings of a concert harp evenly. A pedal raises a
  string by a semitone, so a sharp plays on the string of the natural below it.
  `harpStringPosition(key)` gives the middle of the string of a key.
- `buildInstrument('timpani', kettles)` builds the largest kettles. `kettleCount(highestKey)`
  gives their number from the highest timpani note of the file.
- The trombone slide moves along its axis. A bone rotation cannot move it, so the pose has a
  move of the `slide` bone, `AnimalPose.slideOffset` (5.1), in addition to the rotations. The
  move follows the target `slide`.

## 4.7 Rig

Each player has one skeleton. A vertex follows one or two bones (4.4):

- The mesh data (`MeshData` in `models/mesh.ts`) gives each corner a main bone (`bones`), a
  second bone (`blendBones`), and the weight of the second bone (`blendWeights`), from 0 to 0.5.
  The main bone has 1 minus this weight, so it is the bone with the larger weight.
- A rigid part follows one bone: the second bone of each corner is its main bone, with the
  weight 0. The instrument pieces, the eyes, the ears, the hands, and the feet stay rigid.
- A skinned part gives a skin rule (`SkinRule`). The rule reads the bind position of a corner
  in the model axes, after the placement of the part, and gives its two bones and the weight.
  The two bones are a parent and its child. `blendSkin()` makes the bone with the larger weight
  the main bone.
- The GPU blends the two bones linearly: `skinIndex` is `(bone, blendBone, 0, 0)` and
  `skinWeight` is `(1 - w, w, 0, 0)`. The vertex shader of three.js always blends four bones, so
  the second bone adds no shader work.
- The readers of the bind mesh read the main bone: the footprints, the chair clearance, the
  baked occlusion (4.5), the silhouettes, and the triangle budgets.
- `posedCorner()` of `pose/test-skin.ts` poses a corner in the tests as the GPU does. A test
  compares it with the CPU skin of three.js.
- The plan `docs/research/2026-10-06-skinned-bodies-plan.md` adds the skinned parts in stages.
- Each arm is one skinned tube. Its corners follow `upperArm` above the elbow band and
  `forearm` below it, and the ring at the elbow joint follows both with the weight 0.5. A rigid
  filler ball on `forearm` fills the outer side of a deep bend. The dome over the shoulder joint
  stays rigid on `upperArm`, with no port in the torso
  (`docs/research/2026-10-06-shoulder-spike.md`).
- Each long tail is one skinned tube. Its corners blend `tail1` into `tail2` with
  `smoothstep(-0.08, 0.08)` H by their distance past the plane of the joint ring.
- Each leg is one tube that splits at the knee into a part on `thigh` and a part on `shin`. The
  two parts share the ring at the split, so the weld of the normals joins them. No pose turns
  the legs, so the parts need no blend.

```typescript
type BoneName =
  | 'root' | 'hips' | 'spine' | 'chest' | 'neck' | 'head'
  /** Opens for the choir. */
  | 'jaw'
  /** Scale on Y for blinks. */
  | 'eyeL' | 'eyeR'
  | 'earL' | 'earR'
  /** Only if the species has a tail. */
  | 'tail1' | 'tail2'
  /** Only for the elephant. */
  | 'trunk1' | 'trunk2' | 'trunk3'
  | 'shoulderL' | 'upperArmL' | 'forearmL' | 'handL' | 'fingersL'
  | 'shoulderR' | 'upperArmR' | 'forearmR' | 'handR' | 'fingersR'
  | 'thighL' | 'shinL' | 'footL' | 'thighR' | 'shinR' | 'footR'
  /** Parent: `chest` for the violin and viola, `root` for floor instruments, `chest` for winds and brass. */
  | 'instrument'
  /** Children of `handR` or `handL`, as the instrument needs. */
  | 'bow' | 'malletL' | 'malletR' | 'baton'
  /** Child of `instrument`, for the trombone. */
  | 'slide';
```

- The arms use analytic two-bone IK (upper arm and forearm). `poseAt()` calculates the hand
  targets on the instrument: the bow frog, the fingerboard position of the pitch, the keys, the
  mallet heads, and the piano keys.
- `fingersL` and `fingersR` curl as one block. On a wind instrument, they move on each note.
- The legs keep a seated or standing pose. The idle motion moves only the spine, the head, the
  ears, the eyes, and the tail.
- The conductor uses the same rig, with the baton in the right hand.
- The torso splits at the height of the `chest` bone. The lower part follows `spine`. The upper
  part follows `chest`, as the shoulders, the arms, and a violin do, so that a rotation of
  `chest` moves them together.
- The skeleton of the species (4.3) gives the bind positions of the joints: the head center,
  the shoulder joints, the elbows and the wrists, the hip joints, and the seated knees. The
  height map of 4.3 moves the `hips`, `spine`, `chest`, and `neck` bones and the blend bands of
  the torso with the shoulder joints. A test pins a hash of the skeleton of each species
  (`models/skeleton-snapshot.test.ts`).
- Each skeleton has all bones of the list, so a bone has the same index in each player. A bone
  with no part, such as the trunk of a rabbit, moves nothing.
- In the bind pose, no bone has a rotation. The body sits on its seat: the haunches lie on the
  seat, the thighs point forward and a little down to the knees, the shins hang down, and the arms
  hang down beside the body. The legs have no bone for the hock or the paw: no pose turns the legs,
  so a rigid part on `foot` stays in its place (decision D3 of
  `docs/research/2026-10-07-animal-anatomy-plan.md`). The `foot` bone of a digitigrade or hoofed
  leg is at the hock, and the long bones of the foot and the paw are rigid parts on it. The instrument is in its playing
  place on its bone, and the bow lies in the hanging right hand.
