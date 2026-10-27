// Small canvas-generated textures for the animals (no image files → works in the single-file build).
import * as THREE from 'three'

function rand(seed: number) {
  let a = seed >>> 0
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}
const cache = new Map<string, THREE.Texture>()

/** soft fur: thousands of short streaks, used as a colour map (subtle) and a bump map */
export function furMaps() {
  const key = 'fur'
  if (cache.has(key)) return { map: cache.get(key)!, bump: cache.get(key + 'b')!, alpha: cache.get(key + 'a')! }
  const N = 256
  const r = rand(11)
  const mk = () => { const c = document.createElement('canvas'); c.width = c.height = N; return c }
  const col = mk(), bump = mk(), alpha = mk()
  const g = col.getContext('2d')!, gb = bump.getContext('2d')!, ga = alpha.getContext('2d')!
  g.fillStyle = '#d8d8d8'; g.fillRect(0, 0, N, N)
  gb.fillStyle = '#808080'; gb.fillRect(0, 0, N, N)
  ga.fillStyle = '#000'; ga.fillRect(0, 0, N, N)
  for (let i = 0; i < 5200; i++) {
    const x = r() * N, y = r() * N, len = 4 + r() * 9, ang = Math.PI / 2 + (r() - 0.5) * 0.7
    const v = 170 + r() * 85
    const draw = (ctx: CanvasRenderingContext2D, s: string, w: number) => {
      ctx.strokeStyle = s; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len); ctx.stroke()
      // wrap
      if (x + len > N || y + len > N) { ctx.beginPath(); ctx.moveTo(x - N, y - N); ctx.lineTo(x - N + Math.cos(ang) * len, y - N + Math.sin(ang) * len); ctx.stroke() }
    }
    draw(g, `rgb(${v},${v},${v})`, 1.1)
    draw(gb, `rgb(${120 + r() * 135},${120 + r() * 135},${120 + r() * 135})`, 1.3)
    if (r() < 0.55) draw(ga, '#fff', 1.6)
  }
  const tex = (c: HTMLCanvasElement, srgb: boolean) => { const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t }
  const out = { map: tex(col, true), bump: tex(bump, false), alpha: tex(alpha, false) }
  cache.set(key, out.map); cache.set(key + 'b', out.bump); cache.set(key + 'a', out.alpha)
  return out
}

/** overlapping scalloped contour feathers (white-ish pattern to multiply with a colour) */
export function featherMap() {
  const key = 'feather'
  if (cache.has(key)) return cache.get(key)!
  const N = 256
  const c = document.createElement('canvas'); c.width = c.height = N
  const g = c.getContext('2d')!
  g.fillStyle = '#e9e9e9'; g.fillRect(0, 0, N, N)
  const s = 22
  for (let row = -1; row < N / (s * 0.55) + 2; row++) {
    for (let col = -1; col < N / s + 2; col++) {
      const x = col * s + (row % 2 ? s / 2 : 0), y = row * s * 0.55
      const grd = g.createRadialGradient(x, y - s * 0.2, 1, x, y, s * 0.62)
      grd.addColorStop(0, '#ffffff'); grd.addColorStop(0.75, '#e6e6e6'); grd.addColorStop(1, '#a9a9a9')
      g.fillStyle = grd
      g.beginPath(); g.ellipse(x, y, s * 0.6, s * 0.62, 0, 0, Math.PI); g.fill()
      g.strokeStyle = 'rgba(70,70,70,0.25)'; g.lineWidth = 1
      g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + s * 0.5); g.stroke()
    }
  }
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(3, 3)
  t.colorSpace = THREE.SRGBColorSpace
  cache.set(key, t)
  return t
}

/** a single flight feather: rachis (shaft) + barbs, alpha-cut, white so it can be tinted */
export function flightFeatherMap() {
  const key = 'flight'
  if (cache.has(key)) return cache.get(key)!
  const W = 64, H = 256
  const c = document.createElement('canvas'); c.width = W; c.height = H
  const g = c.getContext('2d')!
  g.clearRect(0, 0, W, H)
  const r = rand(5)
  // vane outline
  g.fillStyle = '#ffffff'
  g.beginPath()
  g.moveTo(W / 2, 2)
  g.bezierCurveTo(W * 0.95, H * 0.12, W * 0.92, H * 0.7, W * 0.56, H - 2)
  g.lineTo(W * 0.44, H - 2)
  g.bezierCurveTo(W * 0.1, H * 0.7, W * 0.05, H * 0.12, W / 2, 2)
  g.fill()
  // barbs
  g.globalCompositeOperation = 'source-atop'
  for (let y = 4; y < H; y += 2.2) {
    g.strokeStyle = `rgba(0,0,0,${0.06 + r() * 0.08})`
    g.beginPath(); g.moveTo(W / 2, y); g.lineTo(2, y - 9); g.stroke()
    g.beginPath(); g.moveTo(W / 2, y); g.lineTo(W - 2, y - 9); g.stroke()
  }
  // a couple of natural splits in the vane
  g.globalCompositeOperation = 'destination-out'
  for (let k = 0; k < 3; k++) { const y = H * (0.3 + r() * 0.5); g.beginPath(); g.moveTo(W / 2 + 3, y); g.lineTo(W, y - 14); g.lineTo(W, y - 11); g.closePath(); g.fill() }
  g.globalCompositeOperation = 'source-over'
  g.fillStyle = 'rgba(40,40,40,0.55)'; g.fillRect(W / 2 - 1, 2, 2, H - 4)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  cache.set(key, t)
  return t
}
