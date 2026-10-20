# Decisions of the lower camera

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-20 the user wrote: "make the camera's angle slightly lower", and chose "All cameras"
from three choices of the manager. The manager decided the rows below. The user can reverse each
decision. Then update its section, and remove its row.

| Decision                                                                                                                                                                                                                                                                                              | Section |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| The default view is 29° above its target, 4° lower than the 33° that followed `orchestra-latest.png` (`DEFAULT_ELEVATION`). This is a conflict with the image: the newer choice of the user wins. The full stage still shows, with the back row and the timpani over the strings.                     | 4.5     |
| Each wide variant and each kind of Cinematic shot is 3° lower (`WIDE_VARIANTS`, `SHOT_KEYS`), and the conductor shot is 2° lower (8°), so that it stays above the head of the bear. In `pnpm shot-trace --base`, the wide, high, side, and conductor shots of `beethoven-8-4` are 2.6° to 3.4° lower. | 5.6     |
| In the full orchestra, the section and solo shots are only 0.4° to 1.2° lower on the mean (5.4° in `mozart-k417`), because the planner climbs over the heads in the foreground. The rules of the planner do not change.                                                                               | 5.6     |
