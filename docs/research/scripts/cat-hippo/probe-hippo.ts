// A probe of stage P4a: copy it to src/pose/probe-hippo.test.ts to run it, and remove it after the run.
import { appendFileSync } from 'node:fs';

import { it } from 'vitest';

import { note, programChange, tempo, timeSignature, track } from '../midi/test-smf.ts';
import type { TestFile } from '../midi/test-smf.ts';
import type { PosePlan } from './plan.ts';
import { createScenePose, poseAt } from './pose-at.ts';
import { demoLooks, partDistance, posedNeck, posedPart } from './test-clearance.ts';
import { poseSkeleton } from './test-kinematics.ts';
import { PLAYING, sceneOf } from './test-scene.ts';

const FLOOR_FILE: TestFile = {
  tracks: [
    [tempo(0, 120), timeSignature(0, 4, 4)],
    track([programChange(0, 2, 42)], note(0, 2, 36, 900), note(960, 2, 81, 1860)),
    track([programChange(0, 3, 43)], note(0, 3, 28, 900), note(960, 3, 67, 1860)),
  ],
};

it('prints the distance of each head bone of the hippo to the neck of the contrabass', async () => {
  const scene = sceneOf(FLOOR_FILE);
  const looks = await demoLooks(['contrabass']);
  const index = scene.layout.players.findIndex((p) => p.cast.instrument === 'contrabass');
  const plan = scene.plan.players[index];
  const place = scene.layout.players[index];
  if (!plan || !place) {
    throw new Error('no player');
  }
  const { species, instrument, kettles, support } = place.cast;
  const model = scene.models.get(species, instrument, kettles, support);
  const bones = ['head', 'jaw', 'eyeL', 'eyeR', 'earL', 'earR'] as const;
  const nearest = new Map<string, number>(bones.map((b) => [b, 1]));
  for (const [lookYaw, lookPitch] of looks) {
    const one: PosePlan = { ...scene.plan, players: [{ ...plan, lookYaw, lookPitch }] };
    const buffer = createScenePose(one);
    for (const songTime of [0.25, 0.75, 1.25, 1.75]) {
      for (let wall = 10; wall < 40; wall += 2) {
        const pose = poseAt(one, songTime, wall, PLAYING, [], buffer).players[0];
        if (!pose) {
          continue;
        }
        const posed = poseSkeleton(model, pose);
        for (const bone of bones) {
          const d = partDistance(posedPart(posed, [bone]), posedNeck(posed), 1);
          nearest.set(bone, Math.min(nearest.get(bone) ?? 1, d));
        }
        for (let y = 0.6; y < 2.0; y += 0.1) {
          for (const z of [-1, -0.5, -0.25, 0, 0.25]) {
            const keep = (c: readonly { x: number; y: number; z: number }[]): boolean => {
              const my = (c[0]!.y + c[1]!.y + c[2]!.y) / 3;
              const mz = (c[0]!.z + c[1]!.z + c[2]!.z) / 3;
              return my >= y && my < y + 0.1 && mz >= z && mz < z + 0.25;
            };
            const part = posedPart(posed, ['head'], keep);
            if (part.triangles.length === 0) {
              continue;
            }
            const key = `y${y.toFixed(1)} z${z}`;
            const d = partDistance(part, posedNeck(posed), 1);
            nearest.set(key, Math.min(nearest.get(key) ?? 1, d));
          }
        }
      }
    }
  }
  {
    const one: PosePlan = { ...scene.plan, players: [{ ...plan, lookYaw: 0, lookPitch: 0 }] };
    const pose = poseAt(one, 0.25, 10, PLAYING, [], createScenePose(one)).players[0];
    if (pose) {
      const posed = poseSkeleton(model, pose);
      const neck = posedNeck(posed);
      const head = posedPart(posed, ['head']);
      const rows: string[] = [];
      for (let y = 1.1; y < 1.9; y += 0.1) {
        const xs = (part: typeof neck): string => {
          const v = part.triangles.flatMap((tr) => [tr.a, tr.b, tr.c]).filter((p) => p.y >= y && p.y < y + 0.1);
          if (v.length === 0) {
            return '-';
          }
          const x = v.map((p) => p.x);
          const z = v.map((p) => p.z);
          return `x ${Math.min(...x).toFixed(3)}..${Math.max(...x).toFixed(3)} z ${Math.min(...z).toFixed(3)}..${Math.max(...z).toFixed(3)}`;
        };
        rows.push(`y ${y.toFixed(1)}: neck ${xs(neck)} | head ${xs(head)}`);
      }
      appendFileSync(process.env['P4A_LOG'] ?? 'probe.log', rows.join('\n') + '\n');
    }
  }
  appendFileSync(
    process.env['P4A_LOG'] ?? 'probe.log',
    `${species} ${JSON.stringify([...nearest])}\n`,
  );
}, 120000);
