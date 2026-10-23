# Decisions of the start tier of touch devices

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-22, the user found that an iPhone renders the high tier with no problem. The automatic
tier only goes down, so a phone that started at the low tier stayed there. The user can reverse
each decision. Then update its section, and remove its row.

| Decision | Section |
|---|---|
| The user: "actually start touch devices at medium". A coarse pointer or a small screen starts at the medium tier in place of the low tier, and the automatic tier drops a slow device to low. | 2.6 |
| The app does not read the GPU name to find a fast device: Safari on iOS gives only "Apple GPU", so the name does not separate an old iPhone from a new one. | 2.6 |
