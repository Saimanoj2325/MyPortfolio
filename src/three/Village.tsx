// The village: the house (exterior), neighbours' cottages, the meadow hedge + gate, lamp posts,
// garden fences, the letterbox, and the big meadow tree the parrot first lands on.
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import {
  boxes, COTTAGES, gates, heightAt, HOUSE, LAMPS, LETTERBOX, MEADOW_FENCE_Z, MEADOW_GATE, MEADOW_TREE, PERCHES,
} from '../world/layout'
import { flat, toonRamp } from './materials'
import { Kit, LampPost } from './kit'
import { registerInteractable } from '../lib/interact'
import { useStore } from '../store'
import { gateState } from '../story/machine'

const Y = (x: number, z: number) => heightAt(x, z)
export const houseDoor = { open: 0 }
export const letterboxState = { open: 0, hasLetter: false, flag: 0 }

function useWorldInteractable(id: string, x: number, z: number, radius: number, label: string, verb: string, enabled: () => boolean, fn: () => void, priority = 0) {
  const f = useRef(fn); f.current = fn
  const e = useRef(enabled); e.current = enabled
  useEffect(() => registerInteractable({ id, space: 'world', at: new THREE.Vector3(x, 0, z), radius, label, verb, enabled: () => e.current(), onInteract: () => f.current(), priority }), [id, x, z, radius, label, verb, priority])
}
export { useWorldInteractable }

// ───────────────────────── a gabled building (house + cottages)
function gableGeo(w: number, d: number, rise: number) {
  // triangular prism cap across the width (ridge along x)
  const shape = new THREE.Shape()
  shape.moveTo(-d / 2, 0); shape.lineTo(d / 2, 0); shape.lineTo(0, rise); shape.closePath()
  const g = new THREE.ExtrudeGeometry(shape, { depth: w, bevelEnabled: false })
  g.translate(0, 0, -w / 2)
  g.rotateY(Math.PI / 2)
  return g
}

export function Building({ w, d, h, roof, wall, trim = '#6b5442', door = true, chimney = true, windowsLit = 1, doorRef }: {
  w: number; d: number; h: number; roof: string; wall: string; trim?: string; door?: boolean; chimney?: boolean; windowsLit?: number; doorRef?: React.RefObject<THREE.Group | null>
}) {
  const rise = d * 0.42
  const over = 0.38
  const slope = Math.hypot(d / 2 + over, rise + over * (rise / (d / 2)))
  const ang = Math.atan2(rise, d / 2)
  const glow = new THREE.Color('#ffc987').multiplyScalar(0.85 + windowsLit * 0.35) // warm amber interior, never clipped
  return (
    <group>
      <mesh castShadow receiveShadow material={flat('#8c8273')} position={[0, 0.12, 0]}><boxGeometry args={[w + 0.3, 0.4, d + 0.3]} /></mesh>
      <mesh castShadow receiveShadow material={flat(wall)} position={[0, h / 2 + 0.3, 0]}><boxGeometry args={[w, h, d]} /></mesh>
      <mesh castShadow receiveShadow material={flat(wall)} position={[0, h + 0.3, 0]} geometry={useMemo(() => gableGeo(w - 0.02, d, rise), [w, d, rise])} />
      {/* roof slabs */}
      {[-1, 1].map((s) => (
        <mesh key={s} castShadow receiveShadow material={flat(roof)} position={[0, h + 0.3 + rise / 2 + 0.05, s * (d / 4 + 0.02)]} rotation={[s * ang, 0, 0]}>
          <boxGeometry args={[w + over * 2, 0.14, slope]} />
        </mesh>
      ))}
      <mesh castShadow material={flat(trim)} position={[0, h + 0.3 + rise + 0.06, 0]}><boxGeometry args={[w + over * 2 + 0.04, 0.12, 0.2]} /></mesh>
      {chimney && <mesh castShadow material={flat('#8a7a6a')} position={[w * 0.28, h + rise * 0.8, -d * 0.18]}><boxGeometry args={[0.55, 1.6, 0.55]} /></mesh>}
      {/* corner trims */}
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz], i) => (
        <mesh key={i} castShadow material={flat(trim)} position={[sx * w / 2, h / 2 + 0.3, sz * d / 2]}><boxGeometry args={[0.16, h, 0.16]} /></mesh>
      ))}
      {/* front (+x) door and windows; windows on the long sides too */}
      {door && (
        <group position={[w / 2 + 0.01, 0.3, 0]}>
          <mesh material={flat('#3b2f27')} position={[0.0, 1.1, 0]}><boxGeometry args={[0.06, 2.25, 1.25]} /></mesh>
          <mesh position={[0.02, 1.1, 0]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[1.1, 2.1]} /><meshBasicMaterial color={glow} toneMapped={false} /></mesh>
          <group ref={doorRef} position={[0.05, 0, -0.55]}>
            <mesh castShadow material={flat('#6e4b35')} position={[0, 1.05, 0.55]}><boxGeometry args={[0.07, 2.1, 1.1]} /></mesh>
            <mesh material={flat('#c9a46a')} position={[0.06, 1.05, 0.95]}><sphereGeometry args={[0.05, 10, 8]} /></mesh>
          </group>
          <mesh material={flat(trim)} position={[0.25, 0.05, 0]}><boxGeometry args={[0.6, 0.12, 1.6]} /></mesh>
        </group>
      )}
      {[[w / 2 + 0.02, -d * 0.3, Math.PI / 2], [w / 2 + 0.02, d * 0.3, Math.PI / 2], [-w * 0.22, d / 2 + 0.02, 0], [w * 0.22, d / 2 + 0.02, 0], [-w * 0.22, -d / 2 - 0.02, Math.PI], [w * 0.22, -d / 2 - 0.02, Math.PI]].map(([x, z, r], i) => (
        <group key={i} position={[x, h * 0.58 + 0.3, z]} rotation={[0, r, 0]}>
          <mesh material={flat(trim)}><boxGeometry args={[0.95, 1.0, 0.08]} /></mesh>
          <mesh position={[0, 0, 0.05]}><planeGeometry args={[0.78, 0.82]} /><meshBasicMaterial color={glow} toneMapped={false} /></mesh>
          <mesh material={flat(trim)} position={[0, 0, 0.07]}><boxGeometry args={[0.05, 0.84, 0.02]} /></mesh>
          <mesh material={flat(trim)} position={[0, 0, 0.07]}><boxGeometry args={[0.8, 0.05, 0.02]} /></mesh>
          <mesh material={flat(trim)} position={[0, -0.52, 0.1]}><boxGeometry args={[1.05, 0.07, 0.2]} /></mesh>
          {/* flower box */}
          <mesh material={flat('#7a5a3e')} position={[0, -0.62, 0.18]}><boxGeometry args={[0.9, 0.16, 0.22]} /></mesh>
          {[-0.3, -0.1, 0.1, 0.3].map((fx, k) => <mesh key={k} material={flat(['#e88a6a', '#f2c94c', '#f5efe2', '#c9a3d8'][k])} position={[fx, -0.5, 0.2]}><sphereGeometry args={[0.07, 8, 6]} /></mesh>)}
        </group>
      ))}
    </group>
  )
}

function House() {
  const door = useRef<THREE.Group>(null)
  useFrame(() => { if (door.current) door.current.rotation.y = houseDoor.open * 1.5 })
  const by = Y(HOUSE.x, HOUSE.z)
  return (
    <group position={[HOUSE.x, by, HOUSE.z]}>
      <Building w={HOUSE.w} d={HOUSE.d} h={HOUSE.wallH - 0.3} roof="#9b5a3c" wall="#f2e7d2" trim="#5e4535" doorRef={door} windowsLit={1.1} />
      {/* porch + steps + lantern */}
      <mesh receiveShadow castShadow material={flat('#8c705a')} position={[HOUSE.w / 2 + 0.75, 0.22, 0]}><boxGeometry args={[1.5, 0.12, 2.6]} /></mesh>
      {[-1.15, 1.15].map((z) => <mesh key={z} castShadow material={flat('#5e4535')} position={[HOUSE.w / 2 + 1.35, 1.35, z]}><cylinderGeometry args={[0.07, 0.07, 2.3, 8]} /></mesh>)}
      <mesh castShadow material={flat('#9b5a3c')} position={[HOUSE.w / 2 + 0.8, 2.55, 0]} rotation={[0, 0, -0.25]}><boxGeometry args={[1.7, 0.1, 2.9]} /></mesh>
      <pointLight position={[HOUSE.w / 2 + 1, 2.1, 0]} color="#ffc98a" intensity={3} distance={7} decay={2} />
      {/* garden: potted plants by the door */}
      <group position={[HOUSE.w / 2 + 1.2, 0.28, 1.0]}><Kit piece="pot" s={1.1} /><Kit piece="plant" s={0.6} y={0.15} sway /></group>
      <group position={[HOUSE.w / 2 + 1.2, 0.28, -1.0]}><Kit piece="pot" s={1.1} /><Kit piece="bush_flowers" s={0.45} y={0.15} sway /></group>
      {/* a climbing vine on the south wall */}
      {[-2.2, -1.4, 1.6, 2.4].map((x, i) => <group key={i} position={[x, 0.2, HOUSE.d / 2 + 0.3]}><Kit piece="bush" s={0.55 + (i % 2) * 0.15} sway /></group>)}
    </group>
  )
}

function Cottages() {
  return (
    <>
      {COTTAGES.map((c, i) => (
        <group key={i} position={[c.x, Y(c.x, c.z), c.z]} rotation={[0, c.yaw + Math.PI / 2, 0]} scale={c.s}>
          <Building w={5.2} d={4.6} h={2.7} roof={c.roof} wall={c.wall} windowsLit={0.6} />
          <group position={[3.3, 0.1, 1.6]}><Kit piece="barrel" s={0.9} /></group>
          <group position={[3.2, 0.1, -1.7]}><Kit piece="bush_flowers" s={0.6} sway /></group>
        </group>
      ))}
    </>
  )
}

// ───────────────────────── fences: merged posts + rails along a line
function fenceGeometry(points: [number, number][], spacing = 2.2, h = 1.05, picket = false) {
  const parts: THREE.BufferGeometry[] = []
  for (let i = 0; i < points.length - 1; i++) {
    const [ax, az] = points[i], [bx, bz] = points[i + 1]
    const len = Math.hypot(bx - ax, bz - az)
    const n = Math.max(1, Math.round(len / spacing))
    const yaw = Math.atan2(bx - ax, bz - az)
    for (let k = 0; k <= n; k++) {
      const x = ax + ((bx - ax) * k) / n, z = az + ((bz - az) * k) / n
      const post = new THREE.BoxGeometry(0.13, h + 0.15, 0.13)
      post.translate(x, Y(x, z) + (h + 0.15) / 2 - 0.05, z)
      parts.push(post)
      if (picket && k < n) {
        for (let p = 1; p < 6; p++) {
          const t = (k + p / 6) / n
          const px = ax + (bx - ax) * t, pz = az + (bz - az) * t
          const pk = new THREE.BoxGeometry(0.08, h * 0.85, 0.04)
          pk.rotateY(yaw + Math.PI / 2)
          pk.translate(px, Y(px, pz) + h * 0.42, pz)
          parts.push(pk)
        }
      }
      if (k < n) {
        const x2 = ax + ((bx - ax) * (k + 1)) / n, z2 = az + ((bz - az) * (k + 1)) / n
        const seg = Math.hypot(x2 - x, z2 - z)
        for (const ry of picket ? [0.3, 0.75] : [0.45, 0.85]) {
          const rail = new THREE.BoxGeometry(0.06, 0.09, seg)
          rail.rotateY(yaw)
          const y0 = Y(x, z), y1 = Y(x2, z2)
          rail.translate((x + x2) / 2, (y0 + y1) / 2 + ry * h, (z + z2) / 2)
          parts.push(rail)
        }
      }
    }
  }
  return mergeGeometries(parts.map((p) => p.toNonIndexed()), false)!
}

function Fences() {
  const geos = useMemo(() => {
    const g = MEADOW_GATE
    return {
      hedgeL: fenceGeometry([[-44, MEADOW_FENCE_Z], [g.x - g.w / 2 - 0.3, MEADOW_FENCE_Z]]),
      hedgeR: fenceGeometry([[g.x + g.w / 2 + 0.3, MEADOW_FENCE_Z], [44, MEADOW_FENCE_Z]]),
      garden: fenceGeometry([[-12.5, 15.4], [-3.2, 15.4]], 1.6, 0.95, true),
      gardenBack: fenceGeometry([[-12.5, 15.4], [-12.5, 24.8], [-5.2, 24.8]], 1.6, 0.95, true),
    }
  }, [])
  useEffect(() => {
    boxes.push({ minX: -12.7, minZ: 15.2, maxX: -3.0, maxZ: 15.6 }, { minX: -12.7, minZ: 15.2, maxX: -12.3, maxZ: 25 }, { minX: -12.7, minZ: 24.6, maxX: -5.0, maxZ: 25 })
  }, [])
  const wood = flat('#7a5f48'), white = flat('#efe6d6')
  return (
    <>
      <mesh geometry={geos.hedgeL} material={wood} castShadow receiveShadow />
      <mesh geometry={geos.hedgeR} material={wood} castShadow receiveShadow />
      <mesh geometry={geos.garden} material={white} castShadow receiveShadow />
      <mesh geometry={geos.gardenBack} material={white} castShadow receiveShadow />
      <HedgeBushes />
      <MeadowGate />
    </>
  )
}

function HedgeBushes() {
  const items = useMemo(() => {
    const out: [number, number, number][] = []
    for (let x = -43; x < 43; x += 2.6) if (Math.abs(x) > 4) out.push([x + Math.sin(x) * 0.4, MEADOW_FENCE_Z - 1.1, 0.75 + Math.abs(Math.sin(x * 1.7)) * 0.35])
    return out
  }, [])
  return <>{items.map(([x, z, s], i) => <group key={i} position={[x, Y(x, z) - 0.05, z]}><Kit piece={i % 3 === 0 ? 'bush_flowers' : 'bush'} s={s} sway /></group>)}</>
}

function MeadowGate() {
  const L = useRef<THREE.Group>(null), R = useRef<THREE.Group>(null)
  const open = useRef(0)
  useFrame((_, dt) => {
    const want = gateState(useStore.getState().story).meadowGate ? 1 : 0
    gates.meadow.open = want === 1
    open.current = THREE.MathUtils.damp(open.current, want, 2.2, dt)
    if (L.current) L.current.rotation.y = -open.current * 1.6
    if (R.current) R.current.rotation.y = open.current * 1.6
  })
  const g = MEADOW_GATE, y = Y(g.x, g.z)
  const wood = flat('#8a6a4c')
  const leaf = (dir: number) => (
    <>
      {[0.35, 0.8].map((ry) => <mesh key={ry} castShadow material={wood} position={[dir * g.w / 4, ry, 0]}><boxGeometry args={[g.w / 2 - 0.1, 0.1, 0.06]} /></mesh>)}
      <mesh castShadow material={wood} position={[dir * g.w / 4, 0.58, 0]} rotation={[0, 0, dir * 0.45]}><boxGeometry args={[g.w / 2, 0.08, 0.05]} /></mesh>
      <mesh castShadow material={wood} position={[dir * (g.w / 2 - 0.12), 0.58, 0]}><boxGeometry args={[0.08, 0.95, 0.06]} /></mesh>
    </>
  )
  return (
    <group position={[g.x, y, g.z]}>
      {[-1, 1].map((s) => <mesh key={s} castShadow material={flat('#5e4535')} position={[s * (g.w / 2 + 0.15), 0.75, 0]}><boxGeometry args={[0.22, 1.6, 0.22]} /></mesh>)}
      <group ref={L} position={[-g.w / 2, 0, 0]}>{leaf(1)}</group>
      <group ref={R} position={[g.w / 2, 0, 0]}>{leaf(-1)}</group>
    </group>
  )
}

function Lamps() {
  return <>{LAMPS.map(([x, z], i) => <group key={i} position={[x, Y(x, z), z]}><LampPost h={3.2} /></group>)}</>
}

function Letterbox() {
  useWorldInteractable('letterbox', LETTERBOX.x + 0.6, LETTERBOX.z - 0.9, 2.1, 'Letterbox', 'Open the letterbox',
    () => gateState(useStore.getState().story).letterbox, () => { useStore.getState().trigger('openLetterbox') })
  const lid = useRef<THREE.Group>(null), flag = useRef<THREE.Group>(null), letter = useRef<THREE.Mesh>(null)
  useFrame((_, dt) => {
    letterboxState.flag = THREE.MathUtils.damp(letterboxState.flag, letterboxState.hasLetter ? 1 : 0, 4, dt)
    if (lid.current) lid.current.rotation.x = letterboxState.open * 1.4
    if (flag.current) flag.current.rotation.z = -letterboxState.flag * 1.5
    if (letter.current) letter.current.visible = letterboxState.hasLetter
  })
  const y = Y(LETTERBOX.x, LETTERBOX.z)
  return (
    <group position={[LETTERBOX.x, y, LETTERBOX.z]} rotation={[0, Math.PI, 0]}>
      <mesh castShadow material={flat('#5e4535')} position={[0, 0.6, 0]}><boxGeometry args={[0.12, 1.2, 0.12]} /></mesh>
      <group position={[0, 1.25, 0]}>
        <mesh castShadow material={flat('#2f5d50')} position={[0, 0, 0]}><boxGeometry args={[0.38, 0.32, 0.56]} /></mesh>
        <mesh castShadow material={flat('#2f5d50')} position={[0, 0.16, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.19, 0.19, 0.56, 16, 1, false, 0, Math.PI]} /></mesh>
        <mesh ref={letter} material={flat('#f3ead8')} position={[0, 0.02, 0.12]} rotation={[0.15, 0, 0]}><boxGeometry args={[0.26, 0.02, 0.36]} /></mesh>
        <group ref={lid} position={[0, -0.16, 0.285]}>
          <mesh castShadow material={flat('#234a40')} position={[0, 0.2, 0]}><boxGeometry args={[0.4, 0.42, 0.03]} /></mesh>
        </group>
        <group ref={flag} position={[0.21, 0.05, -0.1]}>
          <mesh castShadow material={flat('#c8402f')} position={[0.01, 0.2, 0]}><boxGeometry args={[0.03, 0.4, 0.05]} /></mesh>
          <mesh castShadow material={flat('#c8402f')} position={[0.01, 0.36, 0.08]}><boxGeometry args={[0.03, 0.12, 0.16]} /></mesh>
        </group>
      </group>
    </group>
  )
}

/** the big lone tree in the meadow + a branch reaching out for the parrot */
function MeadowTree() {
  const p = PERCHES[0]
  const y = Y(MEADOW_TREE.x, MEADOW_TREE.z)
  const branch = useMemo(() => {
    const a = new THREE.Vector3(MEADOW_TREE.x, y + 2.3, MEADOW_TREE.z)
    const b = new THREE.Vector3(p.x - 0.25, p.y - 0.07, p.z)
    const curve = new THREE.QuadraticBezierCurve3(a, a.clone().lerp(b, 0.5).add(new THREE.Vector3(0, 0.35, 0)), b)
    return new THREE.TubeGeometry(curve, 14, 0.06, 6, false)
  }, [p, y])
  return (
    <>
      <group position={[MEADOW_TREE.x, y - 0.1, MEADOW_TREE.z]}><Kit piece="tree_b" s={0.62} sway /></group>
      <mesh geometry={branch} material={flat('#5b4636')} castShadow />
    </>
  )
}

/** stepping stones from the lane to the house door */
function Paths() {
  const stones = useMemo(() => {
    const out: [number, number, number][] = []
    for (let i = 0; i < 6; i++) { const t = i / 5; out.push([THREE.MathUtils.lerp(-4.6, -0.8, t), THREE.MathUtils.lerp(20, 19.6, t) + Math.sin(i * 2) * 0.2, i * 1.3]) }
    return out
  }, [])
  return <>{stones.map(([x, z, r], i) => <group key={i} position={[x, Y(x, z) + 0.02, z]} rotation={[0, r, 0]}><Kit piece="path_small" s={0.8} /></group>)}</>
}

/** rustic wooden trailhead signpost with lantern ("A NEW JOURNEY") matching the title artwork */
function makeSignTex() {
  if (typeof document === 'undefined') return null
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 256
  const ctx = c.getContext('2d')
  if (!ctx) return null
  ctx.fillStyle = '#684d33'
  ctx.fillRect(0, 0, 512, 256)
  // wood grain
  ctx.fillStyle = 'rgba(40, 24, 12, 0.16)'
  for (let y = 0; y < 256; y += 6) {
    ctx.fillRect(0, y + Math.sin(y * 0.08) * 3, 512, 2 + (y % 4))
  }
  ctx.strokeStyle = '#382212'
  ctx.lineWidth = 8
  ctx.strokeRect(10, 10, 492, 236)
  ctx.font = 'bold 52px "Times New Roman", Georgia, serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  // carved shadow
  ctx.fillStyle = '#26160b'
  ctx.fillText('A NEW', 256 + 2, 88 + 2)
  ctx.fillText('JOURNEY', 256 + 2, 162 + 2)
  // carved face
  ctx.fillStyle = '#edd8b6'
  ctx.fillText('A NEW', 256, 88)
  ctx.fillText('JOURNEY', 256, 162)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function MeadowTrailhead() {
  const x = -1.75, z = 63.6
  const y = Y(x, z)
  const signTex = useMemo(() => makeSignTex(), [])
  const wood = flat('#5c4331')
  const iron = flat('#22201e')
  const lanternGlass = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#ffcc66', emissive: '#ff9922', emissiveIntensity: 1.8, roughness: 0.2, transparent: true, opacity: 0.92,
  }), [])

  return (
    <group position={[x, y, z]} rotation={[0, 0.2, 0]}>
      {/* main vertical wooden post */}
      <mesh castShadow receiveShadow material={wood} position={[0, 0.9, 0]}>
        <boxGeometry args={[0.16, 1.8, 0.16]} />
      </mesh>
      {/* crossarm */}
      <mesh castShadow material={wood} position={[0.22, 1.62, 0]}>
        <boxGeometry args={[0.62, 0.1, 0.1]} />
      </mesh>
      {/* wooden sign: A NEW JOURNEY */}
      <mesh castShadow material={flat('#533a28')} position={[0.02, 1.18, 0.08]} rotation={[0, -0.06, 0.04]}>
        <boxGeometry args={[0.78, 0.36, 0.04]} />
      </mesh>
      {signTex && (
        <mesh position={[0.02, 1.18, 0.105]} rotation={[0, -0.06, 0.04]}>
          <planeGeometry args={[0.74, 0.33]} />
          <meshBasicMaterial map={signTex} />
        </mesh>
      )}
      {/* iron hanging bracket */}
      <mesh castShadow material={iron} position={[0.44, 1.62, 0.12]} rotation={[0, 0, -0.2]}>
        <cylinderGeometry args={[0.015, 0.015, 0.22, 6]} />
      </mesh>
      {/* classic lantern with warm glow */}
      <group position={[0.44, 1.36, 0.12]}>
        {/* cap */}
        <mesh castShadow material={iron} position={[0, 0.12, 0]}>
          <cylinderGeometry args={[0.04, 0.12, 0.07, 8]} />
        </mesh>
        {/* glass housing */}
        <mesh material={lanternGlass} position={[0, 0.03, 0]}>
          <boxGeometry args={[0.13, 0.18, 0.13]} />
        </mesh>
        {/* base */}
        <mesh castShadow material={iron} position={[0, -0.08, 0]}>
          <boxGeometry args={[0.15, 0.04, 0.15]} />
        </mesh>
        {/* warm lantern light */}
        <pointLight color="#ffaa3b" intensity={1.6} distance={6} decay={2} castShadow />
      </group>
      {/* rustic split-rail fence extending into the flowers */}
      <mesh castShadow material={wood} position={[-1.0, 0.85, -0.04]} rotation={[0, 0, 0.02]}>
        <boxGeometry args={[1.9, 0.08, 0.05]} />
      </mesh>
      <mesh castShadow material={wood} position={[-1.0, 0.44, -0.04]} rotation={[0, 0, 0.01]}>
        <boxGeometry args={[1.9, 0.08, 0.05]} />
      </mesh>
      <mesh castShadow receiveShadow material={wood} position={[-1.9, 0.72, -0.08]}>
        <boxGeometry args={[0.14, 1.45, 0.14]} />
      </mesh>
    </group>
  )
}

export function Village() {
  const g = toonRamp(); void g
  return (
    <>
      <House />
      <Cottages />
      <Fences />
      <Lamps />
      <Letterbox />
      <MeadowTree />
      <Paths />
      <MeadowTrailhead />
    </>
  )
}

