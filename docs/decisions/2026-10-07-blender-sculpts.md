# Decisions of the Blender sculpts

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-07, the agent of the Blender pipeline decided the details below, for option C of the
user (hand-made low-poly animal models made with Blender). The spike of the red fox and the plan
for all species are in
[`2026-10-07-blender-models-plan.md`](../research/2026-10-07-blender-models-plan.md). The user can
reverse each one. Then update the section that holds it, and remove its row.

| Decision | Section |
|---|---|
| A sculpt fits the skeleton of the parametric body: the bones and the body points (the palms, the finger blocks, the mouth, and the head center) of `buildBiped()` stay, and the sculpt replaces only the mesh. A test compares the bones of each sculpt with the current skeleton | 4.4, 4.7 |
| The packed sculpt of each species is a TypeScript module in `src/models/sculpts/`, in the repository, with a static import. CI needs no Blender, and `pnpm sculpt <species>` builds it again | 4.4, 7.2 |
| A sculpt holds the body above the legs one time, and the legs of two stances: seated with a drop of 0.35 m from the seat to the feet, and standing. On another seat, such as the bench of the piano, the body stays parametric | 4.4 |
| Rules give the skin weights of a sculpt: a height field for the trunk, a chain rule for the tail, and rigid parts for the hands, the eyes, the ears, the arm capsules, and the paws. A cut along the borders of the main bones keeps each trunk triangle on one joint | 4.7 |
| The arms of a sculpt are two rigid faceted capsules on `upperArm` and `forearm` that overlap at the elbow | 4.4, 4.7 |
| Plane cuts give the color borders of a sculpt, so each border is a straight line | 4.3, 4.4 |
| A packed coordinate is a step of 0.25 mm, with the same rounding on each side of the middle plane. A triangle with no area after the packing goes away | 4.4 |
