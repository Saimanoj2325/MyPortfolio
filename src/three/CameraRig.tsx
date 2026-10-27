// Camera: scripted spline shots (cutscenes), a soft third-person follow (drag to orbit) that never
// dips into the ground, a boat camera, and the existing house cameras (corner + laptop dolly).
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import gsap from 'gsap'
import { boat, camState, player } from '../lib/actors'
import { heightAt, inWorkshop, WORKSHOP, WORKSHOP_FLOOR } from '../world/layout'
import { DESK, LAPTOP, ROOM, roomToWorld } from '../lib/room'
import { runtime, useStore } from '../store'
import { seat } from './Player'
import { roomCam } from './Home'
import { workshopView } from './Workshop'

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

export function CameraRig() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const sm = useMemo(() => ({ pos: new THREE.Vector3(0, 1.28, 67.45), look: new THREE.Vector3(0, 1.2, 50), init: false, place: 'world', fov: 42 }), [])
  const shot = useMemo(() => ({ pos: new THREE.Vector3(), look: new THREE.Vector3(), fov: 42 }), [])

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 1 / 30)
    const s = useStore.getState()
    let lambda = 6
    let snap = false

    if (s.phase === 'title') {
      // Cinematic hero framing: player character centered, looking forward along the trail
      const t = state.clock.elapsedTime
      const py = heightAt(player.pos.x, player.pos.z)
      const swayX = Math.sin(t * 0.2) * 0.05
      const swayY = Math.sin(t * 0.35) * 0.02
      shot.pos.set(player.pos.x + swayX, py + 1.28 + swayY, player.pos.z + 3.45 + Math.cos(t * 0.2) * 0.04)
      shot.look.set(player.pos.x, py + 1.2, player.pos.z - 14)
      shot.fov = 42
      lambda = 3.5
      if (!sm.init) {
        sm.pos.copy(shot.pos)
        sm.look.copy(shot.look)
        sm.init = true
      }
    } else if (s.place === 'home') {
      const r = player.room
      if (s.seated || seat.phase === 'sitting' || seat.phase === 'seated') {
        const k = s.seated ? 1 : 0
        const screenC = roomToWorld(LAPTOP.x, DESK.top + 0.166, LAPTOP.z - 0.214)
        const screenPos = roomToWorld(LAPTOP.x, DESK.top + 0.32, LAPTOP.z + 0.31)
        const sh = roomToWorld(roomCam.shoulderPos.x, roomCam.shoulderPos.y, roomCam.shoulderPos.z)
        const shLook = roomToWorld(roomCam.shoulderLook.x, roomCam.shoulderLook.y, roomCam.shoulderLook.z)
        shot.pos.lerpVectors(sh, screenPos, k)
        shot.look.lerpVectors(shLook, screenC, k)
        shot.fov = THREE.MathUtils.lerp(42, 36, k)
        lambda = s.seated ? 2.6 : 3.2
      } else {
        // a 3/4 view from the doorway wall: the camera sits at about head height + a bit and always looks
        // into the room (never straight down at the player, even right after entering by the door)
        const px = THREE.MathUtils.clamp(r.x * 0.45, -1.6, 1.6)
        const near = THREE.MathUtils.smoothstep(r.z, 0.4, 2.4) // 1 when the player is close to the camera wall
        // near the door wall the camera slides along the wall to the far side, so the player stays in frame
        const cx = THREE.MathUtils.lerp(px + roomCam.corner.x, THREE.MathUtils.clamp(-r.x * 0.55, -1.8, 1.8), near)
        shot.pos.copy(roomToWorld(cx, roomCam.corner.y + near * 0.15, Math.min(ROOM.d / 2 - 0.25, roomCam.corner.z)))
        const lx = THREE.MathUtils.lerp(r.x * 0.85, r.x, near)
        const lz = THREE.MathUtils.lerp(Math.min(r.z * 0.8 - 0.4, 0.75 - near * 0.5), r.z - 1.3, near * 0.7)
        shot.look.copy(roomToWorld(lx, 1.05 + near * 0.07, lz))
        shot.fov = 50
        lambda = 4
      }
    } else if (camState.cine) {
      const c = camState.cine
      c.t = Math.min(1, c.t + dt / Math.max(0.001, c.dur))
      const e = easeInOut(c.t)
      c.pos.getPointAt(e, shot.pos)
      c.look.getPointAt(e, shot.look)
      shot.fov = c.fov
      lambda = c.dur < 0.05 ? 1000 : 9
      if (c.dur < 0.05) snap = true
      if (c.t >= 1 && c.onDone) { const f = c.onDone; c.onDone = undefined; f() }
      if (c.t >= 1 && !c.hold) camState.cine = null
    } else if (player.mode === 'boat') {
      // behind the boat's direction of travel, high enough to see the far bank emerge
      if (runtime.dragYaw) { camState.heading -= runtime.dragYaw; runtime.dragYaw = 0 }
      camState.heading += Math.atan2(Math.sin(boat.yaw - camState.heading), Math.cos(boat.yaw - camState.heading)) * (1 - Math.exp(-1.2 * dt))
      const h = camState.heading
      shot.pos.set(boat.pos.x - Math.sin(h) * 8.5, boat.pos.y + 4.2, boat.pos.z - Math.cos(h) * 8.5)
      shot.look.set(boat.pos.x + Math.sin(h) * 6, boat.pos.y + 0.6, boat.pos.z + Math.cos(h) * 6)
      shot.fov = 48
      lambda = 4
    } else {
      // third-person follow
      if (runtime.dragYaw) { camState.heading -= runtime.dragYaw; runtime.dragYaw = 0 }
      if (runtime.dragPitch) { camState.pitch = THREE.MathUtils.clamp(camState.pitch + runtime.dragPitch, 0.05, 1.15); runtime.dragPitch = 0 }
      if (player.speed > 0.5) {
        // gently swing behind the direction of travel (but not when walking toward the camera)
        const d = Math.atan2(Math.sin(player.yaw - camState.heading), Math.cos(player.yaw - camState.heading))
        if (Math.abs(d) < 2.2) camState.heading += d * (1 - Math.exp(-0.9 * (player.speed / 4) * dt))
      }
      const inside = workshopView.inside
      const dist = THREE.MathUtils.lerp(camState.dist, 5.4, inside) + (player.mode === 'bench' ? 1 : 0)
      const pitch = THREE.MathUtils.lerp(camState.pitch, 0.5, inside)
      const h = camState.heading
      const pivot = shot.look.set(player.pos.x, player.pos.y + 1.45, player.pos.z)
      shot.pos.set(pivot.x - Math.sin(h) * dist * Math.cos(pitch), pivot.y + dist * Math.sin(pitch), pivot.z - Math.cos(h) * dist * Math.cos(pitch))
      shot.look.set(pivot.x + Math.sin(h) * 1.4, pivot.y, pivot.z + Math.cos(h) * 1.4)
      shot.fov = 45
      lambda = 7
      // keep above the terrain
      const gy = heightAt(shot.pos.x, shot.pos.z) + 0.6
      if (shot.pos.y < gy) shot.pos.y = gy
      if (inWorkshop(player.pos.x, player.pos.z)) {
        // stay inside the building: never behind the glass front or above the (lifted) roof line
        const W = WORKSHOP
        shot.pos.x = THREE.MathUtils.clamp(shot.pos.x, W.x - W.w / 2 + 0.7, W.x + W.w / 2 - 0.7)
        shot.pos.z = THREE.MathUtils.clamp(shot.pos.z, W.z - W.d / 2 + 0.7, W.z + W.d / 2 - 0.6)
        shot.pos.y = THREE.MathUtils.clamp(shot.pos.y, WORKSHOP_FLOOR + 2.4, WORKSHOP_FLOOR + 4.1)
      }
    }

    if (sm.place !== s.place || !sm.init || snap) {
      sm.pos.copy(shot.pos); sm.look.copy(shot.look); sm.place = s.place; sm.init = true
    }
    sm.pos.lerp(shot.pos, 1 - Math.exp(-lambda * dt))
    sm.look.lerp(shot.look, 1 - Math.exp(-lambda * 1.25 * dt))
    camera.position.copy(sm.pos)
    camera.up.set(0, 1, 0)
    camera.lookAt(sm.look)
    camState.look.copy(sm.look)
    if (Math.abs(camera.fov - shot.fov) > 0.01) {
      camera.fov = THREE.MathUtils.damp(camera.fov, shot.fov, 3, dt)
      camera.updateProjectionMatrix()
    }
  })
  return null
}
