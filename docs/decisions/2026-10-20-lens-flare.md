# Decisions of the lens flare

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-20, the user asked: "is it possible to add lens flare effect?". The manager proposed a
flare in screen space from the bloom chain, and the user said "do it". Measures and lineups:
[`2026-10-20-lens-flare.md`](../research/2026-10-20-lens-flare.md). The user can reverse each
decision. Then update its section, and remove its row.

| Decision                                                                                                                                                                                                                                             | Section |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| The user: "do it". One flare pass reads the bloom levels and makes ghosts, a halo, and a warm horizontal streak, with no new dependency (`FLARE_FRAGMENT`, `PostPipeline`). The final pass adds it before the tone mapping.                          | 4.5     |
| The light of the flare is its level minus 2 times the next level (`FLARE_LOOK.broad`). Lit white fur passes the bloom threshold: 1.84 at 1/8 against 1.66 for a lamp, so a plain threshold cannot keep the fur out.                                  | 4.5     |
| The flare takes the first bloom level at or below 180 px of height (`flareLevel()`). At a pixel ratio of 2, a fixed level index gave about 4 times the light of a lamp.                                                                              | 4.5     |
| Each ghost is a soft disc of 17 taps with the radius 0.025 in the source (`FLARE_LOOK.ghostRadius`). A radius in the image, or 0.04, showed the pattern of the taps.                                                                                 | 4.5     |
| The flare has no fade over frames. The horns give no flare in three frames 1/24 s apart, so the flare keeps no state.                                                                                                                                | 4.5     |
| The flare has the medium strength (`FLARE_LOOK.strength` 1), the choice of the user from the lineups of subtle (0.5), medium, and strong (2.5) on 2026-10-20. The default view keeps its small flare: the user chose no glow at the top of the beam. | 4.5     |
| The low tier and the path with no float target have no flare (`TIER_SETTINGS`, `hasFlare()`).                                                                                                                                                        | 2.6     |
