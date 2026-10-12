// The frames page: renders a grid of posed frames with labels. tools/shoot.mjs calls
// window.renderSheet(shots, options) and saves the returned PNG data URL.

import * as THREE from 'three';
import {
  SETTINGS,
  SHEET_BACKGROUND,
  VIEWS,
  addLights,
  createRenderer,
  loadModel,
  placeSheetCamera,
  poseAt,
} from './scene.js';

const params = new URLSearchParams(location.search);
const model = await loadModel(params.get('glb') ?? SETTINGS.glb);

const glCanvas = document.createElement('canvas');
const renderer = createRenderer(glCanvas, { preserve: true });
const scene = new THREE.Scene();
scene.background = new THREE.Color(SHEET_BACKGROUND);
const camera = new THREE.PerspectiveCamera(20, 1, 0.05, 100);
const lights = addLights(scene, camera);
const ground = new THREE.Mesh(
  new THREE.CircleGeometry(3, 64),
  new THREE.ShadowMaterial({ color: 0x3a3330, opacity: 0.22 }),
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground, model.root);
// The wire copies share the geometry and the skeleton of each mesh, so they draw the edges of
// the posed triangles in the same pass, with a depth test against the faces.
const wireMaterial = new THREE.MeshBasicMaterial({ color: 0x1a1410, wireframe: true });
const wires = [];
for (const m of model.meshes) {
  for (const mat of [m.material].flat()) {
    mat.polygonOffset = true;
    mat.polygonOffsetFactor = 1;
    mat.polygonOffsetUnits = 1;
  }
  const w = m.isSkinnedMesh ? new THREE.SkinnedMesh(m.geometry, wireMaterial) : new THREE.Mesh(m.geometry, wireMaterial);
  if (m.isSkinnedMesh) {
    w.bind(m.skeleton, m.bindMatrix);
  }
  // The wire copy shares the morph weights, so it shows the corrective shapes too.
  if (m.morphTargetInfluences) {
    w.morphTargetInfluences = m.morphTargetInfluences;
    w.morphTargetDictionary = m.morphTargetDictionary;
  }
  w.frustumCulled = false;
  w.visible = false;
  // A skinned copy follows the skeleton beside the mesh. A plain mesh (a prop node, a piano key)
  // carries its copy, so the copy moves with the node.
  (m.isSkinnedMesh ? m.parent : m).add(w);
  wires.push(w);
}
const skeleton = new THREE.SkeletonHelper(model.root);
scene.add(skeleton);

const trailGeo = new THREE.BufferGeometry();
const trail = new THREE.Line(trailGeo, new THREE.LineBasicMaterial({ color: 0xffffff }));
trail.frustumCulled = false;
scene.add(trail);
const ictusGeo = new THREE.BufferGeometry();
const ictus = new THREE.Points(ictusGeo, new THREE.PointsMaterial({ color: 0xd8342c, size: 7, sizeAttenuation: false }));
ictus.frustumCulled = false;
scene.add(ictus);

function placeCamera(shot) {
  if (shot.view && VIEWS[shot.view]) {
    camera.aspect = shot.aspect;
    placeSheetCamera(camera, VIEWS[shot.view].azimuth);
    return;
  }
  const az = THREE.MathUtils.degToRad(shot.az ?? 0);
  const el = THREE.MathUtils.degToRad(shot.el ?? 8);
  const d = shot.d ?? 3.2;
  const ty = shot.ty ?? 0.52;
  const tz = shot.tz ?? 0;
  const tx = shot.tx ?? 0;
  camera.fov = shot.fov ?? 22;
  camera.aspect = shot.aspect;
  camera.position.set(
    tx - d * Math.sin(az) * Math.cos(el),
    ty + d * Math.sin(el),
    tz + d * Math.cos(az) * Math.cos(el),
  );
  camera.lookAt(tx, ty, tz);
  camera.updateProjectionMatrix();
}

function sampleTip(clip, t0, t1, steps) {
  const pts = [];
  const tip = new THREE.Vector3();
  for (let i = 0; i <= steps; i++) {
    const t = t0 + ((t1 - t0) * i) / steps;
    poseAt(model, clip, Math.max(t, 0));
    model.tip.getWorldPosition(tip);
    pts.push(tip.x, tip.y, tip.z);
  }
  return pts;
}

/** Renders the shots into a grid and returns a PNG data URL. */
window.renderSheet = (shots, { cols = 4, w = 360, h = 420 } = {}) => {
  const rows = Math.ceil(shots.length / cols);
  const out = document.createElement('canvas');
  out.width = cols * w;
  out.height = rows * h;
  const ctx = out.getContext('2d');
  renderer.setSize(w, h, false);
  shots.forEach((shot, i) => {
    shot.aspect = w / h;
    placeCamera(shot);
    skeleton.visible = Boolean(shot.bones);
    trail.visible = false;
    ictus.visible = false;
    if (shot.trail && model.tip) {
      const [t0, t1] = shot.trail;
      trailGeo.setAttribute('position', new THREE.Float32BufferAttribute(sampleTip(shot.clip, t0, t1, 240), 3));
      trail.visible = true;
      if (shot.ictus) {
        const pts = [];
        for (const t of shot.ictus) {
          pts.push(...sampleTip(shot.clip, t, t, 0));
        }
        ictusGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
        ictus.visible = true;
      }
    }
    poseAt(model, shot.clip, shot.t);
    lights.aim(camera);
    for (const w of wires) {
      w.visible = Boolean(shot.wire);
    }
    renderer.render(scene, camera);
    const x = (i % cols) * w;
    const y = Math.floor(i / cols) * h;
    ctx.drawImage(glCanvas, x, y, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillRect(x, y, w, 22);
    ctx.fillStyle = '#222';
    ctx.font = '13px system-ui';
    ctx.fillText(shot.label ?? `${shot.clip} ${shot.t}s`, x + 6, y + 15);
    ctx.strokeStyle = '#999';
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  });
  return out.toDataURL('image/png');
};

window.__clips = [...model.clips.entries()].map(([name, c]) => ({ name, duration: c.duration }));
window.__framesReady = true;
