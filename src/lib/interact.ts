// Registry of interactables. Components register a point + handler; the player picks the nearest in range.
import * as THREE from 'three'

export type Interactable = {
  id: string
  /** world: world xz point; home: room-space point (x, 0, z) */
  space: 'world' | 'home'
  at: THREE.Vector3
  radius: number // metres
  label: string
  verb: string
  enabled: () => boolean
  onInteract: () => void
  /** lower wins when several are in range (default 0) */
  priority?: number
}

export const interactables = new Map<string, Interactable>()
export function registerInteractable(i: Interactable) {
  interactables.set(i.id, i)
  return () => { if (interactables.get(i.id) === i) interactables.delete(i.id) }
}
