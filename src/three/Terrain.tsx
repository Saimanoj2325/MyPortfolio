// Ground, river and everything that grows: painted terrain (vertex colours), an animated river,
// instanced grass tufts that sway, wildflowers, kit trees/rocks/bushes, and drifting pollen.
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import {
  areaAt, BOUNDS, circles, COTTAGES, distToPolyline, heightAt, HOUSE, inWorkshop, LANE, MEADOW_FENCE_Z, NORTH_PATH,
  pathAmount, RIVER, riverZ, ROAD_Z, SUMMIT, TRAIL, WATER_Y, WORKSHOP,
} from '../world/layout'
import { toToon, toonRamp, windUniforms } from './materials'
import { useKit, type KitNodes } from './kit'
import { player } from '../lib/actors'

export function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const smooth = (a: number, b: number, x: number) => THREE.MathUtils.smoothstep(x, a, b)
function vnoise(x: number, z: number) {
  return Math.sin(x * 0.31 + Math.sin(z * 0.17) * 2) * 0.5 + Math.sin(z * 0.23 + x * 0.11) * 0.35 + Math.sin((x + z) * 0.71) * 0.15
}

// ───────────────────────── terrain
const C = (h: string) => new THREE.Color(h)
const COL = {
  meadow: C('#b4bd6c'), meadowLight: C('#d3c977'), grass: C('#94b05e'), grassDark: C('#7c9a52'), pine: C('#6c8a58'),
  dirt: C('#c2a77f'), dirtDark: C('#a88d68'), sand: C('#d8c398'), rock: C('#9a917f'), riverBed: C('#6f7f6a'), summit: C('#93a06a'),
}

export function Ground() {
  const geo = useMemo(() => {
    const W = 260, D = 280, SX = 200, SZ = 216
    const g = new THREE.PlaneGeometry(W, D, SX, SZ)
    g.rotateX(-Math.PI / 2)
    g.translate(0, 0, -8)
    const pos = g.getAttribute('position') as THREE.BufferAttribute
    const cols = new Float32Array(pos.count * 3)
    const c = new THREE.Color(), tmp = new THREE.Color()
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i)
      const h = heightAt(x, z)
      pos.setY(i, h)
      const n = vnoise(x, z)
      // base: warm meadow in the south, greener village, cooler pines north of the river
      const north = smooth(-8, -30, z)
      c.copy(COL.grass).lerp(COL.meadowLight, smooth(36, 60, z) * (0.55 + n * 0.3))
      c.lerp(COL.grassDark, Math.max(0, n) * 0.25)
      c.lerp(COL.pine, north * 0.7)
      c.lerp(COL.summit, smooth(6, 14, h) * 0.5)
      // valley walls: dusty green-gold
      c.lerp(COL.meadow, smooth(44, 80, Math.abs(x)) * 0.5)
      // river banks: sand, then the riverbed
      const dr = Math.abs(z - riverZ(x))
      c.lerp(COL.sand, (1 - smooth(RIVER.half - 0.5, RIVER.half + 2.5, dr)) * 0.85)
      c.lerp(COL.riverBed, 1 - smooth(RIVER.half - 3, RIVER.half - 0.6, dr))
      // paths
      const pa = pathAmount(x, z)
      tmp.copy(COL.dirt).lerp(COL.dirtDark, 0.5 + n * 0.5)
      c.lerp(tmp, pa * 0.92)
      cols.set([c.r, c.g, c.b], i * 3)
    }
    g.setAttribute('color', new THREE.BufferAttribute(cols, 3))
    g.computeVertexNormals()
    return g
  }, [])
  const mat = useMemo(() => new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: toonRamp() }), [])
  return <mesh geometry={geo} material={mat} receiveShadow />
}

// ───────────────────────── river
export function River() {
  const { geo, mat } = useMemo(() => {
    const segs = 220, xs = -130, xe = 130
    const pos: number[] = [], uv: number[] = [], idx: number[] = []
    const across = 8
    for (let i = 0; i <= segs; i++) {
      const x = xs + (xe - xs) * (i / segs)
      const zc = riverZ(x)
      for (let j = 0; j <= across; j++) {
        const v = j / across
        pos.push(x, WATER_Y, zc + (v - 0.5) * (RIVER.half * 2 + 3))
        uv.push(x, v)
      }
    }
    for (let i = 0; i < segs; i++) for (let j = 0; j < across; j++) {
      const a = i * (across + 1) + j, b = a + across + 1
      idx.push(a, a + 1, b, b, a + 1, b + 1)
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
    geo.setIndex(idx)
    geo.computeVertexNormals()
    const mat = new THREE.ShaderMaterial({
      transparent: true, fog: true, depthWrite: false,
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
        uTime: { value: 0 }, uDeep: { value: new THREE.Color('#3f6f78') }, uShallow: { value: new THREE.Color('#8fb7aa') },
        uSky: { value: new THREE.Color('#f3dcc0') }, uSun: { value: new THREE.Vector3(0.4, 0.6, 0.5).normalize() }, uMist: { value: 0 },
      }]),
      vertexShader: /* glsl */ `
        #include <fog_pars_vertex>
        varying vec2 vUv; varying vec3 vW;
        void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }`,
      fragmentShader: /* glsl */ `
        #include <fog_pars_fragment>
        uniform float uTime; uniform vec3 uDeep, uShallow, uSky, uSun; uniform float uMist;
        varying vec2 vUv; varying vec3 vW;
        float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
        float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
          return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
        void main(){
          float across = abs(vUv.y - 0.5) * 2.0;
          vec2 p = vec2(vW.x * 0.35 - uTime * 0.55, vW.z * 0.9);
          float r = n(p) * 0.6 + n(p * 2.3 + vec2(uTime * 0.2, 0.0)) * 0.4;
          float lines = smoothstep(0.62, 0.7, n(vec2(vW.x * 0.18 - uTime * 0.7, vW.z * 2.2))) * 0.5;
          vec3 V = normalize(cameraPosition - vW);
          float fres = pow(1.0 - max(V.y, 0.0), 3.0);
          vec3 col = mix(uDeep, uShallow, smoothstep(0.35, 1.0, across) + r * 0.15);
          col = mix(col, uSky, fres * 0.55 + 0.08);
          col += lines * vec3(0.9, 0.95, 0.9) * 0.35;
          // sparkles where the sun hits the ripples
          vec3 N = normalize(vec3((r - 0.5) * 0.35, 1.0, (n(p + 3.1) - 0.5) * 0.35));
          float spec = pow(max(dot(reflect(-uSun, N), V), 0.0), 120.0);
          col += vec3(1.0, 0.93, 0.8) * spec * 1.4;
          // soft foam at the banks
          float foam = smoothstep(0.82, 0.95, across + (r - 0.5) * 0.12);
          col = mix(col, vec3(0.94, 0.93, 0.86), foam * 0.75);
          col = mix(col, uSky, uMist * 0.35);
          float a = mix(0.9, 0.0, smoothstep(0.96, 1.0, across));
          gl_FragColor = vec4(col, a);
          #include <fog_fragment>
          #include <colorspace_fragment>
        }`,
    })
    return { geo, mat }
  }, [])
  useFrame((_, dt) => { mat.uniforms.uTime.value += dt })
  riverMat.current = mat
  return <mesh geometry={geo} material={mat} renderOrder={2} />
}
export const riverMat = { current: null as THREE.ShaderMaterial | null }

// ───────────────────────── scatter helpers
function freeSpot(x: number, z: number, margin: number) {
  if (pathAmount(x, z) > 0.05) return false
  if (Math.abs(z - riverZ(x)) < RIVER.half + 1.5) return false
  if (Math.abs(z - MEADOW_FENCE_Z) < 1.2 + margin) return false
  if (Math.hypot(x - HOUSE.x, z - HOUSE.z) < 6 + margin) return false
  if (Math.hypot(x - WORKSHOP.x, z - WORKSHOP.z) < 10 + margin) return false
  if (inWorkshop(x, z)) return false
  for (const c of COTTAGES) if (Math.hypot(x - c.x, z - c.z) < 4.5 + margin) return false
  if (distToPolyline(x, z, TRAIL) < 1.8 + margin * 0.5) return false
  if (Math.hypot(x - SUMMIT.x, z - SUMMIT.z) < 5 + margin) return false
  return true
}

/** merge a kit piece into one geometry per material (for instancing) */
function pieceParts(node: THREE.Object3D) {
  node.updateWorldMatrix(true, true)
  const inv = new THREE.Matrix4().copy(node.matrixWorld).invert()
  const byMat = new Map<THREE.Material, THREE.BufferGeometry[]>()
  node.traverse((o) => {
    const m = o as THREE.Mesh
    if (!m.isMesh) return
    const g = m.geometry.clone()
    g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld))
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k)
    const mat = Array.isArray(m.material) ? m.material[0] : m.material
    const list = byMat.get(mat) ?? []
    list.push(g.index ? g.toNonIndexed() : g)
    byMat.set(mat, list)
  })
  return [...byMat.entries()].map(([mat, geos]) => ({ material: mat, geometry: mergeGeometries(geos, false)! }))
}

type Placement = { piece: string; x: number; z: number; s: number; r: number }

function scatterFlora(): Placement[] {
  const rand = mulberry32(20061023)
  const out: Placement[] = []
  const placedTrees: [number, number][] = []
  const tryTree = (x: number, z: number, piece: string, s: number, minD: number, collide = true) => {
    if (!freeSpot(x, z, 1.5)) return false
    if (placedTrees.some(([a, b]) => (a - x) ** 2 + (b - z) ** 2 < minD * minD)) return false
    placedTrees.push([x, z])
    out.push({ piece, x, z, s, r: rand() * Math.PI * 2 })
    if (collide && x > BOUNDS.minX && x < BOUNDS.maxX) circles.push({ x, z, r: 0.5 })
    return true
  }
  // deciduous trees: meadow edges and village; pines: north bank + summit; dense frame on valley walls
  for (let i = 0; i < 2600 && out.length < 340; i++) {
    const x = (rand() - 0.5) * 230, z = -125 + rand() * 230
    const area = areaAt(x, z)
    const wall = Math.abs(x) > 40 || z > 72 || z < -92
    const dense = wall ? 0.9 : area === 'workshop' || area === 'summit' ? 0.5 : area === 'meadow' ? 0.18 : 0.28
    if (rand() > dense) continue
    // keep the meadow's centre open and the view from the summit clear
    if (area === 'meadow' && Math.abs(x) < 16 && z > 46 && z < 72) continue
    if (z < -30 && z > -95 && Math.abs(x - SUMMIT.x) < 9 && z > SUMMIT.z - 2) continue
    const northern = z < -20
    const piece = northern ? ['pine_a', 'pine_b', 'pine_c'][Math.floor(rand() * 3)] : ['tree_a', 'tree_b', 'tree_c', 'tree_a', 'pine_c'][Math.floor(rand() * 5)]
    const s = northern ? 0.45 + rand() * 0.25 : 0.42 + rand() * 0.22
    tryTree(x, z, piece, wall ? s * 1.25 : s, wall ? 3.2 : 4.5)
  }
  // bushes, rocks, ferns near walkable areas
  for (let i = 0; i < 3000 && out.length < 760; i++) {
    const x = (rand() - 0.5) * 110, z = -95 + rand() * 175
    if (!freeSpot(x, z, 0.3)) continue
    const area = areaAt(x, z)
    const pool = area === 'meadow' ? ['bush', 'rock_b', 'grass_tall', 'flowers', 'flowers_b', 'bush_flowers', 'plant']
      : area === 'village' ? ['bush', 'bush_flowers', 'plant', 'grass_tall', 'flowers']
        : area === 'river' ? ['rock_a', 'rock_c', 'fern', 'grass_tall', 'bush']
          : ['rock_a', 'rock_b', 'fern', 'fern', 'bush', 'mushroom']
    const piece = pool[Math.floor(rand() * pool.length)]
    const rock = piece.startsWith('rock')
    const s = rock ? 0.35 + rand() * 0.45 : 0.55 + rand() * 0.35
    out.push({ piece, x, z, s, r: rand() * Math.PI * 2 })
    if (rock && s > 0.5) circles.push({ x, z, r: 1.0 * s })
  }
  return out
}

function KitScatter({ nodes }: { nodes: KitNodes }) {
  const sets = useMemo(() => {
    const placements = scatterFlora()
    const buckets = new Map<string, THREE.Matrix4[]>()
    const q = new THREE.Quaternion(), e = new THREE.Euler()
    for (const p of placements) {
      const list = buckets.get(p.piece) ?? []
      e.set(0, p.r, 0)
      q.setFromEuler(e)
      list.push(new THREE.Matrix4().compose(new THREE.Vector3(p.x, heightAt(p.x, p.z) - 0.08, p.z), q, new THREE.Vector3(p.s, p.s, p.s)))
      buckets.set(p.piece, list)
    }
    const out: { key: string; geometry: THREE.BufferGeometry; material: THREE.Material; matrices: THREE.Matrix4[] }[] = []
    for (const [piece, matrices] of buckets) {
      const node = nodes[piece]
      if (!node) continue
      const sway = !piece.startsWith('rock')
      pieceParts(node).forEach((part, i) => out.push({ key: piece + i, geometry: part.geometry, material: toToon(part.material, { sway }), matrices }))
    }
    return out
  }, [nodes])
  return (
    <>
      {sets.map((s) => (
        <instancedMesh key={s.key} args={[s.geometry, s.material, s.matrices.length]} castShadow receiveShadow
          ref={(m) => { if (m && !m.userData.done) { s.matrices.forEach((mm, i) => m.setMatrixAt(i, mm)); m.instanceMatrix.needsUpdate = true; m.computeBoundingSphere(); m.userData.done = true } }} />
      ))}
    </>
  )
}

// ───────────────────────── grass tufts + wildflowers
function tuftGeometry() {
  const blades: THREE.BufferGeometry[] = []
  const rand = mulberry32(7)
  for (let b = 0; b < 6; b++) {
    const h = 0.32 + rand() * 0.32, w = 0.045 + rand() * 0.02
    const a = rand() * Math.PI * 2, lean = 0.15 + rand() * 0.25
    const ox = (rand() - 0.5) * 0.25, oz = (rand() - 0.5) * 0.25
    const pos: number[] = [], col: number[] = []
    const segs = 3
    for (let i = 0; i <= segs; i++) {
      const t = i / segs
      const ww = w * (1 - t * 0.92)
      const bend = lean * t * t
      const y = h * t
      for (const s of [-1, 1]) {
        pos.push(ox + Math.cos(a) * ww * s + Math.sin(a) * bend, y, oz - Math.sin(a) * ww * s + Math.cos(a) * bend)
        col.push(0.42 + t * 0.58, 0.42 + t * 0.58, 0.42 + t * 0.58) // AO at the root
      }
    }
    const idx: number[] = []
    for (let i = 0; i < segs; i++) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2) }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
    g.setIndex(idx)
    blades.push(g)
  }
  const m = mergeGeometries(blades, false)!
  m.computeVertexNormals()
  // grass normals point up so tufts shade like the ground under them
  const n = m.getAttribute('normal') as THREE.BufferAttribute
  for (let i = 0; i < n.count; i++) n.setXYZ(i, 0, 1, 0)
  return m
}

function swayMaterial(base: THREE.MeshToonMaterial, strength = 0.12) {
  base.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = windUniforms.uTime
    sh.uniforms.uPlayer = { value: player.pos }
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime; uniform vec3 uPlayer;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        {
          vec3 ip = instanceMatrix[3].xyz;
          float k = position.y * position.y * 4.0;
          float w = sin(uTime * 1.7 + ip.x * 0.35 + ip.z * 0.25) * 0.6 + sin(uTime * 2.9 + ip.x * 0.8) * 0.25;
          transformed.x += w * ${strength.toFixed(3)} * k;
          transformed.z += cos(uTime * 1.3 + ip.z * 0.4) * ${(strength * 0.6).toFixed(3)} * k;
          // part around the player's legs
          vec2 d = ip.xz - uPlayer.xz; float dl = length(d);
          transformed.xz += normalize(d + 1e-4) * smoothstep(1.2, 0.0, dl) * k * 0.25;
        }`)
  }
  base.customProgramCacheKey = () => `sway${strength}`
  return base
}

export function Grass() {
  const { tufts, tuftMat, count, flowers, flowerMat, fcount } = useMemo(() => {
    const rand = mulberry32(42)
    const geo = tuftGeometry()
    const tuftMat = swayMaterial(new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: toonRamp(), side: THREE.DoubleSide }))
    const max = 16000
    const tufts = new THREE.InstancedMesh(geo, tuftMat, max)
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), p = new THREE.Vector3()
    const c = new THREE.Color()
    const greens = ['#a9c46a', '#c4c872', '#98b862', '#d2c878', '#b3c064'].map((h) => new THREE.Color(h))
    const northG = ['#7f9a5e', '#6f8c58', '#8aa36a'].map((h) => new THREE.Color(h))
    let n = 0
    for (let i = 0; i < 90000 && n < max; i++) {
      // denser near the story path, sparse far away
      const x = (rand() - 0.5) * 120, z = -96 + rand() * 180
      const dl = Math.min(distToPolyline(x, z, LANE), distToPolyline(x, z, NORTH_PATH), distToPolyline(x, z, TRAIL), Math.abs(z - ROAD_Z) + 4)
      if (rand() > 1.15 - Math.min(1, dl / 26)) continue
      if (pathAmount(x, z) > 0.25) continue
      if (Math.abs(z - riverZ(x)) < RIVER.half + 0.6) continue
      if (Math.hypot(x - HOUSE.x, z - HOUSE.z) < 4.2 || COTTAGES.some((c) => Math.hypot(x - c.x, z - c.z) < 3.4)) continue
      if (inWorkshop(x, z)) continue
      p.set(x, heightAt(x, z) - 0.02, z)
      e.set(0, rand() * Math.PI * 2, 0); q.setFromEuler(e)
      const s = 0.75 + rand() * 0.7 + (areaAt(x, z) === 'meadow' ? 0.35 : 0)
      sc.set(s, s * (0.8 + rand() * 0.5), s)
      tufts.setMatrixAt(n, m.compose(p, q, sc))
      const pal = z < -20 ? northG : greens
      c.copy(pal[Math.floor(rand() * pal.length)]).multiplyScalar(0.92 + rand() * 0.16)
      tufts.setColorAt(n, c)
      n++
    }
    tufts.count = n
    tufts.instanceMatrix.needsUpdate = true
    if (tufts.instanceColor) tufts.instanceColor.needsUpdate = true
    tufts.computeBoundingSphere()
    tufts.receiveShadow = true

    // flowers: a stem + a small 5-petal head
    const petal = new THREE.CircleGeometry(0.045, 5)
    petal.rotateX(-Math.PI / 2); petal.translate(0, 0.32, 0)
    const centre = new THREE.SphereGeometry(0.018, 6, 4); centre.translate(0, 0.335, 0)
    const stem = new THREE.CylinderGeometry(0.004, 0.006, 0.32, 3); stem.translate(0, 0.16, 0)
    const colorize = (g: THREE.BufferGeometry, col: number[]) => { const a = new Float32Array(g.getAttribute('position').count * 3); for (let i = 0; i < a.length; i += 3) a.set(col, i); g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g }
    const fgeo = mergeGeometries([colorize(petal.toNonIndexed(), [1, 1, 1]), colorize(centre.toNonIndexed(), [1, 0.85, 0.35]), colorize(stem.toNonIndexed(), [0.35, 0.5, 0.3])], false)!
    fgeo.deleteAttribute('uv')
    const flowerMat = swayMaterial(new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: toonRamp(), side: THREE.DoubleSide }), 0.08)
    const fmax = 2600
    const flowers = new THREE.InstancedMesh(fgeo, flowerMat, fmax)
    const fcols = ['#f5efe2', '#f2c94c', '#c9a3d8', '#e88a6a', '#f3e6a0', '#9fb6e0'].map((h) => new THREE.Color(h))
    let fn = 0
    for (let i = 0; i < 30000 && fn < fmax; i++) {
      const x = (rand() - 0.5) * 100, z = -40 + rand() * 120
      if (!freeSpot(x, z, 0) || pathAmount(x, z) > 0.05) continue
      const meadow = areaAt(x, z) === 'meadow'
      if (rand() > (meadow ? 0.9 : 0.25)) continue
      // clumps
      const cx = x, cz = z, k = 3 + Math.floor(rand() * 6), col = fcols[Math.floor(rand() * fcols.length)]
      for (let j = 0; j < k && fn < fmax; j++) {
        const fx = cx + (rand() - 0.5) * 1.4, fz = cz + (rand() - 0.5) * 1.4
        p.set(fx, heightAt(fx, fz), fz)
        e.set((rand() - 0.5) * 0.3, rand() * 6.28, (rand() - 0.5) * 0.3); q.setFromEuler(e)
        const s = 0.8 + rand() * 0.6
        sc.set(s, s, s)
        flowers.setMatrixAt(fn, m.compose(p, q, sc))
        flowers.setColorAt(fn, c.copy(col).multiplyScalar(0.9 + rand() * 0.15))
        fn++
      }
    }
    flowers.count = fn
    flowers.instanceMatrix.needsUpdate = true
    if (flowers.instanceColor) flowers.instanceColor.needsUpdate = true
    flowers.computeBoundingSphere()
    return { tufts, tuftMat, count: n, flowers, flowerMat, fcount: fn }
  }, [])
  void tuftMat; void count; void flowerMat; void fcount
  return (
    <>
      <primitive object={tufts} />
      <primitive object={flowers} />
    </>
  )
}

// ───────────────────────── pollen / fireflies around the camera
export function Pollen() {
  const ref = useRef<THREE.Points>(null)
  const { geo, mat } = useMemo(() => {
    const N = 260
    const rand = mulberry32(99)
    const pos = new Float32Array(N * 3), seed = new Float32Array(N)
    for (let i = 0; i < N; i++) { pos.set([(rand() - 0.5) * 60, rand() * 9, (rand() - 0.5) * 60], i * 3); seed[i] = rand() * 100 }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1))
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uCenter: { value: new THREE.Vector3() }, uColor: { value: new THREE.Color('#fff1c7') }, uAmount: { value: 1 } },
      vertexShader: /* glsl */ `
        uniform float uTime; uniform vec3 uCenter; attribute float aSeed; varying float vA;
        void main(){
          vec3 p = position;
          p.x += sin(uTime * 0.21 + aSeed) * 2.0 + uTime * 0.35;
          p.z += cos(uTime * 0.17 + aSeed * 1.3) * 2.0;
          p.y += sin(uTime * 0.5 + aSeed * 2.0) * 0.6;
          // wrap around the camera focus
          p.xz = mod(p.xz - uCenter.xz + 30.0, 60.0) - 30.0 + uCenter.xz;
          p.y += uCenter.y - 1.0;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = min(5.0, (1.0 + fract(aSeed) * 1.6) * (34.0 / -mv.z));
          vA = 0.55 + 0.45 * sin(uTime * 1.5 + aSeed * 3.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor; uniform float uAmount; varying float vA;
        void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d); gl_FragColor = vec4(uColor * a * vA * uAmount, 1.0); }`,
    })
    return { geo, mat }
  }, [])
  useFrame((state, dt) => {
    mat.uniforms.uTime.value += dt
    mat.uniforms.uCenter.value.copy(player.pos)
    pollenMat.current = mat
    void state
  })
  return <points ref={ref} geometry={geo} material={mat} frustumCulled={false} />
}
export const pollenMat = { current: null as THREE.ShaderMaterial | null }

export function Nature() {
  const nodes = useKit()
  return (
    <>
      <Ground />
      <River />
      <KitScatter nodes={nodes} />
      <Grass />
      <Pollen />
    </>
  )
}
