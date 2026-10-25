/**
 * Prints the tip of each stick or mallet of the badger snare drummer and cymbalist at the
 * moments of the close views (the test notes of ROLE_VIEWS), in the model axes (the player faces
 * -z, its left is -x): the distance of the tip from its playing spot and from the rim on the floor
 * plane, the height above the spot, the direction of the stick (in toward the middle from forward,
 * up from the level), and the forearm direction.
 * Usage: [ROLE=<role>] [TIMES=<s,...>] node docs/research/2026-10-25-percussion-tips/tips.ts [--set <changes>]...
 */
import { Vector3 } from 'three';

import { galleryPlan } from '../../../src/gallery/plan.ts';
import type { GalleryAnimal } from '../../../src/gallery/plan.ts';
import { parseTestNotes } from '../../../src/gallery/notes.ts';
import { buildPlayer } from '../../../src/models/player.ts';
import { boneIndex } from '../../../src/models/rig.ts';
import { createScenePose, poseAt } from '../../../src/pose/pose-at.ts';
import { poseSkeleton, posedPiecePoint } from '../../../src/pose/test-kinematics.ts';
import { NOT_STARTED } from '../../../src/pose/test-scene.ts';
import type { Transport } from '../../../src/pose/types.ts';
import { PERCUSSION_HOLDS, SUSPENDED_CYMBAL_HOLD } from '../../../src/pose/percussion-rig.ts';
import { SNARE_DRUM } from '../../../src/models/instruments/percussion.ts';
import { setHolds } from '../../../tools/hold-sets.ts';

const PLAYING: Transport = {
  playing: true,
  changedAtWall: -100,
  before: null,
  startSec: 0,
  holdSec: 3,
  leadSec: Number.POSITIVE_INFINITY,
};

interface Role {
  readonly name: string;
  readonly instrument: 'snare-drum' | 'cymbals';
  readonly notes: string;
  readonly moments: readonly [string, number | null][];
}

const ROLES: readonly Role[] = [
  {
    name: 'snare-drummer',
    instrument: 'snare-drum',
    notes: ['0.5 0.25 38', '0.75 0.25 38', '1 0.25 38', '1.25 0.25 38', '2 0.5 38'].join('\n'),
    moments: [
      ['right', 0.5],
      ['left', 0.75],
      ['between', 1.5],
      ['rest', null],
    ],
  },
  {
    name: 'cymbalist',
    instrument: 'cymbals',
    notes: ['0.5 1 49', '2.5 1 49'].join('\n'),
    moments: [
      ['crash', 0.5],
      ['open', 1.5],
      ['rest', null],
    ],
  },
];

const deg = (r: number): string => ((r * 180) / Math.PI).toFixed(0);
const cm = (m: number): string => (m * 100).toFixed(1);
const args = process.argv.slice(2);
const sets = [''];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--set') {
    sets.push(args[++i] ?? '');
  }
}
const only = process.env['ROLE'];

for (const text of sets) {
  const changes = text ? setHolds(text) : null;
  try {
    console.log(`== ${text || 'tree'}`);
    for (const role of ROLES) {
      if (only && only !== role.name) {
        continue;
      }
      const model = buildPlayer('badger', role.instrument);
      const hold =
        role.instrument === 'cymbals' ? SUSPENDED_CYMBAL_HOLD : PERCUSSION_HOLDS['snare-drum'];
      const target = model.instrument.targets.find((t) => t.kind === "head");
      const center = new Vector3(...(target?.from ?? [0, 0, 0]));
      const radius = role.instrument === 'cymbals' ? 0.2 : SNARE_DRUM.radius;
      const animal: GalleryAnimal = {
        model,
        place: {
          position: [0, 0, 0],
          facing: Math.PI,
          cast: {
            species: 'badger',
            instrument: role.instrument,
            support: 'stand',
            seatIndex: 0,
            player: 0,
            kettles: 4,
          },
        },
      };
      const parsed = parseTestNotes(role.notes);
      if (!parsed.ok) {
        throw new Error('bad notes');
      }
      const plan = galleryPlan([animal], null, parsed.notes);
      const buffer = createScenePose(plan);
      console.log(`${role.name}`);
      const times = process.env["TIMES"];
      const moments: readonly [string, number | null][] = times
        ? times.split(",").map((t): [string, number] => [t, Number(t)])
        : role.moments;
      for (const [name, time] of moments) {
        const transport = time === null ? NOT_STARTED : PLAYING;
        const scene = poseAt(plan, time ?? 0, 20, transport, [], buffer);
        const pose = scene.players[0];
        if (!pose) {
          throw new Error('no pose');
        }
        const posed = poseSkeleton(model, pose);
        const cells: string[] = [];
        for (const side of ['L', 'R'] as const) {
          const bone = side === 'L' ? 'malletL' : 'malletR';
          const head = model.instrument.targets.find(
            (t) => t.kind === 'mallet-head' && t.bone === bone,
          );
          if (!head) {
            continue;
          }
          const grip = new Vector3(...posedPiecePoint(posed, { bone, at: [0, 0, 0] }));
          const tip = new Vector3(...posedPiecePoint(posed, { bone, at: head.from }));
          const d = tip.clone().sub(grip).normalize();
          const offset = side === 'L' ? hold.offsetL : hold.offsetR;
          const spot = center.clone().add(new Vector3(...offset));
          const flat = (v: Vector3): Vector3 => new Vector3(v.x, 0, v.z);
          const fromSpot = flat(tip).distanceTo(flat(spot));
          const inRim = radius - flat(tip).distanceTo(flat(center));
          const inward = Math.atan2(side === 'L' ? d.x : -d.x, -d.z);
          const up = Math.asin(d.y);
          const elbow = posed.frames[boneIndex(`forearm${side}`)]?.position ?? new Vector3();
          const wrist = posed.frames[boneIndex(`hand${side}`)]?.position ?? new Vector3();
          const f = wrist.clone().sub(elbow).normalize();
          const fIn = Math.atan2(side === 'L' ? f.x : -f.x, -f.z);
          const fUp = Math.asin(f.y);
          cells.push(
            `${side}: spot ${cm(fromSpot)} rimIn ${cm(inRim)} up ${cm(tip.y - spot.y)} | ` +
              `stick in ${deg(inward)} up ${deg(up)} | fore in ${deg(fIn)} up ${deg(fUp)} | ` +
              `tip ${cm(tip.x)},${cm(tip.y)},${cm(tip.z)}`,
          );
        }
        console.log(`  ${name.padEnd(8)} ${cells.join('  ||  ')}`);
      }
    }
  } finally {
    changes?.undo();
  }
}
