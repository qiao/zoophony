# Decisions of the fixes of the review of step 8

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-06, the review fixes agent fixed the findings of `docs/reviews/step-8/review.md` in
its own files, and a bug that the user found. The agent decided the details below. The user can
reverse each one. Then update the section that holds it, and remove its row.

| Decision | Section |
|---|---|
| The head of `index.html` links `style.css` and `ui/ui.css`, and no script imports them. The user saw a white page with a black disc for a moment at each reload of the dev server, because the import in the script loaded the styles after the script ran. `pnpm smoke` (dev server) and `e2e/first-screen.e2e.ts` (build) hold each script request and check the first paint: at most 2% white pixels, and no fill of the load ring | 2.8 |
| The canvas fills the window at all times. Beside the open drawer and above the sheet of a phone, the camera moves its frame with `setViewOffset()` in place of a move of the canvas, so the opaque canvas of the post effects shows no edge (review M3). The frame follows a change with a time constant of 50 ms (98% in 200 ms). The attribute `data-frame` of the canvas gives the frame to the end-to-end tests | 2.8, 4.5 |
| A close shot (conductor, side, section, solo) fits its full frame into the free area above the bar and left of the open drawer: the frame shrinks to 832 / 900 on a desktop, and the camera renders the rest under the bar. The wide views keep the full frame, so that the default view keeps its size. The camera of the shot does not change, so the plan and its tests do not change (review M4) | 4.5, 5.6 |
| While the play button of the first screen shows, the frame of the camera shrinks until the stage is 12 px clear of the load ring: toward the top of the orchestra for a button below the stage, toward the left edge of the stage for a button at its right. The camera and the default view do not change, so the click on Play makes no cut. After the first play, the frame grows back in about 0.4 s (time constant 120 ms). The other choices were a lower button (the strip below the stage is 80 px at 1440 × 900 for K. 525, less than the ring of 84 px) and a farther first camera (a cut or a move at the click on Play) (review H1) | 2.8, 4.5 |
| After `webglcontextrestored`, the stage makes the environment of the reflections again. The test of the unverified finding U1 showed a stage 2.6% darker after a loss and a restore of the context. `e2e/context.e2e.ts` checks the light of the stage after the restore | 4.5 |
