# Decisions of the credits dialog and the link to GitHub

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-07, the user asked: "hide credits behind a link, which when clicked would popup a
modal". The credits dialog agent moved the credits section of the drawer into a modal dialog.
The user then asked: "also find a good way to display the github link. Use a github logo that's
styled in a consistent way as zoophony". The same agent added the link, and decided the details
below. The user can reverse each one. Then update the section that holds it, and remove its
row.

| Decision | Section |
|---|---|
| The link "Credits" stands at the end of the tab "Settings", after a line in `--line-faint`. It is 13 px text in `--text-dim` with an underline and no box, as the secondary text of `reference/mockup.png` | 2.8 |
| The link is a `button` with `aria-haspopup="dialog"`, because it opens a dialog and goes to no page. It has the compact control size, 44 px on a touch screen | 2.8 |
| The dialog is a native `<dialog>` with `showModal()`. The browser then makes the rest of the page inert, keeps the dialog above the drawer and the bar, and gives the focus to the first control | 2.8 |
| The close button has the label "Close the credits", as "Close the drawer" and "Close the message" name what they close | 2.8 |
| A click on the backdrop closes the dialog only when the press also started on the backdrop. A text selection that starts in the dialog and ends outside it does not close it | 2.8 |
| When the dialog closes, the link gets the focus again, also after a click on the backdrop | 2.8 |
| While the dialog is open, `keyAction()` gets the focus kind `dialog` and gives no action. Escape then closes only the dialog, and the drawer stays open | 2.4 |
| The dialog and its backdrop fade in for 150 ms, and the dialog rises 8 px. The close has no animation. With reduced motion, no animation runs | 2.8 |
| The dialog is up to 560 px wide and 720 px high. On a phone, it is 16 px narrower than the screen and at most 32 px lower than it | 2.8 |
| The backdrop uses `var(--bg-overlay)` with the same color as the fallback, because an older browser does not give the tokens of the page to `::backdrop` | 2.8 |
| On a touch screen, the paragraph "Third-party licenses" stands a full control size below the hall credit. In the wider dialog, the box of "CC BY 4.0" overlapped it, and 25 of 44 rows of that box hit the wrong link | 2.8 |
| `docs/prototype/ui.html` keeps its credits section. The prototype is a record of the tokens and the layout, and the design gives the dialog | 2.8 |
| The link to GitHub is the GitHub mark after the name "Zoophony", in the logo line. At 1440 × 900, the open drawer covers the top right, where the mockup has its icons. The drawer of a phone starts closed, so a link in its footer hides by default. Only the logo line shows the link with the drawer open, with the drawer closed, and on a phone | 2.8 |
| The mark is the neutral gray `--github-mark` (#c8c8c8), and white on a hover. The manager asked for the gold of the logo, but the logo rules of GitHub (<https://github.com/logos>) permit the mark only in white, black, or gray, with no change of color. The size, the place, and the box follow the logo, so the mark still reads as a part of the same line | 2.8 |
| The mark is 16 px (13 px on a phone), about the visible size of the paw, because the paw fills about 78% of its box of 20 px. The box of the link starts 14 px (10 px on a phone) after the name, and this gap keeps the mark apart from the logo, as the logo rules of GitHub ask | 2.8 |
| The path is `icons/mark-github-24.svg` of Primer Octicons at commit `ea8e6bb`, with no change. Octicons has the MIT license, so the third-party license file holds it, and `assets/github-mark/` records the source and the checksums | 2.8, 7.3 |
| The link is a plain `<a>` with `target="_blank"` and `rel="noopener noreferrer"`, the `aria-label` "Zoophony on GitHub", and the same tooltip. The page loads nothing from GitHub | 2.7, 2.8 |
| The link stays in the title, inside the shade of the logo line, so it is the first stop of Tab. The play button of the first screen is the second stop. No rule of the design asked for the play button as the first stop | 2.8 |
| On a touch screen, an `::after` box of 44 px around the mark takes the tap. A larger box of the link itself would grow the logo line or the part of the frame that the shade reads | 2.8 |
| `index.html` keeps its load state with no mark. The paw and the name do not move when the script adds the mark after them | 2.8 |
