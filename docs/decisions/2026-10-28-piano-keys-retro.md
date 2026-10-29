# Decisions of the retro of the piano keys

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

After the merge of the piano keys round (2026-10-28, `2026-10-28-piano-keys.md`), the manager
asked its agent for speedups, as the user asked on 2026-10-12. The agent named five losses of
time. The manager decided these rows. The user can reverse each decision. Then update its
section, and remove its row.

| Decision | Section |
|---|---|
| An agent starts each long job in the background and waits for its exit notice or one monitor. About 100 of the 299 tool calls of the round read logs again and again (`docs/agents/workflow.md`, "Probes and the shell"). | 9.6 |
| An agent on a branch gives its start commit to each `--base` option. `body-probe --base main` showed false differences after another session committed on `main` (`docs/agents/workflow.md`, "Where to work"). | 9.6 |
| For a side effect on the look with no known cause, an agent renders one pair, then reports an open problem. The round spent 8 minutes on the paw shadow and found no cause (`docs/agents/workflow.md`, "Images of a mesh"). | 9.6 |
| `pnpm fold-probe` and `pnpm arm-check` go through `tools/measure-lock.sh` later, in a round of their own, because another session runs them now. They put noise into the frame measure of the round. | 9.6 |
| No saved tool for the views of the piano keys. It costs about 1.5 hours and saves about 12 minutes only in a round of the keyboard. | 9.6 |
