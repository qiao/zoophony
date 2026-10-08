# Decisions of the camera angle

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-07, the review `reviews/2026-10-07-mockup-match.md` ranked the steep default view as
the fourth gap to `reference/mockup.png`, and proposed an elevation of about 20°. The camera
angle agent measured the mockup and the view, and lowered the view as far as the tests of the
hidden heads and the title permit. The agent decided the details below. The user can reverse
each one. Then update the section that holds it, and remove its row.

Later on 2026-10-07, the newest reference `orchestra-latest.png` replaced the rows of the
elevation of 25°, the camera height from the hidden heads, the pairs of hidden heads at 25°, and
the distance ([`2026-10-07-scene-latest.md`](2026-10-07-scene-latest.md)).

| Decision | Section |
|---|---|
| The target is 0.25 m below the stage top. At 24° above the stage top, the lit rim of the hall stood behind the logo, so the logo got a shade (2.8), and a lamp glow touched the play button of a short screen of 844 × 390. At 25° above the stage top, they still failed. At 26°, they passed. A target from 0.15 to 0.35 m below the stage top passes them at 25°. A target that moves down with the camera (0.12 m) moved the near players more than the far hall, and failed both | 2.8, 4.5 |
| The opening, the wide shots, the closing, and Free mode use the target of the default view (`DEFAULT_TARGET`). The first wide variant takes its azimuth and its elevation from the default view. The portrait rule keeps its 4°, so a phone looks down at 21° | 2.5, 4.5, 5.6 |
| The wide views of `models/test-silhouettes.ts` (the soloist test of 4.5) still hold the default view of 2026-10-05: the azimuth 30°, the elevation 28°, and the full default distance. The models area owns that file, so this session did not change it | 4.5 |
