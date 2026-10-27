// The village postman: a friendly delivery courier on foot.
// - Dressed in a classic postal navy uniform with peaked postman cap and leather mail satchel
// - Walks briskly along the road, approaches the letterbox
// - Slides the letter cleanly into the letterbox slot with genuine paper sound
// - Delivers his cheerful line: "Post for you! Signed, sealed, delivered."
// - Turns and walks away down the road into the distance
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useAnimations } from '@react-three/drei'
import { heightAt, LETTERBOX, ROAD_Z } from '../world/layout'
import { postman } from '../lib/actors'
import { useStore } from '../store'
import { lines } from '../data/story'
import { buildEngineer, crossPlay, useEngineerGLTF } from './engineerLook'
import { flat } from './materials'
import { rotateBoneWorld } from './Player'
import { letterboxState } from './Village'
import { playSfx } from '../ui/sound'

const START_X = -18
const TURN_X = -5.8
const BOX_STAND_X = -3.65
const BOX_STAND_Z = 12.95
const RETURN_X = -2.8
const END_X = 35

let onDelivered: (() => void) | null = null
let phase: 'idle' | 'walk_in' | 'deliver' | 'walk_out' = 'idle'
let phaseT = 0

export function startPostman(delivered: () => void) {
  onDelivered = delivered
  phase = 'walk_in'
  phaseT = 0
  postman.active = true
  postman.pos.set(START_X, heightAt(START_X, ROAD_Z), ROAD_Z)
  postman.yaw = Math.PI / 2
}

/** skip: put the letter in the box and send him away */
export function finishPostman() {
  letterboxState.hasLetter = true
  phase = 'idle'
  postman.active = false
  const cb = onDelivered
  onDelivered = null
  cb?.()
}

export function Postman() {
  const group = useRef<THREE.Group>(null)
  const envelope = useRef<THREE.Mesh>(null)
  const gltf = useEngineerGLTF()

  // Dressed in vintage postal navy uniform
  const model = useMemo(() => {
    const m = buildEngineer(
      gltf.scene,
      {
        hoodie: '#1e3852', // Postal navy blue jacket
        jeans: '#222934',  // Dark navy postal trousers
        shoes: '#261c14',  // Dark polished postal boots
        pack: null,        // No hiker backpack
        skinTint: '#d8ab8c',
        hair: '#241c16',
      },
      1.72,
    )

    // Classic British Peaked Postman Cap
    let head: THREE.Object3D | null = null
    m.traverse((o) => { if (!head && o.name === 'Head') head = o })
    if (head) {
      const cap = new THREE.Group()
      // Cap crown
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.105, 0.065, 20), flat('#182a3d'))
      // Shiny black leather visor / brim
      const brim = new THREE.Mesh(
        new THREE.CylinderGeometry(0.085, 0.085, 0.01, 18, 1, false, -Math.PI / 2, Math.PI),
        flat('#111316'),
      )
      brim.position.set(0, -0.025, 0.075)
      // Gold postman badge
      const badge = new THREE.Mesh(new THREE.SphereGeometry(0.012, 10, 8), flat('#cca238'))
      badge.position.set(0, 0.01, 0.102)

      cap.add(crown, brim, badge)
      cap.position.set(0, 0.10, 0.02)
      cap.rotation.x = 0.12
      head.add(cap)
    }

    // Leather Postal Mail Satchel (Cross-body courier bag at hip)
    let spine: THREE.Object3D | null = null
    m.traverse((o) => { if (!spine && o.name === 'spine_02') spine = o })
    if (spine) {
      const satchel = new THREE.Group()
      // Leather postbag at right hip
      const bag = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.22, 0.26), flat('#54351f'))
      bag.position.set(0.19, -0.16, 0.02)
      bag.rotation.z = -0.1
      bag.castShadow = true

      // Front brass buckle / clasp
      const clasp = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.02), flat('#cca238'))
      clasp.position.set(0.25, -0.16, 0.02)
      clasp.rotation.z = -0.1

      // Crossbody leather strap over left shoulder to right hip
      const strap = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.38, 0.04), flat('#432814'))
      strap.position.set(0.08, 0.02, 0.01)
      strap.rotation.z = -0.55

      // Envelopes peeking out of the bag
      const envPeek = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.18), flat('#f7f0e4'))
      envPeek.position.set(0.19, -0.04, 0.02)
      envPeek.rotation.z = -0.08

      satchel.add(bag, clasp, strap, envPeek)
      spine.add(satchel)
    }

    return m
  }, [gltf.scene])

  const { actions } = useAnimations(gltf.animations, model)
  const cur = useRef<{ name: string | null }>({ name: null })

  const bones = useMemo(() => {
    const f = (n: string) => {
      let b: THREE.Object3D | null = null
      model.traverse((o) => { if (!b && o.name === n) b = o })
      return b as THREE.Object3D | null
    }
    return {
      armR: f('upperarm_r'),
      forearmR: f('lowerarm_r'),
      neck: f('neck_01'),
      head: f('Head'),
    }
  }, [model])

  useEffect(() => {
    crossPlay(actions, cur.current, 'Idle', 0)
  }, [actions])

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 1 / 30)
    const g = group.current
    if (!g) return
    g.visible = postman.active
    if (!postman.active) return

    phaseT += dt
    const s = useStore.getState()

    // ── Phase 1: Walk along road and curve toward letterbox ─────────────
    if (phase === 'walk_in') {
      crossPlay(actions, cur.current, 'Walk', 0.25)
      const w = actions['Walk']
      if (w) w.timeScale = 1.15

      const roadLen = TURN_X - START_X // 12m along road
      const walkSpeed = 2.35 // m/s
      const roadTime = roadLen / walkSpeed // ~5.1s
      const turnTime = 1.05 // ~1.05s to curve to letterbox
      const totalInTime = roadTime + turnTime

      if (phaseT <= roadTime) {
        // Walking east along the road
        const k = phaseT / roadTime
        postman.pos.x = THREE.MathUtils.lerp(START_X, TURN_X, k)
        postman.pos.z = ROAD_Z
        postman.yaw = Math.PI / 2
      } else if (phaseT < totalInTime) {
        // Curving smoothly toward the letterbox
        const k = (phaseT - roadTime) / turnTime
        postman.pos.x = THREE.MathUtils.lerp(TURN_X, BOX_STAND_X, k)
        postman.pos.z = THREE.MathUtils.lerp(ROAD_Z, BOX_STAND_Z, k)
        postman.yaw = THREE.MathUtils.lerp(Math.PI / 2, -0.35, k)
      } else {
        // Arrived beside letterbox
        postman.pos.x = BOX_STAND_X
        postman.pos.z = BOX_STAND_Z
        postman.yaw = -0.35
        phase = 'deliver'
        phaseT = 0
      }
    }

    // ── Phase 2: Deliver the letter into the letterbox ──────────────────
    else if (phase === 'deliver') {
      crossPlay(actions, cur.current, 'Idle', 0.3)
      postman.pos.x = BOX_STAND_X
      postman.pos.z = BOX_STAND_Z
      postman.yaw = -0.35

      // Envelope glide from satchel/hand to letterbox slot
      const tossK = THREE.MathUtils.clamp((phaseT - 0.2) / 0.85, 0, 1)
      if (envelope.current) {
        envelope.current.visible = tossK < 1
        const startPos = new THREE.Vector3(BOX_STAND_X - 0.1, heightAt(BOX_STAND_X, BOX_STAND_Z) + 1.15, BOX_STAND_Z + 0.1)
        const targetPos = new THREE.Vector3(LETTERBOX.x, heightAt(LETTERBOX.x, LETTERBOX.z) + 1.28, LETTERBOX.z - 0.05)
        envelope.current.position.lerpVectors(startPos, targetPos, tossK)
        envelope.current.position.y += Math.sin(tossK * Math.PI) * 0.12
        envelope.current.rotation.set(0.1, 0.2, 0)
      }

      // Reaching arm motion toward letterbox
      if (bones.armR) {
        const reach = Math.sin(tossK * Math.PI)
        rotateBoneWorld(bones.armR, new THREE.Vector3(-0.9, 0, -0.4).normalize(), reach * 0.72)
      }
      if (bones.forearmR) {
        const reach = Math.sin(tossK * Math.PI)
        rotateBoneWorld(bones.forearmR, new THREE.Vector3(-0.9, 0, -0.4).normalize(), reach * 0.32)
      }

      // Delivery moment: letter enters slot, sound, and dialogue
      if (tossK >= 1 && !letterboxState.hasLetter) {
        letterboxState.hasLetter = true
        playSfx('paper')
        s.setDialogue({ line: lines.postman[0], key: Date.now(), auto: 2800 })
      }

      // Postman turns head toward house/player and nods cheerily while saying line
      if (phaseT > 1.2 && bones.head) {
        rotateBoneWorld(bones.head, new THREE.Vector3(0, 1, 0), 0.55) // Look toward porch
        if (phaseT < 2.2) {
          const nod = Math.sin((phaseT - 1.2) * Math.PI * 2) * 0.14
          rotateBoneWorld(bones.head, new THREE.Vector3(-1, 0, 0), nod)
        }
      }

      if (phaseT >= 2.6) {
        phase = 'walk_out'
        phaseT = 0
      }
    }

    // ── Phase 3: Turn around and walk away into distance ────────────────
    else if (phase === 'walk_out') {
      crossPlay(actions, cur.current, 'Walk', 0.25)
      const w = actions['Walk']
      if (w) w.timeScale = 1.15

      const turnTime = 0.95
      const walkSpeed = 2.35

      if (phaseT <= turnTime) {
        // Curve back to the road
        const k = phaseT / turnTime
        postman.pos.x = THREE.MathUtils.lerp(BOX_STAND_X, RETURN_X, k)
        postman.pos.z = THREE.MathUtils.lerp(BOX_STAND_Z, ROAD_Z, k)
        postman.yaw = THREE.MathUtils.lerp(0, Math.PI / 2, k)
      } else {
        // Walking east along the road into the distance
        postman.yaw = Math.PI / 2
        postman.pos.z = ROAD_Z
        postman.pos.x = RETURN_X + (phaseT - turnTime) * walkSpeed
      }

      // Signal Director that delivery is complete after postman starts walking away
      if (phaseT >= 2.0 && onDelivered) {
        const cb = onDelivered
        onDelivered = null
        cb()
      }

      // Despawn once out of sight
      if (postman.pos.x >= END_X) {
        phase = 'idle'
        postman.active = false
      }
    }

    // Ground postman and update actor
    postman.pos.y = heightAt(postman.pos.x, postman.pos.z)
    g.position.copy(postman.pos)
    g.rotation.y = postman.yaw

    // Human head height for camera target & dialogue bubble
    postman.head.set(postman.pos.x, postman.pos.y + 1.68, postman.pos.z)
  })

  return (
    <>
      <group ref={group} visible={false}>
        <primitive object={model} />
      </group>

      {/* The postal delivery letter */}
      <mesh ref={envelope} visible={false} material={flat('#f5ede0')}>
        <boxGeometry args={[0.24, 0.015, 0.16]} />
      </mesh>
    </>
  )
}
