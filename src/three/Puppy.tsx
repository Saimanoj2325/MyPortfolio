// A golden retriever pup, built procedurally: big head, short muzzle, wet nose, expressive eyes,
// floppy spring-driven ears, feathery tail, four legs with a diagonal trot. Soft fur = sheen
// material + three alpha-tested fur shells. Companion AI: follows at the player's side with
// arrival steering, matches walk/run speed, sniffs, sits when the player stops, looks up at him,
// leads ahead at story beats and waits; pet him with E.
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { player, puppy, boat } from '../lib/actors'
import { registerInteractable } from '../lib/interact'
import { blockedAt, walkY } from '../world/layout'
import { ROOM_ORIGIN, roomBlocked, roomToWorld } from '../lib/room'
import { useStore } from '../store'
import { puppyLines } from '../data/story'
import { playSfx } from '../ui/sound'
import { angleDiff, dampAngle } from './Player'
import { furMaps } from './proceduralTex'
import { riverBottlePos } from './RiverBottle'

// a golden retriever pup: warm, slightly muted golds; cream chest, legs and feathering; darker back and ears
const BACK = new THREE.Color('#b47a3d'), SIDE = new THREE.Color('#cf9856'), BELLY = new THREE.Color('#ead0a0'), CREAM = '#e8cc98', EAR = '#a76b33'

/** paint a geometry with a back → belly gradient (object-space y), so the coat reads naturally */
function coat(g: THREE.BufferGeometry, top: number, bottom: number, a = BACK, b = SIDE, c = BELLY) {
  const pos = g.getAttribute('position') as THREE.BufferAttribute
  const col = new Float32Array(pos.count * 3)
  const k = new THREE.Color()
  for (let i = 0; i < pos.count; i++) {
    const t = THREE.MathUtils.clamp((pos.getY(i) - bottom) / (top - bottom), 0, 1) // 1 = top
    if (t > 0.55) k.copy(b).lerp(a, (t - 0.55) / 0.45)
    else k.copy(c).lerp(b, THREE.MathUtils.smoothstep(t, 0.15, 0.55))
    col.set([k.r, k.g, k.b], i * 3)
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3))
  return g
}
function solid(g: THREE.BufferGeometry, color: string) { return coat(g, 1, 0, new THREE.Color(color), new THREE.Color(color), new THREE.Color(color)) }

type Leg = { hip: THREE.Group; knee: THREE.Group; front: boolean; side: number }

function buildPuppy() {
  const root = new THREE.Group()
  const body = new THREE.Group()
  root.add(body)
  const fur = furMaps()
  const coatMat = new THREE.MeshPhysicalMaterial({ vertexColors: true, map: fur.map, bumpMap: fur.bump, bumpScale: 1.6, roughness: 0.88, sheen: 0.7, sheenColor: new THREE.Color('#ffe7c2'), sheenRoughness: 0.5 })
  const shellMats = [0, 1, 2].map((l) => {
    const m = new THREE.MeshStandardMaterial({ vertexColors: true, alphaMap: fur.alpha, alphaTest: 0.45 + l * 0.12, roughness: 1, color: new THREE.Color(1 + l * 0.05, 1 + l * 0.05, 1 + l * 0.04) })
    const off = 0.004 + l * 0.0045
    m.onBeforeCompile = (sh) => { sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\ntransformed += normal * ${off.toFixed(4)}; transformed.y -= ${(l * 0.0015).toFixed(4)};`) }
    m.customProgramCacheKey = () => `pupfur${l}`
    return m
  })
  const furry: THREE.Mesh[] = []
  const add = (parent: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material, pos: [number, number, number], rot?: [number, number, number], scale?: [number, number, number], hasFur = true) => {
    const m = new THREE.Mesh(geo, mat)
    m.position.set(...pos)
    if (rot) m.rotation.set(...rot)
    if (scale) m.scale.set(...scale)
    m.castShadow = true
    parent.add(m)
    if (hasFur) furry.push(m)
    return m
  }

  // body: one smooth lathed barrel (rump → deep chest), slightly taller than wide
  const prof = [[0, -0.22], [0.075, -0.212], [0.115, -0.17], [0.125, -0.1], [0.118, -0.01], [0.124, 0.07], [0.136, 0.13], [0.124, 0.185], [0.075, 0.225], [0, 0.235]]
  const bodyGeo = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 30, 12)
  bodyGeo.rotateX(Math.PI / 2)
  bodyGeo.scale(1, 1.1, 1)
  coat(bodyGeo, 0.14, -0.14)
  add(body, bodyGeo, coatMat, [0, 0.34, 0])
  // neck: a tapered column into the head
  const neckGeo = coat(new THREE.CylinderGeometry(0.078, 0.105, 0.2, 18, 3), 0.1, -0.1, BACK, SIDE, new THREE.Color(CREAM))
  add(body, neckGeo, coatMat, [0, 0.45, 0.19], [0.75, 0, 0])

  // head
  const head = new THREE.Group()
  head.position.set(0, 0.55, 0.27)
  body.add(head)
  const skullGeo = coat(new THREE.SphereGeometry(0.1, 28, 22), 0.1, -0.1, new THREE.Color('#c48a47'), SIDE, new THREE.Color('#e4c28c'))
  add(head, skullGeo, coatMat, [0, 0.02, 0], undefined, [1, 0.92, 1.04])
  // muzzle: tapered, rounded, lighter; cheeks; chin
  const muzzleGeo = solid(new THREE.CylinderGeometry(0.05, 0.066, 0.088, 18, 2), '#e2bd84')
  muzzleGeo.rotateX(Math.PI / 2)
  add(head, muzzleGeo, coatMat, [0, -0.03, 0.094])
  add(head, solid(new THREE.SphereGeometry(0.05, 18, 14), '#e5c18a'), coatMat, [0, -0.032, 0.138], undefined, [1, 0.88, 0.9])
  for (const sx of [-1, 1]) add(head, solid(new THREE.SphereGeometry(0.052, 16, 12), '#dcb579'), coatMat, [sx * 0.048, -0.03, 0.06])
  add(head, solid(new THREE.SphereGeometry(0.032, 14, 10), '#ead0a0'), coatMat, [0, -0.07, 0.104], undefined, [1.05, 0.6, 1.15], false)
  const dark = new THREE.MeshStandardMaterial({ color: '#2a1d18', roughness: 0.5 })
  const nose = add(head, new THREE.SphereGeometry(0.024, 18, 14), new THREE.MeshPhysicalMaterial({ color: '#1a1412', roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.06 }), [0, -0.008, 0.18], undefined, [1.35, 0.88, 0.9], false)
  for (const sx of [-1, 1]) add(head, new THREE.SphereGeometry(0.0058, 8, 6), dark, [sx * 0.0115, -0.012, 0.2], undefined, undefined, false)
  add(head, new THREE.BoxGeometry(0.003, 0.028, 0.004), dark, [0, -0.036, 0.176], undefined, undefined, false)
  for (const sx of [-1, 1]) add(head, new THREE.BoxGeometry(0.004, 0.004, 0.06), dark, [sx * 0.032, -0.055, 0.14], [0, sx * 0.35, sx * 0.25], undefined, false)
  const tongue = add(head, new THREE.SphereGeometry(0.022, 14, 10), new THREE.MeshStandardMaterial({ color: '#d9706f', roughness: 0.35 }), [0, -0.066, 0.142], undefined, [1, 0.35, 1.35], false)
  // eyes: dark brown, glossy, with a highlight and a dark rim; soft lighter brows
  const eyeMat = new THREE.MeshPhysicalMaterial({ color: '#2b170b', roughness: 0.05, clearcoat: 1 })
  const shine = new THREE.MeshBasicMaterial({ color: '#ffffff' })
  for (const sx of [-1, 1]) {
    add(head, new THREE.SphereGeometry(0.0235, 18, 14), eyeMat, [sx * 0.05, 0.03, 0.087], undefined, undefined, false)
    add(head, new THREE.TorusGeometry(0.0232, 0.0045, 6, 20), dark, [sx * 0.05, 0.03, 0.088], [0, sx * 0.55, 0], undefined, false)
    add(head, new THREE.SphereGeometry(0.0042, 6, 6), shine, [sx * 0.058, 0.04, 0.106], undefined, undefined, false)
    add(head, solid(new THREE.SphereGeometry(0.022, 10, 8), '#d8ad6e'), coatMat, [sx * 0.045, 0.062, 0.082], [0, 0, sx * -0.25], [1.15, 0.4, 0.7], false)
  }
  // ears: soft pendant flaps hanging beside the cheeks
  const ears: THREE.Group[] = []
  for (const sx of [-1, 1]) {
    const ear = new THREE.Group()
    ear.position.set(sx * 0.085, 0.07, -0.005)
    head.add(ear)
    const earGeo = solid(new THREE.SphereGeometry(0.07, 18, 14), EAR)
    add(ear, earGeo, coatMat, [sx * 0.02, -0.078, 0.01], [0.12, 0, sx * 0.08], [0.28, 1.15, 0.78])
    ears.push(ear)
  }

  // legs: tapered upper + lower segments, cream feathering, real paws with toes
  const legs: Leg[] = []
  for (const [front, z] of [[true, 0.14], [false, -0.15]] as [boolean, number][]) {
    for (const side of [-1, 1]) {
      const hip = new THREE.Group()
      hip.position.set(side * 0.072, 0.31, z)
      body.add(hip)
      const upper = coat(new THREE.CylinderGeometry(front ? 0.04 : 0.045, front ? 0.05 : 0.062, 0.16, 14, 2), 0.08, -0.08, SIDE, SIDE, new THREE.Color('#dcb27a'))
      add(hip, upper, coatMat, [0, -0.07, front ? 0 : -0.01])
      const knee = new THREE.Group()
      knee.position.set(0, -0.14, 0)
      hip.add(knee)
      add(knee, solid(new THREE.CylinderGeometry(0.03, 0.036, 0.12, 12), '#ddb57d'), coatMat, [0, -0.055, 0], undefined, undefined, false)
      if (front) add(knee, solid(new THREE.SphereGeometry(0.03, 10, 8), CREAM), coatMat, [0, -0.04, -0.03], undefined, [0.8, 1.3, 0.6]) // feathering
      add(knee, solid(new THREE.SphereGeometry(0.04, 14, 10), CREAM), coatMat, [0, -0.125, 0.014], undefined, [1, 0.55, 1.25], false)
      for (const tx of [-0.022, 0, 0.022]) add(knee, solid(new THREE.SphereGeometry(0.015, 8, 6), '#e6c996'), coatMat, [tx, -0.13, 0.05], undefined, undefined, false)
      legs.push({ hip, knee, front, side })
    }
  }

  // tail: a continuous tapered chain with a cream feathered fringe underneath
  const tail: THREE.Group[] = []
  let parent: THREE.Object3D = body
  let pos: [number, number, number] = [0, 0.4, -0.23]
  for (let i = 0; i < 6; i++) {
    const r0 = 0.036 - i * 0.0045, r1 = 0.036 - (i + 1) * 0.0045
    const seg = new THREE.Group()
    seg.position.set(...pos)
    seg.rotation.x = i === 0 ? -0.9 : 0.2
    parent.add(seg)
    const g = new THREE.CylinderGeometry(r1, r0, 0.07, 12, 1)
    g.rotateX(-Math.PI / 2)
    g.translate(0, 0, -0.035)
    add(seg, coat(g, r0, -r0), coatMat, [0, 0, 0])
    add(seg, solid(new THREE.SphereGeometry(r0, 12, 10), '#cf9856'), coatMat, [0, 0, 0], undefined, undefined, false)
    if (i > 0) add(seg, solid(new THREE.SphereGeometry(0.03, 10, 8), CREAM), coatMat, [0, -r0 * 0.95 - 0.006, -0.035], undefined, [0.42, 1.0 + i * 0.12, 1.5])
    tail.push(seg)
    parent = seg
    pos = [0, 0, -0.066]
  }

  // fur shells over the soft parts
  for (const m of furry) for (const sm of shellMats) {
    const shell = new THREE.Mesh(m.geometry, sm)
    shell.position.copy(m.position); shell.rotation.copy(m.rotation); shell.scale.copy(m.scale)
    m.parent!.add(shell)
  }
  return { root, body, head, ears, legs, tail, tongue, nose }
}

// ───────────────────────── behaviour API (director)
export function puppyGo(x: number, z: number, opts: { mode?: 'goto' | 'lead'; onArrive?: () => void; waitDist?: number } = {}) {
  puppy.mode = opts.mode ?? 'goto'
  puppy.target.set(x, 0, z)
  puppy.onArrive = opts.onArrive ?? null
  puppy.waitDist = opts.waitDist ?? 6
  puppy.sitT = 0
}
export function puppyBark(text?: string) {
  const s = useStore.getState()
  s.setAmbient({ who: 'puppy', text: text ?? puppyLines[Math.floor(Math.random() * 2)] })
  playSfx('woof')
  puppy.barkAt = performance.now()
}
export function petPuppy() {
  if (puppy.mode === 'hidden' || puppy.mode === 'boat' || puppy.mode === 'bench') return
  if (player.mode !== 'free') return
  player.mode = 'pet'
  player.petT = 2.4
  player.speed = 0
  player.room.speed = 0

  const inHome = useStore.getState().place === 'home'
  if (inHome) {
    // Player stays in place and turns to face the puppy
    const toPup = Math.atan2(homeAt.x - player.room.x, homeAt.z - player.room.z)
    player.room.yaw = toPup
    player.yaw = toPup
    roomToWorld(player.room.x, 0, player.room.z, player.pos)

    // Puppy steps right in front of the player (0.52m) and sits facing the player
    const px = player.room.x + Math.sin(toPup) * 0.52
    const pz = player.room.z + Math.cos(toPup) * 0.52
    puppy.pos.set(ROOM_ORIGIN.x + px, 0, ROOM_ORIGIN.z + pz)
    homeAt.set(px, 0, pz)
    puppy.yaw = toPup + Math.PI
  } else {
    // World coordinates
    const toPup = Math.atan2(puppy.pos.x - player.pos.x, puppy.pos.z - player.pos.z)
    player.yaw = toPup
    const px = player.pos.x + Math.sin(toPup) * 0.52
    const pz = player.pos.z + Math.cos(toPup) * 0.52
    puppy.pos.set(px, walkY(px, pz), pz)
    puppy.yaw = toPup + Math.PI
  }

  puppy.sitT = 3
  puppy.happyT = 2.6
  puppy.excite = 1
  useStore.getState().setAmbient({ who: 'puppy', text: '♥  Woof!  ♥' })
  playSfx('woof')
}

const homeAt = new THREE.Vector3()
export function Puppy() {
  const p = useMemo(buildPuppy, [])
  const group = useRef<THREE.Group>(null)
  const st = useRef({ phase: 0, earV: [0, 0], earA: [0, 0], wag: 0, headYaw: 0, headPitch: 0, sit: 0, idleT: 0, bounce: 0, jump: 0, stuck: 0, lastSpeed: 0 })

  useEffect(() => registerInteractable({
    id: 'puppy', space: 'world', at: puppy.pos, radius: 1.9, label: 'Puppy', verb: 'Pet the puppy', priority: 1,
    enabled: () => ['follow', 'sit', 'lead', 'happy'].includes(puppy.mode) && player.mode === 'free', onInteract: petPuppy,
  }), [])
  useEffect(() => registerInteractable({
    id: 'puppy-home', space: 'home', at: homeAt, radius: 1.8, label: 'Puppy', verb: 'Pet the puppy', priority: 1,
    enabled: () => puppy.space === 'home' && ['follow', 'sit', 'happy'].includes(puppy.mode) && player.mode === 'free', onInteract: petPuppy,
  }), [])

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 1 / 30)
    const g = group.current
    if (!g) return
    const s = useStore.getState()
    const inHome = s.place === 'home'
    g.visible = puppy.mode !== 'hidden' && (puppy.space === 'home') === inHome
    if (puppy.mode === 'hidden') return
    const S = st.current
    const t = state.clock.elapsedTime
    const pos = puppy.pos

    // ── steering
    let desired = 0
    let wantYaw = puppy.yaw
    let sitting = false
    const toPlayer = Math.hypot(player.pos.x - pos.x, player.pos.z - pos.z)
    const yawToPlayer = Math.atan2(player.pos.x - pos.x, player.pos.z - pos.z)
    const blocked = (x: number, z: number) => inHome ? roomBlocked(x - ROOM_ORIGIN.x, z - ROOM_ORIGIN.z, 0.22) : blockedAt(x, z, 0.25)
    if (puppy.happyT > 0) {
      puppy.happyT -= dt
      if (player.mode === 'pet') {
        sitting = true
        wantYaw = Math.atan2(player.pos.x - pos.x, player.pos.z - pos.z)
      } else {
        S.jump += dt * 8
        wantYaw = puppy.yaw + dt * 3.5 // happy spin
      }
    } else if (puppy.mode === 'follow') {
      // a spot at the player's side, slightly behind
      const rx = -Math.cos(player.yaw), rz = Math.sin(player.yaw)
      const side = Math.sign((pos.x - player.pos.x) * rx + (pos.z - player.pos.z) * rz) || 1
      const tx = player.pos.x + rx * side * 0.95 - Math.sin(player.yaw) * 0.35
      const tz = player.pos.z + rz * side * 0.95 - Math.cos(player.yaw) * 0.35
      const d = Math.hypot(tx - pos.x, tz - pos.z)
      const arrive = THREE.MathUtils.smoothstep(d, 0.15, 1.4)
      desired = Math.max(player.speed * 1.05, d > 5 ? 6.5 : 2.4) * arrive
      if (d > 0.15) wantYaw = Math.atan2(tx - pos.x, tz - pos.z)
      if (desired < 0.2) {
        wantYaw = dampAngle(puppy.yaw, player.yaw, 1, dt)
        puppy.sitT += dt
        sitting = puppy.sitT > 1.4
      } else puppy.sitT = 0
      if (d > 22) { pos.set(player.pos.x - Math.sin(player.yaw) * 2, 0, player.pos.z - Math.cos(player.yaw) * 2) } // never get lost
    } else if (puppy.mode === 'goto' || puppy.mode === 'lead') {
      const d = Math.hypot(puppy.target.x - pos.x, puppy.target.z - pos.z)
      if (d > 0.25) {
        desired = Math.min(5.2, 1.5 + d * 1.5)
        wantYaw = Math.atan2(puppy.target.x - pos.x, puppy.target.z - pos.z)
      } else {
        // arrived: look back at the player, wait for him
        wantYaw = yawToPlayer
        puppy.sitT += dt
        sitting = puppy.sitT > 0.8 && toPlayer > 2.5
        if (puppy.mode === 'goto' || toPlayer < puppy.waitDist) {
          const cb = puppy.onArrive
          puppy.onArrive = null
          if (puppy.mode === 'goto') puppy.mode = 'sit'
          cb?.()
        } else if (performance.now() - puppy.barkAt > 5500 && toPlayer < 30) puppyBark()
      }
    } else if (puppy.mode === 'circle') {
      puppy.circleA += dt * 2.6
      const tx = puppy.circleC.x + Math.cos(puppy.circleA) * 1.7, tz = puppy.circleC.z + Math.sin(puppy.circleA) * 1.7
      desired = 4.2
      wantYaw = Math.atan2(tx - pos.x, tz - pos.z)
      puppy.excite = 1
    } else if (puppy.mode === 'sit') {
      sitting = true
      wantYaw = dampAngle(puppy.yaw, yawToPlayer, 2, dt)
    } else if (puppy.mode === 'boat') {
      pos.copy(boat.pos).add(new THREE.Vector3(Math.sin(boat.yaw) * 0.85, 0.0, Math.cos(boat.yaw) * 0.85))
      puppy.yaw = boat.yaw
      sitting = true
    } else if (puppy.mode === 'bench') {
      sitting = true
    }
    puppy.speed = THREE.MathUtils.damp(puppy.speed, desired, 6, dt)
    if (desired > 0.05 || puppy.happyT > 0) puppy.yaw = dampAngle(puppy.yaw, wantYaw, puppy.mode === 'circle' ? 14 : 8, dt)
    if (puppy.speed > 0.02 && puppy.mode !== 'boat') {
      const sx = Math.sin(puppy.yaw) * puppy.speed * dt, sz = Math.cos(puppy.yaw) * puppy.speed * dt
      const scripted = puppy.mode !== 'follow'
      if (scripted || !blocked(pos.x + sx, pos.z + sz)) { pos.x += sx; pos.z += sz }
      else if (!blocked(pos.x + sx, pos.z)) pos.x += sx
      else if (!blocked(pos.x, pos.z + sz)) pos.z += sz
      else { pos.x += sx; pos.z += sz } // never get stuck: squeeze through
    }
    if (puppy.mode !== 'boat' && puppy.mode !== 'bench') pos.y = inHome ? ROOM_ORIGIN.y : walkY(pos.x, pos.z)
    // excitement: high when running, petted, or the player is near after a while apart
    puppy.excite = THREE.MathUtils.damp(puppy.excite, puppy.happyT > 0 ? 1 : 0.35 + Math.min(0.6, puppy.speed / 6) + (toPlayer < 2 ? 0.15 : 0), 1.5, dt)

    // ── animation
    S.sit = THREE.MathUtils.damp(S.sit, sitting ? 1 : 0, 6, dt)
    const sp = puppy.speed
    S.phase += dt * (sp / 0.55) * Math.PI * 2 * (sp > 3.5 ? 0.85 : 1)
    const amp = Math.min(0.75, sp * 0.22)
    const run = THREE.MathUtils.smoothstep(sp, 3, 5)
    p.legs.forEach((L) => {
      // trot: FL+BR together, FR+BL together; at a run, a bounding gallop (fronts together, backs together)
      const trotOff = (L.front ? 0 : Math.PI) + (L.side > 0 ? Math.PI : 0)
      const gallopOff = L.front ? 0 : Math.PI * 0.7
      const off = THREE.MathUtils.lerp(trotOff, gallopOff, run)
      const ph = S.phase + off
      const swing = Math.sin(ph) * amp
      const lift = Math.max(0, Math.cos(ph)) * amp * 1.3
      let hip = swing, knee = (L.front ? lift : -lift)
      // sitting: rear legs fold under, front legs straight
      if (!L.front) { hip = THREE.MathUtils.lerp(hip, -0.8, S.sit); knee = THREE.MathUtils.lerp(knee, 1.65, S.sit) }
      else { hip = THREE.MathUtils.lerp(hip, 0.5, S.sit); knee = THREE.MathUtils.lerp(knee, -0.05, S.sit) }
      L.hip.rotation.x = hip
      L.knee.rotation.x = knee
    })
    // body: bounce with the gait, pitch up when sitting, hop when happy
    const bounce = Math.abs(Math.sin(S.phase)) * Math.min(0.035, sp * 0.01)
    const hop = puppy.happyT > 0 ? Math.abs(Math.sin(S.jump)) * 0.18 : 0
    p.body.position.y = bounce + hop - S.sit * 0.07
    p.body.rotation.x = -S.sit * 0.55 + (puppy.happyT > 0 ? -Math.abs(Math.sin(S.jump)) * 0.35 : 0) + run * Math.sin(S.phase) * 0.06
    p.body.position.z = -S.sit * 0.06

    // head: look at the player (up at him when close), sniff now and then while walking slowly
    puppy.sniffT -= dt
    if (puppy.sniffT < -6 && sp > 0.3 && sp < 2.6 && Math.random() < dt * 0.5) puppy.sniffT = 1.6
    const sniffing = puppy.sniffT > 0
    let hy = 0, hp = 0
    if (puppy.mode === 'boat') {
      const bState = useStore.getState().riverBottleState
      const distToBottle = Math.hypot(pos.x - riverBottlePos.x, pos.z - riverBottlePos.z)
      if (bState === 'in_river' && distToBottle < 10) {
        const yawToBottle = Math.atan2(riverBottlePos.x - pos.x, riverBottlePos.z - pos.z)
        hy = THREE.MathUtils.clamp(angleDiff(puppy.yaw, yawToBottle), -1.35, 1.35)
        hp = 0.18 // looking down eagerly into the water
      } else {
        hy = Math.sin(t * 0.7) * 0.15
        hp = -0.05
      }
    } else if (sniffing) { hp = 0.75; hy = Math.sin(t * 6) * 0.25 }
    else if (sitting || sp < 0.3 || toPlayer < 2.5) {
      hy = THREE.MathUtils.clamp(angleDiff(puppy.yaw, yawToPlayer), -1.1, 1.1)
      hp = toPlayer < 3 ? -0.22 : -0.05 // look up at him
    }
    S.headYaw = THREE.MathUtils.damp(S.headYaw, hy, 6, dt)
    S.headPitch = THREE.MathUtils.damp(S.headPitch, hp, 5, dt)
    p.head.rotation.set(S.headPitch + S.sit * 0.55 + Math.sin(S.phase * 2) * 0.03 * Math.min(1, sp), S.headYaw, Math.sin(t * 0.8) * 0.12 * (sitting ? 1 : 0.2))
    p.tongue.visible = sp > 2.2 || puppy.happyT > 0 || (sitting && Math.sin(t * 0.3) > 0.2)
    p.tongue.scale.y = 0.4 + Math.abs(Math.sin(t * 8)) * 0.15
    p.nose.scale.x = 1.2 + (sniffing ? Math.abs(Math.sin(t * 18)) * 0.12 : 0)

    // ears: damped springs driven by head motion + gait bounce
    p.ears.forEach((ear, i) => {
      const side = i === 0 ? -1 : 1
      const target = 0.08 + Math.min(0.5, sp * 0.08) * 0.6 + S.headPitch * -0.3
      const force = (target - S.earA[i]) * 90 - S.earV[i] * 7 + (bounce + hop) * 18 * Math.sin(S.phase * 2 + i)
      S.earV[i] += force * dt
      S.earA[i] += S.earV[i] * dt
      ear.rotation.set(-S.earA[i] * 0.6, 0, side * (0.12 + S.earA[i]))
    })
    // tail: wag rate and amplitude follow excitement, propagate down the chain
    S.wag += dt * (5 + puppy.excite * 11)
    const wagAmp = 0.2 + puppy.excite * 0.45
    p.tail.forEach((seg, i) => {
      seg.rotation.y = Math.sin(S.wag - i * 0.5) * wagAmp * (0.6 + i * 0.15)
      if (i === 0) seg.rotation.x = -0.25 - puppy.excite * 0.4 + S.sit * 0.55 // carried out behind, higher when excited
    })

    g.position.copy(pos)
    g.rotation.y = puppy.yaw
    g.updateMatrixWorld()
    p.head.getWorldPosition(puppy.head)
    homeAt.set(pos.x - ROOM_ORIGIN.x, 0, pos.z - ROOM_ORIGIN.z)
  })

  const onClick = (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); if (Math.hypot(player.pos.x - puppy.pos.x, player.pos.z - puppy.pos.z) < 4) petPuppy(); else puppyBark() }
  return (
    <group ref={group} scale={1.15} onClick={onClick} onPointerOver={() => { document.body.style.cursor = 'pointer' }} onPointerOut={() => { document.body.style.cursor = '' }}>
      <primitive object={p.root} />
    </group>
  )
}
