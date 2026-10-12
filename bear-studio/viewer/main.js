// The bear viewer: plays the clips of the GLB, shows the four sheet views, and renders single
// frames for the shot tool (tools/shoot.mjs) when the URL has ?shot=1.

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  SHEET_BACKGROUND,
  SHEET_CAMERA,
  VIEWS,
  addLights,
  createRenderer,
  loadBear,
  placeSheetCamera,
  poseAt,
} from './scene.js';

const params = new URLSearchParams(location.search);
const shotMode = params.has('shot');
const glbUrl = params.get('glb') ?? '/out/bear.glb';

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
lights.shadow.intensity = 0;

const controls = new OrbitControls(camera, canvas);
controls.target.set(0, SHEET_CAMERA.height, 0);
controls.enableDamping = true;

const bear = await loadBear(glbUrl);
scene.add(bear.root);

const skeleton = new THREE.SkeletonHelper(bear.root);
skeleton.visible = false;
scene.add(skeleton);

// The trail of the baton tip: the last seconds of its path.
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

/** Samples the baton tip of a clip over [t - span, t]. */
function sampleTrail(clipName, t, span) {
  const pts = [];
  const clip = bear.clips.get(clipName);
  if (!clip || !bear.batonTip) {
    return pts;
  }
  const steps = 160;
  const tip = new THREE.Vector3();
  for (let i = 0; i <= steps; i++) {
    const ti = t - span + (span * i) / steps;
    if (ti < 0) {
      continue;
    }
    poseAt(bear, clipName, ti);
    bear.batonTip.getWorldPosition(tip);
    pts.push(tip.clone());
  }
  poseAt(bear, clipName, t);
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
  if (params.get('ground') === '1') {
    lights.shadow.intensity = 0.001;
  } else {
    ground.visible = false;
  }
  const clip = params.get('clip') ?? 'reference';
  const t = Number(params.get('t') ?? 0);
  if (params.get('trail') === '1') {
    setTrail(sampleTrail(clip, t, Number(params.get('span') ?? 4)));
  } else {
    trail.visible = false;
  }
  poseAt(bear, clip, t);
  skeleton.visible = params.get('bones') === '1';
  renderer.render(scene, camera);
  window.__shotReady = true;
} else {
  startViewer();
}

function startViewer() {
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

  const clipList = panel.querySelector('#clips');
  const order = [...bear.clips.keys()];
  let current = null;
  let action = null;
  const tempo = panel.querySelector('#tempo');
  const tempoOut = panel.querySelector('#tempoOut');
  const loop = panel.querySelector('#loop');
  const pause = panel.querySelector('#pause');
  const timeOut = panel.querySelector('#time');

  function play(name) {
    const clip = bear.clips.get(name);
    const next = bear.mixer.clipAction(clip);
    next.reset();
    next.setLoop(loop.checked ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
    next.clampWhenFinished = true;
    if (action && action !== next) {
      next.crossFadeFrom(action, 0.35, false);
    }
    next.play();
    action = next;
    current = name;
    trailCount = 0;
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
    bear.mixer.timeScale = pause.checked ? 0 : Number(tempo.value) / 60;
  }
  tempo.oninput = applyTempo;
  pause.onchange = applyTempo;
  loop.onchange = () => action?.setLoop(loop.checked ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
  panel.querySelector('#bones').onchange = (e) => {
    skeleton.visible = e.target.checked;
  };
  panel.querySelector('#wire').onchange = (e) => {
    for (const m of bear.meshes) {
      for (const mat of [m.material].flat()) {
        mat.wireframe = e.target.checked;
      }
    }
  };
  panel.querySelector('#trail').onchange = (e) => {
    trail.visible = e.target.checked;
  };
  panel.querySelector('#shadow').onchange = (e) => {
    lights.shadow.intensity = e.target.checked ? 0.001 : 0;
    ground.visible = e.target.checked;
  };
  lights.shadow.intensity = 0.001;
  applyTempo();
  play(order.includes('performance') ? 'performance' : order[0]);

  const clock = new THREE.Clock();
  const tip = new THREE.Vector3();
  let trailCount = 0;
  const trailPts = [];
  renderer.setAnimationLoop(() => {
    const dt = clock.getDelta();
    bear.mixer.update(dt);
    controls.update();
    if (bear.batonTip && trail.visible) {
      bear.batonTip.getWorldPosition(tip);
      trailPts.push(tip.clone());
      if (trailPts.length > TRAIL) {
        trailPts.shift();
      }
      trailCount++;
      setTrail(trailPts);
    }
    if (action) {
      timeOut.textContent = `${current}  ${action.time.toFixed(2)} s`;
    }
    renderer.render(scene, camera);
  });
}

/** Short notes on each clip, shown as button tooltips. */
const CLIP_NOTES = {
  performance: 'All gestures in order: ready, beats, cue, crescendo, hush, cutoff, bow.',
  reference: 'The pose of the reference sheet (arms down). The compare tool uses it.',
  ready: 'Both arms up, the baton ready.',
  beat_4_4: 'One bar of 4/4 at 60 bpm: down, in, out, up, with ictus and rebound.',
  cue_left: 'The left paw cues the players on the left, the head turns to them.',
  crescendo: 'The left palm turns up and lifts.',
  hush: 'The left palm turns down and presses.',
  cutoff: 'A loop and a cutoff with both paws, then a hold.',
  nod_turn: 'A head nod and a turn to each section.',
  sway_dip: 'A torso sway and a knee dip on each beat.',
  bow: 'The bow at the end.',
};
