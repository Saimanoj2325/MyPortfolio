import { useEffect, useRef, useState } from 'react'
import { useProgress } from '@react-three/drei'
import gsap from 'gsap'
import { useStore } from '../store'
import { profile } from '../data/profile'

export function Loader() {
  const { progress, active } = useProgress()
  const phase = useStore((s) => s.phase)
  const setPhase = useStore((s) => s.setPhase)
  const [gone, setGone] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const shown = useRef(0)
  const [display, setDisplay] = useState(0)

  // smooth the number so it never jumps
  useEffect(() => {
    let raf = 0
    const tick = () => {
      shown.current += (progress - shown.current) * 0.12
      setDisplay(Math.round(shown.current))
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [progress])

  useEffect(() => {
    if (phase !== 'loading' || active || progress < 100) return
    const t = setTimeout(() => {
      const m = /ch=(\d)/.exec(window.location.hash)
      if (m) { setPhase('play'); useStore.getState().jumpToChapter(+m[1]) }
      else setPhase('title')
      if (root.current)
        gsap.to(root.current, { opacity: 0, duration: 1.1, ease: 'power2.inOut', delay: 0.25, onComplete: () => setGone(true) })
      else setGone(true)
    }, 500)
    return () => clearTimeout(t)
  }, [active, progress, phase, setPhase])

  if (gone) return null
  return (
    <div className="loader" ref={root}>
      <div className="loader-inner">
        <div className="loader-orb">
          <span />
        </div>
        <p className="loader-kicker">Who am I? — a small world by</p>
        <h1 className="loader-name">{profile.name}</h1>
        <div className="loader-bar">
          <i style={{ transform: `scaleX(${display / 100})` }} />
        </div>
        <p className="loader-pct">{display.toString().padStart(2, '0')}%</p>
      </div>
    </div>
  )
}
