import { useMemo, useRef, useState, useEffect } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { boat, camState, player } from '../lib/actors'
import { WATER_Y } from '../world/layout'
import { runtime, useStore } from '../store'
import { playSfx } from '../ui/sound'
import { puppyBark } from './Puppy'

// Coordinates of the bottle in the river (mid-river, slightly starboard of the crossing line)
export const RIVER_BOTTLE_INIT = new THREE.Vector3(4.4, WATER_Y + 0.04, -13.4)
export const riverBottlePos = RIVER_BOTTLE_INIT.clone()

/** Procedural cork top texture: realistic wood/cork grain rings and golden-amber warmth */
function createCorkTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')!

  // Warm golden amber base
  ctx.fillStyle = '#cf933d'
  ctx.fillRect(0, 0, 256, 256)

  // Concentric cork rings
  const cx = 128, cy = 128
  for (let r = 10; r < 125; r += 5 + Math.random() * 4) {
    ctx.beginPath()
    ctx.arc(cx + (Math.random() - 0.5) * 4, cy + (Math.random() - 0.5) * 4, r, 0, Math.PI * 2)
    ctx.strokeStyle = `rgba(${135 + Math.floor(Math.random() * 30)}, ${75 + Math.floor(Math.random() * 25)}, 20, 0.28)`
    ctx.lineWidth = 1.8 + Math.random() * 1.5
    ctx.stroke()
  }

  // Radial wood grain striations
  for (let i = 0; i < 48; i++) {
    const angle = (i / 48) * Math.PI * 2 + (Math.random() - 0.5) * 0.1
    const len = 70 + Math.random() * 50
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(cx + Math.cos(angle) * len, cy + Math.sin(angle) * len)
    ctx.strokeStyle = 'rgba(110, 60, 15, 0.16)'
    ctx.lineWidth = 1
    ctx.stroke()
  }

  // Dark porous cork specks
  for (let i = 0; i < 160; i++) {
    const px = Math.random() * 256
    const py = Math.random() * 256
    ctx.fillStyle = Math.random() > 0.4 ? 'rgba(95, 45, 10, 0.35)' : 'rgba(235, 185, 95, 0.4)'
    ctx.beginPath()
    ctx.arc(px, py, 0.8 + Math.random() * 1.5, 0, Math.PI * 2)
    ctx.fill()
  }

  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = THREE.ClampToEdgeWrapping
  tex.wrapT = THREE.ClampToEdgeWrapping
  return tex
}

/** Procedural parchment texture with scorched/aged burnt edges & ink writing */
function createParchmentTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const ctx = canvas.getContext('2d')!

  // Antique cream vellum background
  ctx.fillStyle = '#f8f1de'
  ctx.fillRect(0, 0, 512, 512)

  // Paper fiber mottling
  for (let i = 0; i < 600; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(215, 190, 150, 0.18)' : 'rgba(255, 255, 255, 0.22)'
    ctx.fillRect(Math.random() * 512, Math.random() * 512, 2 + Math.random() * 6, 2 + Math.random() * 6)
  }

  // Scorched / aged burnt brown edge bands (top & bottom edges of the rolled scroll)
  const burnGradientTop = ctx.createLinearGradient(0, 0, 0, 80)
  burnGradientTop.addColorStop(0, 'rgba(85, 36, 12, 0.95)')
  burnGradientTop.addColorStop(0.25, 'rgba(135, 68, 24, 0.75)')
  burnGradientTop.addColorStop(0.65, 'rgba(185, 120, 58, 0.35)')
  burnGradientTop.addColorStop(1, 'rgba(248, 241, 222, 0)')
  ctx.fillStyle = burnGradientTop
  ctx.fillRect(0, 0, 512, 80)

  const burnGradientBottom = ctx.createLinearGradient(0, 512, 0, 432)
  burnGradientBottom.addColorStop(0, 'rgba(85, 36, 12, 0.95)')
  burnGradientBottom.addColorStop(0.25, 'rgba(135, 68, 24, 0.75)')
  burnGradientBottom.addColorStop(0.65, 'rgba(185, 120, 58, 0.35)')
  burnGradientBottom.addColorStop(1, 'rgba(248, 241, 222, 0)')
  ctx.fillStyle = burnGradientBottom
  ctx.fillRect(0, 432, 512, 80)

  // Scorched right margin (the outer rolled edge of paper)
  const burnGradientRight = ctx.createLinearGradient(512, 0, 420, 0)
  burnGradientRight.addColorStop(0, 'rgba(92, 40, 14, 0.9)')
  burnGradientRight.addColorStop(0.3, 'rgba(150, 75, 28, 0.6)')
  burnGradientRight.addColorStop(1, 'rgba(248, 241, 222, 0)')
  ctx.fillStyle = burnGradientRight
  ctx.fillRect(420, 0, 92, 512)

  // Faint handwritten ink lines
  ctx.fillStyle = 'rgba(55, 40, 30, 0.45)'
  for (let y = 110; y < 410; y += 22) {
    let x = 40 + Math.random() * 15
    while (x < 460) {
      const wordLen = 14 + Math.random() * 38
      ctx.fillRect(x, y + (Math.random() - 0.5) * 2, wordLen, 3)
      x += wordLen + 8 + Math.random() * 12
    }
  }

  const tex = new THREE.CanvasTexture(canvas)
  return tex
}

/** Construct bottle geometry with double-wall glass thickness */
function useRealisticBottleGeometry() {
  return useMemo(() => {
    // 2D lathe profile with outer shell, collar rim, and inner cavity wall
    // Scale: ~0.11m radius, ~0.44m total length (prominent, beautiful scale in river)
    const pts: THREE.Vector2[] = [
      // Base punt (indented push-up at bottom of classic wine bottle)
      new THREE.Vector2(0, 0.024),
      new THREE.Vector2(0.035, 0.016),
      new THREE.Vector2(0.082, 0.005),
      new THREE.Vector2(0.104, 0.012), // bottom outer heel
      new THREE.Vector2(0.110, 0.038), // cylinder outer base
      new THREE.Vector2(0.110, 0.270), // cylinder outer body
      // Shoulder curve
      new THREE.Vector2(0.106, 0.315),
      new THREE.Vector2(0.092, 0.360),
      new THREE.Vector2(0.070, 0.405),
      new THREE.Vector2(0.050, 0.440),
      // Neck
      new THREE.Vector2(0.046, 0.485),
      new THREE.Vector2(0.045, 0.535),
      // Collar ring / thick bottle lip
      new THREE.Vector2(0.054, 0.545),
      new THREE.Vector2(0.054, 0.572),
      new THREE.Vector2(0.042, 0.572), // top outer lip rim
      // Inner neck wall
      new THREE.Vector2(0.036, 0.535),
      new THREE.Vector2(0.037, 0.460),
      // Inner shoulder & body cavity
      new THREE.Vector2(0.098, 0.340),
      new THREE.Vector2(0.101, 0.265),
      new THREE.Vector2(0.101, 0.042),
      new THREE.Vector2(0.076, 0.028),
      new THREE.Vector2(0, 0.038), // inner punt center
    ]

    const geo = new THREE.LatheGeometry(pts, 40)
    geo.computeVertexNormals()
    return geo
  }, [])
}

export function RiverBottle() {
  const bottleGeo = useRealisticBottleGeometry()
  const group = useRef<THREE.Group>(null)
  const pos = useRef(RIVER_BOTTLE_INIT.clone())
  const [noticed, setNoticed] = useState(false)
  const [drifting, setDrifting] = useState(false)

  const corkTex = useMemo(() => createCorkTexture(), [])
  const parchmentTex = useMemo(() => createParchmentTexture(), [])

  useEffect(() => {
    return () => {
      corkTex.dispose()
      parchmentTex.dispose()
    }
  }, [corkTex, parchmentTex])

  const state = useStore((s) => s.riverBottleState)
  const setNearby = useStore((s) => s.setNearby)
  const setDialogue = useStore((s) => s.setDialogue)
  const setRiverMessageOpen = useStore((s) => s.setRiverMessageOpen)
  const setRiverBottleState = useStore((s) => s.setRiverBottleState)

  // Realistic clear soda-lime glass with crisp specular highlight & subtle sea-glass aqua tint
  const glassMat = useMemo(() => {
    return new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#d4ede8'),
      roughness: 0.03,
      metalness: 0.02,
      transmission: 0.94,
      thickness: 0.18,
      ior: 1.52,
      transparent: true,
      opacity: 0.72,
      reflectivity: 0.95,
      clearcoat: 1.0,
      clearcoatRoughness: 0.03,
      depthWrite: false,
      specularIntensity: 1.2,
      specularColor: new THREE.Color('#ffffff'),
      attenuationColor: new THREE.Color('#286354'),
      attenuationDistance: 0.25,
    })
  }, [])

  // Deep green glass accent for the collar rim (matching the green bottle lip in the photo)
  const greenLipMat = useMemo(() => {
    return new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#225244'),
      roughness: 0.06,
      metalness: 0.05,
      transmission: 0.82,
      transparent: true,
      opacity: 0.88,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
      depthWrite: false,
    })
  }, [])

  // Cork materials: sides and textured top
  const corkBodyMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#cf933d', roughness: 0.88 }), [])
  const corkTopMat = useMemo(() => new THREE.MeshStandardMaterial({ map: corkTex, roughness: 0.85 }), [])

  // Parchment paper material with scorched edges
  const scrollMat = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      map: parchmentTex,
      roughness: 0.82,
      metalness: 0.02,
    })
  }, [parchmentTex])

  // Rustic hemp / jute twine cord material
  const twineMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#a67d48', roughness: 0.94 }), [])

  // Smooth river stones material
  const rockMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#3a4749', roughness: 0.28, metalness: 0.12 }), [])
  const pebbleMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#525e60', roughness: 0.35 }), [])

  // Water droplets material
  const dropletMat = useMemo(() => {
    return new THREE.MeshPhysicalMaterial({
      color: '#ffffff',
      roughness: 0.02,
      transmission: 0.98,
      transparent: true,
      opacity: 0.85,
      clearcoat: 1.0,
    })
  }, [])

  const retrieveBottle = () => {
    if (useStore.getState().riverBottleState !== 'in_river') return
    playSfx('splash')
    playSfx('tick')
    setNearby(null)

    // Halt boat immediately
    boat.speed = 0
    boat.auto = false

    // Brief cinematic focus on the engineer retrieving the bottle
    const b = boat.pos.clone()
    const startCam = b.clone().add(new THREE.Vector3(2.6, 1.9, 2.2))
    const midCam = b.clone().add(new THREE.Vector3(1.7, 1.35, 1.45))
    const endCam = b.clone().add(new THREE.Vector3(1.25, 1.05, 1.05))
    const lookP = b.clone().add(new THREE.Vector3(0.28, 0.38, 0.18))

    camState.cine = {
      pos: new THREE.CatmullRomCurve3([startCam, midCam, endCam]),
      look: new THREE.CatmullRomCurve3([lookP, lookP, lookP]),
      dur: 1.6,
      t: 0,
      fov: 36,
      hold: true,
      onDone: () => {
        playSfx('seal')
        playSfx('paper')
        setRiverBottleState('retrieved')
        setRiverMessageOpen(true)
      },
    }
  }

  useFrame((stateObj, rawDt) => {
    const dt = Math.min(rawDt, 1 / 30)
    const t = stateObj.clock.elapsedTime
    const g = group.current
    if (!g) return

    const bottleState = useStore.getState().riverBottleState

    if (bottleState === 'retrieved') {
      g.visible = false
      return
    }
    g.visible = true

    // Drift downstream (+x) when released
    if (bottleState === 'released') {
      if (!drifting) setDrifting(true)
      pos.current.x += dt * 0.85
      pos.current.z += Math.sin(pos.current.x * 0.3) * dt * 0.14
    }

    // Natural buoyant bobbing in river water
    const bob = Math.sin(t * 2.1 + pos.current.x) * 0.022
    const rockPitch = Math.sin(t * 1.4 + 0.3) * 0.05
    const rockRoll = Math.cos(t * 1.7) * 0.04

    riverBottlePos.copy(pos.current)
    riverBottlePos.y = WATER_Y + 0.028 + bob

    g.position.copy(riverBottlePos)
    // Horizontal rest angle: bottle rests lying down, neck tilted ~24 degrees upward (0.42 rad)
    // exactly like in the user's reference photo!
    g.rotation.set(rockRoll, Math.PI * 0.28, -0.42 + rockPitch)

    // Interaction & contextual notice when boat is nearby
    if (player.mode === 'boat' && bottleState === 'in_river') {
      const dist = Math.hypot(boat.pos.x - pos.current.x, boat.pos.z - pos.current.z)

      // 1. Puppy notices it first when approaching (within 8.5m)
      if (dist < 8.5 && !noticed) {
        setNoticed(true)
        puppyBark('Woof!')
        setDialogue({
          line: { who: 'player', text: "There's a message in the water…", thought: true },
          key: Date.now(),
          auto: 4200,
        })
      }

      // 2. Near bottle (< 4.2m): boat slows down and [E] prompt appears
      if (dist < 4.2) {
        if (!runtime.keys.has('w') && !runtime.keys.has('arrowup') && runtime.joy.y <= 0.1) {
          boat.speed = THREE.MathUtils.damp(boat.speed, 0, 3.5, dt)
        }

        setNearby({
          id: 'river_bottle',
          label: 'Message in a bottle',
          verb: 'Retrieve',
        })

        if (runtime.interactQueued) {
          runtime.interactQueued = false
          retrieveBottle()
        }
      } else if (dist > 5.5 && useStore.getState().nearby?.id === 'river_bottle') {
        setNearby(null)
      }
    }
  })

  return (
    <>
      {/* Cluster of river rocks & wet gravel nestled beside the bottle in the shallows */}
      <group position={[4.85, WATER_Y - 0.05, -13.65]}>
        {/* Main wet river boulder */}
        <mesh position={[0, 0.08, 0]} rotation={[0.2, 0.6, -0.1]} material={rockMat} castShadow receiveShadow>
          <dodecahedronGeometry args={[0.36, 1]} />
        </mesh>
        <mesh position={[0.42, 0.03, -0.18]} rotation={[-0.3, 0.9, 0.2]} material={rockMat} castShadow receiveShadow>
          <dodecahedronGeometry args={[0.26, 1]} />
        </mesh>
        <mesh position={[-0.34, 0.02, -0.32]} rotation={[0.4, -0.3, 0.15]} material={rockMat} castShadow receiveShadow>
          <dodecahedronGeometry args={[0.22, 1]} />
        </mesh>
        {/* Smooth river pebbles */}
        <mesh position={[-0.22, -0.01, 0.28]} material={pebbleMat} scale={[1.3, 0.7, 1]}>
          <sphereGeometry args={[0.07, 10, 8]} />
        </mesh>
        <mesh position={[0.25, -0.01, 0.24]} material={pebbleMat} scale={[1.1, 0.6, 1.2]}>
          <sphereGeometry args={[0.06, 10, 8]} />
        </mesh>
      </group>

      {/* The Realistic Glass River Message Bottle */}
      <group ref={group} onClick={(e) => { e.stopPropagation(); retrieveBottle() }}>
        {/* Main Glass double-walled body */}
        <mesh geometry={bottleGeo} material={glassMat} castShadow receiveShadow />

        {/* Deep green glass lip ring collar (matches reference photo collar) */}
        <mesh position={[0, 0.558, 0]} material={greenLipMat}>
          <torusGeometry args={[0.048, 0.0075, 14, 32]} />
        </mesh>

        {/* Embossed vintage grapes/insignia emblem on glass shoulder */}
        <group position={[0, 0.355, 0.104]} rotation={[0.3, 0, 0]} scale={[0.85, 0.85, 0.85]}>
          <mesh material={glassMat} position={[-0.014, 0.018, 0]}><sphereGeometry args={[0.007, 10, 8]} /></mesh>
          <mesh material={glassMat} position={[0, 0.02, 0]}><sphereGeometry args={[0.007, 10, 8]} /></mesh>
          <mesh material={glassMat} position={[0.014, 0.018, 0]}><sphereGeometry args={[0.007, 10, 8]} /></mesh>
          <mesh material={glassMat} position={[-0.008, 0.007, 0]}><sphereGeometry args={[0.0065, 10, 8]} /></mesh>
          <mesh material={glassMat} position={[0.008, 0.007, 0]}><sphereGeometry args={[0.0065, 10, 8]} /></mesh>
          <mesh material={glassMat} position={[0, -0.004, 0]}><sphereGeometry args={[0.006, 10, 8]} /></mesh>
        </group>

        {/* Large Rolled Parchment Scroll with Burnt Edges filling the bottle interior */}
        <group position={[0, 0.165, 0]}>
          {/* Main parchment roll cylinder with scorched texture */}
          <mesh material={scrollMat}>
            <cylinderGeometry args={[0.068, 0.068, 0.22, 28]} />
          </mesh>

          {/* Inner spiral curl layers showing authentic rolled parchment */}
          <mesh position={[0.003, 0, 0.003]} rotation={[0, 0.9, 0]} material={scrollMat}>
            <cylinderGeometry args={[0.058, 0.058, 0.218, 24, 1, true, 0, Math.PI * 1.7]} />
          </mesh>
          <mesh position={[-0.002, 0, -0.002]} rotation={[0, 2.2, 0]} material={scrollMat}>
            <cylinderGeometry args={[0.046, 0.046, 0.214, 20, 1, true, 0, Math.PI * 1.6]} />
          </mesh>

          {/* Rustic Natural Jute / Hemp Twine Tie wrapped twice around center */}
          <group position={[0, -0.01, 0]}>
            <mesh material={twineMat} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.0695, 0.0038, 8, 32]} />
            </mesh>
            <mesh material={twineMat} position={[0, 0.012, 0]} rotation={[Math.PI / 2 + 0.08, 0, 0.1]}>
              <torusGeometry args={[0.0695, 0.0038, 8, 32]} />
            </mesh>
            {/* Twine knot & loose loop */}
            <mesh position={[0, 0.006, 0.071]} material={twineMat}>
              <sphereGeometry args={[0.0075, 10, 8]} />
            </mesh>
            <mesh position={[0.008, 0.016, 0.072]} rotation={[0.4, 0.2, 0.5]} material={twineMat}>
              <torusGeometry args={[0.011, 0.003, 6, 16]} />
            </mesh>
          </group>
        </group>

        {/* Rustic Natural Cork Stopper inserted into bottle mouth */}
        <group position={[0, 0.555, 0]}>
          {/* Cylindrical cork body inserted into neck */}
          <mesh material={corkBodyMat} position={[0, 0.018, 0]} castShadow>
            <cylinderGeometry args={[0.038, 0.035, 0.075, 28]} />
          </mesh>
          {/* Slightly flared & chamfered protruding top of cork */}
          <mesh material={corkBodyMat} position={[0, 0.054, 0]}>
            <cylinderGeometry args={[0.041, 0.038, 0.012, 28]} />
          </mesh>
          {/* Top face of cork with golden-amber grain rings texture */}
          <mesh material={corkTopMat} position={[0, 0.0601, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.041, 28]} />
          </mesh>
        </group>

        {/* Wet Water Droplets glistening on the upper glass surface */}
        <group position={[0, 0, 0]}>
          {[
            [0.055, 0.22, 0.098, 0.007],
            [-0.045, 0.25, 0.102, 0.008],
            [0.02, 0.18, 0.109, 0.009],
            [-0.018, 0.14, 0.109, 0.006],
            [0.065, 0.12, 0.092, 0.008],
            [-0.06, 0.16, 0.094, 0.007],
            [0.035, 0.29, 0.096, 0.008],
            [-0.028, 0.32, 0.091, 0.007],
            [0.012, 0.39, 0.074, 0.006],
            [-0.015, 0.44, 0.054, 0.006],
          ].map(([dx, dy, dz, r], idx) => (
            <mesh key={idx} position={[dx, dy, dz]} material={dropletMat}>
              <sphereGeometry args={[r, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
            </mesh>
          ))}
        </group>

        {/* Gentle translucent waterline wake ripple */}
        <mesh position={[0, 0.15, -0.02]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.16, 0.26, 32]} />
          <meshBasicMaterial color="#d8f5ef" transparent opacity={0.32} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      </group>
    </>
  )
}
