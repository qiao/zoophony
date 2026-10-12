// The compare page: renders the animal in the sheet views, aligns each render to its reference
// mask, and calculates the silhouette IoU. studio/shoot.mjs reads window.__compare.
//
// Alignment: the render is scaled so that its height equals the height of the reference mask,
// and its lowest pixel sits on the ground row of the reference. Then the x shift with the best
// IoU in a window of +-40 px is chosen. A view with a range in config compare.head_turn also
// gets the head turn (of the bone "head" of the biped template) with the best IoU, for the
// compare render only. Nothing else is fitted.
//
// Options of `python3 studio calibrate` (studio/calibrate.py), off by default: ?views=front
// renders only these views, ?flat=1 gives every mesh a white material with no vertex colors
// (the light alone), and ?transparent=1 keeps the background of the renders transparent.

import * as THREE from 'three';
import {
  SETTINGS,
  SHEET_BACKGROUND_CSS,
  VIEWS,
  addLights,
  createRenderer,
  loadModel,
  placeSheetCamera,
  poseAt,
} from './scene.js';

const params = new URLSearchParams(location.search);
const glbUrl = params.get('glb') ?? SETTINGS.glb;
const clipName = params.get('clip') ?? 'reference';
const clipTime = Number(params.get('t') ?? 0);
const RENDER = 1000;
const SEARCH = 40;
const [ROW0, ROW1] = SETTINGS.compare.rows;
const ONLY = params.get('views')?.split(',') ?? null;
const FLAT = params.get('flat') === '1';
const TRANSPARENT = params.get('transparent') === '1';

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/** Converts sRGB 0..255 to hue (degrees), saturation, and value (0..1). */
function hsv(r, g, b) {
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const d = mx - mn;
  let h = 0;
  if (d > 0) {
    if (mx === r) {
      h = ((g - b) / d) % 6;
    } else if (mx === g) {
      h = (b - r) / d + 2;
    } else {
      h = (r - g) / d + 4;
    }
  }
  return [(h * 60 + 360) % 360, mx > 0 ? d / mx : 0, mx / 255];
}

/** Calculates the median hue, saturation, and value of fur pixels (rgba data, mask, rows). */
function furStats(data, stride, mask, maskStride, maskOffset, rows, width) {
  const hs = [];
  const ss = [];
  const vs = [];
  for (const y of rows) {
    for (let x = 0; x < width; x++) {
      if (!mask[y * maskStride + maskOffset + x]) {
        continue;
      }
      const o = (y * stride + x) * 4;
      const [h, s, v] = hsv(data[o], data[o + 1], data[o + 2]);
      // Fur only: no dark claws, no white props, no gray background at the edges (config
      // compare.fur_min_saturation, 0.2 by default).
      if (v < 0.18 || s < (SETTINGS.compare.furMinSaturation ?? 0.2)) {
        continue;
      }
      hs.push(h);
      ss.push(s);
      vs.push(v);
    }
  }
  if (hs.length === 0) {
    // No fur pixel (a dark render of studio/calibrate.py).
    return { hue: null, sat: null, val: null, litHue: null, litSat: null, n: 0 };
  }
  const med = (a) => Float32Array.from(a).sort()[Math.floor(a.length / 2)];
  // The lit quarter: the pixels with the highest value.
  const vCut = Float32Array.from(vs).sort()[Math.floor(vs.length * 0.75)];
  const litH = hs.filter((_, i) => vs[i] >= vCut);
  const litS = ss.filter((_, i) => vs[i] >= vCut);
  return {
    hue: Number(med(hs).toFixed(1)),
    sat: Number(med(ss).toFixed(3)),
    val: Number(med(vs).toFixed(3)),
    litHue: litH.length ? Number(med(litH).toFixed(1)) : null,
    litSat: litS.length ? Number(med(litS).toFixed(3)) : null,
    n: hs.length,
  };
}

function canvas2d(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d', { willReadFrequently: true })];
}

const meta = await (await fetch(SETTINGS.measure)).json();
const sheet = await loadImage(SETTINGS.sheet);
const glCanvas = document.createElement('canvas');
glCanvas.width = RENDER;
glCanvas.height = RENDER;
const renderer = createRenderer(glCanvas, { alpha: true, preserve: true });
renderer.setClearColor(0x000000, 0);
renderer.setSize(RENDER, RENDER, false);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(7.4, 1, 0.1, 100);
const lights = addLights(scene, camera);
const model = await loadModel(glbUrl);
scene.add(model.root);
if (FLAT) {
  for (const mesh of model.meshes) {
    for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
      m.color?.set(0xffffff);
      m.vertexColors = false;
      m.map = null;
      m.needsUpdate = true;
    }
  }
}
const posed = poseAt(model, clipName, clipTime);

const results = {};
const tiles = [];
const faces = {};
const renders = {};

/** The head bone of the biped template, which compare.head_turn turns. */
const headBone = model.root.getObjectByName('head');

/** The head turn range of each view in degrees (config compare.head_turn). */
const TURNS = SETTINGS.compare.headTurn ?? {};

/** Sets the pose of the clip, then turns the head bone about the vertical axis of the world by
 * deg (positive: the snout turns to the right of the animal, toward a positive azimuth). */
function turnHead(deg) {
  poseAt(model, clipName, clipTime);
  if (deg === 0) {
    return;
  }
  if (!headBone) {
    throw new Error('compare.head_turn: the GLB has no bone "head"');
  }
  const parent = new THREE.Quaternion();
  headBone.parent.getWorldQuaternion(parent);
  const turn = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(0, 1, 0),
    THREE.MathUtils.degToRad(-deg),
  );
  const local = parent.clone().invert().multiply(turn).multiply(parent).multiply(headBone.quaternion);
  headBone.quaternion.copy(local);
  model.root.updateMatrixWorld(true);
}

/** Renders a view, aligns the render to the reference mask, and finds the x shift with the best
 * IoU. Returns the render canvas, the scale and the offsets of the render on the sheet, the
 * model mask (wider than the column by SEARCH on each side), and the best shift and IoU. */
function renderAligned(view, vm, ref, colW, H) {
  placeSheetCamera(camera, view.azimuth);
  lights.aim(camera);
  renderer.render(scene, camera);
  const [rc, rctx] = canvas2d(RENDER, RENDER);
  rctx.drawImage(glCanvas, 0, 0);
  const rdata = rctx.getImageData(0, 0, RENDER, RENDER).data;
  let x0 = RENDER;
  let x1 = -1;
  let y0 = RENDER;
  let y1 = -1;
  for (let y = 0; y < RENDER; y++) {
    for (let x = 0; x < RENDER; x++) {
      if (rdata[(y * RENDER + x) * 4 + 3] > 127) {
        x0 = Math.min(x0, x);
        x1 = Math.max(x1, x);
        y0 = Math.min(y0, y);
        y1 = Math.max(y1, y);
      }
    }
  }
  const scale = vm.height_px / (y1 - y0 + 1);
  const oy = vm.ground_px - (y1 + 1) * scale;
  const boxCenter = (vm.box[0] + vm.box[2] + 1) / 2 - vm.column[0];
  const ox = boxCenter - ((x0 + x1 + 1) / 2) * scale;

  // The model mask on a canvas that is wider than the column by SEARCH on each side.
  const W2 = colW + 2 * SEARCH;
  const [, mctx] = canvas2d(W2, H);
  mctx.imageSmoothingQuality = 'high';
  mctx.drawImage(rc, ox + SEARCH, oy, RENDER * scale, RENDER * scale);
  const mdata = mctx.getImageData(0, 0, W2, H).data;
  const model = new Uint8Array(W2 * H);
  for (let i = 0; i < W2 * H; i++) {
    model[i] = mdata[i * 4 + 3] > 127 ? 1 : 0;
  }

  let best = { iou: -1, dx: 0 };
  for (let dx = -SEARCH; dx <= SEARCH; dx++) {
    let inter = 0;
    let union = 0;
    for (let y = 0; y < H; y++) {
      const rowR = y * colW;
      const rowM = y * W2 + SEARCH - dx;
      for (let x = 0; x < colW; x++) {
        const a = ref[rowR + x];
        const b = model[rowM + x];
        inter += a & b;
        union += a | b;
      }
    }
    const iou = inter / union;
    if (iou > best.iou) {
      best = { iou, dx };
    }
  }
  return { rc, scale, ox, oy, model, W2, best };
}

/** Finds the head turn of a view with the best IoU in a range [from, to] of degrees: every 4
 * degrees, then 2 and 1 degrees around the best. `none` is the result with no turn. Returns
 * [turn, the result of renderAligned]; a tie keeps the smaller turn that came first. */
function fitHeadTurn(range, render, none) {
  const tried = new Map([[0, none]]);
  const at = (deg) => {
    if (!tried.has(deg)) {
      turnHead(deg);
      tried.set(deg, render());
    }
    return tried.get(deg);
  };
  const [lo, hi] = range.map(Math.round);
  for (let deg = lo; deg <= hi; deg += 4) {
    at(deg);
  }
  at(hi);
  const bestOf = () => [...tried.entries()].reduce((a, b) => (b[1].best.iou > a[1].best.iou ? b : a));
  for (const step of [2, 1]) {
    const [deg] = bestOf();
    for (const d of [deg - step, deg + step]) {
      if (d >= lo && d <= hi) {
        at(d);
      }
    }
  }
  const found = bestOf();
  turnHead(0);
  return found;
}

for (const [name, view] of Object.entries(VIEWS)) {
  if (ONLY && !ONLY.includes(name)) {
    continue;
  }
  const vm = meta.views[name];
  const [col0, col1] = vm.column;
  const colW = col1 - col0;
  const H = meta.sheet[1];

  const refImg = await loadImage(`${SETTINGS.masks}/${name}.png`);
  const [, refCtx] = canvas2d(colW, H);
  refCtx.drawImage(refImg, col0, 0, colW, H, 0, 0, colW, H);
  const refData = refCtx.getImageData(0, 0, colW, H).data;
  const ref = new Uint8Array(colW * H);
  for (let i = 0; i < colW * H; i++) {
    ref[i] = refData[i * 4] > 127 ? 1 : 0;
  }

  const render = () => renderAligned(view, vm, ref, colW, H);
  let aligned = render();
  let headTurn;
  let iouNoTurn;
  if (TURNS[name]) {
    iouNoTurn = aligned.best.iou;
    [headTurn, aligned] = fitHeadTurn(TURNS[name], render, aligned);
  }
  const { rc, scale, ox, oy, model, W2, best } = aligned;

  // The tiles: the reference, the render on the sheet color, and the overlay.
  const tileH = ROW1 - ROW0;
  const [tc, tctx] = canvas2d(colW * 3, tileH);
  tctx.drawImage(sheet, col0, ROW0, colW, tileH, 0, 0, colW, tileH);
  tctx.fillStyle = SHEET_BACKGROUND_CSS;
  tctx.fillRect(colW, 0, colW, tileH);
  tctx.drawImage(rc, colW + ox + best.dx, oy - ROW0, RENDER * scale, RENDER * scale);
  const ov = tctx.createImageData(colW, tileH);
  let modelColor = [0, 0, 0];
  let modelCount = 0;
  const modelLum = [];
  const tdata = tctx.getImageData(colW, 0, colW, tileH).data;
  for (let y = 0; y < tileH; y++) {
    for (let x = 0; x < colW; x++) {
      const a = ref[(y + ROW0) * colW + x];
      const b = model[(y + ROW0) * W2 + SEARCH - best.dx + x];
      const o = (y * colW + x) * 4;
      const c = a && b ? [150, 150, 150] : a ? [220, 40, 40] : b ? [40, 90, 230] : [255, 255, 255];
      ov.data.set([...c, 255], o);
      if (b) {
        modelColor = modelColor.map((v, k) => v + tdata[o + k]);
        modelCount++;
        modelLum.push(0.299 * tdata[o] + 0.587 * tdata[o + 1] + 0.114 * tdata[o + 2]);
      }
    }
  }
  tctx.putImageData(ov, colW * 2, 0);
  tiles.push(tc);

  // A close crop of the head: the sheet and the render side by side, both at 3x.
  const top = vm.box[1];
  const headH = Math.round(vm.height_px * SETTINGS.compare.headShare);
  let hx0 = colW;
  let hx1 = 0;
  for (let y = top; y < top + headH; y++) {
    for (let x = 0; x < colW; x++) {
      if (ref[y * colW + x]) {
        hx0 = Math.min(hx0, x);
        hx1 = Math.max(hx1, x);
      }
    }
  }
  hx0 = Math.max(0, hx0 - 10);
  hx1 = Math.min(colW - 1, hx1 + 10);
  const cw = hx1 - hx0 + 1;
  const ch = headH + 16;
  const cy = top - 8 - ROW0;
  const Z = 3;
  const [fc, fctx] = canvas2d(cw * Z * 2 + 8, ch * Z);
  fctx.fillStyle = '#fff';
  fctx.fillRect(0, 0, fc.width, fc.height);
  fctx.imageSmoothingQuality = 'high';
  fctx.drawImage(tc, hx0, cy, cw, ch, 0, 0, cw * Z, ch * Z);
  fctx.drawImage(tc, colW + hx0, cy, cw, ch, cw * Z + 8, 0, cw * Z, ch * Z);
  faces[name] = fc.toDataURL('image/png');

  // Close crops of the facets in the front view: the sheet beside the render at 2x.
  if (name === 'front') {
    const regions = SETTINGS.compare.facetCrops;
    for (const [rname, [mx0, my0, mx1, my1]] of Object.entries(regions)) {
      const ax = vm.axis_px - col0;
      const px0 = Math.round(ax + mx0 * vm.height_px);
      const px1 = Math.round(ax + mx1 * vm.height_px);
      const py0 = Math.round(vm.ground_px - my1 * vm.height_px) - ROW0;
      const py1 = Math.round(vm.ground_px - my0 * vm.height_px) - ROW0;
      const w = px1 - px0;
      const h = py1 - py0;
      const Zf = 2;
      const [cc, cctx] = canvas2d(w * Zf * 2 + 8, h * Zf);
      cctx.fillStyle = '#fff';
      cctx.fillRect(0, 0, cc.width, cc.height);
      cctx.imageSmoothingQuality = 'high';
      cctx.drawImage(tc, px0, py0, w, h, 0, 0, w * Zf, h * Zf);
      cctx.drawImage(tc, colW + px0, py0, w, h, w * Zf + 8, 0, w * Zf, h * Zf);
      faces[`facets_${rname}`] = cc.toDataURL('image/png');
    }
  }

  // The mean color of the animal pixels of the reference.
  const [, sctx] = canvas2d(colW, H);
  sctx.drawImage(sheet, col0, 0, colW, H, 0, 0, colW, H);
  const sdata = sctx.getImageData(0, 0, colW, H).data;
  let refColor = [0, 0, 0];
  let refCount = 0;
  const refLum = [];
  for (let i = 0; i < colW * H; i++) {
    if (ref[i]) {
      refColor = refColor.map((v, k) => v + sdata[i * 4 + k]);
      refCount++;
      refLum.push(0.299 * sdata[i * 4] + 0.587 * sdata[i * 4 + 1] + 0.114 * sdata[i * 4 + 2]);
    }
  }
  const pct = (arr) => {
    const s = Float32Array.from(arr).sort();
    return [0.1, 0.5, 0.9].map((q) => Math.round(s[Math.floor(q * (s.length - 1))]));
  };
  // The fur band: the trunk and the arms, no head, no feet (config compare.fur_band).
  const [band0, band1] = SETTINGS.compare.furBand;
  const furRows = [];
  for (let k = band0; k <= band1; k += 1 / vm.height_px) {
    furRows.push(Math.round(vm.ground_px - k * vm.height_px));
  }
  const refFur = furStats(sdata, colW, ref, colW, 0, furRows, colW);
  const [, mfctx] = canvas2d(colW, H);
  if (!TRANSPARENT) {
    mfctx.fillStyle = SHEET_BACKGROUND_CSS;
    mfctx.fillRect(0, 0, colW, H);
  }
  mfctx.drawImage(rc, ox + best.dx, oy, RENDER * scale, RENDER * scale);
  const mdat = mfctx.getImageData(0, 0, colW, H).data;
  const modelFur = furStats(mdat, colW, model, W2, SEARCH - best.dx, furRows, colW);
  renders[name] = mfctx.canvas.toDataURL('image/png');
  results[name] = {
    refFurHSV: refFur,
    modelFurHSV: modelFur,
    iou: Number(best.iou.toFixed(4)),
    dx: best.dx,
    scale: Number(scale.toFixed(4)),
    refMeanRGB: refColor.map((v) => Math.round(v / refCount)),
    modelMeanRGB: modelColor.map((v) => Math.round(v / Math.max(modelCount, 1))),
    refLuma10_50_90: pct(refLum),
    modelLuma10_50_90: pct(modelLum),
  };
  if (headTurn !== undefined) {
    results[name].headTurn = headTurn;
    results[name].iouNoTurn = Number(iouNoTurn.toFixed(4));
  }
}

// One row per view: reference | render | overlay.
const tileW = tiles.map((t) => t.width);
const totalW = Math.max(...tileW);
const tileH = ROW1 - ROW0;
const [out, octx] = canvas2d(totalW * 2, tileH * 2);
octx.fillStyle = '#fff';
octx.fillRect(0, 0, out.width, out.height);
tiles.forEach((t, i) => {
  octx.drawImage(t, (i % 2) * totalW, Math.floor(i / 2) * tileH);
});
octx.fillStyle = '#222';
octx.font = '16px system-ui';
Object.entries(results).forEach(([name, r], i) => {
  octx.fillText(`${name}  IoU ${r.iou.toFixed(3)}`, (i % 2) * totalW + 8, Math.floor(i / 2) * tileH + 20);
});
document.body.append(out);
window.__compare = { clip: clipName, posed, results, faces, renders, png: out.toDataURL('image/png') };
