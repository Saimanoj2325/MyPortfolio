import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import fs from 'fs'
globalThis.self = globalThis
const f = process.argv[2]
const buf = fs.readFileSync(f)
const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder)
// stub image loading
THREE.ImageBitmapLoader.prototype.load = function (u, onL) { onL({ width: 1, height: 1 }) }
THREE.ImageLoader.prototype.load = function (u, onL) { const o = { width: 1, height: 1 }; setTimeout(() => onL(o)); return o }
globalThis.createImageBitmap = undefined
loader.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), '', (g) => {
  const box = new THREE.Box3().setFromObject(g.scene)
  console.log('box', box.min.toArray().map(v=>v.toFixed(2)), box.max.toArray().map(v=>v.toFixed(2)))
  console.log('anims', g.animations.map(a => a.name + ':' + a.duration.toFixed(2)).join(' '))
  const names = []; g.scene.traverse(o => { if (o.isMesh) names.push(o.name + (o.isSkinnedMesh ? '(skin)' : '')) })
  console.log('meshes', names.length, names.slice(0, 80).join(', '))
  g.scene.traverse(o=>{ if(o.isMesh){ const b=new THREE.Box3().setFromObject(o); console.log(o.name, b.min.toArray().map(v=>v.toFixed(2)), b.max.toArray().map(v=>v.toFixed(2)))}}); const top = g.scene.children.map(c => { const b=new THREE.Box3().setFromObject(c); const s=b.getSize(new THREE.Vector3()); return c.name+'='+s.toArray().map(v=>v.toFixed(2)).join('x') }); console.log('top', top.slice(0, 80).join(','))
}, (e) => console.error('ERR', e))
