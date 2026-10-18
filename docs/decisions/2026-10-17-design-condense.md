# Decisions of the condensed design

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-17, the user said: "limit the docs length. keep only the high level and the most
important details / info. make the agents.md smaller and modular". The round `agents-modular` did
`AGENTS.md`. The round `design-condense` did the design files below. The user can reverse each
decision. Then update its section, and remove its row.

| Decision | Section |
|---|---|
| The user, quote above: a design section keeps the rules with their intent and reasons, the defining tables, the flow diagrams, and each heading that a doc or the code names. It drops the history, the tuned values, the measures, and the repeats, and names the code or the decision file instead. | 9.6 |
| Design 2.6 names `TIER_SETTINGS` of `scene/quality.ts` in place of the table of the values of each tier. | 2.6 |
| Design 6 names the constants of `score/stage-mix.ts`, `audio/output-chain.ts`, and `audio/demo-loudness.ts` in place of the formulas of the mix, the gains of the chain, and the gain of each demo. | 6.1, 6.8 |
| Design 9.7 keeps the target table and the rules of the measure. The measures of 2026-10-05 to 2026-10-13 stay in the research reports of each step and in `2026-10-13-frame-time.md` and `2026-10-13-frame-tools.md`. | 9.7 |
| Section 10 of `design.md` gives each decision file a topic of a few words, in the order of the file names. | 10 |
