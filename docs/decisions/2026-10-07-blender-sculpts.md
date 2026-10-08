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
| A sculpt holds the body above the legs one time, and the legs of two stances: seated with a drop of 0.35 m from the seat to the feet, and standing. On another seat, the body stays parametric. Stage P3 adds the legs of the bench of the piano for a species that plays the piano (below) | 4.4 |
| Rules give the skin weights of a sculpt: a height field for the trunk, a chain rule for the tail, and rigid parts for the hands, the eyes, the ears, the arm capsules, and the paws. A cut along the borders of the main bones keeps each trunk triangle on one joint | 4.7 |
| The arms of a sculpt are two rigid faceted capsules on `upperArm` and `forearm` that overlap at the elbow | 4.4, 4.7 |
| Plane cuts give the color borders of a sculpt, so each border is a straight line | 4.3, 4.4 |
| A packed coordinate is a step of 0.25 mm, with the same rounding on each side of the middle plane. A triangle with no area after the packing goes away | 4.4 |
| The foxes and the wolf share one recipe of the dog family (`tools/blender/canine.py`). A species file gives the measures in H, and the accent parts of the species color the hands, the lower legs, the feet, and the ears | 4.4 |
| The red fox follows `fox-views.png`: a round skull, a short muzzle, large ears with dark tips and a light inside with a rim of fur, large eyes with a white and a brown iris (`#6e3a1e`), gloves on the lower half of the forearms, round haunches, and a larger tail brush | 4.4, 4.5 |
| The tan fox has the forms and the eyes of the red fox, with its own colors and amber iris | 4.4 |
| The legs of a sculpt are two rigid shells on `thigh` and `shin` that overlap at the knee, as the arms. One shell across the knee had an open part on each bone | 4.4, 4.7 |
| The tail of a sculpt keeps the depth of the parametric tail, because the packed rows of the layout follow it. The tail of the red fox hangs to its right side behind the chair, and does not lie on the seat as in `fox-views.png` | 4.4 |
| The dog stays parametric in stage S1. Its reference `dog-views.png` needs new forms and a new color, which S2 adds | 4.4 |
| The rabbit has a dark brown iris (`#3d150a`) with a black pupil, as the eyes of `rabbit-views.png` (`#2e0a04` to `#501004` around the pupil). Its eyes were black from the rim to the pupil | 4.5 |
| The rabbit sculpt is wired in at stage P1. Its head and its torso are soft unions of ellipsoids (`kit.blob()`, a metaball of Blender), because a hull of ellipsoids made flat planes on the sides of the head. Its thighs and its feet are soft unions too, and its lower legs and arms are remeshed hulls | 4.4 |
| The knee of the rabbit sculpt is small and 0.06 H behind the knee bone, and the top of its lower leg is 0.1 H under the knee, so that the bow hand of the violin keeps out of the thigh at the tip of a down-bow (66 s, 122.5 s, and 269.5 s of Boulanger) | 4.4 |
| The paws of the rabbit grow 0.05 H toward the back of the hand (`kit.hand()` with `back`), and the palm side keeps its place, so that the bow stick keeps 0.015 H to 0.03 H from the palm | 4.4 |
| On 2026-10-08, the agent of the fox look matched the red fox to a checklist of the features of `fox-views.png` (`docs/research/2026-10-08-fox-look.md`). The rows below hold its details. They replace the forms of the rows above where they differ: the skull, the gloves, and the ears | 4.4 |
| The red fox fur is `#ac6236`, the belly `#eee2e0`, and the accent `#603a2a`, in place of `#915125`, `#ece8ff`, and `#453334` (`2026-10-07-cast-colors.md`). The views page shows the fur at 113 against 160 in the sheet, and the default view at 143, the top of the range of `orchestra-latest.png`. A brighter fur passes that range in the default view | 4.5 |
| The white of the red fox is a little pink (`#eee2e0`, hue 9). A cream white of the sheet (hue 27) had a hue of 34 and a saturation of 0.4 in the default view | 4.5 |
| The eyes of the foxes are 0.085 H below their bones and 0.05 H further out: a white almond 0.34 × 0.18 H with a dark lid of 0.028 H (`#24160f`) at its top, a round iris 0.176 H wide, a pupil of 0.45 of the iris, and a light of 0.022 H (`#f6f2ea`). The parts point their poles to the front. A blink scales each eye toward its bone, so the eye moves up a little as it closes | 4.4, 4.5, 4.7 |
| The ears of the foxes have a base 0.36 H wide from 0.1 H above the ear bone to 0.22 H below it, turned 20°, and a tip 0.58 H above the bone and 0.3 H to the front. The top 0.35 is dark, and the faces that point back and out are dark down to 0.7 of the height | 4.4 |
| The head of the red fox has a skull 0.94 H wide with a flat crown, cheek tufts 0.17 H below the head center, a ball in each cheek ruff at the chin for a V lower face, and a nose 0.14 H wide | 4.4 |
| The white of the face of the red fox reaches up to 0.08 H below the head center and back to a border 0.15 H in front of it, which leans back by 0.5 H for each H down | 4.4 |
| The bib of the red fox is 0.48 H wide at the shoulder joints and 0.68 H wide at 0.66 H above the base of the torso, with a V to a point 0.15 H above the base. It stays on the front of the torso | 4.4 |
| The gloves of the foxes cover the hands and the lower 1/4 of the forearms. The socks cover the paws and the lower 0.52 of each shin from the hock, the part of the seated shin below 0.26 m | 4.4 |
| The pear of the torso of the red fox is 0.8 H wide (0.84 H before), so that the right upper arm of the standing violin soloist keeps 0.011 H from the torso (limit 0.01 H) | 4.4, 5.2 |
| The fox sculpts decimate the trunk to 430 triangles and the tail to 95, and each lower leg has balls of 3 rings, so that the new parts keep the budget: 2,526 triangles for the red fox in each stance | 4.4 |
| The kit collapses each edge shorter than 0.1 mm of a decimated half before the mirror, because two slivers on the same corners stopped the build. A half with no such edge keeps its bytes | 4.4 |
| The views page keeps its light, its tone mapping, and its pose. The pose module owns the pose of the violin, and a change of the light moves all species of the page | 4.4, 7.1 |
| On 2026-10-08, the agent of stage P2 matched the wolf to a checklist of the wolves of `orchestra-side.png` and `orchestra-latest.png` (`docs/research/2026-10-08-dog-family.md`). The wolf gets the flat crown, the V face, the white cheek patch, the wide ears with a dark inside and a rim, and the pointed bib of the fox look. Its torso is broad (0.96 H at the belly), and its trunk has 500 triangles | 4.4 |
| A species of `canine.py` can give its hands and gloves a color region (`hand_region`). The wolf has the belly color on its hands and on the lower 0.15 of its forearms, as the light hands of the scenes | 4.4, 4.5 |
| The wolf fur is `#585e7c` in place of `#645e6f`. The warm key light gave the old fur a saturation of 0.39 to 0.40 on the lit head in the default view, against 0.19 to 0.30 in the scenes. The new fur gives 0.25 | 4.5 |
| The packer of `tools/build-sculpt.ts` makes a corner rigid when its blend weight packs as 0 steps. Such a corner kept its second bone before | 4.4, 4.7 |
| On 2026-10-08, stage P2 gives the dog its first sculpt (`tools/blender/dog.py`), from `dog-views.png`: one golden color on the trunk (`plain`), a black accent nose, dark eyes with a light, soft hanging ears (`ear_hang`), a thick neck under broad shoulders (`neck`, `yoke`), thick arms (`arm_radii`), long fur at the chest, behind the elbows, and under the thighs (`chest_ruff`, `arm_feather`, `leg_feather`), large paws, and a plume of a tail that hangs behind the chair. It replaces the parametric dog of the row of stage S1 above | 4.4 |
| The plume of the dog ends 0.15 m above the floor on the chair, so that its tip stays above the floor in the standing stance. It is 1.1 Hv long (sheet 1.59) | 4.4 |
| The long fur behind the forearm of the dog is short and near the elbow. A fin at the middle of the forearm took the bow stick 0.002 m into the forearm at 60.4 s of the cello part | 4.4 |
| The hands of the dog grow 0.05 H to their backs and the finger balls move 0.03 H up the hand, as the parametric mitten. With the canine hand of the foxes, the bow lay 0.0143 H from the palm (limit 0.015 H) and 0.012 m in the finger ball at 224 s | 4.4 |
| The dog fur is `#f2d08e`, the belly `#f8e8c0`, and the accent `#1d1a19` on the nose only, in place of the gray beagle with a brown cap (`#bcb1c0`, `#c9bfd0`, `#44270f`). In the default view, the lit head has a value of 236 with a hue of 35 and a saturation of 0.55, as `dog-views.png` | 4.5 |
| The cat is plain gray with no stripes (decision D10 of the anatomy plan), with a pink accent `#d9928c` on the inner ears and the nose, and the bluer fur `#747a98`, as the cats of `orchestra-side.png`. Its skeleton stays: the report measured it within 10% of the scenes | 4.3, 4.5 |
| Stage P3: the sculpt of a species that plays an instrument on the bench of the piano (the polar bear) also holds the legs on the bench of 0.45 m, between the seated and the standing legs. Its body above the legs comes from the seated stance, as for each sculpt. Without these legs, the polar bear at the piano had the parametric body | 4.4 |
