# Decisions of the camera and stage findings of the UX audit

The Section column names a section of [`design.md`](../design.md).

On 2026-10-06, the agent of the camera and stage findings of the UX audit
([`audits/2026-10-05-ux-design.md`](../audits/2026-10-05-ux-design.md)) decided the details below.
The task let it reverse choice D of the camera report. The user can reverse each one. Then update
the section that holds it, and remove its row.

| Decision | Section |
|---|---|
| The first shot is the default view with a push-in to 0.88 and the length of a wide shot (choice D reversed, FI1). Rule 3 counts the opening as a wide shot, and each missing shot of rule 3 needs 6.5 s before the last shot | 5.6 |
| A weak spotlight from the orchestra side lights the face of the conductor with 3 lux (choice F reversed, FI1). It stands 3.2 m in front of the face and 2.4 m above it, and it casts no shadow | 4.5 |
| The sight points of a solo or a conductor shot, the clear line to the head, and at most one hidden line of the hands and the instrument. Each line starts 0.15 m from its point, and skips the boxes within 0.25 m of it (SC1) | 5.6 |
| The foreground rule: the shares 0.75 and 0.95, the middle of the frame of 0.4 × 0.6, the desktop aspect 1.6, and a head sphere of 0.6 `H` (SC1) | 5.6 |
| The piano view: a turn of 88° to the right of the pianist, a quarter of the seeded offset, and 20° more elevation (SC1) | 5.6 |
| The lead (the top line in half the window, read every 0.25 s, or 0.15 above the mean loudness of the other active seats), its bonuses of 1.2 for a solo and 0.6 for a section, and the first voice at the first cut (SC4) | 5.6 |
| The desk of the conductor stand at 0.80 m above the podium top, at the chest of the bear (AM1) | 4.5 |
| Beat 1 at 0.45 H up and 1.3 H forward, the pivot at 0.1 H up and 0.3 H forward, the unit of 0.5 m, and the baton of 0.51 m (AM1) | 4.6, 5.4 |
| The target of the conductor shot of the face is 1.25 m above the podium top, since the desk is at 0.80 m (AM1). First it was 1.5 m, as in the report | 5.6 |
| The bow of the conductor at the song end: 0.8 s, 0.7 s down, 0.6 s hold, 0.7 s up, 32° of the spine and half of that of the head, to the orchestra (AM2) | 5.4 |
| The desk colors of the stands: `#544840` for the large faces and `#a08b7a` for the edge (SC9) | 4.5 |
| The move of the orbit target to the stage center after a close shot: 0.4 s, from 1 m away or more, at once with reduced motion (SC6) | 2.5 |
| The shadow map covers 0.75 of the cone, and the normal bias is the texel size times the blur radius plus 2 (SC5) | 4.5 |
| The conductor framing over the shoulder (2.0 m in front of the bear, 1.2 m high, a sphere of 1.8 m, 20° up, ± 8° to 20°, a push-in to 0.92), the turns of the two framings, five other shots between two conductor shots, and the conductor before a wide shot when no subject fits (SC3) | 5.6 |
| Each close camera stays nearer to the stage center than 0.44 of the default distance, and the path of a blend is tested at 65 points | 4.5, 5.6 |
