import { Quaternion, Vector3 } from 'three';
import type { BodyBones } from './biped.ts';
import { seated } from './body-frame.ts';
import type { Stance } from './body-frame.ts';
import { oval, plate } from './face-plates.ts';
import { srgb } from './mesh.ts';
import type { Finish, MeshBuilder, Rgb } from './mesh.ts';
import { unpackMesh } from './packed-mesh.ts';
import type { UnpackedMesh } from './packed-mesh.ts';
import { BONE_NAMES, BONE_PARENTS, boneIndex } from './rig.ts';
import { RIGGED_BONES, RIGGED_REGIONS } from './rigged-format.ts';
import type { RiggedBody, RiggedBone, RiggedEye, RiggedRegion } from './rigged-format.ts';
import type { SpeciesParams } from './species.ts';
import type { Vec3 } from './tuples.ts';

/**
 * The eye plates of a rigged body, in parts of the radius of the dark eye of the texture: the
 * radius of each plate, and the distance of its front face in front of the head. The back face of
 * each plate is under the surface of the head, so the plate shows no gap at its edge.
 */
const EYE = {
  /**
   * The dark brown iris. The radius of the texture eye reaches the far corners of its faces, so
   * the iris is smaller.
   */
  iris: { radius: 0.75, front: 0.1, corners: 8, color: '#3b2418' },
  /** The black pupil. */
  pupil: { radius: 0.45, front: 0.14, corners: 6, color: '#120c0a' },
  /** The white light, up and toward the front. */
  light: { radius: 0.2, front: 0.18, corners: 5, color: '#fbf7f0' },
  /** The middle of the light, as (across, up). */
  lightAt: [-0.24, 0.27] as const,
  /** The depth of the back faces under the surface of the head. */
  back: 0.3,
} as const;

/** The finish of the color regions of a rigged body. Each region has the same finish. */
const REGION_FINISH: Finish = 'matte';

/** The place of the mouth below the tip of the nose, in H. */
const MOUTH_DROP = 0.08;

/** The direction down. */
const DOWN = new Vector3(0, -1, 0);

/**
 * The slope of a seated thigh below the level, in radians. The seat of a rigged body fits its
 * legs (`seatDrop()`), and with level thighs the seat of the rabbit was half as high as the chair
 * of the parametric bodies.
 */
const THIGH_SLOPE = (20 * Math.PI) / 180;

/** The direction of a seated thigh: to the front of the animal and a little down. */
const THIGH = new Vector3(0, -Math.sin(THIGH_SLOPE), -Math.cos(THIGH_SLOPE));

/** The world rotation of each bone that turns in the bind pose. The other bones keep the rest pose. */
type BindTurns = ReadonlyMap<RiggedBone, Quaternion>;

/** The bones of a rigged body in a pose: the place and the turn of each bone. */
interface PosedBones {
  /** The place of the head of each bone. */
  readonly places: ReadonlyMap<RiggedBone, Vector3>;
  /** Moves a point of the rest pose with one bone. */
  readonly move: (bone: number, point: Vector3, out: Vector3) => Vector3;
}

/**
 * Builds a rigged body in its bind pose for a stance, and adds its triangles to a mesh (design 4.4,
 * 4.7). The rest pose of the mesh is a T-pose. The bind pose turns the arms down beside the body,
 * as the parametric body has them, with the weights of the mesh. On a seat, the haunch rests on
 * the seat, the thighs turn forward and a little down, and the shins turn down. The limbs keep the
 * lengths of the mesh, and the seat of the body fits its legs (`seatDrop()`). Standing, the legs
 * keep the rest pose. The body takes the colors of its species, and an eye plate on each eye bone
 * over the eyes of the texture, so that the eyes blink.
 *
 * @param builder The mesh that gets the triangles.
 * @param species The species parameters.
 * @param stance The seat under the body, or no seat.
 * @param body The rigged body.
 * @returns The bind positions of the body bones.
 */
export function buildRiggedBody(
  builder: MeshBuilder,
  species: SpeciesParams,
  stance: Stance,
  body: RiggedBody,
): BodyBones {
  const mesh = unpackMesh(body.mesh);
  const bones = poseBones(body, bindTurns(body, stance));
  const points = posedVertices(mesh, bones);
  // The haunch rests on the seat. A sloped thigh goes lower in front of the seat.
  const offset =
    stance.kind === 'seated'
      ? new Vector3(0, stance.seatHeight - lowest(mesh, points, ['hips']), -stance.forward)
      : new Vector3();
  for (const point of points) {
    point.add(offset);
  }
  addTriangles(builder, species, body.darkColor, mesh, points);

  const at = (bone: RiggedBone): Vec3 => {
    const p = (bones.places.get(bone) ?? new Vector3()).clone().add(offset);
    return [p.x, p.y, p.z];
  };
  const moved = (point: Vec3): Vec3 => {
    // The head keeps its rest pose, so a point of the head moves with the offset only.
    const p = new Vector3(...point).add(offset);
    return [p.x, p.y, p.z];
  };
  const eyeL = addEye(builder, body.eyes.eyeL, offset, 'eyeL');
  const eyeR = addEye(builder, body.eyes.eyeR, offset, 'eyeR');
  const nose = moved(body.nose);
  const head = at('head');
  const midpoint = (a: Vec3, b: Vec3): Vec3 => [
    (a[0] + b[0]) / 2,
    (a[1] + b[1]) / 2,
    (a[2] + b[2]) / 2,
  ];
  const tip = (side: 'L' | 'R'): Vec3 => {
    const rest = new Vector3(...body.fingerTips[`fingers${side}`]);
    const p = bones.move(boneIndex(`fingers${side}`), rest, new Vector3()).add(offset);
    return [p.x, p.y, p.z];
  };

  return {
    headHeight: body.headHeight,
    headCenter: moved(body.headCenter),
    mouth: [nose[0], nose[1] - MOUTH_DROP * body.headHeight, nose[2]],
    floor: [0, 0, -(stance.kind === 'seated' ? stance.forward : 0)],
    palmL: midpoint(at('handL'), at('fingersL')),
    palmR: midpoint(at('handR'), at('fingersR')),
    fingerBlockL: midpoint(at('fingersL'), tip('L')),
    fingerBlockR: midpoint(at('fingersR'), tip('R')),
    positions: {
      root: [0, 0, 0],
      hips: at('hips'),
      spine: at('spine'),
      chest: at('chest'),
      neck: at('neck'),
      head,
      jaw: nose,
      eyeL,
      eyeR,
      earL: at('earL'),
      earR: at('earR'),
      tail1: at('tail1'),
      tail2: at('tail2'),
      trunk1: head,
      trunk2: head,
      trunk3: head,
      shoulderL: at('shoulderL'),
      upperArmL: at('upperArmL'),
      forearmL: at('forearmL'),
      handL: at('handL'),
      fingersL: at('fingersL'),
      shoulderR: at('shoulderR'),
      upperArmR: at('upperArmR'),
      forearmR: at('forearmR'),
      handR: at('handR'),
      fingersR: at('fingersR'),
      thighL: at('thighL'),
      shinL: at('shinL'),
      footL: at('footL'),
      thighR: at('thighR'),
      shinR: at('shinR'),
      footR: at('footR'),
    },
  };
}

/**
 * Gives the height of the seat above the soles of a seated rigged body: the seat that lets its
 * feet rest on the floor, or on the foot ring of the high stool, with the lengths of its legs.
 *
 * @param body The rigged body.
 * @returns The height, in meters.
 */
export function seatDrop(body: RiggedBody): number {
  const mesh = unpackMesh(body.mesh);
  const points = posedVertices(mesh, poseBones(body, bindTurns(body, seated(0))));
  return (
    lowest(mesh, points, ['hips']) - lowest(mesh, points, ['shinL', 'shinR', 'footL', 'footR'])
  );
}

/**
 * Gives the world rotations of the bind pose: each bone of an arm points down, and on a seat,
 * each thigh points forward and a little down, and each shin points down. Each rotation is the
 * smallest one from the rest direction of the bone, so a T-pose arm turns its palm to the body.
 *
 * @param body The rigged body.
 * @param stance The stance.
 * @returns The rotations.
 */
function bindTurns(body: RiggedBody, stance: Stance): BindTurns {
  const turns = new Map<RiggedBone, Quaternion>();
  const toward = (bone: RiggedBone, end: Vec3, direction: Vector3): void => {
    const rest = new Vector3(...end).sub(new Vector3(...body.joints[bone])).normalize();
    turns.set(bone, new Quaternion().setFromUnitVectors(rest, direction));
  };
  for (const side of ['L', 'R'] as const) {
    toward(`upperArm${side}`, body.joints[`forearm${side}`], DOWN);
    toward(`forearm${side}`, body.joints[`hand${side}`], DOWN);
    toward(`hand${side}`, body.joints[`fingers${side}`], DOWN);
    toward(`fingers${side}`, body.fingerTips[`fingers${side}`], DOWN);
    if (stance.kind === 'seated') {
      toward(`thigh${side}`, body.joints[`shin${side}`], THIGH);
      toward(`shin${side}`, body.joints[`foot${side}`], DOWN);
    }
  }
  return turns;
}

/**
 * Poses the bones with forward kinematics: the head of each bone moves with the rotation of its
 * parent.
 *
 * @param body The rigged body.
 * @param bind The rotations.
 * @returns The posed bones.
 */
function poseBones(body: RiggedBody, bind: BindTurns): PosedBones {
  const places = new Map<RiggedBone, Vector3>();
  const rotations = new Map<number, Quaternion>();
  const rests = new Map<number, Vector3>();
  const heads = new Map<number, Vector3>();

  const move = (bone: number, point: Vector3, out: Vector3): Vector3 => {
    const rest = rests.get(bone);
    const head = heads.get(bone);
    if (!rest || !head) {
      return out.copy(point);
    }
    out
      .copy(point)
      .sub(rest)
      .applyQuaternion(rotations.get(bone) ?? new Quaternion());
    return out.add(head);
  };

  for (const bone of RIGGED_BONES) {
    const index = boneIndex(bone);
    const rest = new Vector3(...body.joints[bone]);
    const parent = BONE_PARENTS[bone];
    const place = parent === 'root' ? rest.clone() : move(boneIndex(parent), rest, new Vector3());
    places.set(bone, place);
    rests.set(index, rest);
    heads.set(index, place);
    rotations.set(index, bind.get(bone) ?? new Quaternion());
  }
  return { places, move };
}

/**
 * Poses each vertex with its two bones: the mix of the places that each bone gives it.
 *
 * @param mesh The unpacked mesh in the rest pose.
 * @param bones The posed bones.
 * @returns The posed place of each vertex.
 */
function posedVertices(mesh: UnpackedMesh, bones: PosedBones): Vector3[] {
  const rest = new Vector3();
  const second = new Vector3();
  const count = mesh.positions.length / 3;
  return Array.from({ length: count }, (_, v) => {
    rest.fromArray(mesh.positions, v * 3);
    const w = mesh.blendWeights[v] ?? 0;
    const out = bones.move(mesh.bones[v] ?? 0, rest, new Vector3());
    if (w > 0) {
      bones.move(mesh.blendBones[v] ?? 0, rest, second);
      out.lerp(second, w);
    }
    return out;
  });
}

/**
 * Gives the lowest height of the vertices whose main bone is one of some bones.
 *
 * @param mesh The unpacked mesh.
 * @param points The posed place of each vertex.
 * @param bones The bones.
 * @returns The lowest height.
 */
function lowest(
  mesh: UnpackedMesh,
  points: readonly Vector3[],
  bones: readonly RiggedBone[],
): number {
  const wanted = new Set(bones.map((bone) => boneIndex(bone)));
  let low = Infinity;
  for (const [v, point] of points.entries()) {
    if (wanted.has(mesh.bones[v] ?? -1)) {
      low = Math.min(low, point.y);
    }
  }
  return low;
}

/**
 * Adds the triangles of a posed mesh, with the colors of the species. Each corner keeps the two
 * bones and the weight of its vertex.
 *
 * @param builder The mesh that gets the triangles.
 * @param species The species parameters.
 * @param darkColor The color of the dark region.
 * @param mesh The unpacked mesh.
 * @param points The posed place of each vertex.
 */
function addTriangles(
  builder: MeshBuilder,
  species: SpeciesParams,
  darkColor: string,
  mesh: UnpackedMesh,
  points: readonly Vector3[],
): void {
  const colors: Readonly<Record<RiggedRegion, Rgb>> = {
    fur: srgb(species.colors.fur),
    accent: srgb(species.colors.accent),
    dark: srgb(darkColor),
  };
  // The skin rule finds the vertex of a corner by its exact place.
  const skins = new Map<string, number>();
  for (const [v, p] of points.entries()) {
    skins.set(`${p.x} ${p.y} ${p.z}`, v);
  }
  const skin = (p: Vec3) => {
    const v = skins.get(`${p[0]} ${p[1]} ${p[2]}`) ?? 0;
    return {
      bone: mesh.bones[v] ?? 0,
      blendBone: mesh.blendBones[v] ?? 0,
      blendWeight: mesh.blendWeights[v] ?? 0,
    };
  };

  for (const [r, region] of RIGGED_REGIONS.entries()) {
    const corners: number[] = [];
    for (let t = 0; t < mesh.regions.length; t++) {
      if (mesh.regions[t] !== r) {
        continue;
      }
      for (let k = 0; k < 3; k++) {
        const p = points[mesh.corners[t * 3 + k] ?? 0] ?? new Vector3();
        corners.push(p.x, p.y, p.z);
      }
    }
    if (corners.length > 0) {
      builder.add(corners, { color: colors[region], finish: REGION_FINISH, skin });
    }
  }
}

/**
 * Adds an eye plate on an eye bone: a dark iris, a black pupil, and a white light, over the eye of
 * the texture.
 *
 * @param builder The mesh that gets the plates.
 * @param eye The eye of the rigged body.
 * @param offset The move of the body from its rest place.
 * @param bone The eye bone.
 * @returns The middle of the eye: the bind position of its bone.
 */
function addEye(
  builder: MeshBuilder,
  eye: RiggedEye,
  offset: Vector3,
  bone: 'eyeL' | 'eyeR',
): Vec3 {
  const middle = new Vector3(...eye.middle).add(offset);
  const out = new Vector3(...eye.normal).normalize();
  const up = new Vector3(0, 1, 0).projectOnPlane(out).normalize();
  const across = new Vector3().crossVectors(up, out);
  const place = (a: number, b: number, o: number): Vec3 => {
    const p = middle
      .clone()
      .addScaledVector(across, a * eye.radius)
      .addScaledVector(up, b * eye.radius)
      .addScaledVector(out, o * eye.radius);
    return [p.x, p.y, p.z];
  };
  const index = BONE_NAMES.indexOf(bone);
  const add = (corners: readonly number[], color: string): void => {
    builder.add(corners, { color: srgb(color), bone: index, finish: 'lacquer' });
  };

  for (const part of [EYE.iris, EYE.pupil]) {
    const { radius, corners } = part;
    add(
      plate(oval([0, 0], radius, radius, radius, corners), -EYE.back, part.front, place),
      part.color,
    );
  }
  const { light } = EYE;
  add(
    plate(
      oval(EYE.lightAt, light.radius, light.radius, light.radius, light.corners),
      -EYE.back,
      light.front,
      place,
    ),
    light.color,
  );
  return [middle.x, middle.y, middle.z];
}
