import { GRADE_LUT_SIZE } from './grade.ts';

/**
 * The vertex shader of each full-screen pass: one triangle that covers the view (design 4.5,
 * post effects).
 */
export const FULL_SCREEN_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

/**
 * The downsample of the bloom: 13 samples in five boxes, as in the bloom of "Next generation post
 * processing in Call of Duty: Advanced Warfare" (Jimenez, 2014). With `PREFILTER`, the first pass
 * also keeps the bright parts, with a soft knee, and weights each box by its brightness, so that
 * a single bright pixel does not flicker. It adds a part of all the light (`uDiffusion`), so the
 * bloom also gives the soft glow of a diffusion filter around each light part of the image.
 */
export const BLOOM_DOWN_FRAGMENT = /* glsl */ `
uniform sampler2D uSource;
uniform vec2 uTexel;
uniform float uThreshold;
uniform float uKnee;
uniform float uDiffusion;
varying vec2 vUv;

vec3 tap(float x, float y) {
  return texture(uSource, vUv + uTexel * vec2(x, y)).rgb;
}

float brightness(vec3 c) {
  return max(c.r, max(c.g, c.b));
}

void main() {
  vec3 a = tap(-2.0, 2.0);
  vec3 b = tap(0.0, 2.0);
  vec3 c = tap(2.0, 2.0);
  vec3 d = tap(-2.0, 0.0);
  vec3 e = tap(0.0, 0.0);
  vec3 f = tap(2.0, 0.0);
  vec3 g = tap(-2.0, -2.0);
  vec3 h = tap(0.0, -2.0);
  vec3 i = tap(2.0, -2.0);
  vec3 j = tap(-1.0, 1.0);
  vec3 k = tap(1.0, 1.0);
  vec3 l = tap(-1.0, -1.0);
  vec3 m = tap(1.0, -1.0);
  vec3 inner = (j + k + l + m) * 0.25;
  vec3 topLeft = (a + b + d + e) * 0.25;
  vec3 topRight = (b + c + e + f) * 0.25;
  vec3 bottomLeft = (d + e + g + h) * 0.25;
  vec3 bottomRight = (e + f + h + i) * 0.25;
#ifdef PREFILTER
  // Each box gets the weight 1 / (1 + brightness), so that a single bright pixel does not flicker.
  float w0 = 0.5 / (1.0 + brightness(inner));
  float w1 = 0.125 / (1.0 + brightness(topLeft));
  float w2 = 0.125 / (1.0 + brightness(topRight));
  float w3 = 0.125 / (1.0 + brightness(bottomLeft));
  float w4 = 0.125 / (1.0 + brightness(bottomRight));
  vec3 sum = inner * w0 + topLeft * w1 + topRight * w2 + bottomLeft * w3 + bottomRight * w4;
  sum /= w0 + w1 + w2 + w3 + w4;
  // Keep the light above the threshold, with a soft knee.
  float bright = brightness(sum);
  float soft = clamp(bright - uThreshold + uKnee, 0.0, 2.0 * uKnee);
  soft = soft * soft / (4.0 * uKnee + 1e-5);
  sum *= max(soft, bright - uThreshold) / max(bright, 1e-5) + uDiffusion;
#else
  vec3 sum = inner * 0.5 + (topLeft + topRight + bottomLeft + bottomRight) * 0.125;
#endif
  gl_FragColor = vec4(sum, 1.0);
}
`;

/**
 * The upsample of the bloom: a 3 × 3 tent filter of the smaller level, plus the downsample of this
 * level. Each level of the upsample has its own target, so that no pass writes a target that the
 * frame already wrote. A second write cost 0.4 ms for each level on the development Mac.
 */
export const BLOOM_UP_FRAGMENT = /* glsl */ `
uniform sampler2D uSource;
uniform sampler2D uBase;
uniform vec2 uTexel;
varying vec2 vUv;

vec3 tap(float x, float y) {
  return texture(uSource, vUv + uTexel * vec2(x, y)).rgb;
}

void main() {
  vec3 sum = tap(0.0, 0.0) * 4.0;
  sum += (tap(-1.0, 0.0) + tap(1.0, 0.0) + tap(0.0, -1.0) + tap(0.0, 1.0)) * 2.0;
  sum += tap(-1.0, -1.0) + tap(1.0, -1.0) + tap(-1.0, 1.0) + tap(1.0, 1.0);
  gl_FragColor = vec4(texture(uBase, vUv).rgb + sum / 16.0, 1.0);
}
`;

/**
 * The lens flare (design 4.5, post effects), at the size of its bloom level (`flareLevel()` of
 * `post.ts`). Its light is the light of that level minus a part of the next level
 * (`uBroad`), above a threshold with a soft knee. A lamp is small, so the next level holds much
 * less of its light. A broad bright area, such as lit white fur, has about the same light in
 * both levels, so it gives no flare. The three parts of the flare of a camera lens:
 *
 * - The ghosts: copies of the bright parts, scaled about the middle of the image. A negative
 *   scale mirrors a ghost through the middle. Each ghost has its own color, and the ghosts fade
 *   toward the edges of the image.
 * - The halo: a thin ring around the middle. A light near the middle gives the strongest halo.
 * - The streak: a thin horizontal line through each bright part, as an anamorphic lens gives.
 *
 * The bloom levels are blurred, and the prefilter of the bloom weights each box by its
 * brightness, so a small highlight of the brass or of an eye stays far below the threshold.
 */
export const FLARE_FRAGMENT = /* glsl */ `
uniform sampler2D uSource;
uniform sampler2D uNext;
uniform float uBroad;
uniform float uAspect;
uniform float uThreshold;
uniform float uKnee;
uniform vec4 uGhostScales;
uniform vec3 uGhostTints[4];
uniform float uGhostRadius;
uniform float uHaloRadius;
uniform vec3 uHaloTint;
uniform float uStreakLength;
uniform vec3 uStreakTint;
varying vec2 vUv;

const int STREAK_TAPS = 48;
const float TAU = 6.28318531;

// Keeps the light of the small bright parts above the threshold, with a soft knee. The light
// fades over the outer part of the image, so a light that comes in at an edge gives no sudden
// ghost.
vec3 bright(vec2 uv) {
  vec2 inside = smoothstep(0.0, 0.04, uv) * smoothstep(0.0, 0.04, 1.0 - uv);
  vec3 c = max(texture(uSource, uv).rgb - uBroad * texture(uNext, uv).rgb, 0.0);
  float b = max(c.r, max(c.g, c.b));
  float soft = clamp(b - uThreshold + uKnee, 0.0, 2.0 * uKnee);
  soft = soft * soft / (4.0 * uKnee + 1e-5);
  return c * (max(soft, b - uThreshold) / max(b, 1e-5)) * inside.x * inside.y;
}

// The distance from the middle of the image, with the aspect: 0 in the middle, 1 at a corner.
float edgeOf(vec2 uv) {
  vec2 round = (uv - 0.5) * vec2(uAspect, 1.0);
  return length(round) / length(vec2(uAspect, 1.0) * 0.5);
}

// The ghost of the scale s at uv: the light at 0.5 + (uv - 0.5) / s, spread over a soft disc of
// the radius uGhostRadius around that point. The disc has two rings of taps, closer than the
// size of a lamp in the level, so a ghost shows no pattern of the taps. In the image, the disc
// grows with the scale of the ghost.
vec3 ghost(vec2 uv, float s) {
  vec2 source = 0.5 + (uv - 0.5) / s;
  vec3 sum = bright(source);
  for (int j = 0; j < 16; j++) {
    float ring = j < 6 ? 0.5 : 1.0;
    float angle = j < 6 ? float(j) * TAU / 6.0 : float(j - 6) * TAU / 10.0 + 0.3;
    sum += bright(source + vec2(cos(angle) / uAspect, sin(angle)) * uGhostRadius * ring);
  }
  return sum / 17.0;
}

void main() {
  vec2 fromCenter = vUv - 0.5;
  vec3 flare = vec3(0.0);

  for (int i = 0; i < 4; i++) {
    flare += ghost(vUv, uGhostScales[i]) * uGhostTints[i];
  }
  flare *= 1.0 - smoothstep(0.3, 1.0, edgeOf(vUv));

  // The halo takes the light at the halo radius toward the middle, so a light in the middle
  // gives a ring of that radius.
  vec2 round = fromCenter * vec2(uAspect, 1.0);
  vec2 toCenter = -round / max(length(round), 1e-4);
  vec2 haloUv = vUv + toCenter * uHaloRadius * vec2(1.0 / uAspect, 1.0);
  float haloFade = 1.0 - clamp(edgeOf(haloUv), 0.0, 1.0);
  flare += bright(haloUv) * uHaloTint * haloFade * haloFade;

  vec3 streak = bright(vUv);
  for (int i = 1; i <= STREAK_TAPS; i++) {
    float x = float(i) / float(STREAK_TAPS);
    vec2 offset = vec2(x * uStreakLength, 0.0);
    float weight = (1.0 - x) * (1.0 - x);
    streak += (bright(vUv + offset) + bright(vUv - offset)) * weight;
  }
  flare += streak * uStreakTint;

  gl_FragColor = vec4(flare, 1.0);
}
`;

/** The GLSL function that converts a value of the depth texture to the view depth. */
const VIEW_DEPTH = /* glsl */ `
#include <packing>
uniform sampler2D uDepth;
uniform float uNear;
uniform float uFar;
uniform float uFocus;
uniform float uBlurScale;
uniform float uMaxBlur;
uniform float uMaxNearBlur;

float viewDepth(vec2 uv) {
  return -perspectiveDepthToViewZ(texture(uDepth, uv).x, uNear, uFar);
}

// The signed diameter of the blur disc, as a part of the image height (scene/focus.ts).
float blurAt(vec2 uv) {
  return clamp(uBlurScale * (1.0 - uFocus / viewDepth(uv)), -uMaxNearBlur, uMaxBlur);
}
`;

/**
 * The first pass of the depth of field, at half size: the color of the scene, and the signed blur
 * of each pixel in the alpha channel (scene/focus.ts).
 */
export const BLUR_PREPARE_FRAGMENT = /* glsl */ `
uniform sampler2D uColor;
${VIEW_DEPTH}
varying vec2 vUv;

void main() {
  // The half-size pixel center lies between four pixels of the scene, so the linear filter
  // gives their mean. A limit keeps a single bright pixel from a large bright disc.
  vec3 color = min(texture(uColor, vUv).rgb, vec3(32.0));
  gl_FragColor = vec4(color, blurAt(vUv));
}
`;

/**
 * The second pass of the depth of field, at half size: a gather of `SAMPLES` samples on a golden
 * angle spiral over the blur disc of the pixel. A sample counts when its own disc covers the
 * pixel. A sample behind the pixel blurs at most as much as the pixel, so a sharp subject keeps
 * its outline in front of a soft background. The equal weights inside the disc make the warm
 * lamps of the hall into round discs (bokeh).
 */
export const BLUR_GATHER_FRAGMENT = /* glsl */ `
uniform sampler2D uSource;
uniform vec2 uTexel;
// The pixels of this pass for a blur of 1 (the full image height), times one half (a radius).
uniform float uPixelsPerBlur;
varying vec2 vUv;

const float GOLDEN_ANGLE = 2.39996323;

void main() {
  vec4 center = texture(uSource, vUv);
  float radius = abs(center.a) * uPixelsPerBlur;
  vec3 sum = center.rgb;
  float total = 1.0;
  for (int i = 0; i < SAMPLES; i++) {
    float r = sqrt((float(i) + 0.5) / float(SAMPLES)) * radius;
    float angle = float(i) * GOLDEN_ANGLE;
    vec4 tap = texture(uSource, vUv + vec2(cos(angle), sin(angle)) * r * uTexel);
    float reach = abs(tap.a) * uPixelsPerBlur;
    if (tap.a > center.a) {
      reach = min(reach, radius);
    }
    float weight = clamp(reach - r + 1.0, 0.0, 1.0);
    sum += tap.rgb * weight;
    total += weight;
  }
  gl_FragColor = vec4(sum / total, center.a);
}
`;

/**
 * The color grade of the final pass on the display values (design 4.5, post effects): a lookup in
 * the 3D table of `scene/grade.ts`. The views page adds the same grade after the tone mapping of
 * its materials, so that its colors read as on the stage (design 7.1).
 */
export const GRADE_FUNCTION = /* glsl */ `
uniform sampler3D uGradeLut;

vec3 grade(vec3 color) {
  // The middle of the first entry and of the last entry hold the grade of 0 and of 1.
  vec3 c = clamp(color, 0.0, 1.0) * ${((GRADE_LUT_SIZE - 1) / GRADE_LUT_SIZE).toFixed(8)} + ${(0.5 / GRADE_LUT_SIZE).toFixed(8)};
  return texture(uGradeLut, c).rgb;
}
`;

/**
 * The final pass to the canvas (design 4.5, post effects): the depth of field, the room haze, the
 * bloom, the lens flare, the tone mapping of the renderer, the color grade, the vignette, and the film grain. One
 * pass does all of them, so each pixel of the canvas reads the scene one time.
 */
export const FINAL_FRAGMENT = /* glsl */ `
uniform sampler2D uScene;
uniform sampler2D uBloom;
uniform sampler2D uBlur;
uniform float uBlurOn;
uniform float uBloomStrength;
uniform vec3 uHalation;
uniform sampler2D uFlare;
uniform float uFlareStrength;
uniform sampler2D uSceneDepth;
uniform float uHazeOn;
uniform mat4 uHazeInverse;
uniform vec3 uHazeCamera;
uniform vec3 uHazeKey;
uniform vec3 uHazeColor;
uniform vec4 uHaze;
uniform float uPixelsPerBlur;
${GRADE_FUNCTION}
uniform float uVignette;
uniform float uAspect;
uniform float uGrain;
uniform float uSeed;
#ifdef DEPTH_OF_FIELD
${VIEW_DEPTH}
#endif
varying vec2 vUv;

// The room haze (design 4.5): the light of the air between the camera and the point of the
// pixel. It starts behind the subject of the camera (uHaze.x, in meters) and grows with the
// distance (uHaze.y, the density for each meter). Its light grows toward the key light, by the
// Henyey-Greenstein phase with g = uHaze.z. The depth pass has no hall, so a pixel of the hall
// gets the distance to the hall floor (y = uHaze.w) or, above the floor, the far plane.
vec3 hazed(vec3 color) {
  float depth = texture(uSceneDepth, vUv).x;
  vec4 world = uHazeInverse * vec4(vUv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
  vec3 ray = world.xyz / world.w - uHazeCamera;
  float distance = length(ray);
  vec3 direction = ray / max(distance, 1e-4);
  if (depth >= 0.99999 && direction.y < -1e-4) {
    distance = min(distance, (uHaze.w - uHazeCamera.y) / direction.y);
  }
  float amount = 1.0 - exp(-uHaze.y * max(distance - uHaze.x, 0.0));
  float g = uHaze.z;
  float c = dot(direction, uHazeKey);
  float phase = (1.0 - g * g) / pow(1.0 + g * g - 2.0 * g * c, 1.5);
  return mix(color, uHazeColor * phase, amount * uHazeOn);
}

float hash(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}

void main() {
  vec3 color = texture(uScene, vUv).rgb;
#ifdef DEPTH_OF_FIELD
  // The blur of this pixel at full size decides how much of the soft image it takes, so the
  // outline of a sharp subject stays sharp.
  if (uBlurOn > 0.5) {
    float radius = abs(blurAt(vUv)) * uPixelsPerBlur;
    color = mix(color, texture(uBlur, vUv).rgb, smoothstep(0.5, 2.0, radius));
  }
#endif
  color = hazed(color);
#ifdef BLOOM
  // The halation: the glow is warmer than the light, as the red glow around a light on film.
  color += texture(uBloom, vUv).rgb * uBloomStrength * uHalation;
#endif
#ifdef FLARE
  color += texture(uFlare, vUv).rgb * uFlareStrength;
#endif
#ifdef TONE_MAPPING
  color = toneMapping(color);
#endif
  gl_FragColor = vec4(color, 1.0);
  #include <colorspace_fragment>
  // The grade works on the display values (sRGB).
  vec3 c = grade(gl_FragColor.rgb);
  float luma = dot(c, vec3(0.2126, 0.7152, 0.0722));
  // The vignette darkens the corners. The distance keeps the aspect, so the shape is round.
  vec2 fromCenter = (vUv - 0.5) * vec2(uAspect, 1.0);
  float edge = length(fromCenter) / length(vec2(uAspect, 1.0) * 0.5);
  c *= 1.0 - uVignette * smoothstep(0.3, 1.0, edge);
  // The grain changes in each frame. It is strongest in the middle tones, as on film, and it also
  // breaks the bands of the dark gradients.
  float grain = hash(gl_FragCoord.xy + uSeed) - 0.5;
  c += grain * uGrain * (0.5 + 2.0 * luma * (1.0 - luma));
  gl_FragColor = vec4(c, 1.0);
}
`;
