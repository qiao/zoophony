# Decisions of the rabbit of rabbit-views.png

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-10, after the skins of [`2026-10-10-glb-skins.md`](2026-10-10-glb-skins.md), the user
asked: "make the rabbit look like the reference image". Where this request conflicts with an older
rule, the agent of the rabbit followed the newest decision of the user and the reference image, as
AGENTS.md says, and it decided the other rows. The report
[`2026-10-10-rabbit-sheet.md`](../research/2026-10-10-rabbit-sheet.md) gives the measures. The user
can reverse each decision. Then update the section that holds it, and remove its row.

| Decision | Section |
|---|---|
| The user: the rabbit looks like `rabbit-views.png`. The mesh of the GLB file is the start point, and its form, its limbs, its eyes, and its tail move toward the sheet | 1, 4.4 |
| Conflict: the rule of 2026-10-10 "do not stretch the arms/ legs of the models" of `2026-10-10-bear-glb.md`. The rabbit of the sheet has longer shins and longer arms than the mesh of the file. The shape of the rabbit makes the shins and the arms 1.35 times longer, because the newest decision of the user asks for the look of the sheet. The rule stays for the bear | 4.4 |
| A config of `pnpm rig-body` can give a shape: a scale for each joint of the file in its own axes. The mesh, the joints, and the points of the config take the scaled pose as their rest pose, so the texture and the weights follow. The packer keeps the scale of the file, so longer legs make a taller body | 4.4 |
| The shape of the rabbit: shins 1.35 times longer, feet 1.25 times larger, haunches, thighs, and belly 1.3 to 1.6 times wider and deeper, the spine 0.9 and the neck 0.7 times as long, the head 1.15 times wider, and arms 1.35 times longer. The fitted seat is then 0.32 m high, and the head is at the height of the sheet | 4.4 |
| The eye plates of the rabbit show the eye of the sheet in place of the eye of the texture (`eyeLook` of the config): a black pupil of 0.85 of the eye, a red-brown ring, and two lights from the left of a viewer in front | 4.4 |
| The front of each eye plate gets one UV island by a flat projection on its eye plane, and the plate moves out by the largest bulge of the head under its triangles. The split islands and the cut of the head showed white marks in the eyes. This changes the skins of the rabbit and of the bear | 4.4 |
| The rabbit gets a ball of 80 triangles for the large round tail of the back view of the sheet. The rabbit has 2,596 triangles, under 2,600 | 4.4, 4.5 |
| The knees of the sheet stand apart. A turn of the seated thighs out by 15° moved them apart, but it grew the stage of `mozart-k525.mid` by 5.3%, above the limit of 3% of design 4.5. With 8°, it grew by 4%. The thighs keep the direction to the front | 4.2, 4.5 |
| The fur keeps `#ece6dc`. The page shows it more yellow than the sheet, because of the warm light of the page, and a cooler fur did not change the color median of the page | 4.5 |
| The stage keeps the violin hold of the violinists in front of the chest. The violin of the sheet lies on the left shoulder with the scroll down, and the hold of the stage is a pose rule of all violinists (5.3) | 5.3 |
| `tools/sheet-mattes/rabbit.json` gives the matte of the sheet: the orange wood of the chair and the violin as a hue prop, the violins as polygons, and the bows as lines | 7.1 |
