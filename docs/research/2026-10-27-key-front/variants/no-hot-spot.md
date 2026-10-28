# Look variants

## Camera orchestra

| variant | stage p5/p50/p95 | fur L/hue/sat | rabbit torso p10/p50/p90 hue/sat | floor L | floor R | chair L/hue/sat | shadow p5/ratio | conductor | hall p50/p90 |
|---|---|---|---|---|---|---|---|---|---|
| reference | 26/107/212 | 163/19°/0.30 | - | 191/28°/0.54 | 158/26°/0.60 | - | 63/2.6 | 52/18°/0.73 | 12/49 |
| b-no-hot-on-players | 25/101/174 | 169/28°/0.42 | 46/130/183 26°/0.49 | 116/25°/0.64 | 111/23°/0.67 | 178/29°/0.40 | 74/1.7 | 24/15°/0.86 | 14/34 |
| k7.5-no-hot-on-players | 29/106/182 | 178/29°/0.40 | 47/137/190 26°/0.48 | 122/23°/0.66 | 118/23°/0.68 | 186/29°/0.39 | 78/1.7 | 27/15°/0.81 | 14/34 |

## Camera default

The white fur of each variant takes the pixels of the variant b-no-hot-on-players, and n gives the count of its own mask (`tools/look-regions.ts`).

| variant | front rows p50/p90 | back rows p50/p90 | back floor p50 | fur front p50/p90 | fur back p50/p90 | fur back/front p90 |
|---|---|---|---|---|---|---|
| reference | - | - | 41 | 185/246 n 10827 | 164/242 n 10203 | 0.98 |
| b-no-hot-on-players | 97/184 | 85/162 | 63 | 191/218 n 13952 | 163/202 n 9555 | 0.93 |
| k7.5-no-hot-on-players | 101/191 | 87/164 | 63 | 198/222 n 14893 | 164/205 n 9618 | 0.93 |
