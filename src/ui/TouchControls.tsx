import { useEffect, useRef, useState } from 'react'
import { runtime, useStore } from '../store'
import { advanceDialogue } from './useInput'

/** lightweight virtual joystick + action buttons, shown on touch devices */
export function TouchControls() {
  const [touch, setTouch] = useState(false)
  const base = useRef<HTMLDivElement>(null)
  const knob = useRef<HTMLDivElement>(null)
  const nearby = useStore((s) => s.nearby)
  const open = useStore((s) => s.project || s.museum)
  const talking = useStore((s) => !!s.dialogue)

  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)')
    setTouch(mq.matches || 'ontouchstart' in window)
  }, [])

  useEffect(() => {
    const el = base.current
    if (!el) return
    let id: number | null = null
    let cx = 0, cy = 0
    const R = 52
    const start = (e: PointerEvent) => {
      e.stopPropagation()
      id = e.pointerId
      el.setPointerCapture(e.pointerId)
      const r = el.getBoundingClientRect()
      cx = r.left + r.width / 2; cy = r.top + r.height / 2
      move(e)
    }
    const move = (e: PointerEvent) => {
      if (id !== e.pointerId) return
      let dx = e.clientX - cx, dy = e.clientY - cy
      const d = Math.hypot(dx, dy)
      if (d > R) { dx *= R / d; dy *= R / d }
      runtime.joy.x = dx / R
      runtime.joy.y = -dy / R
      if (knob.current) knob.current.style.transform = `translate(${dx}px, ${dy}px)`
    }
    const end = (e: PointerEvent) => {
      if (id !== e.pointerId) return
      id = null
      runtime.joy.x = 0; runtime.joy.y = 0
      if (knob.current) knob.current.style.transform = 'translate(0,0)'
    }
    el.addEventListener('pointerdown', start)
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', end)
    el.addEventListener('pointercancel', end)
    return () => {
      el.removeEventListener('pointerdown', start)
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', end)
      el.removeEventListener('pointercancel', end)
    }
  }, [touch])

  if (!touch) return null
  return (
    <div className="touch">
      <div className="joy" ref={base}>
        <div className="joy-knob" ref={knob} />
      </div>
      <div className="touch-btns">
        <button className={`tbtn ${talking ? 'is-live' : ''}`} onPointerDown={(e) => { e.stopPropagation(); advanceDialogue() }}>▸</button>
        <button
          className={`tbtn tbtn-e ${nearby && !open ? 'is-live' : ''}`}
          disabled={!nearby && !open}
          onPointerDown={(e) => {
            e.stopPropagation()
            const st = useStore.getState()
            if (st.project) st.setProject(null)
            else if (st.museum) st.setMuseum(null)
            else runtime.interactQueued = true
          }}
        >
          {open ? 'Close' : 'E'}
        </button>
      </div>
    </div>
  )
}
