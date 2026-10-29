# 4. Stage, cast, and look

## 4.1 Look

- Low-poly shapes with flat facets and matte colors from the reference images. The fur of a
  studio body shades smooth across the small angles between its faces and keeps its larger
  edges. The props and the plain parts of the instruments keep flat faces. The glossy parts of
  the instruments shade soft (4.5, materials).
- A cinematic stage light. The key light goes from the front of the stage to the back, so the
  shadows fall back. Rim lights behind the stage light the heads and give the visible beam, with
  haze and dust motes (4.5, light and render).
- A dark concert hall with two balcony tiers and rows of small warm lamps around the stage, as
  in `scene.png`. The lamps of the balcony rails go all around the hall. The low row of wall
  lamps has a gap at the back, so that no lamp floats above the orchestra. The lamps bloom, and
  in a close shot they become soft discs.
- A square stage of glossy walnut planks with cut corners, a raised lip, and no steps, as in
  `orchestra-latest.png`. Yellow chairs and black music stands.
- Post effects make the image of a film: a bloom, a depth of field in the close shots, a warm
  color grade, a vignette, and a fine grain (4.5, post effects).
- The bear conductor stands on a podium at the front center. A chamber group of at most 5
  players has no conductor and no podium (4.2).

These product choices apply to each area:

- **Reference images first.** The reference images win over the values in the code. The
  values that 4.5 to 4.7 name describe the current models, and they are no targets. Design 1
  says which image wins where two images differ. A newer product choice wins over an image, and
  its section names it.
- **Happy faces.** Each animal has a happy face. A face rule of the rig removes a sad look, such
  as raised inner brows or a crease that goes down over the eyes (4.4, mesh rig). The faces have
  no blush.
- **Natural balance.** A body that stands, or that plays with no chair, keeps its center of mass
  over the middle of its soles, where a real stance is most stable (4.4, seat).
- **No fur shading.** The material has no fur shader, no tufts, and no shells (4.5, materials).

## 4.2 Layout

The sections go into arcs in the standard order, with no gaps between the used sections. The
stage size follows the player count. Thus a string quartet sits close together on a small stage.

The standard order is the American seating of a professional orchestra, with the contrabasses
in a line at the back, as the Vienna Philharmonic seats them. The diagram shows it from above.

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
- The soloist of 3.8 stands or sits at the front left of the conductor, as in a concerto. A
  piano seat is always the soloist (3.8), so the piano stands there. Another soloist leaves its
  section row and stands next to the podium (4.5, seat geometry). It has no music stand, because
  a soloist plays from memory.
- **Chamber group.** A score with at most 5 players has no conductor and no podium, because a
  conductor for one pianist looks wrong. The players sit in a small arc at the stage center and
  face each other a little, as a real chamber group does. A score with no players keeps the
  conductor, so that the stage is not empty. `chamberFormOf()` of `models/cast.ts` gives one of
  three forms:

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

- Larger species sit farther back, so that a big animal hides no smaller animal. A species of
  the size 1.2 or more plays only the contrabass, the timpani, the trombone, or the tuba. The
  strings have species of the size 1.05 or less, and the piano 1.1 or less.
- In the default view, a large species hides less than 10% of the head of each smaller animal
  (`scene/hidden-heads.test.ts`).

## 4.3 Species

Each species has one `SpeciesParams` in `SPECIES` of `models/species.ts`, and each species has a
studio body of its own (4.4). The table gives the species of each section.

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
  `fox-tan`). The two foxes share one mesh and one rig, and the tan fox takes another palette of
  the same faces (`palette`).
- The polar bear plays the piano and each keyboard seat of 3.8. The wolf is the gray clarinet
  player of `animals.webp`. The penguins look like a choir in robes.
- The size rule of 4.2 puts the large species in the back row.
- Further seats of a section alternate their species variants: a third violin seat uses rabbits
  again.
- The mouse, the beaver, and the monkey play with no chair (`noChair`). Each one stands on its
  hind legs with bent knees, as a real mouse, beaver, or monkey does (4.4, seat).

```typescript
/** The parameters of one species (`SPECIES` of `models/species.ts`). */
interface SpeciesParams {
  /** Height scale. 1.0 is the rabbit of the reference image. The size rule of 4.2 reads it. */
  size: number;
  /** The fur, the belly, and the accent colors (4.5). The UI seat dots read them. */
  colors: SpeciesColors;
  /** The studio body of the species (4.4): `'studio-rabbit'`, `'studio-fox'`, and so on. */
  body: StudioBodyName;
  /** Another palette of the faces of the body (`StudioBody.palettes`): the tan fox. */
  palette?: StudioPalette;
  /**
   * The scale of an instrument of `SCALED_INSTRUMENTS` for the species (4.6), 1 by default.
   * Also `violaScale`, `celloScale`, `bassScale`, `oboeScale`, `bassoonScale`,
   * `trumpetScale`, `cymbalScale`, and `harpScale`.
   */
  violinScale?: number;
  /** `'suspended'` for a species whose arms cannot hold hand cymbals (4.6). */
  cymbalForm?: CymbalForm;
  /** The lengths of the longer lead pipe of the tuba, back and left, in meters (4.6). */
  tubaPipe?: readonly [back: number, left: number];
  /** True for a species that plays with no chair (4.4, seat). */
  noChair?: true;
  /** The place and the turn of the bow stick in the right paw (4.6). */
  bowGrip?: BowGrip;
  /** A seated tail that lies curled on the seat, and does not sway (5.1): the cat. */
  seatedTail?: 'curl';
  /** Ears that hang beside the head, and do not twitch (5.1): the dog. */
  hangingEars?: true;
}
```

The head height `H` is the unit of the body. The head height and the seat height of a species
come from its studio body (`StudioBody.headHeight`, `StudioBody.seatHeight`). The holds of 4.6
give their offsets in `H`, so one hold serves the species of different sizes.

## 4.4 Models

Code builds the instruments and the props from low-poly shapes with vertex colors. Each species
has a studio body: a mesh of the user, rigged into the studio format. The app reads only the
modules of `src/models/studio/`, and the tools make them from the meshes:

```text
user mesh (Meshy GLB)  ->  tools/blender/<a>_arms.py  ->  <a>-arms.glb + <a>-weights.json
  ->  pnpm rig-mesh <a> (tools/mesh-rigs/<a>.json, Blender)  ->  <a>.rig.glb
  ->  pnpm studio-body <a> (no Blender)  ->  src/models/studio/<a>.ts (the app reads only this)
```

The files of each species are in `assets/models/<a>/`, and its `README.md` gives the source and
the steps of each file. [`docs/agents/rigging.md`](../agents/rigging.md) gives the details and
the traps of the rig.

### Meshes of the user

- **Fidelity.** A mesh that the user gives stays as it is. The rig adds no stretch of a limb,
  unless the user chooses an arm or a leg factor. The props and the instruments fit the body:
  each chair fits the legs, and a species with short arms plays a smaller instrument in place of
  longer arms (4.6). The source file stays unchanged. Each edit goes into a copy that a script
  of `tools/blender/` makes, so that a run gives the same bytes again.
- **Colors.** The texture of the mesh shows as one color for each face. A color rule of the rig
  can move the fur toward the color of the species in the reference images (mesh rig, below).
- **Intake pose.** A new mesh comes in an A-pose, with a gap between each arm and the trunk. An
  arm that touches the trunk needs a cut with a flat cap, and bone heat then spreads the arm
  weights into the trunk. Both give flaps at the armpit. The rig fixes the meshes that exist,
  and nobody makes them again.
- **Triangle budget.** The budget of a studio body allows round forms, such as a round tube for
  each arm and a round shoulder (`STUDIO_TRIANGLE_BUDGET` and `STUDIO_MESH_GZIP_BUDGET` of
  `tools/studio-budgets.ts`). The pea eyes add their triangles. The first download of 1 MB and
  the frame time of 9.7 stay the limits.
- **Licenses.** The project author made the meshes with Meshy on a paid plan, and holds their
  rights. The files of `assets/models/` and `src/models/studio/` are under CC BY-NC 4.0 (the
  `README.md` of the repository). They need no entry in the third-party license file (7.3).

### Rules of each body

- The animal faces -z, with its left side at -x. The mouth is near the middle plane, below the
  eyes.
- The bones have the names of 4.7, so that the pose code of section 5 drives each body. A
  vertex follows up to four studio bones.
- Each player is one `SkinnedMesh`: the body, the instrument, and the bow merge into one mesh,
  with one draw call for each player (4.5, materials). One `Mesh` for each part gives about 25
  draw calls for each animal, which is too many for an integrated GPU. The static props merge
  into a few meshes.
- The tests of the behavior check each body: the clearance of the arms, the bow hold, the hidden
  heads, the budgets, the feet on the floor, and the footprints of the layout.

### Export

`pnpm studio-body <animal>` (`tools/studio-body.ts`) reads the rigged GLB file with no Blender
and writes the module of the body. The entry of the animal in `ANIMALS` gives its settings.

- It turns the animal to face -z and scales it (scale, below). It drops the props and the clips
  of the studio, because the app keeps its own. It joins the digits of a paw into one `fingers`
  bone, so that the digits curl together.
- It drops the eyes of the mesh, and the app puts its pea eyes there on eye bones of their own,
  so that they blink (`StudioBody.eyes`). A pea eye is a share of the head height, and a body
  can scale its eyes (`eyeSize`), turn them level (`eyeLevel`), move them to a part of the face
  with less fold (`eyeShift`), or turn them toward the normal of the face (`eyeNormal`).
- Each pea eye bends along its direction to a fit of the head surface (`eyeBend()`), so its rim
  lies at the fur in each view. The light of the eye is a thin disc flat on the front of the
  oval. Both lights show on the upper left of the eyes seen from the front, as the reflection of
  one lamp does on two real eyes.
- The tip of the nose comes only from the vertices near the middle plane (`NOSE_PLANE`), because
  a whisker tip can be the front of the head. A horn on the muzzle stands in front of the lips,
  so the rhino takes its nose tip from below the horn (`noseTop`).
- The head measures (`H`, the head center, and the box of the pea eyes) leave out a long nose
  below the chin, the whisker tips, and the antlers (`headFloor`, `headCeiling`), because the
  holds in `H` start at the head.

```text
 src/models/studio/<a>.ts: StudioBody (packed mesh, heads, palms, sheet arms)
        | studioRig() (models/studio-rig.ts)
        v
 StudioRig: the skeleton of the player (arms straight down), the constants of the arms
        |                                   |
 buildStudioBody(): the body in the         poseAt() pose of the player (5.1), each frame
 bind pose of the player, two bones of          |
 the player for each corner (footprints,        v
 hanging arms, tests)                       poseStudioBones(): the studio bones from the
                                            bones of the player, the corrective weights
                                                |
                                                v
                                            the scene: one SkinnedMesh, 4 bones and morph
                                            targets (scene/player.ts)
```

### Mesh rig

`pnpm rig-mesh <animal>` rigs a mesh of the user with Blender into the studio format: one mesh
of faces with one color each, the skeleton of the biped template with twist bones of the
forearms, a skin of up to four bones for each vertex, and up to four corrective shapes
(`RAISE_LIMIT`). The config `tools/mesh-rigs/<animal>.json` gives the joints, measured on cuts
of the mesh, and the rules, each with a note. `--check` measures the rig.

| Group | Config keys | Reason |
| --- | --- | --- |
| Form | `armFactor`, `legFactor`, `headFactor`, `neckFactor`, `trunkFactor`, `girthFactor`, `proportions` (`keep`, `head`) | A factor changes a part to the choice of the user or to the sheet. The head can keep its form and move with the top of the neck. |
| Seat | `studio.legTurns`, `sit`, `studio.trunk`, `chair.front`, `crease` | The rig binds a seated role in its seated pose of 5.2 and lowers the haunch onto the seat. |
| Weights | bone heat, `weights.*`, `refine.rings`, `refine.pointFlip`, `heatSource` | Bone heat gives the weights. Rules and rings keep the faces at the joints from a fold. |
| Shapes | `raise` (`spread`, `follow`, `smooth`, `below`, `grow`) | The shapes give the source back in the standing pose and relax the faces that a bent arm turns over. |
| Arms | `upperTwist`, `armSegments`, `studio.bindSupination`, `studio.bindArms`, `paintedWeights`, `armSmooth`, `bindSmooth` | The roll of an arm spreads along the arm, so the skin does not twist like a wrung cloth. |
| Splits | `weights.armSplit`, `weights.armFree`, `weights.armIslands`, `weights.armCrease`, `cut` | An arm that the mesh joins to the trunk is freed, so that a raised arm does not pull flaps out of the trunk. |
| Normals | `cut.skinNormals`, `cut.bodyNormals`, `rootNormals` (`elbow`, `wrist`, `knee`, `armShare`, `turn`) | The faces at an arm root, an elbow, a wrist, or a knee take the normals of the skin, so a bent joint shades soft and shows no dark slot. |
| Colors | `colors.tone`, `colors.shift`, `colors.dark`, `colors.border`, `colors.split`, `colors.flank` | The face colors move toward the reference colors, and the black borders do not get teeth or bands. |
| Face | `colors.patch`, `colors.smile`, `soften`, `eyeShell` | The face rules give a happy face: round eye patches, a thin smile line with the corners up, and no brow crease. |
| Tail, ears, jaw | `tail_tip`, `studio.tailCurl`, `studio.tailBind`, `tailBall`, `earFlap`, `noseFront`, `earBase`, `weights.jaw` | A tail lies on the seat or the floor, or hangs behind the chair. A trunk or a hanging ear follows the head. A beak opens. |

**Arms.** The plane of the arm sets the roll of the upper arm. A hold with the elbow out and
level rolls it far, and the linear blend at the shoulder then twists the skin and squeezes the
upper arm flat. A body can take a twist bone of each upper arm (`upperTwist`), or the bones of a
rigger on each arm (`armSegments`): 4 deform segments on the upper arm and on the forearm, and a
helper bone at the elbow and at the wrist. Each segment takes its share of the roll, and each
helper turns halfway across its joint. The arms of a body with segments are quad tubes that a
script of `tools/blender/` builds on the arms of the mesh, with weights from Blender. The bind
paw sets the zero of the twist from the forearm to the paw, so the rig turns the bind paw toward
supination where a hold supinates far (`studio.bindSupination`). The rest and the play then lie
on one side of 180°.

**Arm gate.** A fold count does not see a twisted or a flat arm, and a goal on one measure can
move a twist to a joint that no goal measures. So `pnpm arm-check` reads the folds, the skin
twist, the flat share, the paw turn, the stretch, and the wrist turn rate of each arm against one
table of limits (`ARM_LIMITS` of `tools/arm-check.ts`). Each change of a pose, a hold, or a body
runs it.

### Scale

The scale keeps a landmark that the scene depends on (`ANIMALS`): the shoulders of the bear for
the conductor stand, and the shoulders, the ear tips, or the head top at the size that the user
chose for each other body. A longer leg raises the landmark by the same height, so the trunk,
the head, and the arms keep their size in meters.

### Seat

- A seated role binds its mesh seated. The export puts the soles on the floor and the haunch on
  the seat of the app. The chair fits the body: it takes its height, depth, width, and the room
  behind the back from the body (`StudioBody.seatHeight`, `chairDepth`, `chairWidth`,
  `backRoom`), so the feet touch the floor (4.5, props).
- The seat of each chair is level. It ends where the thighs leave it at the haunch
  (`chair.front`), so that the haunch rests on it.
- The polar bear sits on a piano bench that fits its haunch and its legs (`StudioBody.benchDepth`,
  `benchFitOf()` of `tools/studio-body.ts`). Its thighs slope a little down to vertical shins and
  flat feet, as a real pianist sits. Its legs keep the length of the mesh, so that the body keeps
  the part ratios of the mesh, and the bench is as low as the legs need.
- The deer sits on the stool of the harp, with its whole haunch on the seat.
- The mouse, the beaver, and the monkey have no chair (`noChair`). Each keeps its seated pose at
  the seat height of its legs, with its feet on the floor. The monkey has short legs under a
  large head, so its thighs slope steeply down, its feet stand under its hips, and its trunk
  leans forward with the head level. Thus its center of mass stays over its soles.
- The hippo stands at its contrabass, the elephant at its timpani, the badger at each percussion
  instrument, the rhino at its tuba, and the penguin on its riser, each in the standing pose of
  its mesh. The rhino stands as a real tubist on a strap does. Each center of mass lies inside
  the support area of the soles.
- A seated body that also stands (`soloist` of `ANIMALS`) keeps the leg shapes and the turns of
  its sheet pose, and `standingBody()` of `models/studio-rig.ts` stands it within 1 mm of the
  source.

### Retarget and render

- **Retarget.** The app keeps its own motion (5.3, 5.4), so it drives the studio bones from the
  pose of the player in each frame. The skeleton of the player has the joints of the studio, with
  each arm straight down, because the pose code reads a hanging arm in the bind pose (4.7, 5.2).
  `poseStudioBones()` bends each arm at the elbow axis of the studio. Each paw turns toward the
  forearm up to `PAW_TURN`, because the skin of the studio bends well only near its clips. A pose
  can give the left paw its own turn (`pawTurnL`) or keep a share of the bend of the right paw
  (`pawKeepR`) (5.2, 5.3). Each shape takes its weight from the pose alone (`raiseWeight()`), so
  the rule of stateless poses holds.
- **Render.** The scene draws the body with four bones for each vertex and the shapes as morph
  targets. The colors hold the baked occlusion of the rig. The fur gets smooth normals within the
  crease angle of the body (`crease` of `ANIMALS`, `studioNormals()`). The bears take a larger
  angle and a color blend at each vertex (`colorBlend`), so their fur looks round with soft
  facets, and the edges of the muzzle, the brows, and the claws stay sharp. The penguin takes a
  large angle and a blend too, so that its sides look round. The other bodies share one angle.
- **Bind mesh.** `buildStudioBody()` gives the mesh in the bind pose of the player, with two
  bones for each corner, for the footprints, the budgets, and the tests. The sweep of each role
  (9.3) keeps the parts out of the body and the instrument.

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
images. The bowed strings are varnished wood with a lighter arched top and darker edges. Their four
strings are separate thin rods of a dull gray: they show as fine lines over the black fingerboard,
with no light bar. The clarinet is black lacquer with silver keys, the flutes
are silver, and the brass is gold with open bells that show the lit inside of the flare. The
timpani are copper. The piano is black lacquer with a dark well and a dark gold plate inside its
open case (`PIANO_INSIDE` of `models/instruments/piano.ts`). Its three pedals are brass, as the
pedals of a real grand piano.

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
`scene/beam.ts` and `models/beam.ts` the visible beams and the places of the key light and the rim
lights, and `scene/solo-light.ts` the light of a solo.

```text
          rim light (behind, high, no shadow) ── visible beam in the haze
                          │
   back   ┌───────────────v───────────────┐
          │        players: lit rims      │  shadows fall to the back right
          │     ◄ side light  side light ►│  (weak cross lights)
   front  └───────────────────────────────┘
                    ^
                    │ key light (front left, high, the only shadow)
                 audience and default camera
```

- **Key light** (`KEY_PLACE` of `models/beam.ts`, user, 2026-10-27). One warm `SpotLight` far in
  front of the stage, high over the audience and to the left, is the key light, and the only
  light that casts shadows on the stage. It acts as the front light of a concert hall: it lights
  the faces, and the shadows of the players fall to the back right, parallel (user, 2026-10-27:
  "make the key light go from front to back"). It stands to one side of the camera axis, so each
  body keeps a lit side and a shade side, and the default view and a view from the front right
  see the shadows beside the players. A front light lights the fronts by the cosine of its
  elevation, so a high light keeps the white fur below the shoulder of the tone curve. Its soft
  penumbra keeps the stage edges darker than the pool, as in `mockup.png`. Its intensity grows
  with the square of the distance to the aim point, so each stage size gets the same light. A
  low, nearly neutral fill keeps the shadows deep, and one weak light shows the face of the
  conductor.
- **Rim lights** (`RIM_LIGHT`, `RIM_PLACE`, user, 2026-10-27). Warm spotlights far behind the
  orchestra and high, as the back lights on a truss of a concert film, light the heads and the
  shoulders from behind, so the players stand out of the dark hall. They also give the floor of
  the pool a part of its light. They cast no shadow, so the shadows keep one direction. They give
  diffuse light only, and the vertex shaders of the players, the props, and the stage calculate
  it (`scene/rim-light.ts`), because a spotlight of three.js, and the same term for each pixel,
  cost GPU time on each lit pixel (9.7). Each rim
  light has a visible beam, because haze scatters most light forward: a beam shows when it shines
  toward the camera, and a beam of the key light would show only as a thin fog over the players.
  The default has one rim light on the stage axis, as the one beam of the reference images.
- **Side lights** (`SIDE_LIGHT`, user, 2026-10-18). Two high spotlights at the front corners are
  weak cross lights beside the key light. The narrow cone of each one holds only the section on
  the far side, so the key light keeps the lit side of each body. They cast the shadows of the
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
  The key light and the rim lights stay orange, because they give the amber of the floor and the
  warm rims.
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
  stays dark. A hot spot brightens the key light around the podium. On the players and the
  props, it holds only the podium, as a special on the conductor, because the key light from the
  front made the white fur of the front rows clip in close shots. On the stage, it gives the floor
  around the podium the bright pool of `orchestra-latest.png`. A solo has a weaker hot spot of its
  own (`SOLO_LIGHT`), because the soloed players stand at its center.
- The visible beam (`BEAM_LOOK`) is haze in a narrower cone than its rim light, because haze in
  the full cone veiled the orchestra. The beam comes from its rim light, so the light has a
  visible source: the haze cone leans from its foot toward the rim light, and its tip stands low
  on that line (`hazeTip()`). The default view then sees the narrow top of the cone, and the beam
  opens as a fan toward the stage, as in `orchestra-latest.png`. Each rim light stands at the x of
  its beam, so the beam stands upright in the frontal view (user, 2026-10-18). A row of rim
  lights gives a row of beams (`RIM_PLACE.count`). The shot planner keeps its own
  upright cone around the stage center (`insideBeam()`, 5.6), which holds the haze near the
  stage. The beam fades toward the stage with no edge. A depth pass
  (`BeamDepth`) gives no haze to an item on the stage, so the beam shows between the players
  (user, 2026-10-06). The camera dims the beam in a close shot (`shots/beam-opacity.ts`, 5.6),
  because the additive beam washed out the image. Dust motes drift in the haze by the tier.
- **Shot light** (`scene/shot-light.ts`, 5.6). A close shot adds a soft key 35° from the axis of
  the camera toward the stage key light, so the lit side of the subject faces away from its
  shadow, and a kicker behind the subject on the side of the nearer stage light (`shotRig()`),
  with a little more exposure and a stronger vignette. The soft key and the extra exposure fill
  only the part of the subject that the camera sees in the shade of the stage key light
  (`shadeShare()`). The key light stands in front of the stage, so the cameras of most close shots
  see the lit side, and more light on that side made the light fur clip. The lamps are a diffuse
  term in the material of the players and the props, which runs only while a lamp has light,
  because two spotlights cost each lit pixel of the scene in each shot (9.7). The subject then
  reads as in the close shots of `scene.png`, and the wide shots keep the light of the stage.
- **Room haze** (`ROOM_HAZE`, final pass). Thin warm air starts behind the point that the camera
  looks at and grows with the distance, brighter toward the rim light behind the stage, because
  haze scatters most light forward. The polished hall floor shows the gloss of the same light
  (`HALL_FLOOR`). The back rows and the hall
  get an aerial depth, and the beam stands in air, as in `orchestra-latest.png`. The stage in
  front of the subject gets no haze, so no player is veiled, and the black point stays. The depth
  pass of the beam has no hall, so the haze takes the distance to the hall floor for its pixels.
- **Solo light** (`soloAim()`, user, 2026-10-07). When the user solos seats (2.4, 6.6), the key
  light, its pool, the beams, and their rim lights turn to the soloed players, and ease back after
  the solo. The aim
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
near the title of the first screen (2.8), and the user removed them (2026-10-27). Each lamp has a soft glow disc (`createGlows()`). The
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
  5.6 look at the same target, and Free mode turns around it (2.5). The view looks down a little
  less steeply than `orchestra-latest.png`. This product choice wins over the image, and the full
  stage still shows.
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
  file has a budget of 5,600 faces, so that a thick arm can take a round tube and a round shoulder of its own (the
  user, 2026-10-22: "do not worry about triangle budget"). The rabbit and the red fox play in the violin sections, the
  cat in the violas, the dog in the cellos, the tan fox in the flutes, the mouse in the oboes, the
  beaver in the bassoons, the wolf in the clarinets, the monkey in the trumpets, the panda in the
  trombones, the pig in the horns, the hippo in the contrabasses, the elephant at the timpani, the
  badger in the percussion, the rhino at the tuba, the deer at the harp, the penguin in the
  choir, the polar bear at the piano, and the bear on the podium, so many
  studio bodies share the scene. The mesh of the bear keeps its 3,142 triangles, as the user gave
  it. The polar bear has 4,142: the faces of the user, with quad tubes on the arms. The pea eyes add their triangles to a studio body
  (`docs/decisions/2026-10-15-pea-eyes.md`).
- An instrument has at most 800 triangles, except the four bowed strings with their bows and
  the timpani (1,200), and the piano (2,000). A
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
- A player in a row behind a piano case keeps a larger gap from the case (`PIANO_REACH_GAP` of
  `models/layout-scene.ts`), also in the spread. A footprint is the bind pose, and a player behind
  the case faces it and reaches toward it in play. Thus a contrabass of a continuo group stands
  near the case, with a clear gap. The players in front of the case face away from it and keep
  0.05 m.
- Riser level `k` of the choir has the radius `r + 0.8 × k` and the height `1.0 + 0.25 × k`, where
  `r` is 1.2 m more than the radius of the last instrumental row, so that the back row hides no
  singer (4.2). The layout keeps the count of levels with the smallest stage, then widens the
  levels (`widenRisers()`). The vocal soloists of 3.8 stand alone on level 0.
- After the stage size, each instrumental row spreads to the side edges, because the packed rows
  left the front corners empty. Each side takes the largest factor of its arcs (`SpreadLimits`)
  that keeps each footprint 0.3 m inside the stage (`boxOnStage()`) and its gap from the other
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
height, in the bind pose, and the box of its seat. A piece with its own footprint corners counts
them in place of its parts (`InstrumentPiece.footprint`): the bowed strings and their bows count
a simple box model, so that the detail of their models does not move the seats. The overlap test of `models/` places the
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
| contrabass                                       | the cello at 1.6 scale, with the body form of a double bass and machine heads          | at the left side, leaned to the left of the head, bow in the right hand                        | stands                                     |
| harp                                             | concert harp, or a smaller harp (`harpScale`)                                          | leaned back onto the right shoulder, both hands on the strings                                 | stool                                      |
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
animals of the reference image. A species can play a smaller violin, viola, cello, contrabass,
oboe, bassoon, trumpet, or harp (`SpeciesParams.violinScale`, `violaScale`, `celloScale`,
`bassScale`, `oboeScale`, `bassoonScale`, `trumpetScale`, `harpScale`), as a child plays a
fractional size or a small lever harp. Violas have no fixed size: a shop sizes a viola by the
length of its body (`docs/reference/string-technique.md`, section 1.10). One list names these instruments (`SCALED_INSTRUMENTS`), so that the
typecheck stops a new scale that a reader of the scales misses. A smaller oboe or bassoon shrinks toward the tip of the reed, so the reed
stays in the mouth, and a smaller trumpet shrinks toward its mouthpiece. A smaller harp shrinks
toward its base on the floor, with its distance in front of the player. A
smaller cello has a longer end pin, and the contrabass keeps a short end pin at each size, because
its hold moves it to the body (`endPinLength()`). A violin shop sizes a violin so that, with the left
arm extended, the scroll lies in the middle of the palm (`pnpm hold-reach`). The user chose the
instrument sizes and the arms of the mesh bodies, and the holds fit them. The rabbit plays a
violin of 0.83, because the user asked for only a little stretch of the long arm faces of its mesh
(`docs/decisions/2026-10-23-rabbit-arms.md`). The red fox plays almost the violin of the app. Its
arms are shorter than the rule needs, so its hold puts the violin nearer to the neck, and the left
paw still reaches the nut (5.3). The cat plays a small viola for its shorter arms, as a size chart
pairs a viola with an arm, and its hold puts it near the neck
(`docs/decisions/2026-10-27-cat-fox2.md`). The dog plays a 1/2 cello, and its
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
muzzle and the shoulders turn forward, and each palm reaches its grip of the clarinet in the play
and in the rest (5.3, `docs/decisions/2026-10-20-mesh-wolf.md`).
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
The deer plays a smaller harp (`harpScale`), the size of a lever harp, with longer arms, the
choice of the manager while the user slept. As a harpist sits, the harp leans back, and the top
of its soundbox rests on the front of the right shoulder (`HARP_PLACE`,
`docs/reference/harp-technique.md`). The deer has short legs, so the harp stands on a box, as a
harpist puts a short lever harp on a box or a stool. The knees of the deer lie under its round
belly, so the base stands between the knees in the front view, in front of them. The neck of the
harp passes below the muzzle, and each palm reaches the string of each note (5.3,
`docs/decisions/2026-10-21-mesh-deer.md`, `docs/decisions/2026-10-25-harp-lean.md`).
The penguin keeps the flippers of its mesh, and its round belly stands far in front of its
shoulders, so the choir folder comes to the flippers: it hangs higher than in the reference images,
in front of the chest, and its covers are a little wider, so that each palm reaches its grip at
each note and the upper flippers keep off the sides of the body (`CHOIR_FOLDER`,
`docs/decisions/2026-10-21-mesh-penguin.md`).
The badger keeps the short arms of its mesh, so its drums and the tambourine stand nearer to it,
and its paws reach each strike of the bass drum, the snare drum, the triangle, and the tambourine
(`BASS_DRUM`, `SNARE_DRUM`, `TAMBOURINE`). The bass drum and its beater take the scale of the
badger: a concert drum of 36 by 16 inches and a concert beater of 419 mm, times the head top of the
badger over the mean height of an adult (`docs/decisions/2026-10-27-badger-beater.md`). Its arms
do not hold hand cymbals of a real size out of
its round body, so it plays a suspended cymbal on a stand in front of it, as an orchestra plays a
part "with mallet" (`SpeciesParams.cymbalForm`, `SUSPENDED_CYMBAL`,
`docs/decisions/2026-10-20-badger-cymbals.md`). Its arms do not reach the outer bars of the
xylophone of the app, so the xylophone stays open for a choice of the user
(`docs/decisions/2026-10-20-mesh-badger.md`). A species can also play smaller hand cymbals
(`SpeciesParams.cymbalScale`).
The bear keeps the arms of its mesh (reach 0.40 m) and the baton of the app (0.51 m). The baton lies
along its index finger, and the tip of beat 1 stands in front of the right shoulder, so that the
wrist stays near the chin (5.4, `docs/decisions/2026-10-22-studio-bears.md`).
The round belly of the polar bear stands in front of its short arms, so the keys stand in front
of the belly, and each paw reaches the key of each note (5.3,
`docs/decisions/2026-10-14-polar-fix.md`). The keys stand near the bear, so that its right foot
reaches the damper pedal and pulls the haunch little into the bench
(`docs/decisions/2026-10-29-polar-ratio.md`).
The chairs, the stands,
and the podium keep their sizes in meters.

**Bowed strings**

The violin, the viola, the cello, and the contrabass are low-poly copies of real instruments with
large flat facets (`models/instruments/strings.ts`). The body outline has four corners at the
C-bouts, and its edges stand out over the ribs with a darker wood color. The top has two S-shaped
f-holes. A round neck with a heel holds a tapered fingerboard, and the pegbox ends in a spiral
scroll with four pegs. A tapered tailpiece, a shaped bridge, and four separate strings are on the
top. The violin and the viola have a cupped chin rest.

The contrabass has the sloped shoulders, the flat back with a break near the neck, and the brass
machine heads of a real double bass. The bow has a tapered stick with a camber, a head, a frog
with a ferrule and an eye, a screw button, and a flat ribbon of hair. The research report
`docs/research/2026-10-29-string-models.md` gives the real proportions.

The strings of the model stay at one height over the whole length, because the holds and the play
targets read that height (`VIOLIN`). So the fingerboard stands higher above the top, and the neck
is deeper than on a real violin. The board keeps the height and the end thickness of the earlier
box board, because the left paw of the hippo passes through it in a high position. For the same
reason, the neck under the first positions is open below the board, and two thin side walls close
it (`NECK_OPEN`). The layout reads a simple box model of each bowed string and its bow in place of
the detailed model (`addLayoutSpace()`, seat geometry in 4.5), so the seats stay where they were.

**Sizes and holds**

The hold gives the place of each piece in the bind pose of 4.7, in the axes of the model: the
player faces -z, and its left is -x. An offset in `H` uses the head height of the player. The code
of each instrument (`models/instruments/`) holds its sizes and the offsets of its hold.

| Instrument                       | Model                                                                                                                   | Hold in the bind pose                                                                                                                                                                                                       |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Violin                           | An arched body with corners and f-holes, a neck, a scroll with pegs, a bridge, a chin rest, four strings, and a bow.    | Under the chin on the left shoulder, the top plate turned to the audience. The bow stick lies in the fingers of the hanging right hand, or through the closed paw of a species with its own grip (`SpeciesParams.bowGrip`). |
| Viola                            | The violin at 1.15 scale.                                                                                               | As the violin.                                                                                                                                                                                                              |
| Cello                            | The violin form with an end pin and no chin rest, and a bow.                                                            | The end pin in front of the seat. The cello leans back to the chest, with the neck left of the head, as in `animals.webp`.                                                                                                  |
| Contrabass                       | The cello at 1.6 scale, with sloped shoulders, a flat back, and machine heads.                                          | At the left side, in front of the seat.                                                                                                                                                                                     |
| Harp                             | 24 strings that show the 47 strings of a concert harp. A box under the base when the harp stands high (`HARP_STAND`).   | Leaned back, with the top of the soundbox on the right shoulder, turned so that the column goes to the front left (`HARP_PLACE`).                                                                                           |
| Piano                            | A case with an open lid, 88 separate keys, and a desk, larger than a real grand piano (`PIANO_SCALE`), so that the keys stand a little below the elbows of the large polar bear (5.3). The lid opens less than in `mockup.png`. A lyre comes down from the case under the keys to a box just above the floor, and three pedals come out of the box toward the player: the soft pedal, the sostenuto, and the damper pedal, in the sizes of a real grand piano (`PIANO_PEDALS`). Each key goes down with its notes (5.3): it turns around a line under the balance rail behind the fallboard, so the front of a white key goes down by the key dip of a real grand piano and its back less (`PIANO.keyDip`, `PIANO.balanceRail`). The key bed shows through a narrow gap between the white keys. | The keys stand in front of the floor point of the pianist (`PIANO_FRONT_H`), clear of the belly and the muzzle of the polar bear (5.3). |
| Piano bench                      | A padded seat with round top edges on an apron and four tapered legs with brass feet, as the bench of `polar-bear-views.png` (`PIANO_BENCH`). Under a studio body, it fits the legs and the haunch (4.4, seat). | A static prop under the pianist.                                                                                                                                                                                            |
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
| Bass drum, snare drum, xylophone | Drums on stands, and 30 bars from C5 to F7, smaller than real bars (`XYLOPHONE`).                                       | In front of the player, below the shoulders of the badger, within the reach of its short arms where they reach.                                                                                                             |
| Cymbals, small percussion        | Two crash cymbals, or one suspended cymbal level on a stand with two yarn mallets. A triangle and a tambourine.         | The crash cymbals in the hands, above the floor. The suspended cymbal in front of the player, below its wrists. The beater strikes the tambourine for key 54.                                                               |
| Baton                            | A straight white stick that tapers to the tip (user, 2026-10-13).                                                       | In the right hand, along the index finger, with its grip in the palm.                                                                                                                                                       |

In the bind pose, each mallet, stick, beater, and the triangle lies in the hanging hand in front
of the palm, and points forward. The baton lies along the fingers, 15° toward the thumb, because
a conductor holds it along the index finger with its grip in the palm, so that it extends the hand
(`BATON_ALONG`, `docs/research/2026-10-22-mesh-bear.md`). The timpani mallets, the snare sticks, the
xylophone mallets, the bass drum beater, and the triangle beater slant down toward the line of the
forearm, as a real player holds the shaft along the thumb (`malletTilt` of `TIMPANI`,
`SNARE_DRUM`, `XYLOPHONE`, `BASS_DRUM`, and `TRIANGLE`). No vertex of a player model is below the floor.

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
  of the `slide` bone, `AnimalPose.slideOffset` (5.1). The damper pedal of the piano is a second
  piece on the `slide` bone too, and goes down under the right foot of the pianist (5.3).
- The piano keys are parts of the `instrument` piece, in one run in MIDI order. A bone for each
  key would add 88 bones to each pianist, so `PlayerModel.keys` gives the corners of each key, and
  the scene turns them in the positions of the mesh (`applyKeys()` of `scene/player.ts`) by the
  levels of `AnimalPose.keys`. Thus each pianist has positions of its own, and shares the other
  attributes of its geometry with the pianists of its model.

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
  the beaver, the wolf, and the monkey), the jaw of a beak that opens (`jaw`: the penguin), and
  the arm segments and helpers (`ARM_SEGMENT_BONES`: the polar bear, the rabbit, the mouse, the
  wolf, the cat, the elephant, the two foxes, and the hippo, 4.4).
  The optional bones come after the other bones, so that a new one keeps each other index. The rabbit, the panda,
  the hippo, the pig, the badger, the rhino, the deer, and the penguin have a tail
  ball on one tail bone, with no tip, and so do the bear and the polar bear. Each vertex follows up to four of them. The
  scene gives the mesh the studio bones and the bones of the player, and `poseStudioBones()`
  writes their matrices from the pose of the player. So the pose code drives a studio body as
  each other body. A pose also holds the matrices of the twist bones of the upper arms
  (`UPPER_TWIST_BONES`), after the bones of the player. Only a body with `upperTwist` (4.4), the
  pig and the rhino, puts weight on them: each one turns with its upper arm, less the rest of the roll from the chest.
- The arm segments of a body with them take the skin of the arms. `poseArm()` writes each segment
  from the turns of its arm, around the joint at the start of its part: the shoulder for the upper
  arm, the elbow for the forearm and the elbow helper, and the wrist for the wrist helper. The
  readers of the bind mesh read the upper arm or the forearm of the player for them
  (`STUDIO_FOLLOWS`).
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
  ears, the eyes, and the tail. The right leg of a pianist on the damper pedal and the legs of a
  side move of the hips turn (5.3), and the feet then stay on the floor.
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
