// A scarlet macaw, built procedurally: hooked two-part beak, bare white face patch with an eye
// highlight, layered wing feathers in red / yellow / blue bands, long tapered tail.
// Behaviours: spline flights (flap on climb, glide on descent, flare + fold on landing),
// perched idles (head bob, tilt, preen, ruffle), head tracking of the player, click/E reactions.
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { boat, parrot, player } from '../lib/actors'
import { registerInteractable } from '../lib/interact'
import { useStore } from '../store'
import { parrotHints } from '../data/story'
import { chapterOf } from '../story/machine'
import { playSfx } from '../ui/sound'
import { angleDiff, dampAngle } from './Player'
import { featherMap, flightFeatherMap } from './proceduralTex'

// ───────────────────────── geometry helpers
/** a tube whose radius tapers along a curve (beak, tail shafts) */
function taperTube(curve: THREE.Curve<THREE.Vector3>, r0: number, r1: number, segs = 14, radial = 8, flatten = 1) {
  const frames = curve.computeFrenetFrames(segs, false)
  const pos: number[] = [], idx: number[] = []
  for (let i = 0; i <= segs; i++) {
    const t = i / segs
    const p = curve.getPointAt(t)
    const r = THREE.MathUtils.lerp(r0, r1, Math.pow(t, 0.9))
    const N = frames.normals[i], B = frames.binormals[i]
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2
      const c = Math.cos(a) * r, s = Math.sin(a) * r * flatten
      pos.push(p.x + N.x * c + B.x * s, p.y + N.y * c + B.y * s, p.z + N.z * c + B.z * s)
    }
  }
  for (let i = 0; i < segs; i++) for (let j = 0; j < radial; j++) {
    const a = i * (radial + 1) + j, b = a + radial + 1
    idx.push(a, b, a + 1, b, b + 1, a + 1)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

/** a textured feather plane (alpha-cut vane + barbs) with a root → tip colour gradient.
 * Lies in the YZ plane, root at the origin, pointing down (-y). */
function feather(len: number, width: number, root: string, tip: string, tipStart = 0.6) {
  const g = new THREE.PlaneGeometry(width, len, 1, 6)
  g.translate(0, -len / 2, 0)
  const pos = g.getAttribute('position') as THREE.BufferAttribute
  const col = new Float32Array(pos.count * 3)
  const cr = new THREE.Color(root), ct = new THREE.Color(tip), c = new THREE.Color()
  for (let i = 0; i < pos.count; i++) {
    const t = -pos.getY(i) / len
    c.copy(cr).lerp(ct, THREE.MathUtils.smoothstep(t, tipStart - 0.22, tipStart + 0.18))
    col.set([c.r, c.g, c.b], i * 3)
    // a gentle cup across the vane
    pos.setZ(i, -Math.abs(pos.getX(i)) * 0.18)
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3))
  g.rotateY(Math.PI / 2)
  g.computeVertexNormals()
  return g
}

const RED = '#c42a1f', RED_DEEP = '#9c1d16', YELLOW = '#f0b43a', GREEN = '#4f9a4a', BLUE = '#2c62b8', BLUE_DEEP = '#1c428f'

type Wing = { shoulder: THREE.Group; wrist: THREE.Group; feathers: THREE.Mesh[] }

function buildParrot() {
  const root = new THREE.Group()
  const fmap = flightFeatherMap()
  const featherMat = new THREE.MeshStandardMaterial({ map: fmap, vertexColors: true, alphaTest: 0.45, roughness: 0.55, side: THREE.DoubleSide })
  const plumage = (color: string, rep = 2) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.62, map: featherMap().clone() })
    m.map!.repeat.set(rep, rep * 1.4); m.map!.needsUpdate = true
    return m
  }
  const red = plumage(RED), redHead = plumage('#cf3022', 3)
  const face = new THREE.MeshStandardMaterial({ color: '#f3eee4', roughness: 0.8 })
  const beakMat = new THREE.MeshStandardMaterial({ color: '#ebe2d0', roughness: 0.32 })
  const beakDark = new THREE.MeshStandardMaterial({ color: '#232020', roughness: 0.35 })
  const eyeMat = new THREE.MeshStandardMaterial({ color: '#0d0d0d', roughness: 0.05 })
  const irisMat = new THREE.MeshStandardMaterial({ color: '#f2e6b2', roughness: 0.4 })
  const footMat = new THREE.MeshStandardMaterial({ color: '#56504d', roughness: 0.85 })
  const shine = new THREE.MeshBasicMaterial({ color: '#ffffff' })

  const body = new THREE.Group() // pitches during flight
  root.add(body)
  // torso: a smooth lathed teardrop, leaning forward
  const prof = [[0.0, 0.04], [0.03, 0.05], [0.064, 0.09], [0.08, 0.15], [0.077, 0.21], [0.064, 0.27], [0.05, 0.315], [0.0, 0.335]].map(([r, y]) => new THREE.Vector2(r, y))
  const torso = new THREE.Mesh(new THREE.LatheGeometry(prof, 28), red)
  torso.scale.set(0.9, 1.04, 1.02) // slimmer, longer: a macaw, not an egg
  torso.rotation.x = 0.4
  body.add(torso)

  // head (pivot at the top of the neck)
  const head = new THREE.Group()
  head.position.set(0, 0.325, 0.112)
  body.add(head)
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.068, 26, 20), redHead)
  skull.scale.set(0.88, 0.93, 1.08)
  skull.position.set(0, 0.025, 0)
  head.add(skull)
  // bare white face skin: thin shells that hug the skull surface from the eye down to the beak base
  // (each oriented along the local surface normal, so it reads as skin, not as a bolt-on disc),
  // with the macaw's fine rows of tiny red feathers and the eye set in the upper half
  for (const sx of [-1, 1]) {
    const fg = new THREE.Group()
    fg.position.set(sx * 0.041, 0.006, 0.047) // slightly sunk into the skull: flush skin, no side discs
    fg.rotation.y = -sx * 0.53 // local ±x = outward normal, local +z = forward along the cheek
    head.add(fg)
    const patch = new THREE.Mesh(new THREE.SphereGeometry(0.044, 20, 14), face)
    patch.scale.set(0.16, 0.6, 0.72)
    fg.add(patch)
    for (let k = 0; k < 4; k++) {
      const line = new THREE.Mesh(new THREE.BoxGeometry(0.0016, 0.0022, 0.03 - k * 0.004), new THREE.MeshBasicMaterial({ color: '#b2463a' }))
      line.position.set(sx * 0.0086, -0.008 - k * 0.0072, 0.004)
      fg.add(line)
    }
    // eye: pale-yellow iris ring, black pupil, a dark lid rim and a catch-light
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.0098, 0.0018, 6, 18), beakDark)
    rim.rotation.y = Math.PI / 2
    rim.position.set(sx * 0.0082, 0.015, -0.01)
    fg.add(rim)
    const iris = new THREE.Mesh(new THREE.SphereGeometry(0.0094, 14, 10), irisMat)
    iris.scale.set(0.55, 1, 1)
    iris.position.set(sx * 0.0066, 0.015, -0.01)
    fg.add(iris)
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.0056, 12, 10), eyeMat)
    eye.position.set(sx * 0.0104, 0.015, -0.009)
    fg.add(eye)
    const hl = new THREE.Mesh(new THREE.SphereGeometry(0.0019, 6, 6), shine)
    hl.position.set(sx * 0.0152, 0.0182, -0.0068)
    fg.add(hl)
  }
  // big hooked upper mandible, dark tip, short dark lower mandible
  const upper = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.026, 0.045), new THREE.Vector3(0, 0.034, 0.08), new THREE.Vector3(0, 0.016, 0.118), new THREE.Vector3(0, -0.024, 0.124), new THREE.Vector3(0, -0.05, 0.108),
  ])
  head.add(new THREE.Mesh(taperTube(upper, 0.04, 0.004, 22, 14, 0.82), beakMat))
  const tipC = new THREE.CatmullRomCurve3([new THREE.Vector3(0, -0.02, 0.124), new THREE.Vector3(0, -0.038, 0.12), new THREE.Vector3(0, -0.051, 0.107)])
  head.add(new THREE.Mesh(taperTube(tipC, 0.011, 0.003, 6, 8, 0.8), beakDark))
  const ridge = new THREE.CatmullRomCurve3([new THREE.Vector3(0, -0.004, 0.06), new THREE.Vector3(0.0, -0.01, 0.1)])
  head.add(new THREE.Mesh(taperTube(ridge, 0.004, 0.003, 4, 6, 1), beakDark))
  const lower = new THREE.CatmullRomCurve3([new THREE.Vector3(0, -0.014, 0.042), new THREE.Vector3(0, -0.03, 0.07), new THREE.Vector3(0, -0.034, 0.094)])
  const lowerMesh = new THREE.Mesh(taperTube(lower, 0.03, 0.01, 10, 12, 0.92), beakDark)
  head.add(lowerMesh)

  // folded wings: layered bands along the body side (red coverts, yellow, green, blue flight feathers)
  const folded: THREE.Group[] = []
  const BANDS: [number, number, number, string, string, number, number, number][] = [
    // [count, length, width, root, tip, y offset, outward, z spread]  — long primaries at the back, coverts on top
    [7, 0.29, 0.05, BLUE, BLUE_DEEP, -0.06, 0.004, 0.06],
    [6, 0.19, 0.052, GREEN, BLUE, -0.035, 0.011, 0.075],
    [6, 0.12, 0.05, YELLOW, '#c9a33a', -0.014, 0.018, 0.08],
    [6, 0.08, 0.05, RED, RED_DEEP, 0.0, 0.024, 0.075],
  ]
  for (const side of [-1, 1]) {
    const w = new THREE.Group()
    // the wing lies along the body's side and follows its forward lean (torso.rotation.x), tips reaching the tail
    w.position.set(side * 0.068, 0.29, 0.088)
    w.rotation.set(0.42, 0, side * 0.025)
    body.add(w)
    for (const [n, len, wd, rc, tc, yo, out, spread] of BANDS) {
      for (let i = 0; i < n; i++) {
        const m = new THREE.Mesh(feather(len, wd, rc, tc, 0.55), featherMat)
        const t = i / (n - 1)
        // follow the body's curve: feathers further back sit slightly further in
        m.position.set(side * (out + 0.004 - t * 0.012), yo - t * 0.012, 0.035 - t * spread)
        m.rotation.set(-0.06 - t * 0.1, 0, side * -0.06 * t)
        w.add(m)
      }
    }
    folded.push(w)
  }

  // spread wings (flight): textured flight feathers fanned out sideways
  const wings: Wing[] = []
  for (const side of [-1, 1]) {
    const shoulder = new THREE.Group()
    shoulder.position.set(side * 0.07, 0.27, 0.03)
    body.add(shoulder)
    const feathers: THREE.Mesh[] = []
    const arm = new THREE.Group()
    shoulder.add(arm)
    const flatF = (len: number, wd: number, rc: string, tc: string, ts: number) => { const g = feather(len, wd, rc, tc, ts); g.rotateZ(Math.PI / 2 * 0); return g }
    for (let i = 0; i < 7; i++) {
      const x = side * (0.02 + i * 0.033)
      for (const [len, wd, rc, tc, ts, y] of [[0.24, 0.055, GREEN, BLUE, 0.35, -0.004], [0.12, 0.05, YELLOW, GREEN, 0.7, 0.004], [0.07, 0.05, RED, RED_DEEP, 0.8, 0.01]] as [number, number, string, string, number, number][]) {
        const f = new THREE.Mesh(flatF(len, wd, rc, tc, ts), featherMat)
        f.rotation.set(Math.PI / 2, -Math.PI / 2, 0) // lie flat, point backward
        f.position.set(x, y, 0.025)
        arm.add(f)
        if (len > 0.2) feathers.push(f)
      }
    }
    const wrist = new THREE.Group()
    wrist.position.set(side * 0.24, 0, 0.015)
    shoulder.add(wrist)
    for (let i = 0; i < 8; i++) {
      const fan = new THREE.Group()
      fan.rotation.y = side * (0.08 + i * 0.13)
      fan.position.set(side * (0.005 + i * 0.016), -0.006 + i * 0.001, 0.005)
      const f = new THREE.Mesh(flatF(0.32 + i * 0.012, 0.055, BLUE, BLUE_DEEP, 0.6), featherMat)
      f.rotation.set(Math.PI / 2, -Math.PI / 2, 0)
      fan.add(f)
      wrist.add(fan); feathers.push(f)
    }
    wings.push({ shoulder, wrist, feathers })
  }

  // tail: long tapered feathers, red with blue tips (outer ones bluer)
  const tail = new THREE.Group()
  tail.position.set(0, 0.075, -0.06)
  body.add(tail)
  const tailFeathers: THREE.Mesh[] = []
  const TL = [0.42, 0.52, 0.6, 0.6, 0.52, 0.42]
  TL.forEach((len, i) => {
    const outer = Math.abs(i - 2.5) > 1.5
    const g = feather(len, 0.05, outer ? '#b6342a' : RED, BLUE, outer ? 0.4 : 0.66)
    g.rotateY(Math.PI / 2) // face the vane backward (tail is a flat fan)
    const f = new THREE.Mesh(g, featherMat)
    f.position.set((i - 2.5) * 0.012, 0, -0.004 * Math.abs(i - 2.5))
    f.rotation.z = (i - 2.5) * 0.035
    tail.add(f)
    tailFeathers.push(f)
  })
  // feet: zygodactyl grip (two toes forward, two back)
  const feet = new THREE.Group()
  feet.position.set(0, 0.04, 0.035)
  body.add(feet)
  for (const sx of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.013, 0.05, 6), footMat)
    leg.position.set(sx * 0.03, 0, 0)
    feet.add(leg)
    for (const [dz, ry] of [[0.026, 0.25], [0.026, -0.25], [-0.022, 0.35], [-0.022, -0.35]]) {
      const toe = new THREE.Mesh(new THREE.CapsuleGeometry(0.0065, 0.03, 3, 6), footMat)
      toe.rotation.set(Math.PI / 2, 0, ry)
      toe.position.set(sx * 0.03 + ry * 0.025, -0.03, dz)
      feet.add(toe)
    }
  }
  root.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.castShadow = true } })
  return { root, body, head, wings, folded, tail, tailFeathers, feet, lowerMesh, torso }
}

// ───────────────────────── behaviour API (used by the director)
export function flyTo(x: number, y: number, z: number, onLand?: () => void, dur?: number) {
  const a = parrot.pos.clone()
  const b = new THREE.Vector3(x, y, z)
  const d = a.distanceTo(b)
  const top = Math.max(a.y, b.y) + Math.min(4, 1 + d * 0.18)
  const dir = b.clone().sub(a).setY(0).normalize()
  const pts = [
    a.clone(),
    a.clone().addScaledVector(dir, Math.min(2, d * 0.15)).setY(a.y + 1.0),
    a.clone().lerp(b, 0.5).setY(top),
    b.clone().addScaledVector(dir, -Math.min(2.5, d * 0.2)).setY(b.y + 1.1),
    b.clone(),
  ]
  parrot.flight = { curve: new THREE.CatmullRomCurve3(pts, false, 'centripetal'), t: 0, dur: dur ?? THREE.MathUtils.clamp(d / 6.5, 1.6, 6), onLand }
  parrot.mode = 'fly'
}
export function placeParrot(x: number, y: number, z: number, yaw = 0) {
  parrot.pos.set(x, y, z); parrot.perch.set(x, y, z); parrot.yaw = yaw; parrot.mode = 'perch'; parrot.flight = null
}

/** squawk with a contextual line, flap, maybe hop along the perch */
export function parrotReact() {
  const s = useStore.getState()
  if (parrot.mode !== 'perch' || parrot.reactT > 0) return
  const ch = chapterOf(s.story.beat)
  const pool = parrotHints[ch] ?? parrotHints[1]
  const text = pool[Math.floor(Math.random() * pool.length)]
  s.setAmbient({ who: 'parrot', text })
  parrot.reactT = 1.4
  playSfx('squawk')
  // hop along the roof ridge (x axis) when on the house
  if (parrot.perch.y > 5) {
    const nx = THREE.MathUtils.clamp(parrot.perch.x + (Math.random() < 0.5 ? -0.7 : 0.7), -11.4, -6.6)
    parrot.hopTo = new THREE.Vector3(nx, parrot.perch.y, parrot.perch.z)
  }
}

function ParrotBeacon() {
  const beaconRef = useRef<THREE.Group>(null)
  const ringRef = useRef<THREE.Mesh>(null)
  const diamondRef = useRef<THREE.Mesh>(null)
  const ringMatRef = useRef<THREE.MeshBasicMaterial>(null)
  const diaMatRef = useRef<THREE.MeshBasicMaterial>(null)
  const beat = useStore((s) => s.story.beat)

  useFrame((state, dt) => {
    if (!beaconRef.current) return
    const isGuiding = beat === 'c2_follow' || beat === 'c2_arrive'
    if (!isGuiding || parrot.mode === 'hidden') {
      beaconRef.current.visible = false
      return
    }
    beaconRef.current.visible = true
    const t = state.clock.elapsedTime
    const dist = player.pos.distanceTo(parrot.pos)
    const alpha = THREE.MathUtils.clamp((dist - 2.5) / 3.0, 0, 0.85)

    if (ringMatRef.current) ringMatRef.current.opacity = alpha * (0.6 + Math.sin(t * 3.5) * 0.25)
    if (diaMatRef.current) diaMatRef.current.opacity = alpha * 0.95

    if (diamondRef.current) {
      diamondRef.current.position.y = 0.52 + Math.sin(t * 3) * 0.05
      diamondRef.current.rotation.y += dt * 1.8
      diamondRef.current.rotation.x = Math.sin(t * 2) * 0.15
    }
    if (ringRef.current) {
      ringRef.current.position.y = 0.45 + Math.sin(t * 3) * 0.03
      const s = 1 + Math.sin(t * 4) * 0.12
      ringRef.current.scale.set(s, s, s)
      ringRef.current.rotation.z += dt * 0.8
    }
  })

  return (
    <group ref={beaconRef} visible={false}>
      <mesh ref={diamondRef} position={[0, 0.52, 0]}>
        <octahedronGeometry args={[0.07, 0]} />
        <meshBasicMaterial ref={diaMatRef} color="#ffb703" transparent opacity={0.9} depthWrite={false} />
      </mesh>
      <mesh ref={ringRef} position={[0, 0.45, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.14, 0.22, 32]} />
        <meshBasicMaterial ref={ringMatRef} color="#fbbf24" transparent opacity={0.65} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </group>
  )
}

export function Parrot() {
  const p = useMemo(buildParrot, [])
  const group = useRef<THREE.Group>(null)
  const st = useRef({ flap: 0, fold: 1, headYaw: 0, headTilt: 0, idle: 0, idleKind: 0, hopT: 0, hopFrom: new THREE.Vector3(), pitch: 0, bank: 0, prevPos: new THREE.Vector3() })

  useEffect(() => registerInteractable({
    id: 'parrot', space: 'world', at: parrot.pos, radius: 4.2, label: 'Parrot', verb: 'Talk to the parrot', priority: 2,
    enabled: () => parrot.mode === 'perch' && useStore.getState().story.beat !== 'c2_arrive', onInteract: parrotReact,
  }), [])

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 1 / 30)
    const g = group.current
    if (!g) return
    g.visible = parrot.mode !== 'hidden'
    if (!g.visible) return
    const S = st.current
    const t = state.clock.elapsedTime
    S.prevPos.copy(parrot.pos)
    let flying = false, climbing = 0, landing = 0
    if (parrot.mode === 'fly' && parrot.flight) {
      const f = parrot.flight
      f.t = Math.min(1, f.t + dt / f.dur)
      const e = f.t < 0.5 ? 2 * f.t * f.t : 1 - Math.pow(-2 * f.t + 2, 2) / 2
      f.curve.getPointAt(e, parrot.pos)
      const tan = f.curve.getTangentAt(Math.min(0.999, e))
      const yawTo = Math.atan2(tan.x, tan.z)
      S.bank = THREE.MathUtils.damp(S.bank, THREE.MathUtils.clamp(angleDiff(parrot.yaw, yawTo) * 4, -0.6, 0.6), 4, dt)
      parrot.yaw = dampAngle(parrot.yaw, yawTo, 6, dt)
      climbing = tan.y
      landing = THREE.MathUtils.smoothstep(f.t, 0.82, 1)
      flying = true
      if (f.t >= 1) {
        parrot.mode = 'perch'
        parrot.perch.copy(parrot.pos)
        parrot.flight = null
        S.bank = 0
        f.onLand?.()
      }
    } else if (parrot.hopTo) {
      if (S.hopT === 0) S.hopFrom.copy(parrot.pos)
      S.hopT += dt / 0.45
      const k = Math.min(1, S.hopT)
      parrot.pos.lerpVectors(S.hopFrom, parrot.hopTo, k)
      parrot.pos.y += Math.sin(k * Math.PI) * 0.25
      if (k >= 1) { parrot.perch.copy(parrot.hopTo); parrot.hopTo = null; S.hopT = 0 }
    }

    if (parrot.ride && parrot.mode === 'perch') {
      parrot.pos.set(boat.pos.x + Math.sin(boat.yaw) * 1.32, boat.pos.y + 0.12, boat.pos.z + Math.cos(boat.yaw) * 1.32)
      parrot.perch.copy(parrot.pos)
    }
    // perched: face the player when close, else idle around
    const toPlayer = new THREE.Vector3().subVectors(player.head, parrot.pos)
    const dist = toPlayer.length()
    const yawToPlayer = Math.atan2(toPlayer.x, toPlayer.z)
    if (!flying) {
      if (dist < 14 || parrot.reactT > 0) parrot.yaw = dampAngle(parrot.yaw, yawToPlayer, parrot.reactT > 0 ? 6 : 1.2, dt)
    }

    // wings: flap (climb / take-off / flare), glide (descent), fold (perched)
    const flapRate = flying ? (climbing > 0.05 || landing > 0 || (parrot.flight && parrot.flight.t < 0.18) ? 13 : 0) : parrot.reactT > 0.6 ? 16 : 0
    S.fold = THREE.MathUtils.damp(S.fold, flying ? 0 : parrot.reactT > 0.6 ? 0.3 : 1, flying ? 8 : 5, dt)
    if (flapRate > 0) S.flap += dt * flapRate
    const flapAmp = flapRate > 0 ? 1 : 0
    parrot.flapAmt = THREE.MathUtils.damp(parrot.flapAmt, flapAmp, 6, dt)
    const glide = flying ? 0.08 + Math.sin(t * 2) * 0.04 : 0
    const open = 1 - S.fold
    p.wings.forEach((w, i) => {
      const side = i === 0 ? -1 : 1
      const beat = Math.sin(S.flap) * 0.95 * parrot.flapAmt
      const lag = Math.sin(S.flap - 0.9) * 0.55 * parrot.flapAmt
      w.shoulder.visible = open > 0.08
      w.shoulder.scale.setScalar(Math.max(0.001, open))
      w.shoulder.rotation.set(0, side * S.fold * 0.9, side * (beat + glide))
      w.wrist.rotation.set(0, side * S.fold * 0.8, side * lag)
      w.feathers.forEach((f, k) => { f.rotation.z = Math.sin(t * 9 + k) * 0.03 * (flying ? 1 : 0.3) })
    })
    p.folded.forEach((f) => { f.visible = S.fold > 0.35; f.scale.setScalar(Math.max(0.001, Math.min(1, (S.fold - 0.35) / 0.4))) })

    // body pitch: level in flight, upright when perched, flared on landing
    const pitchTarget = flying ? 0.95 - landing * 0.85 - climbing * 0.25 : 0
    S.pitch = THREE.MathUtils.damp(S.pitch, pitchTarget, 5, dt)
    p.body.rotation.set(S.pitch, 0, flying ? -S.bank : 0)
    p.tail.rotation.x = flying ? 0.55 - landing * 0.35 + Math.sin(t * 3) * 0.04 : 0.42 + Math.sin(t * 1.3) * 0.03
    p.feet.visible = !flying || landing > 0.4

    // head: track the player, bob, tilt, preen idles
    S.idle -= dt
    if (S.idle <= 0) { S.idle = 2 + Math.random() * 3.5; S.idleKind = Math.floor(Math.random() * 4) }
    let hy = 0, hp = 0, ht = 0
    if (!flying) {
      if (dist < 12) {
        hy = THREE.MathUtils.clamp(angleDiff(parrot.yaw, yawToPlayer), -1.7, 1.7)
        hp = THREE.MathUtils.clamp(-Math.atan2(toPlayer.y, Math.hypot(toPlayer.x, toPlayer.z)) * 0.6, -0.3, 0.3)
        ht = Math.sin(t * 0.9) * 0.25 // curious tilt
      } else if (S.idleKind === 1 && S.idle > 1) { hy = 1.9; hp = 0.9; ht = 0.4 } // preen under the wing
      else if (S.idleKind === 2) { ht = 0.45 * Math.sin(t * 0.7) }
      hp += Math.max(0, Math.sin(t * 4.2)) * 0.12 // bob
    }
    S.headYaw = THREE.MathUtils.damp(S.headYaw, hy, 7, dt)
    S.headTilt = THREE.MathUtils.damp(S.headTilt, ht, 4, dt)
    p.head.rotation.set(THREE.MathUtils.damp(p.head.rotation.x, hp, 6, dt), S.headYaw, S.headTilt)
    p.lowerMesh.rotation.x = parrot.reactT > 0.8 ? Math.abs(Math.sin(t * 22)) * 0.25 : 0
    // ruffle idle: a quick puff of the body
    const ruff = !flying && S.idleKind === 3 && S.idle > 2 ? Math.sin(t * 30) * 0.03 + 0.05 : 0
    p.torso.scale.set(0.9 + ruff, 1.04 + ruff * 0.5, 1.02 + ruff)
    parrot.reactT = Math.max(0, parrot.reactT - dt)

    g.position.copy(parrot.pos)
    g.rotation.y = parrot.yaw
    g.updateMatrixWorld()
    p.head.getWorldPosition(parrot.head)
  })

  const onClick = (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); parrotReact() }
  return (
    <group ref={group} scale={1.25} onClick={onClick} onPointerOver={() => { document.body.style.cursor = 'pointer' }} onPointerOut={() => { document.body.style.cursor = '' }}>
      <primitive object={p.root} />
      <ParrotBeacon />
    </group>
  )
}
