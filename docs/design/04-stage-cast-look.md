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

- The strings sit in wedges. The first desk of each string seat (its players 0 and 1) sits in
  the front row, and its other desks sit in the row behind it. The rows spread to the side edges,
  as in the reference image (4.5, seat geometry).
- A keyboard of the orchestra (a celesta, a harpsichord, or an organ that is not the soloist of
  3.8) sits at the left of the harp, as the celesta of a professional orchestra. With no harp and
  no woodwinds, it sits in the middle behind the strings, as a continuo harpsichord.
- The vocal soloists of 3.8 stand in front of the choir, on the lowest level of the risers,
  because a place beside the conductor covers the first violins or the cellos.
- The soloist of 3.8 stands or sits at the front left of the conductor, as in a concerto (user,
  2026-10-06). A piano seat is always the soloist (3.8), so the piano stands there. Another
  soloist leaves its section row and stands next to the podium (4.5, seat geometry). It has no
  music stand, because a soloist plays from memory.
- **Chamber group.** A score with at most 5 players has no conductor and no podium (user,
  2026-10-06), because a conductor for one pianist looked wrong. The players sit in a small arc at
  the stage center and face each other a little, as a real chamber group does. A score with no
  players keeps the conductor, so that the stage is not empty. `chamberFormOf()` of
  `models/cast.ts` gives one of three forms:

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

  - **Solo.** One player at the stage center faces the audience, with no music stand.
  - **Recital.** A pianist and a partner in the crook of the piano, as in a recital.
  - **Arc.** Two to five players in one arc, in the order of the rows, so a string quartet sits
    in the classic half circle. The players of an arc sit.
  - No player leaves the group as a soloist. A player alone and the partner of a pianist stand
    when their instrument stands as a soloist (4.5, body proportions).

- Larger species sit farther back, so that a big animal hides no smaller animal (user,
  2026-10-05). A species of the size 1.2 or more plays only the contrabass, the timpani, the
  trombone, or the tuba. The strings have species of the size 1.05 or less, and the piano 1.1 or
  less (`docs/research/seating.md`, section 5).
- In the default view, a large species hides less than 10% of the head of each smaller animal
  (`scene/hidden-heads.test.ts`).

## 4.3 Species

The penguins, the bear conductor, the polar bear pianist, the rabbit violinist, the two foxes,
the viola cats, the cello dogs, the trombone pandas, the contrabass hippos, the oboe mice, the
timpani elephant, the bassoon beavers, the horn pigs, the clarinet wolves, the trumpet monkeys, the
percussion badgers, the tuba rhinos, and the harp deer have bodies of their own (4.4). No species
uses the parametric biped body since 2026-10-21.
Each species has one `SpeciesParams` in `SPECIES` of `models/species.ts`, and changes only its parameters. A
species can have a body of its own in place of the biped (`body`, 4.4, bodies of their own and
studio bodies). The bear, the polar bear, the rabbit,
the two foxes, the cat, the dog, the panda, the hippo, the mouse, the elephant, the beaver, the
pig, the wolf, the monkey, the badger, the rhino, the deer, and the penguin have meshes of the user
that `pnpm rig-mesh` rigs. The two foxes share one rig, and the tan fox takes
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
  /** The scale of the contrabass and its bow for a species (4.6). 1 by default. */
  bassScale?: number;
  /** The lengths of the longer lead pipe of the tuba, back and left, in meters (4.6). */
  tubaPipe?: readonly [back: number, left: number];
}

/** The shape of the parts of the deer, the species of the biped. */
interface BipedParams extends CommonParams {
  ears: 'small' | 'antlered';
  snout: 'long' | 'horn';
  tail: 'puff' | 'thin';
  body?: undefined;
}

/** A body of its own in place of the parametric biped (4.4): a studio body. */
interface OwnBodyParams extends CommonParams {
  body:
    | 'studio-badger'
    | 'studio-bear'
    | 'studio-beaver'
    | 'studio-cat'
    | 'studio-deer'
    | 'studio-dog'
    | 'studio-elephant'
    | 'studio-fox'
    | 'studio-hippo'
    | 'studio-monkey'
    | 'studio-mouse'
    | 'studio-panda'
    | 'studio-penguin'
    | 'studio-pig'
    | 'studio-polar-bear'
    | 'studio-rabbit'
    | 'studio-rhino'
    | 'studio-wolf';
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

`proportionsOf()` fills each value that `SpeciesParams.proportions` does not give with its
default (`DEFAULT_PROPORTIONS`), and the frame of the body (`models/body-frame.ts`) holds the
result for the trunk, the limbs, and the seats. The default skeleton is the skeleton of the bodies
of 2026-10-06 (`docs/decisions/2026-10-11-body-revert.md`), with the short legs below. A species
gives values of its own when its reference images show a different anatomy (design 1).

**Short legs.** The user said on 2026-10-11 that the legs were too long. The reference animals
have small heads and long trunks, and our bodies keep their large heads, so the legs follow the
trunk (`docs/research/2026-10-11-short-legs.md`):

- The seated knee is near the height of the seat, and the thigh slopes a little down to it. The
  seat fits the legs (`seatHeight`), below the median of the reference images, so that the seated
  legs look short (user, `docs/decisions/2026-10-11-low-seats.md`).
- The standing legs are as short as the legs of the standing bear of `bear-views.png`, and a
  standing leg is a straight column (`models/legs.ts`, `models/legs.test.ts`).
- The studio bodies keep the trunks and the legs of their sources (4.4). No value of this table
  applies to them, except the head height `H` and the seat heights of the polar bear, the rabbit,
  the foxes, the cat, the dog, the panda, the hippo, the mouse, the elephant, the beaver, the
  pig, the wolf, the monkey, the badger, the rhino, the deer, and the penguin, which
  `models/species.ts` reads from their studio bodies. The hippo stands at its contrabass, the
  elephant at its timpani, the badger at each percussion instrument, the rhino at its tuba, the
  penguin on its riser, and the bear on its podium. The bear reads only its head height `H`.

A height map moves the torso of the parametric body with the joints of the table, and the head
keeps its form:

```text
 height above the base of the torso (H)
   headCenter -----  head center (the head keeps its form)
       - 0.5  -----  `head` bone
                     top rings and the neck: the same part of the way to the `head` bone
   shoulderHeight -  shoulder joints
                     rings, `chest`, `spine`, and `hips`: scale with the joints
   0 --------------  base of the torso (the seat)
```

```text
 height above the base of the torso (H)
   headCenter -----  head center (the head keeps its form)
       - 0.5  -----  `head` bone
                     top rings and the neck: the same part of the way to the `head` bone
   shoulderHeight -  shoulder joints
                     rings, `chest`, `spine`, and `hips`: scale with the joints
   0 --------------  base of the torso (the seat)
```

| Section             | Species                                       | Section  | Species                    |
| ------------------- | --------------------------------------------- | -------- | -------------------------- |
| Violin, first seat  | rabbit (reference)                            | Flute    | fox, light tan (reference) |
| Violin, second seat | fox, red-orange with a white face (reference) | Oboe     | mouse                      |
| Viola               | cat                                           | Clarinet | wolf (`animals.webp`)      |
| Cello               | dog                                           | Bassoon  | beaver                     |
| Contrabass          | hippo                                         | Horn     | pig                        |
| Harp                | deer                                          | Trumpet  | monkey                     |
| Piano               | polar bear                                    | Trombone | panda                      |
| Timpani             | elephant                                      | Tuba     | rhino                      |
| Percussion          | badger                                        | Choir    | penguin                    |
| Conductor           | bear (reference)                              |          |                            |

- The fox plays in two sections, in the two colors of the reference image (`fox-red` and
  `fox-tan`). The penguins look like a choir in robes.
- The size rule of 4.2 puts the large species in the back row. The polar bear plays the piano
  (user, 2026-10-06) and each keyboard seat of 3.8. The wolf is the gray clarinet player of
  `animals.webp` (user, 2026-10-05).
- Further seats of a section alternate their species variants: a third violin seat uses rabbits
  again.

The shape parameters of each species of the parametric biped are its ears, its snout, and its
tail (`BipedParams`, 4.5 gives the colors). No species has them: the rabbit, the two foxes, the
wolf, the cat, the dog, the panda, the hippo, the mouse, the elephant, the beaver, the pig, the
monkey, the badger, the rhino, the deer, the penguin, the bear, and the polar bear have studio
bodies (4.4).

The belly color colors the muzzle, the lower
face, and a stripe down the front of the torso, as the white cheeks of the wolf in `animals.webp`.
Each triangle has one color, picked by its centroid or its facing (`splitByCentroid()` and
`splitByFacing()` of `models/mesh.ts`), so a color border follows the edges of the triangles.

## 4.4 Models

Code builds the bodies, the instruments, and the props from low-poly shapes with vertex colors.
No species uses the parametric body now. `buildBiped()` of `models/biped.ts` builds it from the
parts of 4.5 (body proportions) on the skeleton of 4.3, and a species with a `body` gets a body of
its own from `buildBiped()` in its place.

The user chose each body of its own, and the table "Bodies and roles" of
`docs/agents/model-work.md` lists them with their decision files. The bear conductor, the polar
bear pianist, the rabbit violinist,
the red violin fox, the viola cat, the cello dog, the trombone panda, the contrabass hippo, the
oboe mouse, the timpani elephant, the bassoon beaver, the horn pig, the clarinet wolf, the trumpet
monkey, the percussion badger, the tuba rhino, the harp deer, and the choir penguin have meshes of
the user that the app rigs itself (studio bodies, below). The tan flute fox has the rig of the red
fox with a tan palette. The mesh of the penguin replaces its egg body of 2026-10-11, by the newest
decision of the user (`docs/decisions/2026-10-21-mesh-penguin.md`). The meshes of the rhino and the deer replace their parametric bodies
(`docs/decisions/2026-10-21-mesh-rhino.md`, `docs/decisions/2026-10-21-mesh-deer.md`). The mesh of
the bear and of the polar bear replace their studio bodies of `lowpoly-studio/` near the same size, by the newest decision
of the user (`docs/decisions/2026-10-22-mesh-bear.md`).

Each body follows these rules:

- A body has at most 2,600 triangles, and a studio body at most 4,600 (4.5, facets and triangle
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

A body of its own built in code for one species, from rings of free corners (route 2 of
`docs/agents/model-work.md`), places each bone of 4.7, so that the pose code drives it as the
biped. No species has one since 2026-10-21. The egg body of the penguin of 2026-10-11 is in the
history (`git show c4951160:src/models/penguin/penguin-body.ts`). The penguin has no model sheet,
so `pnpm choir-check <dir>` compares its body with one penguin of each of `orchestra-latest.png`
and `orchestra-side.png` (7.1).

**Studio bodies**

A studio body is the GLB file of an animal of `lowpoly-studio/`, or of a mesh of the user that
`pnpm rig-mesh` rigs into the same format: one mesh of faces with one color each, a skeleton of the
biped template with twist bones of the forearms, a skin of up to four bones for each vertex, and
corrective shapes. The studio bodies are the bear conductor
(`docs/decisions/2026-10-22-mesh-bear.md`), the polar bear pianist
(`docs/decisions/2026-10-22-mesh-polar-bear.md`), the rabbit violinist
(`docs/decisions/2026-10-13-mesh-rabbit.md`), the red violin fox
(`docs/decisions/2026-10-14-mesh-fox.md`), the tan flute fox
(`docs/decisions/2026-10-14-fox-flute.md`), the viola cat (`docs/decisions/2026-10-16-mesh-cat.md`),
the cello dog (`docs/decisions/2026-10-17-mesh-dog.md`), the trombone panda
(`docs/decisions/2026-10-18-mesh-panda.md`), the contrabass hippo
(`docs/decisions/2026-10-18-mesh-hippo.md`), the oboe mouse
(`docs/decisions/2026-10-19-mesh-mouse.md`), the timpani elephant
(`docs/decisions/2026-10-19-mesh-elephant.md`), the bassoon beaver
(`docs/decisions/2026-10-19-mesh-beaver.md`), the horn pig
(`docs/decisions/2026-10-19-mesh-pig.md`), the clarinet wolf
(`docs/decisions/2026-10-20-mesh-wolf.md`), the trumpet monkey
(`docs/decisions/2026-10-20-mesh-monkey.md`, `docs/decisions/2026-10-21-monkey-stand.md`), the
percussion badger (`docs/decisions/2026-10-20-mesh-badger.md`), the tuba rhino
(`docs/decisions/2026-10-21-mesh-rhino.md`), the harp deer
(`docs/decisions/2026-10-21-mesh-deer.md`), and the choir penguin
(`docs/decisions/2026-10-21-mesh-penguin.md`).

The app keeps its own motion (5.3, 5.4), so it drives the bones of the studio from the pose of the
player each frame: the retarget (`docs/decisions/2026-10-12-studio-bear.md`). It gave about a
quarter of the folded faces of a skin on the bones of the player
(`docs/research/2026-10-12-studio-bear.md`).

The plane of the arm sets the roll of the one upper arm bone. A hold with the elbow out and level
rolls it by about 90°, and the linear blend at the shoulder then twists the skin like a wrung
cloth and squeezes the upper arm flat. A fold count does not see this, so `pnpm arm-shape` measures
the twist, the flat share, and the spikes of each arm. A goal on one measure can move a twist to a
joint that no goal measures, so the arm gate `pnpm arm-check` reads the folds, the skin twist, the
flat share, the paw turn, the stretch, and the paw twist and the wrist turn rate in the lifts and
the lowerings of each arm against one table of limits, and the merge
of a pose or model change runs it (`docs/decisions/2026-10-19-arm-gate.md`). A body can take a twist bone of each upper
arm (`StudioBody.upperTwist`): the bone takes a share of the roll from the chest, and the weight of
the upper arm moves to it near the shoulder, so the roll spreads along the arm. The rule comes from
`upperTwist.share` of the config of the mesh rig. The rig solves its corrective shapes with the
twist bone, and `pnpm studio-body` writes the share into the body. A body with no share has no
twist bone (`docs/decisions/2026-10-19-arm-skin.md`).

```text
 lowpoly-studio/animals/polar-bear/out/polar-bear.glb
        | pnpm studio-body polar-bear (tools/studio-body.ts, no Blender)
        v
 src/models/studio/polar-bear.ts: StudioBody (packed mesh, heads, palms, sheet arms)
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
  own, and it joins the digits of a paw into one `fingers` bone. It also drops the eyes of the
  mesh, and the app puts its pea eyes there on eye bones of their own, so that they blink (user,
  2026-10-15, `StudioBody.eyes`, `eyePush()`). It takes each gloss shell of the head out of the
  middle plane as an eye, so a mesh with two nostrils and no nose pad, as the hippo, has no gloss
  nose, and the tip of its nose is the front of its muzzle. The tip comes only from the vertices
  near the middle plane (`NOSE_PLANE`), because the tip of a whisker of the mouse is the front of
  its head. `pnpm rig-mesh --check` and `pnpm mesh-options` warn when the tip and the mouth lie
  off the middle plane (`noseWarning()`). A horn on the muzzle stands further forward than the
  lips, so the tip of the nose of the rhino comes only from the vertices below the horn
  (`noseTop` of `ANIMALS`), and the mouthpiece of its tuba goes to the lips. The head measures (the head height `H`, the head center, and the box of the pea eyes)
  leave out a long nose below the chin, as the trunk of the elephant (`headFloor` of `ANIMALS`),
  because the holds in `H` start at the head. Each pea eye faces out from the middle of the head
  that shows. A large head box behind the eyes turns them up, and such eyes look up, so a body
  can turn its eyes level (`eyeLevel` of `ANIMALS`, the wolf). A flat oval on a curved cheek, or
  on a face that slopes against the direction of the eye, stood out of the fur at one edge. So
  each oval bends along its direction to a fit of the head surface under it, and its middle lies
  on the surface (`eyeBend()`, `StudioEyes.bends`). Its rim then lies at the fur in each view, and
  its front stands out of the fur, as an eye on a flat face of a parametric head does. The light
  of a bent eye is a thin disc that lies flat on the front of the oval, so that it stands only
  0.004 H out of the oval in each view (user, 2026-10-20). An old eye of a mesh can lie on an
  edge of the face that runs across the diagonal of the oval. A bent oval there folds along that
  diagonal and reads as a bean, and a flat oval stands out as a bead. So a body can move its eye
  places to a part of the face with less fold (`eyeShift` of `ANIMALS`), and turn its eyes toward
  the normal of the face (`eyeNormal`, `docs/research/2026-10-20-bear-eyes.md`). No body takes
  them now.
- **Mesh rig.** `pnpm rig-mesh <animal>` rigs a mesh of the user with no skeleton into the format
  of a studio body with Blender. The config `tools/mesh-rigs/<animal>.json` gives the joints,
  measured on cuts of the mesh, and the rules below, each with a note. The decision files of the
  body give the values and their reasons, and `docs/agents/model-traps.md` gives the traps.
  - Form. Factors change the arms, the legs, the head, the neck, the trunk, and the girth to the
    choice of the user or to the sheet. The other parts keep their sizes, and the holds in `H` read
    the source head (`ungrown()` of `tools/studio-body.ts`). Before the joints, the whole source
    can take a factor on each axis, for a body that is shorter or wider than the mesh
    (`proportions`). The head can keep its form and move with the top of the neck, with a blend
    zone on the neck (`proportions.keep`), at its size or at a size of its own
    (`proportions.head`). The joints and the rules of the config are then in the units of the
    scaled source.
  - Seat. The rig poses the seated bind of 5.2 (`studio.legTurns`), lowers the haunch onto the
    seat (`sit`), and can turn the trunk upright or forward (`studio.trunk`). A body that stands
    with no chair has no `sit`, so its haunch keeps its form. `pnpm rig-mesh --check` gives
    the gaps of the tail to the floor and to the chair over one sway period (`tools/tail-gap.ts`).
  - Weights and shapes. Bone heat gives the weights, and rules and rings of new vertices at the
    joints (`refine.rings`) keep the faces from a fold. The corrective shapes give the source back
    in the standing pose, and up to four shapes of `raise` relax the faces that turn over in a bent
    arm. The clavicle weights can fade out toward the middle plane of the chest
    (`weights.clavicleMiddle`), so that a face on that plane does not take the weights of both
    clavicles, which a bow arm turns far apart. Below a cut of the armpit, a vertex of the trunk can
    give its arm weight to the trunk (`weights.armBelow`), so that a lowered arm does not drag the
    thin faces of the trunk. A thin face across a joint can take the mean of the
    weights of its corners (`weights.rigid`), and thin faces that share corners take one mean
    together, so that one face does not undo the other. When a grip far in front of a deep chest turns the upper arm so far that no rule removes
    the fold at the front of the shoulder, the hold shares the turn with the shoulder bone (5.3).
  - Colors. Each face takes the nearest palette color of the texture, and the faces of the old
    eyes take the color of the fur around them. A rule can move the plain fur in Oklab toward the
    color of the reference after a choice of the user (`colors.tone`): the cat takes half of the
    move to its sheet, the white fur of the panda takes the white of `SPECIES_COLORS.panda`, and
    each plain face of the hippo, of the mouse, of the elephant, and of the pig takes the hue and
    the chroma of the fur or the belly color of its species color with its own lightness. The wolf
    has no such rule, because the hues of its texture match its sheet, and the badger neither. A face is dark when a third of its texture samples are below a luminance limit
    (`colors.dark`). The dark gray fur of the wolf lies near the limit of the other meshes, so the
    wolf takes a lower limit, and only its nose, pupils, and small spots of the paws are dark. The
    dark front fur and the black eye stripes of the badger lie near the limit too, so its lower
    limit keeps only its pupils and its smile line dark. `pnpm rig-mesh --check` warns when more
    than 5% of the faces are dark outside the eye and nose boxes, and gives a limit under 5%. The
    cream tusks and
    nails of the elephant keep their colors. A second rule moves a colored fur in Oklch
    (`colors.shift`): the orange fur of the red fox takes the lightness, the chroma, and the hue
    of the reference foxes in the play frame. A moved color keeps its hue at the edge of the sRGB
    gamut and takes less chroma, because a clip of each channel turns the hue.
    The tan palette of the fox mesh (`StudioBody.palettes`) lets one module serve both foxes. It
    maps the colors of the texture before the shift (`COLOR_1` of the GLB file), so a shift of the
    red fox keeps the tan fox.
  - Borders of black fur. A face takes black from a third of dark texture samples, so that the
    small faces of an eye stay dark. On the large faces of a trunk, the border of a black region
    then gets teeth, and a raised arm stretches them into black wedges. `colors.border` gives each
    dark face of a box with less than half dark samples the color of the nearest light face, as
    under the arms of the panda (`docs/decisions/2026-10-18-panda-marks.md`). Its option `teeth`
    also gives the white to a dark face with two or more light neighbors.
  - Arm seam. Where the hanging forearm of a mesh touches the belly, short faces join the two.
    When the arm rises, those faces turn over and show, or the belly faces under them shade dark.
    No weight rule, corrective shape, or vertex move fixes both. `cut` removes the faces that join
    the forearm to the belly below a height and closes both holes with new faces, with no move of
    a vertex. The user chose it for the panda, and the caps of the belly take its white. The
    beaver, the hippo, the elephant, and the rabbit take the same cut under each armpit, where
    thin faces join the upper arm to the chest and turn over in each pose, or a corner of the
    trunk with a part of the arm weight makes a ridge of long faces when the arm rises. A shape of
    `raise` can also relax the faces that turn far short of a fold (`below`), with one ring of
    trunk corners (`grow`). The normals of the caps of the arm point
    into the gap between the arm and the trunk, away from the light, so the caps show as a dark
    slot at the armpit. With `cut.skinNormals`, the rig names these caps (`StudioBody.caps`), and
    each corner of a cap takes the mean normal of the skin at its vertex (`studioNormals()`). The
    caps of the body keep their own normals, because the normals of the skin turn the light caps
    of the belly into dark wedges. The black arm caps of the panda stay dark with each normal, so
    the panda keeps the normals of its faces. On the rabbit, the side of the trunk curls in where
    it joins the hanging arm, so the caps of the body lie in a notch. The raised bow arm stretches
    the quad at the top of the cut into a sheet that faces down, and the skin faces of the rim of
    the notch turn far from the skin around them. With their own normals, the notch shows as a
    jagged dark gap, as if a piece of the body is missing. `cut.bodyNormals` names the sides that
    give the caps of the body, the quads, and the rim (`StudioBody.rim`) the normals of the skin,
    the rim with no crease angle. The notch also keeps a dark pocket, so the rig of the rabbit
    reads a copy of the mesh in which the trunk vertices of the notch move out half of the way to
    a surface that fits the trunk around it (`rabbit-4-armpit.glb`). A full move made facets and a
    dark pit, and a fill toward the middle of the neighbors made a sharp tent under the arm. The
    front of the right arm root has a second notch, which shows as a dark pocket with the arm
    down. The copy `rabbit-4-roots.glb` moves its trunk vertices out toward the convex hull of
    the trunk around them, and keeps the arm vertices and the body run of the cut. A
    raised arm also casts the hard shadow of its faces into the crease between the arm and the
    trunk, and on the white fur of the rabbit the shadow shows as black wedges with steps of the
    shadow map along the seam. The rig cannot change these shadows, so the soft shadow edge of the high tier (4.5) decides them. The thick arm of the rhino joins the side of the
    trunk from the shoulder down to the paw, with a notch at its front and its back. A plane
    |x| = `armSplit` then cuts through the arm or the trunk, so the plane turns around the
    vertical through both notches, and the free arm keeps within a radius of the arm joints and
    above a floor (`weights.armFree`). The rig then reads a copy in which a round tube replaces
    the arm (upper arm form, below). The root of the bear arm reaches farther back than forward, so a
    radius around the joints left its back strip on the trunk, and a raised arm pulled that strip
    out as a dark flap. The chain of the joints moves back before the distance
    (`weights.armFree.shift`), so that the free arm takes the back strip and leaves the front edge
    on the trunk. A kept face that sticks into the hole of the cut with two edges goes too
    (`cut.fins`), because the cap repeats it with the opposite winding. The ball of each bear
    shoulder has half of its weight on the upper arm, and the turns of the arm sink it below the
    surface around it, as a sharp V at the top back of the arm root. The rig of the bear reads a
    copy of the mesh in which each shoulder ball and its ring move out by about the sunk depth,
    and the longest edge across the shoulder joint splits, so that the skin bends over two faces
    (`bear-mesh-roots.glb`). `tools/blender/arm_root.py` writes each such local edit of an arm
    root from one edit file of `tools/arm-roots/`. The panda arm root joins
    the trunk with lips that curl into the notches at its front and its back. Bone heat gives
    the lips a part of the arm weight, and a raised arm pulls them out as flaps. A band between
    two planes takes only the back lips into the free arm (`weights.armFree.root`), because the
    front lips are white belly fur that the black arm would show as a white tag. Each flipper of the penguin is an arm of the rig, free of the body
    below its root, so the plane frees it with no cut. The upper arm of its bind points far down
    (`studio.bindArms`), because the large turn from the hanging flipper to the bind arm of the
    other meshes turned the faces at the root of the flipper over.
  - Upper arm form. A mesh whose arm is free of the trunk only from the elbow down has no upper
    arm of its own: the upper arm is a bulge of the trunk wall, and each turn of the arm crumples
    the wall into flaps. No weight rule, cut, ring, or shape fixes it. The rig of the pig reads a
    copy of the mesh in which each upper arm is a round tube with rings of edges, free of the
    trunk up to a dome around the shoulder joint (`pig-arms.glb`), so the free arm needs no cut
    (`weights.armFree`). The wall where the bulge was is smoothed, because the saw rim of the hole
    and a fan from its middle showed as dark spikes at the top of the shoulder. A flat upper arm
    reads as a plank when its broad side faces the front, so the copy of the rabbit also makes its
    upper arms rounder (`rabbit-4-arms.glb`), and its bow elbow points out and forward (5.3). The
    inner side of each hanging arm of the rabbit joins the trunk from the middle of the upper arm
    to past the elbow. A flat cap of the cut there showed as a flat sheet at the bent elbow, so the
    rig reads a further copy that removes the joining faces and closes each arm with a round patch
    over its arm run (`rabbit-4-elbows.glb`). The patch lies inside the plane of the arm split,
    and the free arm takes it as an island (`weights.armIslands`). The cut then closes only the
    hole of the trunk, with its caps and its quad. The run moves with the patch, except the two
    vertices at the top of the right run: a move of the back one lifted it above the top of the
    cut, and the corrective shapes folded the caps of the body. A move of the front one turned
    the cap at the top of the cut down under the raised arm, as a dark band. Each arm of the deer
    joins the trunk from the shoulder down to near the elbow, and the arms that reach the harp
    stretched the seam at the back of each root into dark shards. Its rig reads a copy with the
    round patches of the rabbit (`deer-arms.glb`), and its cut ends above the shoulder joint and
    above the top of the back notch, so that the long seam faces from the notch go. A cut with no
    patch showed the flat arm cap as a dark sheet behind the raised arm. The dog takes the same
    copy and cut (`dog-arms.glb`). Its patch pushes to the round form from near its top, so that
    the inner arm fills the dark pocket between the arm and the trunk at rest. Bone heat gives a
    free arm of a cut only arm weights, so the inner root of the bow arm swings into the chest.
    The inner root gives a share of its weight to the chest (`weights.armRoot`).
    The thick arm of the rhino
    joins the trunk from the paw up to the shoulder, and its outer side bent at the elbow on a few
    long faces, so the elbows read as flat slabs with sharp corners at full size from the stage.
    Its rig reads a copy that keeps each paw, replaces the rest of the arm with a round tube of
    rings up to a dome inside the shoulder, as for the pig, and fills the side of the trunk with a
    fair surface (`rhino-tubes.glb`). No face joins a tube to the trunk, so the rig has no cut.
    Bone heat gave the inner side of each tube a part of the trunk weight, which pinned it to the
    trunk, so each vertex of the tube keeps only its arm weights (`weights.armOwn`), and the trunk
    keeps no upper arm weight up to the shoulder joint (`weights.armBelow`).
    `pnpm arm-look` measures the
    crease of the arm skin against the source and the section of the upper arm, with limits from the red fox
    (`docs/decisions/2026-10-21-arm-form.md`).
  - Face. Face rules recolor faces of the face after a choice of the user, with no move of a
    vertex. `colors.patch` makes each eye patch round, because a sharp inner point reads as
    raised inner brows and gives a sad face. `colors.smile` draws a thin smile line in the dark
    of the patches, or in a color of its own (`color`) with no patch rule, along the crease
    between the lips, with the corners up, so that the corners show beside a mouthpiece. A band takes no face that turns to the side (`outward`), because
    such a face shows as a dark block in a side view. The panda has both rules
    (`docs/decisions/2026-10-18-panda-face.md`). The wolf has both rules too: its patch rule
    ends the gray cap of the forehead at a level line over the eyes, so the eyes sit in light fur,
    its `soften` rule flattens the crease of the brow ridge over each eye, and its smile line takes
    a dark color of its own (`color`), because its gray patches are too light for a line
    (`docs/decisions/2026-10-20-wolf-face.md`).
  - Tail. `tail_tip` gives a tail of two bones (`OPTIONAL_STUDIO_BONES`), and `studio.tailCurl`
    bends the seated tail: the cat curls it on the seat, and the dog hangs it down behind the seat
    (`docs/decisions/2026-10-17-dog-tail.md`). A curled tail does not sway (5.1). The long thin tail
    of the mouse lies on the floor in a loop, so its two bones turn rigidly
    (`studio.tailBind`): the seated tail goes back from the haunch and keeps its loop flat on the
    floor behind the body, because a curve bent the loop into a sheet. The broad flat tail of the
    beaver has two bones that turn rigidly too: the root bone goes back from the haunch, and the
    tip bone lays the end of the tail on the floor behind the body, at the height of the soles,
    so that the tail does not set the seat height. The bushy tail of the wolf has two bones that
    turn rigidly: the root bone goes back and down over the back of the seat, and the tip bone
    hangs the tail down behind the seat, between the back posts of the chair. The long thin tail
    of the monkey has two bones that turn rigidly: the root bone goes back and down from the
    haunch, and the tip bone keeps the curl of the source, which stands on the floor behind the
    body, at the height of the soles. A short round
    tail, as the tail of the rabbit, of the panda, of the hippo, of the badger, and the puff tail of
    the deer, or the small curled tail of the pig, or the short pointed tail of the penguin, is a
    ball on one tail bone (`tailBall`). The ears of the dog hang and do not twitch (`OwnBodyParams.hangingEars`). The
    round ears of the panda, the small ears of the hippo and of the beaver, the large round
    ears of the mouse, and the ears of the pig and of the badger join the head below the top of the skull, so they follow the head. The large ears of the
    deer stand out at the height of the skull top, and its antlers rise from it, so both follow the
    head, and the head measures leave the antlers out (`headCeiling` of `ANIMALS`). The large ears of the
    elephant follow the head too, and its trunk and the tips of its tusks, which hang below the
    head line in front of the chest, follow the head only (`noseFront`), so that a turn of the
    head does not bend the trunk at the chin. The thin tail of the elephant is a ball on one tail
    bone, and so is the thin tail of the rhino, which hangs behind the haunch. The tall ears of the
    rhino stand on the top of the head and follow their ear bones. The penguin has no ears: its ear
    bones lie inside the crown, and no vertex follows them (`earBase`). Its beak opens: a copy
    of the mesh splits the beak along the mouth line and closes each part with a cap of a dark
    mouth color (`assets/models/penguin/penguin-beak.glb`), and the lower part follows the jaw
    bone with rigid weights, around the line between the corners of the mouth (`weights.jaw`,
    `docs/decisions/2026-10-21-penguin-beak.md`).
  - Eyes in patches. When dark eye patches hold the eyes, as on the panda, the eye box holds only
    the eye, and no dark face near the old eye takes the color of the fur (`eyeShell.darkReach`),
    so that the patches stay black around the pea eyes.
- **Scale.** The scale keeps a landmark that the scene depends on (`ANIMALS` in
  `tools/studio-body.ts`). The landmark is the shoulders of the bear for the conductor stand. For a
  mesh body, it is the shoulders, the ear
  tips, or the head top at the size that the user chose. A longer leg raises the landmark by the same height, so
  the trunk, the head, and the arms keep their meters. The user chose the head height of the red
  fox for the cat, the dog, the panda, and the hippo, and the head top of the parametric mouse
  for the mouse, which is about half as tall (`docs/decisions/2026-10-19-mouse-size.md`). By the
  same rule, the beaver and the pig take the head tops of their parametric bodies, because no
  reference image shows a beaver or a pig (`docs/decisions/2026-10-19-mesh-beaver.md`,
  `docs/decisions/2026-10-19-mesh-pig.md`). The orchestra images show the seated wolf beside the
  seated dogs, so the seated wolf took the middle of the height ratio of the two in the images
  (`docs/decisions/2026-10-20-mesh-wolf.md`). Then the user made the body of the wolf 0.9 times as
  high and 1.2 times as wide, for a body ratio near the red fox, and kept the head at its size, so
  the seated wolf is now about as high as the dogs (`proportions`,
  `docs/decisions/2026-10-20-wolf-shape.md`). Then the user gave the wolf the head size of the red
  fox, and the body below the neck became smaller on each axis, so that the standing skull top
  keeps its height (`proportions.head`, `docs/decisions/2026-10-20-wolf-face.md`). No reference
  image shows a badger or a monkey, so the badger and the monkey take the head tops of their
  parametric bodies (`docs/decisions/2026-10-20-mesh-badger.md`,
  `docs/decisions/2026-10-20-mesh-monkey.md`). The skull top of the monkey under its small tuft
  of hair took the head top, and then the user made the monkey 1.1 times as large. No reference
  image shows a rhino, so the skull top of the rhino between its tall ears takes the head top of
  the parametric rhino (`docs/decisions/2026-10-21-mesh-rhino.md`). No reference image shows a
  deer, so the skull top of the deer between its antlers took the skull top of the parametric deer,
  and then the user made the deer 1.2 times as large (`docs/decisions/2026-10-21-mesh-deer.md`). The crown of the penguin takes the head top of its egg
  body (`docs/decisions/2026-10-21-mesh-penguin.md`). The bear and the polar bear keep the size
  of their studio bodies: the polar bear keeps the meters for each unit at which the skull top of
  its mesh stands as high as the skull top of its studio body
  (`docs/decisions/2026-10-22-mesh-polar-bear.md`). A leg factor raises the standing shoulder
  joints of a rig, so the landmark of the polar bear rises with them, and its longer legs do not
  make its trunk, head, and arms smaller (`docs/decisions/2026-10-22-polar-legs.md`).
- **Seat.** A seated role binds its mesh seated, and the export puts its soles on the floor and its
  seat at the front edge of the seat of the app. A body with a `seat` of `ANIMALS` then rises to
  that seat height. The polar bear sits on a piano bench that fits its legs, so that its
  feet touch the floor: its rig names its seat prop `bench` (`chair.prop`). Its hip joints lie
  in the haunch and its knees at the bottom of the round body, so that the thick thighs turn
  forward to near level, and the bench holds the whole haunch
  (`PIANO_BENCH`, `docs/decisions/2026-10-22-polar-seat.md`). The short legs of the mesh gave a
  low bench, and the round belly hid the lap, so the bear read almost as standing. Its thighs
  and shins are longer than on the mesh, so that the knees stand out in front of the belly and
  the bench is higher (`legFactor`, `docs/decisions/2026-10-22-polar-legs.md`). The rabbits, the foxes, the cats, the dogs, the pandas, the pigs, and the
  wolves have chairs that fit their legs, so that their feet touch the floor (user, 2026-10-16). The
  deer sits on the stool of the harp, which fits its legs too, with its whole haunch on the seat
  (user, 2026-10-21): the sit of its rig puts the underside of the haunch on the seat top, and
  its puff tail stays above the seat. The mouse, the
  beaver, and the monkey have no chair (user, 2026-10-19 and 2026-10-20, `SpeciesParams.noChair`):
  each keeps its seated pose at the seat height of its legs, with its feet on the floor, so it
  stands on its hind legs with bent knees, as a real mouse, beaver, or monkey does. The center of
  mass of a body that stands must be over the middle of its soles (user, 2026-10-21). The thighs
  of the monkey slope steeply down, its feet stand under its hips, and its trunk leans forward
  with the head level, because its short legs alone cannot put the feet under its large head
  (`docs/decisions/2026-10-21-monkey-stand.md`). The rhino stands to play the tuba in each seat,
  in the standing pose of its mesh, as a real tubist on a strap, and its center of mass lies a
  little in front of the middle of its soles with the tuba (`docs/decisions/2026-10-21-mesh-rhino.md`).
  The penguin stands on its riser in the standing pose of its mesh, and its center of mass lies a
  little behind the middle of its soles, inside the support area
  (`docs/decisions/2026-10-21-mesh-penguin.md`). Each level seat ends where the thighs leave it at the haunch (`chair.front`), so that
  the haunch rests on it. Short
  thighs under a round belly, as on the panda, end the seat behind the thighs, under the haunch,
  so that the sit does not pull the haunch down into a sheet behind the seat. The chair takes
  its height, depth, width, and the room behind the back from the body (`StudioBody.seatHeight`,
  `chairDepth`, `chairWidth`, `backRoom`, 4.5, props).
- **Soloist.** A seated body that also stands (`soloist` of `ANIMALS`: the rabbit, the red fox, the
  cat, the panda, the mouse, the beaver, the pig, the wolf, the monkey, the hippo, which stands in each seat of the contrabass,
  the elephant, which stands at the timpani, the badger, which stands at each percussion
  instrument, the rhino, which stands at the tuba, and the penguin, which stands on its riser) keeps the leg shapes and the turns of its sheet pose, and `standingBody()` of
  `models/studio-rig.ts` stands it within 1 mm of the source.
- **Retarget.** The skeleton of the player has the joints of the studio, with each arm straight
  down, because the pose code reads a hanging arm in the bind pose (4.7, 5.2).
  `poseStudioBones()` moves the bones of the studio with the bones of the player, and bends each
  arm at the elbow axis of the studio. Each paw turns toward the forearm, up to a limit
  (`PAW_TURN`), because the skin of the studio bends well only near its clips. Each shape takes its
  weight from the pose alone (`raiseWeight()`), so the rule of stateless poses holds.
- **Render.** The scene draws the body with four bones for each vertex and the shapes as morph
  targets. The colors hold the baked occlusion of the studio. The fur gets smooth normals within
  the crease angle of the body (`crease` of `ANIMALS`, `studioNormals()`). The angle of a bear has
  the facet contrast of its reference images, and the mesh bear keeps it. The red fox, the cat, the dog, the panda, the hippo,
  the mouse, the elephant, the beaver, the pig, the wolf, the monkey, the badger, the rhino, the
  deer, and the penguin take the angle of the rabbit, which the manager chose from the play frames,
  because the sixteen are meshes of image models (`docs/research/2026-10-14-rabbit-smooth.md`).
- **Bind mesh.** `buildStudioBody()` gives the mesh in the bind pose of the player, with two bones
  for each corner, for the footprints, the budgets, and the tests. The sweep of each role (9.3)
  keeps the parts out of the body and the instrument, and
  `docs/decisions/2026-10-13-role-sweep.md` lists each accepted depth.

**Rigged bodies**

No species has a rigged body since 2026-10-11, and the app has no code of it. The GLB files
`assets/models/rabbit/rabbit.glb` and `assets/models/bear/bear.glb` of the user and the tools stay
for a later body, and route 1 of `docs/agents/model-work.md` brings the code back.
`pnpm rig-body <species>` packs a file into `src/models/rigged/<species>.ts` with a baked skin. It
keeps the two largest weights of each vertex, and gives the missing ear, tail, and finger bones a
part of the weight of their parents. It moves the colors of the texture to the colors of the
species (`docs/decisions/2026-10-10-glb-skins.md`), and puts a plate on each eye, so that it
blinks. The
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
files keep the measures of each tuning, such as
[`2026-10-06-polished-look.md`](../decisions/2026-10-06-polished-look.md).

The colors come from samples of the reference images, and design 1 says which image wins. Each
base color is a little lighter than its darkest sample, because an image shows lit and shaded
colors. Tune the light first, until a screenshot of the default view looks like the reference.
Change a base color only when a measurement of the lit pixels of the same part shows that no light
value can match the reference.

**Scene colors**

`SCENE_COLORS` of `models/colors.ts` holds the colors of the chairs, the music stands, and the
sheet music, `STAGE_COLORS` of `models/props.ts` the stage, the risers, and the podium, and
`HALL_COLORS` of `scene/hall.ts` the hall. The hall is a dark, warm room, and the stage an amber
wood of fine planks with a tone for each plank and dark seams, as in `orchestra-latest.png`. The
side lights are a warm white, so the wood holds the amber itself. The lip and the risers are a
little lighter than the planks, and a baked light (`SIDE_GLOW`) keeps the sides of the stage from
black. The chairs are a honey wood, and the music stands are black with a warm gray desk, because
black desks were the largest shapes of some close shots.

**Species colors**

`SPECIES_COLORS` of `models/colors.ts` gives each species three colors: the fur, the belly and
the face, and the accent. The models and the seat dots of the UI read them through `SPECIES`
(`models/species.ts`). Each studio body keeps the colors of the faces of its GLB file (4.4), so
its colors and its accent parts here color no part of its body. The rig of the panda moves its
white fur to the fur color here, its smile line takes the dark of its eye patches, and the border
of its black band under the arms takes the white of its fur (4.4). The rig of the red fox moves
its orange fur to the red-orange of the reference foxes, and its fur color here is that moved fur,
for the seat dot (4.4).

- All species have black eyes with a light (`EYE_COLOR` and `EYE_LIGHT_COLOR`), and a dark nose
  (`NOSE_COLOR`), unless their accent parts include the nose.
- The antlers have the belly color. The inside of an ear has the belly color, unless the accent
  parts include the inner ears or the ears.
- The accent color goes to the accent parts of the species (table below). Accent arms also color
  a band over the shoulders, and accent feet the lower shins, as the dark socks of the fox in
  `animals.webp`.

```typescript
type AccentPart =
  | 'inner-ears'
  | 'ears'
  | 'nose'
  | 'snout'
  | 'horn'
  | 'beak'
  | 'arms'
  | 'hands'
  | 'legs'
  | 'feet'
  | 'tail'
  | 'face-pattern';
```

| Species      | Accent parts       | Species | Accent parts     |
| ------------ | ------------------ | ------- | ---------------- |
| rabbit       | inner-ears, nose   | cat     | inner-ears, nose |
| fox, violins | feet               | hippo   | nose, inner-ears |
| fox, flutes  | ears, feet         | deer    | nose, feet       |
| wolf         | inner-ears         | panda   | ears, nose       |
| elephant     | inner-ears         | mouse   | inner-ears, nose |
| bear         | snout              | beaver  | tail             |
| dog          | ears, face-pattern | monkey  | hands, feet      |
| pig          | snout              | rhino   | horn             |
| badger       | face-pattern       | penguin | beak, feet       |
| polar bear   | nose               |         |                  |

**Instrument colors**

`INSTRUMENT_COLORS` of `models/colors.ts` holds the colors of the instruments, after the polished
images. The bowed strings are varnished wood with a lighter arched top. Their strings are one thin
strip, so that they show no light bar. The clarinet is black lacquer with silver keys, the flutes
are silver, and the brass is gold with open bells that show the lit inside of the flare. The
timpani are copper. The piano is black lacquer with a dark well and a dark gold plate inside its
open case (`PIANO_INSIDE` of `models/instruments/piano.ts`).

**Materials**

All meshes share the values of one `MeshStandardMaterial` with vertex colors and crease normals
(`models/shading.ts`), so each player has one material and one draw call. three.js keeps one current
program for each material, and a skinned mesh or another count of morph targets needs another
program. So the stage gives each program variant of the players its own copy of the material, and a
depth material of its own for the shadow maps and for the depth passes of the beam and of the depth
of field (`scene/variants.ts`). A pass draws a player only when its view or its shadow camera sees
the sphere of the pose of the frame: the stage fits the sphere from the bone matrices, with a radius
for each bone that holds its vertices and their morph moves (`scene/bounds.ts`). A corner gets the
mean normal of the faces at its vertex within the crease angle of its finish. Each triangle has a
finish (`Finish` and `FINISHES` of `models/mesh.ts`), and the `uv` of a vertex points at the texel
of its finish in the roughness map and the metalness map of the material.

| Finish    | Parts                                                          | Intent                                                                                                 |
| --------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `matte`   | Cloth, raw wood, the stage, the props, and the bodies.         | No gloss, and flat faces. The fur of a studio body smooths the angles below its crease angle.          |
| `varnish` | The varnished wood of the bowed strings.                       | A soft gloss.                                                                                          |
| `lacquer` | The black lacquer of the piano and the clarinet, and the eyes. | A sharp gloss.                                                                                         |
| `metal`   | Brass, copper, and silver.                                     | Sharp highlights. The environment map of the hall is dark, so a high metalness makes metal look black. |

- The `matte` finish keeps each face flat, so the animals show the facets of the low-poly look
  that the user chose (2026-10-09). The studio bodies smooth their fur (user, 2026-10-14), because
  their many small faces showed a crumpled pattern under the hard spotlight (4.4, render).
- The vertex colors of a player hold a baked ambient occlusion (`shadeMesh()`), so that the folds
  stay dark. An arm shades only its parent and its children, because an occlusion of the bind
  pose would stay on the side of the torso when the arm rises. A studio body keeps the occlusion
  of the studio.
- The material has no fur shading (user, 2026-10-07).

**Light and render**

`scene/lights.ts` holds the lights, `scene/light-pool.ts` the pool of the stage lights,
`scene/beam.ts` and `models/beam.ts` the visible beam, and `scene/solo-light.ts` the light of a
solo.

- **Key light** (`KEY_PLACE` of `models/beam.ts`, user, 2026-10-18). One warm `SpotLight` far
  behind the orchestra, a little to the right, and high is the key light, and the only light that
  casts shadows on the stage. Its shadows fall to the front left, parallel and short, as in
  `orchestra-latest.png`, the newest target. It acts as the back light of a concert film, and the
  side lights act as its cross keys. Its soft penumbra keeps the stage sides dark, as in
  `mockup.png`. Its intensity grows with the square of the distance to the aim point, so each
  stage size gets the same light. A low, nearly neutral fill keeps the shadows deep, and one weak
  light shows the face of the conductor.
- **Side lights** (`SIDE_LIGHT`, user, 2026-10-18). Two high spotlights at the front corners light
  the fronts of the players. The narrow cone of each one holds only the section on the far side,
  so each body has a lit side and a shade side. They cast the shadows of the players on the
  players, such as an arm on the chest. The shadows of the players have a soft edge on the high
  tier (`TIER_SETTINGS`), because a hard edge showed black wedges and the steps of the map on
  white fur (user, 2026-10-21). The stage takes no shadow of them, and the low tier has
  none (2.6). The players and the props take only a part of the fill and of the diffuse light of
  the environment (`FILL.players`), so their shade sides stay dark. The floor takes less fill
  than the players, so it falls off outside the pool (user, 2026-10-21).
- **Back-row lights** (`BACK_ROW_LIGHT`, user, 2026-10-18). Two more spotlights at the front
  corners, lower than the side lights, cross the stage and light the fronts of the back rows and
  the choir of the far section, so the back rows are almost as bright as the front rows, as in
  `orchestra-latest.png`. Their narrow cones keep the front rows outside, and each body keeps a lit
  side and a shade side. They have the color of the side lights and cast no shadow, so they cost
  little GPU time. The gallery has none.
- **Light color** (user, 2026-10-18). The side lights are a warm white and the sky of the fill a
  neutral gray, so white, gray, and purple fur keep their colors, as in `orchestra-latest.png`.
  The key light stays orange, because it gives the amber of the floor and the warm rims.
- **Bake of the static props** (`scene/stage-bake.ts`). The props and the stage do not move during
  a song, and the key light keeps its place, so each layout bakes their light on the stage top
  one time: the soft shadow of a large key light, and the part of the sky that the near props
  leave open. The stage shader limits the key light by the bake, and the other lights and the
  reflections by the open sky. The props and the stage then cast no shadow in the shadow map of
  each frame, and the players keep it. A GPU with no target of floats has no bake.
- The baked stage takes no normal bias of the key shadow, so the shadow of a player starts at its
  feet. It blurs the shadows of the players more than the players do (`STAGE_SHADOW`), so their
  edge on the floor is near the edge of the bake. A point of the stage under an overhang, such as
  the floor below the edge of the podium top, gets no key light (`stageBakeAt()`).
- The light is a pool on the conductor and the middle of the orchestra. A factor in the shaders
  multiplies each spotlight (`addLightPool()`), because a separate pool light cost GPU time. The
  pool falls off only at the side edges and the front corners (user, 2026-10-07). It is narrower
  than the stage, so the floor falls off to its edges and the players stand out of the floor, as
  in `orchestra-latest.png` (user, 2026-10-21). On the players
  and the props, it reaches far toward the back (`LIGHT_POOL`), so the back rows keep most of the
  light, as in `orchestra-latest.png`. The stage keeps the round pool, so the floor at the back
  stays dark.
- The visible beam (`BEAM_LOOK`) is haze in a narrower cone than the key light, because haze in
  the full cone veiled the orchestra. The beam comes from the key light, so the light has a
  visible source: the haze cone leans from its foot toward the key light, and its tip stands low
  on that line (`hazeTip()`). The default view then sees the narrow top of the cone, and the beam
  opens as a fan toward the stage, as in `orchestra-latest.png`. The tip takes the key light
  turned onto the stage axis, so the beam stands upright in the frontal view (user, 2026-10-18). The shot planner keeps its own
  upright cone around the stage center (`insideBeam()`, 5.6), which holds the haze near the
  stage. The beam fades toward the stage with no edge. A depth pass
  (`BeamDepth`) gives no haze to an item on the stage, so the beam shows between the players
  (user, 2026-10-06). The camera dims the beam in a close shot (`shots/beam-opacity.ts`, 5.6),
  because the additive beam washed out the image. Dust motes drift in the haze by the tier.
- **Shot light** (`scene/shot-light.ts`, 5.6). A close shot adds a soft key 35° from the axis of
  the camera and a kicker behind the subject, both on the side of the stage key light, with a
  little more exposure and a stronger vignette. The lamps are a diffuse term in the material of
  the players and the props, which runs only while a lamp has light, because two spotlights cost
  each lit pixel of the scene in each shot (9.7). The subject then reads as in the close shots of
  `scene.png`, and the wide shots keep the light of the stage.
- **Room haze** (`ROOM_HAZE`, final pass). Thin warm air starts behind the point that the camera
  looks at and grows with the distance, brighter toward the key light. The back rows and the hall
  get an aerial depth, and the beam stands in air, as in `orchestra-latest.png`. The stage in
  front of the subject gets no haze, so no player is veiled, and the black point stays. The depth
  pass of the beam has no hall, so the haze takes the distance to the hall floor for its pixels.
- **Solo light** (`soloAim()`, user, 2026-10-07). When the user solos seats (2.4, 6.6), the key
  light, its pool, and the beam turn to the soloed players, and ease back after the solo. The aim
  comes from the solo flags and the layout alone. The pool of a solo is round on the players too,
  so the back rows outside it step back.
- **Captured environment** (`captureEnvironment()`). Each layout renders its hall and its lit
  stage into a cube, with no players, no props, and no beam, from above the middle of the pool of
  light. The brass and the lacquer reflect the real lamps and the lit floor, and the shadow sides
  of the players get the warm light of the floor below them, as in `orchestra-latest.png`. A GPU
  with no target of floats keeps a fixed environment of a dark room with warm lamps.
- Tone mapping is AgX, because ACES moved the dark wood to red. Its exposure (`STAGE_TONE` of
  `scene/renderer.ts`) keeps the lit floor and the lit white fur below the shoulder of the curve,
  so that the stage does not look over-exposed (user, 2026-10-21). With reduced motion, the noise,
  the motes, and the grain stand still, and the lights move at once (2.5).

**Hall**

The concert hall (`scene/hall.ts`, `HALL`) scales with the stage side, with a minimum. Walls with
two balcony tiers and lamps stand around the stage, as in `scene.png` (1). The low lamps have a
gap at the back (`HALL.wallLamps.backGap`), because lamps there floated above the orchestra and
near the title of the first screen (2.8). Each lamp has a soft glow disc (`createGlows()`). The
shell and the floor take no light, and hold a baked light, because the lights cost GPU time on
large surfaces. All faces point into the hall, so the near balconies do not stand in front of the
stage.

**Post effects**

The scene renders into a target with MSAA, then the post effects make the image of the canvas
(`scene/post.ts`, `POST_LOOK`).

```text
scene ──> [scene target, MSAA] ──┬──> bloom down 1/2 ... ──> bloom up ──────────┐
                                 └──> blur prepare 1/2 ──> blur gather 1/2 ──┐  │
scene ──> [depth 1/2] ──────────────────────^ (only with a shallow focus)    v  v
          [scene target] ───────────────────────────────────────────────> final pass ──> canvas
```

- With no float target, the scene renders to the canvas with no post effects. The bloom has a
  number of levels by the tier (2.6).
- The depth of field follows a thin lens, with the focus on the subject of the shot (5.6), and a
  smaller blur in front of the focus. The aperture closes for a far focus, so the wide views stay
  sharp and skip the blur passes. The user found larger apertures too blurry, and Free mode has no
  depth of field (2026-10-07). A separate depth pass at half size gives the depth, because the
  resolve of the multisample depth cost more time (9.7).
- The bloom keeps a small part of all the light, as a diffusion filter on a film lens, and its
  glow is warmer than the light, as the halation of film (`POST_LOOK`).
- The final pass does the depth of field, the bloom, the tone mapping, a grade, a vignette, and a
  grain at a fixed rate. The grade is a 3D lookup table of `gradeColor()` (`scene/grade.ts`): a
  tone curve on the luma, more saturation for the pale colors, and a split tone. AgX gives flat
  and pale middle tones, and `pnpm look-lab` fits the grade to `orchestra-latest.png`. The curve
  keeps the soft shoulder of AgX, because the curve scales the three channels by one factor: a
  steep shoulder clipped the red of the lit floor and the white fur, and the stage looked
  over-exposed (user, 2026-10-21).

**Camera**

`shots/view.ts` holds the values of the camera: the field of view, the default view, the
landscape rule, the portrait rule, and the orbit limits. `shots/frame.ts` holds the frame.

- The camera is a perspective camera with a vertical field of view of 30°. The far plane is the
  camera distance plus `3 × S`, so that a full zoom-out still shows the stage.
- The default view stands on the audience axis and sees the back of the conductor, as
  `orchestra-latest.png` (1): the full stage with the podium at the bottom middle. The camera looks
  down at `DEFAULT_ELEVATION` at `DEFAULT_TARGET`. In the axes of the stage origin (below), it is at
  `target + d × (0, sin e, cos e)` for the elevation `e` and the distance `d`. The wide shots of
  5.6 look at the same target, and Free mode turns around it (2.5).
- The default distance is `DEFAULT_DISTANCE_IN_SIDES × S`, multiplied by the height divided by the
  width of a tall viewport. The wide shots, the planner, and the beam fade use it as their unit.
- **Landscape rule** (user, 2026-10-06). The players fill almost the full width of the free area
  left of the open drawer, as in `mockup.png` (2.8, `landscapeZoom()`).
- **Portrait rule** (user, 2026-10-06). A portrait viewport gets a lower and more frontal view, so
  that the orchestra fills more of the tall screen. Its share grows smoothly with the aspect, so a
  turn of the screen makes no jump (`PORTRAIT_RULE`). Both rules keep each player whole in each
  wide shot, between the title and the bar of 2.8 (`wideView()`).
- **Frame.** `camera.setViewOffset` puts the middle of the frame in the middle of the free area
  (2.8, `viewFrame()`). A close shot of 5.6 fits its full frame into the free area, so that the bar
  and the drawer cover no part that the planner tests. While the play button of the first screen
  shows, the frame shrinks until the stage is clear of it.
- **Orbit limits.** Free mode keeps a range of elevations and a largest distance. The near limit
  keeps the camera outside the box of the stage and the players (`orbitMinDistance()`).

**Body proportions**

The head height `H` is the unit of the body. The default `H` is `DEFAULT_HEAD_HEIGHT` of
`models/species.ts` times the size of the species, so the species keep their sizes relative to
each other and to the chairs and the podium of the reference image. The head top is 0.5 H above
the head center. The table gives the parts of the parametric body (4.4).

| Part           | Code                      | Intent                                                                                                                                                                                                                                                                        |
| -------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Head           | `models/head.ts`          | The round head of the polished images, with full cheeks that carry the muzzle, and small triangle facets.                                                                                                                                                                     |
| Torso and neck | `models/trunk.ts`         | A round pear torso with the belly forward, as in `animals.webp`, and a short neck that the torso and the head hide.                                                                                                                                                           |
| Arms and hands | `models/arms.ts`          | Two limbs for each arm and a round mitten. A dome around the shoulder joint sinks into the torso in each pose.                                                                                                                                                                |
| Legs and feet  | `models/legs.ts`          | The short legs of 4.3, with round shoes on the floor or on the foot ring of a high stool.                                                                                                                                                                                     |
| Eyes           | `models/eyes.ts`          | Two black upright ovals with a white light, between the front and the sides of the head, so that the side view shows them. Both lights show on the upper left of each eye seen from the front, as the reflection of one lamp does on two real eyes (user, 2026-10-21). The studio bodies have the same eyes, bent to the form of the head (4.4). No mouth, except the smile lines of the panda and the wolf meshes (4.4). |
| Ears           | `models/ears.ts`          | The ear type of the species (4.3).                                                                                                                                                                                                                                            |
| Snouts         | `models/snouts.ts`        | The snout type of the species (4.3). A long muzzle reaches past the mouthpiece of a wind instrument.                                                                                                                                                                          |
| Tails          | `models/tails.ts`         | The tail type of the species (4.3). A long tail goes back through the open back of the chair.                                                                                                                                                                                 |

A player that stands (the timpani, the percussion, the choir, and the conductor, 4.6) has short
straight legs. The soloist of 3.8 also stands when it plays the violin, the viola, the flute, the
oboe, the clarinet, the horn, the trumpet, or the trombone, as in a concerto (user, 2026-10-06).
The other soloists keep their seats (`supportOf()` of `models/player.ts`). The props of a standing
player fit its shoulders. On a chair, the body moves forward until it keeps a small gap from the
back (`chairForward()`). Each species moves toward the anatomy of its reference images (design 1).

**Facets and triangle budgets**

- The parametric body shows small triangle facets. The target is the large, flat, and clean facets
  of the reference images (design 1, `lowpoly-animals.png`).
- A body has at most 2,600 triangles. A studio body keeps the faces of its GLB file, and its GLB
  file has a budget of 4,600 faces, so that a thick arm can take a round tube of its own (the
  user, 2026-10-22: "do not worry about triangle budget"). The rabbit and the red fox play in the violin sections, the
  cat in the violas, the dog in the cellos, the tan fox in the flutes, the mouse in the oboes, the
  beaver in the bassoons, the wolf in the clarinets, the monkey in the trumpets, the panda in the
  trombones, the pig in the horns, the hippo in the contrabasses, the elephant at the timpani, the
  badger in the percussion, the rhino at the tuba, the deer at the harp, the penguin in the
  choir, the polar bear at the piano, and the bear on the podium, so many
  studio bodies share the scene. The pea eyes add their triangles to a studio body
  (`docs/decisions/2026-10-15-pea-eyes.md`).
- An instrument has at most 800 triangles, except the timpani (1,200) and the piano (2,000). A
  chair or the piano bench has at most 120, and a stand at most 80. The full scene with 60
  players has at most 200,000. The frame cost of `perf-60.mid` set these budgets (9.7).
  `models/budget.test.ts` and `models/species.test.ts` check them.

**Props and stage**

`models/props.ts` holds the sizes of the chairs, the stools, the music stands, and the choir
risers. `models/stage.ts` holds the sizes of the stage, the podium, and the conductor stand.

| Item            | Rules                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Chair           | A seat, two back posts, one wide top rail, open below the rail, and four legs (`CHAIR`), as in `animals.webp`. The seat is at the `seatHeight` of the skeleton (`seatHeights()`, 4.3), so each species has a chair of its own height. A studio body also gives the depth, the room, and the width of its seat (4.4, seat). A species with no chair (`SpeciesParams.noChair`), the mouse, the beaver, or the monkey, keeps its seated pose at the seat height of its legs, and the app builds no chair under it (`buildSupport()`). The monkey stands in this pose with its center of mass over its soles (4.4, seat). |
| Stool           | For the harp, with no back (`STOOL`). Under a studio body, as the deer, its seat fits the legs, and it has the width and the depth of the seat of the chair of the body (`StudioBody.chairWidth`, `chairDepth`), with its back at the back of the chair and its legs at its corners. Its front edge thus ends where the thighs leave it, so the knees, the shins, and the hooves stay out of it (`seatHeights()`). Under the parametric biped, it keeps the height of the chair of 2026-10-06.                        |
| High stool      | With a foot ring at the `seatHeight` of the skeleton below the seat (`HIGH_STOOL`). No player sits on it since the hippo stands at its contrabass.                                                                                                                                                                                                                                                                                                                                                                    |
| Music stand     | A tripod, a post, and a tilted desk with a white sheet (`MUSIC_STAND`). The desk stays below the eyes of its players (`standDeskHeight()`).                                                                                                                                                                                                                                                                                                                                                                           |
| Podium          | A box with cut corners and framed panels (`PODIUM_SIZE`, `PODIUM_TRIM`), as in `orchestra-latest.png` and `bear-views.png`.                                                                                                                                                                                                                                                                                                                                                                                           |
| Conductor stand | A desk on a post in front of the podium (`CONDUCTOR_STAND`), with its top edge at the shoulders of the bear, as in `animals.webp`. A post on the podium put the belly of the bear through the desk.                                                                                                                                                                                                                                                                                                                   |
| Stage           | A slab of side `S` (stage origin, below) with no steps, cut corners (`STAGE_CORNER_CUT`), a raised lip (`STAGE_LIP`), and planks from the left to the right. The wood has a soft sheen under a thin lacquer (`STAGE_FINISH`), so the lit floor keeps the warm color of the wood. Each plank has its own tone and gloss, and the seams have little gloss.                                                                                                                                                              |
| Choir risers    | Up to three arc levels behind the orchestra, with three steps in front, as in `orchestra-latest.png` (`RISER`).                                                                                                                                                                                                                                                                                                                                                                                                       |
| Floor           | The floor of the hall, with the baked spill of the stage light.                                                                                                                                                                                                                                                                                                                                                                                                                                                       |

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
  neighbors grows until their footprints keep 0.05 m apart. Two string players share one stand
  (`STAND_DISTANCE` of `models/layout.ts`), and each wind player has its own stand.
- Rows 0 and 1 hold the strings (4.2): the violins left of 0°, and the violas and the cellos right
  of it, so no string player sits behind the conductor. The other rows are centered on 0° and span
  at most 160°. A row with no players drops out.
- Row `n` has the radius `r(n) = max(r(n - 1) + 1.2, width(n) / 2.79)`, where `width(n)` is the
  arc length that its players need and 2.79 is 160° in radians. `r(-1)` is 1.2. Then the row moves
  back until its footprints keep 0.05 m from the items in front.
- Riser level `k` of the choir has the radius `r + 0.8 × k` and the height `1.0 + 0.25 × k`, where
  `r` is 1.2 m more than the radius of the last instrumental row, so that the back row hides no
  singer (4.2). The layout keeps the count of levels with the smallest stage, then widens the
  levels (`widenRisers()`). The vocal soloists of 3.8 stand alone on level 0.
- After the stage size, each instrumental row spreads to the side edges, because the packed rows
  left the front corners empty. Each side takes the largest factor of its arcs (`SpreadLimits`)
  that keeps each footprint 0.3 m inside the stage (`boxOnStage()`) and 0.05 m from the other
  items. Then row 1 moves its back desks toward the first desks of their seats, as the wedges of a
  professional orchestra.

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
height, in the bind pose, and the box of its seat. The overlap test of `models/` places the
footprints of all items of each demo layout and of `perf-60.mid` (9.5): no two items touch, and
each item is on the stage.

| Row | Sections, from left to right                                                               |
| --- | ------------------------------------------------------------------------------------------ |
| 0   | the first desk of: violins (first seat), violins (second and later seats), violas, cellos  |
| 1   | the other desks of: violins (first seat), violins (second and later seats), violas, cellos |
| 2   | a keyboard of the orchestra (4.2), harp, flutes, oboes                                     |
| 3   | horns, clarinets, bassoons, trumpets                                                       |
| 4   | percussion, contrabasses, timpani, trombones, tuba                                         |
| 5   | choir, on the risers                                                                       |

**Soloist.** The soloist of 3.8 stands at the front left of the conductor (4.2), at
`SOLOIST_PLACE` of `models/layout-scene.ts`. It faces the audience and turns to the conductor
(`SOLOIST_FACING`), so the default view sees its face. A place farther left hid a player of the
first desk, and a place nearer to the conductor put the bear into the solo shots. A piano soloist
sits at `PIANO_CENTER` and faces the conductor, as in a concerto, so the lid opens to the audience.
A keyboard of the orchestra turns a quarter turn, so that its case lies along row 2.

**Chamber group.** A chamber group (4.2) has no conductor and no podium (`CHAMBER` of
`models/layout-scene.ts`). The players of an arc stand in one row around the old podium center,
each side within 60°, and face the center, so they face each other a little. The arc has no
spread. A solo player stands at the middle of the arc. In a recital, the partner stands at the
curved side of the piano and turns a little to the pianist. The stage rule applies from the middle
of the group.

## 4.6 Model inventory

| Section                                          | Instrument model                                                                       | How the player holds it                                                                        | Seat                                       |
| ------------------------------------------------ | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------ |
| violin                                           | violin and bow                                                                         | under the chin on the left shoulder, bow in the right hand                                     | chair                                      |
| viola                                            | the violin model at 1.15 scale                                                         | as the violin                                                                                  | chair                                      |
| cello                                            | cello and bow                                                                          | between the knees, end pin on the floor                                                        | chair                                      |
| contrabass                                       | the cello model at 1.6 scale                                                           | at the left side, leaned to the left of the head, bow in the right hand                        | stands                                     |
| harp                                             | concert harp, or a smaller harp (`harpScale`)                                          | between the knees, both hands on the strings                                                   | stool                                      |
| piano                                            | grand piano (also for the celesta and the organs)                                      | both hands on the keys                                                                         | bench                                      |
| flute                                            | silver tube (also for the piccolo and other pipes)                                     | horizontal, to the right                                                                       | chair                                      |
| oboe                                             | thin dark tube with a small bell                                                       | in front of the mouth, 30° forward from the vertical                                           | chair, or none for the mouse (4.5, props)  |
| clarinet                                         | black tube with silver rings, keys, and a bell                                         | in front of the mouth, 25° forward from the vertical                                           | chair                                      |
| bassoon                                          | tall wooden tube with a bocal that comes to the reed nearly level                      | diagonal across the body                                                                       | chair, or none for the beaver (4.5, props) |
| horn                                             | coiled tube with a bell                                                                | in the lap, right hand in the bell                                                             | chair                                      |
| trumpet                                          | tube with a forward bell                                                               | horizontal, forward                                                                            | none for the monkey (4.5, props)           |
| trombone                                         | tube with a slide and a bell                                                           | forward, and the slide moves with the pitch                                                    | chair                                      |
| tuba                                             | large tube with an upward bell                                                         | against the body on a strap                                                                    | none: the rhino stands (4.4)               |
| timpani                                          | two to four kettles, by the pitch range of the file                                    | two mallets                                                                                    | stands                                     |
| percussion, bass drum player                     | bass drum on a stand                                                                   | one beater                                                                                     | stands                                     |
| percussion, snare drum player                    | snare drum on a stand                                                                  | two sticks                                                                                     | stands                                     |
| percussion, cymbals player                       | a pair of crash cymbals, or a suspended cymbal on a stand (`SpeciesParams.cymbalForm`) | one cymbal in each hand, or a yarn mallet in each hand                                         | stands                                     |
| percussion, small percussion player              | a triangle and a tambourine                                                            | the triangle and its beater for keys 80, 81, and all other keys, and the tambourine for key 54 | stands                                     |
| percussion, mallet seat (programs 9-15, 112-119) | xylophone                                                                              | two mallets                                                                                    | stands                                     |
| choir                                            | a music folder                                                                         | both hands                                                                                     | stands on the risers                       |
| conductor                                        | baton                                                                                  | right hand                                                                                     | stands on the podium                       |

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
animals of the reference image. A species can play a smaller violin, cello, contrabass, oboe, bassoon,
trumpet, or harp (`SpeciesParams.violinScale`, `celloScale`, `bassScale`, `oboeScale`,
`bassoonScale`, `trumpetScale`, `harpScale`), as a child plays a fractional size or a small lever
harp. One list names these instruments (`SCALED_INSTRUMENTS`), so that the
typecheck stops a new scale that a reader of the scales misses. A smaller oboe or bassoon shrinks toward the tip of the reed, so the reed
stays in the mouth, and a smaller trumpet shrinks toward its mouthpiece. A smaller harp shrinks
toward its base on the floor, with its distance in front of the player. A
smaller cello has a longer end pin, and the contrabass keeps a short end pin at each size, because
its hold moves it to the body (`endPinLength()`). A violin shop sizes a violin so that, with the left
arm extended, the scroll lies in the middle of the palm (`pnpm hold-reach`). The user chose the
instrument sizes and the arms of the mesh bodies, and the holds fit them. The rabbit and the red
fox play almost the violin of the app, and the cat the viola of the app. Their arms are shorter
than the rule needs, so their holds put the instrument nearer to the neck, and the left paw still
reaches the nut (5.3, `docs/decisions/2026-10-16-mesh-cat.md`). The dog plays a 1/2 cello, and its
left paw reaches the whole fingerboard (`docs/decisions/2026-10-17-dog-arms.md`). The hippo plays
a smaller contrabass (`bassScale`) in front of its belly. Its left paw reaches nearly the whole
fingerboard with a forward turn of the left shoulder, and its bow paw the part of the hair away
from the frog (`docs/decisions/2026-10-21-hippo-bass.md`). The tan fox
plays the flute of the app, and each palm reaches its grip in the play and in the rest
(`docs/decisions/2026-10-17-fox-form.md`). The panda plays the trombone of the app, and its right
paw reaches the first part of the slide travel, from the grip of the first position
(`docs/decisions/2026-10-18-mesh-panda.md`). The small mouse keeps the arms of the other meshes,
so it plays a smaller oboe (`oboeScale`), the largest at which each palm reaches its grip with
3 cm to spare in the play and in the rest (`docs/decisions/2026-10-19-mouse-size.md`). The beaver
keeps the arms that the user chose, so it plays a smaller bassoon (`bassoonScale`), the largest at
which each palm reaches its grip with 3 cm to spare in the play and in the rest
(`docs/decisions/2026-10-19-mesh-beaver.md`). The elephant keeps the short arms of its mesh, so the
kettles of the timpani move to the arms, in place of longer arms: the two front kettles stand
near its belly, the outer kettles stand further out, and the kettles leave a gap at the front of
the player for the trunk. The kettles have their real size and stand at the height of the
reference images, so that the paws rest above the near rims (`TIMPANI`,
`docs/decisions/2026-10-19-elephant-pose.md`). The pig plays the horn
of the app with the arms that the user chose. Its long snout puts the mouthpiece far in front of
its body, so its hold turns the horn back toward the body, and the left paw reaches the valves
and the right paw the bell in the play and in the rest (5.3, `docs/decisions/2026-10-19-mesh-pig.md`).
The wolf plays the clarinet of the app with arms of the reach of the parametric wolf. Its long
muzzle puts the tip of the nose far in front of the mouth, so the mouthpiece sits back under the
muzzle and the shoulders turn forward, and each palm reaches its grip of the clarinet at 45° in
the play and in the rest (5.3, `docs/decisions/2026-10-20-mesh-wolf.md`).
The monkey plays a smaller trumpet (`trumpetScale`) with the longer arms, the size that the user
chose. Its big head puts the mouthpiece far above the shoulders, so its palms hold the valve
casings at their lower half, and each palm reaches its grip in the play and in the rest (5.3,
`docs/decisions/2026-10-20-mesh-monkey.md`).
The rhino plays the tuba of the app with the arms of its mesh. Its long muzzle puts the
mouthpiece far in front of its chest, so its tuba has a longer lead pipe (`SpeciesParams.tubaPipe`):
the body of the tuba stands under the muzzle in front of the chest, and the bell at the left of the
horn and the head. The left palm holds the main branch at its back left, so that the thick paw
closes on the tube, and each palm reaches its grip in the play and in the rest (5.3,
`docs/decisions/2026-10-21-mesh-rhino.md`).
The deer plays a smaller harp (`harpScale`) with longer arms, the choice of the manager while the
user slept. The harp stands upright in front of its chest (`HARP_PLACE`), the neck below its chin,
and each palm reaches the string of each note (5.3, `docs/decisions/2026-10-21-mesh-deer.md`).
The penguin keeps the flippers of its mesh, and its round belly stands far in front of its
shoulders, so the choir folder comes to the flippers: it hangs higher than in the reference images,
in front of the chest, and its covers are a little wider, so that each palm reaches its grip at
each note and the upper flippers keep off the sides of the body (`CHOIR_FOLDER`,
`docs/decisions/2026-10-21-mesh-penguin.md`).
The badger keeps the short arms of its mesh, so its drums and the tambourine stand nearer to it,
and its paws reach each strike of the bass drum, the snare drum, the triangle, and the tambourine
(`BASS_DRUM`, `SNARE_DRUM`, `TAMBOURINE`). Its arms do not hold hand cymbals of a real size out of
its round body, so it plays a suspended cymbal on a stand in front of it, as an orchestra plays a
part "with mallet" (`SpeciesParams.cymbalForm`, `SUSPENDED_CYMBAL`,
`docs/decisions/2026-10-20-badger-cymbals.md`). Its arms do not reach the outer bars of the
xylophone of the app, so the xylophone stays open for a choice of the user
(`docs/decisions/2026-10-20-mesh-badger.md`). A species can also play smaller hand cymbals
(`SpeciesParams.cymbalScale`).
The bear keeps the arms of its mesh (reach 0.47 m) and the baton of the app (0.51 m). The baton
lies along its index finger, and the tip of beat 1 stands in front of the right shoulder, so that
the wrist stays below the chin (5.4, `docs/decisions/2026-10-22-mesh-bear.md`).
The polar bear plays the piano of the app with arms 1.25 times the arms of its mesh (reach
0.68 m), the choice of the agent while the user slept. Its round belly stands in front of its
short arms, so the keys stand in front of the belly, and each paw reaches the key of each note
(5.3, `docs/decisions/2026-10-22-mesh-polar-bear.md`).
The chairs, the stands,
and the podium keep their sizes in meters.

**Sizes and holds**

The hold gives the place of each piece in the bind pose of 4.7, in the axes of the model: the
player faces -z, and its left is -x. An offset in `H` uses the head height of the player. The code
of each instrument (`models/instruments/`) holds its sizes and the offsets of its hold.

| Instrument                       | Model                                                                                                                   | Hold in the bind pose                                                                                                                                                                                                       |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Violin                           | An arched body, a neck, a scroll, and a bow.                                                                            | Under the chin on the left shoulder, the top plate turned to the audience. The bow stick lies in the fingers of the hanging right hand, or through the closed paw of a species with its own grip (`SpeciesParams.bowGrip`). |
| Viola                            | The violin at 1.15 scale.                                                                                               | As the violin.                                                                                                                                                                                                              |
| Cello                            | A body with an end pin, and a bow.                                                                                      | The end pin in front of the seat. The cello leans back to the chest, with the neck left of the head, as in `animals.webp`.                                                                                                  |
| Contrabass                       | The cello at 1.6 scale.                                                                                                 | At the left side, in front of the seat.                                                                                                                                                                                     |
| Harp                             | 24 strings that show the 47 strings of a concert harp.                                                                  | On the floor in front of the chest, upright, turned so that the column goes to the front left (`HARP_PLACE`).                                                                                                               |
| Piano                            | A case with an open lid, keys, and a desk. The lid opens less than in `mockup.png`, so that it hides no head behind it. | The keys stand in front of the floor point of the pianist (`PIANO_FRONT_H`), clear of the belly and the muzzle of the polar bear (5.3).                                                                                     |
| Piano bench                      | A seat of `PIANO_BENCH`, at the seat of the legs of the polar bear (4.4, seat).                                         | A static prop under the pianist.                                                                                                                                                                                            |
| Choir folder                     | Two open covers with pages.                                                                                             | In both flippers, in front of the chest, with the pages to the eyes.                                                                                                                                                        |
| Flute                            | A silver tube.                                                                                                          | The lip plate at the mouth. The flute points to the right.                                                                                                                                                                  |
| Oboe                             | A thin dark tube with a bell.                                                                                           | The reed at the mouth, 30° from the vertical.                                                                                                                                                                               |
| Clarinet                         | A black tube with silver keys and a bell.                                                                               | The mouthpiece at the mouth, 25° from the vertical, as in the reference image.                                                                                                                                              |
| Bassoon                          | A tall wooden tube with a bocal.                                                                                        | The reed at the mouth, across the body to the left.                                                                                                                                                                         |
| Horn                             | A coil and a bell.                                                                                                      | The mouthpiece at the mouth, the coil in front of the right chest, and the right palm in the bell.                                                                                                                          |
| Trumpet                          | A tube with valves and a forward bell.                                                                                  | The mouthpiece at the mouth, forward and a little down.                                                                                                                                                                     |
| Trombone                         | A tube with a slide from the first position to the seventh.                                                             | The mouthpiece at the mouth. The slide is a second piece on the `slide` bone, in the right palm.                                                                                                                            |
| Tuba                             | A large tube with an upward bell.                                                                                       | Against the body, with the bell left of the head.                                                                                                                                                                                 |
| Timpani                          | Two to four kettles of the real size, by the highest timpani note (`kettleCount()`).                                    | In an arc around the player, the outer kettles further out, with a mallet in each hand.                                                                                                                                     |
| Bass drum, snare drum, xylophone | Drums on stands, and 30 bars from C5 to F7.                                                                             | In front of the player, below the shoulders of the badger, within the reach of its short arms where they reach.                                                                                                             |
| Cymbals, small percussion        | Two crash cymbals, or one suspended cymbal level on a stand with two yarn mallets. A triangle and a tambourine.         | The crash cymbals in the hands, above the floor. The suspended cymbal in front of the player, below its wrists. The beater strikes the tambourine for key 54.                                                               |
| Baton                            | A straight white stick that tapers to the tip (user, 2026-10-13).                                                       | In the right hand, along the index finger, with its grip in the palm.                                                                                                                                                       |

In the bind pose, each mallet, stick, beater, and the triangle lies in the hanging hand in front
of the palm, and points forward. The baton lies along the fingers, 15° toward the thumb, because
a conductor holds it along the index finger with its grip in the palm, so that it extends the hand
(`BATON_ALONG`, `docs/research/2026-10-22-mesh-bear.md`). The timpani mallets, the snare sticks, the
xylophone mallets, and the triangle beater slant down toward the line of the forearm, as a real
player holds the shaft along the thumb (`malletTilt` of `TIMPANI`, `SNARE_DRUM`, `XYLOPHONE`, and
`TRIANGLE`). No vertex of a player model is below the floor.

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
  grips: {
    palmL: PiecePoint | null;
    palmR: PiecePoint | null;
    mouth: PiecePoint | null;
    chin: PiecePoint | null;
  };
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

- Each piece is rigid and follows one bone. The origin of the piece axes is the bind position of
  its bone, so step 5 turns a mallet around the palm, and a bow around its grip.
- `holdInstrument(model, body)` places the pieces on the points of one body, and
  `attachInstrument()` adds them to the mesh of the player, so one function attaches each
  instrument to each species.
- A target is a point or a line on a piece. `pianoKeyPosition(key)`, `xylophoneBarPosition(key)`,
  and `harpStringPosition(key, scale)` give the point of each key, because a pitch is not linear
  along the evenly spaced white keys, bars, and strings.
- The trombone slide moves along its axis, which a bone rotation cannot do, so the pose has a move
  of the `slide` bone, `AnimalPose.slideOffset` (5.1).

## 4.7 Rig

Each player has one skeleton with the bones of the list below. A vertex of a parametric body
follows one or two bones: the mesh data (`MeshData` of `models/mesh.ts`) gives each corner a main
bone (`bones`), a second bone (`blendBones`), and its weight (`blendWeights`), from 0 to 0.5. A
rigid part gives each corner the weight 0. The GPU blends the bones linearly, and the vertex shader
of three.js always blends four bones, so the second bone adds no shader work.

- Each part of the parametric body is rigid. The arm is two limbs on `upperArm` and `forearm`,
  with a rigid dome over the shoulder joint (`docs/research/2026-10-06-shoulder-spike.md`). A long
  tail is two parts on `tail1` and `tail2`. No pose turns the legs.
- A studio body (4.4) has a skeleton of its own: the 30 body bones of the biped template of the
  studio, two eye bones for the pea eyes, and the optional bones (`OPTIONAL_STUDIO_BONES`): the
  tip of a tail of two bones (`tail_tip`: the red fox, the tan fox, the cat, the dog, the mouse,
  the beaver, the wolf, and the monkey), and the jaw of a beak that opens (`jaw`: the penguin).
  The optional bones come after the other bones, so that a new one keeps each other index. The rabbit, the panda,
  the hippo, the pig, the badger, the rhino, the deer, and the penguin have a tail
  ball on one tail bone, with no tip, and so do the bear and the polar bear. Each vertex follows up to four of them. The
  scene gives the mesh the studio bones and the bones of the player, and `poseStudioBones()`
  writes their matrices from the pose of the player. So the pose code drives a studio body as
  each other body. A pose also holds the matrices of the twist bones of the upper arms
  (`UPPER_TWIST_BONES`), after the bones of the player. Only a body with `upperTwist` (4.4), the
  hippo, the elephant, the rhino, and the polar bear, puts weight on them: each one turns with its upper arm, less the rest of the roll from the chest.
- The `jaw` bone of a studio body is a child of `head` at the hinge of the beak, and it follows
  the `jaw` of the player, whose bind place is then the hinge. The choir pose opens it (5.3). A
  body with no jaw keeps the `jaw` of the player at the tip of the nose, with no vertex on it.
- The readers of the bind mesh read the main bone: the footprints, the chair clearance, the baked
  occlusion (4.5), the silhouettes, and the budgets. `posedCorner()` of `pose/test-skin.ts` poses
  a corner in the tests as the GPU does.

```typescript
type BoneName =
  | 'root'
  | 'hips'
  | 'spine'
  | 'chest'
  | 'neck'
  | 'head'
  /** Opens for the choir. */
  | 'jaw'
  /** Scale on Y for blinks. */
  | 'eyeL'
  | 'eyeR'
  | 'earL'
  | 'earR'
  /** Only if the species has a tail. */
  | 'tail1'
  | 'tail2'
  /** Only for the elephant. */
  | 'trunk1'
  | 'trunk2'
  | 'trunk3'
  | 'shoulderL'
  | 'upperArmL'
  | 'forearmL'
  | 'handL'
  | 'fingersL'
  | 'shoulderR'
  | 'upperArmR'
  | 'forearmR'
  | 'handR'
  | 'fingersR'
  | 'thighL'
  | 'shinL'
  | 'footL'
  | 'thighR'
  | 'shinR'
  | 'footR'
  /** Parent: `chest` for the violin and viola, `root` for floor instruments, `chest` for winds and brass. */
  | 'instrument'
  /** Children of `handR` or `handL`, as the instrument needs. */
  | 'bow'
  | 'malletL'
  | 'malletR'
  | 'baton'
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
  instrument is in its playing place on its bone, and the bow lies in the hanging right hand.
