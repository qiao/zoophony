# Decisions of the bench of the polar bear pianist

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-14, the user said: "polar bear seat too low". The manager of the session and the agent
of the branch `polar-bench` decided the other rows. The report
[`2026-10-14-polar-bench.md`](../research/2026-10-14-polar-bench.md) gives the measures, the
sources, and the images. The user can reverse each decision. Then update the section that holds
it, and remove its row.

| Decision | Section |
|---|---|
| The rule of a real pianist: with the hands on the keys, the forearm is parallel to the floor, and the elbows are about level with the keys (Rob Young, "Kids Piano Posture Tips", Prodigies, and "Fundamentals of Piano Practice", chapter 1, section II.3). With the holds of 2026-10-13, the forearm of the polar bear is level on a bench of 0.18 m. On the bench of 0.118 m before, it sloped up by 10.9° to the paw: by the rule, the bear sat too low | 4.5, 5.3 |
| The user and the manager: the polar bear sits on a bench of 0.25 m (`seat` of its entry in `ANIMALS` of `tools/studio-body.ts`), about twice the bench of 0.118 m that fit its legs. The bench of the rule (0.18 m) is 6 cm higher than before, too little to show. The forearm of the bear is thick: the skin under the elbow is about 14 cm below the elbow joint, so on the bench of 0.25 m, the skin under the elbow is about 4 cm below the key top. The bench of a parametric body keeps 0.45 m. The feet hung 0.13 m above the floor, until the longer shins of [`2026-10-14-polar-fix.md`](2026-10-14-polar-fix.md). This row replaces the bench row of [`2026-10-12-studio-polar-bear.md`](2026-10-12-studio-polar-bear.md) | 4.4, 4.5 |
| Changed test: `tools/studio-body.test.ts` checks the drop of the polar bear to the floor and the keys a little below its elbows with the settings of the polar bear with no seat height (`onFloor()`). The studio fitted the keys to the elbows of that body. The bench test keeps the settings with the seat | 4.4, 9.3 |
| `pnpm body-probe --base main` (`body-probe-base-main.txt`): the bodies of the polar bear on each support, its player, and its 16 pose sets of the four demos with a piano differ. The other 90 bodies, 22 players, and 1,476 pose sets stay. The first download grows by 19 B after gzip (`pnpm size --base main`, `size.txt`) | 4.2, 7.2 |
