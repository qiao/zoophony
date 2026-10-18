# Look lab

The frames of `main` at `b6d09883` (the start of the round) against `docs/reference/orchestra-latest.png`.

## Stage tone

| Frame | p5 | p25 | p50 | p75 | p95 | Median saturation |
|---|---|---|---|---|---|---|
| reference | 26 | 58 | 107 | 154 | 212 | 0.67 |
| tree, orchestra | 27 | 58 | 127 | 178 | 212 | 0.51 |
| tree, default | 25 | 58 | 118 | 168 | 209 | 0.52 |
| tree, violins | 26 | 41 | 147 | 189 | 210 | 0.49 |

## Colors of the regions

| Region | Frame | Median RGB | Luma | Hue | Saturation |
|---|---|---|---|---|---|
| lit floor, left of the podium | reference | (252, 180, 115) | 191 | 28 | 0.54 |
| lit floor, left of the podium | tree, orchestra | (227, 190, 138) | 194 | 35 | 0.39 |
| lit floor, right of the podium | reference | (220, 146, 88) | 158 | 26 | 0.60 |
| lit floor, right of the podium | tree, orchestra | (228, 188, 136) | 193 | 34 | 0.40 |
| back of the conductor | reference | (89, 44, 24) | 52 | 18 | 0.73 |
| back of the conductor | tree, orchestra | (77, 40, 23) | 47 | 19 | 0.70 |
| white fur, front left rabbit | reference | (196, 156, 137) | 163 | 19 | 0.30 |
| white fur, front left rabbit | tree, orchestra | (205, 167, 114) | 171 | 35 | 0.44 |

## Shadows on the floor

| Region | Frame | Luma p5 | Luma p90 | Ratio | Shadow RGB |
|---|---|---|---|---|---|
| floor with the shadows of the players | reference | 63.1 | 162.7 | 2.6 | (69, 41, 24) |
| floor with the shadows of the players | tree, orchestra | 32.7 | 181.5 | 5.6 | (43, 27, 18) |
| floor in front of the podium | reference | 36.7 | 171.7 | 4.7 | (57, 29, 12) |
| floor in front of the podium | tree, orchestra | 46.9 | 187.6 | 4.0 | (45, 26, 17) |
