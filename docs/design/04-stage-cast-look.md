# 4. Stage, cast, and look

## 4.1 Look

- Low-poly shapes with flat facets, low polygon counts, and matte colors from the reference
  image. Each face of a matte part stays flat: the parametric bodies, the props, and the plain
  parts of the instruments. The fur of the studio bodies shades smooth across the small angles
  between its faces, and keeps its larger edges. The glossy parts of the instruments shade soft
  (4.5, materials).
- One warm spotlight from above, with soft shadows, so that the faceted scene keeps the look of a
  toy model. It makes a pool of light near the conductor, and the stage edges stay dark.
- A visible beam of warm light falls on the stage from above, with haze and dust motes.
- A dark concert hall with two balcony tiers and rows of small warm lamps stands around the
  stage, as in `scene.png` (1). The lamps bloom, and in a close shot they become soft discs.
- A square stage of glossy walnut planks with cut corners, a raised lip, and no steps, as in
  `orchestra-latest.png` (1), yellow chairs, and black music stands.
- Post effects make the image of a film: a bloom, a depth of field in the close shots, a warm
  color grade, a vignette, and a fine grain (4.5, post effects).
- The bear conductor stands on a podium at the front center. A chamber group of at most 5
  players has no conductor and no podium (4.2).

## 4.2 Layout

The sections go into arcs in the standard order, with no gaps between the used sections. The
stage size follows the player count. Thus a string quartet sits close together on a small stage.

The standard order is the American seating of a professional orchestra, with the contrabasses
in a line at the back, as the Vienna Philharmonic seats them (user, 2026-10-05,
`docs/research/seating.md`). The diagram shows it from above.

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

- The strings sit in wedges: from left to right, the first violins, the second violins, the
  violas, and the cellos. The first desk of each string seat (its players 0 and 1) sits in the
  front row, and its other desks sit in the row behind it. The rows spread to the side edges, as
  the rabbits and the flutes of the reference image do (4.5, seat geometry).
- The woodwinds sit in a block of two rows in the middle: the flutes and the oboes in front, the
  clarinets and the bassoons behind them. The harp sits at the left of the front woodwind row.
  The horns sit left of the clarinets, and the trumpets right of the bassoons.
- A keyboard of the orchestra (a celesta, a harpsichord, or an organ that is not the soloist of
  3.8) sits at the left of the harp, behind the violins, as the celesta of a professional
  orchestra. With no harp and no woodwinds, it sits in the middle behind the strings, as a
  continuo harpsichord. Thus its case does not stand in front of the first violins.
- The back row holds, from left to right, the percussion, the contrabasses, the timpani, the
  trombones, and the tuba. The choir stands on risers behind the orchestra. The vocal soloists of
  3.8 stand in front of the choir, on the lowest level of the risers, because a place beside the
  conductor covers the first violins or the cellos in the default view.
- The soloist of 3.8 stands or sits at the front left of the conductor, as in a concerto (user,
  2026-10-06). A piano seat is always the soloist (3.8), so the piano stands there. Another
  soloist leaves its section row and stands next to the podium (4.5, seat geometry). It has no
  music stand, because a soloist plays from memory.
- **Chamber group.** A score with at most 5 players (a solo, a duo, a trio, a quartet, or a
  quintet) has no conductor and no podium (user, 2026-10-06), because a conductor for one pianist
  looked wrong. The players sit in a small arc at the stage center and face each other a little,
  as a real chamber group does. A score with 6 players or more keeps the conductor, and so does a
  score with no players, so that the stage is not empty. `chamberFormOf()` of `models/cast.ts`
  gives one of three forms:

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
    the order of the rows. Thus a string quartet sits in the classic quartet half circle.
  - No player leaves the group as a soloist. A player alone and the partner of a pianist stand
    when their instrument stands as a soloist (4.5, body proportions). The players of an arc sit.
    The stage follows the rule of 4.5 (stage origin).
- Larger species sit farther back, so that a big animal hides no smaller animal (user,
  2026-10-05). A species of the size 1.2 or more plays only the contrabass, the timpani, the
  trombone, or the tuba. The strings have species of the size 1.05 or less, and the piano 1.1 or
  less (`docs/research/seating.md`, section 5).
- `scene/hidden-heads.test.ts` draws the silhouettes of the players of each demo and of the choir
  test file in the default view. A large species hides less than 10% of the head of each smaller
  animal. The lowest riser level is high enough for this rule (4.5, seat geometry).

## 4.3 Species

All animals except the penguins, the bear conductor, the polar bear pianist, the rabbit violinist,
the two foxes, the viola cats, and the cello dogs use one parametric biped body (4.4). Each species
has one `SpeciesParams` in `SPECIES` of `models/species.ts`, and changes only its parameters. A
species can have a body of its own in place of the biped (`body`): the egg body of the penguins
(`models/penguin/`), the studio bodies of the bear and the polar bear (`lowpoly-studio/`), and the
meshes of the user that `pnpm rig-mesh` rigs for the rabbit, the two foxes, the cat, and the dog
(4.4, bodies of their own and studio bodies). The two foxes share one rig, and the tan fox takes
another palette of its faces (`palette`). A species with a body of its own has no shape
parameters, because its body has its own parts.

```typescript
/** The parametric biped, or a body of its own. */
type SpeciesParams = BipedParams | OwnBodyParams;

interface CommonParams {
  /** Height scale. 1.0 is the rabbit of the reference image. */
  size: number;
  colors: { fur: string; belly: string; accent: string };
  /** The parts that get the accent color (4.5). */
  accentParts: readonly AccentPart[];
  /** The skeleton (below). Each value that it does not give has its default. */
  proportions?: Partial<BodyProportions>;
  /** The scale of the violin and its bow for a species (4.6). 1 by default. */
  violinScale?: number;
  /** The scale of the cello and its bow for a species (4.6). 1 by default. */
  celloScale?: number;
}

interface BipedParams extends CommonParams {
  ears: 'long' | 'pointed' | 'round' | 'large-round' | 'floppy' | 'large-flap' | 'small'
    | 'side-round' | 'antlered' | 'none';
  snout: 'short' | 'long' | 'blunt' | 'broad' | 'pointed' | 'buck-teeth' | 'trunk' | 'flat-nose'
    | 'horn';
  tail: 'none' | 'puff' | 'bushy' | 'thin' | 'flat';
  /** Face pattern, for example the eye patches of the panda. */
  facePattern: 'none' | 'eye-patches' | 'cap' | 'stripe' | 'face-disc';
  body?: undefined;
}

/** A body of its own in place of the parametric biped (4.4): the penguin, or a studio body. */
interface OwnBodyParams extends CommonParams {
  body: 'penguin' | 'studio-bear' | 'studio-cat' | 'studio-dog' | 'studio-fox'
    | 'studio-polar-bear' | 'studio-rabbit';
  /** A seated tail that lies curled on the seat, and does not sway (5.1): the cat. */
  seatedTail?: 'curl';
  /** Ears that hang beside the head, and do not twitch (5.1): the dog. */
  hangingEars?: true;
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
  /** The seat of the chair above the floor, and of the high stool above its foot ring. */
  seatHeight: number;
  /** The base of the torso above the floor for a standing body. */
  standingBase: number;
  /** The thigh of a standing body, from the hip joint down to the knee. */
  standingThigh: number;
}
```

The skeleton of each species (`BodyProportions`) is one table. `proportionsOf()` fills each value
that `SpeciesParams.proportions` does not give with its default (`DEFAULT_PROPORTIONS`), and the
frame of the body (`models/body-frame.ts`) holds the result. The trunk, the arms, the legs, and the
seats (`seatHeights()` of `models/props.ts`, 4.5) read their joints and heights from it. The
default `H` is `DEFAULT_HEAD_HEIGHT` times the size of the species (4.5, body proportions).

The default skeleton is the skeleton of the bodies of 2026-10-06, which the user chose again
(`docs/decisions/2026-10-11-body-revert.md`), with the short legs of the reference images (below).
A species gives values of its own when its reference images show a different anatomy, such as the
heavy legs of the hippos (design 1). The tests of the behavior check each skeleton: the clearance
of the arms and the legs, the reach of the bow, the arm joints, the music stands, and the hidden
heads.

**Short legs.** The user said on 2026-10-11 that the legs of the animals were too long. The
reference images have small heads and long trunks, so their legs are short against their trunks.
Our bodies keep their large heads, so the legs follow the trunk
(`docs/research/2026-10-11-short-legs.md`). Thus:

- The seated knee is near the height of the seat, and the thigh slopes a little down to it from
  the hip joint. The thigh keeps its length, because a shorter thigh put the shin through the front
  of the seat.
- The seat fits the legs (`seatHeight`): the chair of each species, and the foot ring of the high
  stool. The user chose seats below the median of the reference images, so that the seated legs
  look clearly short in the default view (`docs/decisions/2026-10-11-low-seats.md`).
- The standing legs of the default skeleton are as short as the legs of the standing bear of
  `animals.webp` and `bear-views.png`. The egg body of the penguin shows no legs.
- The studio bodies and the rigged meshes of the user keep the trunks and the legs of their
  sources, with the bones of the studio (4.4). No value of this table applies to them, except the
  head height `H` and the seat heights of the polar bear, the rabbit, the foxes, the cat, and the
  dog, which `models/species.ts` reads from their studio bodies.
- The legs have the form of the reference images (`SEATED_LEG` and `STANDING_LEG` of
  `models/legs.ts`): a seated thigh as thick as the thighs of the model sheets, a shin that
  narrows little to the ankle, and a standing leg that is a straight column with no step at the
  knee. Round thick thighs above thin shins looked heavy.
- `models/legs.test.ts` keeps each seated knee low and the standing legs short.

A height map moves the torso of the parametric body with the table, so that a species can give
its own skeleton. Below the shoulder joints, each height of the torso scales with the joints.
Above them, the top rings and the neck keep their part of the way to the `head` bone. The `head`
bone stays 0.5 below the head center, and the head keeps its form. A `head` bone that is not above
the joints is an error. The default skeleton keeps each height to the bit, because the map adds
moves of 0.

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
- The penguins have black and white bodies, which look like choir robes (4.4, bodies of their
  own).
- The size rule of 4.2 puts the large species in the back row: the hippo plays the contrabass,
  the elephant the timpani, the panda the trombone, and the rhino the tuba. The strings have the
  rabbit, the red fox, the cat, and the dog. The piano has the polar bear (user, 2026-10-06).
- The celesta, the harpsichord, the clavinet, and the organs are seats of the piano section
  (3.8), so the polar bear plays them too. The merge rule of 3.7 gives one keyboard seat.
- The wolves play the clarinets (user, 2026-10-05): the gray animal with a clarinet of
  `animals.webp` is a wolf. The cast has 18 species. The bear conducts, and each other species
  plays.
- Further seats of a section alternate their species variants. For example, a third violin seat
  uses rabbits again, and a fourth uses red-orange foxes.

The shape parameters of each species of the parametric biped (4.5 gives the colors). The penguin
has its egg body, and the rabbit, the two foxes, the cat, the dog, the bear, and the polar bear
have studio bodies (4.4), so they have no row:

| Species | ears | snout | tail | facePattern |
|---|---|---|---|---|
| wolf | pointed | long | bushy | none |
| elephant | large-flap | trunk | thin | none |
| hippo | small | broad | thin | none |
| deer | antlered | long | puff | none |
| panda | round | short | puff | eye-patches |
| mouse | large-round | pointed | thin | none |
| beaver | small | buck-teeth | flat | none |
| monkey | side-round | short | thin | face-disc |
| pig | pointed | flat-nose | thin | none |
| rhino | small | horn | thin | none |
| badger | small | long | puff | stripe |

The face patterns of the head (`models/face-patterns.ts`):

- `stripe` (the badger) is a white stripe from the nose over the head, between two black stripes
  over the eyes.
- `eye-patches` (the panda) are two ovals around the eyes, with their lower ends out.
- `cap` (no species uses it now) is the accent color over the head down to below the eyes, with a
  blaze of the belly color down the middle of the face. It colors the faces of the head, and adds
  no part.
- `face-disc` (the monkey) is a large face of the belly color around the eyes.
- The eyes stand a little out of a patch or a disc, so that it does not hide them.

`antlered` (the deer) is two ears that point out to the sides, and two antlers of the belly color
on the head. `side-round` (the monkey) is two round ears at the sides of the head, at the height of
the eyes. With pointed ears, the deer looked like the fox, and with round ears on the top of the
head, the monkey looked like the bear.

The belly color also colors the muzzle and the lower face: the cheeks, the jaw, and the face up to
the eyes, as the white cheeks of the wolf in `animals.webp`. The forehead, the back of the head,
and the top of a long muzzle keep the fur color. On the torso, the belly color is a stripe down
the front that narrows toward the seat. A belly color on all front faces made the body look white
in the front view.

Each triangle of the body has one color: the place of its centroid or the direction of its face
picks the color (`splitByCentroid()` and `splitByFacing()` of `models/mesh.ts`). Thus a color
border follows the edges of the triangles.

## 4.4 Models

Code builds the bodies, the instruments, and the props from low-poly shapes with vertex colors.
Each body except the penguin's, the bear's, the polar bear's, the rabbit's, the foxes', the
cat's, and the dog's is the parametric body: `buildBiped()` of `models/biped.ts` builds it from
the parts of 4.5 (body proportions) on the skeleton of 4.3. A species with a `body` gets a body of
its own from `buildBiped()` in its place.

The user chose each body of its own, and the table "Bodies and roles" of
`docs/agents/model-work.md` lists them with their decision files. The bear conductor and the polar
bear pianist have the studio bodies of `lowpoly-studio/` (user, 2026-10-12). The rabbit violinist,
the red violin fox, the viola cat, and the cello dog have meshes of the user that the app rigs
itself, and the tan flute fox has the rig of the red fox with a tan palette (studio bodies, below).
The penguins have an egg body built in code (user, 2026-10-11). Each other species has the
parametric body of 2026-10-06 18:58, which the user chose again in place of the sculpts and the
rigged bodies (`docs/decisions/2026-10-11-body-revert.md`).

Each body follows these rules:

- A body has at most 2,600 triangles, and a studio body at most 3,200 (4.5, facets and triangle
  budgets).
- The animal faces -z, with its left side at -x, and the mouth is near the middle plane, below
  the eyes (`models/species.test.ts`).
- The body takes the colors of its species (4.5, species colors), and its bones have the names of
  4.7, so that the pose code of section 5 drives each body.
- Each part follows one bone (4.7). A studio body has the skin of the studio instead: up to four
  bones for each vertex.
- The tests of the behavior check each body: the clearance of the arms, the bow hold, the arm
  joints, the hidden heads, the budgets, the feet on the floor, and the footprints of the layout.
  `models/layout-scene.test.ts` limits the growth of each stage when a body grows its footprint.

**Bodies of their own**

A body of its own is built in code for one species, from rings of free corners, as the low-poly
models of the reference images (route 2 of `docs/agents/model-work.md`). `SpeciesParams.body`
selects it, and it reads only the size and the colors of the species. It places each bone of 4.7,
so that the pose code drives it as the biped.

The penguin (`models/penguin/`) copies the choir of `orchestra-latest.png` and
`orchestra-side.png`. It has no model sheet, so `pnpm choir-check <dir>` compares it with one
penguin of each image (7.1, `docs/research/2026-10-11-penguin-body.md`).

- The body is one tall egg with the head as its top, a full low belly, and no neck. The parametric
  penguin, with a head on a neck and long legs, looked like a teddy bear.
- The back and the flippers are black, and the white front is a shield from under the beak to the
  bottom. A small white patch carries each black eye, so that the eye shows on the black head.
- The upper half of the orange beak follows `head`, and its lower half `jaw`, so that the choir
  pose opens it (5.3).
- The body splits at the `chest` bone behind the folder, and each part reaches one ring into the
  other, so that a turn of the chest shows no gap. The `neck` and `head` bones are at the front of
  the lower edge of the head, so a lift of the head opens no gap.
- Each flipper is three flat parts on the arm bones, and its tip holds the edge of the folder.
  Two small feet stand under the egg, and no legs show.

**Studio bodies**

A studio body is the GLB file of an animal of `lowpoly-studio/`, or of a mesh of the user that
`pnpm rig-mesh` rigs into the same format: one mesh of faces with one color each, a skeleton of the
biped template with twist bones of the forearms, a skin of up to four bones for each vertex, and
corrective shapes. The studio bodies are the bear conductor
(`docs/decisions/2026-10-12-studio-bear.md`), the polar bear pianist
(`docs/decisions/2026-10-12-studio-polar-bear.md`), the rabbit violinist
(`docs/decisions/2026-10-13-mesh-rabbit.md`), the red violin fox
(`docs/decisions/2026-10-14-mesh-fox.md`), the tan flute fox
(`docs/decisions/2026-10-14-fox-flute.md`), the viola cat (`docs/decisions/2026-10-16-mesh-cat.md`),
and the cello dog (`docs/decisions/2026-10-17-mesh-dog.md`).

The app keeps its own motion (5.3, 5.4), so it drives the bones of the studio from the pose of the
player each frame: the retarget. It gave about a quarter of the folded faces of a skin on the bones
of the player (`docs/research/2026-10-12-studio-bear.md`).

```text
 lowpoly-studio/animals/bear/out/bear.glb
        | pnpm studio-body bear (tools/studio-body.ts, no Blender)
        v
 src/models/studio/bear.ts: StudioBody (packed mesh, heads, palms, sheet arms)
        | studioRig() (models/studio-rig.ts)
        v
 StudioRig: the skeleton of the player (arms straight down), the constants of the arms
        |                                   |
 buildStudioBody(): the body in the         poseAt() pose of the player (5.1), each frame
 bind pose of the player, two bones of          |
 the player for each corner (footprints,        v
 hanging arms, tests)                       poseStudioBones(): 33 studio bones + 38 bones of
                                            the player, the corrective weights
                                                |
                                                v
                                            the scene: one SkinnedMesh, 4 bones and morph
                                            targets (scene/player.ts)
```

- **Export.** `pnpm studio-body <animal>` reads the GLB file with no Blender, turns the animal to
  face -z, and scales it. It drops the props and the clips of the studio, because the app keeps its
  own. The four digits of a paw become one `fingers` bone. `--inspect` prints the facts that a new
  body needs.
- **Pea eyes.** The export drops the eyes of the mesh, and the app puts the pea eyes of the
  parametric bodies in their places on eye bones of their own, so that they blink (user,
  2026-10-15, `StudioBody.eyes`, `addEye()`). An eye moves out until the head covers no part of
  it (`eyePush()`), and takes its size from the head.
- **Mesh rig.** `pnpm rig-mesh <animal>` rigs a mesh of the user with no skeleton into the format
  of a studio body with Blender. The config `tools/mesh-rigs/<animal>.json` gives the joints,
  measured on cuts of the mesh, and the rules, each with a note. The decision files of the body
  give the values and their reasons, and `docs/agents/model-traps.md` gives the traps.
  - Form. The factors of the config change the form of the mesh to the choice of the user or to
    its sheet: the arms, the legs, the head, the neck, the trunk, and the girth. Each factor moves
    only its part, and the other chains move as a whole with their joints. The export keeps the
    head height and the head center of the source head, so that the holds in `H` keep their places
    (`ungrown()` of `tools/studio-body.ts`).
  - Seat. The rig poses the seated bind of 5.2 (`studio.legTurns`). It lowers the haunch of an
    image mesh onto the seat (`sit`), can turn the trunk upright (`studio.trunk`), and smooths the
    fold where the belly meets the thighs (`crease`).
  - Weights and shapes. Bone heat gives the weights, and rules of the config change them. Rings of
    new vertices at the joints of the arms keep the long thin faces of an image mesh from a fold
    (`refine.rings`). The corrective shapes give the source back in the standing pose, and up to
    four shapes of `raise` relax the faces that turn over in a raised arm, a bent elbow, or a bent
    wrist.
  - Colors. Each face takes the nearest color of a palette in Oklab from the texture. The faces of
    each old eye take the color of the fur around them, so that no outline shows around the pea
    eye. `colors.tone` keeps a gray fur gray under the warm light (the cat). The tan palette of the
    fox mesh (`StudioBody.palettes`, `SpeciesParams.palette`) lets one module serve both foxes.
  - Tail. `tail_tip` gives a tail of two bones, an optional bone of the studio format
    (`OPTIONAL_STUDIO_BONES` of `models/studio-format.ts`). The seated tail goes back through the
    open back of the chair, or `studio.tailCurl` bends it: the cat curls its tail on the seat, and
    the dog hangs a thin tail down behind it (`docs/decisions/2026-10-17-dog-tail.md`). A curled
    tail does not sway (5.1). The ears of the dog hang, and do not twitch
    (`OwnBodyParams.hangingEars`).
- **Scale.** The scale keeps a landmark that the scene depends on (`ANIMALS` in
  `tools/studio-body.ts`): the shoulder joints of the bear for the conductor stand, the keys of the
  studio piano of the polar bear, and the shoulder joints, the ear tips, or the head top that give
  each mesh body the size that the user chose. A longer leg raises the landmark by the same height,
  so the trunk, the head, and the arms keep their meters.
- **Seat.** A seated role binds its mesh seated. The export drops the body onto the floor, and
  moves it so that the front edge of the seat of the studio meets the front edge of the seat of the
  app. The polar bear then rises to its seat height (`seat` of `ANIMALS`). The rabbits, the foxes,
  the cats, and the dogs have chairs that fit their legs, so that their feet touch the floor (user,
  2026-10-16). Each level seat ends where the thighs leave it at the haunch (`chair.front`), because
  a longer seat meets the sloped thighs and the haunch hangs above it. `StudioBody.seatHeight` is
  the lowest point of the body over the seat, and the chair also takes the depth, the width, and
  the room behind the back of 4.5 (props) from the body (`chairDepth`, `chairWidth`, `backRoom`).
  The knees of the dog spread around the cello (user, 2026-10-17).
- **Soloist.** A seated body that also stands (`soloist` of `ANIMALS`) keeps the leg shapes and
  the turns of the pose of its sheet (`StudioBody.standing`). `standingBody()` of
  `models/studio-rig.ts` stands it within 1 mm of the source. The rabbit, the red fox, and the cat
  stand as soloists. The dog and the polar bear never stand.
- **Retarget.** The skeleton of the player has the joints of the studio, with each arm straight
  down, because the pose code reads a hanging arm in the bind pose (4.7, 5.2).
  `poseStudioBones()` moves the trunk, the head, the legs, and the tail of the studio with their
  bones of the player. Each arm of the studio takes the posed shoulder, elbow, and wrist of the
  player, and bends at the elbow axis of the studio. Each paw turns toward the forearm, up to a
  limit (`PAW_TURN`), because the skin of the studio bends well only near its clips. Each shape
  takes its weight from the pose alone (`raiseWeight()`), so the rule of stateless poses holds.
- **Render.** The scene draws the body with four bones for each vertex and the shapes as morph
  targets. The colors of the studio hold its baked occlusion. The fur gets smooth normals within
  the crease angle of the body (`crease` of `ANIMALS`, `studioNormals()`, 4.5, materials).
- **Crease angle.** The angle of a bear is the angle whose facet contrast is nearest to its
  reference images. The renders of the rabbit had less contrast than each reference, so the
  manager chose its angle from the play frames (`docs/research/2026-10-14-rabbit-smooth.md`). The
  red fox, the cat, and the dog take the angle of the rabbit, because the four are meshes of image
  models.
- **Bind mesh.** `buildStudioBody()` gives the mesh in the bind pose of the player, with two
  bones for each corner, for the footprints, the budgets, and the tests. The tests pose a studio
  body with its own skin (`posedCorner()`), and the sweep of each role (9.3) keeps the parts out of
  the body and the instrument. `docs/decisions/2026-10-13-role-sweep.md` lists each accepted depth.

**Rigged bodies**

No species has a rigged body since 2026-10-11, and the app has no code of it. The GLB files
`assets/models/rabbit/rabbit.glb` and `assets/models/bear/bear.glb` of the user and the tools stay
for a later body, and route 1 of `docs/agents/model-work.md` brings the code back.
`pnpm rig-body <species>` packs a file into `src/models/rigged/<species>.ts` with a baked skin: it
keeps the two largest weights of each vertex, gives the missing ear, tail, and finger bones a part
of the weight of their parents, moves the colors of the texture to the colors of the species
(`docs/decisions/2026-10-10-glb-skins.md`), and puts a plate on each eye, so that it blinks. The
limbs keep the lengths of the model, unless the user asks for the look of a reference image
(user, 2026-10-10).

**Tools of Blender**

- `pnpm glb-init <species> <glb>` starts a rigged body: it copies the file, and proposes the config
  of `pnpm rig-body`.
- `pnpm rig-body <species>` packs a rigged GLB body and bakes its skin (rigged bodies, above).

**Meshes**

- Each player is one `SkinnedMesh`: the body, the instrument, and the bow merge into one mesh.
  This gives one draw call for each player (4.5, materials). One `Mesh` for each part would give
  about 25 draw calls for each animal, which is too many for an integrated GPU.
- The static props merge into a few meshes.
- The parametric body has one module for each area: `models/trunk.ts` (the torso, the neck, and
  the head), `models/tails.ts`, `models/arms.ts`, and `models/legs.ts`. `buildBiped()` calls them
  in this order. The areas read their shared values from `models/body-frame.ts`.

## 4.5 Visual values

One world unit is one meter. The values of this section live in the code files that each block
names. A block gives the rules, the intent, and the reasons. The research reports and the decision
files keep the measures of each tuning.

The colors come from samples of the reference images. Design 1 says which image wins where they
differ. An image shows lit and shaded colors, so each base color is a little lighter than its
darkest sample.

- Tune the light first, until a screenshot of the default view looks like the reference. Change
  a base color only when a measurement shows that no light value can match the reference.
- Measure a color on the same part in a screenshot and in the reference image: the value, the
  hue, and the saturation of its lit pixels. Compare the default view with `orchestra-latest.png`
  and `mockup.png`, and the views page (7.1) with the model sheet of the species.
- The decision file or the research report of each change keeps its samples, such as
  [`2026-10-06-polished-look.md`](../decisions/2026-10-06-polished-look.md) and
  [`2026-10-06-polished-cast.md`](../decisions/2026-10-06-polished-cast.md).

**Scene colors**

`SCENE_COLORS` of `models/colors.ts` holds the colors of the chairs, the music stands, and the
sheet music, `STAGE_COLORS` of `models/props.ts` the stage, the risers, and the podium, and
`HALL_COLORS` of `scene/hall.ts` the hall. The hall is a dark, warm room. The stage is a dark
walnut with a tone for each plank, as in `mockup.png`. The lip is only a little lighter than the
planks, because a brighter lip gave a bright line around the stage, and a baked light
(`SIDE_GLOW` of `scene/stage.ts`) keeps the sides from black. The risers are a little lighter than
the planks, because they stand outside the pool of light. The chairs are a pale yellow wood. The
music stands are black with a warm gray desk, because black desks were the largest shapes of some
close shots.

**Species colors**

`SPECIES_COLORS` of `models/colors.ts` gives each species three colors: the fur, the belly and
the face, and the accent. The models and the seat dots of the UI read them through `SPECIES`
(`models/species.ts`). Each studio body keeps the colors of the faces of its GLB file (4.4), so
its colors and its accent parts here color no part of its body.

- All species have black eyes with a light (`EYE_COLOR` and `EYE_LIGHT_COLOR`), and a dark nose
  (`NOSE_COLOR`), unless their accent parts include the nose. The open beak of the penguin shows a
  dark mouth (`MOUTH_COLOR` of `models/penguin/penguin-parts.ts`).
- The teeth, the tusks, and the antlers have `TEETH_COLOR` or the belly color. The inside of an
  ear has the belly color, unless the accent parts include the inner ears or the ears.
- The accent color goes to the accent parts of the species (table below) and to the face pattern
  of 4.3, except the middle stripe of `stripe` and `face-disc`, which have the belly color. Accent
  arms also color a band over the shoulders, and accent feet the lower shins, as the dark socks of
  the fox in `animals.webp`.

```typescript
type AccentPart = 'inner-ears' | 'ears' | 'nose' | 'snout' | 'horn' | 'beak' | 'arms' | 'hands'
  | 'legs' | 'feet' | 'tail' | 'face-pattern';
```

| Species | Accent parts | Species | Accent parts |
|---|---|---|---|
| rabbit | inner-ears, nose | cat | inner-ears, nose |
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

`INSTRUMENT_COLORS` of `models/colors.ts` holds the colors of the instruments, after the polished
images. The bowed strings are varnished wood with a lighter arched top. Their strings are one thin
strip, so that they show no light bar. The clarinet is black lacquer with silver keys, the flutes
are silver, and the brass is gold with open bells that show the lit inside of the flare. The
timpani are copper. The piano is black lacquer with a dark well and a dark gold plate inside its
open case (`PIANO_INSIDE` of `models/instruments/piano.ts`).

**Materials**

- All meshes share one `MeshStandardMaterial` with vertex colors and crease normals
  (`models/shading.ts`), so each player has one material and one draw call.
- The corners at one point weld into one vertex, also across two bones, so that the seam between
  `spine` and `chest` stays smooth. A corner gets the mean normal of the faces at its vertex
  within the crease angle of its finish, each face weighted by the angle of its corner.
- Each triangle has a finish (`Finish` and `FINISHES` of `models/mesh.ts`): a roughness, a
  metalness, and a crease angle. The `uv` of a vertex points at the texel of its finish in a
  table that is the roughness map and the metalness map of the material.

| Finish | Parts | Intent |
|---|---|---|
| `matte` | Cloth, raw wood, the stage, the props, and the bodies. | No gloss, and flat faces. The fur of a studio body smooths the angles below its crease angle. |
| `varnish` | The varnished wood of the bowed strings. | A soft gloss. |
| `lacquer` | The black lacquer of the piano and the clarinet, and the eyes. | A sharp gloss. |
| `metal` | Brass, copper, and silver. | Sharp highlights. The environment map of the hall is dark, so a high metalness makes metal look black. |

- The `matte` finish keeps each face flat, so the animals show the facets of the low-poly look
  that the user chose (2026-10-09). A smooth crease made the heads and the bodies look round.
- The studio bodies smooth their fur (user, 2026-10-14), because their many small faces showed a
  crumpled pattern under the hard spotlight. The larger edges, such as the rims of the ears, stay
  sharp (4.4, crease angle). The glossy finishes smooth the small angles of a curved part.
- The vertex colors of a player hold a baked ambient occlusion (`shadeMesh()` of
  `models/shading.ts`), so that the folds stay dark in the light of the hall. An arm and a piece
  in a hand shade only their parent and their children, because an occlusion of the bind pose
  would stay on the side of the torso as a dark stripe when the arm rises. A studio body keeps the
  occlusion of the studio. The props and the stage get none.
- The material has no fur shading (user, 2026-10-07).

**Light and render**

`scene/lights.ts` holds the lights, `scene/light-pool.ts` the pool of the stage lights,
`scene/beam.ts` and `models/beam.ts` the visible beam, and `scene/solo-light.ts` the light of a
solo.

- One warm `SpotLight` behind and high above the orchestra is the key light, and the only light
  that casts shadows. Its soft penumbra keeps the stage sides dark, and the shadows fan out to the
  front, as in `mockup.png`. Its intensity grows with the square of the distance to the aim
  point, so each stage size gets the same light. The shadow map and the filter follow the tier
  (2.6).
- A low, nearly neutral fill keeps the shadows deep. Two soft side lights at the front corners
  light the fronts of the sections, because the players face the conductor. One weak light shows
  the face of the conductor in the conductor shots.
- The light is a pool on the conductor and the middle of the orchestra, as in `mockup.png`. A
  factor in the shaders multiplies each spotlight (`addLightPool()`), because a separate pool
  light cost GPU time on each lit pixel. The pool falls off only at the side edges and the front
  corners (user, 2026-10-07).
- The visible beam (`BEAM_LOOK`) is haze inside a narrower cone with the apex of the key light,
  because haze in the full cone veiled the orchestra. Its density grows with the height, so the
  beam fades toward the stage with no edge. A depth pass (`BeamDepth`) ends each view ray on the
  scene and gives no haze to an item on the stage, so the beam shows between the players down to
  the stage (user, 2026-10-06). The depth pass also renders the shadow map, so each bone texture
  uploads one time in each frame.
- Dust motes drift in the haze by the tier. With reduced motion, the noise, the motes, and the
  grain stand still (2.5).
- The camera multiplies the opacity of the beam by a factor (`shots/beam-opacity.ts`), because the
  additive beam washed out the close shots. The factor is 1 in a wide or a high shot, and small in
  a close shot (5.6). In Free mode, it follows the distance to the stage center.
- **Solo light** (`soloAim()`, user, 2026-10-07). When the user solos seats (2.4, 6.6), the key
  light, its pool, and the beam turn to the soloed players, and the pool dims the other players.
  The aim comes from the solo flags and the layout alone. The lights ease to a new aim in less
  than a second, and at once with reduced motion.
- An environment map of a dark room with warm lamps gives the reflections
  (`scene/environment.ts`). The renderer makes it again after a restored WebGL context.
- Tone mapping is AgX, in the final pass. ACES moved the dark wood to red. The gallery page keeps
  ACES, and the views page uses AgX (7.1).

**Hall**

The concert hall (`scene/hall.ts`, `HALL`) scales with the stage side, with a minimum, so that a
small stage also gets a full hall. A ring of walls with two balcony tiers, gilded rails, and lamps
stands around the stage, as in `scene.png` (1). The row of low lamps has a gap at the back
(`HALL.wallLamps.backGap`), because lamps behind the stage floated above the orchestra and near
the title of the first screen (2.8). Each lamp has a soft glow disc (`createGlows()`), because the
bloom alone gave a halo of 1 to 2 pixels. The shell and the floor take no light, and hold a baked
light (`HALL_LIGHT`, `HALL_FLOOR`), because the lights cost GPU time on large surfaces. All faces
point into the hall, so the near balconies do not stand in front of the stage. The vertex shader
drops each cut quad as a whole, because a discard cost the hidden surface removal of the tile GPUs
of Apple.

**Post effects**

The scene renders into a target with MSAA, then the post effects make the image of the canvas
(`scene/post.ts`, `POST_LOOK`).

```text
scene ──> [scene target, MSAA] ──┬──> bloom down 1/2 ... ──> bloom up ──────────┐
                                 └──> blur prepare 1/2 ──> blur gather 1/2 ──┐  │
scene ──> [depth 1/2] ──────────────────────^ (only with a shallow focus)    v  v
          [scene target] ───────────────────────────────────────────────> final pass ──> canvas
```

- The scene target holds packed floats, else half floats. With neither, the scene renders to the
  canvas with no post effects. The bloom has a number of levels by the tier (2.6).
- The depth of field follows a thin lens, with the focus on the subject of the shot (5.6). The
  blur has a smaller limit in front of the focus, so that the bear in front of a section shot is
  only a little soft. The aperture closes for a far focus, so the wide views stay sharp and skip
  the blur passes. The user found larger apertures too blurry (2026-10-07).
- A separate depth pass at half size gives the depth, because the resolve of the multisample depth
  cost more time (9.7). A sample behind the pixel blurs at most as much as the pixel, so a sharp
  subject keeps its outline.
- Free mode has no depth of field (user, 2026-10-07).
- The final pass does the depth of field, the bloom, the tone mapping, a grade, a lift of the
  highlights, a vignette, and a grain. The lift keeps the white fur as light as in `mockup.png`.
  The wall time sets the grain, so a display of 120 Hz shows the same grain rate.

**Camera**

`shots/view.ts` holds the values of the camera: the field of view, the default view, the
landscape rule, the portrait rule, and the orbit limits. `shots/frame.ts` holds the frame.

- The camera is a perspective camera with a vertical field of view of 30°. The far plane is the
  camera distance plus `3 × S`, so that a full zoom-out still shows the stage.
- The default view stands on the audience axis and sees the back of the conductor, as
  `orchestra-latest.png` (1): the full stage with the podium at the bottom middle and the back row
  at the top. The camera looks down at `DEFAULT_ELEVATION` at `DEFAULT_TARGET`. In the axes of the
  stage origin (below), the camera is at `target + d × (0, sin e, cos e)` for the elevation `e`
  and the distance `d`. The wide shots of 5.6 look at the same target, and Free mode turns around
  it (2.5). The test of the hidden heads (4.2) and the tests of the first screen (2.8) set the
  limits of this view.
- The default distance is `DEFAULT_DISTANCE_IN_SIDES × S` for a viewport that is not taller than
  wide. A taller viewport multiplies it by its height divided by its width. The wide shots, the
  planner, and the beam fade use it as their unit.
- **Landscape rule** (user, 2026-10-06). The stage fills the free area left of the open drawer, as
  in `mockup.png` (2.8). The players fill almost the full width of the free area, and the front
  corners of the stage can leave the frame (`landscapeZoom()`).
- **Portrait rule** (user, 2026-10-06). A portrait viewport gets a lower and more frontal view, so
  that the orchestra fills more of the tall screen. Its share grows smoothly with the aspect, so a
  turn of the screen makes no jump (`PORTRAIT_RULE`). Both rules keep each player whole in the
  frame of each wide shot, between the title and the bar of 2.8 (`wideView()`).
- **Frame.** `camera.setViewOffset` puts the middle of the frame in the middle of the free area
  beside the bar, the drawer, or the sheet of a phone (2.8, `viewFrame()`). A close shot of 5.6
  fits its full frame into the free area, so that the bar and the drawer cover no part that the
  planner tests. While the play button of the first screen shows, the frame shrinks until the
  stage is clear of it.
- **Orbit limits.** Free mode keeps a range of elevations and a largest distance. The near limit
  keeps the camera outside the box of the stage and the players (`orbitMinDistance()`), so that a
  zoom does not put the camera among the players.

**Body proportions**

The head height `H` is the unit of the body. The default `H` is `DEFAULT_HEAD_HEIGHT` of
`models/species.ts` times the size of the species, so the species keep their sizes relative to
each other and to the chairs and the podium of the reference image. The head top is 0.5 H above
the head center. The table gives the parts of the parametric body (4.4).

| Part | Code | Intent |
|---|---|---|
| Head | `models/head.ts` | The round head of the polished images, with full cheeks that carry the muzzle. Every second ring turns by half a side, for small triangle facets. |
| Torso and neck | `models/trunk.ts` | A round pear torso with the belly forward, as in `animals.webp`, and a short thick neck that the torso and the head hide. |
| Arms and hands | `models/arms.ts` | Two limbs for each arm and a round mitten. The upper arm starts in a dome around the shoulder joint, so that the shoulder sinks into the torso in each pose. |
| Legs and feet | `models/legs.ts` | The short legs of 4.3, with round shoes on the floor or on the foot ring of a high stool. |
| Eyes | `models/eyes.ts` | Two black upright ovals with a white light, half in the head between the front and the sides, so that the side view shows them. The studio bodies have the same eyes (4.4). No mouth. |
| Ears | `models/ears.ts` | The ear type of the species (4.3). The large-round ears sit high and out, so that the mouse does not look like the bear. |
| Snouts | `models/snouts.ts` | The snout type of the species (4.3). A long muzzle reaches past the mouth, so that the mouthpiece of a wind instrument is under it. |
| Tails | `models/tails.ts` | The tail type of the species (4.3). A long tail goes back through the open back of the chair. |
| Face patterns | `models/face-patterns.ts` | The face pattern of the species (4.3). |

A player that stands (the timpani, the percussion, the choir, and the conductor, 4.6) has short
straight legs. The soloist of 3.8 also stands when it plays the violin, the viola, the flute, the
oboe, the clarinet, the horn, the trumpet, or the trombone, as in a concerto (user, 2026-10-06).
The soloist of the cello, the bassoon, or the tuba sits on a chair, and the contrabass, the harp,
and the piano keep their stools and the bench (`supportOf()` of `models/player.ts`). The props of a
standing player fit its shoulders.

The width of the torso and the thickness of the limbs are the same for all parametric species, in
`H`. Each species moves toward the anatomy of its reference images (design 1). On a chair, the body
moves forward on the seat until it keeps a small gap from the back (`chairForward()`), and a floor
instrument, such as the cello, moves with it.

**Facets and triangle budgets**

- The parametric body shows small triangle facets. The target is the large, flat, and clean facets
  of the reference images (design 1, `lowpoly-animals.png`), as on the egg body of the penguin.
- A body has at most 2,600 triangles. A studio body keeps the faces of its GLB file, and its GLB
  file has a budget of 3,200 faces. The rabbit and the red fox play in the violin sections, the
  cat in the violas, the dog in the cellos, and the tan fox in the flutes, so many studio bodies
  share the scene. The pea eyes add their triangles to a studio body
  (`docs/decisions/2026-10-15-pea-eyes.md`).
- An instrument has at most 800 triangles, except the timpani (1,200) and the piano (2,000). A
  chair or the piano bench has at most 120, and a stand at most 80. The full scene with 60
  players has at most 200,000. The frame cost of `perf-60.mid` set these budgets (9.7).
  `models/budget.test.ts` and `models/species.test.ts` check them.

**Props and stage**

`models/props.ts` holds the sizes of the chairs, the stools, the music stands, and the choir
risers. `models/stage.ts` holds the sizes of the stage, the podium, and the conductor stand.

| Item | Rules |
|---|---|
| Chair | A seat, two back posts, one wide top rail, open below the rail, and four legs (`CHAIR`), as in `animals.webp`. The seat is at the `seatHeight` of the skeleton (`seatHeights()`, 4.3), so each species has a chair of its own height. Under a studio body, the seat takes the depth, the room, and the width of 4.4 (seat). |
| Stool | For the harp, with no back (`STOOL`). It keeps its height, so that the left hand reaches the highest strings. |
| High stool | For the contrabass, with a foot ring at the `seatHeight` of the skeleton below the seat (`HIGH_STOOL`). |
| Music stand | A tripod, a post, and a tilted desk with a white sheet (`MUSIC_STAND`). The top edge of the desk stays below the lowest seated eye of its players (`standDeskHeight()`), so that it never hides their eyes. |
| Podium | A box with cut corners and framed panels (`PODIUM_SIZE`, `PODIUM_TRIM`), as in `orchestra-latest.png`, at the size of the podium of `bear-views.png`. |
| Conductor stand | A desk on a post in front of the podium (`CONDUCTOR_STAND`). Its top edge is at the shoulders of the bear, as in `animals.webp`, so that the beat stays below the head. A post on the podium put the belly of the bear through the desk. |
| Stage | A slab of side `S` (stage origin, below) with no steps, cut corners (`STAGE_CORNER_CUT`), and a raised lip (`STAGE_LIP`). The planks run from the left to the right, and a hash gives each its length and its tone. The roughness of the wood (`STAGE_FINISH`) sets the width of the pool of light. |
| Choir risers | Up to three arc levels behind the orchestra (seat geometry, below), with three steps in front, as in `orchestra-latest.png` (`RISER`). |
| Floor | The floor of the hall, with the baked spill of the stage light (hall, above). |

**Stage origin**

The world origin is the stage center, on the top of the stage. The axes are the right-handed
axes of Three.js: +x points to the right as the audience sees it, +y points up, and +z points to
the audience (the front).

1. Place the soloist (soloist, below), then the seats in arcs around the podium center.
2. Calculate the half width `L`: the largest `|x|` of a seat, plus 0.5 m for the chair and 0.3 m
   of margin. `L` is also at least the largest `|x|` of a footprint box (seat geometry, below),
   plus 0.3 m.
3. Calculate the front distance `F` from the front edge to the podium center: 1.0 m. With a
   soloist, the front edge also stays 0.3 m in front of its footprint.
4. Calculate the depth `D`: `F`, plus the largest distance behind the podium of a seat, plus
   0.5 m for the chair and 0.3 m of margin. The footprint boxes count as in step 2.
5. The stage side is `S = max(5, 2 × L, D)`. The front edge stays `F` in front of the podium
   center, so any extra depth goes to the back.
6. Spread the instrumental rows inside the stage (seat geometry, below). `S` does not change.
7. Move all items so that the stage center is the origin. The podium center is then at
   `(0, 0, S / 2 - F)`.

These values keep the stage near the size of the reference image (`REFERENCE_STAGE_SIDE` of
`models/test-layout.ts`). `models/layout-scene.test.ts` limits the growth of the stage of each
demo.

**Seat geometry**

The seats stand in arcs around the podium center (`models/layout-scene.ts`). All players face the
podium, except the pianist. An angle of 0° points from the podium to the back (-z), and negative
angles are on the left. A seat at the angle `a` and the radius `r` is at
`podium + (r × sin a, 0, -r × cos a)`.

- A seated player uses at least 0.95 m of arc, and a choir singer 0.60 m. The arc between two
  neighbors grows until their footprints keep 0.05 m apart, so a wide body or instrument gets more
  arc.
- Two string players of a seat share one stand, in front of the row between them
  (`STAND_DISTANCE` of `models/layout.ts`). Each woodwind and brass player has its own stand,
  clear of its instrument.
- Rows 0 and 1 hold the first desks and the other desks of the strings (4.2): the violins left of
  0° and the violas and the cellos right of it, so no string player sits behind the conductor. The
  other rows are centered on 0° and span at most 160°. A row with no players drops out.
- Row `n` has the radius `r(n) = max(r(n - 1) + 1.2, width(n) / 2.79)`, where `width(n)` is the
  arc length that its players need and 2.79 is 160° in radians. `r(-1)` is 1.2. Then the row moves
  back until its footprints keep 0.05 m from the items in front.
- Riser level `k` of the choir has the radius `r + 0.8 × k` and the height `1.0 + 0.25 × k`, where
  `r` is 1.2 m more than the radius of the last instrumental row. The lowest level is high enough
  that the back row hides no singer (4.2). The layout keeps the count of levels with the smallest
  stage, and then widens the levels (`widenRisers()`), as the risers of `orchestra-latest.png`.
  The vocal soloists of 3.8 stand alone on level 0, and the choir on levels 1 and 2.
- After the stage size, each instrumental row spreads to the side edges, because the packed rows
  left the front corners empty. Each side of a row takes the largest factor of its arcs
  (`SpreadLimits`) that keeps each footprint 0.3 m inside the outline of the stage
  (`boxOnStage()`) and 0.05 m from the other items. Then row 1 moves its back desks toward the
  first desks of their seats, as the wedges of a professional orchestra (the wedge pass).
- A row that sets the width (`2 × L`) cannot spread, so its back corners stay empty, and 4.1 keeps
  the square stage.

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
height, in the bind pose, and the box of its seat. A music stand and a riser level have boxes for
their parts. The overlap test of `models/` places the footprints of all items of each demo layout
and of the 60 players of `perf-60.mid` (9.5). No two items touch, and each item is on the stage.

| Row | Sections, from left to right |
|---|---|
| 0 | the first desk of: violins (first seat), violins (second and later seats), violas, cellos |
| 1 | the other desks of: violins (first seat), violins (second and later seats), violas, cellos |
| 2 | a keyboard of the orchestra (4.2), harp, flutes, oboes |
| 3 | horns, clarinets, bassoons, trumpets |
| 4 | percussion, contrabasses, timpani, trombones, tuba |
| 5 | choir, on the risers |

**Soloist.** The soloist of 3.8 stands outside the arcs, at the front left of the conductor
(4.2), at `SOLOIST_PLACE` of `models/layout-scene.ts`. It faces the audience and turns to the
conductor (`SOLOIST_FACING`), so the default view sees its face. A place farther left hid a player
of the first desk, and a place nearer to the conductor put the bear into the solo shots. A piano
soloist sits at a piano at `PIANO_CENTER`, with the keyboard at the left end, and faces the
conductor, as in a concerto, so the lid opens to the audience. A keyboard of the orchestra (4.2)
is the leftmost member of row 2, and turns a quarter turn, so that its case lies along the row.
The rows keep 0.05 m from the soloist and the piano.

**Chamber group.** A chamber group (4.2) has no conductor and no podium, and the podium center is
only the center of its arc (`CHAMBER` of `models/layout-scene.ts`). The players of an arc stand in
one row centered on 0°, each side within 60°, and face the center, so they face each other a
little. The arc has no spread. A solo player stands at the middle of the arc and faces the
audience. In a recital, the partner stands in front of the curved side of the piano, faces the
audience, and turns a little to the pianist. The stage rule applies from the middle of the group.

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
the rabbit of the reference image. A species can play a smaller violin, viola, or cello
(`SpeciesParams.violinScale`, `celloScale`), as a child plays a fractional size. A smaller cello
has a longer end pin, so that its top stays against the chest (`endPinLength()` of
`models/instruments/strings.ts`). A violin shop sizes a violin so that, with the left arm
extended, the scroll lies in the middle of the palm (`pnpm hold-reach`,
`docs/research/2026-10-13-rabbit-mesh.md`). The user chose the instrument sizes and the arms of
the mesh bodies, and the holds fit them. The rabbit and the red fox play almost the violin of the
app, and the cat plays the viola of the app. Their arms are shorter than the rule needs, so their
holds put the instrument nearer to the neck, and the left paw still reaches the nut (5.3,
`docs/decisions/2026-10-16-mesh-cat.md`). The dog plays a 1/2 cello between its knees, and its
left paw reaches the whole fingerboard (`docs/decisions/2026-10-17-dog-arms.md`). The tan fox
plays the flute of the app, and each palm reaches its grip in the play and in the rest
(`docs/decisions/2026-10-17-fox-form.md`). The paused check of the rule in `pose/bowed.test.ts`
fails for the short arms. The chairs, the stands, the podium, and the steps keep their sizes in
meters. The bodies of the bowed strings are plates with round edges and an arched top (`plate()`
of `models/primitives.ts`), with two f-holes.

**Sizes and holds**

The hold gives the place of each piece in the bind pose of 4.7, in the axes of the model: the
player faces -z, and its left is -x. An offset in `H` uses the head height of the player. The code
of each instrument (`models/instruments/`) holds its sizes and the offsets of its hold.

| Instrument | Model | Hold in the bind pose |
|---|---|---|
| Violin | A body with an arched top, a neck, a scroll, and a bow. | Under the chin on the left shoulder. The violin points to the left of the front and a little down, and its top plate turns to the front, so the audience sees it. The bow plays between the bridge and the fingerboard. The stick lies in the fingers of the hanging right hand and points to the front, because a grip in front of the palm put the stick through the hand. A species can give the grip of its bow (`SpeciesParams.bowGrip`), so that the stick passes through its closed paw (`docs/decisions/2026-10-17-grip-all.md`). |
| Viola | The violin at 1.15 scale, with the violin bow. | As the violin. |
| Cello | A body with an end pin, and a bow. | The end pin stands in front of the seat. The cello leans back to the chest and to the left, so that its neck passes the left of the head, as in `animals.webp`. The bow as on the violin. |
| Contrabass | The cello at 1.6 scale, with the cello bow. | At the left side, in front of the seat, with the neck past the left of the head. |
| Harp | 24 strings that show the 47 strings of a concert harp, C1 to G7. | Between the knees. The harp leans back and turns, so that the soundbox comes to the right shoulder, and the neck passes the right side of the face. With no turn, the neck went through the face of the deer. |
| Piano | A case with an open lid, white and black keys, and a desk with sheet music. The lid opens less than in `mockup.png`, because a wider lid hid the heads of the players behind it. | The front of the keys stands in front of the floor point of the pianist (`PIANO_FRONT_H` of `models/instruments/piano.ts`), clear of the round belly and the muzzle of the polar bear (5.3). |
| Piano bench | A seat of `PIANO_BENCH`. Under the studio polar bear, it is at the height of `seat` of its entry in `ANIMALS`, which the user asked for (4.4, seat). The app does not stretch the legs of a studio body (user, 2026-10-10). | A static prop under the pianist, as a chair. |
| Choir folder | Two open covers with pages. | In both hands, in front of the head and below it, leaned back so that the pages face the eyes. |
| Flute | A silver tube. | The hole of the lip plate is at the mouth. The flute points to the right, a little to the front and down. |
| Oboe | A thin dark tube with a small bell and keys. | The tip of the reed is at the mouth. The oboe hangs to the front, 30° from the vertical. |
| Clarinet | A black tube with a mouthpiece, silver rings and keys, and a bell. | The tip of the mouthpiece is at the mouth. The clarinet hangs to the front, 25° from the vertical, as in the reference image. |
| Bassoon | A tall wooden tube with the boot, the wing joint, and the bocal. | The tip of the reed is at the mouth. The bassoon leans to the left across the body, with the boot at the right hip. |
| Horn | A coil and a bell. | The mouthpiece is at the mouth. The coil stands low in front of the right side of the chest, and the bell opens to the right and back, clear of the right leg. The right palm is in the bell, and the left palm holds the coil near the valves. |
| Trumpet | A tube with three valves and a forward bell. | The mouthpiece is at the mouth. The trumpet points forward and a little down. |
| Trombone | A tube with a slide and a bell. The slide moves from the first position to the seventh. | The mouthpiece is at the mouth. The slide points forward and down. The slide is a second piece on the `slide` bone, and the right palm holds its brace. |
| Tuba | A large tube with a bell that opens up. | The mouthpiece is at the mouth. The body stands in the lap, and the bell is at the left of the head. |
| Timpani | Two to four kettles at 0.7 of the size of real kettles. Two kettles when the highest timpani note is C3 or lower, three up to F3, else four (`kettleCount()`). | The kettles stand in an arc around the player, the largest at the left. A mallet in each hand. |
| Bass drum | A drum on a frame, and a beater. | At the front left of the player, below the shoulders of the badger. |
| Snare drum | A drum on a tripod, and two sticks. | In front of the player, below the shoulders, so that the wrists stay out of the belly. |
| Cymbals | Two crash cymbals with straps. | One cymbal in each hand, with the inner faces to each other, above the floor. |
| Small percussion | A triangle with a beater, and a tambourine on a tripod. | The triangle hangs from the left hand, and the beater is in the right hand. The tambourine stands at the front right of the player. The beater strikes it for key 54. |
| Xylophone | 30 bars from C5 to F7 on a frame, the natural bars in front. | In front of the player, below the shoulders, with a mallet in each hand. |
| Baton | A straight white stick with a handle that tapers to the tip, as in `bear-views.png` and `orchestra-latest.png` (user, 2026-10-13). | In the right hand. |

In the bind pose, each mallet, stick, beater, the triangle, and the baton lies in the hanging
hand in front of the palm, and points forward. No vertex of a player model is below the floor: a
test checks each species with each instrument.

**Instrument data**

`models/instruments/` builds each instrument as pure data with no scene-graph object of Three.js
(7.1). `buildInstrument(id)` gives an `InstrumentModel`:

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
  position of its bone, so step 5 turns a mallet around the palm, and a bow around its grip.
- `holdInstrument(model, body)` places the pieces on the points of one body: the head center,
  the mouth, the two palms, and the floor under the body. The anchor `instrument` puts a piece in
  the axes of the instrument piece, for the trombone slide. `attachInstrument()` adds the parts to
  the mesh of the player, so one function attaches each instrument to each species.
- A target is a point or a line on a piece, with the unit normal of its surface. A line that
  follows the pitch, such as the piano keys, also gives the MIDI keys at its two ends.
- `pianoKeyPosition(key)`, `xylophoneBarPosition(key)`, and `harpStringPosition(key)` give the
  point of each key, bar, or string, because a pitch is not linear along the evenly spaced white
  keys, natural bars, and harp strings. A sharp of the harp plays on the string of the natural
  below it, as a pedal raises it.
- `kettleCount(highestKey)` gives the number of kettles of the timpani.
- The trombone slide moves along its axis, which a bone rotation cannot do, so the pose has a move
  of the `slide` bone, `AnimalPose.slideOffset` (5.1).

## 4.7 Rig

Each player has one skeleton with the bones of the list below. A vertex of a parametric body
follows one or two bones:

- The mesh data (`MeshData` in `models/mesh.ts`) gives each corner a main bone (`bones`), a
  second bone (`blendBones`), and the weight of the second bone (`blendWeights`), from 0 to 0.5.
- A rigid part follows one bone: the second bone of each corner is its main bone, with the
  weight 0. A skinned part gives a skin rule (`SkinRule`) that gives two bones (a parent and its
  child) and the weight from the bind position of a corner (`blendSkin()`).
- The GPU blends the two bones linearly. The vertex shader of three.js always blends four bones,
  so the second bone adds no shader work.
- Each part of the parametric body is rigid. The arm is two limbs on `upperArm` and `forearm`,
  with a rigid dome over the shoulder joint (`docs/research/2026-10-06-shoulder-spike.md`). A long
  tail is two parts on `tail1` and `tail2`. The leg is the thigh on `thigh`, the knee and the shin
  on `shin`, and the foot on `foot`. No pose turns the legs.
- A studio body (4.4) has a skeleton of its own: the 30 body bones of the biped template of the
  studio, two eye bones for the pea eyes, and the optional tip of a tail of two bones (`tail_tip`:
  the red fox, the tan fox, the cat, and the dog). Each vertex follows up to four of them, and the
  corrective shapes move the skin of the arms. The scene gives the mesh one bone for each studio
  bone and one for each bone of the player, and `poseStudioBones()` writes their matrices from the
  pose of the player. The bones of the player keep the list below, so the pose code drives a
  studio body as each other body. The blink scales the eye bones of the studio
  (`studioRenderMesh()`).
- The egg body of the penguin (4.4) is rigid too: its body on `spine` and `chest`, its head and
  upper beak on `head`, its lower beak on `jaw`, its flippers on the arm bones, and its feet on
  `foot`.

For each body, the readers of the bind mesh read the main bone: the footprints, the chair
clearance, the baked occlusion (4.5), the silhouettes, and the triangle budgets. `posedCorner()` of
`pose/test-skin.ts` poses a corner in the tests as the GPU does.

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
- The skeleton of the species (4.3) gives the bind positions of the joints. The height map of 4.3
  moves the `hips`, `spine`, `chest`, and `neck` bones with the shoulder joints.
- Each skeleton has all bones of the list, so a bone has the same index in each player. A bone
  with no part, such as the trunk of a rabbit, moves nothing.
- In the bind pose, no bone has a rotation. The body sits on its seat: the thighs rest on the
  seat, the knees bend, the shins hang down, and the arms hang down beside the body. The
  instrument is in its playing place on its bone, and the bow lies in the hanging right hand. The
  penguin stands on its soles, and its flippers hang straight down.
