// The developer workshop on the far bank: timber frame, glass front, warm interior light.
// Five stations, each holding one project: a wall of screens (frontend), a phone stand (mobile),
// a server rack + terminal (software), an AI lab desk (AI/ML), an experiments shelf (lab).
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { gates, heightAt, STATIONS, WORKSHOP, WORKSHOP_DOOR, inWorkshop } from '../world/layout'
import { player } from '../lib/actors'
import { useStore } from '../store'
import { gateState } from '../story/machine'
import { projects } from '../data/projects'
import { flat } from './materials'
import { useWorldInteractable } from './Village'
import { Kit } from './kit'
import { playSfx } from '../ui/sound'
import { textTexture } from './textTex'

export const workshopView = { inside: 0 }
const W = WORKSHOP
const FLOOR_Y = heightAt(W.x, W.z) + 0.12

function Screen({ w, h, a, b, seed = 0 }: { w: number; h: number; a: string; b: string; seed?: number }) {
  const mat = useMemo(() => new THREE.ShaderMaterial({
    toneMapped: false,
    uniforms: { uA: { value: new THREE.Color(a) }, uB: { value: new THREE.Color(b) }, uT: { value: seed } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: /* glsl */ `varying vec2 vUv; uniform vec3 uA, uB; uniform float uT;
      void main(){
        vec3 c = mix(uA, uB, vUv.y + sin(vUv.x * 3.0 + uT * 0.4) * 0.08);
        // a little UI: header bar, cards, text lines
        float header = step(0.86, vUv.y);
        c = mix(c, vec3(0.97, 0.94, 0.88), header * 0.85);
        vec2 g = fract(vec2(vUv.x * 3.0, vUv.y * 2.4));
        float card = step(0.08, g.x) * step(g.x, 0.92) * step(0.1, g.y) * step(g.y, 0.8) * step(vUv.y, 0.82);
        c = mix(c, vec3(1.0), card * 0.18);
        float line = step(0.55, fract(vUv.y * 22.0 - uT * 0.05)) * step(0.15, g.x) * step(g.x, 0.6) * card;
        c = mix(c, vec3(1.0), line * 0.25);
        gl_FragColor = vec4(c * 1.25, 1.0);
        #include <colorspace_fragment>
      }`,
  }), [a, b, seed])
  useFrame((_, dt) => { mat.uniforms.uT.value += dt })
  return <mesh material={mat}><planeGeometry args={[w, h]} /></mesh>
}

function Monitor({ w = 0.9, h = 0.55, a, b, seed }: { w?: number; h?: number; a: string; b: string; seed?: number }) {
  return (
    <group>
      <mesh castShadow material={flat('#24272d')}><boxGeometry args={[w + 0.06, h + 0.06, 0.05]} /></mesh>
      <group position={[0, 0, 0.03]}><Screen w={w} h={h} a={a} b={b} seed={seed} /></group>
    </group>
  )
}

function Desk({ w = 2.2, d = 0.9 }: { w?: number; d?: number }) {
  return (
    <group>
      <mesh castShadow receiveShadow material={flat('#9a7552')} position={[0, 0.78, 0]}><boxGeometry args={[w, 0.06, d]} /></mesh>
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z], i) => <mesh key={i} castShadow material={flat('#3a3d44')} position={[x * (w / 2 - 0.08), 0.39, z * (d / 2 - 0.08)]}><boxGeometry args={[0.06, 0.78, 0.06]} /></mesh>)}
    </group>
  )
}

function FrontendStation() {
  return (
    <group>
      <Desk w={2.6} />
      {[[-0.95, 1.45, 0], [0, 1.45, 0], [0.95, 1.45, 0], [-0.48, 2.1, 0], [0.48, 2.1, 0]].map(([x, y], i) => (
        <group key={i} position={[x, y, -0.25]} rotation={[0, -x * 0.12, 0]}>
          <Monitor a={['#e7a35a', '#6c87b5', '#d97a6a', '#7aa58a', '#b48ac9'][i]} b={['#5b3f78', '#e9d4b0', '#2f3b4f', '#f1e6c8', '#2c3442'][i]} seed={i * 3} />
        </group>
      ))}
      <mesh material={flat('#2b2e33')} position={[0, 0.82, 0.12]}><boxGeometry args={[0.5, 0.02, 0.16]} /></mesh>
    </group>
  )
}

function MobileStation() {
  return (
    <group>
      <Desk w={2.0} d={0.8} />
      {[-0.6, 0, 0.6].map((x, i) => (
        <group key={x} position={[x, 0.98, 0]} rotation={[-0.25, 0, 0]}>
          <mesh castShadow material={flat('#1f2227')}><boxGeometry args={[0.2, 0.4, 0.025]} /></mesh>
          <group position={[0, 0, 0.014]}><Screen w={0.17} h={0.35} a={['#5f8a7a', '#e9a66a', '#7b8fc9'][i]} b={['#efe4cf', '#3f2d4f', '#f3e9d6'][i]} seed={i} /></group>
          <mesh material={flat('#8a8f98')} position={[0, -0.24, -0.06]} rotation={[0.6, 0, 0]}><boxGeometry args={[0.12, 0.02, 0.18]} /></mesh>
        </group>
      ))}
      <Kit piece="plant" s={0.35} y={0.81} />
    </group>
  )
}

function SoftwareStation() {
  const leds = useRef<THREE.InstancedMesh>(null)
  const N = 36
  useFrame(({ clock }) => {
    const m = leds.current
    if (!m) return
    const c = new THREE.Color()
    for (let i = 0; i < N; i++) {
      const on = Math.sin(clock.elapsedTime * (3 + (i % 7)) + i * 1.7) > 0.2
      m.setColorAt(i, c.set(on ? (i % 5 === 0 ? '#ffb070' : '#7dffb0') : '#1c3326'))
    }
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  })
  const mats = useMemo(() => {
    const m = new THREE.Matrix4()
    return Array.from({ length: N }, (_, i) => m.clone().setPosition(-0.25 + (i % 4) * 0.06, 0.3 + Math.floor(i / 4) * 0.2, 0.31))
  }, [])
  return (
    <group>
      {/* rack */}
      <group position={[-0.8, 0, -0.1]}>
        <mesh castShadow material={flat('#2a2d33')} position={[0, 1.0, 0]}><boxGeometry args={[0.75, 2.0, 0.6]} /></mesh>
        {Array.from({ length: 9 }, (_, i) => <mesh key={i} material={flat('#3a3e46')} position={[0, 0.3 + i * 0.2, 0.301]}><boxGeometry args={[0.66, 0.15, 0.01]} /></mesh>)}
        <instancedMesh ref={(m) => { leds.current = m; if (m && !m.userData.init) { mats.forEach((mm, i) => m.setMatrixAt(i, mm)); m.userData.init = true } }} args={[undefined, undefined, N]}>
          <boxGeometry args={[0.025, 0.025, 0.01]} />
          <meshBasicMaterial toneMapped={false} />
        </instancedMesh>
      </group>
      {/* terminal desk */}
      <group position={[0.65, 0, 0]}>
        <Desk w={1.5} d={0.8} />
        <group position={[0, 1.2, -0.2]}><Monitor w={0.8} h={0.5} a="#1d2a24" b="#14201b" seed={2} /></group>
        <mesh material={flat('#2b2e33')} position={[0, 0.82, 0.1]}><boxGeometry args={[0.45, 0.02, 0.15]} /></mesh>
        <Kit piece="mug" s={1.4} y={0.81} />
      </group>
    </group>
  )
}

function AIStation() {
  const brain = useRef<THREE.Group>(null)
  const net = useMemo(() => {
    const layers = [4, 6, 6, 3]
    const nodes: THREE.Vector3[][] = layers.map((n, li) => Array.from({ length: n }, (_, k) => new THREE.Vector3((li - 1.5) * 0.28, (k - (n - 1) / 2) * 0.13, 0)))
    const pts: number[] = []
    for (let l = 0; l < nodes.length - 1; l++) for (const a of nodes[l]) for (const b of nodes[l + 1]) pts.push(a.x, a.y, a.z, b.x, b.y, b.z)
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
    return { nodes: nodes.flat(), lines: g }
  }, [])
  useFrame(({ clock }) => { if (brain.current) { brain.current.rotation.y = Math.sin(clock.elapsedTime * 0.5) * 0.6; brain.current.position.y = 1.75 + Math.sin(clock.elapsedTime) * 0.04 } })
  return (
    <group>
      <Desk w={2.4} />
      <mesh castShadow material={flat('#2b2e33')} position={[-0.75, 1.05, -0.1]}><boxGeometry args={[0.45, 0.5, 0.55]} /></mesh>
      <mesh position={[-0.75, 1.05, 0.18]}><planeGeometry args={[0.32, 0.06]} /><meshBasicMaterial color={[0.5, 1.6, 1.2]} toneMapped={false} /></mesh>
      <group position={[0.35, 1.2, -0.25]}><Monitor w={0.85} h={0.5} a="#7a3e3a" b="#e8d9bf" seed={5} /></group>
      {/* the hologram of a small neural net */}
      <group ref={brain} position={[0.2, 1.75, 0.1]}>
        <lineSegments geometry={net.lines}><lineBasicMaterial color={[0.6, 1.3, 1.6]} transparent opacity={0.45} toneMapped={false} /></lineSegments>
        {net.nodes.map((p, i) => <mesh key={i} position={p}><sphereGeometry args={[0.022, 8, 6]} /><meshBasicMaterial color={[0.9, 1.8, 2.0]} toneMapped={false} /></mesh>)}
      </group>
      <mesh position={[0.2, 0.83, 0.1]}><cylinderGeometry args={[0.32, 0.36, 0.04, 24]} /><meshBasicMaterial color={[0.4, 0.9, 1.1]} toneMapped={false} /></mesh>
      <pointLight position={[0.2, 1.7, 0.4]} color="#9fe8ff" intensity={2.2} distance={4} decay={2} />
    </group>
  )
}

function LabStation() {
  return (
    <group>
      <Kit piece="bookcase" s={1.0} />
      {[0.55, 1.1, 1.65].map((y, i) => (
        <group key={y} position={[0, y + 0.02, 0.05]}>
          {[-0.45, -0.15, 0.15, 0.45].map((x, k) => (
            <mesh key={k} castShadow position={[x, 0.12, 0]}>
              {(i + k) % 3 === 0 ? <cylinderGeometry args={[0.07, 0.07, 0.24, 12]} /> : (i + k) % 3 === 1 ? <sphereGeometry args={[0.1, 12, 10]} /> : <boxGeometry args={[0.16, 0.2, 0.16]} />}
              <meshStandardMaterial color={['#e9a66a', '#7aa58a', '#9fb6e0', '#d97a6a'][(i + k) % 4]} roughness={0.3} transparent opacity={(i + k) % 3 === 0 ? 0.75 : 1} />
            </mesh>
          ))}
        </group>
      ))}
      <mesh position={[0, 2.3, 0.1]}><boxGeometry args={[1.2, 0.04, 0.04]} /><meshBasicMaterial color={[2.2, 1.6, 0.9]} toneMapped={false} /></mesh>
    </group>
  )
}

function ExperienceStation() {
  const badge = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (badge.current) {
      badge.current.rotation.y = clock.elapsedTime * 0.8
      badge.current.position.y = 1.6 + Math.sin(clock.elapsedTime * 1.5) * 0.03
    }
  })
  return (
    <group>
      <mesh castShadow receiveShadow material={flat('#2a2e37')} position={[0, 0.45, 0]}>
        <boxGeometry args={[1.4, 0.9, 0.8]} />
      </mesh>
      <mesh material={flat('#b48a52')} position={[0, 0.91, 0]}>
        <boxGeometry args={[1.46, 0.04, 0.86]} />
      </mesh>
      <group position={[0, 1.15, -0.05]} rotation={[-0.32, 0, 0]}>
        <mesh castShadow material={flat('#1c2026')}><boxGeometry args={[1.1, 0.65, 0.04]} /></mesh>
        <group position={[0, 0, 0.022]}><Screen w={1.02} h={0.58} a="#d99b4a" b="#2b3952" seed={7} /></group>
      </group>
      <group ref={badge} position={[0, 1.6, 0]}>
        <mesh>
          <octahedronGeometry args={[0.16, 0]} />
          <meshBasicMaterial color={[2.4, 1.8, 0.8]} toneMapped={false} />
        </mesh>
        <mesh rotation={[Math.PI / 4, 0, 0]}>
          <torusGeometry args={[0.26, 0.018, 8, 24]} />
          <meshBasicMaterial color={[1.2, 1.8, 2.4]} toneMapped={false} />
        </mesh>
      </group>
      <pointLight position={[0, 1.6, 0.3]} color="#ffcf88" intensity={3.5} distance={5} decay={2} />
    </group>
  )
}

const STATION_VIEW: Record<string, () => React.ReactElement> = {
  frontend: FrontendStation, mobile: MobileStation, software: SoftwareStation, ai: AIStation, lab: LabStation, experience: ExperienceStation,
}

function StationSpot({ id }: { id: string }) {
  const st = STATIONS[id]
  const isExp = id === 'experience'
  const proj = projects.find((p) => p.station === id)
  const marker = useRef<THREE.Mesh>(null)
  // stand-in-front point
  const fx = st.x + Math.sin(st.yaw) * 1.4, fz = st.z + Math.cos(st.yaw) * 1.4
  const title = isExp ? 'Experience & Leadership' : (proj?.title ?? id)
  const verb = isExp ? 'View Journey' : 'Open project'
  useWorldInteractable(`station-${id}`, fx, fz, 1.8, title, verb,
    () => { const s = useStore.getState(); return s.story.beat === 'c6_projects' || s.story.beat === 'c7_climb' || s.story.beat === 'c7_bench' || s.story.beat === 'c7_end' },
    () => {
      const s = useStore.getState()
      if (isExp) {
        s.setProject('experience')
      } else {
        s.trigger('project', id)
        s.setProject(proj?.slug ?? null)
      }
      playSfx('pick')
    })
  useFrame(({ clock }) => {
    const m = marker.current
    if (!m) return
    const found = useStore.getState().story.projects.includes(id)
    m.visible = isExp ? true : (!found && useStore.getState().story.beat === 'c6_projects')
    m.position.y = 2.75 + Math.sin(clock.elapsedTime * 2 + st.x) * 0.06
    m.rotation.y = clock.elapsedTime
  })
  const View = STATION_VIEW[id]
  return (
    <group position={[st.x, FLOOR_Y, st.z]} rotation={[0, st.yaw, 0]}>
      <View />
      <mesh ref={marker} position={[0, 2.75, 0.2]}>
        <octahedronGeometry args={[0.11, 0]} />
        <meshBasicMaterial color={isExp ? [1.4, 2.0, 2.6] : [2.4, 1.6, 0.7]} toneMapped={false} />
      </mesh>
    </group>
  )
}

export function Workshop() {
  const roof = useRef<THREE.Group>(null)
  const doorL = useRef<THREE.Group>(null), doorR = useRef<THREE.Group>(null)
  const door = useRef(0)
  useWorldInteractable('workshop-enter', WORKSHOP_DOOR.x, WORKSHOP_DOOR.z + 1.0, 2.2, 'The Studio', 'Step inside',
    () => useStore.getState().story.beat === 'c6_workshop', () => useStore.getState().trigger('enterWorkshop'))
  useFrame((_, dt) => {
    const s = useStore.getState()
    const open = gateState(s.story).workshopDoor
    gates.workshop.open = open
    const near = Math.hypot(player.pos.x - WORKSHOP_DOOR.x, player.pos.z - WORKSHOP_DOOR.z) < 5 || inWorkshop(player.pos.x, player.pos.z)
    door.current = THREE.MathUtils.damp(door.current, open && near ? 1 : 0, 3, dt)
    if (doorL.current) doorL.current.position.x = -0.75 - door.current * 1.4
    if (doorR.current) doorR.current.position.x = 0.75 + door.current * 1.4
    // auto-trigger on walking in
    if (s.story.beat === 'c6_workshop' && inWorkshop(player.pos.x, player.pos.z)) s.trigger('enterWorkshop')
    const inside = inWorkshop(player.pos.x, player.pos.z) ? 1 : 0
    workshopView.inside = THREE.MathUtils.damp(workshopView.inside, inside, 4, dt)
    if (roof.current) {
      roof.current.visible = workshopView.inside < 0.98
      roof.current.position.y = W.h + workshopView.inside * 6
    }
  })
  const x0 = -W.w / 2, x1 = W.w / 2, z0 = -W.d / 2, z1 = W.d / 2
  const timber = flat('#8a6446'), timberDark = flat('#5e4433'), plank = flat('#d8c3a0')
  const signTex = useMemo(() => textTexture('THE STUDIO', { w: 768, h: 120, size: 60, bg: '#2f3540', color: '#f3dcb0' }), [])
  const glass = useMemo(() => new THREE.MeshStandardMaterial({ color: '#cfe3e6', transparent: true, opacity: 0.22, roughness: 0.05, metalness: 0.1, depthWrite: false }), [])
  const dl = WORKSHOP_DOOR.x - W.x - WORKSHOP_DOOR.w / 2, dr = WORKSHOP_DOOR.x - W.x + WORKSHOP_DOOR.w / 2
  return (
    <group>
      <group position={[W.x, FLOOR_Y, W.z]}>
        {/* floor + deck */}
        <mesh receiveShadow material={flat('#b7a184')} position={[0, -0.06, 0]}><boxGeometry args={[W.w + 0.6, 0.24, W.d + 0.6]} /></mesh>
        <mesh receiveShadow material={plank} position={[0, -0.06, z1 + 1.4]}><boxGeometry args={[6, 0.16, 2.4]} /></mesh>
        <mesh receiveShadow material={flat('#7c8a72')} position={[0, 0.07, 0.4]}><boxGeometry args={[6.5, 0.02, 4.0]} /></mesh>
        {/* back wall (timber planks with a high window band) + side walls */}
        <mesh castShadow receiveShadow material={plank} position={[0, W.h * 0.32, z0]}><boxGeometry args={[W.w, W.h * 0.64, 0.25]} /></mesh>
        <mesh material={glass} position={[0, W.h * 0.8, z0]}><boxGeometry args={[W.w, W.h * 0.36, 0.06]} /></mesh>
        {[x0, x1].map((x) => (
          <group key={x}>
            <mesh castShadow receiveShadow material={plank} position={[x, W.h * 0.5, 0]}><boxGeometry args={[0.25, W.h, W.d]} /></mesh>
          </group>
        ))}
        {/* glass front with a timber frame and a sliding door */}
        <mesh material={glass} position={[(x0 + dl) / 2, W.h * 0.5, z1]}><boxGeometry args={[dl - x0, W.h, 0.06]} /></mesh>
        <mesh material={glass} position={[(dr + x1) / 2, W.h * 0.5, z1]}><boxGeometry args={[x1 - dr, W.h, 0.06]} /></mesh>
        <mesh material={glass} position={[(dl + dr) / 2, W.h * 0.78, z1]}><boxGeometry args={[dr - dl, W.h * 0.44, 0.06]} /></mesh>
        <group position={[(dl + dr) / 2, 0, z1 + 0.06]}>
          <group ref={doorL}><mesh material={glass} position={[0, 1.3, 0]}><boxGeometry args={[1.5, 2.6, 0.05]} /></mesh><mesh material={timberDark} position={[0, 1.3, 0]}><boxGeometry args={[1.5, 0.08, 0.07]} /></mesh></group>
          <group ref={doorR}><mesh material={glass} position={[0, 1.3, 0]}><boxGeometry args={[1.5, 2.6, 0.05]} /></mesh><mesh material={timberDark} position={[0, 1.3, 0]}><boxGeometry args={[1.5, 0.08, 0.07]} /></mesh></group>
        </group>
        {[x0, x0 + 3, dl, dr, x1 - 3, x1].map((x, i) => <mesh key={i} castShadow material={timber} position={[x, W.h / 2, z1]}><boxGeometry args={[0.22, W.h, 0.22]} /></mesh>)}
        <mesh castShadow material={timber} position={[0, 2.6, z1]}><boxGeometry args={[W.w, 0.16, 0.2]} /></mesh>
        <mesh castShadow material={timber} position={[0, W.h, z1]}><boxGeometry args={[W.w + 0.3, 0.26, 0.26]} /></mesh>
        {/* roof: shallow pitched timber with an overhang (lifts away when you're inside) */}
        <group ref={roof} position={[0, W.h, 0]}>
          <mesh castShadow material={flat('#4f5a52')} position={[0, 0.55, -W.d / 4 - 0.2]} rotation={[0.2, 0, 0]}><boxGeometry args={[W.w + 1.4, 0.18, W.d / 2 + 1.2]} /></mesh>
          <mesh castShadow material={flat('#4f5a52')} position={[0, 0.55, W.d / 4 + 0.2]} rotation={[-0.2, 0, 0]}><boxGeometry args={[W.w + 1.4, 0.18, W.d / 2 + 1.2]} /></mesh>
          {[-5, -2.5, 0, 2.5, 5].map((x) => <mesh key={x} castShadow material={timberDark} position={[x, 0.2, 0]}><boxGeometry args={[0.16, 0.3, W.d]} /></mesh>)}
        </group>
        {/* sign */}
        <group position={[0, W.h + 0.4, z1 + 0.25]}>
          <mesh material={flat('#2f3540')}><boxGeometry args={[3.2, 0.55, 0.08]} /></mesh>
          <mesh position={[0, 0, 0.045]}><planeGeometry args={[3.0, 0.48]} /><meshBasicMaterial map={signTex} toneMapped={false} /></mesh>
        </group>
        {/* warm interior light */}
        <pointLight position={[-3, 3.4, -1]} color="#ffd6a8" intensity={7} distance={11} decay={2} />
        <pointLight position={[3.5, 3.4, -1]} color="#ffd6a8" intensity={7} distance={11} decay={2} />
        <pointLight position={[0, 3.0, 3]} color="#ffd9a8" intensity={5} distance={9} decay={2} />
        {[-4.5, 0, 4.5].map((x) => (
          <group key={x} position={[x, 3.6, -1]}>
            <mesh material={timberDark} position={[0, 0.5, 0]}><cylinderGeometry args={[0.01, 0.01, 1, 4]} /></mesh>
            <mesh position={[0, 0, 0]}><sphereGeometry args={[0.16, 12, 10]} /><meshBasicMaterial color={[2.6, 1.9, 1.1]} toneMapped={false} /></mesh>
          </group>
        ))}
        <group position={[-5.6, 0, 3.6]}><Kit piece="plant" s={0.8} /></group>
        <group position={[5.8, 0, 3.8]}><Kit piece="crate" s={0.8} /></group>
        <group position={[2.6, 0, 1.6]}><Kit piece="stool" s={1.2} /></group>
      </group>
      {Object.keys(STATIONS).map((id) => <StationSpot key={id} id={id} />)}
    </group>
  )
}
export { FLOOR_Y as WORKSHOP_FLOOR_Y }
