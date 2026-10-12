// The props gallery: shows each prop of the gallery GLB (studio/gallery.py) on its own, in the
// lights of the animal (viewer.json, see scene.js). ?gallery=<url of gallery.json>. The main
// view orbits the selected prop and plays the clip "keys" (the piano keys go down in turn).
// studio/shoot.mjs props calls window.renderGallery(options) and saves the returned PNG.

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SETTINGS, SHEET_BACKGROUND, addLights, createRenderer, loadModel } from './scene.js';

const params = new URLSearchParams(location.search);
const galleryUrl = params.get('gallery') ?? `/${SETTINGS.outDir}/props/gallery.json`;
const gallery = await (await fetch(galleryUrl)).json();
const glbUrl = new URL(gallery.glb, new URL(galleryUrl, location.href)).href;
const model = await loadModel(glbUrl);
document.getElementById('title').textContent = `Props gallery: sized for ${SETTINGS.animal} (${gallery.role})`;

const canvas = document.getElementById('main');
const renderer = createRenderer(canvas, { preserve: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
const scene = new THREE.Scene();
scene.background = new THREE.Color(SHEET_BACKGROUND);
const camera = new THREE.PerspectiveCamera(24, 1, 0.02, 100);
const lights = addLights(scene, camera);
const ground = new THREE.Mesh(
  new THREE.CircleGeometry(8, 64),
  new THREE.ShadowMaterial({ color: 0x3a3330, opacity: 0.22 }),
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground, model.root);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;

/** The root node of each prop, and its box. */
const items = gallery.props.map((p) => {
  const node = model.root.getObjectByName(p.nodes[0]);
  const box = new THREE.Box3().setFromObject(node);
  return { ...p, node, box };
});

/** The view of each kind: [azimuth, elevation] in degrees. The music stand shows the face of its
 * desk, which looks at the player (-z). */
const VIEWS = { music_stand: [160, 15] };

/** Returns the view of a prop. */
function viewOf(item) {
  return VIEWS[item.kind] ?? [35, 18];
}

/** Shows one prop alone (or all with null). */
function solo(item) {
  for (const it of items) {
    it.node.visible = !item || it === item;
  }
}

/** Aims a camera at a box from an azimuth and an elevation in degrees. */
function frame(cam, box, az = 35, el = 18) {
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3()).length();
  const d = (0.62 * size) / Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
  const a = THREE.MathUtils.degToRad(az);
  const e = THREE.MathUtils.degToRad(el);
  cam.position.set(center.x - d * Math.sin(a) * Math.cos(e), center.y + d * Math.sin(e), center.z + d * Math.cos(a) * Math.cos(e));
  cam.lookAt(center);
  cam.updateProjectionMatrix();
  return center;
}

function size() {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

const keysClip = model.clips.get('keys');
if (keysClip) {
  model.mixer.clipAction(keysClip).play();
}
let current = null;
function select(item) {
  current = item;
  solo(item);
  controls.target.copy(frame(camera, item.box, ...viewOf(item)));
  controls.update();
  for (const t of document.querySelectorAll('.tile')) {
    t.classList.toggle('on', t.dataset.name === item.name);
  }
}

/** Renders one prop into an image: a data URL of w x h pixels. */
function tileImage(item, w, h) {
  const cam = new THREE.PerspectiveCamera(24, w / h, 0.02, 100);
  solo(item);
  model.mixer.setTime(0);
  frame(cam, item.box, ...viewOf(item));
  lights.aim(cam);
  renderer.setSize(w, h, false);
  renderer.render(scene, cam);
  return renderer.domElement.toDataURL('image/png');
}

/** The label of a prop: its name, kind, size, and triangles. */
function label(item) {
  const [x, y, z] = item.size.map((v) => v.toFixed(2));
  return { head: `${item.name} (${item.kind}, ${item.attach})`, sub: `${x} x ${y} x ${z} animal heights, ${item.triangles} triangles` };
}

const tiles = document.getElementById('tiles');
for (const item of items) {
  const el = document.createElement('div');
  el.className = 'tile';
  el.dataset.name = item.name;
  const img = document.createElement('img');
  img.src = tileImage(item, 440, 330);
  const text = label(item);
  el.append(img);
  const cap = document.createElement('div');
  cap.innerHTML = `<b>${text.head}</b><br><small>${text.sub}</small>`;
  el.append(cap);
  el.addEventListener('click', () => select(item));
  tiles.append(el);
}
size();
select(items[0]);

const timer = new THREE.Timer();
renderer.setAnimationLoop(() => {
  timer.update();
  model.mixer.update(timer.getDelta());
  controls.update();
  lights.aim(camera);
  renderer.render(scene, camera);
});
addEventListener('resize', size);

/** Renders all props into one grid image with labels (studio/shoot.mjs props). The piano also
 * gets a close view of its keys during the clip "keys". */
window.renderGallery = ({ cols = 4, w = 400, h = 320 } = {}) => {
  renderer.setAnimationLoop(null);
  const shots = items.map((item) => ({ item }));
  const piano = items.find((it) => it.kind === 'piano');
  if (piano && keysClip) {
    shots.push({ item: piano, keys: true });
  }
  const rows = Math.ceil(shots.length / cols);
  const out = document.createElement('canvas');
  out.width = cols * w;
  out.height = rows * h;
  const ctx = out.getContext('2d');
  shots.forEach((shot, i) => {
    const cam = new THREE.PerspectiveCamera(24, w / h, 0.02, 100);
    solo(shot.item);
    model.mixer.setTime(0);
    let caption = label(shot.item);
    if (shot.keys) {
      // A low close view of the keys from the side of the player, with E4 fully down.
      model.mixer.setTime(1.35);
      const k = model.root.getObjectByName(`${shot.item.name}_key_E4`);
      const box = new THREE.Box3().setFromObject(k).expandByScalar(0.035);
      frame(cam, box, 200, 10);
      caption = { head: 'piano keys: E4 down (clip "keys")', sub: 'the keys that a role presses are nodes; each one turns on its pivot' };
    } else {
      frame(cam, shot.item.box, ...viewOf(shot.item));
    }
    lights.aim(cam);
    renderer.setSize(w, h, false);
    renderer.render(scene, cam);
    const x = (i % cols) * w;
    const y = Math.floor(i / cols) * h;
    ctx.drawImage(renderer.domElement, x, y, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillRect(x, y, w, 36);
    ctx.fillStyle = '#222';
    ctx.font = 'bold 13px system-ui';
    ctx.fillText(caption.head, x + 6, y + 15);
    ctx.font = '12px system-ui';
    ctx.fillText(caption.sub, x + 6, y + 30);
    ctx.strokeStyle = '#999';
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  });
  return out.toDataURL('image/png');
};
window.__galleryReady = true;
