// The shared scene of the viewer and the compare page: the renderer, the lights, the bear, and
// the four cameras of the reference sheet.

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/** The camera azimuth of each sheet view in degrees: 0 is in front, 90 is at the bear's right. */
export const VIEWS = {
  front: { azimuth: 0, label: 'Front' },
  side: { azimuth: 90, label: 'Side' },
  back: { azimuth: 180, label: 'Back' },
  three_quarter: { azimuth: 38, label: '3/4' },
};

/** The sheet cameras: far away and level, so the perspective is weak (tools/bear/views.py). */
export const SHEET_CAMERA = { distance: 10, height: 0.5, fov: 7.4 };

/** The background color of the reference sheet. */
export const SHEET_BACKGROUND = 0xcacacb;

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
export const LIGHT = { hemi: 1.4, key: 3.8, fill: 0.9, keyDir: [-1.2, 3.5, 3.5] };

const query = new URLSearchParams(globalThis.location?.search ?? '');
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
 * light also casts the shadows, on the bear and on the ground. Call lights.aim(camera) before
 * each render. */
export function addLights(scene, camera) {
  const hemi = new THREE.HemisphereLight(0xfbfaf8, 0x8a7d74, LIGHT.hemi);
  scene.add(hemi);

  const center = new THREE.Vector3(0, 0.55, 0);
  const make = (color, intensity, offset) => {
    const light = new THREE.DirectionalLight(color, intensity);
    light.userData.offset = new THREE.Vector3(...offset).normalize();
    light.target.position.copy(center);
    scene.add(light, light.target);
    return light;
  };
  const key = make(0xfffbf4, LIGHT.key, LIGHT.keyDir);
  const fill = make(0xf6f6f8, LIGHT.fill, [3, 0.5, 4]);
  const rim = make(0xe8eeff, 0.35, [4, 2.5, -6]);

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
  key.shadow.intensity = 0.3;
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

/** Loads the bear GLB and prepares its materials for flat facets. */
export async function loadBear(url) {
  const gltf = await new GLTFLoader().loadAsync(url);
  const root = gltf.scene;
  const meshes = [];
  root.traverse((obj) => {
    if (obj.isMesh) {
      meshes.push(obj);
      // The thin baton casts no shadow: its shadow reads as a line drawn on the belly.
      obj.castShadow = obj.material?.name !== 'baton';
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
  const batonTip = root.getObjectByName('BatonTip') ?? null;
  return { gltf, root, meshes, mixer, clips, batonTip };
}

/** Places a camera at a sheet view (azimuth in degrees) and aims it level at the bear. */
export function placeSheetCamera(camera, azimuthDeg, { distance, height, fov } = SHEET_CAMERA) {
  const az = THREE.MathUtils.degToRad(azimuthDeg);
  camera.fov = fov;
  camera.position.set(-distance * Math.sin(az), height, distance * Math.cos(az));
  camera.up.set(0, 1, 0);
  camera.lookAt(0, height, 0);
  camera.updateProjectionMatrix();
}

/** Sets the bear to one frame of a clip, or to the rest pose when the clip does not exist. */
export function poseAt(bear, clipName, time) {
  bear.mixer.stopAllAction();
  const clip = bear.clips.get(clipName);
  if (!clip) {
    return false;
  }
  const action = bear.mixer.clipAction(clip);
  action.reset();
  action.play();
  bear.mixer.setTime(Math.min(time, clip.duration));
  bear.root.updateMatrixWorld(true);
  return true;
}
