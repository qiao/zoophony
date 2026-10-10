# Decisions of the reference target of the animals

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-10, the user asked which instructions, docs, decisions, and tests stop the animals
from looking more like the reference images. The manager found eight. The user approved the
change of the first four: the text that unbound the references, the one body plan for all
species, the gap between the arms and the body, and the misread of `animals.webp`. The user can
reverse each decision. Then update the section that holds it, and remove its row.

| Decision | Section |
|---|---|
| The user: the reference images stay the target of the animal bodies: the forms, the facets, the skeletons, and the colors. The bodies of 2026-10-06 18:58 are the start point, and each change of a body moves it toward the images. This row replaces the row of design 1 of `2026-10-09-body-revert.md` | 1 |
| The user: each species can get its own skeleton, torso width, and limb thickness, toward the anatomy of its reference images. The default skeleton and the shared widths of 2026-10-06 are the start point. This row replaces the row of the default skeleton of each species of `2026-10-09-body-revert.md`. The rows of option A of `2026-10-07-proportions.md` stay removed, because they fitted the bodies of the model sheets | 4.3, 4.5 |
| `models/species.test.ts` does not pin the top of the head at 0.5 H above the head center. The pin held the form of the round head of 2026-10-06, and a head of a reference image can have another crown | 4.5, 9.3 |
| The user: an arm can touch the body. In play and at rest, the forearm, the hand, and the lower half of the upper arm go at most `ARM_CONTACT_DEPTH` (0.02 H, `pose/test-arm-clearance.ts`) into the torso, the head, or the thighs. The gap of 0.01 H forced the arms out into the air, and the arms of the reference images touch the body and hug the instruments. With the elbows of the winds turned down and out, (0.6, -1, 0.2), the oboe, the clarinet, and the bassoon still fail, with arms 0.12 H to 0.18 H in the body. This row replaces the gap of the arm rows of `2026-10-07-rest-clearance.md` and `2026-10-09-test-trim.md` | 5.2, 5.3, 9.3 |
| The user: the rested violin, viola, and bows can touch the torso and the head, but they do not cross them (`pose/rest-clearance.test.ts`). The distance of two posed parts has no sign, so the test fails when it is 0. With the rest place of the violin hold moved to 0.1 of the thigh and 0.3 H up, the viola of the cat crosses the body and the test fails. This row replaces the gap of 0.02 m of the rest row of `2026-10-09-body-revert.md` | 5.2 |
