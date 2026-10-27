import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { useStore } from '../store'

export function TitleScreen() {
  const ref = useRef<HTMLDivElement>(null)
  const sound = useStore((s) => s.sound)
  const toggleSound = useStore((s) => s.toggleSound)

  useEffect(() => {
    if (!ref.current) return
    gsap.fromTo(
      ref.current.querySelectorAll('.t-anim'),
      { opacity: 0, y: 18, filter: 'blur(8px)' },
      { opacity: 1, y: 0, filter: 'blur(0px)', stagger: 0.12, duration: 1.2, ease: 'expo.out', delay: 0.2 }
    )
  }, [])

  const beginning = useRef(false)
  const begin = () => {
    if (beginning.current) return
    const s = useStore.getState()
    if (s.phase !== 'title') return
    beginning.current = true

    const el = ref.current
    if (el) {
      gsap.to(el, {
        opacity: 0,
        duration: 0.6,
        ease: 'power2.out',
        onComplete: () => {
          useStore.getState().setPhase('play')
          useStore.getState().showCard(1)
        },
      })
    } else {
      useStore.getState().setPhase('play')
      useStore.getState().showCard(1)
    }
  }

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Enter') begin() }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [])

  return (
    <div className="title" ref={ref}>
      <div className="title-content">
        <p className="title-kicker t-anim">A STORY OF CURIOSITY</p>
        <h1 className="title-h1 t-anim">Who am I?</h1>
        <p className="title-sub t-anim">
          A journey through the things I've learned, the things I've built, and the person I'm becoming.
        </p>
        <div className="title-actions t-anim">
          <button className="btn-begin-journey" onClick={begin}>
            <span>Begin the journey</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </button>
          <div className="title-secondary-actions">
            <button className="btn-title-ghost" onClick={toggleSound}>
              Sound {sound ? 'ON' : 'OFF'}
            </button>
            <a className="title-tour-link" href="#tour" onClick={() => useStore.getState().setPhase('tour')}>
              2-min recruiter tour →
            </a>
          </div>
        </div>
        <p className="title-help-keys t-anim">
          <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> or arrows to walk · drag to look around
        </p>
      </div>
    </div>
  )
}
