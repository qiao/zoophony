// Prints the geometry of the key light and its shadow map for each demo, and the width of the
// shadow edge of an area light (docs/research/2026-10-17-cinematic-lighting.md, sections 2 and 4).
// Run from the root of the repository: node docs/research/2026-10-17-cinematic-lighting/stage_light.ts
import { Vector3 } from 'three';
import { SPOT_HEIGHT_IN_SIDES } from '../../../src/models/beam.ts';
import { layoutScene } from '../../../src/models/layout-scene.ts';
import { ModelCache } from '../../../src/models/model-cache.ts';
import { KEY_LIGHT, keyShadowFrustum } from '../../../src/scene/lights.ts';
import { TIER_SETTINGS } from '../../../src/scene/quality.ts';
import { scoreOf } from '../../../src/score/test-score.ts';
import { patchedDemos } from '../../../tools/patch-demos.ts';

/** Example heights of the top of a caster above the stage top, in meters. */
const CASTERS = [
  ['chair seat', 0.45],
  ['stand desk', 1.1],
  ['seated head', 1.3],
] as const;

/** Widths of an area light, in meters. */
const LIGHT_SIZES = [0.6, 1.0, 2.0] as const;

const rows = [];
for (const demo of await patchedDemos()) {
  const layout = layoutScene(scoreOf(demo.bytes), new ModelCache());
  const side = layout.stageSide;
  const light = new Vector3(0, SPOT_HEIGHT_IN_SIDES * side, KEY_LIGHT.position[2] * side);
  const [px, , pz] = layout.conductor ? layout.podium : [0, 0, 0];
  const target = new Vector3(px * KEY_LIGHT.aimToPodium, 0, pz * KEY_LIGHT.aimToPodium);
  const frustum = keyShadowFrustum(side, light.toArray(), target.toArray(), KEY_LIGHT.angle);
  const distance = light.distanceTo(target);
  const texel = (mapSize: number) => (2 * distance * Math.tan(frustum.halfAngle)) / mapSize;
  rows.push({ demo: demo.file, side, height: light.y, distance, texel });
}

console.log('demo                   S (m)  light height (m)  light to aim (m)  texel high (cm)');
for (const row of rows) {
  console.log(
    `${row.demo.padEnd(22)} ${row.side.toFixed(2).padStart(5)}  ${row.height.toFixed(2).padStart(16)}  ${row.distance.toFixed(2).padStart(16)}  ${(row.texel(TIER_SETTINGS.high.shadowMapSize) * 100).toFixed(2).padStart(15)}`,
  );
}

const main = rows.find((row) => row.demo.startsWith('boulanger'));
if (!main) {
  throw new Error('The default demo boulanger-matin is missing.');
}
console.log(`\nDefault demo ${main.demo}: S ${main.side.toFixed(2)} m, light height ${main.height.toFixed(2)} m`);
for (const tier of ['high', 'medium', 'low'] as const) {
  const settings = TIER_SETTINGS[tier];
  const texel = main.texel(settings.shadowMapSize);
  console.log(
    `PCF of the ${tier} tier: map ${settings.shadowMapSize}, radius ${settings.shadowRadius} texels, texel ${(texel * 100).toFixed(2)} cm, edge width ${(2 * settings.shadowRadius * texel * 100).toFixed(1)} cm`,
  );
}

// An area light of width L at the height H casts an edge of width L × h / (H - h) at the end of
// the shadow of a caster of the height h (similar triangles, on a flat receiver).
console.log('\nEdge width at the end of the shadow, in cm');
console.log(`caster              ${LIGHT_SIZES.map((size) => `L ${size.toFixed(1)} m`.padStart(9)).join('')}`);
for (const [name, h] of CASTERS) {
  const widths = LIGHT_SIZES.map((size) => ((size * h) / (main.height - h)) * 100);
  console.log(`${`${name} ${h} m`.padEnd(20)}${widths.map((w) => w.toFixed(1).padStart(9)).join('')}`);
}
