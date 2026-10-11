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
| The user: the rabbit takes the model of the rigged GLB file `assets/models/rabbit/rabbit.glb`. The file goes into the repository unchanged, and the app reads only the packed module and the skin of it | 4.4 |
| The user: the 27 tests that the rabbit failed go. These tests checked the parametric ears, tails, face patterns, and shoulder balls with the rabbit as the sample, one bone for each triangle, the reach of the violin bow and of the fingerboard, the clearance of the arms, the stance and the chair offset of the rabbit, and two shots | 4.4 |
| The rigged file is the source. The skin of its Mixamo skeleton stays, so the tool makes no weights of its own. The unrigged files of the user are not in the repository | 4.4 |
| Each vertex keeps the two largest weights of the file, because the app blends two bones (4.7). The skin of four bones of route B needs bind frames, which the app no longer has | 4.7 |
| The ears, the tail, and the finger blocks get bones that the file does not have: each takes a part of the weight of the head, the hips, or the hand along its axis, from the config `tools/glb-bodies/rabbit.json` | 4.4, 4.7 |
| The packed mesh is a T-pose, and the app poses it on the CPU for each stance with the same weights. Thus one module serves each seat and the stand | 4.4, 4.7 |
| The bones of the middle of the body and the tip of the nose go onto the middle plane. The Mixamo hips are 2.8 mm off it | 4.4 |
