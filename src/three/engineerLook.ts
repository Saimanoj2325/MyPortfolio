// The engineer-adventurer: Quaternius base character + UAL animations (public/models/engineer.glb).
// Clothes are painted per-vertex from skin weights (hoodie / jeans / sneakers), then a hood and a
// backpack are attached to the spine so they move with the rig. Shared by the game, NPCs and the tour.
import * as THREE from 'three'
import { useGLTF } from '@react-three/drei'
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { toonRamp } from './materials'

export const ENGINEER_URL = `${import.meta.env.BASE_URL}models/engineer.glb`

export type Outfit = { hoodie: string; jeans: string; shoes: string; pack: string | null; skinTint?: string; hair?: string }
export const OUTFITS: Record<string, Outfit> = {
  hero: {
    hoodie: '#2463aa', // vibrant blue hoodie
    jeans: '#48443c',  // warm earthy khaki/tan cargo trail pants
    shoes: '#26201b',  // dark rugged leather trail boots
    pack: '#3e2d21',   // rich saddle-brown traveler rucksack
    hair: '#1f1712',   // dark brunette young hair (~20 years old)
    skinTint: '#e0bfa3', // warm, healthy, youthful glowing complexion
  },
  sage: { hoodie: '#7c8a72', jeans: '#3a3f47', shoes: '#d8d0c0', pack: null, skinTint: '#d9b79c' },
  stone: { hoodie: '#a59d8c', jeans: '#2f3540', shoes: '#efe8da', pack: null, skinTint: '#a77c5f', hair: '#2a211c' },
  ink: { hoodie: '#2f343d', jeans: '#4f5b6c', shoes: '#c9c0ae', pack: null, skinTint: '#c49478' },
}

const REGION = (bone: string) => {
  const b = bone.toLowerCase()
  if (b.startsWith('foot') || b.startsWith('ball')) return 'shoes'
  if (b.startsWith('pelvis') || b.startsWith('thigh') || b.startsWith('calf')) return 'jeans'
  if (b.startsWith('spine') || b.startsWith('clavicle') || b.startsWith('upperarm') || b.startsWith('lowerarm')) return 'hoodie'
  return 'skin'
}

function clothMaterial(src: THREE.MeshStandardMaterial, skinTint?: string) {
  const m = new THREE.MeshToonMaterial({ map: src.map ?? null, gradientMap: toonRamp(), color: skinTint ? new THREE.Color(skinTint).lerp(new THREE.Color('#ffffff'), 0.35) : '#ffffff' })
  if (m.map) m.map.colorSpace = THREE.SRGBColorSpace
  m.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 aCloth;\nvarying vec4 vCloth;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvCloth = aCloth;')
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec4 vCloth;')
      .replace(
        '#include <map_fragment>',
        `#include <map_fragment>
        { float l = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
          diffuseColor.rgb = mix(vec3(l), diffuseColor.rgb, 0.8);
          float m = smoothstep(0.35, 0.65, vCloth.a);
          diffuseColor.rgb = mix(diffuseColor.rgb, vCloth.rgb, m); }`,
      )
  }
  m.customProgramCacheKey = () => 'cloth'
  return m
}

function paintClothes(mesh: THREE.SkinnedMesh, outfit: Outfit) {
  const g = mesh.geometry
  const si = g.getAttribute('skinIndex') as THREE.BufferAttribute
  const sw = g.getAttribute('skinWeight') as THREE.BufferAttribute
  const regions = mesh.skeleton.bones.map((b) => REGION(b.name))
  const cols: Record<string, THREE.Color> = {
    hoodie: new THREE.Color(outfit.hoodie), jeans: new THREE.Color(outfit.jeans), shoes: new THREE.Color(outfit.shoes),
  }
  const out = new Float32Array(si.count * 4)
  const c = new THREE.Color()
  for (let i = 0; i < si.count; i++) {
    c.setRGB(0, 0, 0)
    let mask = 0
    for (let k = 0; k < 4; k++) {
      const w = sw.getComponent(i, k)
      if (w <= 0) continue
      const r = regions[si.getComponent(i, k)] ?? 'skin'
      if (r === 'skin') continue
      mask += w
      c.r += cols[r].r * w; c.g += cols[r].g * w; c.b += cols[r].b * w
    }
    if (mask > 0) { c.r /= mask; c.g /= mask; c.b /= mask }
    out.set([c.r, c.g, c.b, mask], i * 4)
  }
  g.setAttribute('aCloth', new THREE.BufferAttribute(out, 4))
}

function findBone(root: THREE.Object3D, name: string) {
  let found: THREE.Bone | null = null
  root.traverse((o) => { if (!found && (o as THREE.Bone).isBone && o.name === name) found = o as THREE.Bone })
  return found as THREE.Bone | null
}

/** Detailed traveler/adventurer backpack with leather flaps, pockets, straps, buckles & bedroll */
function buildTravelerBag(packColor: string) {
  const pack = new THREE.Group()

  const leatherMain = new THREE.MeshToonMaterial({ color: packColor, gradientMap: toonRamp() })
  const leatherDark = new THREE.MeshToonMaterial({ color: '#251b14', gradientMap: toonRamp() })
  const brassMat = new THREE.MeshToonMaterial({ color: '#c69a42', gradientMap: toonRamp() })
  const bedrollMat = new THREE.MeshToonMaterial({ color: '#685c4d', gradientMap: toonRamp() })
  const patchMat = new THREE.MeshToonMaterial({ color: '#573d2a', gradientMap: toonRamp() })

  // 1. Main rucksack body
  const body = new THREE.Mesh(new RoundedBoxGeometry(0.32, 0.40, 0.17, 3, 0.04), leatherMain)
  pack.add(body)

  // 2. Top leather lid / flap
  const lid = new THREE.Mesh(new RoundedBoxGeometry(0.33, 0.08, 0.19, 2, 0.03), leatherDark)
  lid.position.set(0, 0.20, 0.01)
  lid.rotation.x = -0.06
  pack.add(lid)

  // 3. Front bellows pocket
  const pocket = new THREE.Mesh(new RoundedBoxGeometry(0.23, 0.18, 0.07, 2, 0.02), leatherMain)
  pocket.position.set(0, -0.07, -0.11)
  pack.add(pocket)

  // Front pocket flap
  const pocketFlap = new THREE.Mesh(new RoundedBoxGeometry(0.24, 0.05, 0.08, 2, 0.015), leatherDark)
  pocketFlap.position.set(0, 0.035, -0.115)
  pack.add(pocketFlap)

  // Leather brand patch on front pocket
  const patch = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.045, 0.01), patchMat)
  patch.position.set(0, -0.07, -0.15)
  pack.add(patch)

  // 4. Side cargo pockets (left & right)
  for (const sx of [-1, 1]) {
    const sidePocket = new THREE.Mesh(new RoundedBoxGeometry(0.06, 0.16, 0.11, 2, 0.015), leatherMain)
    sidePocket.position.set(sx * 0.18, -0.06, 0)
    pack.add(sidePocket)

    const sideFlap = new THREE.Mesh(new RoundedBoxGeometry(0.065, 0.04, 0.12, 2, 0.012), leatherDark)
    sideFlap.position.set(sx * 0.18, 0.035, 0)
    pack.add(sideFlap)
  }

  // 5. Vertical leather cinch straps with brass buckles
  for (const sx of [-0.08, 0.08]) {
    const strap = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.38, 0.012), leatherDark)
    strap.position.set(sx, 0.03, -0.092)
    pack.add(strap)

    const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.022, 0.018), brassMat)
    buckle.position.set(sx, 0.15, -0.095)
    pack.add(buckle)

    const buckleLow = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.018, 0.016), brassMat)
    buckleLow.position.set(sx, -0.13, -0.095)
    pack.add(buckleLow)
  }

  // 6. Top Bedroll / Adventure Gear Roll
  const bedroll = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.35, 12), bedrollMat)
  bedroll.rotation.z = Math.PI / 2
  bedroll.position.set(0, 0.27, 0)
  pack.add(bedroll)

  // Bedroll leather tie straps with buckles
  for (const sx of [-0.11, 0.11]) {
    const rollStrap = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.008, 6, 16), leatherDark)
    rollStrap.rotation.y = Math.PI / 2
    rollStrap.position.set(sx, 0.27, 0)
    pack.add(rollStrap)

    const rollBuckle = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.022, 0.016), brassMat)
    rollBuckle.position.set(sx, 0.31, -0.04)
    pack.add(rollBuckle)
  }

  // 7. Clean shoulder straps resting naturally on top of the shoulders (no front chest straps)
  for (const sx of [-0.09, 0.09]) {
    const strap = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.32, 0.018), leatherDark)
    strap.position.set(sx, 0.06, 0.14)
    strap.rotation.x = -0.15
    pack.add(strap)
  }

  pack.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) {
      o.castShadow = true
      o.receiveShadow = true
    }
  })

  pack.position.set(0, 1.28, -0.21)
  pack.rotation.x = -0.05

  return pack
}

/** Clone + dress the engineer. Returns a group whose feet sit at y=0, `height` metres tall. */
export function buildEngineer(scene: THREE.Object3D, outfit: Outfit, height = 1.72) {
  const m = SkeletonUtils.clone(scene)
  m.updateMatrixWorld(true)
  m.traverse((o) => {
    o.frustumCulled = false
    const sm = o as THREE.SkinnedMesh
    if (!sm.isMesh) return
    sm.castShadow = true
    sm.receiveShadow = true
    // Hide any older facial hair / beards / mustache to keep him looking clean-shaven and youthful
    const nameLower = sm.name.toLowerCase()
    if (nameLower.includes('beard') || nameLower.includes('mustache') || nameLower.includes('stache')) {
      sm.visible = false
      return
    }
    const src = sm.material as THREE.MeshStandardMaterial
    if (sm.name.startsWith('SuperHero')) {
      sm.geometry = sm.geometry.clone() // clones share geometry; each outfit paints its own copy
      paintClothes(sm, outfit)
      sm.material = clothMaterial(src, outfit.skinTint)
    } else {
      const isHair = nameLower.includes('hair') || nameLower.includes('eyebrow')
      const mat = new THREE.MeshToonMaterial({
        map: src.map ?? null,
        gradientMap: toonRamp(),
        alphaTest: 0.35,
        side: src.side,
        color: outfit.hair && isHair ? outfit.hair : '#ffffff',
      })
      if (mat.map) mat.map.colorSpace = THREE.SRGBColorSpace
      sm.material = mat
    }
  })
  // hood + backpack, attached in bind pose so they inherit the rig
  const spine = findBone(m, 'spine_03')
  if (spine) {
    const hoodMat = new THREE.MeshToonMaterial({ color: outfit.hoodie, gradientMap: toonRamp() })
    const hood = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.045, 10, 24), hoodMat)
    hood.position.set(0, 1.5, -0.045)
    hood.rotation.x = Math.PI / 2 + 0.35
    hood.scale.set(1.25, 1, 1)
    hood.castShadow = true
    m.add(hood)
    m.updateMatrixWorld(true)
    spine.attach(hood)
    if (outfit.pack) {
      const pack = buildTravelerBag(outfit.pack)
      m.add(pack)
      m.updateMatrixWorld(true)
      spine.attach(pack)
    }
  }
  const box = new THREE.Box3().setFromObject(m)
  const h = box.max.y - box.min.y || 1
  const wrap = new THREE.Group()
  const s = height / 1.84 // the T-pose bbox is arms-wide; use the known rig height
  m.scale.setScalar(s)
  m.position.y = -box.min.y * s
  wrap.add(m)
  wrap.userData.rawHeight = h
  return wrap
}

export function useEngineerGLTF() {
  return useGLTF(ENGINEER_URL)
}
useGLTF.preload(ENGINEER_URL)

function resolveAction(actions: Record<string, THREE.AnimationAction | null>, name: string): THREE.AnimationAction | null {
  if (actions[name]) return actions[name]
  const lower = name.toLowerCase()
  for (const k of Object.keys(actions)) {
    if (k.toLowerCase() === lower && actions[k]) return actions[k]
  }
  if (name === 'Jog') return actions['Run'] || actions['Walk'] || null
  if (name === 'Crouch') return actions['Sit'] || actions['Idle'] || null
  return actions['Idle'] || actions['idle'] || Object.values(actions).find((a) => a !== null) || null
}

export function crossPlay(
  actions: Record<string, THREE.AnimationAction | null>,
  current: { name: string | null },
  name: string,
  fade = 0.25,
  once = false,
  timeScale = 1,
) {
  const next = resolveAction(actions, name)
  if (!next) return null
  if (current.name === name) {
    if (!next.isRunning()) {
      next.enabled = true
      next.play()
    }
    return next
  }
  const prev = current.name ? resolveAction(actions, current.name) : null
  next.reset()
  next.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity)
  next.clampWhenFinished = once
  next.timeScale = timeScale
  next.enabled = true
  if (prev && prev !== next && prev.isRunning() && fade > 0) {
    next.play()
    prev.crossFadeTo(next, fade, false)
  } else {
    next.setEffectiveWeight(1)
    next.play()
  }
  current.name = name
  return next
}
