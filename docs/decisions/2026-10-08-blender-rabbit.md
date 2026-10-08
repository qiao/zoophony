# Decisions of the Blender rabbit

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-08, the agent of the Blender rabbit decided the details below. The rabbit sculpt is
built on the skeleton of option A of
[`2026-10-07-proportions.md`](../research/2026-10-07-proportions.md), and stage P1 wires it in.
The note [`2026-10-08-blender-rabbit.md`](../research/2026-10-08-blender-rabbit.md) gives the
measures and the test runs. The user can reverse each one. Then update the section that holds it,
and remove its row.

| Decision | Section |
|---|---|
| The rabbit has its own recipe family (`tools/blender/leporine.py`), and follows `rabbit-views.png`: a round soft head with a short muzzle and full cheeks, large dark eyes with a light, a small pink nose, long leaf ears with pink insides, an upright pear body, round haunches, thick lower legs that slant back to long feet, and a round puff tail | 4.4 |
| The eyes of the rabbit sculpt lie 0.14 H above the eye bones, as in the sheet. A blink closes each eye down to its bone, near its lower edge | 4.4, 4.7 |
| The trunk and the thighs of the rabbit sculpt get a seeded move of each vertex along its normal (at most 0.014 H), so that the facets turn against each other as in the sheet | 4.4 |
| The palm ball of the rabbit is 0.12 × 0.1 × 0.14 H, so that the bow stick keeps 0.015 H to 0.03 H from the palm and the finger block | 4.4 |
| The steps that two recipe families share are functions of `tools/blender/kit.py`. `canine.py` keeps its own copies until the fox branch of stage P1 merges | 4.4 |
