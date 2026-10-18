# Look lab

The frames of `e371e405` (the end of step P4) against `docs/reference/orchestra-latest.png`.

## Stage tone

| Frame | p5 | p25 | p50 | p75 | p95 | Median saturation |
|---|---|---|---|---|---|---|
| reference | 26 | 58 | 107 | 154 | 212 | 0.67 |
| tree, orchestra | 29 | 63 | 107 | 153 | 205 | 0.62 |
| tree, default | 27 | 58 | 97 | 148 | 209 | 0.65 |
| tree, violins | 29 | 49 | 111 | 145 | 198 | 0.60 |

## Colors of the regions

| Region | Frame | Median RGB | Luma | Hue | Saturation |
|---|---|---|---|---|---|
| lit floor, left of the podium | reference | (252, 180, 115) | 191 | 28 | 0.54 |
| lit floor, left of the podium | tree, orchestra | (240, 171, 121) | 182 | 25 | 0.50 |
| lit floor, right of the podium | reference | (220, 146, 88) | 158 | 26 | 0.60 |
| lit floor, right of the podium | tree, orchestra | (216, 152, 107) | 162 | 25 | 0.50 |
| back of the conductor | reference | (89, 44, 24) | 52 | 18 | 0.73 |
| back of the conductor | tree, orchestra | (92, 42, 18) | 51 | 19 | 0.80 |
| white fur, front left rabbit | reference | (196, 156, 137) | 163 | 19 | 0.30 |
| white fur, front left rabbit | tree, orchestra | (218, 169, 119) | 176 | 30 | 0.45 |

## Shadows on the floor

| Region | Frame | Luma p5 | Luma p90 | Ratio | Shadow RGB |
|---|---|---|---|---|---|
| floor with the shadows of the players | reference | 63.1 | 162.7 | 2.6 | (69, 41, 24) |
| floor with the shadows of the players | tree, orchestra | 35.3 | 147.8 | 4.2 | (55, 22, 8) |
| floor in front of the podium | reference | 36.7 | 171.7 | 4.7 | (57, 29, 12) |
| floor in front of the podium | tree, orchestra | 36.2 | 196.8 | 5.4 | (57, 22, 8) |
