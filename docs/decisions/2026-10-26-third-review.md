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
| At rest, the left elbows of the rabbit and the red fox point down and a little out and back, (-0.6, -1, 0.3), and of the cat (-1, -1, 0.3), and each left paw closes around the neck at 0.4 of the fingerboard (`restPlace`). With the elbows out to the side and the grip near the nut, the arms looked long, and the paw lay over the scroll. The arm gate passes against `main`; the rabbit violin reaches its depth limit (2.0 cm) in a lowering. | 5.2 |
| The bow paw of the rabbit rests at the front of the lap, 0.4 H out, 0.85 H up, and 0.3 H to the front, with the elbow (0.3, -1, 1). The cat grip is 0.35 H out, 0.5 H up, and 0.25 H to the front at 0.7 of the way, with the elbow (1, -0.6, 0) and the tip (0.3, 1, -0.4). At 0.5 H to the front, each arm reached nearly straight. The right arm of the cat twists 33° at rest (25° on `main`, limit 55). | 5.2 |
| The pea eyes of the hippo are 0.8 of their size (`eyeSize` of `tools/studio-body.ts`), a first moderate step. The lineup of 1.0, 0.8, and 0.65 showed beady eyes at 0.65. | 4.5 |
| The rest violin of the rabbit stands 0.1 H above the top of the left knee (0.05 H below before, `rest.lap`). Its lower end sank into the knee, and the left leg looked cut from the left side. The arm gate passes against `main`, and the depths keep their values. | 5.2 |
| The fox source of the rig smooths the 18 vertices within 0.05 units of (0, 0.65, -0.02), the small fur notches at the back of the neck below the ruff (Smooth Vertices, 4 rounds of 0.5, `step_smooth_notches()` of `fox_arms.py`), as the user allowed. Their undersides faced down and showed as a dark V on the red and the tan fox. Rigid faces and smooth skin normals there changed nothing that the eye sees. The arm gates of both roles keep the values of `main`. | 4.4 |
