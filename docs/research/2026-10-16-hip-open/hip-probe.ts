/**
 * Measures the hip angle of the seated rabbit and red fox from the side (the model axes: the
 * player faces -z, so the forward axis is -z), in the bind pose, in the rest pose, and in the
 * play pose with no notes:
 *
 * - the joint angle: the trunk axis from the middle of the hip joints to the neck joint against
 *   the thigh axis from the hip joint to the knee joint (180° is a straight body);
 * - the lean of the trunk axis from vertical (positive is forward);
 * - the gap of the back of the trunk to the top rail of the chair back.
 *
 * Usage, from the root of the worktree:
 *
 *     node docs/research/2026-10-16-hip-open/hip-probe.ts
 */
import { Vector3 } from 'three';

import { galleryPlan } from '../../../src/gallery/plan.ts';
import type { GalleryAnimal } from '../../../src/gallery/plan.ts';
import { galleryTransport } from '../../../src/gallery/items.ts';
import { CONDUCTOR } from '../../../src/models/cast.ts';
import { buildPlayer } from '../../../src/models/player.ts';
import type { PlayerModel } from '../../../src/models/player.ts';
import { chairBack } from '../../../src/models/props.ts';
import { boneIndex } from '../../../src/models/rig.ts';
import type { BoneName } from '../../../src/models/rig.ts';
import type { SpeciesId } from '../../../src/models/species.ts';
import { createScenePose, poseAt } from '../../../src/pose/pose-at.ts';
import { poseSkeleton } from '../../../src/pose/test-kinematics.ts';
import { NOT_STARTED } from '../../../src/pose/test-scene.ts';
import { posedCorner } from '../../../src/pose/test-skin.ts';

const trunk = new Set((['hips', 'spine', 'chest'] as BoneName[]).map(boneIndex));
const deg = (r: number): string => ((r * 180) / Math.PI).toFixed(1);

/** One measure of a body: its corners and joints in the model axes. */
interface Shape {
  readonly corner: (c: number) => Vector3;
  readonly joint: (bone: BoneName) => Vector3;
}

/**
 * Measures the angles of one shape.
 *
 * @param model The player model.
 * @param shape The corners and the joints.
 * @returns The text of the measures.
 */
function measure(model: PlayerModel, shape: Shape): string {
  const { bones } = model.mesh;
  const hipL = shape.joint('thighL');
  const hipR = shape.joint('thighR');
  const hip = hipL.clone().add(hipR).multiplyScalar(0.5);
  const knee = shape.joint('shinL');
  const neck = shape.joint('neck');
  // The side view: f is forward (-z), y is up.
  const trunkF = -(neck.z - hip.z);
  const trunkY = neck.y - hip.y;
  const thighF = -(knee.z - hipL.z);
  const thighY = knee.y - hipL.y;
  const joint = Math.acos(
    (trunkF * thighF + trunkY * thighY) / Math.hypot(trunkF, trunkY) / Math.hypot(thighF, thighY),
  );
  const lean = Math.atan2(trunkF, trunkY);

  // The gap of the back of the trunk to the top rail of the chair back.
  let rail = 'no seat';
  if (model.seat) {
    const box = chairBack(model.seat.seatHeight)[2];
    if (box) {
      let back = -Infinity;
      for (let c = 0; c < bones.length; c++) {
        if (!trunk.has(bones[c] ?? -1)) {
          continue;
        }
        const p = shape.corner(c);
        if (p.x >= box.min[0] && p.x <= box.max[0] && p.y >= box.min[1] && p.y <= box.max[1]) {
          back = Math.max(back, p.z);
        }
      }
      rail = back === -Infinity ? 'none at the rail' : `${((box.min[2] - back) * 100).toFixed(1)} cm`;
    }
  }
  // The pitch of the line from the head joint to the nose (the jaw bone of the player), from the
  // side: positive is up.
  const head = shape.joint('head');
  const jaw = shape.joint('jaw');
  const pitch = Math.atan2(jaw.y - head.y, -(jaw.z - head.z));
  return `joint ${deg(joint)}°, trunk lean ${deg(lean)}° forward, head pitch ${deg(pitch)}°, back to the rail ${rail}`;
}

for (const species of ['fox-red', 'rabbit'] as SpeciesId[]) {
  const model = buildPlayer(species, 'violin', 4, 'chair');
  const p = model.mesh.positions;
  const bind: Shape = {
    corner: (c) => new Vector3(p[c * 3], p[c * 3 + 1], p[c * 3 + 2]),
    joint: (bone) => new Vector3(...(model.skeleton.positions[boneIndex(bone)] ?? [0, 0, 0])),
  };
  console.log(`${species} bind: ${measure(model, bind)}`);

  const animal: GalleryAnimal = {
    model,
    place: {
      position: [0, 0, 0],
      facing: Math.PI,
      cast: {
        species,
        instrument: 'violin',
        support: 'chair',
        seatIndex: 0,
        player: 0,
        kettles: 4,
      },
    },
  };
  const conductor: GalleryAnimal = {
    model: buildPlayer(CONDUCTOR.species, CONDUCTOR.instrument),
    place: {
      position: [3, 0, 0],
      facing: Math.PI,
      cast: { ...CONDUCTOR, support: 'stand', seatIndex: 1, player: 0, kettles: 4 },
    },
  };
  const plan = galleryPlan([animal], conductor, []);
  const buffer = createScenePose(plan);
  for (const [name, transport, song] of [
    ['rest', NOT_STARTED, 0],
    ['play', galleryTransport(new URLSearchParams()), 5],
  ] as const) {
    const scene = poseAt(plan, song, 20, transport, [], buffer);
    const pose = scene.players[0];
    if (!pose) {
      throw new Error('no pose');
    }
    const posed = poseSkeleton(model, pose);
    // The posed corners and frames are in the model axes.
    const shape: Shape = {
      corner: (c) => new Vector3(...posedCorner(posed, c)),
      joint: (bone) => posed.frames[boneIndex(bone)]?.position.clone() ?? new Vector3(),
    };
    console.log(`${species} ${name}: ${measure(model, shape)}`);
  }
}
