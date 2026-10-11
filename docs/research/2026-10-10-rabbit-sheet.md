# The rabbit of rabbit-views.png

On 2026-10-10, the user asked to make the rabbit look like `rabbit-views.png`. The rabbit was the
rigged GLB body of the user with the skin of
[`2026-10-10-glb-skins.md`](2026-10-10-glb-skins.md). This report gives the measures of the sheet,
the rounds of the shape, and the results. The decisions are in
[`2026-10-10-rabbit-sheet.md`](../decisions/2026-10-10-rabbit-sheet.md).

## The matte of the sheet

`tools/sheet-mattes/rabbit.json` gives the matte for `pnpm sheet-check rabbit`. The background is
dark (`#141313`), so a pixel with a value above 0.17 is animal. The chair and the violins are an
orange wood with a hue of 17° to 45° and a saturation above 0.5. A wider hue range of 12° to 45°
also took a part of the pink inner ears. Polygons cover the three violins with their dark
fingerboards, lines of 9 px cover the bows, and the title rows above row 108 are ignored.

## The measures of the sheet

The sheet page has 314 px for each meter, from the chair seat 110 px above the floor. At this
scale, the head of the sheet is 85 px from the chin to the crown, 0.27 m. The packed rabbit has a
head height `H` of 0.268 m, so the two heads have the same size. The rows of the check, in the
front view after the vertical offset, and in the side view:

| Part | Sheet | Page before |
|---|---|---|
| Knee above the soles | about 0.40 m | 0.30 m |
| Width of the haunches and the thighs | 142 px | 108 px |
| Depth of the torso at the belly | 104 px | 82 px |
| Width of the head at the eyes | 87 px | 76 px |
| Top of the ears (front view) | row 117 | row 143 |

The upper body from the seat to the crown is about 0.75 m in both. Thus the head and the torso
have the size of the sheet, the legs are shorter, and the body is slimmer. The fitted chair of the
page was 0.24 m high, against 0.35 m on the sheet, so the whole rabbit sat 0.11 m too low.

## The rounds of the shape

Each round sets the `shape` of the config, runs `pnpm rig-body rabbit`, and runs
`pnpm sheet-check rabbit`. The scales are for the joints of the file, in their own axes.

| Round | Change | Front | Side | Back | Top of the ears |
|---|---|---|---|---|---|
| 0 | The mesh of the file | 0.557 | 0.368 | 0.505 | 143 |
| 1 | Shins 1.35 long, feet 1.25, haunches and torso 1.25 wide and deep, thighs 1.3, head 1.12, arms 1.15 thick | 0.558 | 0.485 | 0.602 | 86 |
| 2 | Spine 0.9 and neck 0.7 long, thighs 1.45, head 1.15 wide and not taller | 0.602 | 0.424 | 0.620 | 105 |
| 3 | Hips and belly 1.4 to 1.45 deep, thighs 1.5 | 0.542 | 0.562 | 0.611 | 101 |
| 4 | Arms 1.35 long | 0.548 | 0.569 | 0.613 | 101 |
| 5 | Hips 1.35 wide, thighs 1.6, chest 1.05 wide, head 1.15 wide, 0.92 high, 1.05 deep, arms 1.05 thick | 0.554 | 0.569 | 0.612 | 115 |
| 9 | Seated thighs out 15° (rejected) | 0.570 | 0.576 | 0.579 | 115 |

The sheet has the top of the ears at row 117. Rounds 6 to 8 changed the eyes, the tail, and the
fur color, and not the silhouette. The final rabbit is round 8.

The front view turns 20° to show a part of the right side of the animal. A deeper body therefore
moves the silhouette to the right in that view, and round 3 lost 0.06 of front IoU for 0.14 of side
IoU. The violin pose and the bow cover a large part of the front view, so the front IoU stays near
0.55.

The longer shins raise the fitted chair to 0.32 m, near the 0.35 m of the sheet. The longer arms
give the rabbit about the arms of the skeleton that the violin pose was tuned on (0.7 H and
0.65 H), and `pnpm pose-probe rabbit` puts the left wrist 1.30 H in front of the shoulder, at the
neck of the violin.

## The knees

The knees of the sheet stand apart. A turn of the seated thighs out from the front moved them
apart, but the footprint of the rabbit grew:

| Turn of the thighs | Stage of `mozart-k525.mid` | Growth from 6.73 m |
|---|---|---|
| 0° | under 6.93 m | under 3% |
| 8° | 7.00 m | 4.0% |
| 15° | 7.09 m | 5.3% |

`models/layout-scene.test.ts` limits the growth to 3% (design 4.5), so the thighs keep the
direction to the front.

## The eyes

The eye of the sheet is a dark oval: a black pupil fills most of it, with a thin red-brown ring
(about `#4a1a0a`) and a white light at the upper left. The eye of the texture is lighter, with a
wide red ring and a light rim. `eyeLook` paints the eye of the sheet on the plates after the bake:
an oval of 1.1 times the measured eye, a pupil of 0.85 of it, and two lights. The plate is the
larger of 1.35 times the eye and 1.2 times the painted oval, so that a ring of fur stays around
the painted eye.

The first painted eyes showed white marks. Two faults caused them:

- The smart UV project split the curved front of a plate into many small islands. The margins of
  the bake around them held the light rim of the eye of the texture.
- The flat triangles of a plate cut into the head where the head bulges between their corners, so
  the fur of the head showed through the plate.

The front of each plate now gets one island by a flat projection on its eye plane. Each corner of
the front moves out by the largest height of the head in front of its triangles, from rays at 15
points of each triangle, plus the gap of 1.5 mm. A first version moved the whole front by the
largest height of all triangles, and its edge then stood 3.5 mm in front of the head.

## The tail and the colors

A ball of 80 triangles with a radius of 0.055 m in the units of the file stands at the tail of
the file, and the shape of the hips moves it back with the deeper haunches. The rabbit has 2,396
triangles of the mesh, 120 of the plates, and 80 of the tail: 2,596 in all.

The color medians of the front view are 217, 193, 176 on the sheet and 218, 195, 159 on the page.
The page is more yellow because of the warm light of the page. A cooler fur (`#ebe1df`) gave
218, 192, 160, so the fur keeps `#ece6dc`.

## The violin

The violin of the sheet lies on the left shoulder under the chin, with the scroll down by about
15°. The bow paw is low at the chest near the frog, and the bow goes up to the right. The sheet
hold of the views page (`SHEET_MOMENTS.violin`) comes from `fox-views.png`, with the scroll up
15°. The stage keeps its own hold of the violinists in front of the chest. These holds stay, and
the bow arm of the page differs from the sheet.

## Size

The rabbit module is 31,191 B after gzip, and the skin 31,852 B. The first download is 449,479 B
after gzip.

## Images

`rabbit-views.png`, the page before this work, and the page after it:

![The sheet, the page before, and the page after](2026-10-10-rabbit-sheet/sheet-before-after.webp)

The faces of the sheet, of the page before, and of the page after:

![The faces before and after](2026-10-10-rabbit-sheet/faces-before-after.webp)

The silhouette difference after this work (red: the sheet only, blue: the page only):

![The silhouette difference](2026-10-10-rabbit-sheet/silhouette-diff-after.webp)

The rabbits of the first violins on the stage, from the snapshot of commit `91524340`:

![The rabbits on the stage](2026-10-10-rabbit-sheet/play-rabbits.webp)
