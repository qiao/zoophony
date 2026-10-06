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
| The short muzzle is two round cheeks under the nose (the rabbit, the cat, the bear, the panda, the monkey). The long muzzle is a full cone of 0.32 H (the fox, the wolf, the deer, the badger) | 4.5 |
| The dog gets the new `blunt` muzzle with a large nose, as the beagles of `mockup.png`. The hippo gets the new `broad` muzzle, 0.88 H wide, as the hippos of `scene.png` (07). With the long muzzle, the dog looked like an anteater, and with the flat nose, the hippo looked like the pig | 4.3, 4.5 |
| The elephant has two tusks of 0.34 H beside the root of the trunk, as in `scene.png` (08) | 4.5 |
| The panda gets black arms, a black band over the shoulders, and black legs (the new accent parts `arms` and `legs`), as the pandas of `mockup.png` and `scene.png` (07) | 4.5 |
| The dog is a beagle: the new face pattern `cap` colors the head brown (`#a0643a`) down to below the eyes, with a white blaze down the middle of the face, as the dogs of `mockup.png`. It replaces the one patch around the left eye. The dogs of the image also wear dark legs, which the cast leaves out | 4.3, 4.5 |
