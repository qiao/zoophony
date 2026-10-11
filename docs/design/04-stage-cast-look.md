# 4. Stage, cast, and look

## 4.1 Look

- Low-poly shapes with flat facets, low polygon counts, and matte colors from the reference
  image. Each face of a matte part stays flat: the bodies, the props, and the plain parts of the
  instruments. The glossy parts of the instruments shade soft (4.5, materials).
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
  - The stage follows the rule of 4.5 with its minimum of 5 m.
- Larger species sit farther back, so that a big animal hides no smaller animal. The user asked
  for this on 2026-10-05, and said that a species can change its instrument. A species of the
  size 1.2 or more plays only the contrabass, the timpani, the trombone, or the tuba. The
  strings have species of the size 1.05 or less, and the piano 1.1 or less. The section map of
  4.3 follows the rule (`docs/research/seating.md`, section 5). Thus the large species sit in
  the back row, and only the bear stands in front of them.
- A test of `scene/` (`scene/hidden-heads.test.ts`) draws the bind pose silhouettes of the
  players and the conductor of each demo and of the choir test file (`models/test-choir.ts`) in
  the default view at 1440 × 900, with a depth buffer. In each demo and in the choir test file, a
  large species hides less than 10% of the head of each smaller animal. The lowest riser level is
  1.0 m high for this rule: a lower level let the large species of the back row hide the heads of
  the choir.

## 4.3 Species

All animals use one parametric biped body (4.4), except the rabbit and the bear conductor, which
have the rigged bodies of their GLB files (4.4, rigged bodies). Each species has one `SpeciesParams` in `SPECIES` of
`models/species.ts`, and changes only its parameters.

```typescript
interface SpeciesParams {
  ears: 'long' | 'pointed' | 'round' | 'large-round' | 'floppy' | 'large-flap' | 'small'
    | 'side-round' | 'antlered' | 'low-round' | 'none';
  snout: 'short' | 'long' | 'blunt' | 'broad' | 'pointed' | 'buck-teeth' | 'trunk' | 'flat-nose'
    | 'horn' | 'beak' | 'roman';
  tail: 'none' | 'puff' | 'bushy' | 'thin' | 'flat';
  /** Height scale. 1.0 is the rabbit of the reference image. */
  size: number;
  colors: { fur: string; belly: string; accent: string };
  /** The parts that get the accent color (4.5). */
  accentParts: readonly AccentPart[];
  /** Face pattern, for example the eye patches of the panda. */
  facePattern: 'none' | 'eye-patches' | 'cap' | 'stripe' | 'forehead-stripes'
    | 'face-disc' | 'eye-rings';
  /** The skeleton (below). Each value that it does not give has its default. */
  proportions?: Partial<BodyProportions>;
  /** The rigged body from a GLB file in place of the parametric biped (4.4). */
  rigged?: RiggedBody;
}

/** The skeleton of a species (`models/proportions.ts`). Each length is in H, except `H`. */
interface BodyProportions {
  /** The head height `H`, in meters. */
  headHeight: number;
  /** The head center above the base of the torso. */
  headCenter: number;
  /** The shoulder joints above the base of the torso. */
  shoulderHeight: number;
  /** Each shoulder joint from the middle. */
  shoulderSpread: number;
  /** The upper arm and the forearm. */
  upperArm: number;
  forearm: number;
  /** Each hip joint from the middle. */
  hipSpread: number;
  /** The seated knee in front of the hip joint and above the seat. */
  seatedKnee: { forward: number; height: number };
  /** The base of the torso above the floor for a standing body. */
  standingBase: number;
}
```

The skeleton of each species (`BodyProportions`) is one table. `proportionsOf()` fills each value
that `SpeciesParams.proportions` does not give with its default (`DEFAULT_PROPORTIONS`), and the
frame of the body (`models/body-frame.ts`) holds the result. The trunk, the arms, and the legs
read the head center, the joints, the arm lengths, and the seated knee from it.
The default `H` is `DEFAULT_HEAD_HEIGHT` times the size of the species (4.5, body proportions).

Today each species except the bear has the default skeleton: the skeleton of the bodies of
2026-10-06, which the user chose again on 2026-10-09 (`docs/decisions/2026-10-09-body-revert.md`)
and on 2026-10-11 (`docs/decisions/2026-10-11-body-revert.md`). This is the start point. The rigged rabbit and the rigged bear
take their skeletons from their GLB files (4.4, rigged bodies). `BEAR_PROPORTIONS` stays from the
code-built bear of `bear-views.png` (measures in
[`2026-10-10-bear-body.md`](../research/2026-10-10-bear-body.md)), and the body of the bear does
not read it. A species gives values of its own when its reference images show a different anatomy, for
example the haunches and the long hind feet of the rabbits, or the short heavy legs of the bears
and the hippos (design 1). The tests of the behavior check each skeleton: the clearance of the
arms and the legs, the reach of the bow, the arm joints, the music stands, and the hidden heads.

A height map moves the torso of the parametric body with the table, so that a species can give
its own skeleton:

- Below the shoulder joints, each height of the torso scales with the joints: the rings, the
  `hips`, `spine`, and `chest` bones, and the shoulder band of accent arms.
- Above the joints, the top rings of the torso and the neck keep their part of the way from the
  joints to the `head` bone.
- The `head` bone stays 0.5 below the head center, and the head keeps its form. A `head` bone
  that is not above the joints is an error.
- The default skeleton keeps each height to the bit, because the map adds moves of 0.

```text
 height above the base of the torso (H)
   headCenter -----  head center (the head keeps its form)
       - 0.5  -----  `head` bone
                     top rings and the neck: the same part of the way to the `head` bone
   shoulderHeight -  shoulder joints
                     rings, `chest`, `spine`, and `hips`: scale with the joints
   0 --------------  base of the torso (the seat)
```

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
  make the two sections look different. `SpeciesId` names them `fox-red` and `fox-tan`.
- The penguins have black and white bodies, which look like choir robes.
- Larger species sit farther back (4.2, user decision of 2026-10-05). The large species of the
  size 1.2 or more play only the contrabass, the timpani, the trombone, and the tuba: the hippo
  plays the contrabass, the elephant the timpani, the panda the trombone, and the rhino the tuba.
  The strings have species of the size 1.05 or less: the rabbit, the red fox, the cat, and the
  dog. The piano has the polar bear, which the user chose on 2026-10-06.
  The hidden heads test of 4.2 checks that the polar bear hides no head behind it. The pig plays
  the horn, the badger the percussion, and the bear conducts from the podium.
- The celesta, the harpsichord, the clavinet, and the organs are seats of the piano section
  (3.8), so the polar bear plays them too. The merge rule of 3.7 gives one keyboard seat, so a
  second species of the section never shows.
- The wolves play the clarinets. The user decided this on 2026-10-05: the gray animal with a
  clarinet of `animals.webp` is a wolf. It has gray fur, a white face and chest, pointed ears,
  and a bushy tail. The cast has 18 species. The bear conducts, and each other species plays.
- Further seats of a section alternate their species variants. For example, a third violin seat
  uses rabbits again, and a fourth uses red-orange foxes.

The shape parameters of each species (4.5 gives the colors):

| Species | ears | snout | tail | facePattern |
|---|---|---|---|---|
| rabbit | long | short | puff | none |
| fox (both colors) | pointed | long | bushy | none |
| wolf | pointed | long | bushy | none |
| elephant | large-flap | trunk | thin | none |
| bear | round | short | puff | none |
| cat | pointed | short | thin | forehead-stripes |
| hippo | small | broad | thin | none |
| deer | antlered | long | puff | none |
| panda | round | short | puff | eye-patches |
| mouse | large-round | pointed | thin | none |
| beaver | small | buck-teeth | flat | none |
| dog | floppy | blunt | thin | cap |
| monkey | side-round | short | thin | face-disc |
| pig | pointed | flat-nose | thin | none |
| rhino | small | horn | thin | none |
| badger | small | long | puff | stripe |
| penguin | none | beak | none | eye-rings |
| polar bear | low-round | roman | puff | none |

The face patterns of the head (`models/face-patterns.ts`):

- `forehead-stripes` (the cat) are two thin short stripes on the forehead in the accent color.
  Wider stripes looked like a grille (review of step 4, the weak species).
- `stripe` (the badger) is a white stripe from the nose over the head, between two black stripes
  over the eyes.
- `eye-patches` (the panda) are two ovals around the eyes, with their lower ends out.
- `cap` (the dog) is the accent color over the head down to below the eyes, with a blaze of the
  belly color down the middle of the face, as the beagles of `mockup.png`. The cap colors the faces
  of the head itself and adds no part. The cream dog with brown floppy ears does not look like the
  tan fox (review of step 4, the weak species).
- `face-disc` (the monkey) is a large face of the belly color around the eyes.
- `eye-rings` (the penguin) is an oval of the belly color around each eye, as the white eye ring
  of an Adélie penguin. The black eyes on the black head did not show in a close shot (UX audit
  2026-10-06, N8).
- The eyes stand a little out of a patch, a disc, or a ring, so that it does not hide them.

`antlered` (the deer) is two ears that point out to the sides, and two antlers of the belly
color on the head. `side-round` (the monkey) is two round ears at the sides of the head, at the
height of the eyes. With pointed ears, the deer looked like the fox, and with round ears on the
top of the head, the monkey looked like the bear.

The belly color also colors the muzzle and the lower face: the cheeks, the jaw, and the face up to
the eyes. Thus the fox and the wolf get their white cheeks from it, as in `animals.webp`. The
forehead and the back of the head keep the fur color, and so does the top of a long muzzle. On the
torso, the belly color is a stripe down the front that narrows toward the seat, as the white chest
of the fox in `animals.webp`. All front faces of the first torso had the belly color, and the fox
looked white in the front view.

Each triangle of the body has one color: the place of its centroid or the direction of its face
picks the color (`splitByCentroid()` and `splitByFacing()` of `models/mesh.ts`). Thus a color
border follows the edges of the triangles.

## 4.4 Models

Code builds the bodies, the instruments, and the props from low-poly shapes with vertex colors.
The rigged bodies are the exception: each one has a skin texture that `pnpm rig-body` bakes from
the texture of its GLB file (rigged bodies, below). Each body except the bear conductor and the
rabbit is the parametric body: `buildBiped()` of `models/biped.ts` builds it
from the parts of 4.5 (body proportions) on the skeleton of 4.3. The user chose these bodies
again on 2026-10-09, in place of the sculpts from Blender and the rigged red fox of route B
(`docs/decisions/2026-10-09-body-revert.md`). On
2026-10-10, the two foxes got a body built in code after `fox-views.png`, and on 2026-10-11 the
user reverted them to the parametric body (`docs/decisions/2026-10-11-body-revert.md`). On
2026-10-10, the user also gave rigged GLB files of the rabbit and of the bear conductor, and asked to
use them. A species with `rigged` goes to `buildRiggedBody()` of `models/rigged-body.ts` (rigged
bodies, below). The code-built bear of `bear-views.png` went then.

Each body follows these rules:

- A body has at most 2,600 triangles (4.5, facets and triangle budgets).
- The left side of the animal is at -x, because it faces -z, and the mouth is near the middle
  plane, below the eyes (`models/species.test.ts`).
- The body takes the colors of its species (4.5, species colors). The skin of a rigged body takes
  them in the bake (rigged bodies, below).
- The bones have the names of 4.7, so that the pose code of section 5 drives each body.
- Each part follows one bone (4.7), and each triangle is on one bone. The rigged bodies are the
  exception: each vertex follows the two bones of its weights.
- The tests of the behavior check each body: the clearance of the arms in the playing pose and in
  the rest pose, the bow and the bow hold, the arm joints, the hidden heads, the budgets, the feet
  on the floor, and the footprints of the layout. A body that grows its footprint moves the rows of
  the layout, and `models/layout-scene.test.ts` limits the growth of each stage.

**Rigged bodies**

The rabbit and the bear conductor have the rigged bodies of `assets/models/rabbit/rabbit.glb` and
`assets/models/bear/bear.glb`, which the user gave on 2026-10-10: T-pose meshes with Mixamo
skeletons, their weights, and one texture each. The same day, the user asked that the two bodies
look like the models and like `rabbit-views.png` and `bear-views.png`, and chose a skin from the
texture of each file with the colors of the reference images
(`docs/decisions/2026-10-10-glb-skins.md`). `pnpm rig-body <species>` packs each one into
`src/models/rigged/<species>.ts` and its skin `<species>-skin.webp` (tools, below).

- The packer keeps the mesh and the weights of the file, except the changes of a config (below).
  It collapses the mesh to the triangle budget, maps the joints of the file onto the bones of
  4.7, and keeps the two largest weights of each vertex, because the app blends two bones (4.7).
- The files have no joints for the ears, the tail, and the finger blocks. Each of these bones
  takes a part of the weight of the head, the hips, or the hand, so that the ears and the tail
  move.
- The packer bakes the base color texture of the file onto a new UV layout of the collapsed mesh
  with Cycles, into a skin of 1024 × 1024 texels. Thus the eyes, the nose, the mouth, the claws,
  and the tones of the facets of the model show. The islands of the face get two times the texels
  of the other islands. A vertex on a seam of the layout becomes two vertices.
- The fur and the accent of the palette of the config (the pink inner ears of the rabbit, the tan
  muzzle of the bear) move to the colors of the species in Oklab. Each color of the texture takes
  the move of its nearest color of the palette, so the shades stay. Thus the gray rabbit of the
  file is white, as in `rabbit-views.png`, and the light chest of the bear stays light. The dark
  parts keep the colors of the texture.
- A thin plate on the surface of the head in front of each eye follows its eye bone, so that the
  eye blinks (5.1). The plate carries the eye of the texture, and the skin under it is fur. The
  packer measures each eye from dense samples of the texture, and the two eyes are mirror images.
  The front of a plate is one UV island, and it stays in front of each bulge of the head. A config
  can paint the eye of a reference image on the plates in place of the eye of the texture
  (`eyeLook`): the rabbit has the dark eyes of `rabbit-views.png`.
- The corner (0, 1) of each skin is white. Each corner with no skin, such as the instrument,
  points at it, so that its vertex color stays its color.
- A config can add a ball for a tail that the file does not have, or that is too small. The bear
  and the rabbit have the round tails of `bear-views.png` and `rabbit-views.png` on `tail1`.
- A config can smooth a bumpy mesh before the collapse (`smooth`), so that the facets are larger
  and cleaner, and it can keep the detail of some joints in the collapse (`keep`), such as the
  paws that hold a bow. The rabbit collapses to about the triangle count of its sheet
  (`tools/glb-bodies/rabbit.json`).
- A config can change the shape of the mesh (`shape`): a scale for each joint of the file in its
  own axes, across the bone and along it. The mesh, the joints, and the points of the config take
  the scaled pose as their rest pose, so the texture and the weights follow. The rabbit has the
  form of `rabbit-views.png`: longer thighs, shins, and arms, large feet, wide haunches, wide and
  shallow thighs, a deep belly, a short neck, and a wide head
  (`docs/decisions/2026-10-10-rabbit-knees.md`).
- A config can give the haunch of the file to the hips (`haunch`). The weights of an image-to-3D
  model put the haunch on the thigh, so each seated thigh swung the haunch under it, and the knee
  stood up high. With `haunch`, each vertex behind a hip joint and near it gives a part of its
  thigh weight to the hips. The rabbit has this rule.
- The head center of the rabbit is at the height of the head center of the parametric rabbit. A
  match of the height to the tips of the ears made its body too large, because the ears of the
  parametric rabbit are much longer. The bear is 1.6 m high, as the bear before it.
- `buildRiggedBody()` poses the T-pose with the weights for the bind pose of 4.7, on the CPU, as
  the GPU poses it. The arms hang down. On a seat, the haunch rests on the seat, the thighs point
  forward, a little down (`THIGH_SLOPE`), and out (`THIGH_SPREAD`), so that the knees stand apart
  as in `rabbit-views.png`, and the shins point down. The haunch of the rabbit stays on the hips
  (`haunch`), so its knees stay low over the seat, and its shins hang down in front of the seat
  (`docs/research/2026-10-10-rabbit-knees.md`).
- The pose code keeps the limb lengths of the packed mesh, as the user asked: it does not stretch
  them. Only the shape of a config changes them, toward a reference image, as for the rabbit. The
  seat fits the legs (`seatHeights()` of `props.ts`, 4.5): it moves to the height where the feet
  rest on the floor or on the foot ring.
- The arms of the bear file are about two thirds of the arms of the skeleton that the conductor
  holds were tuned on, so the paws do not reach each hold (5.4). The shape of the rabbit gives it
  about the arms of that skeleton. The rabbit and the bear failed tests of the reach, the
  clearance, and the places of the hands, and the user asked on 2026-10-10 to remove them.

**Tools of Blender**

Two tools prepare the rigged bodies with Blender. The app reads only the output of
`pnpm rig-body`:

- `pnpm glb-init <species> <glb>` (`tools/glb-init.ts` and `tools/blender/inspect_glb.py`)
  starts a rigged body: it copies the file with its README, and proposes the config of
  `pnpm rig-body` from the joints, the shape, and the colors of the mesh.
- `pnpm rig-body <species>` (`tools/rig-body.ts`, `tools/blender/rig_body.py`, and the config
  `tools/glb-bodies/<species>.json`) packs a rigged GLB body into `src/models/rigged/<species>.ts`
  in the format of `models/rigged-format.ts`, and bakes its skin (rigged bodies, above). With
  `--preview`, `tools/blender/preview_rig.py` renders the skin and the main bones.

**Meshes**

- Each player is one `SkinnedMesh`. The generator merges the body, the instrument, and the bow
  into one mesh. A vertex follows one or two bones (4.7). A rigid part follows one bone.
- This gives one draw call for each player (4.5, materials), plus the shadow pass. One `Mesh` for
  each part would give about 25 draw calls for each animal, which is too many for an integrated
  GPU.
- The static props (the stage, the chairs, the stands, and the podium) merge into a few meshes.
- The parametric body has one module for each area: `models/trunk.ts` (the torso, the neck, and
  the head with the eyes, the ears, the snout, and the face pattern), `models/tails.ts`,
  `models/arms.ts`, and `models/legs.ts`. `buildBiped()` calls them in this order, so the order of
  the parts in the mesh stays the same. The areas read their shared values from
  `models/body-frame.ts`: the stance, the head height `H`, the joints where the limbs meet the
  trunk, and the overlap of the shoulder dome and the torso (4.7). The frame holds the
  skeleton of the species (`BodyProportions` of `models/proportions.ts`, 4.3), and each area reads
  its lengths and heights from it.

## 4.5 Visual values

One world unit is one meter. The values of this section live in the code files that each block
names. A block gives the rules, the intent, and the reasons, and the research reports and the
decision files keep the measures of each tuning.

The colors come from samples of the reference images. Design 1 says which image wins where they
differ. An image shows lit and shaded colors, so each base color is a little lighter than its
darkest sample. The species colors are the colors of 2026-10-06, from `animals.webp` and the
polished images, which the user chose again on 2026-10-09 (design 1). They have no new tuning for
the light of 2026-10-07. The bear has the colors of `bear-views.png`, from
samples of its sheet page on the same day: one brown for the fur and the belly, and a tan muzzle in
the accent color.

- Tune the light first, until a screenshot of the default view looks like the reference. Change
  a base color only when a measurement shows that no light value can match the reference.
- Measure a color on the same part in a screenshot and in the reference image: the value, the
  hue, and the saturation of its lit pixels, for example the mean of the pixels from the 70th to
  the 95th percentile of the value on the lit head of a species. Compare the default view with
  `orchestra-latest.png` and `mockup.png`, and the views page (7.1) with the model sheet of the
  species.
- The decision file or the research report of each change keeps its samples:
  [`2026-10-06-polished-look.md`](../decisions/2026-10-06-polished-look.md) for the hall, the
  stage, and the light, and [`2026-10-06-polished-cast.md`](../decisions/2026-10-06-polished-cast.md)
  and the decision files of the animal views of 2026-10-05 for the cast.

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
(`models/species.ts`), which also gives the size of each species.

- All species have black eyes with a light (`EYE_COLOR` and `EYE_LIGHT_COLOR` of
  `models/species.ts`), and a dark nose (`NOSE_COLOR`), unless their accent parts include the
  nose. The bear has a dark gray-brown nose (4.4, bear
  body).
- The teeth, the tusks, and the antlers have `TEETH_COLOR` or the belly color.
- The inside of an ear has the belly color, unless the accent parts include the inner ears or the
  ears.
- The accent color goes to the accent parts of the species (table below). The face pattern of 4.3
  also has the accent color, except the middle stripe of `stripe` (the badger) and `face-disc`
  (the monkey), which have the belly color.

```typescript
type AccentPart = 'inner-ears' | 'ears' | 'nose' | 'snout' | 'horn' | 'beak' | 'arms' | 'hands'
  | 'legs' | 'feet' | 'tail' | 'face-pattern';
```

Accent arms color the upper arms, the forearms, and a band over the shoulders, as the black arms
and shoulders of the pandas of the polished images. Accent legs color the thighs, the knees, and
the shins. Accent feet color the feet and the lower part of the shins, as the dark socks of the
fox in `animals.webp`.

| Species | Accent parts | Species | Accent parts |
|---|---|---|---|
| rabbit | inner-ears, nose | cat | face-pattern |
| fox, violins | feet | hippo | nose, inner-ears |
| fox, flutes | ears, feet | deer | nose, feet |
| wolf | inner-ears | panda | face-pattern, ears, arms, hands, legs, feet |
| elephant | inner-ears | mouse | inner-ears |
| bear | snout | beaver | tail |
| dog | ears, face-pattern | monkey | hands, feet |
| pig | snout | rhino | horn |
| badger | face-pattern | penguin | beak, feet |
| polar bear | nose | | |

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
- The players of a species with a skin (4.4, rigged bodies) share a copy of this material with
  the skin as its color map on `uv1` (`scene/player-materials.ts`). The vertex colors of the body
  are white, so the skin gives the color, and the baked occlusion still darkens it. The material
  stays hidden until its texture loads, and the first piece of the app waits for the skins with
  its MIDI file. When the load fails, the body shows white. Each player still has one material
  and one draw call.
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
| `matte` | Cloth, raw wood, the stage, the props, and the bodies. | No gloss, and flat faces. |
| `varnish` | The varnished wood of the bowed strings. | A soft gloss. |
| `lacquer` | The black lacquer of the piano and the clarinet, and the eyes. | A sharp gloss. |
| `metal` | Brass, copper, and silver. | Sharp highlights, as the brass of the polished images. The environment map of the hall is dark, so a high metalness makes metal look black. |

- The `matte` finish keeps each face flat, so the animals show the facets of the low-poly look
  of 2026-10-06 18:58. The user chose this look on 2026-10-09. The smooth crease of 2026-10-06
  20:22 made the heads and the bodies look round.
- The glossy finishes (`varnish`, `lacquer`, and `metal`) smooth the small angles of a curved
  part, and keep the hard edges of a box or a plate.
- The stage keeps flat shading in its own material (`scene/stage.ts`), because its planks are
  flat boxes.
- The vertex colors of a player hold a baked ambient occlusion (`shadeMesh()` and `OCCLUSION` of
  `models/shading.ts`), so that the folds stay dark in the light of the hall: the neck under the
  head, the hips above the thighs, and the knees. Each nearby triangle counts as a disc that hides
  a part of the sky of a vertex, and the light of a vertex has a floor. A convex part does not
  shade itself.
- The bones of the body shade each other. An arm and a piece in a hand shade only their parent and
  their children, because a raised arm leaves the side of the torso, and an occlusion of the bind
  pose would stay there as a dark stripe. The props and the stage get no occlusion.
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
  each spotlight (`addLightPool()` of `scene/light-pool.ts`): a pool with a floor around the pool center,
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
each other and to the chairs and the podium of the reference image. The head top is 0.5 H above
the head center.

The table gives the parts of the parametric body (4.4). The rigged bodies have their own parts
(4.4, rigged bodies). The decision files of the animal views
(`2026-10-05-animal-views.md` and the two after it) and the review of step 4
(`docs/reviews/step-4.md`) give the first rounds of each part and the reasons for each change.

| Part | Code | Intent |
|---|---|---|
| Head | `models/head.ts` | The round head of the polished images: a loft of rings with a round crown, the forehead, the eyes, full cheeks, and the chin. The face is a little flat, and the front of the cheeks carries the muzzle. Every second ring turns by half a side, so that the head has small triangle facets. |
| Torso and neck | `models/trunk.ts` | A round pear torso with the belly forward, as the animals of `animals.webp`. Its top is under the chin, and a short thick neck joins it to the head, so that the torso and the head hide almost all of the neck. The part below the `chest` bone follows `spine`, and the part above follows `chest` (4.7). |
| Arms and hands | `models/arms.ts` | Today two thin limbs for each arm, and a round mitten of two faceted balls for the palm and the fingers. The target is the arms of the reference images: thick arms with large flat facets, which lie close to the body and hold the instrument against it (`animals.webp`, `lowpoly-animals.png`). The upper arm starts in a dome around the shoulder joint, so that the shoulder is a round ball that sinks into the torso in each pose (`SHOULDER_JOINT` of `models/body-frame.ts`). The shoulder is about 0.6 of the seated height from the middle of the palm, as the reference image shows. |
| Legs and feet | `models/legs.ts` | A round thigh that lies flat on the seat, a faceted ball at the knee, a shin that goes straight down, and a round shoe with a flat sole on the floor or on the foot ring of a high stool. The chair sets the length of the shin. The toes keep clear of the legs of the shared music stands. |
| Eyes | `models/eyes.ts` | Two black upright ovals that lie half in the head surface between the front and the sides (`EYE_DIRECTION` of `models/head.ts`), so that the side view shows them. Each eye has the `lacquer` finish and a small white light on the eye bone, as the eyes of the polished images. No mouth, except the choir jaw (4.7). |
| Ears | `models/ears.ts` | The ear type of the species (4.3). The long and the pointed ears are flat plates with a sharp outline and an inner plate, as in `animals.webp`. The large-round ears sit high and out to the sides, so that the mouse does not look like the bear. The large-flap ear points back and out, so that two elephants on neighbor seats keep apart. |
| Snouts | `models/snouts.ts` | The snout type of the species (4.3). A long or a pointed muzzle reaches past the mouth, so that the mouthpiece of a wind instrument is under the muzzle. The long and the roman muzzles start high on the face, so that their tops continue the forehead. The tip of the trunk is the nose. The beak has an upper half on `head` and a lower half on `jaw`, so that the choir opens it (4.7). |
| Tails | `models/tails.ts` | The tail type of the species (4.3). A long tail leaves the body at the seat, goes back through the open back of the chair under its top rail, and hangs down. The puff sits low on the back, so that it shows at the seat in the back view, as in `animals.webp`. |
| Face patterns | `models/face-patterns.ts` | The face pattern of the species (4.3). The eyes stand a little out of a patch, a disc, or a ring around them, so that the patch does not hide them. |

A player that stands (the timpani, the percussion, the choir, and the conductor, 4.6) has short
straight legs. The soloist of 3.8 also stands when it plays the violin, the viola, the flute, the
oboe, the clarinet, the horn, the trumpet, or the trombone, as in a concerto (the user decision
of AM3). The soloist of the cello, the bassoon, or the tuba sits on a chair, and the contrabass,
the harp, and the piano keep their stools and the bench. `supportOf()` of `models/player.ts`
gives the support, and `PlayerCast.support` holds it.

A standing player is about as tall as a seated one. The base of its torso stands at the
`standingBase` of its skeleton (4.3), its short thighs point straight down, and its feet rest on
the floor. Its legs are a short part of its height, as the bear of the reference image (review of
step 4, F3).

Today the width of the torso and the thickness of the arms and the legs are the same for all
species, in `H`. This is the start point of 2026-10-06. Each species moves toward the anatomy of
its reference images (design 1): a heavy species gets a wider torso and thicker limbs, and a
slim species gets a narrow torso.

On a chair, the body moves forward on the seat until it keeps 0.01 m from the back posts and the
top rail (`chairForward()` of `models/player.ts`). The tail does not count: a long tail goes
through the open back. A floor instrument, such as the cello, moves with the body.

**Facets and triangle budgets**

- Today the body shows small triangle facets: every second ring of a loft turns by half a side,
  and the left half of a loft is the mirror image of its right half. The target is the facets of
  the reference images: large, flat, and clean facets that follow the form of each animal
  (design 1, `lowpoly-animals.png` and `animals.webp`).
- A body has at most 2,600 triangles. An instrument has at most 800, except the timpani (1,200)
  and the piano (2,000). A chair or the piano bench has at most 120, and a stand at most 80. The
  full scene with 60 players has at most 200,000 triangles. The frame cost of `perf-60.mid` on
  the development Mac set these budgets against the frame target of 9.7.
- `models/budget.test.ts` and `models/species.test.ts` check these budgets.

**Props and stage**

`models/props.ts` holds the sizes of the chairs, the stools, the music stands, and the choir
risers. `models/stage.ts` holds the sizes of the stage, the podium, and the conductor stand.

| Item | Rules |
|---|---|
| Chair | A seat 0.35 m high, a back of two posts and one wide top rail, open below the rail, and four legs (`CHAIR`), as the chairs of `animals.webp`. The seat of 0.92 H keeps the legs of the animals short, as in that image. The thighs lie flat on the seat, and the feet rest on the floor. A rigged body keeps the lengths of its legs, so its seat moves to the height where its feet rest (`seatHeights()`), and the back keeps its height above the seat. This applies to each seat of this table. |
| Stool | For the harp: the seat height of a chair, four legs, and no back (`STOOL`). |
| High stool | For the contrabass: a high seat, four legs, a foot ring at the seat height of a chair, and no back (`HIGH_STOOL`). The feet rest on the ring, so the lower leg keeps the length that it has on a chair. |
| Music stand | A tripod base, a post, and a desk that tilts to the player, with a white sheet (`MUSIC_STAND`). |
| Podium | A box with a top plate whose corners are cut, and framed panels on its sides (`PODIUM_SIZE` and `PODIUM_TRIM`), as the podium of `orchestra-latest.png`. Its width and its height in relation to the bear are the size of the podium of `bear-views.png`. The panels stand out of the body by a few millimeters, so the podium keeps its box for the layout. |
| Conductor stand | A desk with an open score in front of the conductor, just below the chest of the bear, on a post that stands on the stage in front of the podium (`CONDUCTOR_STAND`). Its top edge is at the shoulders of the bear, as in `animals.webp`, and the desk is lower than the chest, as in `scene.png` (05). A higher desk kept the beat at the height of the head (UX audit 2026-10-05, AM1). A post on the podium put the belly of the bear through the desk (user report of 2026-10-06). |
| Stage | A slab of side `S` (stage origin, below) with no steps, as in `mockup.png`. Each corner is cut by `STAGE_CORNER_CUT × S` along each edge, so the outline has eight sides, as in `orchestra-latest.png`. A raised lip runs around the top (`STAGE_LIP`). The planks run from the left to the right, as in `mockup.png`, with staggered joints, and a deterministic hash gives each plank its length and its tone. The stage has its own material with a grain along the planks (`STAGE_FINISH` of `scene/stage.ts`). The gloss of the key light gives most of the light of the planks in the default view, so the roughness sets the width of the pool of light (light and render, above). |
| Choir risers | Up to three arc levels behind the orchestra (seat geometry, below), with three steps in front of the lowest level, so that the risers rise from the stage top in even steps, as the wooden risers of `orchestra-latest.png` and `orchestra-side.png` (`RISER`). No singer stands on the steps. Each tread has boards and a lighter front edge. |
| Floor | The floor of the hall at the bottom of the stage, with the baked spill of the stage light (hall, above). |

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

These values keep the stage near the size of the reference image. `REFERENCE_STAGE_SIDE` of
`models/test-layout.ts` is the side that the rule gives for the composition of the reference image
(section 1): the first desks in row 0, the other violins in row 1, the two flutes in row 2, and
the three clarinets in row 3. The footprints of the players can make that stage a little larger,
and `models/layout-scene.test.ts` limits the growth of the stage of each demo. The reference image
puts the flutes at the front right, and a professional orchestra puts them in the middle (4.2).
The app shows the layout of the selected demo, with all its players, and the conductor on the
podium (a chamber group of 4.2 has no conductor).

The music stand of a string player stands `STAND_DISTANCE` of `models/layout.ts` in front of the
row, between its seat and the next seat on the right, because two string players share one stand.
Thus the back leg of a stand keeps 0.1 m from the chair back of the row in front (review of step
3).

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
  and 3. The stand stands in front of the row, between the two seats. The last player of a seat
  with an odd count has its stand where a partner would share it, to its right.
- Woodwind and brass players have one stand each, in front of the player, at the distance of a
  string stand or further. The stand moves forward in steps of 0.02 m until it keeps 0.05 m from
  the player and its instrument. Thus the stand of a trombone stands in front of the slide.
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
  two times the wider side. `r(-1)` is 1.2, so row 0 has a radius of at least 2.4. Thus a full
  row moves back until it fits into 160°. Then the row moves back in steps of 0.02 m until its
  footprints keep 0.05 m from the items in front: the rows in front, the piano, the podium, the
  conductor stand, and the conductor.
- The choir stands on risers behind the last instrumental row. Riser level `k` has the radius
  `r + 0.8 × k` and the height `1.0 + 0.25 × k`, where `r` is 1.2 m more than the radius of the
  last instrumental row. The lowest level is 1.0 m high, so that the back row hides no singer
  (4.2). The singers fill the levels evenly, and the lower levels get the extra singers. The
  layout tries one, two, and three levels, and keeps the count that gives the smallest stage
  side. Fewer levels win a tie. A level filled first gave a much larger stage (review of step 3,
  F13). If a level needs more than 160°, or if the risers touch the orchestra, all levels move
  back. Each level spans the angle of the widest level of singers. The footprint of the lowest
  level holds its steps, so the steps keep 0.05 m from the back row.
- After the stage size, all riser levels widen by the same wing on each side, up to 1.0 m of arc
  at the lowest level (`widenRisers()`), as the risers of `orchestra-latest.png` reach past the
  choir. The wing is the largest that keeps each box 0.3 m from the outline of the stage and
  0.05 m from the other items, and the stage side does not change.
- The vocal soloists of 3.8 stand alone on level 0, centered, with 1.2 m of arc each, twice the
  arc of a singer of the choir. The choir then stands on levels 1 and 2. Thus the soloists stand
  in a wide row in front of the choir (UX audit 2026-10-06, N8).
- A row with no players drops out, and the rows behind it move forward.
- After the stage size, each instrumental row spreads inside the stage, from the front (stage
  origin, step 6). The packed rows left the front corners of the stage empty, against a near
  corner of 0.10 S from the nearest seat in the reference image (review of step 4, F1). The left
  side and the right side of a row each get a factor `k`. Each arc between two neighbors on that
  side, and the arc from 0° to the innermost seat, grows to `k` times its packed length, but to at
  most 1.6 m. An arc that is already longer stays, for example the arc of two contrabasses with
  their shared stand. With no seat at 0°, the innermost arc of a centered row grows to at most
  0.8 m, because the innermost seat of the other side shares the 1.6 m. In rows 0 and 1, the
  innermost arc is the gap of the conductor, and it has no limit. Thus rows 0 and 1 keep the
  violins left of 0° and the other strings right of it.
- `k` is the largest value, in steps of 0.02 down from 1.6 / 0.95, that keeps these limits:
  each seat stays within ±90°, each footprint box keeps 0.3 m from the corner cuts, the side
  edges, the front edge, and the back edge (`boxOnStage()`), and each footprint keeps 0.05 m
  from the items of the other rows, the piano, the podium, and the conductor. The spread only
  makes the arcs of a row longer, so the items of one row stay apart, and the overlap test checks
  all pairs (review of step 4, P2). The left side spreads first. The choir and its risers keep
  their places. In the reference image, the seats reach ±90°, and two neighbors are 1.1 to 1.7 m
  apart.
- After its spread, row 1 moves its back desks toward the first desks of their seats in row 0,
  as the wedges of the strings of a professional orchestra (the wedge pass). The target angle of
  a back-desk player is the middle angle of the first desk of its seat. The players of one seat
  keep their packed arcs around it. Then a pass from 0° to the outside keeps each packed arc
  between two neighbors, and the packed arc from 0° to the innermost player, as a minimum. Each
  side of row 1 takes the largest blend `λ`, in steps of 0.1, between the spread angles
  (`λ = 0`) and the target angles (`λ = 1`) that keeps the limits of `k` (above). The rows
  behind row 1 spread after the pass. The arcs of row 1 can then be longer than 1.6 m. With the
  spread alone, a back-desk cello sat behind the violas.
- Thus the strings reach the side edges, as in the reference image. A row that sets the width
  (`2 × L`) cannot spread, so the back corners of the width-bound demos stay empty. A rectangular
  stage would remove them, and 4.1 keeps the square stage (review of step 4, F1).

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

The rows follow the American seating with the contrabasses in a line at the back (4.2).

**Soloist.** The soloist of 3.8 stands outside the arcs, at the front left of the conductor
(4.2). A piano soloist sits at the piano (below). Another soloist stands or sits at
`SOLOIST_PLACE` of `models/layout-scene.ts`: to the left of the podium center and a little toward
the front. It faces the audience and turns 40° to the conductor (`SOLOIST_FACING`), so the
default view sees its face, and the soloist sees the conductor at its side. The flute points
away from the conductor, to the left of the audience. The agent chose the place on 2026-10-06,
and changed it after the second UX audit (2026-10-06, N1):

- The default view sees the first desk of the violins beside the soloist. A test draws the
  silhouettes of the soloist and of the first desk in each wide view of 5.6
  (`models/layout-scene.test.ts`), and the soloist hides only a small part of a first-desk
  player.
- A place farther left keeps a player of the first desk behind the soloist in some wide view,
  because the spread moves the first violins to the left edge. A place nearer to the conductor
  put the middle of the bear into the frame of the solo shots of the flute.
- The turn of 40° keeps the middle of the bear outside the frame of each solo shot of the K. 315
  flute (`shots/test-shot-frames.ts`).
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
2026-10-06 (UX audit 2026-10-06, N1). A case that faced the podium pointed into the rows in
front, and the row moved back. A keyboard that is the only member of its row sits near the
middle, behind the violins.

**Chamber group.** A chamber group (4.2) has no conductor and no podium, and the podium center
is only the center of its arc. The agent chose these rules on 2026-10-06 (UX audit 2026-10-06,
N9), and `CHAMBER` of `models/layout-scene.ts` holds the values:

- **Arc.** The players stand in one row centered on 0°, as a row of the orchestra, with the seat
  arcs and the stands of the seat geometry above. The radius is at least the radius of row 0. It
  grows in steps of 0.02 m until each side of the row, with the room of its end players, spans at
  most 60°. Each player faces the podium center, so the players face each other a little. The
  arc has no spread and no wedge pass. A keyboard turns a quarter turn, as a keyboard of the
  orchestra, so its case lies along the arc.
- **Solo.** The player stands where the middle of the arc would be, and faces the audience. A
  pianist sits at the piano, with the center of the case there and the facing of a piano
  soloist.
- **Recital.** The case center of the piano is at that point. The partner stands in front of the
  curved side of the case, toward the tail, and moves toward the audience in steps of 0.02 m
  until it keeps 0.05 m from the piano. It faces the audience and turns 25° to the pianist. It has
  no music stand, as the soloist above.
- **Stage.** The rule of the stage origin applies from the middle of the group in place of the
  podium center: each seat needs 0.5 m for the chair and 0.3 m of margin on each side, and each
  footprint box 0.3 m. `S` is at least 5 m, and the middle of the group moves to the stage
  center.
- No demo of 8.2 is a chamber group with a section size of 2.8.

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
| trombone | tube with a slide and a bell | forward, and the slide moves with the pitch | chair |
| tuba | large tube with an upward bell | in the lap | chair |
| timpani | two to four kettles, by the pitch range of the file | two mallets | stands |
| percussion, bass drum player | bass drum on a stand | one beater | stands |
| percussion, snare drum player | snare drum on a stand | two sticks | stands |
| percussion, cymbals player | a pair of crash cymbals | one cymbal in each hand | stands |
| percussion, small percussion player | a triangle and a tambourine | the triangle and its beater for keys 80, 81, and all other keys, and the tambourine for key 54 | stands |
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

The instruments follow the reference image and the polished images, and their sizes fit the
animals of the reference image. The builder scales the violin and its bow by the head height of
the rabbit, so that they keep their size relative to the rabbit. The chairs, the stands, the
podium, and the steps keep their sizes in meters. The bodies of the bowed strings are plates
with round edges and an arched top (`plate()` of `models/primitives.ts`), with two f-holes beside
the bridge, as the instruments of the polished images.

**Sizes and holds**

The hold gives the place of each piece in the bind pose of 4.7, in the axes of the model: the
player faces -z, and its left is -x. An offset in `H` uses the head height of the player. The
code of each instrument (`models/instruments/`) holds its sizes and the offsets of its hold.

| Instrument | Model | Hold in the bind pose |
|---|---|---|
| Violin | A body with an arched top, a neck, a scroll, and a bow. | Under the chin on the left shoulder, to the left of the head center and below it. The violin points to the left of the front and a little down, and its top plate turns to the front, so the audience sees it. The bow plays between the bridge and the fingerboard. The stick lies in the fingers of the hanging right hand, in the crease between the palm ball and the finger ball, and points to the front. A grip in front of the palm put the stick through the hand and the frog end into the forearm (user report of 2026-10-06). |
| Viola | The violin at 1.15 scale, with the violin bow. | As the violin. |
| Cello | A body with an end pin, and a bow. | The end pin stands in front of the seat and a little to the right. The cello leans back to the chest and to the left, so that its neck passes the left of the head, as in `animals.webp`. The top plate faces the front and a little to the right. The bow as on the violin. |
| Contrabass | The cello at 1.6 scale, with the cello bow. | At the left side, in front of the seat. The axis leans back to the player and to the left, so that the neck passes the left of the head. The top plate faces the front and to the right. |
| Harp | 24 strings that show the 47 strings of a concert harp, C1 to G7. | Between the knees. The harp leans back to the player and turns around the vertical, so that the top of the soundbox comes to the right shoulder, and the neck passes the right side of the face. With no turn, the neck went through the face of the deer (review of step 5, U1). The left hand plays from the left side of the strings, and the right hand from the right side. |
| Piano | A case with an open lid, white and black keys, and a desk with sheet music. The lid opens less than the lid of `mockup.png`, because a wider lid hid the heads of the players behind the piano in the default view. | The front of the keys stands in front of the seat center. |
| Piano bench | A seat at the first seat height of a chair, so that the keys fit it. | A static prop under the pianist, as a chair. |
| Choir folder | Two open covers, with pages in the sheet music color. | In both hands, below the head center and in front of it. It leans back, so that the pages face the eyes. |
| Flute | A silver tube. | The hole of the lip plate is at the mouth. The flute points to the right, a little to the front and down. |
| Oboe | A thin dark tube with a small bell and metal keys. | The tip of the reed is at the mouth. The oboe hangs to the front, 30° from the vertical. |
| Clarinet | A black tube with a mouthpiece, silver rings and keys, and a bell. | The tip of the mouthpiece is at the mouth. The clarinet hangs to the front, 25° from the vertical, as in the reference image. |
| Bassoon | A tall wooden tube with the boot, the wing joint, and the metal bocal. | The tip of the reed is at the mouth. The bassoon leans to the left across the body, with the boot at the right hip, and its tube passes the left side of the head. |
| Horn | A coil and a bell. | The mouthpiece is at the mouth. The coil stands low in front of the right side of the chest, and the bell opens to the right and to the back, above the right thigh. The hold turns the horn around the mouthpiece, so that the coil and the bell stay out of the right thigh and the right shin. The right palm is in the bell, and the left palm holds the coil near the valves, in the reach of the arm (review of step 4). |
| Trumpet | A tube with three valves and a forward bell. | The mouthpiece is at the mouth. The trumpet points forward and a little down. |
| Trombone | A tube with a slide and a bell. The slide moves from the first position to the seventh. | The mouthpiece is at the mouth. The slide points forward and down, with the bell at its left. The slide is a second piece on the `slide` bone, and the right palm holds its brace. |
| Tuba | A large tube with a bell that opens up. | The mouthpiece is at the mouth. The body stands in the lap, and the bell is at the left of the head. |
| Timpani | Two to four kettles at 0.7 of the size of real kettles, the largest first. Two kettles when the highest timpani note is C3 or lower, three up to F3, else four (`kettleCount()`). Mallets with felt balls. | The kettles stand in an arc around the player, the largest at the left. A mallet in each hand. |
| Bass drum | A drum on a frame, and a beater. | At the front left of the player. Its right head turns to the player, and the beater in the right hand strikes its middle, below the shoulders of the badger. |
| Snare drum | A drum on a tripod, and two sticks. | In front of the player, with a stick in each hand. The head is below the shoulders of the badger, so the sticks slant down to it, and the wrists stay out of the belly. |
| Cymbals | Two crash cymbals, each with a strap. | One cymbal in each hand, with the inner faces to each other. In the bind pose, the strap is above the palm, so that the rim stays above the floor (review of step 4, P1). |
| Small percussion | A triangle with a metal beater, and a tambourine on a tripod. | The triangle hangs from the left hand, and the beater is in the right hand. In the bind pose, the triangle points forward from the hand, as a mallet does, so that it stays above the floor. The tambourine stands at the front right of the player and leans to the player. The beater in the right hand strikes it for key 54. |
| Xylophone | 30 bars from C5 to F7 on a frame, with the natural bars in the front row and the sharp bars in the back row. | In front of the player, with a mallet in each hand. A mallet strikes a natural bar at its middle, and a sharp bar near its near end. The bars are below the shoulders of the badger, so the mallets strike them from above. |
| Baton | A white stick with a handle, about 2 cm thick at the paw, as in `bear-views.png`. It tapers to a tip that bends a little back, toward the bear. | In the right hand. |

In the bind pose, each mallet, stick, beater, the triangle, and the baton lies in the hanging
hand in front of the palm, and points forward. No vertex of a player model is below the floor: a
test checks each species with each instrument.

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

Each player has one skeleton with the bones of the list below. A vertex follows one or two
bones:

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
- Each part of the body is rigid, so each vertex of a body follows one bone. The rigged bodies
  (4.4) are the exception: each of their vertices follows the two bones of its weights. The arm is two
  limbs on `upperArm` and `forearm`. The dome over the shoulder joint is rigid on `upperArm`,
  with no port in the torso (`docs/research/2026-10-06-shoulder-spike.md`). A long tail is two
  parts on `tail1` and `tail2`. The leg is the thigh on `thigh`, the knee ball and the shin on
  `shin`, and the foot on `foot`. No pose turns the legs.

For each body:

- The readers of the bind mesh read the main bone: the footprints, the chair clearance, the
  baked occlusion (4.5), the silhouettes, and the triangle budgets.
- `posedCorner()` of `pose/test-skin.ts` poses a corner in the tests as the GPU does. A test
  compares it with the CPU skin of three.js.

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
  the shoulder joints, the elbows and the wrists, the hip joints, and the seated knees. The height
  map of 4.3 moves the `hips`, `spine`, `chest`, and `neck` bones with the shoulder joints.
- Each skeleton has all bones of the list, so a bone has the same index in each player. A bone
  with no part, such as the trunk of a rabbit, moves nothing.
- In the bind pose, no bone has a rotation. The body sits on its seat: the thighs lie flat on the
  seat and point forward, the knees bend at 90°, the shins hang down, and the arms hang down
  beside the body. The instrument is in its playing place on its bone, and the bow lies in the
  hanging right hand.
