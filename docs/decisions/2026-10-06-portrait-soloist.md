# Decisions of the portrait view and the soloist

The Section column names a section of [`design.md`](../design.md).

On 2026-10-06, the user decided two open findings of the UX audit
([`audits/2026-10-05-ux-design.md`](../audits/2026-10-05-ux-design.md)): a lower and more frontal
view in portrait (SC8, 4.5), and the soloist at the front left (AM3, 3.8, 4.2). The agent of
these findings decided the details below. The user can reverse each one. Then update the section
that holds it, and remove its row.

| Decision | Section |
|---|---|
| The portrait rule: its share is a smoothstep from the aspect 1 to the aspect 0.6, and the full rule keeps 0.2 of the azimuth, lowers the elevation by 4°, and moves the camera to 0.68 of the default distance. It removes the zoom of a wide variant and keeps the move of the shot. The high shots and the close shots keep their rules (SC8) | 4.5, 5.6 |
| "Clearly the soloist": a seat with one player, the only seat of its section, with three other seats with players, that sounds in 0.5 of the piece, is above the orchestra in 0.75 of its time (by its key, or by 1.2 times the highest other velocity), and has two other seats with it in 0.6 of its time, on a grid of 0.1 s. Exactly one seat must pass (AM3) | 3.8 |
| A piano seat (a program of 0 to 5) is the soloist, so the piano rule of 4.2 and the soloist rule give one place (AM3). Until N1 of the second audit, each seat of the piano section was the soloist | 3.8, 4.2 |
| The soloist of a violin, a viola, a flute, an oboe, a clarinet, a horn, a trumpet, or a trombone stands. The soloist of another instrument keeps the support of its instrument (AM3) | 4.5 |
| The place of a soloist that does not play the piano: at the front left, facing the audience and turned to the conductor, with no music stand. The front distance keeps 0.3 m in front of its footprint, as of the piano case (AM3). The second audit moved it from 0.05 m to 0.3 m to the front, and the turn from 30° to 40° (N1, the table below) | 4.2, 4.5 |
