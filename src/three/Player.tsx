// The man who forgot: flat-terrain controller outdoors, room controller inside the house, blended
// Idle/Walk/Jog from engineer.glb, plus procedural life (head tracking, idle look-around, confused
// glances, rowing arms) layered on top of the clips.
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useAnimations } from '@react-three/drei'
import { blockedAt, walkY } from '../world/layout'
import { camState, player, boat, puppy, parrot } from '../lib/actors'
import { CHAIR, roomBlocked, roomToWorld } from '../lib/room'
import { runtime, useStore } from '../store'
import { buildEngineer, crossPlay, OUTFITS, useEngineerGLTF } from './engineerLook'

const WALK = 3.0
const JOG = 6.0
const BODY_R = 0.35

const v1 = new THREE.Vector3(), q1 = new THREE.Quaternion(), q2 = new THREE.Quaternion(), q3 = new THREE.Quaternion()
const UP = new THREE.Vector3(0, 1, 0)

/** seat sequence state for the house desk (read by the camera) */
export const seat = { t: -1, phase: 'none' as 'none' | 'walking' | 'turning' | 'sitting' | 'seated' | 'standing' }

export function dampAngle(a: number, b: number, l: number, dt: number) {
  let d = b - a
  while (d > Math.PI) d -= Math.PI * 2
  while (d < -Math.PI) d += Math.PI * 2
  return a + d * (1 - Math.exp(-l * dt))
}
export function angleDiff(a: number, b: number) {
  let d = b - a
  while (d > Math.PI) d -= Math.PI * 2
  while (d < -Math.PI) d += Math.PI * 2
  return d
}

/** rotate a bone about a WORLD axis by `angle`, after the animation mixer has posed it */
export function rotateBoneWorld(bone: THREE.Object3D, axis: THREE.Vector3, angle: number) {
  if (!bone.parent || Math.abs(angle) < 1e-4) return
  bone.parent.getWorldQuaternion(q1)
  q2.setFromAxisAngle(axis, angle)
  q3.copy(q1).invert().multiply(q2).multiply(q1)
  bone.quaternion.premultiply(q3)
}

export function Player() {
  const group = useRef<THREE.Group>(null)
  const gltf = useEngineerGLTF()
  const model = useMemo(() => buildEngineer(gltf.scene, OUTFITS.hero, 1.72), [gltf.scene])
  const { actions, mixer } = useAnimations(gltf.animations, model)
  const current = useRef<{ name: string | null }>({ name: null })
  const bones = useMemo(() => {
    const find = (n: string) => {
      let b: THREE.Object3D | null = null
      const target = n.toLowerCase()
      model.traverse((o) => { if (!b && o.name.toLowerCase() === target) b = o })
      return b as THREE.Object3D | null
    }
    return { head: find('Head'), neck: find('neck_01'), spine: find('spine_03'), armL: find('upperarm_l'), armR: find('upperarm_r'), forearmR: find('lowerarm_r') }
  }, [model])

  useEffect(() => {
    console.log('ENGINEER_CLIPS:', gltf.animations.map(a => a.name), 'ACTIONS:', Object.keys(actions))
    if (actions['Idle']) {
      actions['Idle'].reset().setEffectiveWeight(1).play()
      current.current.name = 'Idle'
    } else {
      crossPlay(actions, current.current, 'Idle', 0)
    }
    player.ready = true
  }, [actions])

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 1 / 30)
    const g = group.current
    if (!g) return
    const s = useStore.getState()
    const t = state.clock.elapsedTime
    const inputLocked = s.phase !== 'play' || s.paused || s.cutscene || !!s.museum || s.letterOpen || !!s.project || s.finale > 0 || !!s.dialogue && !s.dialogue.line.thought

    let anim = 'Idle'
    if (player.mode === 'pet') {
      player.petT -= dt
      player.speed = 0
      if (s.place === 'home') {
        player.room.speed = 0
        player.room.yaw = player.yaw
        roomToWorld(player.room.x, 0, player.room.z, player.pos)
      }
      anim = 'Fix'
      if (player.petT <= 0) player.mode = 'free'
    } else if (s.place === 'home') {
      stepRoom(dt, inputLocked)
      const r = player.room
      roomToWorld(r.x, 0, r.z, player.pos)
      player.yaw = r.yaw
      player.speed = r.speed
      if (seat.phase === 'walking') anim = 'Walk'
      else if (seat.phase === 'sitting' || seat.phase === 'seated') anim = 'Sit'
      else if (r.speed > 2.6) anim = 'Run'
      else if (r.speed > 0.25) anim = 'Walk'
    } else if (player.mode === 'boat') {
      player.pos.copy(boat.pos).add(v1.set(-Math.sin(boat.yaw) * 0.1, -0.42, -Math.cos(boat.yaw) * 0.1))
      player.yaw = boat.yaw + Math.PI // rows facing backwards, like a real rower
      player.speed = 0
      anim = 'Sit'
    } else if (player.mode === 'bench') {
      anim = 'Sit'
      player.speed = 0
    } else {
      stepWorld(dt, inputLocked || player.mode === 'locked')
      if (player.speed > WALK * 1.25) anim = 'Run'
      else if (player.speed > 0.3) anim = 'Walk'
    }
    crossPlay(actions, current.current, anim, anim === 'Fix' ? 0.3 : (anim === 'Sit' ? 0.5 : 0.25))
    const w = actions['Walk']; if (w) w.timeScale = THREE.MathUtils.clamp(player.speed / 2.4, 0.6, 1.35)
    const rAct = actions['Run']; if (rAct) rAct.timeScale = THREE.MathUtils.clamp(player.speed / JOG, 0.75, 1.2)

  g.position.copy(player.pos)
    g.rotation.set(0, player.yaw, 0)
    g.updateMatrixWorld(true)

    // Update head position for camera look and speech bubble targeting
    player.head.copy(player.pos).add(v1.set(0, 1.62, 0))

    // Rowing in boat: swing arms with the oar stroke
    if (player.mode === 'boat' && boat.rowing && bones.armL && bones.armR) {
      const right = v1.set(-Math.cos(player.yaw), 0, Math.sin(player.yaw))
      const a = Math.sin(boat.oar) * 0.55 - 0.7
      rotateBoneWorld(bones.armL, right, a)
      rotateBoneWorld(bones.armR, right, a)
    }
  })

  return (
    <group ref={group} dispose={null}>
      <primitive object={model} />
    </group>
  )
}

/** with no explicit target, glance at whatever is interesting and close */
const lookTmp = new THREE.Vector3()
function autoLookTarget(place: string) {
  if (place !== 'world') return null
  const p = player.pos
  if (parrot.mode !== 'hidden' && parrot.head.distanceTo(p) < 9) return lookTmp.copy(parrot.head)
  if (puppy.mode !== 'hidden' && puppy.pos.distanceTo(p) < 2.6 && player.speed < 0.5) return lookTmp.copy(puppy.head)
  return null
}

// ───────────────────────── outdoor controller
function stepWorld(dt: number, locked: boolean) {
  const k = runtime.keys
  let ix = (k.has('d') || k.has('arrowright') ? 1 : 0) - (k.has('a') || k.has('arrowleft') ? 1 : 0)
  let iz = (k.has('w') || k.has('arrowup') ? 1 : 0) - (k.has('s') || k.has('arrowdown') ? 1 : 0)
  ix += runtime.joy.x
  iz += runtime.joy.y
  let mag = Math.min(1, Math.hypot(ix, iz))
  let moveYaw = player.yaw
  let targetSpeed = 0
  if (player.auto) {
    const a = player.auto
    const dx = a.x - player.pos.x, dz = a.z - player.pos.z
    const d = Math.hypot(dx, dz)
    if (d < 0.12) {
      player.auto = null
      if (a.faceYaw !== undefined) player.yaw = a.faceYaw
      a.done?.()
    } else { moveYaw = Math.atan2(dx, dz); targetSpeed = Math.min(a.speed, d * 3) }
  } else if (!locked && mag > 0.05) {
    const h = camState.heading
    const fx = Math.sin(h), fz = Math.cos(h)
    const rx = -Math.cos(h), rz = Math.sin(h)
    const mx = fx * iz + rx * ix, mz = fz * iz + rz * ix
    moveYaw = Math.atan2(mx, mz)
    const running = runtime.runHeld || Math.hypot(runtime.joy.x, runtime.joy.y) > 0.92
    mag = Math.max(mag, 0.35)
    targetSpeed = (running ? JOG : WALK) * mag
  }
  player.speed = THREE.MathUtils.damp(player.speed, targetSpeed, 9, dt)
  if (targetSpeed > 0.01) player.yaw = dampAngle(player.yaw, moveYaw, 11, dt)
  if (player.speed > 0.01) {
    const step = player.speed * dt
    const sx = Math.sin(player.yaw) * step, sz = Math.cos(player.yaw) * step
    const p = player.pos
    const ignore = !!player.auto
    if (ignore || !blockedAt(p.x + sx, p.z + sz, BODY_R)) { p.x += sx; p.z += sz }
    else if (!blockedAt(p.x + sx, p.z, BODY_R)) p.x += sx
    else if (!blockedAt(p.x, p.z + sz, BODY_R)) p.z += sz
    else player.speed *= 0.5
  }
  player.pos.y = THREE.MathUtils.damp(player.pos.y, walkY(player.pos.x, player.pos.z), 20, dt)
}

// ───────────────────────── room controller (inside the house)
function stepRoom(dt: number, locked: boolean) {
  const r = player.room
  const s = useStore.getState()
  if (seat.phase !== 'none') {
    seat.t += dt
    if (seat.phase === 'walking') {
      const dx = CHAIR.x - r.x, dz = CHAIR.z + 0.05 - r.z
      const d = Math.hypot(dx, dz)
      if (d < 0.06) { seat.phase = 'turning'; seat.t = 0 }
      else {
        r.yaw = dampAngle(r.yaw, Math.atan2(dx, dz), 10, dt)
        const sp = Math.min(1.6, d * 4)
        r.x += (dx / d) * sp * dt; r.z += (dz / d) * sp * dt
        r.speed = sp
      }
    } else if (seat.phase === 'turning') {
      r.yaw = dampAngle(r.yaw, Math.PI, 8, dt)
      r.speed = 0
      if (seat.t > 0.5) { seat.phase = 'sitting'; seat.t = 0; r.x = CHAIR.x; r.z = CHAIR.z }
    } else if (seat.phase === 'sitting') {
      if (seat.t > 0.9) { seat.phase = 'seated'; s.setSeated(true) }
    } else if (seat.phase === 'standing') {
      r.z = THREE.MathUtils.damp(r.z, CHAIR.z + 0.6, 6, dt)
      if (seat.t > 0.7) seat.phase = 'none'
    }
    return
  }
  const k = runtime.keys
  let ix = (k.has('d') || k.has('arrowright') ? 1 : 0) - (k.has('a') || k.has('arrowleft') ? 1 : 0)
  let iz = (k.has('w') || k.has('arrowup') ? 1 : 0) - (k.has('s') || k.has('arrowdown') ? 1 : 0)
  ix += runtime.joy.x
  iz += runtime.joy.y
  if (locked) { ix = 0; iz = 0 }
  const mx = ix, mz = -iz // the room camera looks toward -z
  const mag = Math.min(1, Math.hypot(mx, mz))
  const target = mag > 0.05 ? (runtime.runHeld ? 3.4 : 2.0) * Math.max(mag, 0.4) : 0
  r.speed = THREE.MathUtils.damp(r.speed, target, 10, dt)
  if (mag > 0.05) r.yaw = dampAngle(r.yaw, Math.atan2(mx, mz), 12, dt)
  if (r.speed > 0.01) {
    const nx = r.x + Math.sin(r.yaw) * r.speed * dt
    const nz = r.z + Math.cos(r.yaw) * r.speed * dt
    if (!roomBlocked(nx, nz)) { r.x = nx; r.z = nz }
    else if (!roomBlocked(nx, r.z)) r.x = nx
    else if (!roomBlocked(r.x, nz)) r.z = nz
  }
}

export function sitDown() {
  if (seat.phase !== 'none') return
  seat.phase = 'walking'
  seat.t = 0
}
export function standUp() {
  useStore.getState().setSeated(false)
  seat.phase = 'standing'
  seat.t = 0
}
