# Decisions of the shot composition findings of the second UX audit

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-06, the agent of the shot composition findings of the second UX audit
([`audits/2026-10-06-ux-design-2.md`](../audits/2026-10-06-ux-design-2.md)) decided the details
below. The user can reverse each one. Then update the section that holds it, and remove its row.

| Decision | Section |
|---|---|
| The foreground rule also rejects a head nearer than 0.95 of the focus distance with a radius on the screen of more than 0.24 of half the frame height (of the geometric mean of the half sides of a portrait frame), and another object whose near boxes cover more than 15% of a grid of 20 × 20 cells over the frame (N1, N2) | 5.6 |
| The foreground rule tests a desktop view (aspect 1.6) and a phone view in portrait (aspect 0.46), and the plan keeps one camera for all views (N3) | 5.6 |
| The room for each missing shot of rule 3 before the last shot is 9.5 s (was 6.5 s) (N3) | 5.6 |
| A section or solo shot rises with `10 × back` or `12 × back`, and the search has three elevation bands up to 30°, 40°, and 50°, the next band only when no candidate of the cut has a clear camera in the band below, except for the best candidate at its entry, which gets all bands at once, and a candidate within 1.0 of the best score, which gets the band up to 40° at once. A near head with only a thin cap in the frame does not count. The bear stays out of the desktop frame of a solo shot of the soloist (N4) | 5.6 |
| The seeded azimuth offset of a close shot is a multiple of 6°, so that the planner keeps the test result of each camera of a subject, and the line of sight to the target has 17 test points in a move | 5.6 |
| A wide or high shot comes at least every 60 s: after 45 s with no wide view, the wide and high candidates get 8, a close shot ends at most 60 s after the last wide view, and a late last shot brings a wide view at the last cuts with room (N6) | 5.6 |
| After a conductor shot that fills a rest, the other framing of the conductor fills the next cut with no subject, in place of a wide shot | 5.6 |
| A cut can also fall on the middle beat of a bar (-0.3), the phrase bonuses are +0.5 and +0.2, and the wanted length of a close shot is 5 to 12 s. The check of the audit (6 lengths in each demo) became 5 lengths, and no length in more than half of the shots, because K. 525 allows only 5 (N5) | 5.6 |
| The camera of a section or solo shot turns at least 20° in azimuth from the last shot of the same subject (N7) | 5.6 |
| A change to Free mode from a close shot also moves the camera out to at least 0.6 of the default distance, in the same 0.4 s (N19) | 2.5 |
| The soft shadow edge of the spotlight takes 12 samples of a fixed Vogel disc in place of 5 samples turned by a noise (SC5) | 4.5 |
