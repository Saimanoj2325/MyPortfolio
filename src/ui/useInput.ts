import { useEffect } from 'react'
import { runtime, useStore } from '../store'
import { standUp } from '../three/Player'
import { skipCutscene } from '../story/Director'

const MOVE_KEYS = new Set(['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'])

/** Space / click: finish the typewriter, or advance to the next line */
export function advanceDialogue() {
  const s = useStore.getState()
  if (!s.dialogue) return false
  runtime.advanceQueued = true // the bubble decides: complete typing, or close
  return true
}

/** keyboard + mouse/touch drag orbit */
export function useInput() {
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const s = useStore.getState()
      const k = e.key.toLowerCase()
      if (s.phase !== 'play') return
      if ((e.target as HTMLElement)?.closest?.('input, textarea, .os')) {
        if (k === 'escape') {
          if (s.riverMessageOpen) { s.setRiverMessageOpen(false); s.setRiverBottleState('released'); return }
          standUp()
        }
        return
      }
      if (k === 'escape') {
        e.preventDefault()
        if (s.project) s.setProject(null)
        else if (s.museum) s.setMuseum(null)
        else if (s.letterOpen) window.dispatchEvent(new CustomEvent('letter-close'))
        else if (s.riverMessageOpen) { s.setRiverMessageOpen(false); s.setRiverBottleState('released') }
        else if (s.seated) standUp()
        else if (s.cutscene) skipCutscene()
        else s.setPaused(!s.paused)
        return
      }
      if (s.paused) return
      if (k === ' ' || k === 'enter') {
        e.preventDefault()
        if (s.letterOpen) { window.dispatchEvent(new CustomEvent('letter-advance')); return }
        advanceDialogue()
        return
      }
      if (s.seated) return
      if (MOVE_KEYS.has(k)) { runtime.keys.add(k); e.preventDefault() }
      if (k === 'shift') runtime.runHeld = true
      if (k === 'e' && !e.repeat) {
        if (s.project) s.setProject(null)
        else if (s.museum) s.setMuseum(null)
        else if (s.dialogue && !s.dialogue.line.thought) advanceDialogue()
        else runtime.interactQueued = true
      }
    }
    const up = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      runtime.keys.delete(k)
      if (k === 'shift') runtime.runHeld = false
    }
    const blur = () => { runtime.keys.clear(); runtime.runHeld = false }

    let dragging: number | null = null
    let lx = 0, ly = 0
    const pdown = (e: PointerEvent) => {
      if (useStore.getState().phase !== 'play') return
      const t = e.target as HTMLElement
      if (!t.closest('#stage') || t.closest('.os')) return
      if (useStore.getState().place === 'home') return
      dragging = e.pointerId; lx = e.clientX; ly = e.clientY
    }
    const pmove = (e: PointerEvent) => {
      if (dragging !== e.pointerId) return
      const dx = e.clientX - lx, dy = e.clientY - ly
      lx = e.clientX; ly = e.clientY
      runtime.dragYaw += dx * 0.0055
      runtime.dragPitch += dy * 0.0035
    }
    const pup = (e: PointerEvent) => { if (dragging === e.pointerId) dragging = null }

    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    window.addEventListener('pointerdown', pdown)
    window.addEventListener('pointermove', pmove)
    window.addEventListener('pointerup', pup)
    window.addEventListener('pointercancel', pup)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', blur)
      window.removeEventListener('pointerdown', pdown)
      window.removeEventListener('pointermove', pmove)
      window.removeEventListener('pointerup', pup)
      window.removeEventListener('pointercancel', pup)
    }
  }, [])
}
