// The distance of each camera from the stage center, as a factor of the default distance
// (docs/research/2026-10-18-shot-light-lens-haze.md, section 2.3). Run after pnpm build, from
// the root: node docs/research/2026-10-18-shot-light-lens-haze/ratios.ts
import { readFile } from 'node:fs/promises';
import { DEFAULT_DEMO } from '../../../src/app/demos.ts';
import { layoutScene } from '../../../src/models/layout-scene.ts';
import { ModelCache } from '../../../src/models/model-cache.ts';
import { buildScore } from '../../../src/score/score.ts';
import { SHOT_SEED, prepareShots } from '../../../src/shots/prepare.ts';
import { cameraAt } from '../../../src/shots/camera-at.ts';
import { defaultDistance, defaultView } from '../../../src/shots/view.ts';
const bytes = new Uint8Array(await readFile(`public/demos/${DEFAULT_DEMO}.mid`));
const r = buildScore(bytes, 'auto'); if (!r.ok) throw new Error(r.error);
const models = new ModelCache();
const plan = prepareShots(r.score, layoutScene(r.score, models), SHOT_SEED, models);
const S = plan.stageSide, aspect = 1.6, D = defaultDistance(S, aspect);
const dv = defaultView(S, aspect, 1);
const norm = (p: readonly number[]) => Math.hypot(p[0]!, p[1]!, p[2]!);
console.log('S', S.toFixed(2), 'default view ratio', (norm(dv.position) / D).toFixed(3));
const t = dv.target, p = dv.position;
const o = [0, 1, 2].map((k) => t[k]! + (p[k]! - t[k]!) * 0.95 ** 5);
console.log('orchestra (5 wheel steps, no drag) ratio', (norm(o) / D).toFixed(3));
const transport = { playing: true, startSec: 0, changedAtWall: 0 } as never;
const byKind = new Map<string, number[]>();
for (const shot of plan.shots.slice(1, -1)) {
  for (const f of [0.1, 0.5, 0.9]) {
    const time = shot.startSec + (shot.endSec - shot.startSec) * f;
    const pose = cameraAt(plan, time, transport, { aspect, still: false });
    const list = byKind.get(shot.kind) ?? []; list.push(norm(pose.position) / D); byKind.set(shot.kind, list);
  }
}
for (const [kind, list] of byKind) console.log(kind, 'ratio min', Math.min(...list).toFixed(3), 'max', Math.max(...list).toFixed(3));
