# Look variants

## Camera orchestra

| variant | stage p5/p50/p95 | fur L/hue/sat | rabbit torso p10/p50/p90 hue/sat | floor L | floor R | chair L/hue/sat | shadow p5/ratio | conductor | hall p50/p90 |
|---|---|---|---|---|---|---|---|---|---|
| reference | 26/107/212 | 163/19°/0.30 | - | 191/28°/0.54 | 158/26°/0.60 | - | 63/2.6 | 52/18°/0.73 | 12/49 |
| spot0.3 | 27/101/175 | 170/29°/0.41 | 46/130/183 26°/0.49 | 115/23°/0.67 | 111/23°/0.69 | 178/29°/0.40 | 74/1.7 | 36/18°/0.81 | 14/34 |
| spot0.2 | 26/101/174 | 169/28°/0.41 | 46/130/183 26°/0.49 | 115/23°/0.67 | 111/23°/0.69 | 178/29°/0.40 | 74/1.7 | 35/18°/0.82 | 14/34 |
| spot0.45 | 27/102/177 | 176/29°/0.41 | 47/135/188 26°/0.48 | 115/23°/0.67 | 111/23°/0.69 | 183/29°/0.39 | 74/1.7 | 37/18°/0.79 | 14/34 |

## Camera default

The white fur of each variant takes the pixels of the variant spot0.3, and n gives the count of its own mask (`tools/look-regions.ts`).

| variant | front rows p50/p90 | back rows p50/p90 | back floor p50 | fur front p50/p90 | fur back p50/p90 | fur back/front p90 |
|---|---|---|---|---|---|---|
| reference | - | - | 41 | 185/246 n 10827 | 164/242 n 10203 | 0.98 |
| spot0.3 | 97/185 | 85/162 | 63 | 192/219 n 14017 | 163/202 n 9563 | 0.93 |
| spot0.2 | 97/184 | 85/162 | 63 | 191/218 n 13972 | 163/202 n 9555 | 0.93 |
| spot0.45 | 98/186 | 85/162 | 63 | 193/220 n 14385 | 163/202 n 9552 | 0.92 |
