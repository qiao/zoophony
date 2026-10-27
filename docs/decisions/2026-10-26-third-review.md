# Decisions of the third review of 2026-10-26

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-26, the user sent issues with images: long and bent arms of the violin players, dark
areas under the arms of the panda and the pig and on the backs of the foxes, the cat bow paw off
the lap, a cut rabbit leg, big hippo eyes, a bad rest grip of the violins, and long cat arms. The
manager worked alone on `main`. The user can reverse each decision. Then update its section, and
remove its row.

| Decision | Section |
|---|---|
| Two faces at the left arm root of the panda move rigidly (`weights.rigid`), and its trunk fur faces with an Oklab lightness from 0.5 to 0.8 take the nearest light color (`colors.border.gray`): three faces of gray edge samples showed as a gray wedge under the arm. | 4.4 |
| Each dark fur face of the pig trunk box, from y 0.4 to the chin, takes the nearest light color (`colors.border`): four faces showed as a black sliver under the right arm. | 4.4 |
| At rest, the left elbows of the rabbit and the red fox point down and a little out and back, (-0.6, -1, 0.3), and each left paw closes around the neck at 0.4 of the fingerboard (`restPlace`). With the elbows out and the grip near the nut, the arms looked long, and the paw lay over the scroll. | 5.2 |
| The hippo pea eyes are 0.8 of their size (`eyeSize`), a moderate first step; 0.65 looked beady. | 4.5 |
| The rabbit rest violin stands 0.1 H above the left knee (0.05 H below): its lower end sank into the knee, and the leg looked cut. | 5.2 |
| `fox_arms.py` smooths the 18 vertices of the fur notches at the back of the fox neck, below the ruff (`step_smooth_notches()`), as the user allowed: their undersides showed as a dark V. | 4.4 |
| The cat arm copy takes the chest share 0.1 near the side walls (0.2 narrowed the upper rings at rest). The left elbows point further out. The left forearm meets the viola 2.3 to 2.4 cm deep in the play and the moves (1.5 cm on `main`), as on the rabbit, and one lowering sample puts the left paw 1.6 cm into the viola (limit 1.5). | 4.4, 5.3 |
