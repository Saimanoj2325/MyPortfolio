// The tour guide: the same engineer from the game, in a small pinned canvas.
// Talks in speech bubbles, follows the cursor with his head, can be grabbed and dropped,
// reacts to pokes, and has a "What should I do?" menu of clip-based and procedural actions.
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { ContactShadows, Html, useAnimations } from '@react-three/drei'
import { buildEngineer, crossPlay, OUTFITS, useEngineerGLTF } from '../three/engineerLook'
import { tourLines } from '../data/tour'
import { useGuide, type GuideAction } from './guideStore'

const DUR: Record<GuideAction, number> = { Wave: 2.4, Dance: 4.2, Panic: 3, Jump: 1.5, Sneeze: 2, Sulk: 4.5, Selfie: 2.8, Type: 4, Poke: 0.9, Talk: 0 }
const HOME_YAW = -0.32
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)]

export const guideRuntime = { talkingUntil: 0 }

const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _q3 = new THREE.Quaternion()

/** rotate `bone` (in world space) so the direction to `child` points along `dirWorld`, blended by w */
function aimBone(bone: THREE.Object3D, child: THREE.Object3D, dirWorld: THREE.Vector3, w: number) {
  bone.updateWorldMatrix(true, false)
  child.updateWorldMatrix(false, false)
  const a = _v.setFromMatrixPosition(bone.matrixWorld)
  const b = _v2.setFromMatrixPosition(child.matrixWorld)
  const d = b.sub(a).normalize()
  const delta = _q.setFromUnitVectors(d, dirWorld)
  const world = bone.getWorldQuaternion(_q2)
  const target = _q3.copy(delta).multiply(world)
  world.slerp(target, w)
  const parentQ = bone.parent ? bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert() : new THREE.Quaternion()
  bone.quaternion.copy(parentQ.multiply(world))
  bone.updateMatrixWorld(true)
}

function GuideCharacter() {
  const gltf = useEngineerGLTF()
  const model = useMemo(() => buildEngineer(gltf.scene, OUTFITS.hero, 1.72), [gltf.scene])
  const group = useRef<THREE.Group>(null)
  const { actions } = useAnimations(gltf.animations, group)
  const current = useRef<{ name: string | null }>({ name: null })
  const bones = useMemo(() => {
    const m: Record<string, THREE.Bone> = {}
    model.traverse((o) => { if ((o as THREE.Bone).isBone) m[o.name] = o as THREE.Bone })
    return m
  }, [model])
  const st = useRef({
    action: null as GuideAction | null, actionT: 0, actionKey: 0,
    drag: false, grab: new THREE.Vector3(), downAt: new THREE.Vector2(), moved: 0, vx: 0, lastX: 0,
    pos: new THREE.Vector3(), vy: 0, falling: false, landT: -1, walking: false, yaw: HOME_YAW, pokes: 0,
  })
  const { camera, pointer, viewport, gl } = useThree()
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), [])
  const ray = useMemo(() => new THREE.Raycaster(), [])

  useEffect(() => {
    crossPlay(actions, current.current, 'Idle', 0)
  }, [actions])

  // action requests from the menu / page
  const action = useGuide((s) => s.action)
  useEffect(() => {
    if (!action || action.key === st.current.actionKey) return
    st.current.actionKey = action.key
    if (st.current.drag || st.current.falling) return
    st.current.action = action.name
    st.current.actionT = 0
    const line = tourLines.actions[action.name]
    if (line) useGuide.getState().say(line, { hold: 2600, force: true })
    if (action.name === 'Selfie') setTimeout(() => window.dispatchEvent(new Event('guide-flash')), 1500)
  }, [action])

  const worldAtPointer = (out: THREE.Vector3) => {
    ray.setFromCamera(pointer, camera)
    ray.ray.intersectPlane(plane, out)
    return out
  }

  const onDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
    const s = st.current
    s.drag = true
    s.moved = 0
    s.downAt.set(e.clientX, e.clientY)
    const p = worldAtPointer(new THREE.Vector3())
    s.grab.copy(p).sub(s.pos)
    s.action = null
    gl.domElement.style.cursor = 'grabbing'
  }
  const onMove = (e: ThreeEvent<PointerEvent>) => {
    const s = st.current
    if (!s.drag) return
    s.moved = Math.max(s.moved, Math.hypot(e.clientX - s.downAt.x, e.clientY - s.downAt.y))
    if (s.moved > 6 && !s.falling && current.current.name !== 'JumpLoop') useGuide.getState().say(pick(tourLines.drag), { hold: 1800, force: true })
  }
  const onUp = (e: ThreeEvent<PointerEvent>) => {
    const s = st.current
    if (!s.drag) return
    ;(e.target as Element).releasePointerCapture?.(e.pointerId)
    s.drag = false
    gl.domElement.style.cursor = ''
    if (s.moved < 6) {
      // poke / tickle
      s.pokes++
      const g = useGuide.getState()
      if (s.pokes % 6 === 0) { g.act('Dance'); g.say('Fine, you win. Dance break.', { hold: 2600, force: true }) }
      else { s.action = 'Poke'; s.actionT = 0; g.say(tourLines.poke[(s.pokes - 1) % tourLines.poke.length], { hold: 2000, force: true }) }
      return
    }
    if (s.pos.y > 0.02) { s.falling = true; s.vy = 0 }
  }

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 1 / 30)
    const g = group.current
    if (!g) return
    const s = st.current
    const t = state.clock.elapsedTime
    const halfW = viewport.getCurrentViewport(camera, new THREE.Vector3(0, 1, 0)).width / 2 - 0.45

    // ---- position: drag / fall / walk home ----
    if (s.drag) {
      const p = worldAtPointer(_v).sub(s.grab)
      p.x = THREE.MathUtils.clamp(p.x, -halfW, halfW)
      p.y = THREE.MathUtils.clamp(p.y, 0, 1.6)
      s.vx = (p.x - s.lastX) / Math.max(dt, 1e-3)
      s.lastX = p.x
      s.pos.x = THREE.MathUtils.damp(s.pos.x, p.x, 18, dt)
      s.pos.y = THREE.MathUtils.damp(s.pos.y, p.y, 18, dt)
      crossPlay(actions, current.current, 'JumpLoop', 0.2)
    } else if (s.falling) {
      s.vy -= 20 * dt
      s.pos.y += s.vy * dt
      crossPlay(actions, current.current, 'JumpLoop', 0.15)
      if (s.pos.y <= 0) {
        s.pos.y = 0; s.falling = false; s.landT = 0
        crossPlay(actions, current.current, 'JumpLand', 0.08, true)
        useGuide.getState().say(pick(tourLines.dropped), { hold: 2200, force: true })
      }
    } else if (s.landT >= 0) {
      s.landT += dt
      if (s.landT > 0.9) { s.landT = -1; s.walking = Math.abs(s.pos.x) > 0.08 }
    } else if (s.walking) {
      const dir = Math.sign(-s.pos.x)
      s.pos.x += dir * 1.0 * dt
      s.yaw = THREE.MathUtils.damp(s.yaw, dir * Math.PI / 2, 8, dt)
      crossPlay(actions, current.current, 'Walk', 0.25)
      if (Math.abs(s.pos.x) < 0.05 || Math.sign(-s.pos.x) !== dir) { s.pos.x = 0; s.walking = false }
    }

    // ---- actions & idle/talk ----
    let yawTarget = HOME_YAW
    let lean = 0
    let bob = 0
    const free = !s.drag && !s.falling && s.landT < 0 && !s.walking
    if (free) {
      if (s.action) {
        s.actionT += dt
        const a = s.action, k = s.actionT
        if (a === 'Dance') crossPlay(actions, current.current, 'Dance', 0.3)
        else if (a === 'Type') crossPlay(actions, current.current, 'Fix', 0.4)
        else if (a === 'Sulk') { crossPlay(actions, current.current, 'Sit', 0.5); yawTarget = HOME_YAW + 2.5 }
        else if (a === 'Panic') { crossPlay(actions, current.current, 'Run', 0.2, false, 1.35); yawTarget = HOME_YAW + Math.sin(k * 7) * 1.4 }
        else if (a === 'Jump') {
          if (k < 1.0) { crossPlay(actions, current.current, 'JumpLoop', 0.12); bob = Math.sin(Math.min(k / 0.9, 1) * Math.PI) * 0.65 }
          else crossPlay(actions, current.current, 'JumpLand', 0.08, true)
        } else if (a === 'Poke') crossPlay(actions, current.current, 'Hit', 0.08, true)
        else if (a === 'Sneeze') {
          crossPlay(actions, current.current, 'Idle', 0.3)
          lean = k < 1.0 ? -0.2 * THREE.MathUtils.smoothstep(k, 0, 1) : k < 1.18 ? THREE.MathUtils.lerp(-0.2, 0.42, (k - 1) / 0.18) : 0.42 * Math.exp(-(k - 1.18) * 5)
          bob = k > 1.0 && k < 1.35 ? Math.sin(((k - 1) / 0.35) * Math.PI) * 0.12 : 0
        } else crossPlay(actions, current.current, 'Idle', 0.3)
        if (k > DUR[a]) s.action = null
      } else {
        crossPlay(actions, current.current, performance.now() < guideRuntime.talkingUntil ? 'Talk' : 'Idle', 0.45)
      }
      s.yaw = THREE.MathUtils.damp(s.yaw, yawTarget, s.action === 'Panic' ? 14 : 5, dt)
    } else if (s.drag) {
      s.yaw = THREE.MathUtils.damp(s.yaw, HOME_YAW * 0.3, 6, dt)
    }

    g.position.set(s.pos.x, s.pos.y + bob, 0)
    g.rotation.set(lean, s.yaw, s.drag ? THREE.MathUtils.clamp(-s.vx * 0.04, -0.5, 0.5) : THREE.MathUtils.damp(g.rotation.z, 0, 8, dt))

    // ---- procedural arm poses (after the mixer) ----
    const ua = bones['upperarm_r'], la = bones['lowerarm_r'], hand = bones['hand_r']
    if (ua && la && hand && free && (s.action === 'Wave' || s.action === 'Selfie')) {
      g.updateMatrixWorld(true)
      const side = Math.sign(g.worldToLocal(ua.getWorldPosition(new THREE.Vector3())).x) || -1
      const k = s.actionT
      const env = Math.min(1, k / 0.3) * Math.min(1, (DUR[s.action] - k) / 0.35)
      const toWorld = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z).normalize().applyQuaternion(g.getWorldQuaternion(new THREE.Quaternion()))
      if (s.action === 'Wave') {
        aimBone(ua, la, toWorld(side * 0.75, 0.75, 0.2), env)
        aimBone(la, hand, toWorld(side * (0.15 + Math.sin(k * 10) * 0.45), 1, 0.25), env)
      } else {
        aimBone(ua, la, toWorld(side * 0.45, 0.35, 0.85), env)
        aimBone(la, hand, toWorld(side * 0.05, 0.75, 0.65), env)
      }
    }
    // ---- head follows the cursor ----
    const head = bones['Head']
    if (head && !s.drag && s.action !== 'Sulk' && s.action !== 'Panic') {
      g.updateMatrixWorld(true)
      const hp = head.getWorldPosition(new THREE.Vector3())
      const target = worldAtPointer(new THREE.Vector3()).setZ(2.2)
      const dir = target.sub(hp).normalize()
      const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(g.getWorldQuaternion(new THREE.Quaternion()))
      const ang = fwd.angleTo(dir)
      const lim = Math.min(1, 0.7 / Math.max(ang, 1e-3))
      const q = new THREE.Quaternion().setFromUnitVectors(fwd, dir)
      const w = 0.65 * Math.min(1, lim)
      const world = head.getWorldQuaternion(new THREE.Quaternion())
      const tgt = q.multiply(world.clone())
      world.slerp(tgt, w)
      const parentQ = head.parent!.getWorldQuaternion(new THREE.Quaternion()).invert()
      head.quaternion.copy(parentQ.multiply(world))
    }
    void t
  })

  return (
    <group ref={group}>
      <primitive object={model} />
      <mesh position={[0, 0.9, 0]} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
        onPointerOver={() => { gl.domElement.style.cursor = 'grab' }} onPointerOut={() => { if (!st.current.drag) gl.domElement.style.cursor = '' }}>
        <capsuleGeometry args={[0.32, 1.2, 4, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <Html position={[0, 2.02, 0]} center zIndexRange={[40, 0]} wrapperClass="bubble-anchor">
        <Bubble />
      </Html>
    </group>
  )
}

/** typewriter speech bubble */
function Bubble() {
  const text = useGuide((s) => s.text)
  const key = useGuide((s) => s.key)
  const buttons = useGuide((s) => s.buttons)
  const [shown, setShown] = useState('')
  useEffect(() => {
    if (!text) { setShown(''); return }
    let i = 0
    setShown('')
    guideRuntime.talkingUntil = performance.now() + text.length * 26 + 500
    const id = setInterval(() => {
      i += 1
      setShown(text.slice(0, i))
      if (i >= text.length) clearInterval(id)
    }, 24)
    return () => clearInterval(id)
  }, [text, key])
  if (!text) return null
  return (
    <div className="bubble" key={key} role="status" aria-live="polite">
      <p><span aria-hidden>{shown}</span><span className="sr-only">{text}</span><span className="bubble-ghost" aria-hidden>{text}</span></p>
      {buttons && shown.length >= text.length && (
        <div className="bubble-btns">
          {buttons.map((b) => <button key={b.label} onClick={b.onClick}>{b.label}</button>)}
        </div>
      )}
    </div>
  )
}

function Rig() {
  const { camera, size } = useThree()
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera
    const narrow = size.width / size.height < 0.7
    cam.fov = narrow ? 34 : 30
    cam.position.set(0, 1.2, narrow ? 6.2 : 5.6)
    cam.lookAt(0, 1.08, 0)
    cam.updateProjectionMatrix()
  }, [camera, size])
  return null
}

const ACTIONS: GuideAction[] = ['Wave', 'Dance', 'Jump', 'Panic', 'Sneeze', 'Sulk', 'Selfie', 'Type']

export function Guide() {
  const [menu, setMenu] = useState(false)
  const [flash, setFlash] = useState(0)
  useEffect(() => {
    const f = () => setFlash((k) => k + 1)
    window.addEventListener('guide-flash', f)
    return () => window.removeEventListener('guide-flash', f)
  }, [])
  return (
    <aside className="guide" aria-label="Guide character">
      <div className="guide-stage">
        <Canvas shadows dpr={[1, 1.75]} camera={{ fov: 30, position: [0, 1.2, 5.6] }} gl={{ alpha: true, antialias: true }}
          onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.05 }}>
          <Rig />
          <hemisphereLight args={['#f6efe2', '#8e8778', 1.3]} />
          <directionalLight position={[2.5, 5, 4]} intensity={2.2} color="#ffe6c9" castShadow shadow-mapSize={[1024, 1024]} />
          <directionalLight position={[-4, 2, -3]} intensity={0.8} color="#9fb2cc" />
          <Suspense fallback={null}>
            <GuideCharacter />
          </Suspense>
          <ContactShadows position={[0, 0.001, 0]} opacity={0.32} scale={8} blur={2.6} far={3} color="#3a3530" />
        </Canvas>
        {flash > 0 && <i key={flash} className="guide-flash" />}
      </div>
      <div className={`guide-menu ${menu ? 'is-open' : ''}`}>
        <button className="guide-menu-toggle" onClick={() => setMenu((v) => !v)} aria-expanded={menu}>
          <span>{tourLines.menu}</span>
          <svg width="10" height="10" viewBox="0 0 24 24" aria-hidden><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" /></svg>
        </button>
        <div className="guide-menu-list" role="menu">
          {ACTIONS.map((a) => (
            <button key={a} role="menuitem" onClick={() => { useGuide.getState().act(a); setMenu(false) }}>{a}</button>
          ))}
        </div>
      </div>
    </aside>
  )
}
