# Traps of route 3

This module of `AGENTS.md` lists the traps of route 3 of [`model-work.md`](model-work.md). These traps of route 3 each cost a round:

- The hands of the player turn freely at the wrist, and the skin of the studio bends well only
  near its clips. The retarget turns each paw in the plane of its palm toward the forearm.
- The baton keeps its length, and the holds are in head heights. A smaller head moves the wrist
  down and back along the baton, so set the point of the baton from the wrist that you want.
- A long muzzle turns into the paws when the head turns to a section. The paused test of the
  conductor clearance finds the frame, and the close views show it.
- A round belly takes the room of the forearms. The pianist needed the keys further in front, a
  lean, a reach limit for each paw, and a curved path from the knees to the keys. The paused test
  of the pianist clearance finds each contact with the frame.
- The depth of an open part is false near its open edge. A trunk with no arms is open at the
  shoulders, so the sign of its nearest face gave depths at the limit of the search. Measure in
  a closed part (`closedPart()` with the count of its open loops), as the sweep does.
- A cap closes a cut with a fan from its middle. The cuts to the upper arms of the studio bears
  are long and not flat, so a point of an upper arm near its cut has its depth to the cap. The
  depth to the nearest triangle of the body can be twice as large. Read the depths of the upper
  arms as depths behind the cap.
- A role whose instrument moves, such as the violin to the rest place, needs the offsets of the
  pose in `poseStudioBones()`. Before 2026-10-13 the retarget dropped them, and the violin of
  the rabbit stayed at its bind place at the chin.
- Short arms do not reach the instrument of the app. Size the instrument by the rule of real
  players, and keep the limbs of the studio (user rule of 2026-10-10). Make the arms longer in
  the studio only when the user asks, as for the rabbit on 2026-10-13, and for the full violins of
  the rabbit and the red fox on 2026-10-14. When the user sets the size of an instrument, as for
  the violins of the rabbit and the red fox after their shorter arms of 2026-10-14
  (`SpeciesParams.violinScale`), the size stays, and the hold moves the instrument until the paws
  reach it: the violins moved back toward the neck, so that the left paws reach the nut.
- A round belly can cover short thighs, so the lap place of a hold lands on the belly. The rabbit
  rested the violin at its side (`BowedHold.restAtSide`) until its longer legs of 2026-10-14 gave
  it a lap. Short arms on a long trunk may not reach the thighs: before its longer arms of
  2026-10-14, the paws of the red fox hung 0.16 m above them. Since 2026-10-16, the rabbit and the
  red fox rest as a seated violinist, with the violin upright on the left thigh and the bow upright
  at the right side. The long arm of the red fox reaches its thigh only nearly straight, and the
  line from the shoulder to the top of the thigh passes through the side of the belly, so its paw
  holds the frog at the outer side of the thigh. The belly of the rabbit is widest below its
  elbow, so its hanging right arm holds the frog at the outer side of the knee: a paw on the belly
  over the thigh bent the arm out as a wing and turned 20 faces of the arm over. The rest columns
  of `pnpm hold-fit` give the right elbow against the trunk and the angle of the upper arm.
- The sweep measures a part by the corners of its triangles. The stick of the bow is one long box,
  so its middle went 6.3 cm into the body of the red fox in the rest with no depth in the sweep.
  The rest columns of `pnpm hold-fit` take a point at each 1 cm along the bow (`bowPoints()` of
  `tools/lap-rest.ts`), and `docs/research/2026-10-16-bow-rest/bow-path.ts` does the same for the
  lift and the lowering.
- A bow that rests upright and plays across the strings turns its tip from up to the left. A
  direct mix of the two bows turned the tip through the head, and the bow went 14.8 cm into the
  body while the arms lowered. A via of the rest bow (`BowVia` of `pose/bowed-rig.ts`) turns the
  tip through the front.
- A new body changes the footprints, so the layout of a section, the looks of the other players,
  and the cues of the conductor change with it. `pnpm body-probe --base main` names them.
- The shot test of `src/shots/prepare.test.ts` reacts to moves of the footprints of about 2 cm.
  A change that moves a body, such as a seat, a rig, or a hold, runs `pnpm test src/shots/` before
  its commit. When a shot drops out, `pnpm shot-trace <demo> --base main --from <s> --to <s>`
  gives the test that refuses each camera of the cut, such as the distance share of a two-shot.
- Bone heat gives a part of the arm weight to the side of the trunk when the arm of a mesh hangs
  near it. The raised bind arms then drag the trunk, and the fold probe finds folds at the
  shoulder. Keep the arm weights on the free arm (`armSplit` of the config of `pnpm rig-mesh`).
  Inside that plane, the side of the rabbit trunk below the armpit keeps 0.72 of the upper arm
  weight. A rule that gave it to the trunk folded the long faces between the trunk and the arm
  in each play sample.
- A mesh of an image model has many thin faces (335 of the 3,065 faces of the rabbit have a corner
  angle below 10°). A thin face with corners of different weights turns over at a bent joint.
  The `sliver` and `line` rules of the config of `pnpm rig-mesh` remove some of these folds.
  Read `pnpm fold-probe` after each change of a hold, because a more bent elbow folds more faces.
- The long thin faces of an image mesh fold at the joints of the arms. A face of the rabbit ran
  from the shoulder over the elbow to the forearm, and the bent elbow of the bind made it thin.
  It folded in 45% of the play samples, and weight rules made it worse. A ring of new vertices
  at the joint fixes it (`refine.rings` of the config of `pnpm rig-mesh`). Put a ring only where
  `pnpm fold-probe` finds folds, and run the sweep (`pnpm pose-depth <role>`) after it: a ring at
  an elbow that does not fold can pull the inner elbow into the trunk.
- One color for each face of a texture gives one palette entry for each face, and the module of
  the rabbit was 54 KB after gzip. The palette in Oklab and the walk order of `pnpm rig-mesh`
  made it 24.7 KB. Measure the parts of the packed mesh before you cut one.
  `src/models/studio-size.test.ts` limits the gzip size of each packed mesh.
- The texture of an image mesh has black gaps between its islands. A face at the edge of an
  island took them into the mean of its samples, and 136 fur faces of the rabbit were 10% to 40%
  darker than the cream. A face that is not dark now takes the mean of its samples that are not
  dark. Read `colors.py` of `docs/research/2026-10-14-rabbit-smooth/` after a change of the
  color rules.
- Each open edge of a mesh opens a loop in the closed body of the sweep: the open edges of the
  whiskers of the rabbit and the cuts to the arms give 4 loops. The eye fans gave 2 more loops
  until the export dropped them for the pea eyes on 2026-10-15. Give the role its own count for
  `closedPart()`, and check that each extra loop is small.
- A long thigh needs a seat of its own (`studio.legTurns` and `weights.haunch` of the config). The
  seat of the studio rabbit turns the thigh 57°, and with the haunch ramp of the rabbit, the long
  thighs of the fox stood upright on the chair. A large tail needs two bones (`tail_tip`): one
  stiff bone sticks out level behind the chair.
- A level seat under thighs that slope down meets the thighs before the haunch. Then the seat top
  is the underside of the thighs near the knees, and the haunch hangs up to 6 cm above it. End the
  seat where the thighs leave the seat top at the haunch (`chair.front`). The seat of the app
  reaches `seatBack` of `ANIMALS` past the chair of the rig, so a short seat needs no `seatBack`:
  move the back edge of the chair of the rig forward by the old move (`chair.back`), and the body
  keeps its place.
- A turn of the trunk in the seated bind (`studio.trunk`) gives the standing body two blends in a
  row: `standingBody()` skins the seated bind with the standing turns, and a pose then skins the
  arm shapes, which the rig solved in the seated axes. A vertex with the weights of the trunk and
  of an arm missed the source by 3.5 mm. The export writes the arm turns of the clip
  (`StudioStanding.armTurns`), and `standingArmCorrectives()` solves the arm shapes again for the
  standing bind. `pnpm rig-mesh --check` prints the worst standing vertex with its bones.
- Bone heat can give one corner of a small face a bone that the bow arm turns far, such as the
  right clavicle, and the face folds in most play samples. `pnpm fold-probe` gives the main bones
  of the folds. Look at the weights of the corners of the faces that fold most often before you
  add a ring or a smoothing: for the fox, the rules `clavicleFrom` and `armTop` helped, and a
  smoothing of the shoulder weights folded more faces.
- A face that folds in one region of the poses of an arm, such as the front of the right shoulder
  of the red fox with the bow arm out to the side and down, needs a corrective shape when no weight
  rule or ring removes the fold (`raise` of the config of `pnpm rig-mesh`). The whole turn of the
  upper arm finds the region: all play samples within 5° of the mean turn of the folded samples
  folded, and the direction of the upper arm alone separated them less. Run
  `docs/research/2026-10-15-fox-rig2/arm-dirs.ts` and `raise-turn.py` for the mean turn. A rule
  that relaxed more faces in the pose of the shape (`raise.below` 0.5 and 0.7 against 0.3) folded
  more play samples.
- A wrist that folds while its paw stays near one turn from the forearm, such as the left wrist of
  the cat violist on the fingerboard, needs a corrective shape keyed on the paw (`raise.bone`
  `hand`). The pose of the rule in Blender turns over fewer faces than the app at the same turn:
  at the mean turn of 153.7°, 1 face turned over in the rule, and face 2116 still folded in 30% of
  the play samples. Turn the rule further on the same axis (165°), and read the folded
  face-samples of the paw in the line of the main bones of `pnpm rig-mesh --check`
  (`docs/research/2026-10-17-cat-bow/wrist-turn.ts`).
- A face across a joint folds by the turn of the two bones of that joint. The turn of the upper arm
  in the axes of the chest, which `pnpm fold-probe --turns` gives, can miss it. Faces 235, 332, and
  338 across the right elbow of the cat folded at each turn of the upper arm in the bow strokes,
  over 90°, but the forearm stayed within 10° of one turn from the upper arm in 87% of the play
  samples. Probe each key of the arm before a rule of `raise`: the upper arm, the forearm from the
  upper arm (`raise.bone` `forearm`), and the paw from the forearm
  (`docs/research/2026-10-17-multi-shape/arm-turn.ts` and `fold-keys.ts`).
- A shape fixes only the poses near its rule, and a relax cannot open each fold. After the shapes
  of the right elbow and of the raised right arm of the cat, faces 206 and 336 folded in a second
  cluster of poses, with the upper arm 138° to 140° from the bind and a straighter elbow. A rule at
  that cluster left two faces turned over in its own pose with each tried cosine and ring, and the
  play folds did not fall. Read the line `raise <target>: ... faces turn over before and ... after`
  of `pnpm rig-mesh --check` first: a rule with faces turned over after the relax fixes few
  samples.
- The studio paw turns in the plane of its palm toward the forearm (`PAW_TURN`), and its middle
  moves on an arc around the wrist. A bow stick across the palm then leaves the turned paw: the
  stick of the cat lay 4 cm from the middle of its paw. Put the stick along the line nearest to
  that arc (`SpeciesParams.bowGrip`, `docs/research/2026-10-17-cat-bow/stick-line.ts`), and read
  the grip with `stickGrip()` of `tools/bow-grip.ts`. The turned hand moves against the bow, so
  read the depths of the bow arm and the folds of the right forearm after a change of the grip.
- The place of the grip along the stick does not change the gap, but it moves the wrist and twists
  the upper arm. With the stick at the middle of the line fit, the right upper arm of the rabbit
  folded in 3.4% of the play samples, and with the paw 2.3 cm nearer to the tip in 1.3%. Scan the
  place along the stick with the folds (`grip-cands.ts` and `fold-scan.ts` of
  `docs/research/2026-10-17-grip-all/`, which set a grip in memory), and move each rest grip out
  by the move of the hand on the bow.
- The paw of a mesh with a long wrist, such as the red fox, is not one rigid piece. The skin of the
  wrist moved the middle of the closed paw by up to 3.8 cm on the bone of the paw
  (`paw-rigid.ts`), so no straight stick kept it within 1 cm. A bent wrist moves it most, as the
  plucking paw in pizzicato did: read the gap of each sample in order (`gap-seq.ts`), and turn the
  bow of that moment (`pizzicatoTip`) before a new grip.
- A shorter neck (`neckFactor`) moves the vertices of the top of the shoulder next to the neck
  down by their neck weight, and the shape of a raised arm can then turn their faces over. With
  the neck factor 0.5, faces 1074 and 473 of the red fox (0.26 of the neck weight) folded in 22%
  of the play samples of three demos. The line `raise R` of the log of `pnpm rig-mesh` gives the
  faces that the shape turns over after its relaxing: keep that count at 0 (`raise.below`,
  `raise.fade`). An instrument that hangs from the head center, such as the violin, goes down
  with the head, so fit its play place again.
- The chair of a rig takes its seat top from the corners of the body. A long triangle of the side
  of a sloped thigh can pass under that seat top near the front edge: with the thighs 25° down,
  one triangle of the red fox, 15 cm long, goes 1.3 cm into the seat at its front corner.
  `seat-dip.ts` of `docs/research/2026-10-17-fox-form/` finds the deepest triangle point.
- The rest columns of `pnpm hold-fit` give the reach of a free paw only. A grip of a rest that the
  paw cannot reach shows in `pnpm hold-reach <species> --instrument flute`: on the lower knees of
  2026-10-17, a resting flute 0.06 H lower met each depth goal, but the right palm missed its grip
  by 1.7 cm. Run `pnpm hold-reach` after each change of a rest place of a held instrument.
- The lap place of a studio body (`lapPoint()`) also takes the skin of the hips and the spine, so
  near the hip it is the side of the belly over the thigh. A short arm on a long seated trunk may
  not reach the top of the thigh: the left arm of the tan fox is 0.545 m, and the top of its left
  thigh is 0.582 m from the shoulder joint (`thigh-reach.ts` of `docs/research/2026-10-17-tan-rest/`).
  Measure that reach before a scan of a lap place. A paw that hangs beside the haunch puts the
  depth at the inner elbow and the armpit: an elbow out to the side turns the upper arm, and the
  skin of the armpit went 3 cm to 5.8 cm into the chest. `left-rest.ts` of the same folder gives
  the free left arm of each `--set` variant in about 0.3 s.
- A linear stretch of the upper arm moves each vertex by its upper arm weight. With the longer arms
  of 2026-10-14, a throat face of the red fox with 0.09 of each upper arm weight went across the
  middle, and the trunk below the right armpit folded in 30% of the play samples. The upper arm now
  stretches only on the free arm and from the shoulder joint out (`outward_stretch()` of
  `tools/blender/rig_mesh.py`). A ring at a joint (`refine.rings`) reaches a fixed distance, so
  longer arms can put the corners of the long faces beyond it: give the ring a larger radius.
- Bone heat gives the top of a narrow shoulder next to a thin neck to the upper arm, as on the cat
  mesh: 0.93 of the weight of a vertex beside the neck. A face from such a vertex to the neck turns
  over with each lowered arm, in each sample of the role. A lower `armTop` gives the outer top of
  the shoulder to the neck and folds a face there. Fade the upper arm weight over the top of the
  shoulder toward the clavicle (`shoulderRamp` of the config of `pnpm rig-mesh`).
- A big head over a thin neck faces its underside down into the shadow of the head. The app shows
  a black band under the head from the back and the sides, and a dark line under the chin, while
  a render with a flat light shows none. Smooth the neck and the bottom of the head with a box that
  ends behind the chin (`smooth` of the config): a box that holds the chin moved the head height H
  of the cat from 0.339 m to 0.352 m, and with it each hold.
- The root of a hanging tail pulls a few vertices of the haunch down, and they set the seat top of
  the sit. A tail that curls on the seat lifts them, and the seat of the cat rose 0.8 to 1.2 cm.
  Give the sit the seat top of the old tail (`sit.top`). The root vertices share their weight with
  the hips, so the sit moved them by half of its drop, and the side view of the haunch of the cat
  stayed 5.2 cm above the seat: count them as the haunch (`sit.root`).
- The idle sway turns the tail bones around the vertical (`pose/pose-at.ts`). It suits a tail that
  hangs, but the front of the tail of the cat curled on the seat moved 12.3 cm across and went
  5.3 cm into the left thigh. A seated tail that lies on the seat does not sway
  (`OwnBodyParams.seatedTail`). Measure a seated tail over one sway period, 5.5 s.
- The depth of the girth factors takes the room of the elbows of a hold. With the trunk 1.15 times
  deeper, the left upper arm of the cat went 5.5 cm into the body in the play with the left elbow
  of the chin hold. Run `pnpm hold-fit <role> --base main` after a change of the girth, and point
  the elbows out (`poleL`, `restPoleL`). The viola then passed the deeper belly on its way from the
  thigh to the chin, 5.6 cm into the body.
- A deeper haunch has a longer round back. With the depth 1.15, the first column of the side view
  after `sit.end` stayed 1.68 cm above the seat, and other values of `sit.end` gave more. More rounds
  of the smoothing of the sit gave 0.58 cm (`sit.smooth` 8 against 2).
- The log of `tools/blender/rig_mesh.py` gives its centimeters with the scale of `app.shoulders`
  of the config. A direct run of Blender on a variant that moves the shoulder joints, such as a
  trunk factor, needs the `app.shoulders` of `keptHeight()`: the trial gaps of the cat were 1.117
  times too large. `pnpm rig-mesh --check --set` sets it.
- A steeper slope of the thighs moves a lap place near the knee off the lap. The viola of the cat
  at 0.95 of the way to the knee stood in front of the knee of the thighs 25° down, over no part of
  the lap. Fit the lap places again after a change of `studio.legTurns`.
- The chair of the app grows until its back posts keep 1 cm behind the trunk (`chairDepthOf()` of
  `tools/studio-body.ts`). A lean of the trunk moves that gap with the trunk, and a deeper rig chair
  (`chair.back`) does not change it. Only `backRoom` of `ANIMALS` keeps a body off the chair back.
- The shape of a raised arm relaxes only the vertices of the clavicle and the upper arm by default.
  A long face from a corner of the trunk under the armpit to the arm then stays turned over, as
  faces 372 and 373 of the rabbit in the rest did. `raise.grow` adds rings of trunk corners. Find
  the turn of the rule with `arm-dirs.ts` and `rest-turn.py` of
  `docs/research/2026-10-17-rabbit-pose/`, and keep the fade away from the turns of the play.
- The arm factor of a reach follows the hold. The string planes of the cello of the dog 17° apart
  needed the arm factor 1.91 for the whole bow hair, and 12° apart needed 1.75, so each change of
  the hold that the clearance asked for (the cello place, the shoulder turn, the string turn) cost
  a new rig. Fit the hold with the arms of a first factor, measure the reach with
  `docs/research/2026-10-17-dog-mesh/cello-reach.ts`, and rig the final factor once.
- A reach factor far above the option text of the user goes back to the user before the merge: the
  dog went to the arm factor 1.75 for "about 1.4x", and the user called the arms way too long.
- Short thighs on a deep trunk end behind the front of the belly. The knees of the dog mesh with
  the leg factor 1.5 stay 1 cm behind the front of its belly and chest, so a cello against the
  chest stands with its lower bout in front of the knees, and a cello that leans back stands
  further from them: 21 cm with the 25° of 2026-10-17. Measure the front of the trunk and the knees (`dog-profile.ts` and
  `cello-contact.ts` of `docs/research/2026-10-17-dog-mesh/`) before a plan of the knee spread.
- `pnpm rig-mesh --check --set` changes only a key that the config has: the first rule of `raise`
  of the dog stopped the tool with "The key raise of raise is not known". Write such a variant
  into a scratch config, rig it with a direct run of Blender, and count its folds with
  `pnpm fold-probe <role> --glb <file>` (`rig.sh` and `raise-trials.txt` of
  `docs/research/2026-10-17-dog-mesh/`).
- A shape of `raise` fits the arm turns of one hold. A move of the cello of the dog by 1.5 cm or 1°,
  with a shoulder turn of 36°, moved the left arm out of the fade of its shapes, and the play folds
  of the fit demos rose from 12.3% to 15.1% or more (`docs/decisions/2026-10-17-dog-folds.md`). Fit
  the hold first, or fit the hold and the shapes in one loop. The rig log names the faces that each
  rule relaxes, and a rule that runs 60 rounds cannot relax one of them.
- A ring at a joint of a mesh with many thin faces at the paw can add thin faces that fold in each
  sample: a ring at the left elbow or the left wrist of the dog folded new faces of the left paw
  in each play sample. Read the faces of the paw in `pnpm fold-probe --faces` after each ring.
- A hold can trade the folds against the clearance. A larger slant of the bow removed folds of the
  right shoulder of the fox, but put the right forearm into the chest at the end of the lift.
  Count the folds of hold changes in memory (`docs/research/2026-10-14-fox-rig/fold-set.ts`), and
  check each candidate with `pnpm pose-depth --set` before you write it.
- The values of the pose in meters do not change with the size of a body. The size round of
  2026-10-14 tried five hold variants for 25 minutes. Then it found that the free hair of the bow
  stays 0.03 m on the larger rabbit. These values stay in meters:
  - the bow: the free hair of each hold (`freeHair` of `BowedHold`, `src/pose/bowed-rig.ts`), and `pluckHeight` and `pluck` of `BOWED_HANDS` (`src/pose/bowed.ts`),
    `BOW_STEP` (`src/pose/bowed-rig.ts`), and `lift` and `tremoloAmplitude` of `BOW_MOTION`
    (`src/pose/strokes.ts`);
  - the hands and the head: `lift` and `pull` of `HAND_MOTION` (`src/pose/hand-notes.ts`), the
    `sizes` of each hold of `src/pose/percussion-rig.ts`, `scale` of `CONDUCTOR_MOTION`
    (`src/pose/conductor-notes.ts`), and `eyeHeight` of the cues (`src/pose/cues.ts`);
  - the sweep: `CONTACT`, the `depth` of each accepted depth, and the `targetError` of each role
    (`src/pose/test-sweep-roles.ts`), `PIANIST_GAP` (`src/pose/test-pianist-clearance.ts`), and
    `GAP` (`src/pose/test-conductor-clearance.ts`).

  Compare the folds and the depths in H first, with `pnpm hold-fit <role> --base main` and
  `pnpm pose-depth <role> --base main`. Then probe these values before a fit of a hold.
