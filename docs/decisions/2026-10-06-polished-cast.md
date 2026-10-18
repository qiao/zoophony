# Decisions of the polished cast

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-06, the user added the polished reference images `mockup.png` and `scene.png`, and
asked for a result that is as close to them as possible (section 1). The agent of the cast (the
animals and their instruments) decided the details below. The user can reverse each one. Then
update the section that holds it, and remove its row.

| Decision | Section |
|---|---|
| Each triangle has a finish, and one material reads the roughness and the metalness of each finish from a table of one texel for each finish. A material group for each finish would cost up to three draw calls for each player, in the main pass and in the shadow pass | 4.4, 4.5 |
| The head is a round ball with full cheeks and a flat face, a loft of eleven rings with 16 corners, in place of the head of `animals.webp` that came to a point at the muzzle. It keeps the size of 1.0 × 1.26 H, so the holds and the seat rows do not change | 4.5 |
| The short muzzle is two round cheeks under the nose (the rabbit, the cat, the bear, the panda, the monkey). The long muzzle is a full cone of 0.25 H (the fox, the wolf, the deer, the badger) | 4.5 |
| The hippo gets the new `broad` muzzle, 0.88 H wide, as the hippos of `scene.png` (07). With the flat nose, the hippo looked like the pig. The `blunt` muzzle of the parametric dog of this row ended with the dog mesh of [`2026-10-17-mesh-dog.md`](2026-10-17-mesh-dog.md) | 4.3, 4.5 |
| The elephant has two tusks of 0.34 H beside the root of the trunk, as in `scene.png` (08) | 4.5 |
| The panda gets black arms, a black band over the shoulders, and black legs (the new accent parts `arms` and `legs`), as the pandas of `mockup.png` and `scene.png` (07) | 4.5 |
| The bowed strings have an arched body with round edges, f-holes, pegs, and a round scroll, in two colors of varnished wood: a light orange-brown top and darker edges and ribs, as the violins and cellos of `scene.png` (06, 04). The new parts stay inside the box of the first slab, because the box sets the seat rows | 4.5, 4.6 |
| The timpani are deep round copper bowls of 16 faces with a silver hoop, on three black legs, as in `scene.png` (08). The radius keeps the box of the first bowl, but the legs change the bands of the footprint, so the stage of the choir demo is 11.98 m (was 12.0 m) | 4.5 |
| The clarinet is black with silver rings and keys, as the clarinet of the wolf in `mockup.png`. The flute of the wolf in `scene.png` (07) and the horns of the pandas there do not change the map of 4.3, because `mockup.png` shows the wolf with a clarinet and the pandas with trombones, as 4.3 does | 4.3, 4.5 |
| The models get finer facets (heads of 16 corners, torsos of 16, limbs of 10 sides) and no random jitter of the vertices. The animals of the polished images have smooth regular facets. The cast did not try a jitter | 4.5 |
