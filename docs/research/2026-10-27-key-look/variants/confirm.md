# Look variants

## Camera orchestra

| variant | stage p5/p50/p95 | fur L/hue/sat | rabbit torso p10/p50/p90 hue/sat | floor L | floor R | chair L/hue/sat | shadow p5/ratio | conductor | hall p50/p90 |
|---|---|---|---|---|---|---|---|---|---|
| reference | 26/107/212 | 163/19°/0.30 | - | 191/28°/0.54 | 158/26°/0.60 | - | 63/2.6 | 52/18°/0.73 | 12/49 |
| k6-b2.4 | 31/112/174 | 169/28°/0.42 | 45/132/181 25°/0.50 | 139/23°/0.65 | 133/23°/0.66 | 178/29°/0.40 | 86/1.7 | 52/19°/0.76 | 14/34 |
| k5.8-b2.5 | 31/111/173 | 167/28°/0.42 | 45/131/180 25°/0.50 | 140/25°/0.63 | 133/23°/0.65 | 177/29°/0.40 | 86/1.7 | 53/20°/0.78 | 14/34 |

## Camera default

The white fur of each variant takes the pixels of the variant k6-b2.4, and n gives the count of its own mask (`tools/look-regions.ts`).

| variant | front rows p50/p90 | back rows p50/p90 | back floor p50 | fur front p50/p90 | fur back p50/p90 | fur back/front p90 |
|---|---|---|---|---|---|---|
| reference | - | - | 41 | 185/246 n 10827 | 164/242 n 10203 | 0.98 |
| k6-b2.4 | 97/181 | 85/162 | 61 | 191/217 n 13082 | 164/202 n 9126 | 0.93 |
| k5.8-b2.5 | 96/180 | 84/162 | 61 | 189/217 n 12849 | 163/201 n 9092 | 0.93 |
