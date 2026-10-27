// Shared, mutable per-frame state of every character (read by camera, director, UI anchors).
import * as THREE from 'three'
import { SPAWN, heightAt } from '../world/layout'

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z)

export type PlayerMode = 'free' | 'locked' | 'boat' | 'bench' | 'pet'
export const player = {
  pos: V(SPAWN.x, heightAt(SPAWN.x, SPAWN.z), SPAWN.z),
  yaw: SPAWN.yaw,
  speed: 0,
  mode: 'free' as PlayerMode,
  /** world point the head should turn toward (null = idle look-around) */
  look: null as THREE.Vector3 | null,
  /** extra procedural head yaw while confused (cutscene) */
  confused: 0,
  head: V(),
  /** interior (home) state: flat room coords */
  room: { x: 0, z: 2.2, yaw: Math.PI, speed: 0 },
  /** scripted walk target (cutscenes / sit on bench) */
  auto: null as null | { x: number; z: number; speed: number; done?: () => void; faceYaw?: number },
  petT: 0,
  ready: false,
}

export type PuppyMode = 'hidden' | 'follow' | 'goto' | 'circle' | 'sit' | 'boat' | 'bench' | 'lead' | 'happy'
export const puppy = {
  pos: V(-6, 0, 20),
  yaw: 0,
  speed: 0,
  mode: 'hidden' as PuppyMode,
  target: V(),
  /** when leading: wait here until the player is within `waitDist` */
  waitDist: 6,
  onArrive: null as null | (() => void),
  excite: 0.5,
  sitT: 0,
  sniffT: 0,
  happyT: 0,
  circleA: 0,
  circleC: V(),
  head: V(),
  space: 'world' as 'world' | 'home',
  barkAt: 0,
}

export type ParrotMode = 'hidden' | 'perch' | 'fly'
export const parrot = {
  pos: V(40, 14, 70),
  yaw: 0,
  mode: 'hidden' as ParrotMode,
  flight: null as null | { curve: THREE.CatmullRomCurve3; t: number; dur: number; onLand?: () => void },
  perch: V(),
  /** a short reaction (squawk, flap, hop) */
  reactT: 0,
  hopTo: null as null | THREE.Vector3,
  head: V(),
  flapAmt: 0,
  /** riding on the boat's bow */
  ride: false,
}

export const postman = { active: false, t: 0, pos: V(-70, 0, 11.5), yaw: Math.PI / 2, speed: 0, head: V(), stopped: false }

export const boat = { pos: V(), yaw: Math.PI, speed: 0, turn: 0, oar: 0, rowing: false, auto: false }

export const camState = {
  heading: Math.PI, // yaw of the camera around the player (radians); camera sits behind
  pitch: 0.32,
  dist: 7.2,
  look: V(),
  /** scripted shot: catmull-rom spline of positions + looks */
  cine: null as null | { pos: THREE.CatmullRomCurve3; look: THREE.CatmullRomCurve3; dur: number; t: number; fov: number; hold?: boolean; onDone?: () => void },
}

export function groundY(x: number, z: number) { return heightAt(x, z) }

/** hold the camera on a fixed framing (debug / screenshots) */
export function debugShot(pos: [number, number, number], look: [number, number, number], fov = 35) {
  const p = new THREE.Vector3(...pos), l = new THREE.Vector3(...look)
  camState.cine = { pos: new THREE.CatmullRomCurve3([p, p.clone().add(new THREE.Vector3(0, 0.001, 0))]), look: new THREE.CatmullRomCurve3([l, l.clone().add(new THREE.Vector3(0, 0.001, 0))]), dur: 0.01, t: 0, fov, hold: true }
}
