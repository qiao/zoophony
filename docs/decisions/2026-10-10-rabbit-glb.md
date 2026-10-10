# Decisions of the rabbit from a GLB file

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-10, the user gave a GLB file of a rabbit and asked: "copy it into the repo, resize,
modify it when needed, and use this for the rabbit model". The user then gave a newer file with
fewer triangles, and then a rigged file, and added: "just use this model, do not compare against
reference". When 27 tests failed, the user asked: "remove all these tests". The agent of the
rabbit decided the other rows. The report
[`2026-10-10-rabbit-glb.md`](../research/2026-10-10-rabbit-glb.md) gives the measures. The user can
reverse each decision. Then update the section that holds it, and remove its row.

| Decision | Section |
|---|---|
| The user: the rabbit takes the model of the rigged GLB file `assets/models/rabbit/rabbit.glb`, with no comparison against `rabbit-views.png`. The file goes into the repository unchanged, and the app reads only the packed module of it | 4.4 |
| The user: the 27 tests that the rabbit failed go. These tests checked the parametric ears, tails, face patterns, and shoulder balls with the rabbit as the sample, one bone for each triangle, the reach of the violin bow and of the fingerboard, the clearance of the arms, the stance and the chair offset of the rabbit, and two shots | 4.4 |
| The rigged file is the source. The skin of its Mixamo skeleton stays, so the tool makes no weights of its own. The unrigged files of the user are not in the repository | 4.4 |
| Each vertex keeps the two largest weights of the file, because the app blends two bones (4.7). The skin of four bones of route B needs bind frames, which the app no longer has | 4.7 |
| The ears, the tail, and the finger blocks get bones that the file does not have: each takes a part of the weight of the head, the hips, or the hand along its axis, from the config `tools/glb-bodies/rabbit.json` | 4.4, 4.7 |
| The rabbit is 1.6 m high to the tips of its ears, as the parametric rabbit was, so that the layout keeps its rows | 4.4 |
| The mesh collapses from 3,148 to 2,436 triangles, so that the eye plates keep the body under 2,600 | 4.4, 4.5 |
| Each face takes the region of the nearest color of the palette of the config (fur, accent, dark). The app paints the fur and the accent in the colors of the species, and the dark region in the dark color of the palette. Each face in the box of the eyes is fur, under the eye plates. The texture itself does not ship | 4.4 |
| Eye plates on the eye bones cover the eyes of the texture, so that the eyes blink | 4.4 |
| The packed mesh is a T-pose, and the app poses it on the CPU for each stance with the same weights. Thus one module serves each seat and the stand | 4.4, 4.7 |
| The upper arms and the forearms stretch to the arm lengths of the skeleton, so that the paws reach the instruments. The arms of the file are 0.52 H and 0.48 H long | 4.4, 4.5 |
| On a seat, the haunch rests on the seat, the thighs slope 20° down, and the shins stretch from 0.6 to 1.8 times their length until the feet reach their rest | 4.4, 4.5 |
| The bones of the middle of the body and the tip of the nose go onto the middle plane. The Mixamo hips are 2.8 mm off it | 4.4 |
| `pnpm pack-rigged` of route B stays, as the user decided on 2026-10-09. `pnpm rig-body` is a second tool, with the format of `models/rigged-format.ts` and the codec of `models/packed-mesh.ts` | 4.4 |
