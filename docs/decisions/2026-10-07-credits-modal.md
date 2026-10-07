# Decisions of the credits dialog

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-07, the user asked: "hide credits behind a link, which when clicked would popup a
modal". The credits dialog agent moved the credits section of the drawer into a modal dialog,
and decided the details below. The user can reverse each one. Then update the section that
holds it, and remove its row.

| Decision | Section |
|---|---|
| The link "Credits" stands in a footer at the end of the drawer, below the settings, after a line in `--line-faint`. It is 13 px text in `--text-dim` with an underline and no box, as the secondary text of `reference/mockup.png` | 2.8 |
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
