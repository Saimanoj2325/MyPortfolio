// Checks that a perch point sits on a kit tree's branch: raycasts down/around from the perch.
// Usage: node tools/perchcheck.mjs <piece> <scale> <yOffset> <px> <py> <pz>   (perch relative to tree base)
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import fs from 'fs'
globalThis.self = globalThis
THREE.ImageLoader.prototype.load = function (u, onL) { const o = { width: 1, height: 1 }; setTimeout(() => onL(o)); return o }
globalThis.createImageBitmap = undefined
const [piece, s, yo, px, py, pz] = process.argv.slice(2).map((v, i) => i ? +v : v)
const buf = fs.readFileSync('public/models/kit.glb')
const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder)
loader.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), '', (g) => {
  let src; g.scene.traverse((o) => { if (o.name === piece && !src) src = o })
  const o = src.clone(true); o.position.set(0, yo, 0); o.quaternion.identity(); o.scale.setScalar(s)
  const root = new THREE.Group(); root.add(o); root.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(root); console.log('tree box', box.min.toArray().map((v) => v.toFixed(2)), box.max.toArray().map((v) => v.toFixed(2)))
  const rc = new THREE.Raycaster()
  rc.set(new THREE.Vector3(px, py + 1.5, pz), new THREE.Vector3(0, -1, 0))
  const hits = rc.intersectObject(root, true).map((h) => `${h.point.y.toFixed(2)}(${h.object.name})`)
  console.log('down-ray hits at perch xz:', hits.join(' ') || 'NONE')
  // best branch tops near the perch height: scan a grid for topmost hits within ±0.6 of py
  const cands = []
  for (let dx = -2; dx <= 2; dx += 0.1) for (let dz = -2; dz <= 2; dz += 0.1) {
    rc.set(new THREE.Vector3(px + dx, py + 0.8, pz + dz), new THREE.Vector3(0, -1, 0))
    for (const h of rc.intersectObject(root, true)) if (Math.abs(h.point.y - py) < 0.7) cands.push({ x: px + dx, y: h.point.y, z: pz + dz, n: h.object.name, d: Math.hypot(dx, dz), up: h.face.normal.clone().transformDirection(h.object.matrixWorld).y })
  }
  const groups = {}; for (const c of cands) (groups[c.n] ||= []).push(c)
  for (const [n, cs] of Object.entries(groups)) { cs.sort((a, b) => a.d - b.d); console.log(n, src.getObjectByName(n)?.material?.name, src.getObjectByName(n)?.material?.color?.getHexString(), cs.slice(0, 4).map((c) => `(${c.x.toFixed(2)},${c.y.toFixed(2)},${c.z.toFixed(2)} up${c.up.toFixed(2)})`).join(' ')) }
}, (e) => console.error('ERR', e))
