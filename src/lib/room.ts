// The Home interior lives off-planet at ROOM_ORIGIN, flat, +Y up. Room coords: x right, z toward the door.
import * as THREE from 'three'

export const ROOM_ORIGIN = new THREE.Vector3(1000, 0, 0)
export const ROOM = { w: 7, d: 6, h: 3 } // x ∈ [-3.5, 3.5], z ∈ [-3, 3]

export const DESK = { x: 0.7, z: -2.55, w: 1.5, d: 0.8, top: 0.76 }
export const CHAIR = { x: 0.7, z: -1.78 }
export const LAPTOP = { x: 0.62, z: -2.5, screenW: 0.42, screenH: 0.27 }
export const DOOR = { x: -1.6, z: 2.95 }

/** axis-aligned obstacles in room coords: [minX, minZ, maxX, maxZ] */
export const roomBoxes: [number, number, number, number][] = [
  [DESK.x - DESK.w / 2, DESK.z - DESK.d / 2, DESK.x + DESK.w / 2, DESK.z + DESK.d / 2], // desk
  [-3.5, -2.0, -2.95, 0.6], // bookshelf (left wall)
  [2.2, 1.0, 3.5, 2.6], // lounge chair + side table
  [-3.5, -3.0, -2.6, -2.2], // plant corner
  [2.6, -3.0, 3.5, -2.3], // floor lamp + plant
  [-3.5, 2.2, -2.9, 3.0], // coat rack
]

export function roomBlocked(x: number, z: number, r = 0.3) {
  if (x < -ROOM.w / 2 + r || x > ROOM.w / 2 - r || z < -ROOM.d / 2 + r || z > ROOM.d / 2 - r) return true
  for (const [a, b, c, d] of roomBoxes) if (x > a - r && x < c + r && z > b - r && z < d + r) return true
  return false
}

export const roomToWorld = (x: number, y: number, z: number, out = new THREE.Vector3()) => out.set(ROOM_ORIGIN.x + x, ROOM_ORIGIN.y + y, ROOM_ORIGIN.z + z)
