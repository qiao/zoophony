# Decisions of the polished UI

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-06, the UI agent changed the HTML and CSS UI over the canvas to look as close as
possible to the mockup [`reference/mockup.png`](../reference/mockup.png). The navigation menu at
the top of the mockup is out of scope. The agent decided the details below. The user can reverse
each one. Then update the section that holds it, and remove its row.

| Decision | Section |
|---|---|
| The wide layout is a window at least 1200 px wide with an aspect of at least 3:2. It opens the drawer at start with the seat list expanded. Beside the drawer, the free area of the stage stays wider than it is high. A narrower window and a phone keep the closed drawer and the collapsed seat list | 2.3, 2.8 |
| The drawer opens at start, also on the first screen, and not only at the first play. Thus the stage does not move at the click on Play, and the default view of the camera is the same before and during play | 2.8 |
| The bar stays during play while the drawer is open, as before. In the wide layout, the bar thus hides only after the user closes the drawer, as the mockup shows the bar during play | 2.3, 2.8 |
| The piece title uses a serif of the system (`--font-serif`, Palatino first) in place of a self-hosted OFL font. It adds no byte to the first download, sends no request, and needs no license entry. The text of a system with no Palatino uses another serif of the stack | 2.3, 2.8 |
| The title is `clamp(24px, 2.5vw, 36px)` (32 px at 1280 px) with the weight 400, and the composer is `clamp(13px, 1.15vw, 16px)` in `--text`. The mockup shows a bright composer line | 2.8 |
| The drawer keeps its width of 340 px, about the share of the window of the mockup panel at 1440 px. Thus the move of the stage stays 176 px | 2.8 |
| The panel is `rgba(21, 18, 16, 0.96)` with a blur of 16 px, and the hover of a seat row is `--line-faint`. A thinner panel lets the dim text of a silent seat fall below 4.5:1 over white fur | 2.8 |
| The heading "Demos" has no sliders icon, because no action of the demo list fits it. The close button of the drawer stands in its place. The sliders icon of "Seats" is the collapse button of the seat list, with the same labels and `aria-expanded` | 2.8 |
| The demo titles are 13 px and the composers 12 px, the proportions of the mockup in a panel of 340 px. A long title wraps to a second line, because an ellipsis would hide a part of it | 2.8 |
| The demo covers are drawn inline SVG motifs of each piece (about 4 KB of markup in sum), in place of pictures or renders. They need no image file and no license of another author | 2.8 |
| The level meter comes from the notes of the score (nine bands of keys, 20 frames for each second), in place of an analyser of the audio output. The UI owns no audio code, the meter follows the rule "One score", and the song time alone gives it | 2.8 |
| The seat rows of the mockup have no source line. The source line shows only in the row of the animal that the user clicked, and a screen reader reads it in each row | 2.3, 2.8 |
| The buttons "M" and "S" show the small squares of the mockup (24 × 22 px) in targets of the compact size (32 px, 44 px on a touch screen) | 2.8 |
| The file button stands below the seat list and sticks to the bottom of the drawer. The drop hint "Or drop a MIDI file on the page." is its tooltip, because the mockup shows no text below the button | 2.8 |
| The speed shows at least one decimal ("1.0×"), as the pill "1.0x" of the mockup. The sign stays the sign of the multiplication of audit CP3 | 2.8 |
| The tooltips keep their keys, for example "Automatic camera (C)", although the mockup shows only the names. The keys are the only visible hint of the keys of the page (audit CT1) | 2.8 |
| The large play button of the first screen stays. The mockup shows the state during play only | 2.8 |
