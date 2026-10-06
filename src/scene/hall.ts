import {
  BufferAttribute,
  BufferGeometry,
  CircleGeometry,
  Color,
  Group,
  Mesh,
  MeshStandardMaterial,
  ShaderMaterial,
  Vector2,
  Vector3,
} from 'three';

import type { Vec3 } from '../models/tuples.ts';
import { srgb } from '../models/mesh.ts';
import type { Rgb } from '../models/mesh.ts';
import { STAGE_THICKNESS } from '../models/stage.ts';

/**
 * The concert hall around the stage (design 4.5, hall). The values are parts of the hall unit
 * `h`, the stage side with a minimum (see {@link hallUnit}). The hall is a ring of walls with two
 * balcony tiers and rows of small warm lamps, as in `scene.png`. All its faces point into the
 * hall, so a camera outside the ring sees through the near side to the far side.
 */
export const HALL = {
  /** The smallest hall unit, in meters, so that a small stage still stands in a large hall. */
  minUnit: 9,
  /** The radius of the wall ring. */
  wallRadius: 1.45,
  /**
   * The center of the ring is this far in front of the stage center (+z), so that the back wall
   * stands closer behind the stage than the side walls.
   */
  centerZ: 0.25,
  /** The height of the walls above the floor. */
  wallHeight: 1.5,
  /** The number of flat faces of the ring. */
  segments: 36,
  /** The balcony tiers: the height of the balcony floor, and its depth from the wall. */
  tiers: [
    { height: 0.3, depth: 0.12 },
    { height: 0.56, depth: 0.1 },
  ],
  /** The height of the rail at the front of a balcony. */
  railHeight: 0.05,
  /** The lamps on a rail stand this far apart, in meters. */
  lampSpacing: 2.6,
  /** The size of a lamp, in meters. */
  lampSize: 0.14,
  /**
   * The cutaway: a camera outside the ring sees no part of the hall within this angle of its own
   * direction from the ring center, so that the near balconies do not stand in front of the
   * stage. The side lamps stay, as at the edges of `mockup.png`.
   */
  cutawayAngle: (75 * Math.PI) / 180,
} as const;

/** The colors of the hall, as sRGB (design 4.5, scene colors). */
export const HALL_COLORS = {
  wall: '#30241c',
  /** Every second wall face, as a wood panel. */
  panel: '#281e17',
  balconyFront: '#3c2c21',
  /** The gilded edge at the top of a rail. */
  trim: '#8c6c4a',
  underside: '#120d0a',
  /** The light of a lamp, in linear values above 1, so that the bloom takes it. */
  lamp: [9, 5.2, 2.4],
} as const;

/** The baked light of the hall: the glow of the lit stage, and the dark far from it. */
export const HALL_LIGHT = {
  /** The light everywhere, as a part of the base color. */
  ambient: 0.18,
  /** The light from the stage, as a part of the base color, at the stage. */
  glow: 2.2,
  /** The distance at which the glow halves, in hall units. */
  glowReach: 0.7,
  /** The light at the top of the walls, as a part of the light at the floor. */
  top: 0.35,
} as const;

/** The geometry of one part of the hall, with no index: three vertices for each triangle. */
export interface HallMesh {
  /** x, y, z of each vertex, in meters. */
  readonly positions: Float32Array;
  /** Linear r, g, b of each vertex. */
  readonly colors: Float32Array;
}

/** The hall: the shell with baked light, and the lamps. */
export interface HallData {
  readonly shell: HallMesh;
  readonly lamps: HallMesh;
  /** The center of each lamp. */
  readonly lampCenters: readonly Vec3[];
}

/**
 * Gives the hall unit: the stage side, but at least {@link HALL}.minUnit.
 *
 * @param stageSide The stage side `S`, in meters.
 * @returns The hall unit `h`, in meters.
 */
export function hallUnit(stageSide: number): number {
  return Math.max(stageSide, HALL.minUnit);
}

/** Collects triangles with a color for each vertex. */
class TriangleList {
  readonly positions: number[] = [];
  readonly colors: number[] = [];

  /** Adds a triangle. The corners go counterclockwise, seen from the side that shows. */
  add(a: Vec3, b: Vec3, c: Vec3, colors: readonly [Rgb, Rgb, Rgb]): void {
    for (const [i, p] of [a, b, c].entries()) {
      this.positions.push(p[0], p[1], p[2]);
      const color = colors[i] ?? colors[0];
      this.colors.push(color[0], color[1], color[2]);
    }
  }

  build(): HallMesh {
    return { positions: new Float32Array(this.positions), colors: new Float32Array(this.colors) };
  }
}

/**
 * Calculates the baked light of a point of the hall: the ambient light, plus the glow of the lit
 * stage, which falls off with the distance and with the height.
 *
 * @param point The point.
 * @param normal The normal of its face, of length 1.
 * @param unit The hall unit `h`.
 * @returns The factor of the base color.
 */
export function hallLight(point: Vec3, normal: Vec3, unit: number): number {
  const light = HALL_LIGHT;
  const [x, y, z] = point;
  // The glow comes from a point above the stage center.
  const to: Vec3 = [-x, 0.25 * unit - y, -z];
  const distance = Math.hypot(...to);
  const facing = Math.max(
    0,
    (normal[0] * to[0] + normal[1] * to[1] + normal[2] * to[2]) / distance,
  );
  const reach = light.glowReach * unit;
  const glow = light.glow / (1 + (distance / reach) ** 2);
  const height = Math.min(1, Math.max(0, (y + STAGE_THICKNESS) / (HALL.wallHeight * unit)));
  const fade = 1 + (light.top - 1) * height;
  return (light.ambient + glow * (0.3 + 0.7 * facing)) * fade;
}

/**
 * Bakes the light of a triangle into the colors of its corners.
 *
 * @param corners The corners.
 * @param base The linear base color.
 * @param unit The hall unit.
 * @returns The color of each corner.
 */
function bake(corners: readonly [Vec3, Vec3, Vec3], base: Rgb, unit: number): [Rgb, Rgb, Rgb] {
  const [a, b, c] = corners;
  const u: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const v: Vec3 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const n: Vec3 = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  const length = Math.hypot(...n) || 1;
  const normal: Vec3 = [n[0] / length, n[1] / length, n[2] / length];
  const shade = (p: Vec3): Rgb => {
    const k = hallLight(p, normal, unit);
    return [base[0] * k, base[1] * k, base[2] * k];
  };
  return [shade(a), shade(b), shade(c)];
}

/** Adds a quad with baked light: two triangles, corners counterclockwise from the side that shows. */
function addQuad(
  list: TriangleList,
  corners: readonly [Vec3, Vec3, Vec3, Vec3],
  base: Rgb,
  unit: number,
): void {
  const [a, b, c, d] = corners;
  list.add(a, b, c, bake([a, b, c], base, unit));
  list.add(a, c, d, bake([a, c, d], base, unit));
}

/**
 * Builds the hall around a stage (design 4.5, hall): the wall ring, two balcony tiers with a rail
 * and a gilded edge, and the lamps on the rails. The floor is a separate mesh, because the
 * spotlight lights it.
 *
 * @param stageSide The stage side `S`, in meters.
 * @returns The shell and the lamps.
 */
export function buildHall(stageSide: number): HallData {
  const unit = hallUnit(stageSide);
  const shell = new TriangleList();
  const floorY = -STAGE_THICKNESS;
  const centerZ = HALL.centerZ * unit;
  const segments = HALL.segments;
  const ring = (radius: number, i: number, y: number): Vec3 => {
    const angle = (i / segments) * Math.PI * 2;
    return [radius * Math.sin(angle), y, centerZ + radius * Math.cos(angle)];
  };
  const wallRadius = HALL.wallRadius * unit;
  const top = floorY + HALL.wallHeight * unit;
  // The wall faces go in three bands, so that the baked light can fade with the height.
  const bands = [floorY, floorY + 0.25 * (top - floorY), floorY + 0.6 * (top - floorY), top];
  for (let i = 0; i < segments; i++) {
    const color = srgb(i % 2 === 0 ? HALL_COLORS.wall : HALL_COLORS.panel);
    for (let k = 0; k + 1 < bands.length; k++) {
      const y0 = bands[k] ?? floorY;
      const y1 = bands[k + 1] ?? top;
      // The face points to the ring center: counterclockwise seen from inside.
      addQuad(
        shell,
        [
          ring(wallRadius, i + 1, y0),
          ring(wallRadius, i, y0),
          ring(wallRadius, i, y1),
          ring(wallRadius, i + 1, y1),
        ],
        color,
        unit,
      );
    }
  }

  const lamps = new TriangleList();
  const lampCenters: Vec3[] = [];
  const lampColor: Rgb = [...HALL_COLORS.lamp];
  for (const tier of HALL.tiers) {
    const y = floorY + tier.height * unit;
    const railTop = y + HALL.railHeight * unit;
    const inner = wallRadius - tier.depth * unit;
    for (let i = 0; i < segments; i++) {
      // The balcony floor, seen from above.
      addQuad(
        shell,
        [
          ring(inner, i, railTop),
          ring(wallRadius, i, railTop),
          ring(wallRadius, i + 1, railTop),
          ring(inner, i + 1, railTop),
        ],
        srgb(HALL_COLORS.balconyFront),
        unit,
      );
      // The underside, seen from below.
      addQuad(
        shell,
        [
          ring(inner, i, y),
          ring(inner, i + 1, y),
          ring(wallRadius, i + 1, y),
          ring(wallRadius, i, y),
        ],
        srgb(HALL_COLORS.underside),
        unit,
      );
      // The rail front, which points to the ring center, and the gilded edge on its top.
      const trimY = railTop - 0.2 * (railTop - y);
      addQuad(
        shell,
        [
          ring(inner, i + 1, y),
          ring(inner, i, y),
          ring(inner, i, trimY),
          ring(inner, i + 1, trimY),
        ],
        srgb(HALL_COLORS.balconyFront),
        unit,
      );
      addQuad(
        shell,
        [
          ring(inner, i + 1, trimY),
          ring(inner, i, trimY),
          ring(inner, i, railTop),
          ring(inner, i + 1, railTop),
        ],
        srgb(HALL_COLORS.trim),
        unit,
      );
    }
    const count = Math.round((2 * Math.PI * inner) / HALL.lampSpacing);
    for (let j = 0; j < count; j++) {
      const angle = ((j + 0.5) / count) * Math.PI * 2;
      // The lamp stands a little in front of the rail, at its gilded edge.
      const radius = inner - HALL.lampSize;
      const center: Vec3 = [
        radius * Math.sin(angle),
        railTop + HALL.lampSize,
        centerZ + radius * Math.cos(angle),
      ];
      lampCenters.push(center);
      addLamp(lamps, center, HALL.lampSize / 2, lampColor);
    }
  }
  return { shell: shell.build(), lamps: lamps.build(), lampCenters };
}

/**
 * Adds a lamp: an octahedron, so that it shows from each side.
 *
 * @param list The triangles of the lamps.
 * @param center The center.
 * @param radius The radius.
 * @param color The linear color.
 */
function addLamp(list: TriangleList, center: Vec3, radius: number, color: Rgb): void {
  const [x, y, z] = center;
  const top: Vec3 = [x, y + radius, z];
  const bottom: Vec3 = [x, y - radius, z];
  const ring: Vec3[] = [
    [x + radius, y, z],
    [x, y, z + radius],
    [x - radius, y, z],
    [x, y, z - radius],
  ];
  for (let i = 0; i < 4; i++) {
    const a = ring[i] ?? top;
    const b = ring[(i + 1) % 4] ?? top;
    list.add(a, top, b, [color, color, color]);
    list.add(a, b, bottom, [color, color, color]);
  }
}

/** The floor of the hall (design 4.5, hall): dark wood that the spotlight lights near the stage. */
export const HALL_FLOOR = {
  color: '#120d0a',
  roughness: 0.55,
} as const;

const HALL_VERTEX = /* glsl */ `
varying vec3 vColor;
varying vec2 vFloor;
void main() {
  vColor = color;
  vec4 world = modelMatrix * vec4(position, 1.0);
  vFloor = world.xz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const HALL_FRAGMENT = /* glsl */ `
uniform vec2 uCenter;
uniform vec2 uCameraDirection;
uniform float uCutaway;
varying vec3 vColor;
varying vec2 vFloor;
void main() {
  vec2 direction = normalize(vFloor - uCenter);
  if (dot(direction, uCameraDirection) > uCutaway) {
    discard;
  }
  gl_FragColor = vec4(vColor, 1.0);
  #include <colorspace_fragment>
}
`;

/** The cutaway of the hall for one camera. */
export interface HallCutaway {
  /** The direction from the ring center to the camera on the floor: x and z, of length 1. */
  readonly direction: readonly [number, number];
  /**
   * The cosine limit of the cut: a point whose direction from the ring center has a larger dot
   * product with `direction` is cut. 2 cuts nothing.
   */
  readonly limit: number;
}

/**
 * Calculates the cutaway of the hall for a camera (design 4.5, hall). A camera outside the ring
 * sees no part of the hall within {@link HALL}.cutawayAngle of its own direction. Inside the
 * ring, as in a close shot, the camera sees the full hall. Between 0.85 and 1.0 of the radius,
 * the cut opens from the back of the camera, so that a move of the camera has no jump.
 *
 * @param stageSide The stage side `S`, in meters.
 * @param camera The camera position.
 * @returns The cutaway.
 */
export function hallCutaway(stageSide: number, camera: Vec3): HallCutaway {
  const unit = hallUnit(stageSide);
  const dx = camera[0];
  const dz = camera[2] - HALL.centerZ * unit;
  const distance = Math.hypot(dx, dz);
  const radius = HALL.wallRadius * unit;
  const t = Math.min(1, Math.max(0, (distance / radius - 0.85) / 0.15));
  const open = t * t * (3 - 2 * t);
  // From 2 (no cut) down to the cosine of the cutaway angle.
  const limit = 2 + (Math.cos(HALL.cutawayAngle) - 2) * open;
  return { direction: distance > 0 ? [dx / distance, dz / distance] : [0, 1], limit };
}

/**
 * Creates the material of the shell and of the lamps: the baked colors, with the cutaway.
 *
 * @param unit The hall unit.
 * @returns The material. It takes no light.
 */
function hallMaterial(unit: number): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader: HALL_VERTEX,
    fragmentShader: HALL_FRAGMENT,
    vertexColors: true,
    uniforms: {
      uCenter: { value: new Vector2(0, HALL.centerZ * unit) },
      uCameraDirection: { value: new Vector2(0, 1) },
      uCutaway: { value: 2 },
    },
  });
}

/**
 * Sets the cutaway of the hall for the camera of a frame (design 4.5, hall).
 *
 * @param hall The group of {@link createHall}.
 * @param stageSide The stage side `S`, in meters.
 * @param camera The camera position.
 */
export function setHallCamera(hall: Group, stageSide: number, camera: Vector3): void {
  const { direction, limit } = hallCutaway(stageSide, [camera.x, camera.y, camera.z]);
  for (const child of hall.children) {
    if (child instanceof Mesh && child.material instanceof ShaderMaterial) {
      const uniforms = child.material.uniforms;
      const value = uniforms['uCameraDirection']?.value;
      if (value instanceof Vector2) {
        value.set(...direction);
      }
      const cutaway = uniforms['uCutaway'];
      if (cutaway) {
        cutaway.value = limit;
      }
    }
  }
}

/**
 * Makes a geometry of a hall mesh.
 *
 * @param mesh The positions and the colors.
 * @returns The geometry.
 */
function hallGeometry(mesh: HallMesh): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(mesh.positions, 3));
  geometry.setAttribute('color', new BufferAttribute(mesh.colors, 3));
  return geometry;
}

/**
 * Creates the hall around a stage (design 4.5, hall): the floor, the shell with its baked light,
 * and the lamps. The shell and the lamps take no light and cast no shadow, so they cost one draw
 * call each and no light math.
 *
 * @param stageSide The stage side `S`, in meters.
 * @returns A group with the floor, the shell, and the lamps.
 */
export function createHall(stageSide: number): Group {
  const data = buildHall(stageSide);
  const unit = hallUnit(stageSide);
  const shell = new Mesh(hallGeometry(data.shell), hallMaterial(unit));
  const lamps = new Mesh(hallGeometry(data.lamps), hallMaterial(unit));
  const floor = new Mesh(
    new CircleGeometry(HALL.wallRadius * unit, HALL.segments),
    new MeshStandardMaterial({
      color: new Color(HALL_FLOOR.color),
      roughness: HALL_FLOOR.roughness,
      metalness: 0,
    }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, -STAGE_THICKNESS, HALL.centerZ * unit);
  floor.receiveShadow = true;
  return new Group().add(floor, shell, lamps);
}
