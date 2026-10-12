// The compare page: renders the bear in the four sheet views, aligns each render to its
// reference mask, and calculates the silhouette IoU. tools/shoot.mjs reads window.__compare.
//
// Alignment: the render is scaled so that its height equals the height of the reference mask,
// and its lowest pixel sits on the ground row of the reference. Then the x shift with the best
// IoU in a window of +-40 px is chosen. Nothing else is fitted.

import * as THREE from 'three';
import {
  SHEET_BACKGROUND,
  VIEWS,
  addLights,
  createRenderer,
  loadBear,
  placeSheetCamera,
  poseAt,
} from './scene.js';

const params = new URLSearchParams(location.search);
const glbUrl = params.get('glb') ?? '/out/bear.glb';
const clipName = params.get('clip') ?? 'reference';
const clipTime = Number(params.get('t') ?? 0);
const RENDER = 1000;
const SEARCH = 40;
const ROW0 = 200;
const ROW1 = 790;

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function canvas2d(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d', { willReadFrequently: true })];
}

const meta = await (await fetch('/out/measure.json')).json();
const sheet = await loadImage('/reference/bear-views.png');
const glCanvas = document.createElement('canvas');
glCanvas.width = RENDER;
glCanvas.height = RENDER;
const renderer = createRenderer(glCanvas, { alpha: true, preserve: true });
renderer.setClearColor(0x000000, 0);
renderer.setSize(RENDER, RENDER, false);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(7.4, 1, 0.1, 100);
addLights(scene, camera);
const bear = await loadBear(glbUrl);
scene.add(bear.root);
const posed = poseAt(bear, clipName, clipTime);

const results = {};
const tiles = [];
for (const [name, view] of Object.entries(VIEWS)) {
  const vm = meta.views[name];
  const [col0, col1] = vm.column;
  const colW = col1 - col0;
  const H = meta.sheet[1];

  placeSheetCamera(camera, view.azimuth);
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
  const boxCenter = (vm.box[0] + vm.box[2] + 1) / 2 - col0;
  const ox = boxCenter - ((x0 + x1 + 1) / 2) * scale;

  // The model mask on a canvas that is wider than the column by SEARCH on each side.
  const W2 = colW + 2 * SEARCH;
  const [mc, mctx] = canvas2d(W2, H);
  mctx.imageSmoothingQuality = 'high';
  mctx.drawImage(rc, ox + SEARCH, oy, RENDER * scale, RENDER * scale);
  const mdata = mctx.getImageData(0, 0, W2, H).data;
  const model = new Uint8Array(W2 * H);
  for (let i = 0; i < W2 * H; i++) {
    model[i] = mdata[i * 4 + 3] > 127 ? 1 : 0;
  }

  const refImg = await loadImage(`/out/masks/${name}.png`);
  const [, refCtx] = canvas2d(colW, H);
  refCtx.drawImage(refImg, col0, 0, colW, H, 0, 0, colW, H);
  const refData = refCtx.getImageData(0, 0, colW, H).data;
  const ref = new Uint8Array(colW * H);
  for (let i = 0; i < colW * H; i++) {
    ref[i] = refData[i * 4] > 127 ? 1 : 0;
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

  // The tiles: the reference, the render on the sheet color, and the overlay.
  const tileH = ROW1 - ROW0;
  const [tc, tctx] = canvas2d(colW * 3, tileH);
  tctx.drawImage(sheet, col0, ROW0, colW, tileH, 0, 0, colW, tileH);
  tctx.fillStyle = `#${SHEET_BACKGROUND.toString(16)}`;
  tctx.fillRect(colW, 0, colW, tileH);
  tctx.drawImage(rc, colW + ox + best.dx, oy - ROW0, RENDER * scale, RENDER * scale);
  const ov = tctx.createImageData(colW, tileH);
  let modelColor = [0, 0, 0];
  let modelCount = 0;
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
      }
    }
  }
  tctx.putImageData(ov, colW * 2, 0);
  tiles.push(tc);

  // The mean color of the bear pixels of the reference.
  const [, sctx] = canvas2d(colW, H);
  sctx.drawImage(sheet, col0, 0, colW, H, 0, 0, colW, H);
  const sdata = sctx.getImageData(0, 0, colW, H).data;
  let refColor = [0, 0, 0];
  let refCount = 0;
  for (let i = 0; i < colW * H; i++) {
    if (ref[i]) {
      refColor = refColor.map((v, k) => v + sdata[i * 4 + k]);
      refCount++;
    }
  }
  results[name] = {
    iou: Number(best.iou.toFixed(4)),
    dx: best.dx,
    scale: Number(scale.toFixed(4)),
    refMeanRGB: refColor.map((v) => Math.round(v / refCount)),
    modelMeanRGB: modelColor.map((v) => Math.round(v / Math.max(modelCount, 1))),
  };
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
window.__compare = { clip: clipName, posed, results, png: out.toDataURL('image/png') };
