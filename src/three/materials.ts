import * as THREE from 'three'

/** The palette: desaturated sage, stone, warm ivory, dusk blue and a single ember accent. */
export const PALETTE = {
  ivory: '#efe8da',
  paper: '#f6f1e7',
  stone: '#b9b2a3',
  stoneDark: '#7d786e',
  sage: '#9aa58c',
  sageDeep: '#6f7c66',
  dusk: '#4e5d73',
  duskDeep: '#2c3442',
  ink: '#22262d',
  ember: '#d0643a',
}

let ramp: THREE.DataTexture | null = null
/** soft 5-step toon ramp: gentle, painterly falloff rather than hard cartoon bands */
export function toonRamp() {
  if (ramp) return ramp
  const steps = [118, 150, 188, 226, 255]
  const data = new Uint8Array(steps.length * 4)
  steps.forEach((v, i) => data.set([v, v, v, 255], i * 4))
  ramp = new THREE.DataTexture(data, steps.length, 1, THREE.RGBAFormat)
  ramp.minFilter = THREE.LinearFilter
  ramp.magFilter = THREE.LinearFilter
  ramp.generateMipmaps = false
  ramp.needsUpdate = true
  return ramp
}

/** shared uniforms: wind time, and a 0..1 "night" amount driven by the Exam Night trial */
export const windUniforms = { uTime: { value: 0 } }

const cache = new Map<string, THREE.Material>()

type ToonOpts = { sway?: boolean; tint?: THREE.ColorRepresentation; emissive?: THREE.ColorRepresentation; saturation?: number }

/** Grade a material's texture/colour toward the palette: pull saturation down and warm it slightly. */
function addGrade(m: THREE.MeshToonMaterial, saturation: number, sway: boolean, recolor = false) {
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = windUniforms.uTime
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <map_fragment>',
      `#include <map_fragment>
      { float l = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
        diffuseColor.rgb = mix(vec3(l), diffuseColor.rgb, ${saturation.toFixed(3)}) * vec3(1.02, 1.0, 0.95);
        ${recolor ? 'diffuseColor.rgb = vec3(l) * vec3(0.66, 0.86, 0.42) * 2.1;' : ''} }`,
    )
    if (sway) {
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uTime;')
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
          {
            vec3 seedPos = vec3(0.0);
            #ifdef USE_INSTANCING
              seedPos = instanceMatrix[3].xyz;
            #endif
            float h = max(position.y, 0.0);
            float ph = dot(seedPos, vec3(0.31, 0.17, 0.23));
            float w = sin(uTime * 1.3 + ph) * 0.6 + sin(uTime * 2.1 + ph * 1.7) * 0.4;
            transformed.x += w * 0.012 * h * h;
            transformed.z += cos(uTime * 1.1 + ph) * 0.008 * h * h;
          }`,
        )
    }
  }
  m.customProgramCacheKey = () => `grade${saturation}${sway ? 's' : ''}${recolor ? 'r' : ''}`
}

/** Convert a glTF material to a graded, soft cel-shaded MeshToonMaterial (keeps map, alpha and skinning). */
export function toToon(src: THREE.Material, opts: ToonOpts = {}) {
  const s = src as THREE.MeshStandardMaterial
  const sat = opts.saturation ?? 0.8
  const key = `${s.uuid}|${opts.sway ? 1 : 0}|${opts.tint ?? ''}|${opts.emissive ?? ''}|${sat}`
  const hit = cache.get(key)
  if (hit) return hit
  // the twisted-tree leaf texture is autumn-maroon: repaint it as soft summer green (or the given tint)
  const repaint = s.name === 'Leaves_TwistedTree'
  const m = new THREE.MeshToonMaterial({
    map: s.map ?? null,
    color: opts.tint ? new THREE.Color(opts.tint) : s.color?.clone() ?? new THREE.Color('#ffffff'),
    gradientMap: toonRamp(),
    transparent: s.transparent,
    opacity: s.opacity,
    alphaTest: s.alphaTest || (s.map && s.transparent ? 0.4 : 0),
    side: s.side,
  })
  if (m.alphaTest > 0) m.transparent = false
  if (m.map) { m.map.colorSpace = THREE.SRGBColorSpace; m.map.anisotropy = 4 }
  if (opts.emissive) m.emissive = new THREE.Color(opts.emissive)
  addGrade(m, sat, !!opts.sway, repaint && !opts.tint)
  m.name = `toon:${s.name}`
  cache.set(key, m)
  return m
}

/** Flat palette material for procedural architecture */
const flatCache = new Map<string, THREE.MeshToonMaterial>()
export function flat(color: THREE.ColorRepresentation, opts: { emissive?: THREE.ColorRepresentation; emissiveIntensity?: number; transparent?: boolean; opacity?: number } = {}) {
  const key = `${color}|${opts.emissive ?? ''}|${opts.emissiveIntensity ?? ''}|${opts.opacity ?? ''}`
  let m = flatCache.get(key)
  if (!m) {
    m = new THREE.MeshToonMaterial({ color, gradientMap: toonRamp(), transparent: opts.transparent, opacity: opts.opacity ?? 1 })
    if (opts.emissive) { m.emissive = new THREE.Color(opts.emissive); m.emissiveIntensity = opts.emissiveIntensity ?? 1 }
    flatCache.set(key, m)
  }
  return m
}

/** Walk an object and make every mesh toon + shadow-casting */
export function toonify(root: THREE.Object3D, opts: ToonOpts & { shadows?: boolean } = {}) {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (!mesh.isMesh) return
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map((mm) => toToon(mm, opts)) : toToon(mesh.material, opts)
    if (opts.shadows !== false) { mesh.castShadow = true; mesh.receiveShadow = true }
  })
  return root
}
