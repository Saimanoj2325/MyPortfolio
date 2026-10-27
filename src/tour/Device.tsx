// Device mockups (phone / laptop with a 9:41 status bar) and the small interactive gimmick inside each.
import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { Project } from '../data/projects'
import { useGuide } from './guideStore'

function StatusIcons() {
  return (
    <span className="sb-icons" aria-hidden>
      <svg width="17" height="11" viewBox="0 0 17 11"><rect x="0" y="7" width="3" height="4" rx="1" /><rect x="4.5" y="5" width="3" height="6" rx="1" /><rect x="9" y="2.5" width="3" height="8.5" rx="1" /><rect x="13.5" y="0" width="3" height="11" rx="1" /></svg>
      <svg width="15" height="11" viewBox="0 0 15 11"><path d="M7.5 2.2c2.1 0 4 .8 5.4 2.1l1.1-1.1A9.2 9.2 0 007.5.6 9.2 9.2 0 001 3.2l1.1 1.1A7.6 7.6 0 017.5 2.2zm0 3.2c1.2 0 2.3.4 3.1 1.2l1.1-1.1a6 6 0 00-8.4 0l1.1 1.1c.8-.8 1.9-1.2 3.1-1.2zm0 3.1c.5 0 .9.2 1.2.5L7.5 10.2 6.3 9c.3-.3.7-.5 1.2-.5z" /></svg>
      <svg width="25" height="12" viewBox="0 0 25 12"><rect x="0.5" y="0.5" width="21" height="11" rx="3.2" fill="none" stroke="currentColor" opacity="0.5" /><rect x="2" y="2" width="16" height="8" rx="2" /><rect x="22.5" y="4" width="1.6" height="4" rx="0.8" opacity="0.5" /></svg>
    </span>
  )
}

export function Device({ p, children }: { p: Project; children: ReactNode }) {
  if (p.device === 'phone') {
    return (
      <div className="phone" style={{ ['--a' as string]: p.palette[0], ['--b' as string]: p.palette[1] }}>
        <div className="phone-screen">
          <div className="statusbar"><span className="sb-time">9:41</span><i className="island" /><StatusIcons /></div>
          <div className="screen-body">{children}</div>
          <i className="home-indicator" />
        </div>
      </div>
    )
  }
  return (
    <div className="laptop" style={{ ['--a' as string]: p.palette[0], ['--b' as string]: p.palette[1] }}>
      <div className="laptop-lid">
        <i className="cam" />
        <div className="laptop-screen">
          <div className="statusbar mac"><span className="sb-app"> {p.title}</span><span className="sb-right"><StatusIcons /><span className="sb-time">9:41</span></span></div>
          <div className="screen-body">{children}</div>
        </div>
      </div>
      <div className="laptop-base"><i /></div>
    </div>
  )
}

/** scratch away the handwritten scrawl to reveal the parsed list */
export function Scratch({ p }: { p: Project }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const done = useRef(false)
  useEffect(() => {
    const c = canvas.current
    if (!c) return
    const ctx = c.getContext('2d')!
    const r = c.getBoundingClientRect()
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    c.width = r.width * dpr; c.height = r.height * dpr
    ctx.scale(dpr, dpr)
    // paper + a doctor's scrawl
    ctx.fillStyle = '#ece4d3'; ctx.fillRect(0, 0, r.width, r.height)
    ctx.strokeStyle = '#3c4658'; ctx.lineWidth = 1.6; ctx.lineCap = 'round'
    let seed = 7
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    for (let line = 0; line < 9; line++) {
      const y = 40 + line * (r.height - 80) / 9
      ctx.beginPath()
      let x = 22
      ctx.moveTo(x, y)
      while (x < r.width - 30 - rnd() * 60) {
        x += 4 + rnd() * 6
        ctx.lineTo(x, y + Math.sin(x * 0.35 + line) * (4 + rnd() * 6) - rnd() * 4)
      }
      ctx.stroke()
    }
    ctx.fillStyle = 'rgba(60,70,88,0.55)'; ctx.font = 'italic 13px Georgia, serif'
    ctx.fillText('Rx — scratch to read', 22, r.height - 18)
    ctx.globalCompositeOperation = 'destination-out'
    let down = false
    const scratch = (e: PointerEvent) => {
      const b = c.getBoundingClientRect()
      ctx.beginPath(); ctx.arc(e.clientX - b.left, e.clientY - b.top, 20, 0, Math.PI * 2); ctx.fill()
      if (!done.current) {
        const data = ctx.getImageData(0, 0, c.width, c.height).data
        let clear = 0
        for (let i = 3; i < data.length; i += 64) if (data[i] === 0) clear++
        if (clear / (data.length / 64) > 0.45) { done.current = true; useGuide.getState().say('See? Perfectly legible. Mostly.', { hold: 2400, force: true }) }
      }
    }
    const d = (e: PointerEvent) => { down = true; c.setPointerCapture(e.pointerId); scratch(e) }
    const m = (e: PointerEvent) => { if (down) scratch(e) }
    const u = () => { down = false }
    c.addEventListener('pointerdown', d); c.addEventListener('pointermove', m); c.addEventListener('pointerup', u)
    return () => { c.removeEventListener('pointerdown', d); c.removeEventListener('pointermove', m); c.removeEventListener('pointerup', u) }
  }, [])
  return (
    <div className="g-scratch">
      <div className="g-app">
        <p className="g-app-kicker">{p.title}</p>
        <h5>Parsed prescription</h5>
        <ul>
          <li><b>Amoxicillin</b><span>500 mg · 3× daily · 5 days</span></li>
          <li><b>Paracetamol</b><span>650 mg · when needed</span></li>
          <li><b>Vitamin D3</b><span>60k IU · weekly</span></li>
        </ul>
        <p className="g-note">Inference Confidence 0.96 · Verified</p>
      </div>
      <canvas ref={canvas} className="g-scratch-canvas" aria-label="Scratch to reveal" />
    </div>
  )
}

/** before / after divider */
export function Slider({ p }: { p: Project }) {
  const [x, setX] = useState(52)
  const box = useRef<HTMLDivElement>(null)
  const drag = (e: React.PointerEvent) => {
    const b = box.current!.getBoundingClientRect()
    setX(Math.max(4, Math.min(96, ((e.clientX - b.left) / b.width) * 100)))
  }
  return (
    <div className="g-slider" ref={box} onPointerMove={(e) => e.buttons && drag(e)} onPointerDown={(e) => { (e.target as Element).setPointerCapture(e.pointerId); drag(e) }}>
      <div className="g-before">
        <div className="gb-nav" /><div className="gb-h" /><div className="gb-p" /><div className="gb-p short" /><div className="gb-grid"><i /><i /><i /></div>
        <span className="g-tag">Before</span>
      </div>
      <div className="g-after" style={{ clipPath: `inset(0 0 0 ${x}%)` }}>
        <p className="ga-kicker">Chapter one</p>
        <h5 className="ga-h">A product,<br /><em>told like a film.</em></h5>
        <i className="ga-orb" style={{ background: `radial-gradient(circle at 30% 30%, ${p.palette[1]}, transparent 60%)` }} />
        <span className="g-tag">After</span>
      </div>
      <div className="g-handle" style={{ left: `${x}%` }}><i /></div>
    </div>
  )
}

const REPLIES = [
  'Interesting. And how would you test that?',
  'Good. Now explain it to a five-year-old.',
  'Nice. What would break first at 10× traffic?',
  'Strong answer. Next question: tabs or spaces?',
]
/** a tiny interview terminal */
export function Terminal({ p }: { p: Project }) {
  const [lines, setLines] = useState<string[]>([`${p.title.toLowerCase().replace(/\s+/g, '-')} v0.3 — mock interview`, 'Q: Tell me about a project you’re proud of.'])
  const [val, setVal] = useState('')
  const n = useRef(0)
  const body = useRef<HTMLDivElement>(null)
  useEffect(() => { body.current?.scrollTo(0, body.current.scrollHeight) }, [lines])
  return (
    <div className="g-term" onClick={() => body.current?.querySelector('input')?.focus()}>
      <div className="g-term-body" ref={body}>
        {lines.map((l, i) => <p key={i} className={l.startsWith('>') ? 'me' : ''}>{l}</p>)}
        <form onSubmit={(e) => {
          e.preventDefault()
          if (!val.trim()) return
          const reply = REPLIES[n.current++ % REPLIES.length]
          setLines((ls) => [...ls, `> ${val}`, `score: ${(70 + Math.random() * 28).toFixed(0)}/100`, `Q: ${reply}`])
          setVal('')
          if (n.current === 1) useGuide.getState().say('Told you. Gently judging.', { hold: 2200, force: true })
        }}>
          <span>$</span><input value={val} onChange={(e) => setVal(e.target.value)} aria-label="Answer the interviewer" placeholder="type an answer…" />
        </form>
      </div>
    </div>
  )
}

const WEEK = ['Mon — you shipped the login flow.', 'Tue — three meetings, one useful.', 'Wed — fixed the flaky test. Finally.', 'Thu — paired with Riya on search.', 'Your week, in one line: steady, shipped, slept a little.']
export function Tap({ p }: { p: Project }) {
  const [i, setI] = useState(0)
  return (
    <button className="g-tap" onClick={() => setI((v) => (v + 1) % WEEK.length)}>
      <p className="g-app-kicker">{p.title}</p>
      <h5 key={i} className="g-tap-line">{WEEK[i]}</h5>
      <span className="g-note">Tap to continue · {i + 1}/{WEEK.length}</span>
    </button>
  )
}

export function Gimmick({ p }: { p: Project }) {
  switch (p.gimmick) {
    case 'scratch': return <Scratch p={p} />
    case 'slider': return <Slider p={p} />
    case 'terminal': return <Terminal p={p} />
    default: return <Tap p={p} />
  }
}
