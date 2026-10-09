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
The knees are closer than in the sheet. The front
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

Stage P4a gives the hippo of the contrabasses wider shoulders and hips. The hippos of
`orchestra-latest.png` and `orchestra-side.png` stand at their contrabasses, with a body about
1.6 to 2.1 Hv wide with the arms, 1.0 to 1.3 m against the contrabass. Ours was 0.82 m. The hippo keeps its H and its
heights, and gets these values:

| Value | Default | Hippo |
|---|---|---|
| `shoulderSpread` | 0.52 | 0.6 (0.31 m from the middle) |
| `hipSpread` | 0.32 | 0.36 |
| `upperArm` | 0.7 | 0.76 |

With the shoulders 0.6 from the middle and the upper arm of 0.7, the bow arm reached the hair of
the contrabass only from 0.04 m (limit 0.03 m). With 0.76, it reaches it from 0.03 m, and the
left hand reaches the fingerboard from 0.06 of its length (0.13 before). The hippo keeps the
high stool (4.6). A standing hippo, as in the scenes, failed 12 of 2,180 tests: the head
touched the neck of the contrabass, the bow went 0.013 m into the right forearm, the rest bow
went into the hips, and the bow hand turned faster than 1,000° a second in the lift.

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
  repository, so CI needs no Blender. The tan fox, the wolf, the dog, the cat, the rabbit, the
  polar bear, the bear, the panda, and the hippo have a sculpt. The red fox has a rigged body
  (below), and `pnpm sculpt --all` builds no sculpt for a species with a rigged body.
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
- The recipe of the red fox (`tools/blender/fox_red.py`) gives the forms of the tan fox below.
  The red fox itself has the rigged body of route B (below). The recipe follows
  `fox-views.png` on the skeleton of 4.3: a skull 0.94 wide and 0.88 high
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
- The tan fox has the forms and the large eyes of the recipe of the red fox. Its accent ears,
  hands, lower legs, and feet (`#755035`) and its amber iris come from its species (4.5).
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
- The cat has its own recipe family (`tools/blender/feline.py`), which uses the arms, the hands,
  the legs, the ears, and the eyes of the dog family. It follows the cats of `orchestra-side.png`
  and `orchestra-latest.png` on the default skeleton (4.3). The skull is 0.9 wide with a flat
  crown 0.8 wide, 0.52 above the head center. The cheeks flare out under the eyes to a width of
  1.12, 0.16 below the head center. The ears are 0.42 above their bone, with a base from the
  corner of the crown down the side of the head (0.1 above to 0.12 below the bone), turned 15°,
  and a pink inside of 0.72 of the ear. The amber almond eyes are 0.18 × 0.11 with a pupil and a
  light, 0.05 above their bones. The short muzzle is two round whisker pads (radius 0.12, 0.1
  from the middle) over a small chin, and a small pink nose that is wider at the top. The muzzle
  and the chin have the belly color in front of a plane 0.34 in front of the head center, below
  0.12 under it, and within 0.26 of the middle. The torso is plain fur with no bib. The hands,
  the lower 0.12 of the forearms, and the paws have the belly color (`hand_region`,
  `paw_region`). The thin tail follows the path of the thin parametric tail. The hands grow 0.05
  to their backs and the finger balls 0.03 up the hand, as the dog, so that the viola bow keeps
  0.015 from the palm. The crown form is 0.02 higher than its first place, because the decimate
  left the crown 0.4978 above the head center. The sculpt has 2,402 triangles seated and 2,418
  standing.
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
- The hippo has the recipe of the bears (`tools/blender/hippo.py`) on its skeleton of 4.3, and
  follows the hippos of `orchestra-latest.png` and `orchestra-side.png`. Its head is 0.97 wide
  above 0.3 below the head center, with a flat skull 0.53 above the head center, a knob under
  each small black eye on the top of the head, and small round ears (radius 0.1) 0.32 from the
  middle with a pink inside. The muzzle is a box with round corners that reaches 0.93 in front
  of the head center, with two dark nostrils of the nose color on the top of its front and a
  light tooth (`#e6d2c2`) at each corner of the mouth. The body is a pear: the belly is 1.24
  wide on the seat, and the chest form is low (0.82 above the base of the torso) and narrow
  (0.94), so that the shoulders keep 0.038 m from the neck of the contrabass (4.6, limit 0.03 m).
  With the chest form at 1.2, the shoulders touched the neck. The back stays 0.33 m behind the
  seat center, so that the rows behind keep their places: with 0.4 m, the stage of Beethoven 9
  grew by 0.08 m. The arms are soft capsules 0.4 to 0.24 thick, and the forearms keep 0.01 from
  the trunk and the legs in the rest pose with the arms of option B (5.2). The legs are thick
  columns with light nails on the feet, and the paws have no nails, because the nails of a
  hanging paw went 0.009 m below the floor on a chair. The sculpt has 2,274 triangles in each
  stance.
- A species with a rigged body (`SpeciesParams.rigged`) gets the mesh, the joints, and the skin
  of a Blender model of its own: route B of the fox spike
  (`docs/research/2026-10-08-fox-spike-gated.md`), which the user chose on 2026-10-08. The red
  fox of the violins has it. The model has silhouette gates against its model sheet, a skeleton
  of 23 bones that fits the mesh, automatic weights with up to four bones for each vertex, and a
  flat color on each face. The report `docs/research/2026-10-08-fox-b-app.md` gives the images.
  - `pnpm pack-rigged <glb> <species>` (`tools/pack-rigged.ts`) reads the GLB file from its
    path, and writes `models/rigged/<species>.ts`. It turns the axes of glTF into the axes of
    the model, maps the 23 bones onto the bones of the player (4.7), puts the eye triangles on
    `eyeL` and `eyeR`, and welds the vertices by their place and their skin. A position is a step
    of 0.25 mm, and a weight a step of 1/255, with the four weights of a vertex adding up to 1
    and the largest first. The module also holds the joints in the pose of the mesh, a tip of
    each hand bone, and the tip of the nose. `decodeRigged()` of `models/rigged.ts` reads it
    back. The command prints the size of the module, and the doc comment of the module names its
    GLB file.
  - Each paw of the model follows only its hand bone, so that it turns with the wrist, and the
    end of the forearm bends at the wrist (the part mask of `tools/spike/fox-gated/rig.py`).
    Bone heat alone gave most of the left paw to the forearm.
  - Each palette color of the model gets the color of the species on the stage (4.5): the fur
    `#ac6236`, the white fur `#eee2e0`, and the dark brown `#603a2a` with the `fur` finish, the
    nose `#2a1d15` with the `matte` finish, and the eyes in the colors and the `lacquer` finish
    of the sculpts. The packer gives each material the role of the nearest palette color.
  - `buildRigged()` of `models/rigged-body.ts` builds the body on each seat with the drop of
    0.35 m from the seat to the feet, as a sculpt. On another support, for example the standing
    violin soloist, the body is parametric, because the model has no standing legs.
  - The mesh has the seated playing pose of the model sheet, and the bones get the rest
    skeleton of the pose code (4.7). Thus the holds, the IK, and the idle motion of section 5
    drive the rigged body with no change.
  - The body points come from the mesh. The head center has the height of the head center of
    the skeleton of the species (4.3), between the eyes, and halfway from the eyes to the back of
    the head. At the height of the eyes, the violin rose 0.12 H, and the bow hand went 0.04 H
    into the muzzle at the frog of the lowest string. The mouth is 0.12 H below and 0.03 H behind
    the tip of the nose. The paw is the part of the forearm and the hand past the wrist, because
    Blender weights much of the left paw on the forearm. The skin of the arm bones moves the paw
    to the rest skeleton. In the rest skeleton, the bow stick runs along z on the palm side of
    the right paw. It keeps the gap `GRIP_GAP` of `models/rigged-body.ts` from the forearm and
    the hand, and the grip is its point nearest to them. Thus the stick lies against the posed
    paw along its full length, as against the parametric mitten. A palm under the farthest point
    of the paw left the stick far from a slim paw, and a gap at the grip alone put the frog end
    of the stick into the paw (`docs/research/2026-10-08-fox-arms.md`). The left palm lies
    `PALM_INSET` under the farthest point of the paw on the palm side, so that it stays under the
    strings.
    The finger block is the middle of the paw, so that the strings pass through the paw, as the
    neck of the violin in the sheet.
  - The footprint follows the mesh: the arms of the playing pose and the tail on the seat. The
    instrument and the bow keep their places of the rest skeleton, so the bow in the hanging
    right hand reaches in front of the seat, and the stage grows with it.
- Each player is one `SkinnedMesh`. The generator merges the body, the instrument, and the bow
  into one mesh. Each vertex follows one or two bones, or up to four bones in a rigged body
  (4.7). A rigid part follows one bone. A
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

One world unit is one meter. The values of this section live in the code files that each block
names. A block gives the rules, the intent, and the reasons, and the research reports and the
decision files keep the measures of each tuning.

The colors come from samples of the reference images. Design 1 says which image wins where they
differ. An image shows lit and shaded colors, so each base color is a little lighter than its
darkest sample.

- Tune the light first, until a screenshot of the default view looks like the reference. Change
  a base color only when a measurement shows that no light value can match the reference.
- Measure a color on the same part in a screenshot and in the reference image: the value, the
  hue, and the saturation of its lit pixels, for example the mean of the pixels from the 70th to
  the 95th percentile of the value on the lit head of a species. Compare the default view with
  `orchestra-latest.png` and `mockup.png`, and the views page (7.1) with the model sheet of the
  species.
- The warm key light adds saturation to a lit color. Thus a gray or a pale base color is a little
  bluer than its sample, as the wolf, the cat, and the hippo show.
- The decision file or the research report of each change keeps its samples:
  [`2026-10-06-polished-look.md`](../decisions/2026-10-06-polished-look.md) for the hall, the
  stage, and the light, [`2026-10-07-cast-colors.md`](../decisions/2026-10-07-cast-colors.md)
  for the cast under the light of 2026-10-07, and the reports of the model sheets:
  [`2026-10-08-fox-look.md`](../research/2026-10-08-fox-look.md),
  [`2026-10-08-dog-family.md`](../research/2026-10-08-dog-family.md), and
  [`2026-10-08-cat-hippo.md`](../research/2026-10-08-cat-hippo.md).

**Scene colors**

`SCENE_COLORS` of `models/colors.ts` holds the colors of the chairs, the music stands, and the
sheet music. `STAGE_COLORS` of `models/props.ts` holds the colors of the planks, the lip, the
skirt, the risers, and the podium. `HALL_COLORS` of `scene/hall.ts` holds the colors of the
hall, and `CLEAR_COLOR` of `scene/post.ts` the clear color behind it. The intent of each item:

- The hall is a dark, warm room, and it takes no light (hall, below). The CSS gradient of the
  page shows only before the first frame.
- The stage is a dark walnut, as in `mockup.png`, and each plank has its own tone. The key light
  gives most of the light of the planks (light and render, below).
- The raised lip around the stage top is only a little lighter than the planks, as the edge of
  `orchestra-latest.png`. A brighter lip gave a bright line around the stage under the key light.
- No direct light reaches the lip and the skirt (the four sides of the stage), so a baked light
  (`SIDE_GLOW` of `scene/stage.ts`) keeps them from black.
- The treads of the choir risers are a little lighter than the planks, because the risers stand
  outside the pool of light at the back. The plank color made a dark wall there.
- The podium is a wooden box with framed panels and a lighter top plate, as the podium of
  `orchestra-latest.png` and `orchestra-side.png`.
- The chairs are a pale yellow wood. The music stands are black, with a warm gray desk and a
  lighter edge: black desks were the largest shapes of some close shots (UX audit 2026-10-05,
  SC9).

**Species colors**

`SPECIES_COLORS` of `models/colors.ts` gives each species three colors: the fur, the belly and
the face, and the accent. The models and the seat dots of the UI read them through `SPECIES`
(`models/species.ts`), which also gives the size of each species. The sculpts and the rigged
bodies also take the colors of their species (4.4), so that the cast keeps one palette.

- All species have black eyes with a light (`EYE_COLOR` and `EYE_LIGHT_COLOR` of
  `models/species.ts`), and a dark nose (`NOSE_COLOR`), unless their accent parts include the
  nose. An iris color of the species (`eyes.iris`, 4.3) makes the eye a ring of that color around
  a black pupil, as the amber eyes of the cats, the foxes, and the wolves of `mockup.png`.
- The teeth, the tusks, and the antlers have `TEETH_COLOR` or the belly color.
- The inside of an ear has the belly color, unless the accent parts include the inner ears or the
  ears.
- The accent color goes to the accent parts of the species (table below). The face pattern of 4.3
  also has the accent color, except the middle stripe of `stripe` (the badger) and `face-disc`
  (the monkey), which have the belly color.

```typescript
type AccentPart = 'inner-ears' | 'ears' | 'nose' | 'snout' | 'horn' | 'beak' | 'arms' | 'hands'
  | 'legs' | 'lower-legs' | 'feet' | 'tail' | 'face-pattern';
```

Accent arms color the upper arms, the forearms, and a band over the shoulders, as the black arms
and shoulders of the pandas of the polished images. Accent legs color the thighs, the knees, and
the shins. Accent lower legs color the leg from the knee down, as the dark legs and hands of the
foxes of `lowpoly-animals.png` and `orchestra-latest.png`.

| Species | Accent parts | Species | Accent parts |
|---|---|---|---|
| rabbit | inner-ears, nose | cat | inner-ears, nose |
| fox, violins | lower-legs, feet, hands | hippo | inner-ears |
| fox, flutes | ears, lower-legs, feet, hands | deer | nose, feet |
| wolf | inner-ears | panda | face-pattern, ears, arms, hands, legs, feet |
| elephant | inner-ears | mouse | inner-ears |
| bear | snout | beaver | tail |
| dog | nose | monkey | hands, feet |
| pig | snout | rhino | horn |
| badger | face-pattern | meerkat | face-pattern, ears |
| penguin | beak, feet | polar bear | nose |

**Instrument colors**

`INSTRUMENT_COLORS` of `models/colors.ts` holds the colors of the instruments. The intent:

- The bowed strings are varnished wood with an arched top in a lighter red-brown, dark parts of
  near black, a light bridge, and pale bow hair. The strings are one thin strip, so that they show
  no light bar.
- The clarinet is black lacquer with silver rings and keys, as the clarinet of the wolf in
  `mockup.png`. The oboe is dark, the bassoon is wood, and the flutes are silver.
- The brass is gold. Each bell is open, so that the opening shows the lit inside of the flare, as
  the bells of the polished images.
- The timpani are copper bowls with a silver hoop, light heads, and black legs, as in `scene.png`
  (08). The drums have dark red shells.
- The piano is black lacquer with an open case. The case shows a dark well with a dark gold iron
  plate and strings, as the piano of `mockup.png` (`PIANO_INSIDE` of
  `models/instruments/piano.ts`). A gold plate on the top of the rim read as a flat gold tray.
- The stands of the drums and the hardware have the black of the music stands. The sheet music,
  the pages of the choir folders, and the baton are a warm white.

**Materials**

- All meshes share one `MeshStandardMaterial` with vertex colors and crease normals
  (`models/shading.ts`). The geometry calculates the normals one time for each model.
- The corners at one point weld into one vertex, also across two bones, so that the seam of the
  torso between `spine` and `chest` stays smooth. A corner gets the mean normal of the faces at
  its vertex that turn from its own face by at most the crease angle of its finish. Each face
  counts with the angle of its corner.
- Each triangle has a finish (`Finish` and `FINISHES` of `models/mesh.ts`): a roughness, a
  metalness, and a crease angle. The `uv` of a vertex points at the texel of its finish in a
  table of one texel for each finish. The table is the roughness map (green) and the metalness
  map (blue) of the material. Thus each player mesh costs one draw call, and each part gets its
  own roughness and metalness.

| Finish | Parts | Intent |
|---|---|---|
| `matte` | Cloth, raw wood, the stage and the props. On a body: the noses, the inner ears, the teeth, the tusks, the antlers, the horn, and the beak. | No gloss. |
| `varnish` | The varnished wood of the bowed strings. | A soft gloss. |
| `lacquer` | The black lacquer of the piano and the clarinet, and the eyes. | A sharp gloss. |
| `metal` | Brass, copper, and silver. | Sharp highlights, as the brass of the polished images. The environment map of the hall is dark, so a high metalness makes metal look black. |
| `fur` | The fur of the bodies. | Flat facets with crisp edges. |

- The fur has the crease angle 0°. Each face keeps its own normal, so the bodies show clean flat
  facets, as the animals of `lowpoly-animals.png`
  (`docs/research/2026-10-07-animal-anatomy-plan.md`, 4.2). A face that the cut of a color border
  splits (4.3) keeps one normal on both pieces, so the cut does not show in the shading. A soft
  fur looked like plastic.
- The other finishes smooth the small angles of a curved part, and keep the hard edges of a box,
  a plate, or the end of a limb. A smaller crease kept a hard line around the crown of each head.
- The stage keeps flat shading in its own material (`scene/stage.ts`), because its planks are
  flat boxes.
- The vertex colors of a player hold a baked ambient occlusion (`shadeMesh()` and `OCCLUSION` of
  `models/shading.ts`), so that the folds stay dark in the light of the hall: the neck under the
  head, the hips above the thighs, and the knees. Each nearby triangle counts as a disc that hides
  a part of the sky of a vertex, and the light of a vertex has a floor. A convex part does not
  shade itself.
- The bones of the body shade each other. An arm and a piece in a hand shade only their parent and
  their children, because a raised arm leaves the side of the torso, and an occlusion of the bind
  pose would stay there as a dark stripe. The props and the stage get no occlusion. A filler
  (`MeshData.fillers`), a rigid ball inside the skin of a joint (4.7), shades nothing, because the
  skin hides it.
- The neck band is the set of triangles with a corner on `neck`. At each vertex of the band,
  `shadeMesh()` turns each normal that points down to the horizontal, and the occlusion leaves at
  least `NECK_BAND.floor` of the light. The head is wider than the neck, so the faces of the band
  point down, and they made a dark nape and a dark collar under the chin. With the rule, the neck
  reads as a soft continuation of the head and the chest, as in `mockup.png`.
- The material has no fur shading. The user decided on 2026-10-07: no fur for now.
- Each kind of player gets its geometry one time for each scene (`createPlayers()` of
  `scene/player.ts`). `models/shading-speed.test.ts` times the shading of the players of
  `perf-60.mid` (9.7).

**Light and render**

`scene/lights.ts` holds the lights (`KEY_LIGHT`, `SIDE_LIGHT`, `FILL`, and `CONDUCTOR_LIGHT`).
`scene/light-pool.ts` holds the pool of the stage lights, `scene/beam.ts` and `models/beam.ts` the
visible beam, and `scene/solo-light.ts` the light of a solo. The decision files
[`2026-10-06-polished-look.md`](../decisions/2026-10-06-polished-look.md),
[`2026-10-07-scene-polish.md`](../decisions/2026-10-07-scene-polish.md),
[`2026-10-07-spotlight-pool.md`](../decisions/2026-10-07-spotlight-pool.md), and
[`2026-10-07-spotlight.md`](../decisions/2026-10-07-spotlight.md) give the samples of
`mockup.png`, `scene.png`, and `orchestra-latest.png`.

- One warm `SpotLight` is the key light. It stands behind the orchestra, high above the stage,
  and aims at the pool center (below). It is the only light that casts shadows. Its soft
  penumbra dims it from the axis to the edge of the cone, so the stage sides and the back corners
  stay dark, as in `mockup.png`. The shadows fall to the front and fan out to the left and the
  right, as the shadows of the chairs in `mockup.png`. Its intensity grows with the square of the
  distance to the aim point, so the aim point gets the same light on each stage size.
- The shadow camera holds each point of the stage that the cone lights, from the stage top up to
  `SHADOW_TOP` (`keyShadowFrustum()`). The shadow map size and the filter follow the tier (2.6).
  The normal bias moves each receiver along its normal past the blur disc of its tier. A smaller
  bias showed a cross-hatch on the lit faces of close shots (UX audit 2026-10-05, SC5).
- The soft shadow edge takes the samples of a Vogel disc with no turn (`scene/shadow-chunk.ts`).
  The turn by a noise of three.js showed as a dither on the lit faces of close shots (UX audit
  2026-10-06, SC5). The patch of the shader chunk fails when the chunk changes in an update of
  three.js.
- A low, nearly neutral `HemisphereLight` is the fill, so that the shadows stay deep. A warm fill
  made the shadows red.
- Two soft side lights stand high at the front corners of the hall. Each one crosses the stage
  and lights the fronts of the section on the other side, because the players face the
  conductor. The back of the bear gets the side light at a low angle and stays a darker brown, as
  in `mockup.png`. The key light from behind draws the warm edges on the heads and the shoulders.
- The light is a pool on the conductor and the middle of the orchestra, as in `mockup.png` and
  `orchestra-latest.png`. The players at the sides get less light, and the stage behind the
  orchestra is dark. A factor in the shaders of the players, the props, and the stage multiplies
  each spotlight (`poolFactor()` and `spotFactor()`): a pool with a floor around the pool center,
  and a hot spot on the podium. A separate pool light cost GPU time on each lit pixel. The pool
  center lies halfway from the stage center to the podium center, or at the stage center with no
  podium. The pool falls off only at the side edges and the front corners (user request of
  2026-10-07). The gloss of the key light gives most of the light of the planks in the default
  view, so the roughness of the stage wood (props and stage, below) also sets the width of the
  pool. The gallery pages have no pool. The patch of the light chunk fails when the chunk changes
  in an update of three.js.
- One weak spotlight lights the face of the conductor from the front and above, with no shadow,
  so that the face of the bear shows in the conductor shots (UX audit 2026-10-05, FI1).
- The visible beam (`scene/beam.ts`, `BEAM_LOOK`) is haze inside the cone of the key light
  (`models/beam.ts`). The haze fills a narrower cone with the same apex (`hazeRadius()`), because
  haze in the full cone veiled the full orchestra. The shader finds the length of each view ray
  in the haze cone, and takes a few samples of the density along it by the tier (2.6). The density
  fades toward the outline of the cone, grows with the concentration of the light where the cone
  is narrow, and drifts with a slow noise. A camera inside the cone draws the back faces, so a
  close shot also shows the beam.
- The beam reaches the stage and keeps the players clear (user reports of 2026-10-06). The
  density is low near the stage and grows with the height, so the beam is brightest at the top of
  the frame and fades toward the stage with no edge, as in `mockup.png`. A depth pass
  (`BeamDepth`) renders the depth of the scene before the scene pass, with the light effects and
  the hall hidden. The haze uses it in three rules:
  - Each view ray ends on the scene.
  - A sample of the haze fades out near the surface behind it, so the beam meets the stage
    softly.
  - An item on the stage (a player, an instrument, a stand, a chair, or a riser) gets no haze. The
    stage top, the hall, and the air keep the haze, so the beam shows behind and between the
    players down to the stage.
- The depth pass does not count as a frame of the renderer, and the scene pass after it skips the
  update of the world matrices. Thus the skeletons and the matrices update once in each frame. A
  depth at half size gave a jagged edge of haze around each player.
- Dust motes drift in the haze cone as points: more on the high tier, fewer on the medium tier,
  and none on the low tier. Too many motes read as a field of stars. The motes fade as the haze
  does. With reduced motion, the noise, the motes, and the grain stand still (2.5).
- The camera multiplies the opacity of the beam by a factor (`shots/beam-opacity.ts`, a manager
  decision of 2026-10-05). A close camera outside the cone sees the additive beam over the full
  image, and the close shots looked washed out. The factor is 1 in a wide or a high shot, and
  small in a conductor, a section, or a solo shot (5.6). In Free mode, it follows the distance
  from the camera to the stage center with a smoothstep, so that a user who orbits near the stage
  also gets a clear image.
- The solo light (`soloAim()`, user request of 2026-10-07): when the user solos one or more seats
  (2.4, 6.6), the key light, its pool, its hot spot, and the visible beam move to the players of
  these seats. They move back when no seat is soloed. The pool covers the box of the places of
  the soloed players, and its floor falls, so that the other players step back. The key light
  turns to the aim (`aimKeyLight()`) and keeps its place, as a spotlight on a stand. The beam
  leans from the light to a foot at the aim (`beamAxes()`), and the haze shader maps each view
  ray into the axes of the leaning cone. The aim comes from the solo flags and the layout alone,
  so a seek, a pause, a mute, or a new section size keeps it.
- The render loop eases the stage lights to a new aim in less than a second, and moves them at
  once with reduced motion (2.5). A new layout starts at the aim with no solo.
- An environment map gives the reflections (`scene/environment.ts`): a dark room with warm lamp
  boxes. The renderer makes it one time, and again after a restored WebGL context, because a lost
  context loses its content (review of step 8, U1). With no environment, the brass and the copper
  looked dim.
- Tone mapping is AgX, in the final pass of the post effects (below). The output color space is
  sRGB. ACES moved the dark wood to red. The gallery page keeps ACES, and the views page uses AgX
  and the grade of the final pass (7.1).

**Hall**

The concert hall around the stage (`scene/hall.ts`, `HALL`) has the hall unit `h`: the stage
side, with a minimum, so that a small stage also gets a full hall.

- A ring of flat wall faces with darker panels stands around the stage, with two balcony tiers, a
  rail with a gilded edge on each tier, lamps on each rail, and a row of low lamps on the wall, as
  in `scene.png` (1).
- The row of low lamps has a gap around the back of the hall (`HALL.wallLamps.backGap`). Lamps
  behind the stage floated in the dark above the orchestra in the default view (review of
  2026-10-07, gap 11), and `mockup.png` and `orchestra-latest.png` show no lamp there. The gap
  also keeps the lamps away from the title and the play button of the first screen (2.8). The low
  lamps at the sides stay at the edges of the image, as the warm lamps of `mockup.png`.
- Each lamp has a soft glow (`createGlows()`): a disc that faces the camera, with a Gaussian
  fall-off, additive light, and no depth write. The disc moves toward the camera by its radius,
  so the wall behind the lamp does not cut it. The bloom alone gave a lamp a halo of 1 to 2 pixels
  in the wide views. The depth passes hide the glows.
- The shell takes no light. Its vertex colors hold a baked light (`HALL_LIGHT`): an ambient part,
  plus a glow from above the stage that is stronger on the faces that point to the stage.
- The floor takes no light either. Its color holds a baked spill of the stage light that fades
  away from the stage edge (`HALL_FLOOR`), because the lights cost GPU time on the large floor.
  The floor is polished: its shader adds a reflection of the key light outside the stage, a warm
  smear in front of the podium, as in `mockup.png`.
- All faces point into the hall. A camera outside the ring, as in the default view, sees no part
  of the hall near its own direction from the ring center, so the near balconies do not stand in
  front of the stage. The vertex shader drops each cut quad and lamp as a whole, because a
  discard in the fragment shader cost the hidden surface removal of the tile GPUs of Apple.

**Post effects**

The scene renders into a target with MSAA, then the post effects make the image of the canvas
(`scene/post.ts`, `POST_LOOK`).

```text
scene ──> [scene target, MSAA] ──┬──> bloom down 1/2 ... ──> bloom up ──────────┐
                                 └──> blur prepare 1/2 ──> blur gather 1/2 ──┐  │
scene ──> [depth 1/2] ──────────────────────^ (only with a shallow focus)    v  v
          [scene target] ───────────────────────────────────────────────> final pass ──> canvas
```

- The scene target holds packed floats (R11F_G11F_B10F) with `EXT_color_buffer_float`, else half
  floats. With neither, the scene renders to the canvas with no post effects. The packed format
  halved the time of the scene pass on the development Mac.
- The bloom keeps the light above a threshold with a soft knee, and adds a blur of a number of
  levels by the tier (2.6). Each level of the upsample has its own target, because a second write
  to a target cost time on each level.
- The depth of field follows a thin lens. In a shot, the focus is the point that the camera looks
  at: the subject of the shot (5.6). The blur disc has a limit behind the focus and a smaller
  limit in front of it, so that the bear in front of a section shot is only a little soft, as in
  view 02 of `scene.png`. The aperture closes for a far focus, so the wide views keep the full
  stage sharp and skip the blur passes. The user found larger apertures and limits too blurry
  (2026-10-07).
- A separate depth pass at half size gives the depth, because the resolve of the depth of the
  multisample target cost more time. The hall keeps its own material in the depth pass
  (`allowOverride = false`), so that the pass also drops the parts of the cutaway (review of step
  8, U2). The gather takes samples on a golden angle spiral at half size, fewer on the medium
  tier. A sample behind the pixel blurs at most as much as the pixel, so a sharp subject keeps its
  outline.
- Free mode has no depth of field: its aperture is 0, so the frame skips the blur passes (user
  feedback of 2026-10-07). Its focus is the first thing on the view axis in the middle of the
  frame (`freeFocusDistance()` of `scene/focus.ts`), and it eases to a new distance.
- The final pass does the depth of field, the bloom, the tone mapping, and then a grade on the
  display values: a small lift, a gain, a blend to an S curve, and less saturation in the
  shadows. A lift of the highlights then moves each channel toward white, because AgX compresses
  the light parts and the white fur stayed darker than in `mockup.png`. Then a vignette darkens
  the corners, and a grain changes at a fixed rate each second. The wall time sets the grain, so
  a display of 120 Hz shows the same grain rate.

**Camera**

`shots/view.ts` holds the values of the camera: the field of view, the default view, the
landscape rule, the portrait rule, and the orbit limits. `shots/frame.ts` holds the frame.

- The camera is a perspective camera with a vertical field of view of 30°. The far plane is the
  current camera distance plus `3 × S`, so that a full zoom-out still shows the stage. Update it
  when the distance changes.
- The default view stands on the audience axis and sees the back of the conductor, as
  `orchestra-latest.png` (1). `orchestra-latest.png` wins over `mockup.png` for the default view:
  it shows the full stage with the podium at the bottom middle and the back row at the top. The
  camera looks down at `DEFAULT_ELEVATION` at `DEFAULT_TARGET`, a point a little below the stage
  top and behind its center. With the axes of the stage origin (below), the camera is at
  `target + d × (0, sin e, cos e)` for the elevation `e` and the distance `d`. The opening, the
  wide shots, and the closing of 5.6 look at the same target, and Free mode turns around it
  (2.5).
- The image has almost no perspective, so no camera of 30° gives all its angles. The framing of
  the full stage wins over the angle of the podium. A lower view made the stage look flat, and
  the floor in front of it took a large part of the free area. A narrower field of view with a
  farther camera would change the wide shots, the planner, and Free mode (5.6).
- Tests set the limits of the default view. The test of the hidden heads (4.2) sets the lowest
  elevation. The tests of the shade of the title (2.8) and of the first screen set the target,
  with the gap of the low lamps of the hall (hall, above). The decision file
  [`2026-10-07-scene-latest.md`](../decisions/2026-10-07-scene-latest.md) gives the measures.
- The default distance is `DEFAULT_DISTANCE_IN_SIDES × S` when the viewport is as wide as it is
  tall, or wider. When the viewport is taller than wide, multiply the distance by its height
  divided by its width. The wide and high shots of 5.6, the planner, and the beam fade of Free
  mode use the default distance as their unit.
- **Landscape rule.** The user asked on 2026-10-06 for the view of `mockup.png`, where the stage
  fills the free area left of the open drawer (01, 2.8). The default view of a landscape viewport
  stands at a part of the default distance (`LANDSCAPE_RULE`, `landscapeZoom()`). The camera moves
  back as the aspect falls below that of a desktop, so the orchestra keeps its part of the width,
  and a wider viewport keeps the distance of the desktop. The players fill almost the full width
  of the free area, as in `mockup.png` and `orchestra-latest.png`, and the front corners of the
  stage can leave the frame. The wide variants and the moves of 5.6 multiply the distance of this
  rule.
- **Portrait rule.** The user decided on 2026-10-06 that a portrait viewport gets a lower and
  more frontal view, so that the orchestra fills more of the tall screen. The stage corners can
  leave the frame (UX audit 2026-10-05, SC8). The rule applies to the default view and to each
  wide shot of 5.6. Its share is a smoothstep from 0 at the aspect 1 to 1 at a narrow aspect, so
  a turn of the screen or a resize changes the view with no jump. With its share,
  `PORTRAIT_RULE` turns the azimuth toward the front, lowers the elevation, moves the camera
  nearer, and removes the zoom of a wide variant of 5.6. The move of the shot stays: the push-in,
  the arc, and the pull-out of the last shot.
- The values of both rules keep each player, with its feet and its head, in the frame of each
  wide shot at each aspect, between the title and the bar of 2.8. They also keep the nearest
  wide camera outside the beam fade of Free mode (light and render, above). The high shots stand
  at one part of the default distance at each aspect, with neither rule, as view 09 of
  `scene.png`. `wideView()` holds both rules.
- **Frame.** The frame is the image of the field of view at the aspect of the canvas. The canvas
  fills the window, and `camera.setViewOffset` puts the middle of the frame in the middle of the
  free area: above the middle of the canvas by half the bar height, left of it beside the open
  drawer of a wide window, and higher above the sheet of a phone (2.8). The camera also renders
  the area outside the frame, so the scene continues under the bar and the drawer. A change of
  the drawer eases the frame to its new place, at once with reduced motion. `viewFrame()` holds
  the rule.
- A close shot of 5.6 (conductor, side, section, or solo) fits its full frame into the free
  area, so that the bar and the drawer cover no part of the frame that the planner tests (review
  of step 8, M4). A wide view, a high view, and Free mode keep the full frame, so that the default
  view keeps the size of the landscape rule. A cut changes the fit at once. After a close shot,
  Free mode takes the fit to 0 in the move of the orbit target (2.5), so the change of mode does
  not jump.
- While the play button of the first screen shows, the frame shrinks until the stage and the
  players are clear of it (2.8). The box of the stage is the slab from the floor up to the
  highest head plus a margin. The frame shrinks toward the top of the box when the button stands
  below the stage, and toward its left edge when the button stands at its right. After the first
  play, the frame grows back.
- The user decided on 2026-10-05 that the camera has an automatic mode (2.5, 5.6). The orbit
  limits apply in Free mode: a range of elevations (`ELEVATION_LIMITS`), and a largest distance of
  `MAX_DISTANCE_FACTOR` times the distance of the default view. The near limit keeps the camera
  `ORBIT_CLEARANCE` outside the box of the stage and the players: the stage square and the space
  up to the highest head (`orbitMinDistance()`). Thus it depends on the direction of the camera.
  A fixed near limit let a zoom put the camera among the players and in the head of the conductor
  (bug report of 2026-10-07). While the orbit target moves to the stage center after a shot
  (2.5), the near limit is `MIN_DISTANCE`, so the first update keeps the camera of the shot. The
  far plane rule and the frame apply to each frame of both modes.

**Body proportions**

The head height `H` is the unit of the body. The default `H` is `DEFAULT_HEAD_HEIGHT` of
`models/species.ts` times the size of the species, so the species keep their sizes relative to
each other and to the chairs and the podium of the reference image. A species with its own
skeleton (4.3) gives its own `H`. The head top is 0.5 H above the head center.

The table gives the parts of the parametric body (4.4). These are rules of the parametric body
only. A sculpt has its own forms on the skeleton and the body points of the parametric body, and
a rigged body has its own forms, skeleton, and skin (4.4).

| Part | Code | Intent |
|---|---|---|
| Head | `models/head.ts` | The cute head of the polished images (`docs/research/2026-10-06-cute-furry-spec.md`, 2.5): a loft of rings with full low cheeks and a round crown. A species with `form.facets` (4.3) has a faceted head of a few large planes above the jaw ring (`headCap()`), as the heads of `lowpoly-animals.png` and `orchestra-latest.png`. The width of the head comes from the species (4.3), so the cat, the wolf, the foxes, and the dog have the narrow heads of `mockup.png`. |
| Torso and neck | `models/trunk.ts` | One welded loft from the seat to the crown (the trunk grid): a round pear torso that fills the space under the chin, so that no neck shows, a neck ring at the height of the head bone, and the head rings. The neck shows only as the fold under the chin. A large species has a wider torso, as the plump bears and pandas of `mockup.png` (user, 2026-10-07). |
| Arms and hands | `models/arms.ts` | One round tube for each arm, from a dome over the shoulder joint to the wrist, as the chubby arms of `mockup.png`, and a round mitten of two balls. The palm side and the finger tips keep the places where the holds put the bow, the strings, and the keys (4.6). |
| Legs and feet | `models/legs.ts` | The leg group of the species (4.3): a haunch that lies on the seat, a thin lower leg, and the foot of the group, as the animals of `lowpoly-animals.png`. The user rejected the round human legs of 2026-10-07 as too long and too thick. The feet rest on the floor, or on the foot ring of a high stool. |
| Eyes | `models/eyes.ts` | The eye form of the species (4.3): an almond, an upright oval, or a bead, as the eyes of `mockup.png`, with one white light. Each eye lies half in the head surface between the front and the sides, so that the side view shows it, and turns out from the front by the angle of its species. The eyes sit higher above a muzzle that starts high on the face, so that the muzzle does not hide them. No mouth, except the choir jaw (4.7). |
| Ears | `models/ears.ts` | The ear type of the species (4.3). The long and the pointed ears are flat plates with a sharp outline and an inner plate, as in `animals.webp`. The round ears are thick discs. The large-flap ear of the elephant stands beside the face, so that its front face shows from the front, as the elephant of `mockup.png`. |
| Snouts | `models/snouts.ts` | The snout type of the species (4.3). The long, the blunt, the roman, the tapered, and the round muzzles are faceted, with a few large planes, as the muzzles of `lowpoly-animals.png`. A long or a pointed muzzle reaches past the mouth, so that the mouthpiece of a wind instrument is under the muzzle. The beak has a lower half on `jaw`, so that the choir opens it (4.7). |
| Tails | `models/tails.ts` | The tail type of the species (4.3). A long tail leaves the body at the seat, goes back through the open back of the chair under its top rail, and hangs down. The puff sits low on the back, so that it shows at the seat in the back view, as in `animals.webp`. |
| Face patterns | `models/face-patterns.ts` | The face pattern of the species (4.3). The eyes stand a little out of a patch, a disc, or a ring around them, so that the patch does not hide them. |

A player that stands (the timpani, the percussion, the choir, and the conductor, 4.6) has short
straight legs. The soloist of 3.8 also stands when it plays the violin, the viola, the flute, the
oboe, the clarinet, the horn, the trumpet, or the trombone, as in a concerto (the user decision
of AM3). The soloist of the cello, the bassoon, or the tuba sits on a chair, and the contrabass,
the harp, and the piano keep their stools and the bench. `supportOf()` of `models/player.ts`
gives the support, and `PlayerCast.support` holds it.

A standing player is about as tall as a seated one. The base of its torso stands at the
`standingBase` of its skeleton (4.3), and its legs are a short part of its height, as the bear of
the reference image (review of step 4, F3). The leg group gives the standing leg
(`STANDING_LEGS` of `models/legs.ts`): a short column for the heavy species, a thin leg for the
small species, and a leg with a hock for the dog family. The penguin has no leg tube: a hem
covers the hips down to small paddle feet, as the penguins of `orchestra-latest.png` (decision D9
of the anatomy plan). A skeleton with the hip joints further out moves the standing knees out by
the same distance, so that the thighs stand upright.

The `girth` of a species scales the width and the depth of the torso, the thickness of the arms
and the legs, and the distance of the shoulders and the hips from the middle. The head, the
hands, and the feet keep their sizes. The meerkat is thin, so that it does not look like the dog
(review of step 4, the weak species). The polar bear is wide, as in `polar-bear-views.png` (4.3).

On a chair, the body moves forward on the seat until it keeps 0.01 m from the back posts and the
top rail (`chairForward()` of `models/player.ts`). The tail does not count, because it goes
through the open back. A floor instrument, such as the cello, moves with the body.

**Facets and triangle budgets**

- The parametric body shows facets of the size of the facets of `mockup.png`: the neighbor rings
  of a loft turn by half a side against each other, and the left half of a loft is the mirror
  image of its right half (`docs/research/2026-10-07-facet-look.md`).
- A body has at most 2,600 triangles. An instrument has at most 800, except the timpani (1,200)
  and the piano (2,000). A chair or the piano bench has at most 120, and a stand at most 80. The
  full scene with 60 players has at most 200,000 triangles. The frame cost of `perf-60.mid` on
  the development Mac set these budgets against the frame target of 9.7.
- `models/budget.test.ts` and `models/species.test.ts` check these budgets.

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
and `2 × L` is 7.93. A test of `layoutScene()` checks the stage of this composition, which the
footprints of the players can make a little larger (`models/layout-scene.test.ts`). With the
rows of step 4, the flutes and the clarinets shared one row, and `S` was 6.6 m. The reference image puts the flutes
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
  stands and the stand between them. Thus the timpani, the cellos with their shared stands,
  and a body wider than 0.95 m get more arc. The seat arc sets no limit on the width of a body,
  and the layout test checks that the footprints of neighbors do not touch (review of step 3,
  F12).
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

Each player has one skeleton. A vertex follows one or two bones (4.4), or up to four bones in a
rigged body (below):

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
  the torso with the shoulder joints.
- Each skeleton has all bones of the list, so a bone has the same index in each player. A bone
  with no part, such as the trunk of a rabbit, moves nothing.
- In the bind pose, no bone has a rotation. The body sits on its seat: the haunches lie on the
  seat, the thighs point forward and a little down to the knees, the shins hang down, and the arms
  hang down beside the body. The legs have no bone for the hock or the paw: no pose turns the legs,
  so a rigid part on `foot` stays in its place (decision D3 of
  `docs/research/2026-10-07-animal-anatomy-plan.md`). The `foot` bone of a digitigrade or hoofed
  leg is at the hock, and the long bones of the foot and the paw are rigid parts on it. The instrument is in its playing
  place on its bone, and the bow lies in the hanging right hand.

A rigged body (4.4) keeps these rules for its rest skeleton, and binds its mesh in another pose:

```text
GLB rig (23 bones)         rest skeleton (pose code)          bind frames (mesh)
hips .. head      ───────> joints of the rig        ───────>  no turn; the head
                           (head with its face to the front)  turns 12° as the sheet
shoulder, upper_arm ─────> joints of the rig
forearm, hand     ───────> straight down, rig lengths ──────> turned onto the arm joints
thigh, shin, foot ───────> joints of the rig                  no turn
tail.1, tail.2    ───────> tail1, tail2 (tail.3, tail.4 join tail2)
eye triangles     ───────> eyeL, eyeR at the middle of each eye
```

- The packer maps the 23 bones of the rig onto the bones of the player with the same names:
  `hips`, `spine`, `chest`, `neck`, `head`, `shoulderL`, `upperArmL`, `forearmL`, `handL`, the
  same on the right, `thighL`, `shinL`, `footL`, the same on the right, and `tail1`. The bones
  `tail.2` to `tail.4` all map onto `tail2`. A bone with no triangles, such as `jaw` or
  `fingersL`, moves nothing.
- The rest skeleton has the joints of the rig for the trunk, the legs, the tail, the shoulders,
  and the shoulder joints. The arms hang straight down from the shoulder joints, with the lengths
  of the upper arms and the forearms of the rig. The face looks to the front: the line between
  the eyes of the mesh turns 12° around the vertical axis, and the rest skeleton turns it back.
- Each bone has a bind frame (`Skeleton.meshBind`): its place and its rotation in the pose of
  the mesh. The upper arm, the forearm, and the hand take the smallest turns from the hanging
  arm onto the joints of the mesh, each after the turn of its parent, and the hand turns along
  the hand bone of the rig. The head and the eyes take the turn of the face. The other body
  bones have the joints of the rig with no turn.
- The GPU binds each bone at the inverse of its bind frame. The instrument bones keep their rest
  frames, because the instruments and the bow have their places in the rest skeleton. A test
  compares the skin of the tests (`posedCorner()`) with the CPU skin of three.js for a mesh with
  four bones and bind frames.
- `MeshData.skin` holds the four bones and the four weights of each corner. `MeshData.bones` and
  `MeshData.blendBones` hold its two bones with the largest weights, so that the readers of the
  main bone, such as the footprint and the baked occlusion, keep their rules.
