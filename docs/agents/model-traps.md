# Traps of route 3

This module of `AGENTS.md` lists the traps of route 3 of [`model-work.md`](model-work.md). Read the
group of your work before you plan it. A probe that a trap names is in its research folder.

## Retarget and holds

- The player hands turn freely at the wrist, but the studio skin bends well only near its clips. The
  retarget turns each paw in the plane of its palm toward the forearm (`PAW_TURN`).
- A role whose instrument moves, such as the violin to its rest place, needs pose offsets in
  `poseStudioBones()`.
- The holds are in head heights, and the baton keeps its length, so a smaller head moves the wrist
  down and back along the baton. Set the baton point from the wrist that you want.
- A long muzzle turns into the paws when the head turns to a section. A round belly takes the room
  of the forearms: the pianist needed the keys further forward, a lean, a reach limit for each paw,
  and a curved path from the knees.
- A hold can trade the folds against the clearance, and a more bent elbow folds more faces. Check
  each hold change with `pnpm hold-fit --set` and `pnpm pose-depth --set` before you write it.
- A big head puts the grips of a hanging instrument at shoulder height, and elbows out and level
  twist the upper arms into bands: point the elbows down. A deeper trunk takes the room of the
  elbows: point them out (`poleL`, `restPoleL`). After a change of the head or the girth, compare
  the arm turns of each pole with `pnpm hold-fit <role> --base main`.

## Reach and rest of the instrument

- Short arms do not reach the instrument of the app. Size the instrument by the rule of real
  players, and keep the limbs (user rule of 2026-10-10) until the user asks for longer arms. A size
  that the user sets (`SpeciesParams.violinScale`) stays, and the hold moves the instrument to the
  paws.
- The arm factor of a reach follows the hold. Fit the hold with a first factor, measure the reach
  (`cello-reach.ts` of `docs/research/2026-10-17-dog-mesh/`), and rig the final factor once. A
  factor far above the option text of the user goes back to the user before the merge (the dog got
  1.75 for "about 1.4x").
- A new scale of `SpeciesParams` adds its instrument to `SCALED_INSTRUMENTS` of
  `models/instruments/types.ts`. The typecheck then names each place that must read it.
- A smaller body keeps its instrument in meters, so the old hold misses the grips: scan the scale
  and the hold with `windReach()` first (`scan2.ts` of `docs/research/2026-10-19-mouse-size/`). A
  reach from another body misses the mouth of a big head. Measure `slideReach` on the new body
  before the user chooses the arms, and turn the slide toward the right shoulder (`slide-hold.ts` of
  `docs/research/2026-10-18-panda-mesh/`).
- A round belly can cover short thighs, and `lapPoint()` also takes the skin of the hips and the
  spine, so a lap place lands on the belly. Measure the reach from the shoulder joint to the thigh
  top before you scan a lap place (`thigh-reach.ts` of `docs/research/2026-10-17-tan-rest/`). A
  steeper thigh slope moves a lap place near the knee off the lap, so fit the lap places again after
  a change of `studio.legTurns`.
- A round belly in front of short arms blocks a floor instrument. Place it by targets: the contact
  point in front of the upper belly, about 0.2 m below the shoulder joints, and the nut within reach
  of the left paw (`bass-solve.py` of `docs/research/2026-10-18-hippo-mesh/`). A smaller instrument
  (`bassScale`) shortens the span.
- A top plate turned to the right sends the bow back into a round belly. Turn it to the front.
- In the violin rest, a paw that cannot reach the thigh holds the frog outside the thigh or the
  knee, because a paw on the belly bends the arm out and folds it.
- A long snout puts the mouthpiece far in front of the body, and the grips hang below it, so a
  smaller instrument barely helps. Turn the instrument back toward the body around the mouthpiece,
  and turn the shoulder forward (`reachL`, `PIG_HORN`).
- The short arms of the elephant do not reach across its trunk or to the middle of a kettle. Use
  `PercussionHold.rim`, `sides`, and `home`, and scan them with `pnpm pose-depth --targets`.
- A paw that hangs beside the haunch puts the depth at the inner elbow and the armpit
  (`left-rest.ts` of `docs/research/2026-10-17-tan-rest/`).
- Read the spare reach of each grip after each move of a rest place of a wind hold. `pnpm hold-fit`
  gives it, also with `--scan`, and a grip below 0 is a missed goal.
- A bow that rests upright and plays across the strings turns its tip from up to the left. A direct
  mix turns the tip through the head, and a via of the rest bow (`BowVia`) through the front.

## Bow grip

- The middle of a turned paw moves on an arc around the wrist, so a bow stick across the palm leaves
  the paw. Put the stick along the line nearest to that arc (`SpeciesParams.bowGrip`,
  `stickGrip()`), then read the bow arm depths and the right forearm folds.
- The grip place along the stick moves the wrist and twists the upper arm. Scan the place with the
  folds (`grip-cands.ts` and `fold-scan.ts` of `docs/research/2026-10-17-grip-all/`), and move each
  rest grip by the move of the hand on the bow.
- On a mesh with a long wrist, such as the red fox, the wrist skin moves the middle of the paw, most
  in pizzicato. Read the gap of each sample in order (`gap-seq.ts`), and turn the bow of that moment
  (`pizzicatoTip`).

## Clearance measures

- The sweep measures a part by its triangle corners, so the middle of a long box, such as a bow
  stick, can go into the body with no depth. The rest columns of `pnpm hold-fit` take a point at
  each 1 cm of the bow (`bowPoints()`).
- A thick arm across the front of a round body goes into the chest: point the elbow out and forward.
  A straight arm keeps its depths for each elbow pole, so turn the shoulder bone forward
  (`BowedHold.reach`), and read the folds of the shoulder and the chest.
- A depth that keeps one value over all variants is half the thickness of the obstacle, because the
  part goes through it. Count the samples over the goal (`left-forearm.ts` of
  `docs/research/2026-10-19-hippo-chest/arms/`).
- The depth of an open part is false near its open edge, so the sweep measures in a closed part
  (`closedPart()` with the count of its open loops). Each open edge, such as a whisker or an arm
  cut, opens a loop: give the role its own count, and check that each extra loop is small.
- A cap closes a cut with a fan from its middle, so the depth of an upper arm point near a long cut
  is a depth behind the cap.
- The pair "instrument in body" of `pnpm pose-depth` gives the deepest corner of the instrument,
  such as the back of a contrabass on the chest. Measure the visible top plate alone
  (`top-plate.ts` of `docs/research/2026-10-19-hippo-chest/`).

## Weights, rings, and folds

- When an arm hangs near the trunk, bone heat gives a part of its weight to the trunk side. The
  raised bind arms then drag the trunk and fold the shoulder. Keep the arm weights on the free arm
  (`armSplit`).
- Bone heat gives the top of a narrow shoulder next to a thin neck to the upper arm, as on the cat.
  Fade the upper arm weight over the shoulder top toward the clavicle (`shoulderRamp`).
- Bone heat can give one corner of a small face a bone that the bow arm turns far, such as the right
  clavicle. Read the corner weights of the most folded faces (`pnpm fold-probe --faces`) before a
  ring or a smoothing. On the fox, `clavicleFrom` and `armTop` helped, and a smoothing folded more
  faces.
- An image mesh has many thin faces, and a thin face with corners of different weights turns over at
  a bent joint. The `sliver` and `line` rules remove some folds, and `weights.rigid` gives a single
  thin face across a joint the mean of its weights (the source middles of `pnpm fold-probe --faces`
  give its points). A body has at most four shapes of `raise` (`RAISE_LIMIT`), so keep them for the
  play.
- A raised arm pulls the skin where a hanging arm touches the trunk into long dark faces under the
  armpit. A fade of the arm weight, a corrective shape, a split, or a move of the vertices keeps
  them dark or folds them. When short or thin faces join a hanging arm to the trunk, only a cut at
  the seam fixes them (`cut`, `docs/research/2026-10-18-panda-cut.md`,
  `2026-10-19-beaver-mesh.md` 4).
- A color measure of a mark counts one range of lightness. Measure the black (Oklab lightness below
  0.3) beside the gray, because a fix of a gray mark can add a black one.
- A fold probe also counts a turned face that no camera sees. Before you accept a fold as hidden,
  count its pixels in a probe build that draws it in a pure color with no light (`hidden/probe.ts`
  of `docs/research/2026-10-18-panda-seam/`).
- A narrow fade of a weight rule under a far bone turn moves the fold to the faces of the fade. Let
  the fade span several rings of faces, as `clavicleMiddle` of the hippo does.
- A mesh near the budget of 3,200 triangles has no room for rings: the hippo has 3,141.
- A long thin face across an arm joint folds, and weight rules make it worse. A ring of new vertices
  at the joint (`refine.rings`) fixes it, after the weight rules. Put a ring only where `pnpm
  fold-probe` finds folds, then run `pnpm pose-depth <role>`, because a ring can pull the inner
  elbow into the trunk or add folds.
- A ring reaches a fixed distance, so longer arms can put the corners of long faces beyond it. Give
  the ring a larger radius. The upper arm stretches only on the free arm and from the shoulder joint
  out (`outward_stretch()` of the rig script).

## Corrective shapes

- A face that folds in one region of the arm poses needs a corrective shape (`raise`) when no weight
  rule or ring removes the fold. Fit it with `pnpm raise-fit <role> --faces <list> --side <side>`. A
  rule that relaxes more faces (`raise.below`) folds more play samples.
- A grip far in front of a deep chest can turn the upper arm about 70° at the shoulder, so the
  shoulder front folds past the clavicle, and no shape of `raise` relaxes it. Turn the shoulder bone
  forward with the arm (`WindHold.reachL`), and scan the turn with `pnpm hold-fit --grid`
  (`docs/research/2026-10-18-panda-folds.md`).
- A face across a joint folds by the turn of the two bones of that joint. Fit the rule on the key of
  that joint: the upper arm, the forearm from the upper arm (`--bone forearm` of `pnpm raise-fit`),
  or the paw from the forearm (`--bone hand`).
- The pose of a rule in Blender turns over fewer faces than the app at the same turn. Turn the rule
  further on the same axis, as `pnpm raise-fit --bone hand` does, and read the folded face-samples
  in the line of the main bones of `pnpm rig-mesh --check`.
- A shape fixes only the poses near its rule, for the arm turns of one hold. `pnpm rig-mesh --check`
  counts the folds with the hold of the working tree, so fit the hold first, or fit both in one loop
  with `--hold <changes>`. A rule whose line `raise <target>` in the rig log keeps turned faces
  after the relax fixes few samples.
- The shape of a raised arm relaxes only the clavicle and the upper arm. `raise.grow` adds rings of
  trunk corners for a long face from the trunk under the armpit (`pnpm raise-fit --sets rest`). Keep
  the fade away from the play turns.
- A shorter neck (`neckFactor`) moves the shoulder top down, and the shape of a raised arm can turn
  its faces over. Keep the count of the rig log line `raise R` at 0 (`raise.below`, `raise.fade`).
  An instrument that hangs from the head center goes down with the head, so fit its play place
  again.
- A trunk turn in the seated bind (`studio.trunk`) gives the standing body two blends. The export
  writes the clip arm turns (`StudioStanding.armTurns`), and `standingArmCorrectives()` solves the
  arm shapes again. `pnpm rig-mesh --check` prints the worst standing vertex.

## Form, seat, and tail

- A long thigh needs a seat of its own (`studio.legTurns`, `weights.haunch`). A large tail needs two
  bones (`tail_tip`).
- Short thighs under a round belly, or thighs that slope down to a level seat, set the seat top
  before the haunch, and the sit pulls the haunch into a sheet behind the seat. End the seat where
  the thighs leave the seat top (`chair.front`), move the chair back edge forward by the same
  distance (`chair.back`), and keep the sit drop small.
- The chair of a rig takes its seat top from the body corners, so a long triangle of a sloped thigh
  can go into the seat (`seat-dip.ts` of `docs/research/2026-10-17-fox-form/`).
- The chair of the app grows until its back posts keep 1 cm behind the trunk (`chairDepthOf()`).
  Only `backRoom` of `ANIMALS` keeps a body off the chair back.
- A tail root moves the haunch vertices that set the seat top of the sit. Give the sit a fixed seat
  top (`sit.top`), and count the root vertices as the haunch (`sit.root`). A deeper haunch needs
  more rounds of smoothing (`sit.smooth`).
- A tail on the floor stays flat with rigid bone turns (`studio.tailBind`), and a curve of
  `tailCurl` turns it into a vertical sheet. When the tail is the lowest point of the seated bind,
  it sets the seat height, and the feet hang above the floor. Turn the tip bone until the rig log
  line `tail: the lowest point` gives the height of the soles.
- The idle sway turns the tail bones around the vertical (`pose/pose-at.ts`). A tail that lies on
  the seat does not sway (`OwnBodyParams.seatedTail`). Measure a seated tail over one sway period,
  5.5 s.
- Short thighs on a deep trunk end behind the belly front. Measure the trunk front and the knees
  (`dog-profile.ts` and `cello-contact.ts` of `docs/research/2026-10-17-dog-mesh/`) before you plan
  the knees or an instrument between them.
- A big head over a thin neck shows a dark band under the head. Smooth the neck and the head bottom
  with a box that ends behind the chin (`smooth`), because a box that holds the chin moves H and
  each hold.
- The elephant trunk takes bone heat from the chest, and it set the chin of the head measures. Use
  `noseFront`, and `headFloor` of `ANIMALS`.
- The tip of `earFlap` takes the nearest vertex, which can lie on the shoulder. Take it from a cut
  of the flap, and read the count of the log line `ear L`.

## Colors and size of the mesh

- One color for each face gives one palette entry for each face. Measure the parts of the packed
  mesh before you cut one. `src/models/studio-size.test.ts` limits the gzip size.
- The texture of an image mesh has black gaps between its islands, so a face takes the mean of its
  light samples. Read `colors.py` of `docs/research/2026-10-14-rabbit-smooth/` after a change of the
  color rules.
- A face takes black from a third of dark texture samples (`eyeShare`), so the large faces of a
  trunk give the border of a black region teeth, which a raised arm stretches into black wedges.
  List the faces with a third to a half of dark samples (`marks.py` of
  `docs/research/2026-10-18-panda-marks/`), and make them light with `colors.border`.
- With no gloss nose, the export takes the front-most fur vertex of the head near the middle plane
  as the nose tip (`NOSE_PLANE`), and each gloss shell out of the middle plane as an eye. Give a
  mesh with gloss nostrils and no nose pad, as the hippo, no `noseBox`, and read the rig check
  warning of a tip off the plane.
- A dark rule cannot split an eye from a dark patch of almost its color. A wide eye box takes the
  patch as the eye, and the color of the old eye puts light holes in it. Keep the eye box on the
  eye, and set `eyeShell.darkReach` to 0, as for the panda.
- A face rule that looks right from the front can paint a large face that shows as a dark block from
  the side. Check it from the front, at 60°, and from each side, and limit the normal of its faces
  (`outward` of `colors.smile`).

## Probe tools

- `pnpm rig-mesh --check --set` changes only a key that the config has, and it sets `app.shoulders`
  from `keptHeight()`. For a new key, rig a scratch config with a direct run of Blender, and count
  its folds with `pnpm fold-probe <role> --glb <file>` (`rig.sh` of
  `docs/research/2026-10-17-dog-mesh/`). The rig log gives centimeters at the scale of
  `app.shoulders`, so a direct run on a variant that moves the shoulder joints needs that value.
- A new body moves the layout and the shot plans. The shot tests react to moves of about 2 cm: run
  `pnpm test:paused src/shots/` early, and `pnpm shot-trace <demo> --base main` when a shot drops
  out.

## Values in meters

The pose values in meters do not change with the body size:

- the bow: `freeHair` of each `BowedHold` and `BOW_STEP` (`src/pose/bowed-rig.ts`), `pluckHeight`
  and `pluck` of `BOWED_HANDS` (`src/pose/bowed.ts`), and `lift` and `tremoloAmplitude` of
  `BOW_MOTION` (`src/pose/strokes.ts`);
- the hands and the head: `lift` and `pull` of `HAND_MOTION` (`src/pose/hand-notes.ts`), the `sizes`
  of each hold of `src/pose/percussion-rig.ts`, `scale` of `CONDUCTOR_MOTION`
  (`src/pose/conductor-notes.ts`), and `eyeHeight` of the cues (`src/pose/cues.ts`);
- the sweep: `CONTACT`, the `depth` of each accepted depth, and the `targetError` of each role
  (`src/pose/test-sweep-roles.ts`), `PIANIST_GAP` (`src/pose/test-pianist-clearance.ts`), and `GAP`
  (`src/pose/test-conductor-clearance.ts`).

After a change of the body size, compare the folds and the depths in H first
(`pnpm hold-fit <role> --base main`, `pnpm pose-depth <role> --base main`), then probe these values
before a hold fit.
