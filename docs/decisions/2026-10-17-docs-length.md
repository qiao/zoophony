# Decisions of the length of the docs

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-17, the user said: "limit the docs length. keep only the high level and the most
important details / info. make the agents.md smaller and modular". `AGENTS.md` had 24,278 words
(`wc -w`), and its commands table alone 12,982. The rounds of that day spent 40 to 50 minutes on
docs. The round `agents-modular` made the changes below. The user can reverse each decision. Then
update its section, and remove its row.

| Decision | Section |
|---|---|
| The user, quote above: `AGENTS.md` keeps the project, the sources of the truth, the hard rules, the work rules of each round, and an index of the modules, in at most about 2,500 words. | 9.6 |
| The details go into modules of at most about 3,000 words each: `docs/agents/commands.md`, `workflow.md`, `writing.md`, `code.md`, `model-work.md`, and `model-traps.md`. The traps of route 3 have their own module, so that `model-work.md` stays in its limit. | 9.6 |
| A row of `commands.md` gives a command in at most about 120 words. The head comment of the tool file holds the details, because the tools print only a one-line usage for `--help`. | 9.6 |
| A trap gives its rule in one to three sentences, in groups by the kind of work. | 9.6 |
| The limits of `docs/agents/writing.md` ("Length limits"): a decision file of about 600 words with rows of about 50, the quote of the user first, a research report of about 1,000 words of prose, a design section with no history and no tuned values, and a brief template of about 2,500 words. | 9.6 |
| The table "Bodies and roles" of `model-work.md` is the one list of the bodies, their sources, and their roles. Section 8 of `docs/briefs/studio-body.md` drops the places that copied it, from 36 to 28 places. | 9.6 |
| The old decision files, the research reports, the reviews, and the audits keep their pointers to the old sections of `AGENTS.md`, as the record of their date. | 9.6 |
