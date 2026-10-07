# Decisions of the title shade

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-07, the title shade agent made the shade behind the title as small and as light as
the contrast rules permit, so that the default view looks like `reference/mockup.png`. The
agent decided the details below. The user can reverse each one. Then update the section that
holds it, and remove its row.

| Decision | Section |
|---|---|
| The level of the shade comes from the frame behind the text, read on the GPU. A shade from the camera mode does not see a free camera, and a wide shot on a phone also puts animals behind the title. A text shadow alone gave about 1.1:1 for the title over white, far below 4.5:1 | 2.8 |
| Each line (the logo, the piece title, and the composer) has its own shade and level. On main `1cc1f0d`, the beam lies behind the end of the piece title at 1440 × 900 and needs the level 0.55. One shade for the whole title then dimmed the logo, the composer, and 880 × 370 px of the hall and the beam | 2.8 |
| The shade of a line is a pill with a blur of 8 px, 24 px above and below the line and 40 px to its sides. A soft rectangle with a mask showed as a box behind the logo over white (audit N21). The blur keeps the shade opaque over the text and the 4 px margin that the app reads | 2.8 |
| The app reads the frame every 0.15 s through a pixel buffer and a fence. A direct `readPixels()` stops the frame until the GPU finishes it. The lightest block of 6 × 6 CSS px decides the level, so a whisker or a string alone does not turn the shade on | 2.8 |
| The level puts the backdrop at the relative luminance 0.125 for `--text` (the limit of 4.5:1 is 0.141) and 0.085 for the gold logo (the limit is 0.095). The margins keep 4.5:1 over colored backdrops, and over white the levels give 4.93:1 and 4.83:1 | 2.8 |
| A shade comes in at once and goes out in 0.8 s, with a CSS fade of 0.15 s, so that it does not flicker in a camera move. Before the first read, the level is 0. With no WebGL2 context, or after an error of a read, the full shade shows | 2.8 |
| The contrast test checks the colors of the title texts that ui.css gives (`--text` and `--accent-strong`), at the levels over each gray and each scene color. The test of the full shade over white still checks `--text-dim` and `--text` | 2.8 |

These rows replace the corner ellipse of `2026-10-06-step-8-review-fixes.md` and
`2026-10-06-ux-audit-2-ui.md`. This session removed those two rows.
