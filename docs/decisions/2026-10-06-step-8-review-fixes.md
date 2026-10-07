# Decisions of the fixes of the review of step 8

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-06, the review fixes agent fixed the findings of `docs/reviews/step-8/review.md` in
its own files, and a bug that the user found. The agent decided the details below. The user can
reverse each one. Then update the section that holds it, and remove its row.

| Decision | Section |
|---|---|
| The head of `index.html` links `style.css` and `ui/ui.css`, and no script imports them. The user saw a white page with a black disc for a moment at each reload of the dev server, because the import in the script loaded the styles after the script ran. `pnpm smoke` (dev server) and `e2e/first-screen.e2e.ts` (build) hold each script request and check the first paint: at most 2% white pixels, and no fill of the load ring | 2.8 |
