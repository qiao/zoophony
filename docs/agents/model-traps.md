# Traps of route 3

This module of `AGENTS.md` lists the traps of route 3 of [`model-work.md`](model-work.md). Each trap
cost a round of the rabbit, the foxes, the cat, the dog, or the bears. Read the group of your work
before you plan it. A research folder of `docs/research/` that a trap names holds its probe.

## Retarget and holds

- The hands of the player turn freely at the wrist, but the studio skin bends well only near its
  clips. The retarget turns each paw in the plane of its palm toward the forearm (`PAW_TURN`).
- A role whose instrument moves, such as the violin to its rest place, needs the offsets of the
  pose in `poseStudioBones()`.
- The holds are in head heights, and the baton keeps its length. A smaller head moves the wrist
  down and back along the baton, so set the point of the baton from the wrist that you want.
- A long muzzle turns into the paws when the head turns to a section. A round belly takes the room
  of the forearms: the pianist needed the keys further in front, a lean, a reach limit for each
  paw, and a curved path from the knees to the keys.
- A hold can trade the folds against the clearance. Count the folds of each hold change in memory
  (`docs/research/2026-10-14-fox-rig/fold-set.ts`), and check each candidate with
  `pnpm pose-depth --set` before you write it.
- A deeper trunk takes the room of the elbows of a hold. Run `pnpm hold-fit <role> --base main`
  after a change of the girth, and point the elbows out (`poleL`, `restPoleL`).

## Reach and rest of the instrument

- Short arms do not reach the instrument of the app. Size the instrument by the rule of real
  players, and keep the limbs of the body (user rule of 2026-10-10). Make the arms longer only when
  the user asks. When the user sets the size of an instrument (`SpeciesParams.violinScale`), the
  size stays, and the hold moves the instrument until the paws reach it.
- The arm factor of a reach follows the hold: each change of the place of the cello of the dog
  cost a new rig. Fit the hold with the arms of a first factor, measure the reach
  (`docs/research/2026-10-17-dog-mesh/cello-reach.ts`), and rig the final factor once.
- A reach factor far above the text of the option that the user chose goes back to the user
  before the merge. The dog got the arm factor 1.75 for "about 1.4x", and the user called the arms
  much too long.
- A round belly can cover short thighs, so a lap place lands on the belly. `lapPoint()` also
  takes the skin of the hips and the spine, so near the hip it is the side of the belly. Measure
  the reach from the shoulder joint to the top of the thigh before a scan of a lap place
  (`thigh-reach.ts` of `docs/research/2026-10-17-tan-rest/`).
- The rabbit and the red fox rest as a seated violinist: the violin upright on the left thigh, and
  the bow upright at the right side. A paw that cannot reach the thigh holds the frog at the outer
  side of the thigh or of the knee. A paw on the belly bends the arm out and folds its faces.
- A paw that hangs beside the haunch puts the depth at the inner elbow and the armpit.
  `left-rest.ts` of `docs/research/2026-10-17-tan-rest/` gives the free left arm of each variant.
- The rest columns of `pnpm hold-fit` give the reach of a free paw only. Run `pnpm hold-reach`
  after each change of a rest place of a held instrument, because a grip that the paw cannot reach
  shows only there.
- A steeper slope of the thighs moves a lap place near the knee off the lap. Fit the lap places
  again after a change of `studio.legTurns`.
- A bow that rests upright and plays across the strings turns its tip from up to the left. A
  direct mix of the two bows turns the tip through the head. A via of the rest bow (`BowVia` of
  `pose/bowed-rig.ts`) turns the tip through the front.

## Bow grip

- The middle of a turned paw moves on an arc around the wrist, so a bow stick across the palm
  leaves the paw. Put the stick along the line nearest to that arc (`SpeciesParams.bowGrip`), and
  read the grip with `stickGrip()` of `tools/bow-grip.ts`. Then read the depths of the bow arm and
  the folds of the right forearm.
- The place of the grip along the stick moves the wrist and twists the upper arm. Scan the place
  with the folds (`grip-cands.ts` and `fold-scan.ts` of `docs/research/2026-10-17-grip-all/`), and
  move each rest grip by the move of the hand on the bow.
- The paw of a mesh with a long wrist, such as the red fox, is not rigid: the skin of the wrist
  moved the middle of the paw by up to 3.8 cm. A bent wrist moves it most, as in pizzicato. Read
  the gap of each sample in order (`gap-seq.ts`), and turn the bow of that moment
  (`pizzicatoTip`).

## Clearance measures

- The sweep measures a part by the corners of its triangles, so the middle of a long box, such as
  the stick of a bow, can go into the body with no depth. The rest columns of `pnpm hold-fit` take
  a point at each 1 cm along the bow (`bowPoints()` of `tools/lap-rest.ts`).
- The depth of an open part is false near its open edge. Measure in a closed part
  (`closedPart()` with the count of its open loops), as the sweep does. Each open edge of a mesh,
  such as a whisker or a cut to an arm, opens a loop. Give the role its own count, and check that
  each extra loop is small.
- A cap closes a cut with a fan from its middle. A point of an upper arm near a long cut has its
  depth to the cap, so read such depths as depths behind the cap.

## Weights, rings, and folds

- Bone heat gives a part of the arm weight to the side of the trunk when the arm hangs near it.
  The raised bind arms then drag the trunk and fold the shoulder. Keep the arm weights on the free
  arm (`armSplit` of the rig config).
- Bone heat gives the top of a narrow shoulder next to a thin neck to the upper arm, as on the cat.
  Fade the upper arm weight over the top of the shoulder toward the clavicle (`shoulderRamp`).
- Bone heat can give one corner of a small face a bone that the bow arm turns far, such as the
  right clavicle. Read the weights of the corners of the faces that fold most before a ring or a
  smoothing (`pnpm fold-probe --faces`). For the fox, `clavicleFrom` and `armTop` helped, and a
  smoothing of the shoulder weights folded more faces.
- A mesh of an image model has many thin faces. A thin face with corners of different weights
  turns over at a bent joint. The `sliver` and `line` rules remove some folds. Read
  `pnpm fold-probe` after each change of a hold, because a more bent elbow folds more faces.
- A long thin face across a joint of an arm folds, and weight rules make it worse. A ring of new
  vertices at the joint fixes it (`refine.rings`). Put a ring only where `pnpm fold-probe` finds
  folds, and run `pnpm pose-depth <role>` after it: a ring can pull the inner elbow into the
  trunk, and a ring near a paw with thin faces, as on the dog, can add faces that fold.
- A ring reaches a fixed distance, so longer arms can put the corners of long faces beyond it.
  Give the ring a larger radius. The upper arm stretches only on the free arm and from the
  shoulder joint out (`outward_stretch()` of `tools/blender/rig_mesh.py`).

## Corrective shapes

- A face that folds in one region of the poses of an arm needs a corrective shape when no weight
  rule or ring removes the fold (`raise` of the rig config). The whole turn of the upper arm finds
  the region (`docs/research/2026-10-15-fox-rig2/arm-dirs.ts` and `raise-turn.py`). A rule that
  relaxes more faces (`raise.below`) folds more play samples.
- A face across a joint folds by the turn of the two bones of that joint. Probe each key before a
  rule: the upper arm, the forearm from the upper arm (`raise.bone` `forearm`), and the paw from
  the forearm (`raise.bone` `hand`), with `arm-turn.ts` and `fold-keys.ts` of
  `docs/research/2026-10-17-multi-shape/`.
- The pose of a rule in Blender turns over fewer faces than the app at the same turn. Turn the rule
  further on the same axis, and read the folded face-samples in the line of the main bones of
  `pnpm rig-mesh --check`.
- A shape fixes only the poses near its rule, and fits the arm turns of one hold. Fit the hold
  first, or fit the hold and the shapes in one loop. Read the line `raise <target>: ... faces turn
  over before and ... after` of the rig log: a rule with faces turned over after the relax fixes
  few samples.
- The shape of a raised arm relaxes only the clavicle and the upper arm. `raise.grow` adds rings of
  trunk corners for a long face from the trunk under the armpit (`arm-dirs.ts` and `rest-turn.py`
  of `docs/research/2026-10-17-rabbit-pose/`). Keep the fade away from the turns of the play.
- A shorter neck (`neckFactor`) moves the top of the shoulder down, and the shape of a raised arm
  can turn its faces over. Keep the count of the line `raise R` of the rig log at 0
  (`raise.below`, `raise.fade`). An instrument that hangs from the head center goes down with the
  head, so fit its play place again.
- A turn of the trunk in the seated bind (`studio.trunk`) gives the standing body two blends. The
  export writes the arm turns of the clip (`StudioStanding.armTurns`), and
  `standingArmCorrectives()` solves the arm shapes again. `pnpm rig-mesh --check` prints the worst
  standing vertex.

## Form, seat, and tail

- A long thigh needs a seat of its own (`studio.legTurns`, `weights.haunch`). A large tail needs
  two bones (`tail_tip`).
- A level seat under thighs that slope down meets the thighs before the haunch. End the seat where
  the thighs leave the seat top at the haunch (`chair.front`), and move the back edge of the chair
  forward by the old move (`chair.back`).
- The chair of a rig takes its seat top from the corners of the body, so a long triangle of a
  sloped thigh can go into the seat. `seat-dip.ts` of `docs/research/2026-10-17-fox-form/` finds
  the deepest point.
- The chair of the app grows until its back posts keep 1 cm behind the trunk (`chairDepthOf()` of
  `tools/studio-body.ts`). Only `backRoom` of `ANIMALS` keeps a body off the chair back.
- The root of a tail moves the haunch vertices that set the seat top of the sit. Give the sit a
  fixed seat top (`sit.top`), and count the root vertices as the haunch (`sit.root`). A deeper
  haunch needs more rounds of the smoothing of the sit (`sit.smooth`).
- The idle sway turns the tail bones around the vertical (`pose/pose-at.ts`). A seated tail that
  lies on the seat does not sway (`OwnBodyParams.seatedTail`). Measure a seated tail over one sway
  period, 5.5 s.
- Short thighs on a deep trunk end behind the front of the belly. Measure the front of the trunk
  and the knees (`dog-profile.ts` and `cello-contact.ts` of `docs/research/2026-10-17-dog-mesh/`)
  before a plan of the knees or of an instrument between them.
- A big head over a thin neck shows a dark band under the head in the app. Smooth the neck and the
  bottom of the head with a box that ends behind the chin (`smooth`). A box that holds the chin
  moves the head height H and each hold.

## Colors and size of the mesh

- One color for each face gives one palette entry for each face. Measure the parts of the packed
  mesh before you cut one. `src/models/studio-size.test.ts` limits the gzip size.
- The texture of an image mesh has black gaps between its islands. A face takes the mean of its
  samples that are not dark. Read `colors.py` of `docs/research/2026-10-14-rabbit-smooth/` after a
  change of the color rules.

## Probe tools

- `pnpm rig-mesh --check --set` changes only a key that the config has. For a new key, write a
  scratch config, rig it with a direct run of Blender, and count its folds with
  `pnpm fold-probe <role> --glb <file>` (`rig.sh` of `docs/research/2026-10-17-dog-mesh/`).
- The log of `tools/blender/rig_mesh.py` gives centimeters at the scale of `app.shoulders`. A direct
  run of Blender on a variant that moves the shoulder joints needs the `app.shoulders` of
  `keptHeight()`. `pnpm rig-mesh --check --set` sets it.
- A new body changes the footprints, so the layout of a section, the looks of the other players,
  the cues of the conductor, and the shot plans change with it. `pnpm body-probe --base main`
  names them. The shot tests react to moves of about 2 cm: run
  `pnpm test:paused src/shots/` early, and `pnpm shot-trace <demo> --base main` when a shot drops
  out.

## Values in meters

The values of the pose in meters do not change with the size of a body:

- the bow: `freeHair` of each `BowedHold` and `BOW_STEP` (`src/pose/bowed-rig.ts`), `pluckHeight`
  and `pluck` of `BOWED_HANDS` (`src/pose/bowed.ts`), and `lift` and `tremoloAmplitude` of
  `BOW_MOTION` (`src/pose/strokes.ts`);
- the hands and the head: `lift` and `pull` of `HAND_MOTION` (`src/pose/hand-notes.ts`), the
  `sizes` of each hold of `src/pose/percussion-rig.ts`, `scale` of `CONDUCTOR_MOTION`
  (`src/pose/conductor-notes.ts`), and `eyeHeight` of the cues (`src/pose/cues.ts`);
- the sweep: `CONTACT`, the `depth` of each accepted depth, and the `targetError` of each role
  (`src/pose/test-sweep-roles.ts`), `PIANIST_GAP` (`src/pose/test-pianist-clearance.ts`), and
  `GAP` (`src/pose/test-conductor-clearance.ts`).

After a change of the size of a body, compare the folds and the depths in H first, with
`pnpm hold-fit <role> --base main` and `pnpm pose-depth <role> --base main`. Then probe these
values before a fit of a hold.
