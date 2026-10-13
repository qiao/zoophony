# Decisions of the studio bear in the app

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-12, the user decided: "use the studio bear in the app". The agent of the branch
`app-studio-bear` decided the other rows. The report
[`2026-10-12-studio-bear.md`](../research/2026-10-12-studio-bear.md) gives the comparison of the
two routes, the measures, and the images. The user can reverse each decision. Then update the
section that holds it, and remove its row.

| Decision | Section |
|---|---|
| The user: the bear conductor has the studio bear of `lowpoly-studio/animals/bear/out/bear.glb`, with its mesh, its face colors, its eyes, its ears, its claws, its tail, its skin, and its corrective shapes. The app keeps its own conductor motion and its own baton | 4.3, 4.4 |
| The route: the app drives the 30 body bones of the studio with a retarget of the pose of the player on each frame, with four bones for each vertex, the twist bones, and the corrective shapes. The route of the rigged bodies of 2026-10-10 (two bones of the player for each vertex, from the bind pose of the player) had at most 38 folded faces in the conductor poses of all demos, and the retarget at most 9 | 4.4, 4.7 |
| `pnpm studio-body <animal>` writes the module of a studio body from its GLB file with no Blender. It drops the baton and the clips of the studio, and the gloss shells of the head out of the middle plane become eye bones of their own, so that the eyes blink | 4.4, 7.1 |
| The scale of the studio bear puts its shoulder joints 1.0 m above the floor, as the shoulder joints of the parametric bear, because the conductor stand and the beat fit the shoulders. The bear is 1.51 m high (1.62 m before), and its `H` is 0.313 m (0.513 m before) | 4.4, 4.5 |
| The skeleton of the player for a studio body has the joints of the studio, and each arm hangs straight down from the shoulder joint of the studio with the lengths of its arm | 4.4, 4.7 |
| The retarget turns each paw in the plane of its palm toward the forearm, by up to 70°, curls the fingers of the studio around their own axis, gives the forearm twist bone half of the twist of the paw, and weights the corrective shapes with the driver of the studio | 4.4 |
| A studio body keeps the colors of the faces of its GLB file, with the occlusion of the studio, and the scene adds no occlusion | 4.4, 4.5 |
| A studio body has a copy of the shared material with flat shading, so that each face stays flat as in the studio. With the shared material, the GPU skin turned the three normals of a face by different blends, and 30 to 50 faces of the arms and the chest showed soft gradients in each pose (review of the branch) | 4.4 |
| A studio body has a triangle budget of its own of 3,000, because the scene has one conductor. The studio bear has 2,768 faces | 4.4, 4.5 |
| The studio bear stands on the floor. The cast gives the bear only the stand of the conductor | 4.4 |
| The holds of the conductor are in head heights `H` of the bear of the cast, now the studio bear (0.313 m). On 2026-10-10 the places scaled by 1.6 for the code-built bear of the sheet (0.32 m), and on 2026-10-11 back by 1 / 1.6 for the parametric bear (0.513 m). The places of the left hand and the elbows keep their values in `H`. The point and the pivot of the baton are new: the wrist of a soft beat 1 is about 0.35 H up, 0.9 H forward, and 0.85 H out from the shoulder joint, the baton points up 49° and 22° inward, and the pivot is 0.47 m behind the wrist. This row replaces the beat point row and the head-height row of `2026-10-10-bear-body.md`, and the row of the places of `2026-10-11-body-revert.md` | 5.4 |
| The beat plane stays square to the baton at beat 1, with a level x axis. The pivot is as far behind the wrist as the wrist is behind the tip: 0.47 m, about 1.5 H of the studio bear, as 0.91 H of the parametric bear. Thus the wrist follows about half of the motion of the tip. This row replaces the beat plane row of `2026-10-10-bear-body.md` | 5.4 |
| The beat plane turns with the whole turn of the upper body to the right, and with half of a turn to the left | 5.4 |
| In the ready gesture of a count-in, the left hand points 34° up and 44° out, so both paws are 0.63 H above the shoulder joints. The right paw stays 0.3 H further out than the left paw. This row replaces the ready row of `2026-10-10-bear-body.md` | 5.4 |
| A hanging arm checks the paw at a third, two thirds, and the end of its length below the wrist, the hips count as a part of the body, and the arm swings out at least 16° (8° before). The larger swing also moves the hanging wrist of each standing parametric species from 0.335 H to 0.350 H out of the shoulder joint, 5 mm to 8 mm. The parametric bodies passed each test with both swings | 5.2 |
| In the bow at the song end, a hanging arm of the bear follows half of the bend of the upper body | 5.4 |
| The conductor stand stands 8 cm in front of the podium (3 cm before): the post is 0.73 m in front of the podium center | 4.5 |
| The test of the conductor clearance poses the corners with the skin of the GPU, and keeps each point of the paws, the claws, and the baton at most 1.5 cm under the skin of the trunk and the head, the contact depth of the studio. The sweep has six shard files, one demo in each | 5.4, 9.3 |
| The checks that the studio bear fails because they were tuned on the parametric bodies went: the bear in the check of the short standing legs, the studio body in the check of the chair back, the one-bone and the species-color checks for a studio body, and the bear row of the shape table of 4.3. `BEAR_PROPORTIONS` went with them. This row replaces the trunk row of `2026-10-11-short-legs.md` | 4.3, 9.3 |
| Accepted limits: up to 9 faces fold in some conductor poses, mostly at the inner elbows (of the folded faces of all samples, 85% are on the forearms and the upper arms, 13% on the spine and the hips, and 2% on the shoulders and the hands). The colors look warmer under the light of the stage than in the renders of the studio, and the wrist of beat 1 is a little below the chin | 4.4, 5.4 |
