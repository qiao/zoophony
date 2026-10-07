# Decisions of the camera angle

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-07, the review `reviews/2026-10-07-mockup-match.md` ranked the steep default view as
the fourth gap to `reference/mockup.png`, and proposed an elevation of about 20°. The camera
angle agent measured the mockup and the view, and lowered the view as far as the test of the
hidden heads permits. The agent decided the details below. The user can reverse each one. Then
update the section that holds it, and remove its row.

| Decision | Section |
|---|---|
| The default view has the elevation 24° (was 28°). `mockup.png` looks down at the podium at about 17° (a square top) to 26° (the box of 4.5), and at the kettle heads of the back row at about 11°: a kettle head is 0.19 to 0.20 as high as it is wide. At 28°, the view looked down at the podium at 35° (the top of the podium was 2.48 times its front face, 1.6 to 1.76 in the mockup). At 24°, it looks down at it at 30° (2.03 times) | 2.5, 4.5 |
| 24° is the lowest whole degree that passes the test of the hidden heads at its limit of 10%. The hippo of the contrabasses of Beethoven 9 hides 0.9% of the head of a choir penguin at 28°, 4.6% at 26°, 8.8% at 24°, 9.5% at 23.75°, 10.6% at 23.5°, 17.4% at 20°, and 28.8% at 14°. A lower view needs a change of the seats or the risers of the large species (4.2) | 4.2, 4.5 |
| The pairs where any animal hides 10% or more of the head of another animal in the default view of the demos and the test files grow from 2 at 28° to 5 at 24° (15 at 20°). The worst pair is the red fox of the violins that hides 36% of the head of the oboe mouse of K. 315 (18% at 28°). The polar bear of Boulanger hides 7.8% of the head of a horn pig (0% at 26°). No test limits these pairs | 4.2, 4.3 |
| The distance and the target stay. The players keep their part of the free width (0.04 to 0.95 at 1440 × 900 with the drawer open), and the heads are 3% larger in pixels (a mean of 36.4 px against 35.4 px in Boulanger). A target 0.5 m higher put the orchestra in the middle of the frame of the mockup, but it also raised the camera, and the view looked down at the podium more steeply | 4.5 |
| The first wide variant takes its azimuth and its elevation from the default view, so it follows the change. The portrait rule keeps its 4°, so a phone looks down at 20° | 4.5, 5.6 |
| The wide views of `models/test-silhouettes.ts` (the soloist test of 4.5) still hold the default view of 2026-10-05: the azimuth 30°, the elevation 28°, and the full default distance. The models area owns that file, so this session did not change it | 4.5 |
