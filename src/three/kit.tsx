// Placement helpers + the CC0 kit (Quaternius nature/props) + small procedural architecture pieces.
import { useMemo, useRef, type ReactNode } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { flat, PALETTE, toonify } from './materials'

export const KIT_URL = `${import.meta.env.BASE_URL}models/kit.glb`
useGLTF.preload(KIT_URL)
export type KitNodes = Record<string, THREE.Object3D>
export function useKit() { return useGLTF(KIT_URL).nodes as KitNodes }

/** a kit piece by key (see tools/build-kit.mjs) */
export function Kit({ piece, s = 1, sway, tint, y = 0, rot = 0 }: { piece: string; s?: number; sway?: boolean; tint?: string; y?: number; rot?: number }) {
  const nodes = useKit()
  const obj = useMemo(() => {
    const src = nodes[piece]
    if (!src) { console.warn('missing kit piece', piece); return new THREE.Group() }
    const o = src.clone(true)
    o.position.set(0, 0, 0); o.quaternion.identity(); o.scale.setScalar(1)
    toonify(o, { sway, tint })
    return o
  }, [nodes, piece, sway, tint])
  return <primitive object={obj} scale={s} position-y={y} rotation-y={THREE.MathUtils.degToRad(rot)} />
}

// ───────────── procedural pieces (palette, toon) ─────────────
const M = {
  stone: () => flat(PALETTE.stone),
  stoneDark: () => flat(PALETTE.stoneDark),
  ivory: () => flat(PALETTE.ivory),
  dusk: () => flat(PALETTE.dusk),
  duskDeep: () => flat(PALETTE.duskDeep),
  ink: () => flat(PALETTE.ink),
  wood: () => flat('#7a634e'),
  woodDark: () => flat('#4f4034'),
  sage: () => flat(PALETTE.sageDeep),
}
export { M as mats }

function Sh({ children, ...p }: { children: ReactNode } & Record<string, unknown>) {
  return <mesh castShadow receiveShadow {...p}>{children}</mesh>
}

export function Column({ h = 3, r = 0.32, broken = false }: { h?: number; r?: number; broken?: boolean }) {
  return (
    <group>
      <Sh material={M.stoneDark()} position={[0, 0.12, 0]}><boxGeometry args={[r * 2.6, 0.24, r * 2.6]} /></Sh>
      <Sh material={M.stone()} position={[0, h / 2 + 0.24, 0]} rotation={broken ? [0.04, 0, 0.06] : [0, 0, 0]}><cylinderGeometry args={[r * 0.92, r, h, 14]} /></Sh>
      {!broken && <Sh material={M.stoneDark()} position={[0, h + 0.36, 0]}><boxGeometry args={[r * 2.5, 0.24, r * 2.5]} /></Sh>}
    </group>
  )
}

export function Arch({ w = 3.2, h = 3.6, d = 0.7, mat = 'stone' as keyof typeof M }: { w?: number; h?: number; d?: number; mat?: keyof typeof M }) {
  const m = M[mat]()
  return (
    <group>
      <Sh material={m} position={[-w / 2, h / 2, 0]}><boxGeometry args={[0.6, h, d]} /></Sh>
      <Sh material={m} position={[w / 2, h / 2, 0]}><boxGeometry args={[0.6, h, d]} /></Sh>
      <Sh material={m} position={[0, h + 0.05, 0]}><torusGeometry args={[w / 2, 0.32, 8, 24, Math.PI]} /></Sh>
      <Sh material={M.stoneDark()} position={[0, h + w / 2 + 0.2, 0]}><boxGeometry args={[0.5, 0.5, d * 0.8]} /></Sh>
    </group>
  )
}

export function Monolith({ w = 1, h = 3, d = 0.5, mat = 'stone' as keyof typeof M, glow }: { w?: number; h?: number; d?: number; mat?: keyof typeof M; glow?: string }) {
  return (
    <group>
      <Sh material={M[mat]()} position={[0, h / 2, 0]}><boxGeometry args={[w, h, d]} /></Sh>
      {glow && (
        <mesh position={[0, h * 0.55, d / 2 + 0.01]}>
          <planeGeometry args={[w * 0.12, h * 0.6]} />
          <meshBasicMaterial color={glow} toneMapped={false} />
        </mesh>
      )}
    </group>
  )
}

export function Brazier({ color = '#ffb070', light = false, s = 1 }: { color?: string; light?: boolean; s?: number }) {
  const flame = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (flame.current) flame.current.scale.set(1 + Math.sin(t * 9) * 0.06, 1 + Math.sin(t * 13) * 0.12, 1 + Math.cos(t * 7) * 0.06)
  })
  const c = new THREE.Color(color).multiplyScalar(3)
  return (
    <group scale={s}>
      <Sh material={M.stoneDark()} position={[0, 0.35, 0]}><cylinderGeometry args={[0.32, 0.4, 0.7, 10]} /></Sh>
      <Sh material={M.ink()} position={[0, 0.76, 0]}><cylinderGeometry args={[0.46, 0.3, 0.16, 12]} /></Sh>
      <mesh ref={flame} position={[0, 1.02, 0]}>
        <coneGeometry args={[0.24, 0.6, 8]} />
        <meshBasicMaterial color={c} toneMapped={false} />
      </mesh>
      {light && <pointLight position={[0, 1.4, 0]} color={color} intensity={6} distance={9} decay={2} />}
    </group>
  )
}

export function LampPost({ h = 2.6 }: { h?: number }) {
  return (
    <group>
      <Sh material={M.ink()} position={[0, h / 2, 0]}><cylinderGeometry args={[0.05, 0.07, h, 8]} /></Sh>
      <Sh material={M.ink()} position={[0, h + 0.05, 0]}><boxGeometry args={[0.32, 0.06, 0.32]} /></Sh>
      <mesh position={[0, h - 0.18, 0]}>
        <boxGeometry args={[0.22, 0.32, 0.22]} />
        <meshBasicMaterial color={[1.55, 1.08, 0.62]} toneMapped={false} />
      </mesh>
    </group>
  )
}

/** low curved wall segment, for arenas and terraces */
export function RingWall({ r = 8, h = 1, arc = Math.PI * 1.6, start = 0, mat = 'stone' as keyof typeof M }: { r?: number; h?: number; arc?: number; start?: number; mat?: keyof typeof M }) {
  return (
    <Sh material={M[mat]()} position={[0, h / 2, 0]} rotation={[0, start, 0]}>
      <cylinderGeometry args={[r, r, h, 48, 1, true, 0, arc]} />
    </Sh>
  )
}

export function Steps({ w = 3, n = 3, rise = 0.18, run = 0.45 }: { w?: number; n?: number; rise?: number; run?: number }) {
  return (
    <group>
      {Array.from({ length: n }, (_, i) => (
        <Sh key={i} material={i % 2 ? M.stone() : M.stoneDark()} position={[0, rise * (i + 0.5), -run * i]}><boxGeometry args={[w, rise, run * (n - i) * 1.0 + 0.01]} /></Sh>
      ))}
    </group>
  )
}

export function Tent() {
  return (
    <group>
      <Sh material={flat('#cfc4ae')} position={[0, 1.0, 0]} rotation={[0, Math.PI / 4, 0]}><coneGeometry args={[1.7, 2.0, 4, 1, true]} /></Sh>
      <Sh material={M.woodDark()} position={[0, 1.2, 0]}><cylinderGeometry args={[0.03, 0.03, 2.4, 6]} /></Sh>
    </group>
  )
}

export function Campfire({ s = 1 }: { s?: number }) {
  const flame = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    flame.current?.children.forEach((c, i) => c.scale.setScalar(0.8 + Math.sin(t * (8 + i * 3) + i) * 0.2))
  })
  return (
    <group scale={s}>
      {Array.from({ length: 7 }, (_, i) => {
        const a = (i / 7) * Math.PI * 2
        return <Sh key={i} material={M.stoneDark()} position={[Math.cos(a) * 0.55, 0.1, Math.sin(a) * 0.55]}><dodecahedronGeometry args={[0.16, 0]} /></Sh>
      })}
      <Sh material={M.woodDark()} position={[0, 0.12, 0]} rotation={[0, 0.4, Math.PI / 2]}><cylinderGeometry args={[0.06, 0.06, 0.8, 6]} /></Sh>
      <Sh material={M.woodDark()} position={[0, 0.12, 0]} rotation={[0, -0.9, Math.PI / 2]}><cylinderGeometry args={[0.06, 0.06, 0.8, 6]} /></Sh>
      <group ref={flame} position={[0, 0.35, 0]}>
        <mesh><coneGeometry args={[0.2, 0.55, 7]} /><meshBasicMaterial color={[3.2, 1.5, 0.6]} toneMapped={false} /></mesh>
        <mesh position={[0.08, -0.05, 0.04]}><coneGeometry args={[0.12, 0.36, 6]} /><meshBasicMaterial color={[3.4, 2.2, 0.9]} toneMapped={false} /></mesh>
      </group>
      <pointLight position={[0, 0.8, 0]} color="#ffb06a" intensity={7} distance={10} decay={2} />
    </group>
  )
}

/** a chunky old CRT terminal on a crate: the very first computer */
export function Terminal({ on }: { on: boolean }) {
  const screen = useRef<THREE.MeshBasicMaterial>(null)
  useFrame(({ clock }) => {
    if (screen.current) {
      const f = on ? 1.6 + Math.sin(clock.elapsedTime * 30) * 0.05 + Math.sin(clock.elapsedTime * 2) * 0.1 : 0.12
      screen.current.color.setRGB(0.55 * f, 0.8 * f, 0.62 * f)
    }
  })
  return (
    <group>
      <Sh material={M.wood()} position={[0, 0.4, 0]}><boxGeometry args={[1.0, 0.8, 0.8]} /></Sh>
      <Sh material={flat('#d8cfbd')} position={[0, 1.12, -0.05]}><boxGeometry args={[0.78, 0.64, 0.66]} /></Sh>
      <Sh material={flat('#cbc1ac')} position={[0, 1.1, -0.42]}><boxGeometry args={[0.5, 0.42, 0.2]} /></Sh>
      <mesh position={[0, 1.14, 0.285]}>
        <planeGeometry args={[0.56, 0.42]} />
        <meshBasicMaterial ref={screen} toneMapped={false} />
      </mesh>
      <Sh material={flat('#d8cfbd')} position={[0, 0.83, 0.42]} rotation={[0.12, 0, 0]}><boxGeometry args={[0.7, 0.05, 0.26]} /></Sh>
      <pointLight position={[0, 1.2, 0.8]} color="#a9e0b8" intensity={on ? 2.2 : 0} distance={4} decay={2} />
    </group>
  )
}
