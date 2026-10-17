# Decisions of the hands of the string players and their reference

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-17, the user asked for research on the hands of professional string players, and then
for a reference of their movements. The manager of the session gave the round `string-hands` and
the reference file. The agent of the branch decided the other rows. The report
[`2026-10-17-string-hands.md`](../research/2026-10-17-string-hands.md) gives the measures, the
prototype, and the motion spec. The round changes no app code. The user can reverse each decision.
Then update the section that holds it, and remove its row.

| Decision | Section |
|---|---|
| The user: "currently, the violin, viola, and cello players are moving their left hand up and down too much, whereas in reality many notes do not need to move hand, just need to move fingers. Do a deep research on how professional players move their hands/fingers (both left and right) and adjust the the movement's accordingly" | 5.3 |
| The user: "make sure to document the professional movements so that they can be referenced later" | 5.3 |
| [`docs/reference/string-technique.md`](../reference/string-technique.md) is the reference of the movements of professional players of the violin, the viola, the cello, and the double bass: the left hand, the fingers, and the bow arm, with a source for each fact. It is the target of the string motion of the app, as the images of `docs/reference/` are the target of the look. It is current: a round that changes the string motion updates its section 3 "Use in the app" and each wrong fact in the same commit, and each new fact gets its source. A research report stays the record of its date, so the reference holds the facts, and the report of 2026-10-17 points to it. `AGENTS.md` ("Design"), the pose index of design 5, and design 5.3 name the reference | 5.3 |
| The measure of a move of the left hand is in mm on a real instrument of full size (strings of 328 mm, 370 mm, 690 mm, and 1,060 mm), so that it does not depend on the body of an animal. On `main`, 65.4% of the violin strokes, 55.1% of the viola strokes, 72.8% of the cello strokes, and 70.1% of the contrabass strokes of the demos move the hand (`hand-moves.ts`) | 5.3 |
| The code round follows the motion spec of section 5 of the report. A position plan from the score (`planHand()`, a Viterbi search with the cost of each shift, of a high position, of an extension, of an open string, and of a string crossing) keeps the hand in a position. The prototype moves the hand on 1.9%, 0.5%, 4.6%, and 10.0% of these strokes. The code round takes the proposed default of each open question of section 6 of the report, unless the user answers it | 5.3 |
