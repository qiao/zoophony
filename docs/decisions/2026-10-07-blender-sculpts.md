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
| A packed coordinate is a step of 0.25 mm, with the same rounding on each side of the middle plane. A triangle with no area after the packing goes away | 4.4 |
| The views page keeps its light, its tone mapping, and its pose. The pose module owns the pose of the violin, and a change of the light moves all species of the page | 4.4, 7.1 |
