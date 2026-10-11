# Decisions of the seated knees of the rabbit

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-10, after the rabbit of [`2026-10-10-rabbit-sheet.md`](2026-10-10-rabbit-sheet.md), the
user said: "the knee of the rabbit seem strange". Where this request conflicts with an older rule,
the agent of the knees followed the newest decision of the user and the reference image, as
AGENTS.md says, and it decided the other rows. The report
[`2026-10-10-rabbit-knees.md`](../research/2026-10-10-rabbit-knees.md) gives the measures. The user
can reverse each decision. Then update the section that holds it, and remove its row.

On 2026-10-11, the user reverted the rabbit and the bear to the parametric bodies
([`2026-10-11-body-revert.md`](2026-10-11-body-revert.md)). The rows of the seated rabbit in
the app went then. The rows of the config of the tools stay.

| Decision | Section |
|---|---|
| A config of `pnpm rig-body` can give the haunch of the file to the hips (`haunch`). Each vertex behind a hip joint and near it gives a part of its thigh weight to the hips. The part grows from 0 to 1 between 0.1 and 0.4 thigh lengths behind the hip joint, and it goes back to 0 between 0.35 and 0.75 thigh lengths down the thigh. The rabbit has this rule. The bear keeps the weights of its file, because it stands | 4.4 |
| Conflict: "The packer keeps the mesh and the weights of the file" of design 4.4, and "Keep the model of the user as it is" of AGENTS.md. The haunch rule changes the weights of the rabbit file, because the newest decision of the user asks for a natural knee. With the weights of the file, each seated thigh swung the haunch under it. To reverse: remove `haunch` from `tools/glb-bodies/rabbit.json`, run `pnpm rig-body rabbit`, and remove the haunch test and the seat board test of `models/rigged-body.test.ts` | 4.4 |
| Conflict: the rule of 2026-10-10 "do not stretch the arms/ legs of the models" of `2026-10-10-bear-glb.md`, and "Keep the mesh of the user as it is" of AGENTS.md. The rabbit of the sheet has longer limbs, wider haunches, a deeper belly, and a shorter neck than the mesh of the file. The shape of the rabbit gives it these forms, with the thighs 1.1 times, the shins 1.45 times, and the arms 1.35 times longer, because the newest decisions of the user ask for the look of the sheet. The rules stay for the bear. This row replaces the conflict row of `2026-10-10-rabbit-sheet.md`. To reverse the limbs: set the scales along the bone (the second value) of `LeftUpLeg`, `RightUpLeg`, `LeftLeg`, `RightLeg`, `LeftArm`, `RightArm`, `LeftForeArm`, and `RightForeArm` in the `shape` of `tools/glb-bodies/rabbit.json` to 1. To reverse all the form: remove `shape`. Then run `pnpm rig-body rabbit` and `pnpm test` | 4.4 |
| The shape of the rabbit, in the scales across, along, and across each joint of the file: thighs 1.4, 1.1, 0.85, shins 1.3, 1.45, 0.95, feet 1.3, 1.05, 1.3, toes 1.3, 1, 1.3, hips 1.45, 1, 1.5, the spine 1.3, 0.9, 1.45 to 1.05, 0.9, 1.25 from the belly to the chest, the neck 0.7 long, the head 1.15 wide, 0.92 high, and 1.05 deep, the shoulders 1.1 long, and the arms 1.05, 1.35, 1.05. The fitted chair seat is 0.296 m high. This row replaces the shape row of `2026-10-10-rabbit-sheet.md` | 4.4 |
| Conflict: "their thin lower legs" of design 1. The shins of the rabbit are 1.3 times wider across, because the shins of `rabbit-views.png` are that wide. Design 1 now says that the lower legs are narrower than the haunches. In the front view of `pnpm sheet-check rabbit`, the sheet shins are 35 to 39 px wide, the page shins 36 to 39 px, and the old page shins 28 to 29 px. The reference image wins, as AGENTS.md says. To reverse: set the first value of `LeftLeg` and `RightLeg` in the `shape` of `tools/glb-bodies/rabbit.json` to 1, and run `pnpm rig-body rabbit` | 1, 4.4 |
