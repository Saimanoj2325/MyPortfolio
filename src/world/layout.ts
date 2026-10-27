// The world map: one continuous valley, south → north.
// Meadow (spawn) → hedge gate → village (house, letterbox, road) → river (jetty, boat) → far bank
// (workshop) → lantern trail → summit. Units: metres, +x east, -z north, +y up.
// Everything that blocks the player (water, walls, gates, trees) is defined here so that what you
// see is what stops you.
import * as THREE from 'three'

export const SPAWN = { x: 0, z: 64, yaw: Math.PI } // yaw: facing -z (north)
export const BOUNDS = { minX: -58, maxX: 58, minZ: -100, maxZ: 84 }

// hedge + gate between meadow and village
export const MEADOW_FENCE_Z = 40
export const MEADOW_GATE = { x: 0, z: MEADOW_FENCE_Z, w: 3.2 }

// house (axis aligned box), door on its east face
export const HOUSE = { x: -9, z: 20, w: 6.4, d: 5.6, wallH: 3.1, doorX: -9 + 3.2, doorZ: 20 }
export const HOUSE_DOOR_OUT = { x: -4.7, z: 20 }
export const HOUSE_ROOF_RIDGE_Y = 5.62 // above the house's ground
export const LETTERBOX = { x: -4.2, z: 13.8 }
export const ROAD_Z = 11.5 // east-west village road (postman)

// river
export const RIVER = { z: -14, half: 16 }
export function riverZ(x: number) { return RIVER.z + Math.sin(x * 0.045) * 3.2 + Math.sin(x * 0.11 + 1) * 0.8 }
export const JETTY_S = { x: 2.4, z: riverZ(2.4) + RIVER.half + 0.2 } // south bank landing
export const JETTY_N = { x: 2.4, z: riverZ(2.4) - RIVER.half - 0.2 }
export const BOAT_START = { x: 2.4, z: riverZ(2.4) + RIVER.half - 2.6 }
export const BOAT_END_Z = riverZ(2.4) - RIVER.half + 2.4

// workshop: box with open south door
export const WORKSHOP = { x: 6, z: -40, w: 15, d: 11, h: 4.6 }
export const WORKSHOP_DOOR = { x: 6, z: WORKSHOP.z + WORKSHOP.d / 2, w: 3.0 }
/** project stations inside the workshop (world coords) */
export const STATIONS: Record<string, { x: number; z: number; yaw: number }> = {
  frontend: { x: WORKSHOP.x - 4.5, z: WORKSHOP.z - 3.9, yaw: 0 },
  software: { x: WORKSHOP.x + 0.0, z: WORKSHOP.z - 3.9, yaw: 0 },
  ai: { x: WORKSHOP.x + 4.6, z: WORKSHOP.z - 3.9, yaw: 0 },
  mobile: { x: WORKSHOP.x - 6.4, z: WORKSHOP.z + 0.6, yaw: Math.PI / 2 },
  lab: { x: WORKSHOP.x + 6.4, z: WORKSHOP.z + 0.6, yaw: -Math.PI / 2 },
  experience: { x: WORKSHOP.x - 3.5, z: WORKSHOP.z + 2.8, yaw: -Math.PI * 0.25 },
}

// summit
export const SUMMIT = { x: -22, z: -80, h: 15 }
export const BENCH = { x: -21, z: -77.6, yaw: 0.25 } // faces south over the valley
export const SUMMIT_TREE = { x: -25.5, z: -81 }
export const TRAIL: [number, number][] = [
  [-4, -36], [-8, -44], [-6, -52], [-14, -58], [-10, -65], [-18, -70], [-16, -75], [-21, -77],
]
export const TRAIL_GATE = { x: -6, z: -40 }

// village lane (south → north), road (west → east)
export const LANE: [number, number][] = [[0, 84], [0, 62], [1, 50], [0, MEADOW_FENCE_Z], [-1, 30], [1, 20], [0, ROAD_Z], [1.5, 5], [JETTY_S.x, JETTY_S.z]]
export const NORTH_PATH: [number, number][] = [[JETTY_N.x, JETTY_N.z], [3.5, -31], [WORKSHOP_DOOR.x, WORKSHOP_DOOR.z + 0.5]]

export const COTTAGES: { x: number; z: number; yaw: number; s: number; roof: string; wall: string }[] = [
  { x: 13, z: 21, yaw: -Math.PI / 2, s: 1, roof: '#8a4b3c', wall: '#efe4cf' },
  { x: 21, z: 4, yaw: Math.PI, s: 0.9, roof: '#5d6b7a', wall: '#e9dcc4' },
  { x: -23, z: 4, yaw: Math.PI, s: 1.05, roof: '#7a5a3a', wall: '#f1e6d0' },
  { x: -22, z: 25, yaw: Math.PI / 2, s: 0.95, roof: '#8a4b3c', wall: '#e6d7bd' },
  { x: 30, z: 22, yaw: -Math.PI / 2, s: 0.85, roof: '#6d7a5e', wall: '#efe4cf' },
  { x: -36, z: 15, yaw: Math.PI / 2, s: 0.9, roof: '#5d6b7a', wall: '#f1e6d0' },
  { x: 38, z: 6, yaw: Math.PI, s: 0.8, roof: '#7a5a3a', wall: '#e9dcc4' },
]

export const LAMPS: [number, number][] = [[2.6, 31], [-3.0, 28.5], [2.6, 14], [-12, 9.6], [12, 9.6], [-2.2, 4.5], [5, -31], [8.5, -33]]

export const MEADOW_TREE = { x: 6.4, z: 54.4 }

// ───────────────────────── heights
function distToPolyline(x: number, z: number, pts: [number, number][]) {
  let best = Infinity
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1]
    const dx = bx - ax, dz = bz - az
    const t = THREE.MathUtils.clamp(((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz), 0, 1)
    best = Math.min(best, Math.hypot(x - (ax + dx * t), z - (az + dz * t)))
  }
  return best
}
export { distToPolyline }

const smooth = (e0: number, e1: number, x: number) => { const t = THREE.MathUtils.clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t) }

/** raw terrain height (no river carve), used for building pads too */
function baseHeight(x: number, z: number) {
  let h = Math.sin(x * 0.07 + 1.3) * Math.cos(z * 0.055) * 0.9 + Math.sin(x * 0.16 + z * 0.09) * 0.35 + Math.cos(z * 0.13 - x * 0.05) * 0.3
  // meadow: soft rolling bowl
  h += smooth(30, 80, z) * (Math.sin(x * 0.09) * 0.6 + 0.4)
  // summit hill + ridge behind it
  const ds = Math.hypot(x - SUMMIT.x, (z - SUMMIT.z) * 0.9)
  h += SUMMIT.h * Math.exp(-(ds * ds) / (2 * 15 * 15))
  h += smooth(-72, -125, z) * 22 * (0.7 + 0.3 * Math.sin(x * 0.1))
  // walls of the valley (soft hills that frame the view, never vertical)
  const ax = Math.abs(x)
  h += smooth(42, 95, ax) * (20 + Math.sin(z * 0.08 + x * 0.02) * 5) + smooth(42, 60, ax) * 2
  h += smooth(70, 120, z) * (16 + Math.sin(x * 0.09) * 4)
  return h
}

const FLAT_PADS: { x: number; z: number; r: number }[] = [
  { x: HOUSE.x, z: HOUSE.z, r: 7.5 }, { x: WORKSHOP.x, z: WORKSHOP.z, r: 13 }, { x: LETTERBOX.x, z: LETTERBOX.z, r: 3 },
  ...COTTAGES.map((c) => ({ x: c.x, z: c.z, r: 5.5 })),
]

export function heightAt(x: number, z: number) {
  let h = baseHeight(x, z)
  // paths are gently levelled toward a smoothed version of the terrain
  const dl = Math.min(distToPolyline(x, z, LANE), distToPolyline(x, z, NORTH_PATH))
  const roadD = Math.abs(z - ROAD_Z)
  const flatK = Math.max(1 - smooth(1.2, 4, dl), 1 - smooth(1.2, 4, roadD))
  h = THREE.MathUtils.lerp(h, h * 0.5, flatK)
  for (const p of FLAT_PADS) {
    const k = 1 - smooth(p.r * 0.75, p.r * 1.4, Math.hypot(x - p.x, z - p.z))
    h = THREE.MathUtils.lerp(h, baseHeight(p.x, p.z) * 0.5, k)
  }
  // the river carves a channel; its banks are pulled down to near water level
  const dr = Math.abs(z - riverZ(x))
  const bank = 1 - smooth(RIVER.half - 1, RIVER.half + 7, dr)
  h = THREE.MathUtils.lerp(h, 0.15, bank)
  h -= (1 - smooth(RIVER.half - 3, RIVER.half + 0.5, dr)) * 1.9
  return h
}
export const WATER_Y = -0.35

/** surface normal by central differences */
export function normalAt(x: number, z: number, out = new THREE.Vector3()) {
  const e = 0.4
  return out.set(heightAt(x - e, z) - heightAt(x + e, z), 2 * e, heightAt(x, z - e) - heightAt(x, z + e)).normalize()
}

export function inRiver(x: number, z: number, margin = 0) {
  return Math.abs(z - riverZ(x)) < RIVER.half - 0.8 + margin
}

/** ground colour key 0..1 for the terrain shader: path amount */
export function pathAmount(x: number, z: number) {
  const dl = Math.min(distToPolyline(x, z, LANE), distToPolyline(x, z, NORTH_PATH))
  const dt = distToPolyline(x, z, TRAIL)
  const roadD = Math.abs(z - ROAD_Z)
  return Math.max(1 - smooth(0.9, 1.9, dl), 1 - smooth(1.0, 2.1, roadD) * 1, 1 - smooth(0.6, 1.3, dt))
}

// ───────────────────────── colliders
export type Circle = { x: number; z: number; r: number }
export type Box = { minX: number; minZ: number; maxX: number; maxZ: number; id?: string }
export const circles: Circle[] = []
export const boxes: Box[] = []

function wallBoxes() {
  const H = HOUSE
  boxes.push({ minX: H.x - H.w / 2 - 0.2, minZ: H.z - H.d / 2 - 0.2, maxX: H.x + H.w / 2 + 0.2, maxZ: H.z + H.d / 2 + 0.2, id: 'house' })
  for (const c of COTTAGES) {
    const w = 5.2 * c.s, d = 4.6 * c.s
    const rot = Math.abs(Math.sin(c.yaw + Math.PI / 2)) > 0.5
    const hw = (rot ? d : w) / 2 + 0.2, hd = (rot ? w : d) / 2 + 0.2
    boxes.push({ minX: c.x - hw, minZ: c.z - hd, maxX: c.x + hw, maxZ: c.z + hd })
  }
  // workshop walls (thin boxes) with a door gap in the south wall
  const W = WORKSHOP, t = 0.35
  const x0 = W.x - W.w / 2, x1 = W.x + W.w / 2, z0 = W.z - W.d / 2, z1 = W.z + W.d / 2
  boxes.push({ minX: x0 - t, minZ: z0 - t, maxX: x1 + t, maxZ: z0 + t })
  boxes.push({ minX: x0 - t, minZ: z0, maxX: x0 + t, maxZ: z1 })
  boxes.push({ minX: x1 - t, minZ: z0, maxX: x1 + t, maxZ: z1 })
  boxes.push({ minX: x0, minZ: z1 - t, maxX: WORKSHOP_DOOR.x - WORKSHOP_DOOR.w / 2, maxZ: z1 + t })
  boxes.push({ minX: WORKSHOP_DOOR.x + WORKSHOP_DOOR.w / 2, minZ: z1 - t, maxX: x1, maxZ: z1 + t })
  // workshop furniture
  for (const s of Object.values(STATIONS)) circles.push({ x: s.x, z: s.z, r: 1.0 })
  // meadow hedge, both sides of the gate
  boxes.push({ minX: -60, minZ: MEADOW_FENCE_Z - 0.6, maxX: MEADOW_GATE.x - MEADOW_GATE.w / 2, maxZ: MEADOW_FENCE_Z + 0.6 })
  boxes.push({ minX: MEADOW_GATE.x + MEADOW_GATE.w / 2, minZ: MEADOW_FENCE_Z - 0.6, maxX: 60, maxZ: MEADOW_FENCE_Z + 0.6 })
  circles.push({ x: LETTERBOX.x, z: LETTERBOX.z, r: 0.35 }, { x: BENCH.x, z: BENCH.z, r: 0.9 }, { x: SUMMIT_TREE.x, z: SUMMIT_TREE.z, r: 0.7 }, { x: MEADOW_TREE.x, z: MEADOW_TREE.z, r: 0.6 })
  for (const [x, z] of LAMPS) circles.push({ x, z, r: 0.25 })
}
wallBoxes()

/** dynamic gates the story opens */
export const gates = {
  meadow: { open: false, box: { minX: MEADOW_GATE.x - MEADOW_GATE.w / 2, minZ: MEADOW_FENCE_Z - 0.6, maxX: MEADOW_GATE.x + MEADOW_GATE.w / 2, maxZ: MEADOW_FENCE_Z + 0.6 } as Box },
  workshop: { open: false, box: { minX: WORKSHOP_DOOR.x - WORKSHOP_DOOR.w / 2, minZ: WORKSHOP.z + WORKSHOP.d / 2 - 0.4, maxX: WORKSHOP_DOOR.x + WORKSHOP_DOOR.w / 2, maxZ: WORKSHOP.z + WORKSHOP.d / 2 + 0.4 } as Box },
  trail: { open: false, box: { minX: TRAIL_GATE.x - 3.2, minZ: TRAIL_GATE.z - 0.5, maxX: TRAIL_GATE.x + 3.2, maxZ: TRAIL_GATE.z + 0.5 } as Box },
}
/** the far bank is unreachable except by boat, and the trail gate fences a wide arc */
const TRAIL_FENCE: Box[] = [
  { minX: -62, minZ: TRAIL_GATE.z - 0.5, maxX: TRAIL_GATE.x - 3.2, maxZ: TRAIL_GATE.z + 0.5 },
  { minX: TRAIL_GATE.x + 3.2, minZ: TRAIL_GATE.z - 0.5, maxX: WORKSHOP.x - WORKSHOP.w / 2, maxZ: TRAIL_GATE.z + 0.5 },
  { minX: WORKSHOP.x + WORKSHOP.w / 2, minZ: WORKSHOP.z - WORKSHOP.d / 2 - 0.5, maxX: 62, maxZ: WORKSHOP.z - WORKSHOP.d / 2 + 0.5 },
]
boxes.push(...TRAIL_FENCE)
export { TRAIL_FENCE }

function inBox(x: number, z: number, b: Box, r: number) {
  return x > b.minX - r && x < b.maxX + r && z > b.minZ - r && z < b.maxZ + r
}

/** is a body of radius r blocked at (x, z)? */
export function blockedAt(x: number, z: number, r = 0.35) {
  if (x < BOUNDS.minX || x > BOUNDS.maxX || z < BOUNDS.minZ || z > BOUNDS.maxZ) return true
  if (inRiver(x, z)) return true
  for (const b of boxes) if (inBox(x, z, b, r)) return true
  for (const g of Object.values(gates)) if (!g.open && inBox(x, z, g.box, r)) return true
  for (const c of circles) if ((x - c.x) ** 2 + (z - c.z) ** 2 < (c.r + r) ** 2) return true
  return false
}

/** which area a point belongs to (for the lighting mood) */
export function areaAt(x: number, z: number): 'meadow' | 'village' | 'river' | 'workshop' | 'summit' {
  if (z > MEADOW_FENCE_Z + 4) return 'meadow'
  if (z > riverZ(x) + RIVER.half - 1) return 'village'
  if (z > riverZ(x) - RIVER.half - 2) return 'river'
  if (z > -54) return 'workshop'
  return 'summit'
}

/** inside the workshop footprint */
export function inWorkshop(x: number, z: number) {
  return Math.abs(x - WORKSHOP.x) < WORKSHOP.w / 2 && Math.abs(z - WORKSHOP.z) < WORKSHOP.d / 2
}

/** the floor the player stands on (terrain, or a building floor) */
export const WORKSHOP_FLOOR = heightAt(WORKSHOP.x, WORKSHOP.z) + 0.18
export function walkY(x: number, z: number) {
  if (inWorkshop(x, z)) return WORKSHOP_FLOOR
  if (Math.abs(x - WORKSHOP.x) < 3 && z > WORKSHOP.z + WORKSHOP.d / 2 - 0.2 && z < WORKSHOP.z + WORKSHOP.d / 2 + 2.6) return Math.max(heightAt(x, z), WORKSHOP_FLOOR - 0.04)
  return heightAt(x, z)
}

/** parrot guide perches for chapter II (world xyz; heights are above the local ground) */
const G = (x: number, z: number) => Math.max(heightAt(x, z), 0)
export const PERCHES: { x: number; y: number; z: number; label: string; dist?: number }[] = [
  { x: MEADOW_TREE.x - 1.75, y: heightAt(MEADOW_TREE.x, MEADOW_TREE.z) + 2.75, z: MEADOW_TREE.z + 0.35, label: 'tree branch', dist: 7 },
  { x: -1.75, y: G(-1.75, MEADOW_FENCE_Z) + 1.6, z: MEADOW_FENCE_Z, label: 'gate post', dist: 6 },
  { x: 2.6, y: G(2.6, 31) + 3.28, z: 31, label: 'village lane lamp', dist: 6.5 },
  { x: 11.5, y: G(11.5, 21) + 4.9, z: 21, label: 'east cottage', dist: 8.5 },
  { x: 2.6, y: G(2.6, 14) + 3.28, z: 14, label: 'crossroads lamp', dist: 6.5 },
  { x: -2.2, y: G(-2.2, 5) + 3.28, z: 5, label: 'north lane lamp', dist: 6.5 },
  { x: -4.4, y: G(-4.4, 15.4) + 1.15, z: 15.4, label: 'garden fence', dist: 6 },
  { x: -9, y: heightAt(HOUSE.x, HOUSE.z) + HOUSE_ROOF_RIDGE_Y, z: 20, label: 'house roof', dist: 7.5 },
]
export const ROOF_PERCH = PERCHES[PERCHES.length - 1]
