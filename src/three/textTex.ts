// Canvas text textures (no font fetch, so the single-file build works offline).
import * as THREE from 'three'

export function textTexture(text: string, opts: { w?: number; h?: number; font?: string; color?: string; bg?: string; size?: number } = {}) {
  const w = opts.w ?? 512, h = opts.h ?? 128
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  const g = c.getContext('2d')!
  if (opts.bg) { g.fillStyle = opts.bg; g.fillRect(0, 0, w, h) }
  g.fillStyle = opts.color ?? '#f3ead8'
  g.font = opts.font ?? `600 ${opts.size ?? 64}px Georgia, 'Times New Roman', serif`
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillText(text, w / 2, h / 2 + 2)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  return t
}
