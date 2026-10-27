import { Suspense, useState } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame } from '@react-three/fiber'
import { AdaptiveDpr, PerformanceMonitor } from '@react-three/drei'
import { Player } from './Player'
import { CameraRig } from './CameraRig'
import { Lighting, Sky } from './Environment'
import { Effects } from './Effects'
import { Nature } from './Terrain'
import { Village } from './Village'
import { HouseDoorOutside, HomeInterior } from './Home'
import { Parrot } from './Parrot'
import { Puppy } from './Puppy'
import { Postman } from './Postman'
import { Boat } from './Boat'
import { Workshop } from './Workshop'
import { Summit } from './Summit'
import { Director } from '../story/Director'
import { Interactions } from './Interactions'

/** project each speaker's head to the screen for the DOM speech bubbles */
import { parrot, player, puppy, postman } from '../lib/actors'
import { runtime } from '../store'
const tmp = new THREE.Vector3()
function Anchors() {
  useFrame(({ camera, size }) => {
    const put = (id: string, p: THREE.Vector3, lift: number) => {
      tmp.copy(p); tmp.y += lift
      tmp.project(camera)
      const behind = tmp.z > 1
      runtime.anchors[id] = { x: (tmp.x * 0.5 + 0.5) * size.width, y: (-tmp.y * 0.5 + 0.5) * size.height, vis: !behind, behind }
    }
    put('player', player.head, 0.55)
    put('parrot', parrot.head, 0.35)
    put('puppy', puppy.head, 0.45)
    put('postman', postman.head, 0.2)
  })
  return null
}

/** debug: ?skip=nature,village,fx … to bisect rendering problems */
const SKIP = typeof window !== 'undefined' ? (new URLSearchParams(window.location.search).get('skip') ?? '').split(',') : []
const on = (k: string) => !SKIP.includes(k)

export function Experience() {
  const [dpr, setDpr] = useState(1.5)
  const [lite, setLite] = useState(false)

  return (
    <Canvas
      className="webgl"
      shadows={on('shadow') ? { type: THREE.PCFShadowMap } : false}
      dpr={[1, Math.min(dpr, 1.75)]}
      camera={{ fov: 42, near: 0.1, far: 900, position: [0, 1.28, 67.45] }}
      gl={{ antialias: false, powerPreference: 'high-performance', stencil: false }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping
        gl.toneMappingExposure = 1.05
        gl.setClearColor('#efd6b4')
      }}
    >
      <color attach="background" args={['#efd6b4']} />
      <PerformanceMonitor onDecline={() => { setDpr(1); setLite(true) }} onIncline={() => setDpr(1.75)} flipflops={3} />
      <AdaptiveDpr pixelated={false} />
      <Lighting />
      <CameraRig />
      <Director />
      <Interactions />
      <Anchors />
      {on('sky') && <Sky />}
      <Suspense fallback={null}>
        {on('nature') && <Nature />}
        {on('village') && <Village />}
        <HouseDoorOutside />
        {on('home') && <HomeInterior />}
        {on('boat') && <Boat />}
        {on('workshop') && <Workshop />}
        {on('summit') && <Summit />}
        {on('player') && <Player />}
        {on('parrot') && <Parrot />}
        {on('puppy') && <Puppy />}
        {on('postman') && <Postman />}
      </Suspense>
      {on('fx') && <Effects lite={lite} />}
    </Canvas>
  )
}
