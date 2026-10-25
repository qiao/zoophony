# Decisions of the list of corrective shapes of a rig and of the arms of the cat

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-16 at about 23:10, the user asked the manager of the session to review the poses and to
"apply fixes until things look great". After the round `cat-bow`, the cat violist still folded in
each play sample. The manager gave the goals of the round `multi-shape`, and the agent of the
branch decided the other rows. The report
[`2026-10-17-multi-shape.md`](../research/2026-10-17-multi-shape.md) gives the measures, the
probes, and the images. The user can reverse each decision. Then update the section that holds
it, and remove its row.

| Decision | Section |
|---|---|
| The manager: a rig can hold a list of corrective shapes of the kind `raise`, and the app weights each shape by its own key. One shape stays valid, and the rigs of the fox, the rabbit, and the cat keep their bytes or their poses and skins. The cat gets one or two shapes of the right arm in the play, with the play folds of the violist at most 4.0%, the lift and the rest folds at most `main`, and each depth of the fit at most `main` + 0.5 cm | 4.4, 9.3 |
| `raise` of the config of `pnpm rig-mesh` holds one rule, or a list of up to four rules (`raise_rules()` and `RAISE_LIMIT` of `tools/blender/rig_mesh.py`). The first rule of a side makes the morph target `arm_raise_<side>`, and the next rules of the side make `arm_raise_<side>2` and so on. A list writes a list of poses into the extras of the file, and each pose names its target. One rule writes one pose with no target, as before. The export reads both forms (`raisesOf()` of `tools/studio-body.ts`), and the body holds the poses in the order of their shapes (`StudioBody.raises`, `STUDIO_RAISES`). `poseStudioBones()` gives each shape the weight of its own turn, and `StudioPose.correctives` holds the two arm-down weights and four more. With the format, the rigs of the fox, the rabbit, and the cat of `main` keep their bytes (`rig-bytes.txt`), the modules change only from `raise` to `raises`, and `pnpm body-probe --base main` gives each body, player, and pose set equal (`body-probe-format.txt`) | 4.4, 4.7, 7.1 |
| A rule with the bone `forearm` gives the shape of a bent elbow, and its weight comes from the turn of the forearm from the upper arm (`StudioRaise.bone`). A rule of a raised arm can also give the turn of the forearm from the upper arm (`turns.forearm`), so that its pose bends the elbow as in the play. The fold of a face across a joint follows the turn of the two bones of the joint, and the upper arm alone did not separate the folds of the right elbow of the cat (below) | 4.4, 4.7 |
| Each rule relaxes the skin with the shapes of the rules before it on the same side at the weights that the app gives them in its pose (`raise_weight()` of `tools/blender/rig_mesh.py`). The shape of the right elbow of the cat moves vertices of the clavicle and the upper arm, and the shape of the raised right arm moves vertices of the same bones, while both have their full weight in the play. A shape that is solved alone gives the relaxed places only when the shapes before it have no weight | 4.4 |
| The fold probe against `main` (`pnpm fold-probe violist --base main --faces 12`, all demos at a step of 0.25 s, `fold-probe-violist-base-main.txt`): the cat folds in 16.4% of the play samples (100% on `main`), 52.3% of the lift (95.6%), and each rest sample, as on `main`, with at most 12 folded faces in one rest sample (12). This replaces the open row of the play folds of [`2026-10-17-cat-bow.md`](2026-10-17-cat-bow.md) | 4.4, 9.3 |
| The fit against `main` (`pnpm hold-fit violist --base main`, all sets on `FIT_DEMOS`, `hold-fit-violist-base-main.txt`): each depth stays as on `main`. The play folds of these demos fall from 100% to 19.8%, the lift folds from 96.8% to 59.7%, and one rest sample keeps 11 folded faces | 5.2, 9.3 |
| The rig (`pnpm rig-mesh cat --check`, `rig-mesh-check-final.log`): 3,155 triangles of the budget of 3,200, the packed mesh 27,409 B after gzip (27,202 B on `main`) of the budget of 32,000 B, and the standing body within 0.436 mm of the source, as on `main` | 4.4 |
| `pnpm body-probe --base main` (`body-probe.txt`): the 5 bodies of the cat and its player differ only in the corrective shapes and the moves of their normals, and the other 90 bodies and 22 players stay. Each of the 1,492 pose sets stays | 4.2, 5.4 |
| The first download grows by 353 B after gzip (`pnpm size --base main`, `size.txt`): the three new shapes in the module of the cat and the code of the list | 7.2 |
