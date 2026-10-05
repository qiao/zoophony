import {
  AdditiveBlending,
  Color,
  CylinderGeometry,
  FrontSide,
  Group,
  HemisphereLight,
  Mesh,
  ShaderMaterial,
  SpotLight,
} from 'three';

import { DEG } from '../models/math.ts';
import { TIER_SETTINGS } from './quality.ts';
import type { QualityTier } from './quality.ts';

/** The height of the spotlight above the stage center, in stage sides (design 4.5). */
export const SPOT_HEIGHT_IN_SIDES = 1.2;

/**
 * The half angle of the spotlight cone (design 4.5). three.js dims the cone from
 * `angle × (1 - penumbra)` to `angle`, so this angle keeps the stage corners dimly lit.
 */
export const SPOT_ANGLE = 36 * DEG;

/** The penumbra of the spotlight (design 4.5). */
export const SPOT_PENUMBRA = 0.6;

/**
 * The illuminance of the spotlight at the stage center, in lux. The intensity in candela is this
 * value times the square of the light height, so the stage center has the same brightness on
 * each stage size. Step 3 tunes it against the reference image (design 4.5).
 */
export const SPOT_ILLUMINANCE = 2.2;

/** The radius of the visible beam on the stage, in stage sides (design 4.5). */
export const BEAM_RADIUS_IN_SIDES = 0.75;

/**
 * The opacity of the visible beam at the light. It goes to 0 at the stage (design 4.5). Each
 * canvas pixel clamps the opacity to 1.
 */
export const BEAM_TOP_OPACITY = 1.0;

const BEAM_VERTEX = /* glsl */ `
uniform float uHeight;
varying float vFromTop;
varying vec3 vViewNormal;
varying vec3 vViewPosition;
void main() {
  // The cone geometry runs from y = -uHeight / 2 (stage) to y = uHeight / 2 (light).
  vFromTop = 0.5 - position.y / uHeight;
  vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
  vViewPosition = viewPosition.xyz;
  vViewNormal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * viewPosition;
}
`;

const BEAM_FRAGMENT = /* glsl */ `
uniform vec3 uColor;
uniform float uTopOpacity;
varying float vFromTop;
varying vec3 vViewNormal;
varying vec3 vViewPosition;
void main() {
  // The cone fades at its outline, so that its edges are soft. It also fades in over the first
  // tenth below the light, so that a far camera sees no hard tip.
  float facing = abs(dot(normalize(vViewNormal), normalize(-vViewPosition)));
  float fade = (1.0 - vFromTop) * smoothstep(0.0, 0.1, vFromTop);
  float opacity = uTopOpacity * fade * facing * facing;
  gl_FragColor = vec4(uColor, opacity);
}
`;

/**
 * Creates the visible beam: an open cone from the light to the light circle on the stage, with
 * additive blending (design 4.5).
 *
 * @param stageSide The stage side `S`, in meters.
 * @returns The beam mesh. It casts and receives no shadows.
 */
function createBeam(stageSide: number): Mesh {
  const height = SPOT_HEIGHT_IN_SIDES * stageSide;
  const geometry = new CylinderGeometry(
    0.02 * stageSide,
    BEAM_RADIUS_IN_SIDES * stageSide,
    height,
    96,
    1,
    true,
  );
  const material = new ShaderMaterial({
    uniforms: {
      uColor: { value: new Color('#e8dcc0') },
      uTopOpacity: { value: BEAM_TOP_OPACITY },
      uHeight: { value: height },
    },
    vertexShader: BEAM_VERTEX,
    fragmentShader: BEAM_FRAGMENT,
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
    side: FrontSide,
  });
  const beam = new Mesh(geometry, material);
  beam.position.y = height / 2;
  beam.renderOrder = 1;
  return beam;
}

/**
 * Creates the lights of the stage: the spotlight, the fill light, and the visible beam (design
 * 4.5). The spotlight scales with the stage.
 *
 * @param stageSide The stage side `S`, in meters.
 * @param tier The quality tier. It sets the shadow map size and the shadow blur.
 * @returns A group with the lights, the target of the spotlight, and the beam.
 */
export function createLights(stageSide: number, tier: QualityTier): Group {
  const group = new Group();
  const height = SPOT_HEIGHT_IN_SIDES * stageSide;

  const spot = new SpotLight('#ffe9c7', SPOT_ILLUMINANCE * height * height);
  spot.position.set(0, height, 0);
  spot.angle = SPOT_ANGLE;
  spot.penumbra = SPOT_PENUMBRA;
  spot.decay = 2;
  spot.castShadow = true;
  const settings = TIER_SETTINGS[tier];
  spot.shadow.mapSize.set(settings.shadowMapSize, settings.shadowMapSize);
  spot.shadow.radius = settings.shadowRadius;
  // The tallest item on the stage is about 2 m high, so the shadow depth range starts well above it.
  spot.shadow.camera.near = height - 3;
  spot.shadow.camera.far = height + 1;
  spot.shadow.bias = -0.0005;
  spot.shadow.normalBias = 0.01;
  spot.target.position.set(0, 0, 0);
  group.add(spot, spot.target);

  group.add(new HemisphereLight('#3a3530', '#0e0c0a', 12));
  group.add(createBeam(stageSide));
  return group;
}
