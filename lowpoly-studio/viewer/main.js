// The viewer: plays the clips of the GLB, shows the sheet views, and renders single frames for
// the shot tool (studio/shoot.mjs) when the URL has ?shot=1. The animal, its views, and its clip
// notes come from viewer.json (?animal=<id> or ?config=<url>, see scene.js).

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  SETTINGS,
  SHEET_BACKGROUND,
  SHEET_CAMERA,
  VIEWS,
  addLights,
  createRenderer,
  loadModel,
  placeSheetCamera,
  poseAt,
} from './scene.js';

/** Short notes on each clip, shown as button tooltips (role.toml [clips.notes]). */
const CLIP_NOTES = SETTINGS.clipNotes;

const params = new URLSearchParams(location.search);
const shotMode = params.has('shot');
const glbUrl = params.get('glb') ?? SETTINGS.glb;
document.title = SETTINGS.title;

const canvas = document.getElementById('view');
const renderer = createRenderer(canvas, { preserve: shotMode });
renderer.setPixelRatio(shotMode ? 1 : Math.min(devicePixelRatio, 2));

const scene = new THREE.Scene();
scene.background = new THREE.Color(SHEET_BACKGROUND);
const camera = new THREE.PerspectiveCamera(SHEET_CAMERA.fov, 1, 0.1, 100);
const lights = addLights(scene, camera);

const ground = new THREE.Mesh(
  new THREE.CircleGeometry(3, 64),
  new THREE.ShadowMaterial({ color: 0x3a3330, opacity: 0.22 }),
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const controls = new OrbitControls(camera, canvas);
controls.target.set(0, SHEET_CAMERA.height, 0);
controls.enableDamping = true;

const model = await loadModel(glbUrl);
scene.add(model.root);

const skeleton = new THREE.SkeletonHelper(model.root);
skeleton.visible = false;
scene.add(skeleton);

// The trail of the prop tip: the last seconds of its path.
const TRAIL = 240;
const trailGeo = new THREE.BufferGeometry();
trailGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(TRAIL * 3), 3));
trailGeo.setDrawRange(0, 0);
const trail = new THREE.Line(trailGeo, new THREE.LineBasicMaterial({ color: 0xfafafa }));
trail.frustumCulled = false;
scene.add(trail);

function resize() {
  const w = shotMode ? Number(params.get('w') ?? 800) : innerWidth;
  const h = shotMode ? Number(params.get('h') ?? 800) : innerHeight;
  renderer.setSize(w, h, false);
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

function setView(name) {
  const view = VIEWS[name];
  placeSheetCamera(camera, view.azimuth);
  controls.target.set(0, SHEET_CAMERA.height, 0);
  controls.update();
  for (const b of document.querySelectorAll('[data-view]')) {
    b.classList.toggle('on', b.dataset.view === name);
  }
}

/** Samples the prop tip of a clip over [t - span, t]. */
function sampleTrail(clipName, t, span) {
  const pts = [];
  const clip = model.clips.get(clipName);
  if (!clip || !model.tip) {
    return pts;
  }
  const steps = 160;
  const tip = new THREE.Vector3();
  for (let i = 0; i <= steps; i++) {
    const ti = t - span + (span * i) / steps;
    if (ti < 0) {
      continue;
    }
    poseAt(model, clipName, ti);
    model.tip.getWorldPosition(tip);
    pts.push(tip.clone());
  }
  poseAt(model, clipName, t);
  return pts;
}

function setTrail(points) {
  const arr = trailGeo.attributes.position.array;
  const n = Math.min(points.length, TRAIL);
  for (let i = 0; i < n; i++) {
    const p = points[points.length - n + i];
    arr[i * 3] = p.x;
    arr[i * 3 + 1] = p.y;
    arr[i * 3 + 2] = p.z;
  }
  trailGeo.attributes.position.needsUpdate = true;
  trailGeo.setDrawRange(0, n);
}

if (shotMode) {
  document.body.classList.add('shot');
  resize();
  const view = params.get('view') ?? 'front';
  if (VIEWS[view]) {
    placeSheetCamera(camera, VIEWS[view].azimuth);
  } else {
    // A free view: azimuth, elevation (degrees), and distance in the URL.
    const az = THREE.MathUtils.degToRad(Number(params.get('az') ?? 30));
    const el = THREE.MathUtils.degToRad(Number(params.get('el') ?? 10));
    const d = Number(params.get('d') ?? 4);
    camera.fov = Number(params.get('fov') ?? 20);
    camera.position.set(
      -d * Math.sin(az) * Math.cos(el),
      0.5 + d * Math.sin(el),
      d * Math.cos(az) * Math.cos(el),
    );
    camera.lookAt(0, Number(params.get('ty') ?? 0.5), 0);
    camera.updateProjectionMatrix();
  }
  ground.visible = params.get('ground') === '1';
  const clip = params.get('clip') ?? 'reference';
  const t = Number(params.get('t') ?? 0);
  if (params.get('trail') === '1') {
    setTrail(sampleTrail(clip, t, Number(params.get('span') ?? 4)));
  } else {
    trail.visible = false;
  }
  poseAt(model, clip, t);
  skeleton.visible = params.get('bones') === '1';
  lights.aim(camera);
  renderer.render(scene, camera);
  window.__shotReady = true;
} else {
  startViewer();
}

function startViewer() {
  document.querySelector('#title').textContent = SETTINGS.title;
  resize();
  addEventListener('resize', resize);
  const panel = document.getElementById('panel');
  const viewRow = panel.querySelector('#views');
  for (const [name, v] of Object.entries(VIEWS)) {
    const b = document.createElement('button');
    b.textContent = v.label;
    b.dataset.view = name;
    b.onclick = () => setView(name);
    viewRow.append(b);
  }
  setView('three_quarter');

  const trailPts = [];
  const clipList = panel.querySelector('#clips');
  const order = [...model.clips.keys()];
  let current = null;
  let action = null;
  const tempo = panel.querySelector('#tempo');
  const tempoOut = panel.querySelector('#tempoOut');
  const loop = panel.querySelector('#loop');
  const pause = panel.querySelector('#pause');
  const timeOut = panel.querySelector('#time');

  function play(name) {
    const clip = model.clips.get(name);
    const next = model.mixer.clipAction(clip);
    next.reset();
    next.setLoop(loop.checked ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
    next.clampWhenFinished = true;
    if (action && action !== next) {
      next.crossFadeFrom(action, 0.35, false);
    }
    next.play();
    action = next;
    current = name;
    trailPts.length = 0;
    for (const b of clipList.querySelectorAll('button')) {
      b.classList.toggle('on', b.dataset.clip === name);
    }
  }

  for (const name of order) {
    const b = document.createElement('button');
    b.textContent = name;
    b.dataset.clip = name;
    b.title = CLIP_NOTES[name] ?? '';
    b.onclick = () => play(name);
    clipList.append(b);
  }

  function applyTempo() {
    tempoOut.textContent = `${tempo.value} bpm`;
    model.mixer.timeScale = pause.checked ? 0 : Number(tempo.value) / 60;
  }
  tempo.oninput = applyTempo;
  pause.onchange = applyTempo;
  loop.onchange = () => action?.setLoop(loop.checked ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
  panel.querySelector('#bones').onchange = (e) => {
    skeleton.visible = e.target.checked;
  };
  panel.querySelector('#wire').onchange = (e) => {
    for (const m of model.meshes) {
      for (const mat of [m.material].flat()) {
        mat.wireframe = e.target.checked;
      }
    }
  };
  panel.querySelector('#trailRow').hidden = !model.tip;
  panel.querySelector('#trail').onchange = (e) => {
    trail.visible = e.target.checked;
  };
  panel.querySelector('#shadow').onchange = (e) => {
    ground.visible = e.target.checked;
  };
  // The scene props (a piano, a bench) are nodes of their own: the switch shows the animal alone.
  const sceneProps = (SETTINGS.sceneProps ?? []).map((name) => model.root.getObjectByName(name)).filter(Boolean);
  panel.querySelector('#propsRow').hidden = sceneProps.length === 0;
  panel.querySelector('#props').onchange = (e) => {
    for (const node of sceneProps) {
      node.visible = e.target.checked;
    }
  };
  applyTempo();
  play(order.includes('performance') ? 'performance' : order[0]);

  const timer = new THREE.Timer();
  const tip = new THREE.Vector3();
  renderer.setAnimationLoop(() => {
    timer.update();
    const dt = timer.getDelta();
    model.mixer.update(dt);
    controls.update();
    if (model.tip && trail.visible) {
      model.tip.getWorldPosition(tip);
      trailPts.push(tip.clone());
      if (trailPts.length > TRAIL) {
        trailPts.shift();
      }
      setTrail(trailPts);
    }
    if (action) {
      timeOut.textContent = `${current}  ${action.time.toFixed(2)} s`;
    }
    lights.aim(camera);
    renderer.render(scene, camera);
  });
}
