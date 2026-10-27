// The lantern trail and the summit: a gate (closed until 3 projects are found) with a soft veil,
// timber steps where the path is steep, lanterns along the way, a lone tree and a bench.
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { BENCH, gates, heightAt, SUMMIT_TREE, TRAIL, TRAIL_GATE, TRAIL_FENCE } from '../world/layout'
import { useStore } from '../store'
import { gateState } from '../story/machine'
import { flat } from './materials'
import { Kit } from './kit'
import { textTexture } from './textTex'
import { useWorldInteractable } from './Village'
import { runtime } from '../store'

/** resample the trail polyline every `step` metres */
export function trailPoints(step = 1) {
  const out: THREE.Vector3[] = []
  for (let i = 0; i < TRAIL.length - 1; i++) {
    const [ax, az] = TRAIL[i], [bx, bz] = TRAIL[i + 1]
    const len = Math.hypot(bx - ax, bz - az)
    const n = Math.max(1, Math.round(len / step))
    for (let k = 0; k < n; k++) { const t = k / n; const x = ax + (bx - ax) * t, z = az + (bz - az) * t; out.push(new THREE.Vector3(x, heightAt(x, z), z)) }
  }
  const [lx, lz] = TRAIL[TRAIL.length - 1]
  out.push(new THREE.Vector3(lx, heightAt(lx, lz), lz))
  return out
}

function Steps() {
  const { geo, lanterns } = useMemo(() => {
    const pts = trailPoints(0.9)
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1)
    const steps: THREE.Matrix4[] = []
    const lanterns: THREE.Vector3[] = []
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i]
      const rise = b.y - a.y
      const yaw = Math.atan2(b.x - a.x, b.z - a.z)
      if (Math.abs(rise) > 0.12) {
        q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw)
        steps.push(m.clone().compose(new THREE.Vector3(b.x, b.y - 0.05, b.z), q, s))
      }
      if (i % 7 === 3) {
        const side = (Math.floor(i / 7) % 2 ? 1 : -1) * 1.5
        const lx = b.x + Math.cos(yaw) * side, lz = b.z - Math.sin(yaw) * side
        lanterns.push(new THREE.Vector3(lx, heightAt(lx, lz), lz))
      }
    }
    return { geo: steps, lanterns }
  }, [])
  return (
    <>
      <instancedMesh args={[undefined, undefined, geo.length]} castShadow receiveShadow
        ref={(im) => { if (im && !im.userData.ok) { geo.forEach((mm, i) => im.setMatrixAt(i, mm)); im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere(); im.userData.ok = true } }}>
        <boxGeometry args={[1.7, 0.16, 0.34]} />
        <meshToonMaterial color="#8a6a4c" />
      </instancedMesh>
      {lanterns.map((p, i) => <Lantern key={i} p={p} />)}
    </>
  )
}

function Lantern({ p }: { p: THREE.Vector3 }) {
  const glow = useRef<THREE.MeshBasicMaterial>(null)
  useFrame(({ clock }) => {
    if (!glow.current) return
    const k = 1.4 + runtime.dusk * 1.6 + Math.sin(clock.elapsedTime * 7 + p.x) * 0.08
    glow.current.color.setRGB(1.7 * k, 1.15 * k, 0.6 * k)
  })
  return (
    <group position={p}>
      <mesh castShadow material={flat('#3a2f28')} position={[0, 0.7, 0]}><cylinderGeometry args={[0.04, 0.05, 1.4, 6]} /></mesh>
      <mesh castShadow material={flat('#3a2f28')} position={[0, 1.42, 0]}><boxGeometry args={[0.24, 0.04, 0.24]} /></mesh>
      <mesh position={[0, 1.27, 0]}><boxGeometry args={[0.17, 0.24, 0.17]} /><meshBasicMaterial ref={glow} toneMapped={false} /></mesh>
    </group>
  )
}

function TrailGate() {
  const L = useRef<THREE.Group>(null), R = useRef<THREE.Group>(null), veil = useRef<THREE.Mesh>(null)
  const open = useRef(0)
  const signTex = useMemo(() => textTexture('Summit trail  ↑', { w: 512, h: 112, size: 52, bg: '#3a2f28', color: '#f3ead8' }), [])
  const veilMat = useMemo(() => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { uT: { value: 0 }, uA: { value: 1 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `varying vec2 vUv; uniform float uT, uA;
      void main(){ float n = sin(vUv.x * 9.0 + uT) * 0.5 + sin(vUv.x * 23.0 - uT * 1.3 + vUv.y * 4.0) * 0.5;
        float a = smoothstep(0.0, 0.35, vUv.y) * smoothstep(1.0, 0.4, vUv.y) * (0.55 + n * 0.15) * uA;
        a *= smoothstep(0.0, 0.12, vUv.x) * smoothstep(1.0, 0.88, vUv.x);
        gl_FragColor = vec4(vec3(0.96, 0.93, 0.86), a * 0.75); }`,
  }), [])
  useFrame((_, dt) => {
    const want = gateState(useStore.getState().story).trailGate
    gates.trail.open = want
    open.current = THREE.MathUtils.damp(open.current, want ? 1 : 0, 2, dt)
    if (L.current) L.current.rotation.y = open.current * 1.5
    if (R.current) R.current.rotation.y = -open.current * 1.5
    veilMat.uniforms.uT.value += dt
    veilMat.uniforms.uA.value = 1 - open.current
    if (veil.current) veil.current.visible = open.current < 0.99
  })
  const y = heightAt(TRAIL_GATE.x, TRAIL_GATE.z)
  const wood = flat('#7a5f48')
  return (
    <group position={[TRAIL_GATE.x, y, TRAIL_GATE.z]}>
      {[-1, 1].map((s) => <mesh key={s} castShadow material={flat('#5e4535')} position={[s * 1.75, 1.1, 0]}><boxGeometry args={[0.22, 2.2, 0.22]} /></mesh>)}
      <mesh castShadow material={wood} position={[0, 2.3, 0]}><boxGeometry args={[4.0, 0.18, 0.22]} /></mesh>
      <mesh position={[0, 2.62, 0.02]}><planeGeometry args={[2.4, 0.52]} /><meshBasicMaterial map={signTex} toneMapped={false} /></mesh>
      <mesh position={[0, 2.62, -0.02]} rotation={[0, Math.PI, 0]}><planeGeometry args={[2.4, 0.52]} /><meshBasicMaterial map={signTex} toneMapped={false} /></mesh>
      <group ref={L} position={[-1.65, 0, 0]}>{[0.4, 0.95].map((h) => <mesh key={h} castShadow material={wood} position={[0.8, h, 0]}><boxGeometry args={[1.6, 0.1, 0.06]} /></mesh>)}</group>
      <group ref={R} position={[1.65, 0, 0]}>{[0.4, 0.95].map((h) => <mesh key={h} castShadow material={wood} position={[-0.8, h, 0]}><boxGeometry args={[1.6, 0.1, 0.06]} /></mesh>)}</group>
      <mesh ref={veil} material={veilMat} position={[0, 1.4, 0.1]}><planeGeometry args={[4.2, 2.8]} /></mesh>
    </group>
  )
}

/** the low stone wall that keeps the hill closed until the gate opens */
function HillWall() {
  const geo = useMemo(() => {
    const parts: THREE.BufferGeometry[] = []
    for (const b of TRAIL_FENCE) {
      const horizontal = b.maxX - b.minX > b.maxZ - b.minZ
      const len = horizontal ? b.maxX - b.minX : b.maxZ - b.minZ
      const n = Math.ceil(len / 0.9)
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n
        const x = horizontal ? b.minX + len * t : (b.minX + b.maxX) / 2
        const z = horizontal ? (b.minZ + b.maxZ) / 2 : b.minZ + len * t
        const g = new THREE.DodecahedronGeometry(0.45 + Math.abs(Math.sin(i * 3.1)) * 0.15, 0)
        g.scale(1.3, 0.75, 0.9)
        g.rotateY(i * 1.3)
        g.translate(x, heightAt(x, z) + 0.2, z)
        parts.push(g)
      }
    }
    return parts
  }, [])
  return <>{geo.map((g, i) => <mesh key={i} geometry={g} material={flat(i % 3 ? '#9a917f' : '#857c6c')} castShadow receiveShadow />)}</>
}

function Bench() {
  useWorldInteractable('bench', BENCH.x + Math.sin(BENCH.yaw) * 1.2, BENCH.z + Math.cos(BENCH.yaw) * 1.2, 2.4, 'Bench', 'Sit beside the puppy',
    () => gateState(useStore.getState().story).bench, () => useStore.getState().trigger('sit'))
  const y = heightAt(BENCH.x, BENCH.z)
  return (
    <group position={[BENCH.x, y, BENCH.z]} rotation={[0, BENCH.yaw, 0]}>
      <mesh castShadow receiveShadow material={flat('#8a6a4c')} position={[0, 0.46, 0]}><boxGeometry args={[2.0, 0.08, 0.5]} /></mesh>
      <mesh castShadow material={flat('#8a6a4c')} position={[0, 0.85, -0.24]} rotation={[-0.15, 0, 0]}><boxGeometry args={[2.0, 0.36, 0.06]} /></mesh>
      {[-0.85, 0.85].map((x) => <mesh key={x} castShadow material={flat('#3a2f28')} position={[x, 0.23, 0]}><boxGeometry args={[0.08, 0.46, 0.46]} /></mesh>)}
    </group>
  )
}

export function Summit() {
  const ty = heightAt(SUMMIT_TREE.x, SUMMIT_TREE.z)
  return (
    <>
      <Steps />
      <TrailGate />
      <HillWall />
      <Bench />
      <group position={[SUMMIT_TREE.x, ty - 0.2, SUMMIT_TREE.z]}><Kit piece="twisted_a" s={0.32} sway /></group>
      <group position={[SUMMIT_TREE.x + 2.5, ty, SUMMIT_TREE.z - 1]}><Kit piece="rock_c" s={0.5} /></group>
      <group position={[BENCH.x - 2.4, heightAt(BENCH.x - 2.4, BENCH.z + 0.6), BENCH.z + 0.6]}><Kit piece="flowers" s={0.7} sway /></group>
    </>
  )
}
