# Traps of route 3

This module of `AGENTS.md` lists the traps of route 3 of [`model-work.md`](model-work.md). Read the
group of your work before you plan it. A probe that a trap names is in its research folder.

## Retarget and holds

- The player hands turn freely at the wrist, but the studio skin bends well only near its clips. The
  retarget turns each paw in the plane of its palm toward the forearm (`PAW_TURN`).
- A carried prop hangs from the paw that the viewer sees, and `PAW_TURN` aligns that paw with the
  forearm, so a forearm across the neck at rest and along it in the play turned the violin 56° to
  79° in the paw. Give the rest paw its own turn (`pawTurnL` of `AnimalPose`) around the wrist, and
  read the grip with `pnpm carry-check`. A turn around the strings bent the rest wrist 83° to 109°.
- The bind paw of a mesh is pronated about 55°, so a far supinated hold, such as the violin grip
  (215° to 234° from the bind), passes 180° of skin twist from any natural rest. An elbow path in
  the move keeps both ends, so it cannot remove the pass. Supinate the bind paw about its forearm
  (`studio.bindSupination`) by about half of the play twist, and scan the angle with the rest,
  play, and move twists and the arm gate (`bind-scan.ts` of
  `docs/research/2026-10-27-left-paw-bind/`). A turn of the bind elbow about the upper arm moves
  the zero of the upper arm roll too.
- The `palm` of a rig config sets the roll of the arm bones. The claws curl toward the palm, so read
  the palm from their curl. The flat side of a paw can lie 90° from it. A palm 90° off twisted
  each paw of the bear 122° at rest (`palm.txt` of `docs/research/2026-10-22-mesh-bear/`).
- A role whose instrument moves to its rest place needs pose offsets in `poseStudioBones()`.
- The holds are in head heights, and the baton keeps its length, so a smaller head moves the wrist
  along the baton. Set the baton point from the wrist that you want.
- A long muzzle turns into the paws when the head turns to a section. A round belly takes the room
  of the forearms: the pianist needed the keys further forward, a lean, a reach limit for each paw,
  and a curved path from the knees.
- A roll rule that aims at a far point, such as the shoulder seen from the mallet head, flips when
  the prop points at that point (`rollToward()` of `pose/bowed.ts`). Keep that point off the prop
  line.
- A hold can trade the folds against the clearance, and a more bent elbow folds more faces. Check
  each hold change with `pnpm hold-fit --set` and `pnpm pose-depth --set` before you write it.
- Run `pnpm arm-check <role> --variant ...` next to the depth variants from the first scan
  (`pnpm hold-scan`), before the choice of a hold.
- A big head puts the grips of a hanging instrument at shoulder height, and elbows out and level
  twist the upper arms into bands: point the elbows down. A deeper trunk takes the room of the
  elbows: point them out (`poleL`, `restPoleL`). Compare the arm turns of each pole after a change
  of the head or the girth (`pnpm hold-fit --base main`).
- A harp paw with its fingers on the line from the shoulder bends far on a short forearm. Aim the
  fingers along the strings (`aimL` of `HANDS_HOLDS`), and raise the palm on the far strings to keep
  the reach.
- A paw on a wind grip lies along the line from its shoulder, and `PAW_TURN` undoes a hand turn in
  the plane of the palm. When a big head puts the grips above the shoulders, put the grips low on
  the instrument, else a long paw rises past it
  (`grips.sh` of `docs/research/2026-10-20-mesh-monkey/`).
- The arm gate and the depths pass while a paw misses its instrument. `PAW_TURN` removes each side
  bend of the wrist up to 70°, so a paw can wrap a tube only when the forearm is near square to
  the tube, and the palm point of the IK is the middle of the paw. Measure each hold with
  `pnpm wind-grip`, and move the grip around the tube (`WindHold.gripShiftL`,
  `docs/research/2026-10-24-wind-grips.md`).
- The palm faces +x of the left hand of the player and -x of the right hand: a curl moves the
  finger tips of the skin to that side. Check a palm rule with a curl of the skin
  (`curl-side.ts` of `docs/research/2026-10-25-grips/probes/`), because a rule with the other
  signs turned the back of each wind paw to its tube for two rounds.
- A palm on its tube can still show to the audience with the thumb down: a woodwind paw behind
  its tube does so. Put the paw at the side of its own shoulder, and read the thumb and the palm
  side with `palm-probe.ts` of `docs/research/2026-10-25-wind-palms/`, because `pnpm wind-grip`
  sees no thumb.
- A paw that points at its tube cannot face it with the palm: the roll takes the direction to the
  tube square to the paw, and the palm of the left tuba paw faced up. Put the grip beside the
  tube, so that the line from the shoulder passes it. A side aim across the tube
  (`WindHold.aimSide`) is lost on a paw whose forearm lies in the plane of its palm, because
  `PAW_TURN` turns the paw back, and the paw leaves its grip. Measure the visible paw with
  `brass-probe.ts` of `docs/research/2026-10-25-brass-grips/`.
- A prop on the hand of the player moves in the visible paw by the side bend that `PAW_TURN`
  removes, up to 70°. Hold a mallet with no side bend (`gripRoll()` of `pose/percussion.ts`),
  and measure it with `shaft-frame.ts` of `docs/research/2026-10-25-percussion-grip/`. A roll
  that removes the side bend flips where the shaft passes the forearm line: count the jumps with
  `jumps.ts` of the same folder.
- The rule `weights.fingers` 0.5 of a rig keeps no paw vertex mainly on the fingers, so a curl
  closes little. Give a role that closes its paw around a tube the whole weights (1), and count
  them with `glb_fingers.py` of the same folder.

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
  knee, because a paw on the belly folds the arm.
- A long snout puts the mouthpiece far in front of the body, and the grips hang below it, so a
  smaller instrument barely helps. Turn the instrument back toward the body around the mouthpiece,
  and turn the shoulder forward (`reachL`, `PIG_HORN`). For a hanging woodwind at its real angle,
  move the mouthpiece back and down under the muzzle (`lipShift`), and read its depth in the head
  (`WOLF_CLARINET`).
- A long muzzle puts the mouthpiece of the tuba about 0.5 m in front of the shoulder joints, and a
  tilt of the tuba toward the body turns its bell over the face. Give the tuba a longer lead pipe
  (`SpeciesParams.tubaPipe`), and roll the bell to the left of the horn (`RHINO_TUBA`).
- The short arms of the elephant do not reach across its trunk, and a third kettle of the real size
  stands behind the shoulder and cuts into the body. Use `PercussionHold.rim`, `sides`, `home`, and
  `pair` with `TIMPANI.side`, and scan them with `pnpm pose-depth --targets`.
- A species with several instruments in one seat, as the badger, needs one role for each
  instrument, the gallery query `only=<instrument>`, and `--at <species>:<instrument>`. A part that
  no demo plays needs the percussion test score of `tools/probe-demos.ts`.
- Short arms cannot hold the cymbals of the app (0.40 m) out of a round body at any arm factor up
  to 1.25 (`cymbal-scan.txt` of `docs/research/2026-10-20-badger-mesh/`), nor hand cymbals of the
  smallest real size at any crash place in reach or tilt (`scan-hand.txt` of
  `docs/research/2026-10-20-badger-cymbals/`). Give such a body a suspended cymbal
  (`SpeciesParams.cymbalForm`).
- Short flippers beside a deep belly do not reach a held prop at its reference place. Scan its
  place with palm targets in the sweep (`singerTargets()`, `--set folder.drop=<H>`), and widen it
  until the upper limbs keep off the body (`folder-scan.txt` of `docs/research/2026-10-21-mesh-penguin/`).
- A paw that hangs beside the haunch puts the depth at the inner elbow and the armpit
  (`left-rest.ts` of `docs/research/2026-10-17-tan-rest/`).
- A harp leaned back from the middle of the chest puts its upper strings into the chest. Put the
  top of the soundbox at the front of the right shoulder, raise a smaller harp on its box, point
  the elbows out, and keep the spine lean small, else the muzzle meets the neck. Place it from the
  contact point (`solve.ts` of `docs/research/2026-10-25-harp-lean/`).
- A round belly in front of the short arms of a seated pianist, as on the polar bear mesh, puts
  the keys in front of the belly, and the far keys then need a lean that brings the muzzle to the
  lid. A higher bench lowers the keys against the shoulders and loses reach. Scan the arm factor
  with the front of the keys, the lean, and the gap of the head to the lid (`scan2.sh` of
  `docs/research/2026-10-22-mesh-polar-bear/`), and point the elbows out and level.
- Short arms in front of a deep instrument stop at their full reach mostly along the forward
  direction, so a side move of the body gains little. Read the wrist reach at each strike
  (`dbg.ts` of `docs/research/2026-10-25-xylophone-sway/`), and lean the spine forward
  (`PercussionHold.lean`). A hip move over short legs tilts the shins, and the foot skin sinks
  into the floor: keep the hips (`SideMove.hips`), and read each sole corner with `soles.ts` of
  `docs/research/2026-10-25-xylophone-reach/`.
- Short arms with a long mallet reach an instrument only in a band about 0.12 m deep: nearer
  targets put the paws into the belly, and farther targets are out of reach. Measure both ends,
  the paws with `pnpm pose-depth` and the misses with `reach.ts` of the same folder, and fit the
  depth of the instrument into the band. A hand choice that alternates the hands in a scale
  makes each head pass the other at one height, and the shafts touch (`pnpm clip-probe`).
- A woodwind rest on the grips of the play keeps the hold through each move, but a paw low on
  the tube twists its forearm more, and the arm gate fails its margins against the base: the
  left wolf paw twisted 152° on its grip of the play against 89° at the top of the clarinet
  (`docs/research/2026-10-27-wolf-knee.md`). Gate the rest places before you choose one.
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
- A cap closes a cut with a fan from its middle, so an upper arm point near a long cut gets a depth
  behind the cap.
- The pair "instrument in body" of `pnpm pose-depth` gives the deepest corner of the instrument,
  such as the back of a contrabass on the chest. Measure the visible top plate alone
  (`top-plate.ts` of `docs/research/2026-10-19-hippo-chest/`).

## Weights, rings, and folds

- A goal on one measure moves the twist to a joint that no goal measures. A fold count does not see
  a skin that twists or goes flat. Run the whole gate, `pnpm arm-check <roles> --base <start>`.
- A lowered elbow drags the thin faces of the trunk under the armpit that bone heat gave arm weight,
  and no shape relaxes them. Give that weight to the trunk below the cut (`weights.armBelow`). A
  reader of the arm weights counts the twist bone of the upper arm (`skinFollows()`).
- When an arm hangs near the trunk, bone heat gives a part of its weight to the trunk side. The
  raised bind arms then drag the trunk and fold the shoulder. Keep the arm weights on the free arm
  (`armSplit`).
- When the hanging upper arm is one solid with the trunk, a plane of the split out of the crease
  where they meet frees only the outer shell, and the cut makes a thin plate with no armpit.
  Slice the source, and free the arm at its crease (`weights.armCrease`,
  `docs/research/2026-10-22-elephant-crease.md`).
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
- Where the trunk of the source curls in toward the hanging arm, the caps of the body of a cut lie
  in a notch, and a raised arm shows the quad at the top and the rim as a jagged dark gap. Give
  that side the normals of the skin (`cut.bodyNormals`), and check each side apart. Then move the
  notch vertices of a copy of the mesh half of the way to a surface fitted around the notch
  (`fair.py`). A full move, a fill, or a move of a few corners folds the rest shape or makes facets
  (`docs/research/2026-10-21-rabbit-notch.md`).
- A color measure of a mark counts one range of lightness. Measure the black (Oklab lightness below
  0.3) beside the gray, because a fix of a gray mark can add a black one.
- A fold probe also counts a turned face that no camera sees. Before you accept a fold as hidden,
  count its pixels in a probe build that draws it in a pure color with no light (`hidden/probe.ts`
  of `docs/research/2026-10-18-panda-seam/`).
- A narrow fade of a weight rule under a far bone turn moves the fold to the faces of the fade. Let
  the fade span several rings of faces (`clavicleMiddle`, `armTop` of the hippo). A small change of
  a fade can make the relax of a shape fail (lines `raise` of the rig log).
- The flat cap of a cut over a long arm run shows as a sheet with a straight end at a bent
  elbow, and a dome of one row of vertices shows facets. Close the arm with a round patch in a
  copy of the mesh (`rabbit_elbows.py` of `docs/research/2026-10-22-rabbit-elbow/`), and give
  the patch inside the split plane to the free arm (`weights.armIslands`).
- After a cut, bone heat gives the free arm no trunk weight, so the inner root of a bow arm swings
  into the chest, and `pnpm pose-depth` grows. Give the inner root a chest share
  (`weights.armRoot`, at most about 0.25 on the dog). A shape of `raise` at the shoulder top that
  moves vertices several cm can show as a pointed sheet, which no crop of `ROLE_VIEWS` shows. Look
  at the zoomed strips of `close-views play --at` from each side
  (`docs/research/2026-10-22-dog-seams.md`).
- A thick arm can join the side of the trunk down to the paw, with a notch at its front and its
  back. Turn the plane of the free arm through both notches (`weights.armFree`, `arm_free.py` of
  `docs/research/2026-10-21-mesh-rhino/`), then cut the seam, else the seam stretches into spikes.
  A cut or a patch of the whole inner side still showed the elbows as flat slabs at full size.
  Replace the arm with a round tube in a copy (`rhino_tubes.py` of
  `docs/research/2026-10-22-rhino-arm-2/`), give the tube only arm weights (`weights.armOwn`), and
  keep the upper arm weight off the trunk up to the shoulder joint (`weights.armBelow`).
- A tube that ends in a dome inside the trunk shows no shoulder, the lips of the old notches stay
  as dark gashes, and a fill with UVs copied from single faces shows color patches. Start the arm
  at a ball around the shoulder joint, refill the trunk around it with a fine fair fill, and give
  each new face one texel of a harmonic color (`rhino_shoulders.py` of
  `docs/research/2026-10-22-rhino-arm-3/`).
- A cut that ends below the root of the arm leaves a face at its top that shows as a black triangle
  on the back when the rest arm swings out around a belly. End the cut above the shoulder joint,
  and give the caps of the body the skin normals (`cut-views.webp` of
  `docs/research/2026-10-22-mesh-bear/`).
- A free arm by a radius around the joints can leave the back strip of a thick arm root on the
  trunk. The hanging arm hides it, and a raised arm pulls it out as a dark flap. Draw the posed
  faces with their indices (`faces.py`), and move the chain back (`armFree.shift`), because a
  larger radius also takes the front edge (`docs/research/2026-10-22-bear-armpit.md`).
- A flap, a shard, or a dent at the arm seam is often the form of the source that the hanging arm
  hid: its faces keep their bind area and normal in the pose, so no measure of the skin, the
  folds, or the arm gate sees it. Read `rig-mesh --check` for an arm that joins or touches the
  trunk, and look at the sheets of `pnpm close-views audit` (`docs/research/2026-10-22-seam-gate.md`).
- A shoulder ball with half of its weight on the upper arm lies on the hull of its neighbors in
  the source, but the arm turns sink it 2 to 3 cm, as a sharp V at the top back of the arm root.
  A flip or a weight ramp moves the fold. Move the ball and its ring out in a copy, and split the
  long edge across the joint (`push`, `split` of `tools/blender/arm_root.py`,
  `docs/research/2026-10-22-arm-roots.md`).
- A dent at a notch of the arm root can come from the bind: the rig turns the hanging source arm
  about 41° onto the bind arm (84% on the rabbit, `decomp2.py` of
  `docs/research/2026-10-22-rabbit-armpit/`). A dual quaternion bind (`bind.blend`) keeps the
  radius of the notch, but its neighbors move out too, so the dent stays
  (`docs/research/2026-10-22-dq-bind.md`). A fill of the notch (`hull`) and a push of the root
  front do not combine: the shapes of `raise` fail.
- A limb far from the bind arm of the studio, as a flipper that hangs out and down, turns the faces
  of its root over in the bind, and they fold in each sample. Bind the upper arm nearer to the
  source limb (`studio.bindArms`), and count the folds of each bind with `rig-mesh --check --set`.
- A long thin face across an arm joint folds, and weight rules make it worse. A ring of new vertices
  at the joint (`refine.rings`) fixes it, within 5,600 triangles. Put a ring only where `pnpm
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
- A paw that turns about 160° on its forearm folds the wrist. The studio forearm turns in the
  frame of the elbow hinge, so a held part has one direction of no paw twist: measure it
  (`grip.ts` of `docs/research/2026-10-19-elephant-grip/`), and hold the part near it
  (`PercussionHold.across`). A bind mallet at 90° to the forearm puts that direction across the
  body. A real grip holds the shaft along the thumb, so slant the bind mallet toward the forearm
  (`TIMPANI.malletTilt`): then the real direction, forward and in, has little twist.
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

- An arm that frees from the trunk only at the elbow has no upper arm: each turn crumples the
  trunk wall into flaps, and no weight rule, cut, ring, shape, or arm factor fixes it. Model a
  round tube of the upper arm in a copy of the mesh, with no face that joins the trunk
  (`pig_arms.py` of `docs/research/2026-10-21-arm-form/`). Its dome inside the shoulder gives
  `pnpm pose-depth` about 4 cm of upper arm in the body in each set. Smooth the fill of the wall
  and two rings around its rim, else the saw rim and the fan show as dark spikes.
- A flat upper arm reads as a plank when its broad side faces the camera. Round it in a copy of
  the mesh (`rabbit_arms.py`), then point the elbow so that the arm reads across the body. The
  arm run of a cut sets the width of the arm, so move it too, except where the caps of the body
  lie in a notch: there, its move folds the caps.
- The fold probe and the arm gate do not see a crumpled or a flat upper arm. Run `pnpm arm-look`
  against the limits of the red fox, and read the 2x crops from the front, the back, and each
  side: a defect can show from one side only (user, 2026-10-21).
- A closed beak with no mouth line cannot open by weights. Split a copy of the source with a
  script, and move the two parts apart by more than the weld of `rig-mesh`, else the weld joins
  them (`beak_split.py` of `docs/research/2026-10-21-penguin-beak/`).
- Short thick legs under a round body, as on the polar bear mesh, make a thigh from a hip joint
  at the crotch shorter than it is thick, so the seated legs read as straight. Put the hip joints
  in the haunch and the knees at the bottom of the body (`docs/research/2026-10-22-polar-seat.md`).
  Even then, a round belly hides a short lap, and only longer legs show it. A leg factor raises
  the landmark of the standing shoulders, so raise its height by the factor of `keptHeight()`,
  else the whole body becomes smaller (`docs/research/2026-10-22-polar-legs.md`).
- A seated thigh with no weight of its own leaves a cut or a hump at the knee: a `haunch` ramp
  from the knee gives the hips the whole thigh, and bone heat on a short thick leg gives the shin
  the knee front. Color the bind by the hips, the thigh, and the shin in Blender, start the ramp
  above the knee, and split the leg across the knee (`weights.knee`, user, 2026-10-26).
- Long faces across the knee of a source leg stay flat planes in the seated bind: a wedge from
  the haunch to the heel with no hollow behind the knee. Rings, flips, a taper, and back rings
  of the rig kept the wedge or folded the back of the knee. Rebuild the leg as a quad tube
  ([`rig-blender.md`](rig-blender.md), Legs; `docs/research/2026-10-27-polar-legs-rebuild.md`).
- The linear blend puts each vertex of a bent knee on the chord between its places on the thigh
  and the shin: a flat bevel on the knee front with hard ridges, and a thin knee. Give the knees
  the dual quaternion blend (`bind.knee`). Read the knee with `probes/leg_rays.py` of that report:
  the front over the round of the leg, and the depth on the bisector against the source.
- The bent knee folds the back of the tube into a crease whose faces turn far from each other.
  Smooth the seam in few rounds (`kneeCrease`), and fair the calf back along the normals
  (`kneeCrease.fair`): each round more narrows the knee. Count the hard edges within 0.2 units of
  the knee (`probes/zone_turns.py`), behind it (`probes/hard_edges.py`), and the edges through the
  skin (`probes/crossings.py`).
- Bone heat spreads over the whole mesh, so new faces on the legs move the weights of the crotch,
  the seat top, and the folds of the trunk. Give the kept vertices the bone heat of the mesh
  before the rebuild (`heatSource`).
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
- A body with no chair stands in its seated pose, and short legs can put its center of mass behind
  its soles. Measure it (`balance.ts` of `docs/research/2026-10-20-monkey-stand/`). When the feet
  under the hips are not enough, lean the trunk forward (`studio.trunk.open` below 0), and give the
  body no `sit`, else the trunk step flattens the turned haunch.
- A seat as high as the haunch puts the root of a tail of two bones into the seat of the app, which
  is deeper than the rig chair (`docs/research/2026-10-20-monkey-chair.md`).
- The idle sway turns the tail bones (`pose/pose-at.ts`), except a tail on the seat
  (`OwnBodyParams.seatedTail`). Measure a seated tail over one sway period, 5.5 s, with the tail
  lines of `pnpm rig-mesh --check`.
- Short thighs on a deep trunk end behind the belly front. Measure the trunk front and the knees
  (`dog-profile.ts` and `cello-contact.ts` of `docs/research/2026-10-17-dog-mesh/`) before you plan
  the knees or an instrument between them.
- A big head over a thin neck shows a dark band under the head. Smooth the neck and the head bottom
  with a box that ends behind the chin (`smooth`), else H and each hold move.
- A horn on the muzzle is the front of the head, so the mouth goes to the tip of the horn. Use
  `noseTop` of `ANIMALS`.
- The elephant trunk takes bone heat from the chest and sets the chin of the head measures. Use
  `noseFront` and `headFloor` of `ANIMALS`.
- Ears at the height of the skull top and antlers above it fall in the height rule of `earBase`.
  Keep both on the head, and leave the antlers out of the head measures (`headCeiling` of
  `ANIMALS`), else H and the pea eyes grow with the antlers.
- The tip of `earFlap` takes the nearest vertex, which can lie on the shoulder. Take it from a cut
  of the flap (log line `ear L`).

## Colors and size of the mesh

- One color for each face gives one palette entry for each face. Measure the packed parts before
  you cut one (`src/models/studio-size.test.ts` limits the gzip size).
- The texture of an image mesh has black gaps between its islands, so a face takes the mean of its
  light samples. Read `colors.py` of `docs/research/2026-10-14-rabbit-smooth/` after a change of the
  color rules.
- A face takes black from a third of dark texture samples (`eyeShare`), so a raised arm stretches
  the toothed border of a black region into wedges. Make the faces with a third to a half of dark
  samples light (`colors.border`, `marks.py` of `docs/research/2026-10-18-panda-marks/`).
  A dark gray fur near the luminance limit turns a third of the faces dark: count the dark faces
  by region first, and lower `colors.dark` (`dark_probe.py` of `docs/research/2026-10-20-wolf-mesh/`).
- With no gloss nose, the export takes the front-most fur vertex of the head near the middle plane
  as the nose tip (`NOSE_PLANE`), and each gloss shell off the plane as an eye. Give a mesh with
  gloss nostrils, as the hippo, no `noseBox`, and read the rig check warning of a tip off the plane.
- A dark rule cannot split an eye from a dark patch of almost its color, and a wide eye box puts
  light holes in the patch. Keep the eye box on the eye, and set `eyeShell.darkReach` to 0, as for
  the panda.
- A face rule that looks right from the front can paint a dark block on the side. Check it from the
  front, at 60°, and from each side, and limit the normal of its faces (`outward` of
  `colors.smile`).

## Probe tools

- `--views` of `pnpm arm-check` and `--at` of `pnpm close-views play` take no conductor. Aim a
  camera in JSON at the podium of the demo (`conductorOn()`), as `stand-probe.ts` and the strips of
  `docs/research/2026-10-22-mesh-bear/` do.

- In the live Blender of MCP (port 9876), `bpy.ops.wm.read_factory_settings` stops the MCP
  server. Delete the objects in place of a reset. A script of the edit stays in the research
  folder, so that a batch run of Blender gives the same file.
- To probe a GLB file of `pnpm rig-mesh --check --keep`, such as another arm factor, give it to
  `--glb` of `pnpm pose-depth`, `pnpm hold-fit`, or `pnpm arm-check`. Do not copy it over the
  rig in `assets/`, because a stop or a failure then leaves the wrong body.
- `pnpm rig-mesh --check --set` sets `app.shoulders` from `keptHeight()`. The rig log gives
  centimeters at the scale of `app.shoulders`, so a direct run of Blender on a variant that moves
  the shoulder joints needs that value (`rig.sh` of `docs/research/2026-10-17-dog-mesh/`).
- A new body moves the layout and the shots, and the shot tests react to moves of 2 cm. Run
  `pnpm test:paused src/shots/` early, and `pnpm shot-trace <demo> --base main` when a shot drops.

- A fix of a turn rate can move the prop to a wrong place: a bow pointed out to the side and a
  baton pointed across the face, with all measures passed. Render a crop of the move before you
  commit (`2026-10-21-wrist-lift.md`).
- Record each row of a variant table with the commit or the `--set` of its run. A row with no
  source state cost a second pass of the report (`2026-10-21-pirates-clip.md`).
- To commit a part of a file, stage a blob of it with `git update-index --cacheinfo`, and keep
  the working file. A file written from `HEAD` for a commit gave the rhino its parametric body
  again, and three sweeps measured the wrong body.

## Values in meters

The pose values in meters do not change with the body size:

- the bow: `freeHair` of each `BowedHold` and `BOW_STEP` (`src/pose/bowed-rig.ts`), `pluckHeight`
  and `pluck` of `BOWED_HANDS` (`src/pose/bowed.ts`), and `lift` and `tremoloAmplitude` of
  `BOW_MOTION` (`src/pose/strokes.ts`);
- the hands and the head: `lift` and `pull` of `HAND_MOTION` (`src/pose/hand-notes.ts`), the `sizes`
  of each hold of `src/pose/percussion-rig.ts`, `scale` of `CONDUCTOR_MOTION`
  (`src/pose/conductor-notes.ts`), and `eyeHeight` of the cues (`src/pose/cues.ts`);
- the body: `hips` and `span` of the side move of a percussion hold (`PercussionHold.side`);
- the sweep: `CONTACT`, the `depth` of each accepted depth, and the `targetError` of each role
  (`src/pose/test-sweep-roles.ts`), `PIANIST_GAP` (`src/pose/test-pianist-clearance.ts`), and `GAP`
  (`src/pose/test-conductor-clearance.ts`).

After a change of the body size, compare the folds and the depths in H first
(`pnpm hold-fit <role> --base main`, `pnpm pose-depth <role> --base main`), then probe these values
before a hold fit.
