# Decisions of the wind technique and its reference

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-18, the user asked whether the motion of the pandas is professionally accurate. The
manager answered "partly" and offered research first. The manager gave the round `wind-research`
and the reference file. The agent of the branch decided the other rows. The report
[`2026-10-18-wind-technique.md`](../research/2026-10-18-wind-technique.md) gives the measures and
the motion spec. The round changes no app code. The user can reverse each decision. Then update
the section that holds it, and remove its row.

| Decision | Section |
|---|---|
| The user: "is the pandas' motion professionally accurate?", then "Research, then fix (Recommended)". First a reference with sources, then a fit round on what the panda can do with its arms. The slide travel stays short unless the user asks for longer arms | 5.3 |
| [`docs/reference/wind-technique.md`](../reference/wind-technique.md) is the target of the wind and brass motion. It is current: a round that changes the wind motion updates its section 4 "Use in the app" in the same commit, and each new fact gets its source | 5.3 |
| The fit round follows the motion spec T1 to T7 of the report, in its order. T1 keeps the slide reach above 0.15 m (`slideReachOf()`, `src/pose/winds.test.ts`) | 5.3 |
