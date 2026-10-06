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
