// Probe of the round panda-mouth. Writes a module with marker colors on the smile: the line on the lower lip green, the other
// dark faces of the mouth (the corners) blue. node docs/research/2026-10-18-panda-face/mouth-marker.ts <in.ts> <out.ts>
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { FINISH_ORDER } from '../../../src/models/mesh.ts';
import { STUDIO_INFLUENCES, packStudioMesh, unpackStudioMesh } from '../../../src/models/studio-format.ts';

const [inPath, outPath] = process.argv.slice(2);
const { STUDIO_PANDA } = await import(resolve(inPath));
const mesh = unpackStudioMesh(STUDIO_PANDA.mesh);
const nv = mesh.positions.length / 3;
const vertices = Array.from({ length: nv }, (_, v) => {
  const skin: [number, number][] = [];
  for (let k = 0; k < STUDIO_INFLUENCES; k++) {
    const w = mesh.weights[v * STUDIO_INFLUENCES + k];
    if (w > 0) skin.push([mesh.joints[v * STUDIO_INFLUENCES + k], w]);
  }
  return { position: [mesh.positions[v * 3], mesh.positions[v * 3 + 1], mesh.positions[v * 3 + 2]] as [number, number, number], skin };
});
let line = 0, corner = 0;
const triangles = Array.from({ length: mesh.corners.length / 3 }, (_, t) => {
  const c = [mesh.corners[t * 3], mesh.corners[t * 3 + 1], mesh.corners[t * 3 + 2]] as [number, number, number];
  let color: [number, number, number] = [mesh.colors[t * 3], mesh.colors[t * 3 + 1], mesh.colors[t * 3 + 2]];
  const p = c.map((v) => vertices[v].position);
  const ctr = [0, 1, 2].map((k) => (p[0][k] + p[1][k] + p[2][k]) / 3);
  const u = [0, 1, 2].map((k) => p[1][k] - p[0][k]);
  const w = [0, 1, 2].map((k) => p[2][k] - p[0][k]);
  const n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
  const len = Math.hypot(...n);
  const [nx, ny, nz] = n.map((x) => x / len);
  void nx;
  const lum = 0.2126 * color[0] + 0.7152 * color[1] + 0.0722 * color[2];
  const mouth = mesh.finishes[t] === 0 && Math.abs(ctr[0]) < 0.13 && ctr[1] > 1.15 && ctr[1] < 1.215 && ctr[2] < -0.38 && lum < 0.05;
  if (mouth) {
    const isLine = Math.abs(ctr[0]) < 0.095 && nz < -0.5 && ny > -0.3;
    color = isLine ? [0, 1, 0] : [0, 0, 1];
    if (isLine) line++; else corner++;
  }
  return { corners: c, color, finish: FINISH_ORDER[mesh.finishes[t]] };
});
const correctives = mesh.correctives.map((cv) => Array.from({ length: nv }, (_, v) => [cv[v * 3], cv[v * 3 + 1], cv[v * 3 + 2]] as [number, number, number]));
const text = readFileSync(inPath, 'utf8').replace(/mesh: '[^']*'/, `mesh: '${packStudioMesh(vertices, triangles, correctives)}'`);
writeFileSync(outPath, text);
console.log(outPath, 'line', line, 'corner', corner);
