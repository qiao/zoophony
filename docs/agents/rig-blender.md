# Arm rigs in Blender

This module of `AGENTS.md` gives the method that rebuilds the arms and the legs of a mesh rig in
Blender, so that they bend and twist like real limbs. The polar bear pianist uses it on `main`
(`docs/research/2026-10-24-polar-bear-arms.md`). Use it when the arms of a route 3 body show a
spiral crease, a sharp elbow, slivers, or slits, or the seated legs a wedge. Read route 3 of
[`model-work.md`](model-work.md) and [`model-traps.md`](model-traps.md) first.

## Why the old rigs twisted

Three causes add up. Fix all three, because each fix alone leaves a fault.

- **The faces.** A Meshy mesh has long thin triangles across the elbow and along the forearm.
  When a bone turns, these faces cannot bend smoothly, and they fold into a spiral. A subdivision
  of these faces gives dark slits and a pale flap. New quad faces fix it.
- **The bones.** Linear skinning blends the bone matrices of each vertex. When one bone takes a
  large twist, the skin collapses (a candy wrapper). Many short segments, each with a small share
  of the twist, keep each step small. Aim for less than 25° between two neighbor arm bones.
- **The hold.** The hold sets the total twist of the arm. The rig only spreads it. A real forearm
  turns about 90°. When a hold asks for 160° or more, change the paw turn, the elbow direction, or
  the instrument size first.

## The user rules

- Work in the live Blender through Blender MCP, with the plain Blender tools, one step at a time,
  and look at an image after each step. Write no weight algorithm of your own. A replay script
  records the session (user, 2026-10-24: "aren't you supposed to only use blender mcp?" and "I was
  expecting you to just create the armature in blender, do the weight painting, etc").
- Change only the faces of the arms, from the shoulder line to the wrist, or of the legs, from
  the haunch line to the ankle. The new surface lies on the old limb. The user approved the arms
  for the rabbit and the polar bear, and the manager the legs of the polar bear. Ask before you
  do it on a new species: the rule of no split of 2026-10-23 holds for the others.
- Keep the source file of the user. Write the new source next to it, such as
  `assets/models/<s>/<s>-arms.glb`, with a README note.
- Do not stretch the arms unless the user asks. Fit the instrument or the hold instead.
- Check with images from the front, the back, the left, the right, and the stage camera (az 150
  and az -150 at elevation 40), at each moment of the role.

## The route

```text
 <s>-tpose.glb or <s>-apose.glb (user)
   --> Merge by Distance --> Bisect at the shoulder line and the wrist --> Delete Faces
   --> quad tube (15 rings x 16) --> Shrinkwrap --> Bridge Edge Loops
   --> UV + bake of the fur color --> Data Transfer of the normals --> <s>-arms.glb
   --> studio skeleton + arm segments + helpers --> automatic weights
   --> Limit Total 4, Normalize All, Weight Paint fixes --> <s>-weights.json
                                         (live Blender, MCP; tools/blender/<s>_arms.py replays it)
   --> pnpm rig-mesh <s> (paintedWeights, paintedLower) --> pnpm studio-body <s>
   --> poseStudioBones() turns the segments and the helpers on each frame
```

## Steps in Blender

1. Start Blender with `/Applications/Blender.app/Contents/MacOS/Blender &`, and record its PID.
   Load the MCP tools with ToolSearch:
   `select:mcp__blender__get_addon_status,mcp__blender__get_scene_info,mcp__blender__execute_blender_code,mcp__blender__look`.
   The first call after the start can drop, so repeat it. Never call `read_factory_settings`,
   because it stops the addon. Stop only your PID at the end.
2. Import the source, and run Merge by Distance. The glTF importer splits the vertices at the UV
   seams, and automatic weights fail on such a mesh.
3. Cut each arm: Bisect at the shoulder line, where the arm is free of the trunk, and at the
   wrist. Delete the faces between the cuts.
4. Build a quad tube of 15 rings of 16 vertices: 5 on the upper arm, 3 at the elbow, 8 on the
   forearm, and 2 at the wrist. The cut loop of the paw is the third wrist ring. Each ring stands
   at a right angle to its bone. The rings of a joint stand about 1.5 cm apart on a thin arm, and
   about 3 cm on a thick arm.
5. Shrinkwrap the tube onto a hidden copy of the old arm, then apply it. Join the tube to the
   trunk and to the paw with Bridge Edge Loops.
6. Give the new faces a UV layout, and bake the fur color of the old arm onto them (Cycles,
   Selected to Active). A Data Transfer of the UVs crosses the island borders of a Meshy texture,
   so use the bake. Put the arm image in a strip of the atlas, so that the mesh keeps one material
   for `rig-mesh`. Transfer the custom normals of the old surface (Data Transfer), so that no seam
   shows.
7. Add the studio skeleton with the segments and the helpers (below), parent the mesh with
   Automatic Weights, then run Limit Total 4 and Normalize All.
8. Fix the weights with the Weight Paint tools: Remove From Group of the arm bones on the trunk
   below the armpits, Smooth at the shoulder line, and Smooth on the arm vertices. Look at test
   poses after each fix: the arm down, forward, an elbow at 100°, and a forearm turn of 90°.
9. Write the weights file, and the replay script `tools/blender/<s>_arms.py`. A headless run of
   the script must give the same mesh and weights, byte for byte.

## Legs

Long source faces from the haunch to the heel make the seated leg a wedge. Rebuild such a leg
with the same route (`tools/blender/polar_bear_legs.py`):

- Cut at the haunch line below the crotch, where each leg is a closed column, and above the
  foot. Keep the end rings two ring steps from the cuts, else bridge faces turn over.
- Build the tube before the leg factor: the rig stretches the legs along their bones only, so
  the rings keep their right angles.
- Collapse only a loop edge that is the shortest edge of its thin face: longer collapses ran
  around the loop and knotted the haunch. Give both tubes one ring direction.
- Keep the rule weights with a knee ramp (`paintedLower`, `weights.knee`), so that each ring takes
  one share, and give the knees the dual quaternion blend (`bind.knee`): the linear blend makes
  a flat bevel on the knee front. Smooth the back of the knee in few rounds (`kneeCrease`).
- Give the kept vertices the bone heat of the old mesh (`heatSource`), else the crotch, the seat,
  and the trunk folds change.

## The bones

Each upper arm and each forearm has 4 deform segments, and each elbow and each wrist has a helper
bone. The old upper arm, forearm, and forearm twist bones hold no skin. They only drive the new
bones. `armSegments` of the config turns this on, and it replaces `upperTwist`.

```text
 chest --> clavicle --> upper_arm (drives) --+-- upper_arm_seg0..3 (roll 1/8 .. 7/8)
                                             +-- elbow helper (half of upper -> fore)
                        forearm (drives) ----+-- forearm_seg0..3 (twist 1/8 .. 7/8)
                        forearm_twist -------+-- wrist helper (half of fore+twist -> paw)
                        hand (skin) --> fingers (skin)
```

```typescript
/** The arm segments and the helpers of one arm, as indices in `STUDIO_BONES`. */
interface StudioArmSegments {
  /** Segment k takes (k + 0.5) / 4 of the roll of the upper arm from the chest. */
  readonly upper: readonly number[];
  /** Segment k takes (k + 0.5) / 4 of the twist from the forearm to the paw. */
  readonly fore: readonly number[];
  /** Turns halfway from the upper arm to the forearm, around the elbow. */
  readonly elbow: number;
  /** Turns halfway from the forearm with all of the twist to the paw, around the wrist. */
  readonly wrist: number;
}
```

- **The app.** `poseSegments()` of `src/models/studio-rig.ts`, called from `poseArm()`, turns the
  new bones from the joints that the pose code already sets. Thus they work for each song, and the
  poses stay stateless.
- **The rig tool.** `driven_turns()` of `tools/blender/rig_mesh.py` turns them with the same rule
  in the seated bind and in the clip `reference`.
- **The config** (`tools/mesh-rigs/polar-bear.json` is the example):
  - `paintedWeights` names the weights file of the Blender session.
  - `paintedLower` lists the bones whose vertices keep the rule weights of `rig-mesh`.
  - `armSegments.helper` gives the length of a helper bone in units. `armSegments` needs the arm
    factor 1 and the linear bind of the arm roots (`bind.blend`).
  - `bind.arm` set to `dq` binds the lower arms of the sides of `bind.armSides` with the dual
    quaternion blend (below).
  - `armSegments.rootSegment` gives the rule weight of each upper arm to its first segment, so
    that the trunk around the socket takes the roll of the first ring (the fox).

## Traps

- **The 180° jump.** `twistAngle()` gives a value from -180° to 180°. Each share of it, of the
  old twist bone or of a segment, flips when the paw turn passes 180°. The polar bear stays near
  76°. For a larger twist, lower the twist of the hold, or move the zero of the twist with a
  supinated bind paw (`studio.bindSupination`, `docs/research/2026-10-27-left-paw-bind.md`). Or
  measure the twist around a center of the role, `wrap(raw - center) + center`, so that the jump
  falls outside the used range. Carry no value from the last frame.
- **The bind elbow.** The forearm of the app turns with the elbow hinge, so the bind arms set the
  zero of the paw twist. The bind arms of most configs bend the elbow up, and the A-pose paw of
  the rhino then sat 78° pronated, so each tuba paw twisted about 63° more. Read the bind turn
  with `probes/forearm-turn.ts` of `docs/research/2026-10-26-fifth-rhino/`. Turn the bind forearm
  about the bind upper arm (`studio.bindArms`), and keep the wrist bend in the frame of the palm,
  else the paw swing of the gate changes. The upper arm also turns with the hinge, so this turn
  moves the zero of the upper arm roll too: on the violins, the left play roll would go from about
  0° to -100°. To move only the paw twist, use `studio.bindSupination`. A rest far from the play
  can use the roll: 45° on the wolf halved the rest twists of both upper arms
  (`docs/research/2026-10-27-wolf-bind.md`).
- **The thin bind elbow.** The seated bind bends each elbow 62° to 92° and can turn a paw far.
  On the cat, bone heat gave the elbow helper no weight, and Smooth spread three segments over
  each forearm ring, so the linear blend left the elbow 0.86 and the forearm 0.84 as thick, and
  the upper arm read as a bulge. Use `bind.arm`, but not on an arm that bends further than the
  bind, as a bow arm: its round inner elbow folds (`docs/research/2026-10-27-cat-arm.md`).
- **The legs.** Blender weights on the hips, the spine, and the chest folded a V on the lower back
  over the bench, and cut a slit under each arm. Keep the rule weights there with `paintedLower`.
- **The preview.** glTF and three.js have no B-Bones and use linear skinning with 4 weights for
  each vertex. In Blender, set `bbone_segments` to 1, turn off Preserve Volume, and run Limit
  Total 4 before you judge the weights. Otherwise the preview looks better than the app.
- **Rigify.** Bind right after Generate, before you set `bbone_segments` to 1, because the
  automatic weights use the B-Bones of the fresh rig. Set IK Stretch to 0 on the arm IK bones:
  the default 0.1 made the arms 2% to 3.4% shorter.
- **Rejected fixes.** A second subdivision of the arm faces, weight rules of an agent, a Smooth on
  the upper arm weights, and a move of the elbow alone all failed. The elbow move only shifts
  twist between the upper arm and the forearm.
- **The cut loops.** The Bisect leaves thin faces where its plane passes near a corner or along an
  edge, and a cut loop with more vertices than the ring leaves thin bridge triangles. These faces
  fold in each pose. Collapse their short edges (`step_clean_cut()` and `step_clean_bridge()` of
  `tools/blender/wind_arms.py`). A tilted cut plane can cross the first ring on the inner side.
- **The joint gaps.** Rings close to a joint give thin faces when the joint bends. On the wolf, the
  elbow rings stand 0.016 units from the joint and the wrist rings 0.0085, because a wide wrist gap
  opened the closed paw (`wristGap` of `wind_arms.py`, `docs/research/2026-10-25-wind-arms.md`).
- **A sheared quad.** The bind bends the elbow, so a tube quad at the inner elbow can take its long
  diagonal in the bind, although the diagonal is short in the source. Its thin face folds when the
  elbow bends further, and the mean of its weights folds it in each pose. Flip the edge at its
  point (`refine.pointFlip`, `elbow_quads.py` of `docs/research/2026-10-27-rigs3/`).
- **A thick arm.** On an arm as thick as half of its length, a cut plane with a tilt or a wrist
  cut near the joint crosses the nearest ring, and the bridge turns faces over. A wide elbow gap
  folds fewer faces. A thick upper arm that turns down to a round belly goes into it as one
  rigid part: the weights cannot fix it, so make its inner side a little flatter with Translate
  and Proportional Editing (`step_flatten()` of `tools/blender/elephant_arms.py`,
  `docs/research/2026-10-25-thick-arm-depth.md`). Prove the cause of a depth first with
  `probes/depth-cause.ts` of that report. Flatten after the bake: the bake rays start 0.006
  units out of the tube, so a flatten before it gave the bear black texels under each armpit
  (`STEPS` of `tools/blender/bear_arms.py`). Count the black faces with `dark_faces.py` of
  `docs/research/2026-10-26-fifth-bears/`.
- **The kept colors.** Blender weights can put the top of a paw on the `fingers` bone, so a tone
  rule that keeps the colors of the fingers (`colors.tone.keep`) shows the raw texture there.
- **An arm joined to the trunk.** When the upper arm joins the trunk down to the elbow, cut along
  the seam, fill a side wall under the arm, and give the tube a flat inner side on the wall that
  meets it only at a high armpit line (`tools/blender/cat_arms.py`). Put the flat side a little
  inside the wall and round its edges, else dark slits open at the arm root. Keep the rule weights
  on the trunk and the first shoulder ring (`docs/research/2026-10-25-cat-arms.md`).
- **A slot that is shading.** A black slot, a hard wedge, or a notch at an arm root or an inner
  elbow can come from the normals: the seated bind bends the arm, and the crease angle splits
  the normals there. The split stays at rest, where the arm-down shape adds the moves of its own
  split normals, and the front key lights it. Render `--probe colors,normals` of
  `pnpm close-views`, and read the jumps with `probes/crease.ts` of
  `docs/research/2026-10-28-fox-rabbit-crease/`. With no dark color, give the arm roots
  `rootNormals` and the elbows `rootNormals.elbow` before a rebuild. On the beaver and the rhino, the
  rebuilt arms kept the slots and failed the gate (`docs/research/2026-10-25-beaver-rhino-arms.md`).
  When the true face normals match the smooth normals (`probes/armpit-normals.ts` of
  `docs/research/2026-10-27-legs-armpit/`), the black corner is the underside of the arm in the
  gallery light: smooth only its outline (`smooth`), and look at it in the stage light.
- **The clavicle of a thick arm.** Automatic weights give the clavicle most of the root of a
  thick arm. Its faces then stay with the shoulder, and the root folds.
- **The paw and the wrist helper.** On a short paw, automatic weights give about half of the paw
  to the wrist helper, which follows the forearm of the player. `pnpm wind-grip` then reads a
  smaller paw, and the paw turns only halfway.
- **An arm joined part way.** When the upper arm joins the trunk only near the shoulder, as on the
  fox, a square cut runs down the trunk wall, and its bridge turns over in the bind. Take the seam
  cut of the cat, with no shoulder rings: rings packed at a short socket fold into a dark slit at
  the back of the arm root. Collapse the thin bridge faces of the armpit line too, and give the
  tube near the walls a chest share of 0.4 (`tools/blender/fox_arms.py`,
  `docs/research/2026-10-25-fox-arms.md`).
- **A broad round shoulder.** On the deer, the plane of the seam left the round top of the
  shoulder only near the neck, so the hole took the whole top, and the bridge faces to the first
  ring turned into the arm. A cap plane across the upper arm, turned toward the trunk until it
  meets the plane of the seam near the armpit line, keeps the top on the trunk (`step_cut()` of
  `tools/blender/deer_arms.py`). On a thin arm, keep the reach of the chest anchor within the
  radius of the arm, else the outer arm takes a share of the chest. When the socket folds in each
  sample, bind the upper arm nearer to the hanging arm of the mesh (`studio.bindArms`,
  `docs/research/2026-10-26-fifth-deer.md`).
- **A thick hanging arm on a round belly.** On the hippo, put the plane of the seam at the
  crease of the arm, inside the old `armSplit`, and keep the belly under the forearm on the trunk
  with a second plane (`seam.under`). Delete the thin ears of the hole before the wall, and
  triangulate the cut quads before the clean, or a degenerate face folds in each sample. A
  vertex mixes the rule weights by its painted share of the lower bones, so put `armSplit` out of
  the whole trunk, take the lower trunk bones off the arm vertices (the Smooth gave them to the
  back of the first ring, which then swung out as a dark flap), lower `armBelow` until the
  socket follows the first ring, and keep the anchor and the wrist helper off the forearm and the
  paws. The length of a helper changes only the automatic weights
  (`tools/blender/hippo_arms.py`, `docs/research/2026-10-25-hippo-arms.md`).
- **The head and the fingers of a T-pose bear.** On the bear, the automatic weights gave the
  shoulder line up to 0.18 of the head, and the full fingers bone to each paw. Each head turn and
  each curl of the fingers folded faces. Remove the head below the neck, and give half of the
  fingers weight to the hand with a Vertex Weight Mix modifier and Levels, as the rule weights do
  (`step_paint()` of `tools/blender/bear_arms.py`). A clean angle of 20° fixed the thin faces of
  the shoulder loops, but at the wrist it broke the paw into a dark notch: keep 12° there. Above
  20° at the shoulder, the collapses drew dark bands around the upper arms. Keep the head and the
  neck in `paintedLower`: with Blender weights there, the nose search of `pnpm studio-body` took
  the top of the head. For a thin painted face that folds, use `weights.rigidPainted`.
- **The frame cost.** Each body with `armSegments` has 20 more bone matrices. Run `pnpm frame`
  after a new body uses it.

## Checks

- Measure the twist steps between neighbor arm bones over all demos with
  `node docs/research/2026-10-24-polar-bear-arms/twist-steps.ts 0.25`, as a diagnosis.
- Run `pnpm rig-mesh <s>` and `pnpm studio-body <s>`, then `pnpm build` and `pnpm size`.
- Make before and after images of each moment of the role, from the views of the user rules, and
  2x crops of both arms. The round is not done while a spiral crease, a sharp elbow, a collapsed
  inner elbow, a seam, or a flap shows in a view that the stage camera can show.
