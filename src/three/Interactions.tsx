// Picks the nearest enabled interactable in range each frame, and runs it on E / tap.
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { interactables } from '../lib/interact'
import { player } from '../lib/actors'
import { runtime, useStore } from '../store'
import { seat } from './Player'
import { playSfx } from '../ui/sound'

export function Interactions() {
  useFrame(() => {
    const s = useStore.getState()
    if (s.phase !== 'play') return
    if (player.mode === 'boat') return
    const busy = s.paused || s.cutscene || !!s.museum || s.letterOpen || !!s.project || s.seated || seat.phase !== 'none' || s.finale > 0 || player.mode === 'bench'
      || (!!s.dialogue && !s.dialogue.line.thought)
    let best: { id: string; label: string; verb: string; d: number; pr: number } | null = null
    if (!busy) {
      for (const it of interactables.values()) {
        if (it.space !== s.place || !it.enabled()) continue
        const d = s.place === 'world'
          ? Math.hypot(player.pos.x - it.at.x, player.pos.z - it.at.z)
          : Math.hypot(player.room.x - it.at.x, player.room.z - it.at.z)
        if (d > it.radius) continue
        const pr = it.priority ?? 0
        // lower priority value wins; distance breaks ties
        if (!best || pr < best.pr || (pr === best.pr && d < best.d)) best = { id: it.id, label: it.label, verb: it.verb, d, pr }
      }
    }
    s.setNearby(best ? { id: best.id, label: best.label, verb: best.verb } : null)
    if (runtime.interactQueued) {
      runtime.interactQueued = false
      if (best && !busy) { interactables.get(best.id)?.onInteract(); playSfx('tick') }
    }
  })
  return null
}
void THREE
