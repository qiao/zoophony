# Decisions of the review rule

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-14, the user asked: "is the review round really useful? skip it if not necessary". The
manager of the session compared the three reviews of that day:

| Round | Review and fix time | Findings |
|---|---|---|
| `rabbit-smooth` | 8 + 7 min | Old claims in three docs, one missing test of a weight rule, a table row that could not be made again, long lines. No fault that shows in the app. |
| `test-pause` | 7 + 3 min | One old decision row that still required `pnpm frame`, wording. |
| `retro-smooth` | 10 + 16 + 4 min | Tool faults: Ctrl-C through pnpm left a folder of 198 MB, a server could take the port 4182 of the merge script, and `tools/break-test.sh` read its report with the broken reader. |

`tools/merge-branch.sh` checks each commit (the lint, the typecheck, the format check, and the
tests that the commit reaches). Then it runs the full `pnpm test`, the build, the size check, and
the end-to-end tests. The user judges the look from the images. No finding of the three reviews
was a fault that shows in the app, and the faults of the tools show in no image. From the request
of the user, the manager decided the first two rows. The agent of the branch `review-rule` decided
the other rows. The user can reverse each decision. Then update the section that holds it, and
remove its row.

| Decision | Section |
|---|---|
| Manager decision from the request of the user: no review agent for a round of the look, a model, the docs, or the test setup. The manager reads the report and looks at the images, and the merge script runs the checks. This rule replaces the review of each step that the user decided on 2026-10-04 | 9.8 |
| Manager decision from the request of the user: a short review agent checks the code only, in about 10 minutes. It runs for a round that changes tool code that deletes files, starts processes, or changes the git state. It also runs for a change of a rule of the pure core: `midi/`, `score/`, the timing of `pose/`, or the synth. A fault there does not show in an image | 9.8 |
| The pure core of the rule is the list of the manager. The timing of `pose/` is the time of each motion against the notes and the transport. Examples are the note times, the lift, the lowering, and the pose after a seek. The synth includes the worklet, the block scheduler, and the clock. `models/`, `shots/`, and the look of a pose are pure modules too. Their faults show in the gallery, the shot frames, and the close views, so they get no review agent | 9.8 |
| A round of more than one kind gets the short review agent when one of its parts needs it. The review reads only the code of that part | 9.8 |
| The short review checks the tip with `tools/check-commits.sh --tip main`, and reads the diff of its code. It runs the break command of each new test with `tools/break-test.sh`. It runs no image tool and no probe of a body | 9.8 |
| The fixes of a short review get no second review. The implementation agent or a fix agent makes each fix as a commit on the branch. The manager reads the report of the fixes, and the merge script runs the checks. The manager can ask for a second review | 9.8 |
| Each step of 9.5 keeps its "Review" line with the rule of the step. The manager reads the images of the steps 3, 4, 6, and 6b. A short review agent checks a change of the synth (step 1), of `midi/` and `score/` (step 2), or of the pose timing (step 5). Step 2 had no "Review" line before | 9.5 |
| In `TODO.md`, the "Review:" line of a step gets the date and the kind of review: "agent review" or "manager review". The old lines of 2026-10-05 and the reviews in `docs/reviews/` stay as records | 9.5 |
| The review brief and the fix brief of `docs/briefs/studio-body.md` become optional. A round of a studio body uses them only when it changes code of the second row, such as a tool that removes a folder. The review brief drops the probes of the body and the close views, because they check the model work, which gets no review agent. Its time box is 10 minutes | 9.8 |
