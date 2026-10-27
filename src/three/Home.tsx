// The house: entering/leaving, and the interior as a small personal museum. Six stations:
// photo frames (About), bookshelf (what I learn), notebook (skills), personal corner (beyond code),
// window + telescope (ambitions), and the computer, which wakes into the projects OS.
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { Html, useGLTF } from '@react-three/drei'
import gsap from 'gsap'
import { useStore } from '../store'
import { registerInteractable } from '../lib/interact'
import { player, puppy, camState } from '../lib/actors'
import { CHAIR, DESK, DOOR, LAPTOP, ROOM, ROOM_ORIGIN, roomBoxes } from '../lib/room'
import { HOUSE_DOOR_OUT, heightAt } from '../world/layout'
import { flat, PALETTE, toonRamp } from './materials'
import { sitDown, seat } from './Player'
import { LaptopOS } from '../ui/LaptopOS'
import { playSfx } from '../ui/sound'
import { houseDoor, useWorldInteractable } from './Village'
import { gateState } from '../story/machine'
import { museum } from '../data/story'
import { profile } from '../data/profile'

export const FURNITURE_URL = `${import.meta.env.BASE_URL}models/furniture.glb`
useGLTF.preload(FURNITURE_URL)

export function fade(mid: () => void, hold = 0.25) {
  const f = document.getElementById('fader')
  if (!f) { mid(); return }
  gsap.timeline()
    .to(f, { opacity: 1, duration: 0.55, ease: 'power2.in' })
    .add(mid)
    .to(f, { opacity: 0, duration: 0.9, ease: 'power2.out', delay: hold })
}

export function enterHouse() {
  playSfx('door')
  gsap.to(houseDoor, { open: 1, duration: 0.7, ease: 'power2.out' })
  setTimeout(() => fade(() => {
    const s = useStore.getState()
    s.setPlace('home')
    Object.assign(player.room, { x: DOOR.x, z: 1.35, yaw: Math.PI, speed: 0 }) // a step inside, so the 3/4 camera frames him
    houseDoor.open = 0
    if (puppy.mode !== 'hidden') { puppy.space = 'home'; puppy.mode = 'follow'; puppy.pos.set(ROOM_ORIGIN.x + DOOR.x + 0.8, 0, ROOM_ORIGIN.z + 1.5) }
    s.trigger('enterHouse')
  }), 380)
}

export function exitHouse(after?: () => void) {
  playSfx('door')
  fade(() => {
    const s = useStore.getState()
    s.setPlace('world')
    player.pos.set(HOUSE_DOOR_OUT.x, heightAt(HOUSE_DOOR_OUT.x, HOUSE_DOOR_OUT.z), HOUSE_DOOR_OUT.z)
    player.yaw = Math.PI / 2
    camState.heading = Math.PI / 2
    if (puppy.space === 'home') { puppy.space = 'world'; puppy.pos.set(HOUSE_DOOR_OUT.x + 1, 0, HOUSE_DOOR_OUT.z + 1) }
    s.trigger('exitHouse')
    after?.()
  })
}

/** the front door from outside */
export function HouseDoorOutside() {
  useWorldInteractable('house-door', HOUSE_DOOR_OUT.x, HOUSE_DOOR_OUT.z, 1.9, 'Home', 'Go inside',
    () => gateState(useStore.getState().story).houseDoor && useStore.getState().place === 'world', enterHouse)
  return null
}

// ───────────────────────── interior
const FURN_COLORS: Record<string, string> = {
  wood: '#8c705a', woodDark: '#5b4738', metal: '#cfc9bc', metalMedium: '#8e8a83', metalDark: '#383b42',
  carpet: '#7c8a72', carpetDarker: '#4e5d73', carpetWhite: '#e6dfd0', plant: '#6f7c66', lamp: '#f4ead6', _defaultMat: '#b9b2a3',
}
const FS = 2 // Kenney furniture is half scale

function Furn({ piece, x, z, rot = 0, y = 0, s = FS, color }: { piece: string; x: number; z: number; rot?: number; y?: number; s?: number; color?: Record<string, string> }) {
  const { nodes } = useGLTF(FURNITURE_URL)
  const obj = useMemo(() => {
    const src = nodes[piece]
    if (!src) return new THREE.Group()
    const o = src.clone(true)
    o.position.set(0, 0, 0); o.rotation.set(0, 0, 0); o.scale.setScalar(1)
    const box = new THREE.Box3().setFromObject(o)
    const c = box.getCenter(new THREE.Vector3())
    o.position.set(-c.x, -box.min.y, -c.z)
    o.traverse((m) => {
      const mesh = m as THREE.Mesh
      if (!mesh.isMesh) return
      const name = (mesh.material as THREE.Material).name
      const hex = color?.[name] ?? FURN_COLORS[name] ?? '#b9b2a3'
      const mat = new THREE.MeshToonMaterial({ color: hex, gradientMap: toonRamp() })
      if (name === 'lamp') { mat.emissive = new THREE.Color('#ffd9a0'); mat.emissiveIntensity = 1.4 }
      mesh.material = mat
      mesh.castShadow = true
      mesh.receiveShadow = true
    })
    const g = new THREE.Group(); g.add(o)
    return g
  }, [nodes, piece, color])
  return <primitive object={obj} position={[x, y, z]} rotation-y={THREE.MathUtils.degToRad(rot)} scale={s} />
}

function Laptop() {
  const lid = useRef<THREE.Group>(null)
  const screen = useRef<THREE.MeshBasicMaterial>(null)
  const seated = useStore((s) => s.seated)
  const open = useRef(0.08)
  useFrame((_, dt) => {
    const target = seat.phase === 'seated' || seat.phase === 'sitting' ? 1 : 0.08
    open.current = THREE.MathUtils.damp(open.current, target, 3.2, dt)
    if (lid.current) lid.current.rotation.x = -open.current * 1.86 + 0 // 0 = closed flat, -1.86 ≈ 106°
    if (screen.current) {
      const glow = THREE.MathUtils.smoothstep(open.current, 0.6, 1)
      screen.current.color.setRGB(0.22 + glow * 0.55, 0.26 + glow * 0.6, 0.32 + glow * 0.7)
    }
  })
  const W = LAPTOP.screenW, H = LAPTOP.screenH
  return (
    <group position={[LAPTOP.x, DESK.top, LAPTOP.z]}>
      <mesh castShadow receiveShadow material={flat('#3a3d44')} position={[0, 0.009, 0]}><boxGeometry args={[W + 0.04, 0.018, H + 0.07]} /></mesh>
      <mesh material={flat('#2b2e33')} position={[0, 0.0185, 0.02]}><boxGeometry args={[W - 0.04, 0.002, H * 0.5]} /></mesh>
      <group ref={lid} position={[0, 0.018, -(H + 0.07) / 2]}>
        <group position={[0, 0, (H + 0.04) / 2]} rotation={[Math.PI / 2, 0, 0]}>
          {/* closed: the lid lies on the base with the screen (local +z) facing down; opening swings it up toward the user */}
          <mesh castShadow material={flat('#3a3d44')} position={[0, 0, -0.006]}><boxGeometry args={[W + 0.04, H + 0.04, 0.012]} /></mesh>
          <mesh position={[0, 0, 0.001]}><planeGeometry args={[W, H]} /><meshBasicMaterial ref={screen} toneMapped={false} /></mesh>
          {seated && (
            <Html transform position={[0, 0, 0.002]} scale={W / (1100 / 40)} zIndexRange={[30, 0]} className="os-wrap" pointerEvents="auto">
              <LaptopOS />
            </Html>
          )}
        </group>
      </group>
    </group>
  )
}

function Window() {
  const tex = useMemo(() => {
    const loader = new THREE.TextureLoader()
    const t = loader.load(`${import.meta.env.BASE_URL}mountains.jpg`)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [])
  return (
    <group position={[-0.9, 1.75, -ROOM.d / 2 + 0.02]}>
      {/* Crystal-clear alpine mountain vista through window pane */}
      <mesh position={[0, 0, 0]}>
        <planeGeometry args={[1.6, 1.1]} />
        <meshBasicMaterial map={tex} toneMapped={true} />
      </mesh>
      <mesh material={flat(PALETTE.ink)} position={[0, 0, 0.01]}><boxGeometry args={[1.7, 0.06, 0.06]} /></mesh>
      <mesh material={flat(PALETTE.ink)} position={[0, 0, 0.01]}><boxGeometry args={[0.05, 1.18, 0.06]} /></mesh>
      {[[-0.82, 0, 0.06, 1.2], [0.82, 0, 0.06, 1.2], [0, 0.57, 1.7, 0.06], [0, -0.57, 1.7, 0.06]].map(([x, y, w, h], i) => (
        <mesh key={i} material={flat('#6b5442')} position={[x, y, 0.02]}><boxGeometry args={[w, h, 0.08]} /></mesh>
      ))}
      <mesh material={flat('#6b5442')} position={[0, -0.62, 0.1]}><boxGeometry args={[1.8, 0.05, 0.22]} /></mesh>
    </group>
  )
}

/** Loads the user's authentic portrait photo texture */
function useUserPhotoTexture() {
  return useMemo(() => {
    const loader = new THREE.TextureLoader()
    const t = loader.load(`${import.meta.env.BASE_URL}profile.jpg`)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [])
}

/** A single grand gallery frame on the wall, ready for the user's new photo */
function WallPhotoFrame({ texture }: { texture: THREE.Texture }) {
  const w = 0.74, h = 0.92
  return (
    <group position={[ROOM.w / 2 - 0.03, 1.68, -0.55]} rotation={[0, -Math.PI / 2, 0]}>
      {/* Outer gilded gold frame moulding */}
      <mesh castShadow material={flat('#cca238')} position={[0, 0, 0.014]}>
        <boxGeometry args={[w + 0.10, h + 0.10, 0.028]} />
      </mesh>
      {/* Dark mahogany inner trim */}
      <mesh material={flat('#482d1a')} position={[0, 0, 0.020]}>
        <boxGeometry args={[w + 0.02, h + 0.02, 0.022]} />
      </mesh>
      {/* Ivory mat mount */}
      <mesh material={flat('#fdfaf4')} position={[0, 0, 0.023]}>
        <planeGeometry args={[w, h]} />
      </mesh>
      {/* Photo print canvas */}
      <mesh position={[0, 0, 0.026]}>
        <planeGeometry args={[w - 0.12, h - 0.12]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
    </group>
  )
}

/** A standing framed photo of Saimanoj on the work desk (100% clean, no marks or obstructions) */
function DeskPhotoFrame({ texture }: { texture: THREE.Texture }) {
  return (
    <group position={[DESK.x + 0.55, DESK.top, DESK.z + 0.12]} rotation={[0, -0.32, 0]}>
      {/* Frame tilted back 12 degrees */}
      <group rotation={[-0.20, 0, 0]}>
        {/* Frame backing and walnut border */}
        <mesh castShadow material={flat('#5c3b24')} position={[0, 0.11, 0]}>
          <boxGeometry args={[0.18, 0.22, 0.016]} />
        </mesh>
        {/* White mat border */}
        <mesh material={flat('#fdfaf4')} position={[0, 0.11, 0.009]}>
          <planeGeometry args={[0.155, 0.195]} />
        </mesh>
        {/* Crystal-clear user portrait photo */}
        <mesh position={[0, 0.11, 0.011]}>
          <planeGeometry args={[0.135, 0.175]} />
          <meshBasicMaterial map={texture} toneMapped={false} />
        </mesh>
      </group>
      {/* Back easel support safely behind the frame at desk level */}
      <mesh material={flat('#3e2515')} position={[0, 0.04, -0.04]} rotation={[0.40, 0, 0]}>
        <boxGeometry args={[0.04, 0.09, 0.015]} />
      </mesh>
    </group>
  )
}

/** Ambitions: a brass telescope pointed out of the window */
function Telescope() {
  return (
    <group position={[-0.9, 0, -2.25]}>
      {[0, 2.1, 4.2].map((a) => <mesh key={a} castShadow material={flat('#5e4535')} position={[Math.sin(a) * 0.18, 0.5, Math.cos(a) * 0.18]} rotation={[Math.cos(a) * 0.3, 0, -Math.sin(a) * 0.3]}><cylinderGeometry args={[0.02, 0.025, 1.05, 6]} /></mesh>)}
      <group position={[0, 1.05, 0]} rotation={[0.45, 0, 0]}>
        <mesh castShadow material={flat('#c9a46a')} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.1]}><cylinderGeometry args={[0.07, 0.05, 0.9, 16]} /></mesh>
        <mesh castShadow material={flat('#8a6a3c')} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.56]}><cylinderGeometry args={[0.085, 0.085, 0.08, 16]} /></mesh>
        <mesh castShadow material={flat('#2b2e33')} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.38]}><cylinderGeometry args={[0.025, 0.025, 0.14, 8]} /></mesh>
      </group>
    </group>
  )
}

/** Skills: a small writing table with an open notebook and a pencil */
function NotebookTable() {
  const tex = useMemo(() => {
    const c = document.createElement('canvas'); c.width = 512; c.height = 320
    const g = c.getContext('2d')!
    g.fillStyle = '#f7f0e0'; g.fillRect(0, 0, 512, 320)
    g.strokeStyle = 'rgba(80,110,160,0.35)'; for (let y = 40; y < 320; y += 22) { g.beginPath(); g.moveTo(10, y); g.lineTo(502, y); g.stroke() }
    g.fillStyle = 'rgba(40,40,46,0.85)'; g.font = 'italic 22px Georgia, serif'
    ;['Python · TS', 'PyTorch', 'LangChain', 'YOLOv5', 'React · R3F'].forEach((t, i) => g.fillText(t, 26, 62 + i * 44))
    ;['FastAPI', 'Node', 'SQL', 'Docker', 'Git'].forEach((t, i) => g.fillText(t, 290, 62 + i * 44))
    g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(254, 0, 4, 320)
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t
  }, [])
  return (
    <group position={[-2.65, 0, 1.3]}>
      <mesh castShadow receiveShadow material={flat('#8c705a')} position={[0, 0.72, 0]}><boxGeometry args={[0.8, 0.05, 1.0]} /></mesh>
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z], i) => <mesh key={i} castShadow material={flat('#5b4738')} position={[x * 0.34, 0.36, z * 0.44]}><boxGeometry args={[0.05, 0.72, 0.05]} /></mesh>)}
      <mesh position={[0.02, 0.752, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2 - 0.1]}><planeGeometry args={[0.62, 0.39]} /><meshBasicMaterial map={tex} /></mesh>
      <mesh castShadow material={flat('#e0b64a')} position={[0.22, 0.765, 0.25]} rotation={[0, 0.6, Math.PI / 2]}><cylinderGeometry args={[0.008, 0.008, 0.18, 6]} /></mesh>
      <mesh castShadow material={flat('#7a3e3a')} position={[-0.2, 0.78, -0.32]}><boxGeometry args={[0.22, 0.05, 0.3]} /></mesh>
    </group>
  )
}

/** Beyond code: a guitar against the lounge chair and a record player */
function CornerDecor() {
  return (
    <group>
      <group position={[3.2, 0, 0.75]} rotation={[0.18, -Math.PI / 2, 0]}>
        <mesh castShadow material={flat('#b5763f')} position={[0, 0.32, 0]} scale={[1, 1.2, 0.35]}><sphereGeometry args={[0.2, 14, 10]} /></mesh>
        <mesh castShadow material={flat('#b5763f')} position={[0, 0.58, 0]} scale={[1, 1, 0.35]}><sphereGeometry args={[0.15, 14, 10]} /></mesh>
        <mesh material={flat('#2b2e33')} position={[0, 0.42, 0.075]}><circleGeometry args={[0.05, 14]} /></mesh>
        <mesh castShadow material={flat('#5e4535')} position={[0, 0.98, 0]}><boxGeometry args={[0.05, 0.6, 0.03]} /></mesh>
      </group>
      <group position={[2.85, 0.62, 2.2]}>
        <mesh castShadow material={flat('#3a2f28')}><boxGeometry args={[0.4, 0.08, 0.32]} /></mesh>
        <mesh material={flat('#1b1b1e')} position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.13, 20]} /></mesh>
      </group>
    </group>
  )
}

function Phone() {
  const m = useRef<THREE.MeshBasicMaterial>(null)
  useFrame(({ clock }) => { if (m.current) { const k = 0.6 + Math.max(0, Math.sin(clock.elapsedTime * 2.2)) * 1.1; m.current.color.setRGB(0.5 * k, 0.6 * k, 0.7 * k) } })
  return (
    <group position={[2.85, 0.77, 1.85]} rotation={[0, 0.5, 0]}>
      <mesh castShadow material={flat('#22262d')}><boxGeometry args={[0.09, 0.012, 0.18]} /></mesh>
      <mesh position={[0, 0.007, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.08, 0.165]} /><meshBasicMaterial ref={m} toneMapped={false} /></mesh>
    </group>
  )
}

function useRoomInteractable(id: string, x: number, z: number, radius: number, label: string, verb: string, fn: () => void, enabled = () => true) {
  const f = useRef(fn); f.current = fn
  useEffect(() => registerInteractable({ id, space: 'home', at: new THREE.Vector3(x, 0, z), radius, label, verb, enabled, onInteract: () => f.current() }), [id, x, z, radius, label, verb, enabled])
}

export function HomeInterior() {
  const inside = useStore((s) => s.place === 'home')
  useEffect(() => { if (!roomBoxes.some((b) => b[0] === -3.1)) roomBoxes.push([-3.1, 0.75, -2.2, 1.85], [-1.25, -2.75, -0.55, -1.95]) }, [])
  useRoomInteractable('room-door', DOOR.x, 2.45, 1.0, 'Front door', 'Step outside', () => exitHouse(),
    () => true)
  const look = (id: string) => () => { const s = useStore.getState(); s.trigger('station', id); s.setMuseum(id); playSfx('pick') }
  const st = (id: string) => museum.find((m) => m.id === id)!
  useRoomInteractable('m-photos', 2.7, -0.6, 1.2, st('photos').label, st('photos').verb, look('photos'))
  useRoomInteractable('m-books', -2.55, -0.7, 1.2, st('books').label, st('books').verb, look('books'))
  useRoomInteractable('m-notebook', -1.95, 1.3, 1.0, st('notebook').label, st('notebook').verb, look('notebook'))
  useRoomInteractable('m-corner', 2.0, 1.6, 1.1, st('corner').label, st('corner').verb, look('corner'))
  useRoomInteractable('m-telescope', -0.9, -1.45, 1.0, st('telescope').label, st('telescope').verb, look('telescope'))
  useRoomInteractable('m-computer', CHAIR.x, CHAIR.z + 0.5, 1.0, st('computer').label, st('computer').verb, () => { sitDown(); playSfx('tick'); useStore.getState().trigger('station', 'computer') })
  const photoTexture = useUserPhotoTexture()
  if (!inside) return null
  const W = ROOM.w, D = ROOM.d, H = ROOM.h
  return (
    <group position={ROOM_ORIGIN}>
      {/* shell */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} material={flat('#a07f62')}><planeGeometry args={[W, D]} /></mesh>
      {Array.from({ length: 13 }, (_, i) => <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[-W / 2 + (i + 0.5) * (W / 13), 0.002, 0]}><planeGeometry args={[0.012, D]} /><meshBasicMaterial color="#7f6450" /></mesh>)}
      <mesh receiveShadow material={flat('#e9e1d2')} position={[0, H / 2, -D / 2]}><boxGeometry args={[W, H, 0.05]} /></mesh>
      <mesh receiveShadow material={flat('#e3dacb')} position={[-W / 2, H / 2, 0]}><boxGeometry args={[0.05, H, D]} /></mesh>
      <mesh receiveShadow material={flat('#e3dacb')} position={[W / 2, H / 2, 0]}><boxGeometry args={[0.05, H, D]} /></mesh>
      <mesh receiveShadow material={flat('#e9e1d2')} position={[0, H / 2, D / 2]}><boxGeometry args={[W, H, 0.05]} /></mesh>
      {[[0, -D / 2 + 0.04, W, 0], [-W / 2 + 0.04, 0, D, 90], [W / 2 - 0.04, 0, D, 90]].map(([x, z, len, r], i) => (
        <mesh key={i} material={flat('#6b5442')} position={[x, 0.06, z]} rotation={[0, THREE.MathUtils.degToRad(r), 0]}><boxGeometry args={[len, 0.12, 0.03]} /></mesh>
      ))}
      {/* door (inside) */}
      <mesh material={flat('#6b5442')} position={[DOOR.x, 1.05, D / 2 - 0.04]}><boxGeometry args={[1.0, 2.1, 0.06]} /></mesh>
      <mesh material={flat('#c9a46a')} position={[DOOR.x + 0.38, 1.05, D / 2 - 0.09]}><sphereGeometry args={[0.04, 8, 6]} /></mesh>
      <Window />
      <WallPhotoFrame texture={photoTexture} />
      <Telescope />
      <NotebookTable />
      <CornerDecor />
      {/* furniture */}
      <Furn piece="rugRectangle" x={0.4} z={0.2} s={2.6} />
      <Furn piece="desk" x={DESK.x} z={DESK.z} />
      <Furn piece="chairDesk" x={CHAIR.x} z={CHAIR.z - 0.05} rot={180} />
      <Laptop />
      <DeskPhotoFrame texture={photoTexture} />
      <Furn piece="computerScreen" x={DESK.x + 0.48} z={DESK.z - 0.18} y={DESK.top} s={1.6} rot={-12} />
      <mesh position={[DESK.x + 0.47, DESK.top + 0.3, DESK.z - 0.13]} rotation={[0, -0.21, 0]}><planeGeometry args={[0.52, 0.3]} /><meshBasicMaterial color={[0.55, 0.75, 0.9]} toneMapped={false} /></mesh>
      <Furn piece="lampRoundTable" x={DESK.x - 0.6} z={DESK.z - 0.18} y={DESK.top} s={1.6} />
      <pointLight position={[DESK.x - 0.6, DESK.top + 0.55, DESK.z]} color="#ffcf95" intensity={3.2} distance={4.5} decay={2} castShadow={false} />
      <Furn piece="kitchenCoffeeMachine" x={DESK.x - 0.25} z={DESK.z - 0.2} y={DESK.top} s={0.7} />
      <Furn piece="plantSmall2" x={DESK.x + 0.15} z={DESK.z - 0.3} y={DESK.top} s={1.8} />
      <Furn piece="bookcaseOpen" x={-3.2} z={-1.3} rot={90} />
      <Furn piece="bookcaseOpen" x={-3.2} z={-0.1} rot={90} />
      <Furn piece="books" x={-3.2} z={-1.3} y={0.86} rot={90} />
      <Furn piece="books" x={-3.2} z={-0.1} y={1.2} rot={90} />
      <Furn piece="pottedPlant" x={-3.05} z={-2.6} />
      <Furn piece="lampSquareFloor" x={3.05} z={-2.65} />
      <pointLight position={[3.05, 1.7, -2.6]} color="#ffd6a0" intensity={2.4} distance={5} decay={2} />
      <Furn piece="plantSmall1" x={2.75} z={-2.75} s={3} />
      <Furn piece="loungeChair" x={2.8} z={1.5} rot={-110} />
      <Furn piece="sideTable" x={2.85} z={2.2} rot={-90} s={1.4} />
      <Phone />
      <Furn piece="coatRackStanding" x={-3.15} z={2.6} />
      <Furn piece="cardboardBoxClosed" x={-2.2} z={2.65} rot={20} />
      <Furn piece="speakerSmall" x={-1.7} z={-2.75} />
      <Furn piece="trashcan" x={DESK.x + 0.95} z={DESK.z + 0.1} s={1.6} />
      {/* soft fill so the room never goes muddy */}
      <hemisphereLight args={['#f5ebdc', '#7a6a5a', 0.6]} position={[0, 3, 0]} />
      <pointLight position={[-0.9, 2.0, -2.2]} color="#c9d6e6" intensity={2.2} distance={6} decay={2} />
    </group>
  )
}

/** camera targets for the room (read by CameraRig) */
export const roomCam = {
  corner: new THREE.Vector3(0.2, 2.05, 2.75), // ~3/4 view (was 2.75: too top-down by the door)
  shoulderPos: new THREE.Vector3(CHAIR.x + 0.42, 1.48, CHAIR.z + 0.62),
  shoulderLook: new THREE.Vector3(LAPTOP.x, DESK.top + 0.14, LAPTOP.z - 0.05),
}
