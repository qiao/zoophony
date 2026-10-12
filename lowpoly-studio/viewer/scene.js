// The shared scene of the viewer, the compare page, and the frames page: the settings of the
// animal, the renderer, the lights, the model, and the cameras of the sheet views.
//
// The settings come from <out>/viewer.json, which the CLI writes from the animal config and its
// role pack (studio/viewer_config.py). A page names it with ?config=<url>, or with ?animal=<id>
// for /animals/<id>/out/viewer.json.

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const query = new URLSearchParams(globalThis.location?.search ?? '');
const animal = query.get('animal');
const configUrl = query.get('config') ?? (animal ? `/animals/${animal}/out/viewer.json` : null);
if (!configUrl) {
  document.body.textContent = 'Add ?animal=<id> to the URL (for example ?animal=bear).';
  throw new Error('no ?animal=<id> or ?config=<url> in the URL');
}

/** The settings of the animal (studio/viewer_config.py). */
export const SETTINGS = await (await fetch(configUrl)).json();

/** The camera azimuth of each sheet view in degrees: 0 is in front, 90 is at the right. */
export const VIEWS = SETTINGS.views;

/** The sheet cameras: far away and level, so the perspective is weak (studio/views.py). */
export const SHEET_CAMERA = SETTINGS.camera;

/** The background color of the reference sheet. */
export const SHEET_BACKGROUND = SETTINGS.background;

/** The CSS color of the sheet background. */
export const SHEET_BACKGROUND_CSS = `#${SHEET_BACKGROUND.toString(16).padStart(6, '0')}`;

/** Creates a WebGL renderer for a canvas. */
export function createRenderer(canvas, { alpha = false, preserve = false } = {}) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha,
    preserveDrawingBuffer: preserve,
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  return renderer;
}

/** The light levels and the key direction (camera space: right, up, back). A page can change
 * them with ?light=hemi,key,fill and ?keydir=x,y,z for tuning. */
export const LIGHT = {
  hemi: SETTINGS.light.hemi,
  key: SETTINGS.light.key,
  fill: SETTINGS.light.fill,
  keyDir: SETTINGS.light.key_dir,
};

const lightParam = query.get('light');
if (lightParam) {
  const [hemi, key, fill] = lightParam.split(',').map(Number);
  Object.assign(LIGHT, { hemi, key, fill });
}
const keyDirParam = query.get('keydir');
if (keyDirParam) {
  LIGHT.keyDir = keyDirParam.split(',').map(Number);
}

/** Adds the lights. The key, fill, and rim lights follow the camera, as on the sheet. The key
 * light also casts the shadows, on the animal and on the ground. Call lights.aim(camera) before
 * each render. */
export function addLights(scene, camera) {
  const L = SETTINGS.light;
  const hemi = new THREE.HemisphereLight(L.sky, L.ground, LIGHT.hemi);
  scene.add(hemi);

  const center = new THREE.Vector3(0, L.center_y, 0);
  const make = (color, intensity, offset) => {
    const light = new THREE.DirectionalLight(color, intensity);
    light.userData.offset = new THREE.Vector3(...offset).normalize();
    light.target.position.copy(center);
    scene.add(light, light.target);
    return light;
  };
  const key = make(L.key_color, LIGHT.key, LIGHT.keyDir);
  const fill = make(L.fill_color, LIGHT.fill, L.fill_dir);
  const rim = make(L.rim_color, L.rim, L.rim_dir);

  key.castShadow = true;
  key.shadow.mapSize.set(4096, 4096);
  const sc = key.shadow.camera;
  sc.left = -1.0;
  sc.right = 1.0;
  sc.top = 1.0;
  sc.bottom = -1.0;
  sc.near = 0.5;
  sc.far = 12;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.012;
  key.shadow.radius = 6;
  key.shadow.intensity = L.shadow;
  scene.add(camera);

  const dir = new THREE.Vector3();
  const aim = (cam) => {
    cam.updateMatrixWorld();
    for (const light of [key, fill, rim]) {
      dir.copy(light.userData.offset).transformDirection(cam.matrixWorld);
      light.position.copy(center).addScaledVector(dir, 6);
      light.updateMatrixWorld();
      light.target.updateMatrixWorld();
    }
  };
  return { hemi, key, fill, rim, aim };
}

/** Loads the GLB of the animal and prepares its materials for flat facets. */
export async function loadModel(url) {
  const gltf = await new GLTFLoader().loadAsync(url);
  const root = gltf.scene;
  const meshes = [];
  root.traverse((obj) => {
    if (obj.isMesh) {
      meshes.push(obj);
      // A thin prop (a baton) casts no shadow: its shadow reads as a line drawn on the body.
      obj.castShadow = !SETTINGS.noShadow.includes(obj.material?.name);
      obj.receiveShadow = true;
      obj.frustumCulled = false;
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const m of mats) {
        m.flatShading = true;
        m.needsUpdate = true;
      }
    }
  });
  const mixer = new THREE.AnimationMixer(root);
  const clips = new Map(gltf.animations.map((c) => [c.name, c]));
  const tip = SETTINGS.tipMarkers.length ? (root.getObjectByName(SETTINGS.tipMarkers[0]) ?? null) : null;
  return { gltf, root, meshes, mixer, clips, tip };
}

/** Places a camera at a sheet view (azimuth in degrees) and aims it level at the animal. */
export function placeSheetCamera(camera, azimuthDeg, { distance, height, fov } = SHEET_CAMERA) {
  const az = THREE.MathUtils.degToRad(azimuthDeg);
  camera.fov = fov;
  camera.position.set(-distance * Math.sin(az), height, distance * Math.cos(az));
  camera.up.set(0, 1, 0);
  camera.lookAt(0, height, 0);
  camera.updateProjectionMatrix();
}

/** Sets the model to one frame of a clip, or to the rest pose when the clip does not exist. */
export function poseAt(model, clipName, time) {
  model.mixer.stopAllAction();
  const clip = model.clips.get(clipName);
  if (!clip) {
    return false;
  }
  const action = model.mixer.clipAction(clip);
  action.reset();
  action.play();
  model.mixer.setTime(Math.min(time, clip.duration));
  model.root.updateMatrixWorld(true);
  return true;
}
