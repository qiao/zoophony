# Decisions of the rabbit of rabbit-views.png

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-10, after the skins of [`2026-10-10-glb-skins.md`](2026-10-10-glb-skins.md), the user
asked: "make the rabbit look like the reference image", then "make it more lookalike", and "its
ok to relax existing constraints". Where this request conflicts with an older
rule, the agent of the rabbit followed the newest decision of the user and the reference image, as
AGENTS.md says, and it decided the other rows. The report
[`2026-10-10-rabbit-sheet.md`](../research/2026-10-10-rabbit-sheet.md) gives the measures. The user
can reverse each decision. Then update the section that holds it, and remove its row.

On 2026-10-11, the user reverted the rabbit and the bear to the parametric bodies
([`2026-10-11-body-revert.md`](2026-10-11-body-revert.md)). The row of the form of the rabbit
in the app went then. The rows of the config of the tools and of the hold stay.

| Decision | Section |
|---|---|
| A config of `pnpm rig-body` can give a shape: a scale for each joint of the file in its own axes. The mesh, the joints, and the points of the config take the scaled pose as their rest pose, so the texture and the weights follow. The packer keeps the scale of the file, so longer legs make a taller body | 4.4 |
| The eye plates of the rabbit show the eye of the sheet in place of the eye of the texture (`eyeLook` of the config): a black pupil of 0.85 of the eye, a red-brown ring, and two lights from the left of a viewer in front | 4.4 |
| The front of each eye plate gets one UV island by a flat projection on its eye plane, and each corner of the plate moves out by the largest bulge of the head under its triangles. The split islands and the cut of the head showed white marks in the eyes. This changes the skins of the rabbit and of the bear | 4.4 |
| The rabbit gets a ball of 80 triangles with a radius of 0.065 in the units of the file for the large round tail of the back view of the sheet, at 0.16 behind the hips, out of the deeper haunches | 4.4, 4.5 |
| The rabbit smooths its mesh two times by 0.3 and collapses to 1,500 triangles, for the large and clean facets of the sheet (about 1,150 triangles). The forearms and the paws keep their detail in the collapse, so that the stick of the bow lies in the fingers. A Laplacian smooth that keeps the volume made spikes. The rabbit has 1,696 triangles | 4.4, 4.5 |
| The fur keeps `#ece6dc`. The page shows it more yellow than the sheet, because of the warm light of the page, and a cooler fur did not change the color median of the page | 4.5 |
| The rabbits hold the violin on the left shoulder, on the stage and on the sheet page (`holdOf()` of `pose/bowed-rig.ts`): turned 25° toward the front with the scroll 8° down, the spine 10° forward, the bow 5° from square, and the bow at rest across the lap. The other violinists keep the hold in front of the chest. `2026-10-11-body-revert.md` gives the places for the parametric rabbit | 5.3, 7.1 |
| The sheet page of the rabbit has 1.5 times the fill light, because `rabbit-views.png` has a soft light | 7.1 |
| `tools/sheet-mattes/rabbit.json` gives the matte of the sheet: the orange wood of the chair and the violin as a hue prop, the violins as polygons, and the bows as lines | 7.1 |
