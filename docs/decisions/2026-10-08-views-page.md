# Decisions of the views page for the model sheets

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-08, the agent of the views page decided the details below. The model agents compare
each species with its model sheet in `docs/reference/` on the views page, and the page gave a
wrong picture: a neutral light and tone mapping, and the playing pose of the Beethoven 9 demo.
The report [`2026-10-08-views-page.md`](../research/2026-10-08-views-page.md) gives the measures
and the side-by-side images. The user can reverse each one. Then update the section that holds
it, and remove its row.

| Decision | Section |
|---|---|
| The query `sheet` of `views.html` shows one species as its model sheet: `fox`, `rabbit`, `dog`, or `polar-bear`. The page has the size, the background, the scale, and the camera angle of the sheet, and the seat of each view stands on the place of the chair of the sheet. It has no labels | 7.1 |
| The scale of a sheet comes from its chair seat (0.35 m) when it has no scale of its own (`fox-views.png`, `rabbit-views.png`), and from its meter marks when it has them (`dog-views.png`, `polar-bear-views.png`) | 7.1 |
| The views of a sheet page turn as the chairs of the sheet show: the front of the rabbit 20°, and the side views of the fox, the rabbit, and the dog 65°, 70°, and 80° from the front | 7.1 |
| The front view of the polar bear hides the piano, because its open lid hides the head. The bone of the instrument scales to 0 | 7.1 |
| The views page has the tone mapping of the stage (AgX) with the exposure 1.15, and each material adds the grade of the final pass of the stage after the tone mapping. The grade is one GLSL function, `GRADE_FUNCTION`, for the stage and the views page, with one lookup table (`gradeLut()`) | 4.5, 7.1 |
| The light of the views page is a warm key `#ffd0a0` of 2.6 from the left, above, and the front, a warm fill of 1.6 (sky `#fff4e8`, ground `#6a5a4a`), and a white rim of 1.5 from behind. A cool fill (`#c8d4ff`) made the shaded white fur blue-gray (hue 353 on the rabbit, 26 in its sheet) | 7.1 |
| One light serves all four sheets and the pages of `animals.webp` and of the bears. The lit fur of each sheet matches within 10% in value. The dog reads 9% lighter and 8° more yellow than its sheet, and the polar bear 10° more yellow, because their base colors (`#f2d08e` and `#f4e9dd`) are more yellow than the fur of the sheets. The light does not change for them, because the rabbit and the fox match | 7.1 |
| `playingPoses()` keeps the `instrumentOffset` of the pose, so that the violin and the viola of the views page have the play shift of the stage | 7.1 |
| A bowed hold can turn the instrument around its bone while the player plays (`BowedHold.playTurn`), and `bowedRig()` takes a hold in place of the hold of the stage. The holds of the stage keep the turn of the bind pose | 5.3 |
| The sheet pose of the cello plays a G3 at 2 s into a note of 4 s, with the bow square across the strings (no slant). The cello keeps the hold of the stage, because a turn of 12° to upright put its neck into the head of the dog | 7.1 |
| The sheet pose of the polar bear plays C3 and C5, with the palms on the keys | 7.1 |
| `pnpm screenshots` saves each sheet page as `<id>-sheet-views.webp` | 7.1, 9.8 |
