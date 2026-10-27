// The Director: turns story beats into scenes. On entering a beat it stages the actors and runs
// that beat's script (cutscene camera, dialogue, actor commands); every frame it checks the
// proximity triggers of the current beat. Scripts are cancellable, and cutscenes are skippable:
// skipping jumps straight to the beat's end state and fires the same trigger the script would.
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useStore, runtime } from '../store'
import { beatIndex, chapterOf, type Beat } from './machine'
import { boat, camState, parrot, player, puppy, postman } from '../lib/actors'
import {
  BENCH, heightAt, HOUSE, HOUSE_DOOR_OUT, JETTY_N, JETTY_S, LETTERBOX, PERCHES, ROAD_Z, ROOF_PERCH,
  SPAWN, SUMMIT_TREE, TRAIL_GATE, WORKSHOP, WORKSHOP_DOOR,
} from '../world/layout'
import { lines, type Line } from '../data/story'
import { flyTo, placeParrot } from '../three/Parrot'
import { puppyBark, puppyGo } from '../three/Puppy'
import { finishPostman, startPostman } from '../three/Postman'
import { boatAtFarBank, crossing, resetBoat } from '../three/Boat'
import { letterboxState, houseDoor } from '../three/Village'
import { ROOM_ORIGIN, DOOR } from '../lib/room'
import { playSfx } from '../ui/sound'
import gsap from 'gsap'

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)
const gy = (x: number, z: number) => heightAt(x, z)

// ───────────────────────── script runtime
class Cancelled extends Error {}
let token = 0
let skipFn: (() => void) | null = null

function ctx() {
  const my = ++token
  const alive = () => { if (my !== token) throw new Cancelled() }
  const wait = (ms: number) => new Promise<void>((res, rej) => {
    const t0 = performance.now()
    const tick = () => {
      if (my !== token) { rej(new Cancelled()); return }
      if (useStore.getState().paused) { requestAnimationFrame(tick); return }
      if (performance.now() - t0 >= ms) res(); else requestAnimationFrame(tick)
    }
    tick()
  })
  const until = (cond: () => boolean) => new Promise<void>((res, rej) => {
    const tick = () => { if (my !== token) { rej(new Cancelled()); return } if (cond()) res(); else requestAnimationFrame(tick) }
    tick()
  })
  const say = async (ls: Line[], auto?: number) => {
    for (const line of ls) {
      alive()
      const key = Math.random()
      useStore.getState().setDialogue({ line, key, auto: auto ?? (line.thought ? 2600 + line.text.length * 45 : undefined) })
      await until(() => useStore.getState().dialogue?.key !== key)
    }
  }
  return { alive, wait, until, say }
}

/** scripted camera shot along splines; resolves when the move ends */
function shot(pos: THREE.Vector3[], look: THREE.Vector3[], dur: number, fov = 40, hold = true) {
  return new Promise<void>((res) => {
    camState.cine = {
      pos: new THREE.CatmullRomCurve3(pos.length > 1 ? pos : [pos[0], pos[0].clone().add(V(0, 0.001, 0))], false, 'centripetal'),
      look: new THREE.CatmullRomCurve3(look.length > 1 ? look : [look[0], look[0].clone().add(V(0, 0.001, 0))], false, 'centripetal'),
      dur, t: 0, fov, hold, onDone: res,
    }
  })
}
function release() { camState.cine = null }

function cutscene(on: boolean) { useStore.getState().setCutscene(on); if (!on) skipFn = null }
export function skipCutscene() { const f = skipFn; skipFn = null; f?.() }

function behind(yaw: number) { camState.heading = yaw }

// ───────────────────────── staging (chapter select / replay)
function placePlayer(x: number, z: number, yaw: number) {
  player.pos.set(x, gy(x, z), z); player.yaw = yaw; player.speed = 0; player.mode = 'free'; player.auto = null; player.look = null; player.confused = 0
  camState.heading = yaw
}
function stage(beat: Beat) {
  const i = beatIndex(beat)
  const s = useStore.getState()
  release()
  s.setDialogue(null); s.setAmbient(null)
  houseDoor.open = 0
  letterboxState.open = 0
  letterboxState.hasLetter = i >= beatIndex('c4_letterbox') && i < beatIndex('c4_letter')
  postman.active = false
  runtime.dusk = 0
  parrot.ride = false
  if (i >= beatIndex('c5_row')) boatAtFarBank(); else resetBoat()
  // parrot
  if (i < beatIndex('c2_arrive')) parrot.mode = 'hidden'
  else if (i < beatIndex('c5_row')) { const p = i <= beatIndex('c2_follow') ? PERCHES[0] : ROOF_PERCH; placeParrot(p.x, p.y, p.z, Math.PI / 2) }
  else if (i < beatIndex('c7_climb')) placeParrot(WORKSHOP.x + 3, gy(WORKSHOP.x, WORKSHOP.z) + WORKSHOP.h + 1.2, WORKSHOP.z + 0.4, 0)
  else placeParrot(SUMMIT_PERCH.x, SUMMIT_PERCH.y, SUMMIT_PERCH.z, 0)
  // puppy
  puppy.space = 'world'; puppy.happyT = 0; puppy.onArrive = null
  if (i < beatIndex('c3_puppy')) puppy.mode = 'hidden'
  // player + puppy positions per chapter start
  const ch = chapterOf(beat)
  if (ch === 1) placePlayer(SPAWN.x, SPAWN.z, SPAWN.yaw)
  else if (ch === 2) placePlayer(1.5, 58, Math.PI)
  else if (ch === 3) placePlayer(0.5, 23, -Math.PI / 2)
  else if (ch === 4) { placePlayer(HOUSE_DOOR_OUT.x, HOUSE_DOOR_OUT.z, Math.PI / 2); puppy.mode = 'sit'; puppy.pos.set(HOUSE_DOOR_OUT.x + 1.2, 0, HOUSE_DOOR_OUT.z - 1.2) }
  else if (ch === 5) { placePlayer(LETTERBOX.x + 1.2, LETTERBOX.z - 1.5, Math.PI); puppy.mode = 'follow'; puppy.pos.set(LETTERBOX.x + 2, 0, LETTERBOX.z - 1) }
  else if (ch === 6) { placePlayer(JETTY_N.x - 1.6, JETTY_N.z - 1.5, Math.PI); puppy.mode = 'follow'; puppy.pos.set(JETTY_N.x - 0.6, 0, JETTY_N.z - 2.5) }
  else if (ch === 7) { placePlayer(TRAIL_GATE.x + 0.5, TRAIL_GATE.z - 2.5, Math.PI); puppy.mode = 'follow'; puppy.pos.set(TRAIL_GATE.x + 1.5, 0, TRAIL_GATE.z - 3) }
  puppy.pos.y = gy(puppy.pos.x, puppy.pos.z)
}

// on a real bark fork of the twisted_a tree (scale 0.32, base −0.2), on the side facing the bench, with a clear
// line of sight from the summit path and ~0.75 m of room above. Verified with
// `node tools/perchcheck.mjs twisted_a 0.32 -0.2 0 2.34 0.63` (bark top at y≈2.33).
export const SUMMIT_PERCH = { x: SUMMIT_TREE.x, y: heightAt(SUMMIT_TREE.x, SUMMIT_TREE.z) + 2.34, z: SUMMIT_TREE.z + 0.63 }

// ───────────────────────── beat scripts
type Run = (c: ReturnType<typeof ctx>) => Promise<void>
const T = (t: Parameters<ReturnType<typeof useStore.getState>['trigger']>[0], arg?: string | number) => useStore.getState().trigger(t, arg)

const scripts: Partial<Record<Beat, Run>> = {
  async c1_intro(c) {
    cutscene(false)
    player.mode = 'free'
    player.confused = 0
    behind(SPAWN.yaw)
    await c.say(lines.wake, 2800)
    T('introDone')
  },
  async c1_explore(c) {
    const start = player.pos.clone()
    const t0 = performance.now()
    await c.until(() => player.pos.distanceTo(start) > 7 || performance.now() - t0 > 16000)
    await c.say(lines.forgot, 3200)
    await c.wait(600)
    T('wandered')
  },
  async c2_arrive(c) {
    cutscene(true)
    player.mode = 'locked'
    parrot.mode = 'perch'
    parrot.pos.set(player.pos.x + 30, 16, player.pos.z + 26)
    const P0 = PERCHES[0]
    const tree = V(P0.x, P0.y, P0.z)
    const toParrot = tree.clone().sub(player.pos)
    const yawToParrot = Math.atan2(toParrot.x, toParrot.z)
    const followDist = 5.4
    const followPitch = 0.28

    const end = () => {
      placeParrot(P0.x, P0.y, P0.z, Math.PI)
      player.mode = 'free'
      player.look = null
      camState.heading = yawToParrot
      camState.pitch = followPitch
      release()
      cutscene(false)
      T('parrotIntroDone')
    }
    skipFn = () => { token++; useStore.getState().setDialogue(null); end() }
    flyTo(P0.x, P0.y, P0.z, undefined, 5.2)
    player.look = parrot.head
    const mid = player.pos.clone().lerp(tree, 0.5)
    shot([player.pos.clone().add(V(-4, 2.2, 5)), player.pos.clone().add(V(-3.5, 2.6, 3.5)), mid.clone().add(V(-5, 2.5, 3))],
      [player.pos.clone().add(V(0, 1.6, 0)), parrot.pos.clone(), tree], 5.5, 42)
    await c.until(() => parrot.mode === 'perch' && !parrot.flight)
    await c.wait(500)
    shot([mid.clone().add(V(-5, 2.5, 3)), tree.clone().add(V(-3.2, -0.6, 3.2))], [tree, tree.clone().add(V(0, 0.15, 0))], 2.2, 34)
    await c.wait(1500)
    await c.say(lines.parrotIntro)

    // Panoramic multi-angle camera pan showcasing the parrot, meadow, and forward path
    playSfx('squawk')
    const P = player.pos.clone()
    const finalPos = P.clone().add(V(
      -Math.sin(yawToParrot) * followDist * Math.cos(followPitch),
      1.45 + followDist * Math.sin(followPitch),
      -Math.cos(yawToParrot) * followDist * Math.cos(followPitch),
    ))
    const finalLook = P.clone().add(V(
      Math.sin(yawToParrot) * 1.4,
      1.45,
      Math.cos(yawToParrot) * 1.4,
    ))

    const panPositions = [
      tree.clone().add(V(-3.2, -0.4, 3.2)),
      P.clone().add(V(-1.5, 11.0, 11.0)),
      P.clone().add(V(10.0, 6.2, 4.0)),
      P.clone().add(V(-Math.sin(yawToParrot + 0.6) * 7.5, 3.4, -Math.cos(yawToParrot + 0.6) * 7.5)),
      finalPos,
    ]
    const panLooks = [
      tree.clone().add(V(0, 0.2, 0)),
      P.clone().lerp(tree, 0.4).add(V(0, 2.0, -4.5)),
      tree.clone().add(V(0, 0.5, 0)),
      tree.clone().add(V(0, 0.3, 0)),
      finalLook,
    ]

    await shot(panPositions, panLooks, 6.8, 44)
    await c.wait(200)
    end()
  },
  async c2_follow(c) {
    const s = useStore.getState
    while (s().story.beat === 'c2_follow') {
      const i = s().story.perch
      const p = PERCHES[i]
      await c.until(() => parrot.mode === 'perch' && Math.hypot(player.pos.x - p.x, player.pos.z - p.z) < (p.dist ?? 6))
      T('perchReached', i)
      if (s().story.beat !== 'c2_follow') break
      const n = PERCHES[i + 1]
      flyTo(n.x, n.y, n.z)
      useStore.getState().setAmbient({ who: 'parrot', text: lines.parrotPerch[Math.min(i, lines.parrotPerch.length - 1)] })
      playSfx('squawk')
      await c.until(() => parrot.mode === 'perch')
    }
  },
  async c3_puppy(c) {
    cutscene(true)
    player.mode = 'locked'
    const door = V(HOUSE.doorX + 0.3, gy(HOUSE.doorX, HOUSE.doorZ), HOUSE.doorZ)
    const end = () => {
      houseDoor.open = 0.35
      puppy.mode = 'hidden'
      player.mode = 'free'; player.look = null
      release(); cutscene(false)
      T('puppyIntroDone')
    }
    skipFn = () => { token++; useStore.getState().setDialogue(null); end() }
    shot([player.pos.clone().add(V(3, 2.4, 3)), door.clone().add(V(7, 3.0, 0.9))], [player.pos.clone().add(V(0, 1.4, 0)), door.clone().add(V(0, 1, 0))], 2.4, 40)
    await c.wait(1600)
    gsap.to(houseDoor, { open: 1, duration: 0.6, ease: 'power2.out' })
    playSfx('door')
    await c.wait(500)
    puppy.space = 'world'
    puppy.pos.copy(door)
    puppy.yaw = Math.PI / 2
    puppy.excite = 1
    // run to the player, circle him, bark
    puppy.mode = 'goto'
    puppyGo(player.pos.x - 1.2, player.pos.z + 0.4, { mode: 'goto' })
    player.look = puppy.head
    shot([door.clone().add(V(7, 3.0, 0.9)), player.pos.clone().add(V(2.5, 2.2, 3.8))], [door.clone().add(V(0, 0.6, 0)), player.pos.clone().add(V(0, 0.5, 0))], 2.2, 44)
    await c.until(() => puppy.mode === 'sit')
    puppy.mode = 'circle'; puppy.circleC.copy(player.pos); puppy.circleA = Math.atan2(puppy.pos.z - player.pos.z, puppy.pos.x - player.pos.x)
    puppyBark('Woof! Woof!')
    await c.wait(2600)
    puppyGo(player.pos.x + 0.9, player.pos.z, { mode: 'goto' })
    await c.wait(700)
    await c.say(lines.puppyHello)
    // and back inside, looking back once
    puppyGo(door.x - 0.2, door.z, { mode: 'goto', onArrive: () => { puppyBark('Woof!') } })
    shot([player.pos.clone().add(V(2.5, 2.2, 3.8)), player.pos.clone().add(V(-1, 2.4, 5))], [player.pos.clone().add(V(0, 0.5, 0)), door.clone().add(V(0, 1, 0))], 2.5, 42)
    await c.until(() => puppy.mode === 'sit')
    await c.wait(700)
    end()
  },
  async c3_museum() {
    // the puppy greets you inside
    puppy.space = 'home'; puppy.mode = 'follow'
    puppy.pos.set(ROOM_ORIGIN.x + DOOR.x + 0.9, 0, ROOM_ORIGIN.z + 1.8)
  },
  async c3_leave(c) {
    await c.until(() => !useStore.getState().museum && !useStore.getState().seated)
    await c.wait(500)
    await c.say(lines.museumDone, 2600)
    // the puppy trots to the door and goes out to wait
    if (useStore.getState().place === 'home') {
      puppyGo(ROOM_ORIGIN.x + DOOR.x, ROOM_ORIGIN.z + 2.6, { mode: 'goto' })
      await c.until(() => puppy.mode === 'sit')
    }
    puppy.space = 'world'; puppy.mode = 'sit'
    puppy.pos.set(HOUSE_DOOR_OUT.x + 1.2, gy(HOUSE_DOOR_OUT.x, HOUSE_DOOR_OUT.z), HOUSE_DOOR_OUT.z - 1.2)
  },
  async c4_postman(c) {
    cutscene(true)
    player.mode = 'locked'
    const lb = V(LETTERBOX.x, gy(LETTERBOX.x, LETTERBOX.z), LETTERBOX.z)
    const end = () => {
      finishPostman()
      puppy.mode = 'sit'; puppy.pos.set(LETTERBOX.x + 0.9, gy(LETTERBOX.x + 0.9, LETTERBOX.z - 0.6), LETTERBOX.z - 0.6)
      player.mode = 'free'; player.look = null
      release(); cutscene(false)
      T('postmanDone')
    }
    skipFn = () => { token++; useStore.getState().setDialogue(null); end() }
    if (puppy.mode === 'hidden') { puppy.space = 'world'; puppy.mode = 'sit'; puppy.pos.set(HOUSE_DOOR_OUT.x + 1.2, 0, HOUSE_DOOR_OUT.z - 1.2) }
    let delivered = false
    startPostman(() => { delivered = true })
    player.look = postman.head
    // camera stays east of the house front (x > HOUSE.x + w/2): the old end point sat inside the porch
    shot([lb.clone().add(V(4.5, 2.6, 7.5)), lb.clone().add(V(2.4, 2.3, 7))], [V(-20, 1.2, ROAD_Z), lb.clone().add(V(0, 1, 0))], 7.5, 42)
    await c.until(() => letterboxState.hasLetter)
    // the puppy dashes to the letterbox and barks at it
    puppyGo(LETTERBOX.x + 0.9, LETTERBOX.z - 0.6, { mode: 'goto', onArrive: () => puppyBark('Woof! Woof!') })
    await c.until(() => delivered)
    shot([lb.clone().add(V(2.4, 2.3, 7)), lb.clone().add(V(3.2, 1.6, 3.4))], [V(10, 1.2, ROAD_Z), lb.clone().add(V(0, 1.1, 0))], 2.6, 40)
    await c.wait(2600)
    end()
  },
  async c4_letterbox(c) {
    letterboxState.hasLetter = true
    while (useStore.getState().story.beat === 'c4_letterbox') {
      await c.wait(6500)
      if (Math.hypot(player.pos.x - LETTERBOX.x, player.pos.z - LETTERBOX.z) > 2.5) puppyBark()
    }
  },
  async c4_letter(c) {
    gsap.to(letterboxState, { open: 1, duration: 0.5 })
    playSfx('paper')
    await c.wait(500)
    useStore.getState().setLetter(true)
  },
  async c5_board(c) {
    letterboxState.hasLetter = false
    gsap.to(letterboxState, { open: 0, duration: 0.6, delay: 0.4 })
    await c.wait(700)
    await c.say(lines.letterAfter, 2800)
    // the puppy leads down the lane to the jetty, the parrot flies from the roof to the boat
    puppyGo(JETTY_S.x - 1.6, JETTY_S.z - 1.2, { mode: 'lead', waitDist: 7 })
    await c.until(() => Math.hypot(player.pos.x - JETTY_S.x, player.pos.z - JETTY_S.z) < 14)
    if (parrot.mode !== 'fly') flyTo(boat.pos.x + Math.sin(boat.yaw) * 1.32, boat.pos.y + 0.12, boat.pos.z + Math.cos(boat.yaw) * 1.32, () => { parrot.ride = true })
  },
  async c5_row(c) {
    // hop in: puppy first, then the parrot settles on the bow
    const s = useStore.getState()
    s.setCutscene(true)
    resetBoat()
    if (!parrot.ride) { placeParrot(boat.pos.x, boat.pos.y + 0.12, boat.pos.z - 1.32, Math.PI); parrot.ride = true }
    puppy.mode = 'boat'
    player.mode = 'boat'
    crossing.idle = 0
    crossing.onMid = () => { void c.say(lines.river, 3600).catch(() => {}) }
    crossing.onLand = () => T('landed')
    shot([boat.pos.clone().add(V(4, 3, 4)), boat.pos.clone().add(V(0, 3.4, 7.5))], [boat.pos.clone(), boat.pos.clone().add(V(0, 0.5, -4))], 2.2, 46)
    await c.wait(2300)
    release()
    camState.heading = Math.PI
    s.setCutscene(false)
  },
  async c6_workshop(c) {
    player.mode = 'free'
    player.pos.set(JETTY_N.x - 1.6, gy(JETTY_N.x, JETTY_N.z), JETTY_N.z - 1.0)
    player.yaw = Math.PI; camState.heading = Math.PI
    parrot.ride = false
    puppy.mode = 'follow'; puppy.pos.set(JETTY_N.x - 0.8, 0, JETTY_N.z - 1.6)
    flyTo(WORKSHOP.x + 3, gy(WORKSHOP.x, WORKSHOP.z) + WORKSHOP.h + 1.2, WORKSHOP.z + 0.4)
    await c.wait(800)
    puppyGo(WORKSHOP_DOOR.x - 1.4, WORKSHOP_DOOR.z + 2.2, { mode: 'lead', waitDist: 6, onArrive: () => { puppy.mode = 'follow' } })
    await c.until(() => Math.hypot(player.pos.x - WORKSHOP_DOOR.x, player.pos.z - WORKSHOP_DOOR.z) < 9)
    await c.say(lines.workshop, 2800)
  },
  async c6_projects(c) {
    puppy.mode = 'follow'
    await c.until(() => useStore.getState().story.projects.length >= 3)
    await c.until(() => !useStore.getState().project)
    await c.wait(600)
    flyTo(TRAIL_GATE.x - 1.9, gy(TRAIL_GATE.x, TRAIL_GATE.z) + 2.25, TRAIL_GATE.z, undefined, 3)
    useStore.getState().setAmbient({ who: 'parrot', text: lines.trailOpen[0].text })
    playSfx('squawk')
    // walking through the open gate starts chapter VII
    await c.until(() => player.pos.z < TRAIL_GATE.z - 1.2 && Math.abs(player.pos.x - TRAIL_GATE.x) < 6)
    T('enterTrail')
  },
  async c7_climb(c) {
    flyTo(SUMMIT_PERCH.x, SUMMIT_PERCH.y, SUMMIT_PERCH.z, undefined, 6)
    puppy.mode = 'follow'
    await c.until(() => Math.hypot(player.pos.x - BENCH.x, player.pos.z - BENCH.z) < 7)
    T('reachSummit')
  },
  async c7_bench(c) {
    const by = gy(BENCH.x, BENCH.z)
    puppyGo(BENCH.x + 0.5, BENCH.z + 0.9, { mode: 'goto', onArrive: () => {
      puppy.mode = 'bench'; puppy.pos.set(BENCH.x + Math.cos(BENCH.yaw) * 0.5, by + 0.5, BENCH.z - Math.sin(BENCH.yaw) * 0.5); puppy.yaw = BENCH.yaw
    } })
    await c.wait(600)
    await c.say(lines.summit)
  },
  async c7_finale(c) {
    const s = useStore.getState()
    cutscene(true)
    const by = gy(BENCH.x, BENCH.z)
    const seat = V(BENCH.x - Math.cos(BENCH.yaw) * 0.45, by, BENCH.z + Math.sin(BENCH.yaw) * 0.45)
    const end = () => {
      player.mode = 'bench'; player.auto = null
      player.pos.copy(seat).add(V(0, 0.02, 0)); player.yaw = BENCH.yaw
      puppy.mode = 'bench'; puppy.pos.set(BENCH.x + Math.cos(BENCH.yaw) * 0.5, by + 0.5, BENCH.z - Math.sin(BENCH.yaw) * 0.5); puppy.yaw = BENCH.yaw
      runtime.dusk = 1
      const P = V(BENCH.x, by, BENCH.z)
      shot([P.clone().add(V(14, 26, 60))], [V(0, 0, 10)], 0.01, 40)
      s.setFinale(2); cutscene(false)
      T('finaleDone')
    }
    skipFn = () => { token++; useStore.getState().setDialogue(null); end() }
    player.auto = { x: seat.x + Math.sin(BENCH.yaw) * 0.6, z: seat.z + Math.cos(BENCH.yaw) * 0.6, speed: 1.6 }
    await c.until(() => !player.auto)
    player.mode = 'bench'
    player.pos.copy(seat).add(V(0, 0.02, 0))
    player.yaw = BENCH.yaw
    if (puppy.mode !== 'bench') { puppy.mode = 'bench'; puppy.pos.set(BENCH.x + Math.cos(BENCH.yaw) * 0.5, by + 0.5, BENCH.z - Math.sin(BENCH.yaw) * 0.5); puppy.yaw = BENCH.yaw }
    // the long pull-back: from behind the pair on the bench, up and out over the whole valley, into dusk
    const P = V(BENCH.x, by + 1.0, BENCH.z)
    const fwd = V(Math.sin(BENCH.yaw), 0, Math.cos(BENCH.yaw))
    const path = [
      P.clone().addScaledVector(fwd, -3.2).add(V(0.4, 0.6, 0)),
      P.clone().addScaledVector(fwd, -5).add(V(-2, 3, 0)),
      P.clone().addScaledVector(fwd, -6).add(V(-6, 9, 0)),
      P.clone().add(V(-4, 18, 14)),
      P.clone().add(V(14, 26, 60)),
    ]
    const look = [P.clone().addScaledVector(fwd, 6), P.clone().addScaledVector(fwd, 12), V(-6, 0, -20), V(-2, 0, 0), V(0, 0, 10)]
    gsap.to(runtime, { dusk: 1, duration: 16, ease: 'sine.inOut' })
    void shot(path, look, 18, 42)
    await c.wait(7500)
    s.setFinale(1)
    await c.wait(9500)
    s.setFinale(2)
    cutscene(false)
    T('finaleDone')
  },
}

// ───────────────────────── component
export function Director() {
  const lastBeat = useRef<Beat | null>(null)
  const lastEpoch = useRef(-1)

  useEffect(() => {
    const run = (beat: Beat, epoch: number) => {
      if (epoch !== lastEpoch.current) { lastEpoch.current = epoch; stage(beat) }
      if (beat === lastBeat.current) return
      lastBeat.current = beat
      token++ // cancel the previous beat's script
      skipFn = null
      const sc = scripts[beat]
      if (sc) sc(ctx()).catch((e) => { if (!(e instanceof Cancelled)) console.error(e) })
    }
    const unsub = useStore.subscribe((s, prev) => {
      if (s.phase !== 'play') return
      if (s.story.beat !== prev.story.beat || s.epoch !== prev.epoch || prev.phase !== 'play') {
        if (s.epoch !== prev.epoch) lastBeat.current = null
        run(s.story.beat, s.epoch)
      }
    })
    const s = useStore.getState()
    if (s.phase === 'play') run(s.story.beat, s.epoch)
    return unsub
  }, [])

  return null
}
