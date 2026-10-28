import { useEffect, useMemo, useRef, useState } from 'react'
import { useProgress } from '@react-three/drei'
import gsap from 'gsap'
import { useStore } from '../store'
import { profile } from '../data/profile'
import { playSfx } from './sound'

const PHRASES = [
  { min: 0, max: 22, text: 'Waking the quiet meadow…' },
  { min: 22, max: 44, text: 'Following the first curious question…' },
  { min: 44, max: 66, text: 'Tracing the river and the lanterns…' },
  { min: 66, max: 86, text: 'Kindling the studio workshop…' },
  { min: 86, max: 97, text: 'Piecing together memory and craft…' },
  { min: 98, max: 100, text: 'Curiosity awakened. Welcome.' },
]

const CHAPTERS = [
  { numeral: 'I', label: 'The Meadow' },
  { numeral: 'II', label: 'The Parrot' },
  { numeral: 'III', label: 'Home' },
  { numeral: 'IV', label: 'The Letter' },
  { numeral: 'V', label: 'The River' },
  { numeral: 'VI', label: 'The Studio' },
  { numeral: 'VII', label: 'The Summit' },
]

export function Loader() {
  const { progress, active } = useProgress()
  const phase = useStore((s) => s.phase)
  const setPhase = useStore((s) => s.setPhase)
  const [gone, setGone] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const shown = useRef(0)
  const [display, setDisplay] = useState(0)

  // Smooth number interpolation: guarantees graceful organic progress even if cached
  useEffect(() => {
    let raf = 0
    const tick = () => {
      // Clamp target strictly between 0 and 100
      const target = Math.max(0, Math.min(100, progress || 0))
      // Smooth organic approach: strictly positive, mathematically impossible to go negative
      shown.current += (target - shown.current) * 0.12
      const clamped = Math.max(0, Math.min(100, Math.round(shown.current)))
      setDisplay(clamped)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [progress])

  // Current narrative micro-phrase
  const currentPhrase = useMemo(() => {
    return PHRASES.find((p) => display >= p.min && display <= p.max)?.text || PHRASES[0].text
  }, [display])

  // Active chapter beacons
  const activeChapterCount = useMemo(() => {
    if (display >= 95) return 7
    return Math.max(0, Math.min(7, Math.floor((display / 100) * 7)))
  }, [display])

  // Safety timer: guarantees the portfolio always transitions within 3.2 seconds
  useEffect(() => {
    const safety = setTimeout(() => {
      const s = useStore.getState()
      if (s.phase === 'loading') {
        const m = /ch=(\d)/.exec(window.location.hash)
        if (m) {
          s.setPhase('play')
          s.jumpToChapter(+m[1])
        } else {
          s.setPhase('title')
        }
        if (root.current) {
          gsap.to(root.current, {
            opacity: 0,
            scale: 1.02,
            filter: 'blur(6px)',
            duration: 0.8,
            ease: 'power2.inOut',
            onComplete: () => setGone(true),
          })
        } else {
          setGone(true)
        }
      }
    }, 3200)
    return () => clearTimeout(safety)
  }, [])

  // Transition to title screen once loading completes smoothly
  useEffect(() => {
    if (phase !== 'loading' || (progress < 100 && display < 98)) return

    let played = false
    const t = setTimeout(() => {
      if (!played) {
        played = true
        try { playSfx('seal') } catch {}
      }

      const m = /ch=(\d)/.exec(window.location.hash)
      if (m) {
        setPhase('play')
        useStore.getState().jumpToChapter(+m[1])
      } else {
        setPhase('title')
      }

      if (root.current) {
        gsap.to(root.current, {
          opacity: 0,
          scale: 1.025,
          filter: 'blur(6px)',
          duration: 0.85,
          ease: 'power2.inOut',
          delay: 0.15,
          onComplete: () => setGone(true),
        })
      } else {
        setGone(true)
      }
    }, 350)

    return () => clearTimeout(t)
  }, [active, progress, display, phase, setPhase])

  if (gone) return null

  const isComplete = display >= 100

  return (
    <div className={`loader ${isComplete ? 'is-complete' : ''}`} ref={root}>
      {/* Ambient breathing dawn aura */}
      <div className="loader-dawn-aura" aria-hidden="true" />

      {/* Subtle architectural editorial corner marks */}
      <div className="loader-corners" aria-hidden="true">
        <div className="loader-corner top-left">
          <span className="corner-mark">+</span>
          <span className="corner-label">PROLOGUE · I</span>
        </div>
        <div className="loader-corner top-right">
          <span className="corner-label">17°23'N 78°28'E</span>
          <span className="corner-mark">+</span>
        </div>
        <div className="loader-corner bottom-left">
          <span className="corner-mark">+</span>
          <span className="corner-label">{profile.firstName.toUpperCase()} · PORTFOLIO</span>
        </div>
        <div className="loader-corner bottom-right">
          <span className="corner-label">INTERACTIVE 3D WORLD</span>
          <span className="corner-mark">+</span>
        </div>
      </div>

      <div className="loader-inner">
        {/* Celestial Astrolabe / Curiosity Compass */}
        <div className="loader-astrolabe-wrap">
          <svg
            className="loader-astrolabe"
            viewBox="0 0 140 140"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <defs>
              <radialGradient id="compass-glow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#d0643a" stopOpacity="0.22" />
                <stop offset="65%" stopColor="#d0643a" stopOpacity="0.05" />
                <stop offset="100%" stopColor="#d0643a" stopOpacity="0" />
              </radialGradient>
              <filter id="ember-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Core warm aura */}
            <circle cx="70" cy="70" r="42" fill="url(#compass-glow)" />

            {/* Outer ring with cardinal star markers */}
            <g className="astrolabe-ring-outer">
              <circle
                cx="70"
                cy="70"
                r="62"
                stroke="rgba(34,38,45,0.18)"
                strokeWidth="1"
                strokeDasharray="2 6"
              />
              {/* North star pip */}
              <polygon points="70,5 72.5,8 70,11 67.5,8" fill="#d0643a" />
              {/* East pip */}
              <circle cx="132" cy="70" r="1.5" fill="rgba(34,38,45,0.35)" />
              {/* South pip */}
              <circle cx="70" cy="132" r="1.5" fill="rgba(34,38,45,0.35)" />
              {/* West pip */}
              <circle cx="8" cy="70" r="1.5" fill="rgba(34,38,45,0.35)" />
            </g>

            {/* Middle counter-rotating precision orbit */}
            <g className="astrolabe-ring-mid">
              <circle
                cx="70"
                cy="70"
                r="48"
                stroke="rgba(34,38,45,0.22)"
                strokeWidth="1"
              />
              <circle
                cx="70"
                cy="70"
                r="44"
                stroke="rgba(208,100,58,0.25)"
                strokeWidth="0.75"
                strokeDasharray="1 8"
              />
            </g>

            {/* Orbiting ember satellite */}
            <g className="astrolabe-satellite-track">
              <circle
                cx="70"
                cy="22"
                r="3.5"
                fill="#d0643a"
                filter="url(#ember-glow)"
              />
            </g>

            {/* Inner ring */}
            <circle
              cx="70"
              cy="70"
              r="30"
              stroke="rgba(34,38,45,0.2)"
              strokeWidth="1"
              strokeDasharray="3 3"
            />

            {/* Center question mark — the seed of curiosity */}
            <g className="astrolabe-core">
              <text
                x="70"
                y="76"
                textAnchor="middle"
                className="astrolabe-question-mark"
              >
                ?
              </text>
              <circle
                cx="70"
                cy="78.5"
                r="2"
                fill="#d0643a"
                className="astrolabe-ember-dot"
                filter="url(#ember-glow)"
              />
            </g>

            {/* Radiant pulse circle on completion */}
            <circle
              cx="70"
              cy="70"
              r="64"
              stroke="#d0643a"
              strokeWidth="1.5"
              fill="none"
              className="astrolabe-pulse-ring"
            />
          </svg>
        </div>

        {/* Narrative Kickers & Identity */}
        <p className="loader-kicker">A Story of Curiosity</p>
        <h1 className="loader-name">Who am I?</h1>
        <p className="loader-byline">
          <span>{profile.name}</span>
          <span className="loader-byline-sep">·</span>
          <span>AI & Systems Engineer</span>
        </p>

        {/* Narrative Micro-phrase */}
        <div className="loader-story-line">
          <span className="loader-story-dot" />
          <span className="loader-story-text" key={currentPhrase}>
            {currentPhrase}
          </span>
        </div>

        {/* Progress Bar & Telemetry */}
        <div className="loader-progress-area">
          <div className="loader-bar" role="progressbar" aria-valuenow={display} aria-valuemin={0} aria-valuemax={100}>
            <div
              className="loader-bar-fill"
              style={{ transform: `scaleX(${display / 100})` }}
            />
            <div
              className="loader-bar-spark"
              style={{ left: `${Math.min(100, display)}%` }}
            />
          </div>
          <div className="loader-meta">
            <span className="loader-status">
              {isComplete ? 'READY TO EXPLORE' : 'GATHERING WORLD'}
            </span>
            <span className="loader-pct">{display.toString().padStart(2, '0')}%</span>
          </div>
        </div>

        {/* Chapter Beacons (I - VII) */}
        <div className="loader-chapters" aria-label="World chapters loading">
          {CHAPTERS.map((ch, idx) => {
            const isLit = idx < activeChapterCount
            return (
              <span
                key={ch.numeral}
                className={`loader-chapter-node ${isLit ? 'is-lit' : ''}`}
                title={ch.label}
              >
                <span className="node-num">{ch.numeral}</span>
                <span className="node-pip" />
              </span>
            )
          })}
        </div>
      </div>
    </div>
  )
}
