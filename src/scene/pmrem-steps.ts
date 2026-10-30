// oxlint-disable eslint/no-underscore-dangle -- the steps of the PMREM generator of three.js have
// names with an underscore, and this module is the one place that calls them.
import {
  BufferGeometry,
  Float32BufferAttribute,
  Mesh,
  OrthographicCamera,
  PerspectiveCamera,
  Vector3,
} from 'three';
import type {
  CubeTexture,
  PMREMGenerator,
  Scene,
  ShaderMaterial,
  WebGLRenderTarget,
  WebGLRenderer,
} from 'three';

import type { Steps } from '../score/steps.ts';
import { compileInto, gpuDoneSteps, programsReadySteps } from './programs.ts';

declare module 'three' {
  /**
   * The private steps of `fromScene()` and `fromCubemap()` of three.js 0.186, which
   * {@link fromSceneSteps} and {@link fromCubemapSteps} run in separate tasks (design 7.2). The
   * types of three.js do not declare them.
   */
  interface PMREMGenerator {
    /** The blur material of `fromScene()`, after {@link PMREMGenerator._allocateTargets}. */
    readonly _blurMaterial: ShaderMaterial | null;
    /** The GGX material of the mip levels, after {@link PMREMGenerator._allocateTargets}. */
    readonly _ggxMaterial: ShaderMaterial | null;
    /** Sets the size of the cube faces. */
    _setSize(cubeSize: number): void;
    /** The cube material of `fromCubemap()`, after `compileCubemapShader()`. */
    readonly _cubemapMaterial: ShaderMaterial | null;
    /** Makes the output target, and the ping-pong target and the materials of its size. */
    _allocateTargets(): WebGLRenderTarget;
    /** Renders a scene into the six faces of the output target. */
    _sceneToCubeUV(
      scene: Scene,
      near: number,
      far: number,
      target: WebGLRenderTarget,
      position: Vector3,
    ): void;
    /** Renders a cube texture into the six faces of the output target. */
    _textureToCubeUV(texture: CubeTexture, target: WebGLRenderTarget): void;
    /** Blurs the largest mip level of the output target. */
    _blur(target: WebGLRenderTarget, lodIn: number, lodOut: number, sigma: number): void;
    /** Renders the mip levels of the output target. */
    _applyPMREM(target: WebGLRenderTarget): void;
    /** Sets the render target to `null`, and the viewport of the output target to its size. */
    _cleanup(target: WebGLRenderTarget): void;
  }
}

/**
 * Compiles a material of the PMREM generator with the current render target. The meshes of the
 * generator have a position attribute, and three.js gives a mesh with a position attribute
 * another program. `compileCubemapShader()` compiles with an empty geometry, so its program is
 * not the program of the draw.
 *
 * @param renderer The renderer.
 * @param material The material.
 */
function compileMaterial(renderer: WebGLRenderer, material: ShaderMaterial): void {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute([0, 0, 0], 3));
  renderer.compile(new Mesh(geometry, material), new OrthographicCamera());
  geometry.dispose();
}

/** The scene of {@link fromSceneSteps}, and the values of `fromScene()` of three.js. */
interface SceneSource {
  readonly scene: Scene;
  /** The size of each cube face, in pixels. */
  readonly size: number;
  /** The blur of the largest mip level, in radians. */
  readonly sigma: number;
}

/**
 * Makes the PMREM of a scene as `fromScene()` of three.js 0.186 does, with its near plane, its
 * far plane, and the origin, in steps (design 7.2). The programs of the scene and of the generator
 * compile in parallel first. Then the faces, the blur, and the mip levels render in separate
 * tasks. The generator keeps its materials, so a later {@link fromCubemapSteps} of the same size
 * compiles no program again.
 *
 * Each step sets the render target back at its end, because the frames of the page render between
 * the steps. The steps call no method of three.js that saves the target, so `_cleanup()` sets the
 * target to `null`.
 *
 * @param renderer The renderer.
 * @param generator The PMREM generator.
 * @param compileTarget A render target for the compile: the passes render into targets.
 * @param source The scene, the size of the faces, and the blur.
 * @returns The steps, which return the target that holds the PMREM. The caller frees it.
 */
export function* fromSceneSteps(
  renderer: WebGLRenderer,
  generator: PMREMGenerator,
  compileTarget: WebGLRenderTarget,
  source: SceneSource,
): Steps<WebGLRenderTarget> {
  generator._setSize(source.size);
  const target = generator._allocateTargets();
  target.depthBuffer = true;
  compileInto(renderer, compileTarget, () => {
    renderer.compile(source.scene, new PerspectiveCamera());
    // The call makes the cube material of the captures (design 4.5).
    generator.compileCubemapShader();
    const materials = [generator._blurMaterial, generator._ggxMaterial, generator._cubemapMaterial];
    for (const material of materials) {
      if (material) {
        compileMaterial(renderer, material);
      }
    }
  });
  yield* programsReadySteps(renderer);
  const saved = renderer.getRenderTarget();
  generator._sceneToCubeUV(source.scene, 0.1, 100, target, new Vector3());
  renderer.setRenderTarget(saved);
  yield;
  if (source.sigma > 0) {
    generator._blur(target, 0, 0, source.sigma);
    renderer.setRenderTarget(saved);
    yield;
  }
  generator._applyPMREM(target);
  generator._cleanup(target);
  renderer.setRenderTarget(saved);
  yield* gpuDoneSteps(renderer);
  return target;
}

/**
 * Makes the PMREM of a cube texture as `fromCubemap()` of three.js 0.186 does, in steps (design
 * 7.2): the faces and the mip levels render in separate tasks.
 *
 * @param renderer The renderer.
 * @param generator The PMREM generator, after a {@link fromSceneSteps} that compiled its
 *   programs.
 * @param texture The cube texture.
 * @param size The size of each face of the cube, in pixels.
 * @returns The steps, which return the target that holds the PMREM. The caller frees it.
 */
export function* fromCubemapSteps(
  renderer: WebGLRenderer,
  generator: PMREMGenerator,
  texture: CubeTexture,
  size: number,
): Steps<WebGLRenderTarget> {
  const saved = renderer.getRenderTarget();
  generator._setSize(size);
  const target = generator._allocateTargets();
  generator._textureToCubeUV(texture, target);
  renderer.setRenderTarget(saved);
  yield;
  generator._applyPMREM(target);
  generator._cleanup(target);
  renderer.setRenderTarget(saved);
  yield* gpuDoneSteps(renderer);
  return target;
}
