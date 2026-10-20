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
  elbows: point them out (`poleL`, `restPoleL`). Compare the arm turns of each pole after a change
  of the head or the girth (`pnpm hold-fit --base main`).

## Reach and rest of the instrument

- Short arms do not reach the instrument of the app. Size the instrument by the rule of real
  players, and keep the limbs (user rule of 2026-10-10) until the user asks for longer arms. A size
  that the user sets (`SpeciesParams.violinScale`) stays, and the hold moves the instrument to the
  paws.
- The arm factor of a reach follows the hold. Fit the hold with a first factor, measure the reach
  (`cello-reach.ts` of `docs/research/2026-10-17-dog-mesh/`), and rig the final factor once. A
  factor far above the option text of the user goes back to the user before the merge.
- A new scale of `SpeciesParams` adds its instrument to `SCALED_INSTRUMENTS` of
  `models/instruments/types.ts`. The typecheck then names each place that must read it.
- A smaller body keeps its instrument in meters, so scan the scale and the hold with `windReach()`
  first (`scan2.ts` of `docs/research/2026-10-19-mouse-size/`). Measure `slideReach` on the new body
  before the user chooses the arms, and turn the slide toward the right shoulder (`slide-hold.ts` of
  `docs/research/2026-10-18-panda-mesh/`).
- A round belly can cover short thighs, and `lapPoint()` also takes the hip and spine skin, so a lap
  place lands on the belly. Measure the reach from the shoulder joint to the thigh top first
  (`thigh-reach.ts` of `docs/research/2026-10-17-tan-rest/`), and fit the lap places again after a
  change of `studio.legTurns`.
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
- The short arms of the elephant do not reach across its trunk, and a third kettle of the real size
  stands behind the shoulder and cuts into the body. Use `PercussionHold.rim`, `sides`, `home`, and
  `pair` with `TIMPANI.side`, and scan them with `pnpm pose-depth --targets`.
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
  (`closedPart()` with its count of open loops). Each whisker or arm cut opens a loop: give the role
  its own count, and check that each extra loop is small.
- A cap closes a cut with a fan from its middle, so the depth of an upper arm point near a long cut
  is a depth behind the cap.
- The pair "instrument in body" of `pnpm pose-depth` gives the deepest corner of the instrument,
  such as the back of a contrabass on the chest. Measure the visible top plate alone
  (`top-plate.ts` of `docs/research/2026-10-19-hippo-chest/`).

## Weights, rings, and folds

- A fold count does not see a skin that twists around the arm or goes flat, because no face turns
  over. Measure the twist, the flat share, and the spikes with `pnpm arm-shape <role>`.
- A lowered elbow drags the thin faces of the trunk under the armpit that bone heat gave arm weight,
  and no shape relaxes them. Give that weight to the trunk below the cut (`weights.armBelow`). A
  reader of the arm weights counts the twist bone of the upper arm (`skinFollows()`).
- When an arm hangs near the trunk, bone heat gives a part of its weight to the trunk side. The
  raised bind arms then drag the trunk and fold the shoulder. Keep the arm weights on the free arm
  (`armSplit`).
- Bone heat gives the top of a narrow shoulder next to a thin neck to the upper arm, as on the cat.
  Fade the upper arm weight over the shoulder top toward the clavicle (`shoulderRamp`).
- Bone heat can give one corner of a small face a bone that the bow arm turns far, such as the right
  clavicle. Read the corner weights of the most folded faces (`pnpm fold-probe --faces`) before a
  ring or a smoothing. On the fox, a smoothing folded more faces.
- An image mesh has many thin faces, and a thin face with corners of different weights turns over at
  a bent joint. The `sliver` and `line` rules remove some folds. `weights.rigid` gives a thin face
  across a joint the mean of its weights, at the source middles of `pnpm fold-probe --faces`. Give
  two thin faces that share corners one item, else the second undoes the first. A body has at most
  four shapes (`RAISE_LIMIT`).
- A raised arm pulls the skin where a hanging arm touches the trunk into long dark faces under the
  armpit. Fades, shapes, splits, and vertex moves keep them dark or fold them. When short or thin
  faces join a hanging arm to the trunk, only a cut at the seam fixes them (`cut`,
  `docs/research/2026-10-18-panda-cut.md`). Give the caps of the arm the normals of the skin
  (`cut.skinNormals`). The light caps of the body keep their own.
- A color measure of a mark counts one range of lightness. Measure the black (Oklab lightness below
  0.3) beside the gray, because a fix of a gray mark can add a black one.
- A fold probe also counts a turned face that no camera sees. Before you accept a fold as hidden,
  count its pixels in a probe build that draws it in a pure color with no light (`hidden/probe.ts`
  of `docs/research/2026-10-18-panda-seam/`).
- A narrow fade of a weight rule under a far bone turn moves the fold to the faces of the fade. Let
  the fade span several rings of faces (`clavicleMiddle`, `armTop` of the hippo). A small change of
  a fade can make the relax of a shape fail (lines `raise` of the rig log).
- A long thin face across an arm joint folds, and weight rules make it worse. A ring of new vertices
  at the joint (`refine.rings`) fixes it, within 3,200 triangles. Put a ring only where `pnpm
  fold-probe` finds folds, and run `pnpm pose-depth <role>`, because a ring can pull the inner elbow
  into the trunk. Longer arms take a larger ring radius (`outward_stretch()`).

## Corrective shapes

- When no weight rule or ring removes a fold in one region of the arm poses, fit a corrective shape
  (`raise`) with `pnpm raise-fit <role> --faces <list> --side <side>`. A rule that relaxes more
  faces (`raise.below`) folds more play samples. Give a rule of a bent elbow the forearm turn alone,
  because the arm turns of the fit can fold the chest.
- A grip far in front of a deep chest can turn the upper arm about 70° at the shoulder, so the
  shoulder front folds past the clavicle, and no shape of `raise` relaxes it. Turn the shoulder bone
  forward with the arm (`WindHold.reachL`), and scan the turn with `pnpm hold-fit --grid`
  (`docs/research/2026-10-18-panda-folds.md`).
- Fit the rule of a fold across a joint on the key of that joint: the upper arm, the forearm
  (`--bone forearm` of `pnpm raise-fit`), or the paw (`--bone hand`). The pose of a rule in Blender
  turns over fewer faces than the app, so `--bone hand` turns the rule further on the same axis.
- A paw that turns about 160° on its forearm folds the wrist. The studio forearm turns in the frame
  of the elbow hinge, so a held part has one direction of no paw twist: measure it (`paw-turn.ts` of
  `docs/research/2026-10-19-elephant-pose/`), and hold the part across the forearm near it
  (`PercussionHold.across`). On the elephant, that direction is level and in, so the head of each
  timpani mallet leaves the back of the fist (`TIMPANI.malletBack`).
- A shape fixes only the poses near its rule, for the arm turns of one hold. `pnpm rig-mesh --check`
  counts the folds with the hold of the working tree, so fit the hold first, or use `--hold
  <changes>`. A rule whose rig log line `raise <target>` keeps turned faces after the relax fixes
  few samples. With a twist bone, give a rule of a bent elbow the paw turn of its samples
  (`turns.hand`), else it turns the inner elbow over.
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
  the thighs leave its top (`chair.front`), move the back edge forward as far (`chair.back`), and
  keep the sit drop small.
- The chair of a rig takes its seat top from the body corners, so a long triangle of a sloped thigh
  can go into the seat (`seat-dip.ts` of `docs/research/2026-10-17-fox-form/`).
- The chair of the app grows until its back posts keep 1 cm behind the trunk (`chairDepthOf()`).
  Only `backRoom` of `ANIMALS` keeps a body off the chair back.
- A tail root moves the haunch vertices that set the seat top of the sit. Give the sit a fixed seat
  top (`sit.top`), and count the root vertices as the haunch (`sit.root`). A deeper haunch needs
  more rounds of smoothing (`sit.smooth`).
- A tail on the floor stays flat with rigid bone turns (`studio.tailBind`). A curve of `tailCurl`
  turns it into a vertical sheet. A tail that is the lowest point of the seated bind sets the seat
  height: turn the tip bone until the rig log line `tail: the lowest point` gives the height of the
  soles.
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
- A face takes black from a third of dark texture samples (`eyeShare`), so a raised arm stretches
  the toothed border of a black region into wedges. Make the faces with a third to a half of dark
  samples light (`colors.border`, `marks.py` of `docs/research/2026-10-18-panda-marks/`).
- With no gloss nose, the export takes the front-most fur vertex of the head near the middle plane
  as the nose tip (`NOSE_PLANE`), and each gloss shell off the plane as an eye. Give a mesh with
  gloss nostrils, as the hippo, no `noseBox`, and read the rig check warning of a tip off the plane.
- A dark rule cannot split an eye from a dark patch of almost its color. A wide eye box takes the
  patch as the eye, and the color of the old eye puts light holes in it. Keep the eye box on the
  eye, and set `eyeShell.darkReach` to 0, as for the panda.
- A face rule that looks right from the front can paint a large face that shows as a dark block from
  the side. Check it from the front, at 60°, and from each side, and limit the normal of its faces
  (`outward` of `colors.smile`).

## Probe tools

- `pnpm rig-mesh --check --set` sets `app.shoulders` from `keptHeight()`. The rig log gives
  centimeters at the scale of `app.shoulders`, so a direct run of Blender on a variant that moves
  the shoulder joints needs that value (`rig.sh` of `docs/research/2026-10-17-dog-mesh/`).
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
