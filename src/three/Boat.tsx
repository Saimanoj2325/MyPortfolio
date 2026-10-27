// The crossing: two wooden jetties and a small rowing boat. W rows, A/D steer; let go and the boat
// glides on by itself toward the far jetty. Oars sweep with each stroke, the hull bobs and rolls.
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { BOAT_END_Z, BOAT_START, heightAt, JETTY_N, JETTY_S, riverZ, RIVER, WATER_Y } from '../world/layout'
import { boat, player } from '../lib/actors'
import { runtime, useStore } from '../store'
import { flat } from './materials'
import { useWorldInteractable } from './Village'
import { gateState } from '../story/machine'
import { dampAngle } from './Player'
import { RiverBottle } from './RiverBottle'

export const crossing = { progress: 0, idle: 0, onMid: null as null | (() => void), onLand: null as null | (() => void), midDone: false }

export function resetBoat() {
  boat.pos.set(BOAT_START.x, WATER_Y + 0.08, BOAT_START.z)
  boat.yaw = Math.PI
  boat.speed = 0
  boat.rowing = false
  crossing.progress = 0
  crossing.midDone = false
}
resetBoat()
export function boatAtFarBank() {
  boat.pos.set(BOAT_START.x, WATER_Y + 0.08, BOAT_END_Z)
  boat.yaw = Math.PI
  boat.speed = 0
}

function Jetty({ x, z0, z1 }: { x: number; z0: number; z1: number }) {
  const len = Math.abs(z1 - z0)
  const mid = (z0 + z1) / 2
  const dir = Math.sign(z1 - z0)
  const y = Math.max(heightAt(x, z0), WATER_Y) + 0.35
  const n = Math.floor(len / 0.32)
  return (
    <group position={[x, 0, 0]}>
      {Array.from({ length: n }, (_, i) => (
        <mesh key={i} castShadow receiveShadow material={flat(i % 3 === 0 ? '#8a6a4c' : '#9a7a58')} position={[0, y, z0 + dir * (i + 0.5) * 0.32]} rotation={[0, 0, (i % 2 - 0.5) * 0.02]}>
          <boxGeometry args={[1.5, 0.07, 0.29]} />
        </mesh>
      ))}
      {[-0.7, 0.7].map((sx) => <mesh key={sx} material={flat('#6b5442')} position={[sx, y - 0.08, mid]}><boxGeometry args={[0.1, 0.12, len]} /></mesh>)}
      {Array.from({ length: Math.ceil(len / 1.6) + 1 }, (_, i) => [-0.7, 0.7].map((sx) => (
        <mesh key={`${i}${sx}`} castShadow material={flat('#5e4535')} position={[sx, y - 0.6, z0 + dir * Math.min(len, i * 1.6)]}><cylinderGeometry args={[0.08, 0.09, 1.6, 8]} /></mesh>
      )))}
      {/* mooring post with rope */}
      <mesh castShadow material={flat('#5e4535')} position={[0.8, y + 0.3, z1 - dir * 0.2]}><cylinderGeometry args={[0.09, 0.1, 0.9, 8]} /></mesh>
      <mesh material={flat('#cdb88f')} position={[0.8, y + 0.45, z1 - dir * 0.2]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.11, 0.025, 6, 14]} /></mesh>
      {/* a lantern at the end */}
      <group position={[-0.7, y, z1 - dir * 0.2]}>
        <mesh material={flat('#2b2e33')} position={[0, 0.6, 0]}><cylinderGeometry args={[0.03, 0.04, 1.2, 6]} /></mesh>
        <mesh position={[0, 1.25, 0]}><boxGeometry args={[0.16, 0.22, 0.16]} /><meshBasicMaterial color={[2.4, 1.7, 1.0]} toneMapped={false} /></mesh>
      </group>
    </group>
  )
}

function Oar({ side, refs }: { side: number; refs: React.RefObject<THREE.Group[]> }) {
  return (
    <group position={[side * 0.62, 0.42, -0.05]} ref={(g) => { if (g && refs.current) refs.current[side < 0 ? 0 : 1] = g }}>
      <group rotation={[0, 0, side * -0.3]}>
        <mesh castShadow material={flat('#c9a978')} position={[side * 0.55, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.025, 0.025, 1.6, 6]} /></mesh>
        <mesh castShadow material={flat('#b08e60')} position={[side * 1.35, 0, 0]}><boxGeometry args={[0.42, 0.02, 0.14]} /></mesh>
      </group>
    </group>
  )
}

function Hull() {
  const geo = useMemo(() => {
    // a proper rowing-boat hull: U-section that narrows toward a pointed bow and a squared stern
    const L = 3.0, segs = 24, ring = 12
    const pos: number[] = [], idx: number[] = []
    for (let i = 0; i <= segs; i++) {
      const t = i / segs // 0 stern → 1 bow
      const z = (t - 0.45) * L
      const w = 0.78 * Math.pow(Math.sin(Math.min(1, t * 1.05 + 0.18) * Math.PI * 0.62 + 0.25), 1.2) * (t > 0.75 ? 1 - Math.pow((t - 0.75) / 0.25, 1.6) * 0.95 : 1)
      const depth = 0.45 * (1 - Math.pow(Math.abs(t - 0.45) * 1.6, 3) * 0.5)
      const sheer = 0.06 + Math.pow(t, 3) * 0.25
      for (let j = 0; j <= ring; j++) {
        const a = (j / ring) * Math.PI
        pos.push(-Math.cos(a) * w, sheer - Math.sin(a) * depth, z)
      }
    }
    for (let i = 0; i < segs; i++) for (let j = 0; j < ring; j++) {
      const a = i * (ring + 1) + j, b = a + ring + 1
      idx.push(a, b, a + 1, b, b + 1, a + 1)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.setIndex(idx)
    g.computeVertexNormals()
    return g
  }, [])
  const outer = useMemo(() => { const m = flat('#5d7f8c').clone(); m.side = THREE.FrontSide; return m }, [])
  const inner = useMemo(() => { const m = flat('#a57d55').clone(); m.side = THREE.BackSide; return m }, [])
  return (
    <group>
      <mesh geometry={geo} material={outer} castShadow />
      <mesh geometry={geo} material={inner} />
      {/* transom + seats + gunwale strip */}
      <mesh material={flat('#8f6a48')} position={[0, -0.12, -1.33]}><boxGeometry args={[1.2, 0.36, 0.06]} /></mesh>
      {[-0.95, 0.05, 0.85].map((z, i) => <mesh key={z} castShadow material={flat('#b88e62')} position={[0, 0.0, z]}><boxGeometry args={[i === 1 ? 1.45 : 1.35 - i * 0.2, 0.06, 0.3]} /></mesh>)}
      <mesh material={flat('#f0e6d2')} position={[0, 0.1, 1.38]}><boxGeometry args={[0.06, 0.06, 0.25]} /></mesh>
    </group>
  )
}

export function Boat() {
  const group = useRef<THREE.Group>(null)
  const oars = useRef<THREE.Group[]>([])
  useWorldInteractable('boat', JETTY_S.x - 1.6, JETTY_S.z - 2.2, 2.6, 'Rowing boat', 'Board the boat',
    () => gateState(useStore.getState().story).boat, () => { useStore.getState().trigger('boardBoat') })

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 1 / 30)
    const g = group.current
    if (!g) return
    const t = state.clock.elapsedTime
    if (player.mode === 'boat') {
      const s = useStore.getState()
      const k = runtime.keys
      const locked = s.paused || (!!s.dialogue && !s.dialogue.line.thought) || s.riverMessageOpen || s.riverBottleState === 'retrieved'
      let fwd = (k.has('w') || k.has('arrowup') ? 1 : 0) - (k.has('s') || k.has('arrowdown') ? 0.5 : 0) + Math.max(0, runtime.joy.y)
      let steer = (k.has('d') || k.has('arrowright') ? 1 : 0) - (k.has('a') || k.has('arrowleft') ? 1 : 0) + runtime.joy.x
      if (locked) { fwd = 0; steer = 0 }
      if (Math.abs(fwd) + Math.abs(steer) > 0.05) crossing.idle = 0
      else crossing.idle += dt
      // let go for a moment and the boat rows itself toward the far jetty
      boat.auto = crossing.idle > 2.5
      if (boat.auto && !locked) {
        fwd = 0.75
        const targetYaw = Math.atan2(BOAT_START.x - boat.pos.x, BOAT_END_Z - 1 - boat.pos.z)
        boat.yaw = dampAngle(boat.yaw, targetYaw, 1.2, dt)
      }
      boat.speed = THREE.MathUtils.damp(boat.speed, fwd * 2.6, 1.6, dt)
      boat.turn = THREE.MathUtils.damp(boat.turn, -steer * 0.8, 3, dt)
      boat.yaw += boat.turn * dt * (0.4 + Math.min(1, Math.abs(boat.speed)) * 0.6)
      boat.rowing = Math.abs(fwd) > 0.05 || Math.abs(steer) > 0.05
      if (boat.rowing) boat.oar += dt * (3.2 + Math.abs(boat.speed))
      boat.pos.x += Math.sin(boat.yaw) * boat.speed * dt
      boat.pos.z += Math.cos(boat.yaw) * boat.speed * dt
      // stay in the river, near the crossing
      boat.pos.x = THREE.MathUtils.clamp(boat.pos.x, BOAT_START.x - 14, BOAT_START.x + 14)
      const rz = riverZ(boat.pos.x)
      boat.pos.z = THREE.MathUtils.clamp(boat.pos.z, rz - RIVER.half + 2.0, rz + RIVER.half - 2.0)
      crossing.progress = THREE.MathUtils.clamp((BOAT_START.z - boat.pos.z) / (BOAT_START.z - BOAT_END_Z), 0, 1)
      if (crossing.progress > 0.45 && !crossing.midDone) { crossing.midDone = true; crossing.onMid?.() }
      if (boat.pos.z <= BOAT_END_Z + 0.4 && Math.abs(boat.pos.x - BOAT_START.x) < 6) { const cb = crossing.onLand; crossing.onLand = null; cb?.() }
    } else boat.rowing = false
    boat.pos.y = WATER_Y + 0.12 + Math.sin(t * 1.4) * 0.04
    g.position.copy(boat.pos)
    g.rotation.set(Math.sin(t * 1.1) * 0.025 - boat.speed * 0.01, boat.yaw, Math.sin(t * 0.9 + 1) * 0.035 + boat.turn * 0.04)
    // oars: sweep back in the water, lift and return
    oars.current.forEach((o, i) => {
      if (!o) return
      const side = i === 0 ? -1 : 1
      const ph = boat.oar
      o.rotation.y = side * (Math.sin(ph) * 0.55) * (boat.rowing ? 1 : 0.15)
      o.rotation.z = side * (boat.rowing ? Math.max(0, Math.cos(ph)) * 0.25 : 0.12)
    })
  })

  return (
    <>
      <Jetty x={JETTY_S.x - 1.6} z0={JETTY_S.z + 1.2} z1={JETTY_S.z - 3.6} />
      <Jetty x={JETTY_N.x - 1.6} z0={JETTY_N.z - 1.2} z1={JETTY_N.z + 3.6} />
      <group ref={group}>
        <Hull />
        <Oar side={-1} refs={oars} />
        <Oar side={1} refs={oars} />
      </group>
      <RiverBottle />
    </>
  )
}
