# Decisions of the third review of 2026-10-26

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-26, the user sent issues with images: "the violin player's arms are becoming much longer
and bent than before. this is a regression", "there's black area under the panda's armpit", "black
area under the pig's armpit", "dark area on the fox (both red and tan)'s back", "cat's bow hand
should rest on/near its lap", "the rabbit's left lap / leg is cut", "the hippo's eyes are too big",
and "the rabbit, cat, and fox are now not holding the violin properly in rest mode". The manager
worked alone on `main`. The user can reverse each decision. Then update its section, and remove
its row.

| Decision | Section |
|---|---|
| The two faces at the front of the left arm root of the panda move rigidly (`weights.rigid`), and the fur faces of the trunk box with an Oklab lightness from 0.5 to 0.8 take the color of the nearest light fur face (`colors.border.gray`). Three faces across the edge of the black band took gray edge samples (lightness 0.70) and showed as a gray wedge under the raised left arm. The left play folds fall from 3 to 1, and the arm gate passes against `main`. | 4.4 |
| In the trunk box of the pig, from y 0.4 to the chin, each dark fur face takes the color of the nearest light fur face (`colors.border`). Four faces under the right arm took dark texture samples and showed as a black sliver under the raised arm. The hooves lie below the box and stay black. | 4.4 |
