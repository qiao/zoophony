# Captured environment, step P3

Date 2026-10-18. Round "do it" (user, 2026-10-18), step P3 of
[`2026-10-17-cinematic-lighting.md`](2026-10-17-cinematic-lighting.md). Decisions:
[`2026-10-18-cinematic-light.md`](../decisions/2026-10-18-cinematic-light.md). The probes and their
outputs are in [`2026-10-18-captured-environment/`](2026-10-18-captured-environment/). Each
command runs from the root of the tree.

## 1. The question

Each layout captures its hall and its lit stage as its environment (plan, 4.4). The plan adds a
bounce term of the pool only when the shaded fur still misses the reference. The look lab decides:
the back of the conductor, the floor in front of the podium, and the stage tone.

## 2. The measures

`pnpm look-lab <dir>` on `d1bb9738` (before) and `8b555f68` (after). The outputs are
[`look-end.md`](2026-10-18-cinematic-light/look-end.md) and `look-p3.md`.

| Measure (camera `orchestra`) | Before | After | Reference |
|---|---|---|---|
| Stage luma p5/p25/p50/p75/p95 | 25/61/105/151/204 | 27/62/106/152/205 | 26/58/107/154/212 |
| Back of the conductor: luma, saturation | 45, 0.79 | 50, 0.79 | 52, 0.73 |
| Floor in front of the podium: luma p90 / p5 | 6.5 | 5.6 | 4.7 |
| Floor in front of the podium: shadow color | (38, 13, 5) | (56, 21, 8) | (57, 29, 12) |
| Floor with player shadows: luma p90 / p5 | 4.0 | 4.4 | 2.6 |

`bake_time.ts` of [`2026-10-18-cinematic-light/`](2026-10-18-cinematic-light/) with
`capture-time.patch` times each capture with `gl.finish()` on the development Mac. The output is
`capture-time.txt`.

| Measure | Value |
|---|---|
| Time of one capture, 12 layouts | 7.3 ms to 8.6 ms |
| Time of the first capture, with the compile of its shaders | 32.7 ms |

## 3. The result

The captured environment gives the shadow sides of the players the warm light of the floor. The
back of the conductor comes within 2 levels of the reference, so the bounce term waits. The shadow
in front of the podium now has the color of the reference. Its contrast stays higher, because the
lit floor next to it is brighter (p90 196 against 172): the hot spot of the key light and the
glare of the lacquer.

The floor in the shadows of the players got a little darker (p5 34 against 37). A point of the
floor faces up, and the captured hall above it is dark. The old fixed environment had a bright
box above the stage for the spotlight. The region "floor with player shadows" holds the shadows of
rabbit bodies in the app and of music stands in the reference, so it compares different casters.
