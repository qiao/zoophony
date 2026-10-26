# Decisions of the brass grips of the trumpet and the tuba

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-25, the role visual audit found that both trumpet paws of the monkey pressed together
in front of the mouth like praying hands, and the arm gate failed the left grip turn of the
trumpeter (48°) and of the tubist (96°). The manager asked for the hands of a real player
(`docs/reference/wind-technique.md` 2.1 and 3). The report
[`2026-10-25-brass-grips.md`](../research/2026-10-25-brass-grips.md) gives the measures. The user
can reverse each decision. Then update its section, and remove its row.

| Decision | Section |
|---|---|
| The left trumpet palm faces the upright valve casings from the left, below the middle of their height, and the left fingers curl 109° around them (`palmL`, `tubeL` of `trumpet()`, `gripCurl` of `MONKEY_TRUMPET`). | 5.3 |
| The right trumpet palm lies above the valves, 3.6 cm to their right, and faces down. The right paw points to the left across the valve tops (`aimSide` 0.8), and its fingers curl 92° onto them. The tube of the right paw is the line of the valve tops under the palm (`VALVES_TO_RIGHT_PALM`). | 5.3 |
| Each paw of a wind hold has its own side aim (`WindHold.aimSide`). The left trumpet paw takes none: the retarget turned it back to its forearm, and it left its grip by 4.2 cm. | 5.3 |
| Both trumpet elbows point down and out. Out and level, the right upper arm went flat (0.51, limit 0.55), and the right wrist bent 71° (limit 70°). | 5.3 |
| The trumpet stays 10° below the level. From the stage camera, the mouth shows above the right paw. | 5.3 |
| Both trumpet paws keep the hold of the play at rest (`restAim` 1), and the left rest grip moves 0.04 H toward the bell (`restGripShiftL`), so that the finger tips of both paws stay on the casings. | 5.2, 5.3 |
| The left tuba paw lies on the left side of the main branch, with the palm on the branch and the knuckles to the left (`gripShiftL`, `poleL`, `restPoleL`, `gripCurl` of `RHINO_TUBA`). At rest, the grip moves 0.02 H out from the branch (`restGripShiftL`), so that the left forearm stays out of the tuba. | 5.3 |
| `ACCEPTED_GRIPS` keeps the entries of the trumpeter and the tubist: the new grips turn 17° and 33° (trumpeter) and 40° and 6° (tubist) from them, inside 45°. | 9.8 |
| `pnpm wind-grip` takes the place of the right trumpet paw above the valves (`ROLES` of `tools/wind-grip.ts`). | 9.8 |
