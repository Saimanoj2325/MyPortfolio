// The laptop's operating system: a tiny desktop rendered on the 3D screen (drei <Html transform>).
// Apps: one window per project, Terminal (whoami / skills / projects …), Résumé, Contact, About.
import { useEffect, useRef, useState } from 'react'
import { projects, type Project } from '../data/projects'
import { profile } from '../data/profile'
import { skillGroups } from '../data/skills'
import { experience } from '../data/experience'
import { leadership } from '../data/leadership'
import { education } from '../data/education'
import { achievements } from '../data/achievements'
import { email, socials } from '../data/contact'
import { ProjectCover, useCopyEmail } from './SectionContent'
import { standUp } from '../three/Player'
import { playSfx } from './sound'

type AppId = `p:${string}` | 'terminal' | 'resume' | 'contact' | 'about' | 'projects'
type Win = { id: AppId; z: number; x: number; y: number }

const ICONS: { id: AppId; label: string; glyph: string }[] = [
  { id: 'projects', label: 'Projects', glyph: '▤' },
  { id: 'terminal', label: 'Terminal', glyph: '›_' },
  { id: 'about', label: 'About', glyph: '◐' },
  { id: 'resume', label: 'Résumé', glyph: '¶' },
  { id: 'contact', label: 'Contact', glyph: '@' },
]

function ProjectWin({ p, i }: { p: Project; i: number }) {
  const isVMedha = p.slug === 'vmedha-cbit'
  const [tab, setTab] = useState<'preview' | 'info'>('preview')
  const [loading, setLoading] = useState(true)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  if (isVMedha) {
    return (
      <div className="os-browser">
        {/* Browser Navigation Bar */}
        <div className="os-browser-nav">
          <div className="os-browser-btns">
            <button
              className="os-nav-btn"
              onClick={() => {
                setLoading(true)
                if (iframeRef.current) iframeRef.current.src = 'https://vmedha-cbit.org'
              }}
              title="Refresh"
            >
              ↻
            </button>
          </div>
          <div className="os-browser-address">
            <span className="os-lock">🔒</span>
            <span className="os-domain">vmedha-cbit.org</span>
            <span className="os-path">/</span>
          </div>
          <div className="os-browser-tabs">
            <button
              className={`os-tab-btn ${tab === 'preview' ? 'is-active' : ''}`}
              onClick={() => setTab('preview')}
            >
              Live Website
            </button>
            <button
              className={`os-tab-btn ${tab === 'info' ? 'is-active' : ''}`}
              onClick={() => setTab('info')}
            >
              Project Info
            </button>
          </div>
          <a
            href="https://vmedha-cbit.org"
            target="_blank"
            rel="noreferrer"
            className="os-browser-popout"
            title="Open in new window"
          >
            Open in tab ↗
          </a>
        </div>

        {/* Viewport */}
        {tab === 'preview' ? (
          <div className="os-browser-viewport">
            {loading && (
              <div className="os-browser-loader">
                <div className="os-spinner" />
                <span>Connecting to vmedha-cbit.org…</span>
              </div>
            )}
            <iframe
              ref={iframeRef}
              src="https://vmedha-cbit.org"
              title="VMedha CBIT — Tech for Social Good"
              className="os-browser-iframe"
              onLoad={() => setLoading(false)}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            />
          </div>
        ) : (
          <div className="os-proj-body" style={{ overflowY: 'auto' }}>
            <p className="os-kicker">{p.year} · {p.status}</p>
            <h3>{p.title}</h3>
            <p>{p.blurb}</p>
            <p className="os-muted">{p.role}</p>
            <p style={{ margin: '10px 0', fontSize: '13.5px', lineHeight: '1.5' }}>{p.contribution}</p>
            <div className="os-tags">{p.tags.map((t) => <span key={t}>{t}</span>)}</div>
            <div className="os-links">
              <a href={p.demo} target="_blank" rel="noreferrer">Visit vmedha-cbit.org ↗</a>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="os-proj">
      <ProjectCover p={p} i={i} />
      <div className="os-proj-body">
        <p className="os-kicker">{p.year} · {p.status}</p>
        <h3>{p.title}</h3>
        <p>{p.blurb}</p>
        <div style={{ margin: '8px 0', padding: '8px 10px', background: 'rgba(255,255,255,0.04)', borderRadius: '6px', borderLeft: '3px solid rgba(255,255,255,0.3)' }}>
          <p className="os-muted" style={{ margin: '0 0 4px 0', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Key Contributions</p>
          <p style={{ margin: 0, fontSize: '12.5px', lineHeight: '1.45', color: 'rgba(255,255,255,0.9)' }}>{p.contribution}</p>
        </div>
        <p className="os-muted" style={{ fontSize: '12px', marginTop: '6px' }}>{p.role}</p>
        <div className="os-tags">{p.tags.map((t) => <span key={t}>{t}</span>)}</div>
        <div className="os-links">
          {p.demo && p.demo !== '#' && <a href={p.demo} target="_blank" rel="noreferrer">Live demo ↗</a>}
          {p.source && p.source !== '#' && <a href={p.source} target="_blank" rel="noreferrer">View on GitHub ↗</a>}
        </div>
      </div>
    </div>
  )
}

function Folder({ open }: { open: (id: AppId) => void }) {
  return (
    <div className="os-folder">
      {projects.map((p, i) => (
        <button key={p.slug} className="os-file" onDoubleClick={() => open(`p:${p.slug}`)} onClick={() => open(`p:${p.slug}`)}>
          <ProjectCover p={p} i={i} />
          <span>{p.title}</span>
        </button>
      ))}
    </div>
  )
}

const HELP = ['help — this list', 'whoami — about me', 'skills — the toolkit', 'projects — what I’ve built', 'open <n> — open project n', 'geoattend / ayursutra / resumeverify / revenueguard / vmedha', 'experience — where I’ve worked', 'leadership — community roles', 'achievements — entrance ranks & awards', 'education — where I studied', 'contact — say hello', 'clear — clear the screen', 'exit — stand up']
function TerminalApp({ open }: { open: (id: AppId) => void }) {
  const [lines, setLines] = useState<string[]>([`manojOS terminal — type "help"`, ''])
  const [v, setV] = useState('')
  const body = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => { body.current?.scrollTo(0, body.current.scrollHeight) }, [lines])
  useEffect(() => { input.current?.focus() }, [])
  const run = (cmd: string) => {
    const [c, ...args] = cmd.trim().split(/\s+/)
    let out: string[] = []
    switch ((c || '').toLowerCase()) {
      case '': break
      case 'help': out = HELP; break
      case 'whoami': out = [`${profile.name} — ${profile.roles}`, profile.bio]; break
      case 'skills': out = skillGroups.map((g) => `${g.group.padEnd(10)} ${g.items.map((i) => i.name).join(', ')}`); break
      case 'projects': out = projects.map((p, i) => `${String(i + 1).padStart(2, '0')}  ${p.title.padEnd(26)} ${p.status}`).concat(['', 'try: open 1']); break
      case 'open': {
        const n = parseInt(args[0] || '', 10) - 1
        if (projects[n]) { open(`p:${projects[n].slug}`); out = [`opening ${projects[n].title}…`] } else out = ['usage: open <number>']
        break
      }
      case 'geoattend':
        open('p:geoattend'); out = ['opening GeoAttend (github.com/Saimanoj2325/GeoAttend)…']; break
      case 'ayursutra':
        open('p:ayursutra'); out = ['opening AyurSutra (github.com/Saimanoj2325/AyurSutra)…']; break
      case 'resumeverify':
      case 'resumeverifyai':
        open('p:resumeverify'); out = ['opening ResumeVerify AI (github.com/Saimanoj2325/ResumeVerifyAI)…']; break
      case 'revenueguard':
        open('p:revenueguard'); out = ['opening RevenueGuard (github.com/Saimanoj2325/RevenueGuard)…']; break
      case 'experience':
        out = experience.flatMap((e) => [`${e.role} · ${e.org} (${e.period})`, ...e.points.map((p) => `  • ${p}`), ''])
        break
      case 'leadership':
        out = leadership.map((l) => `${l.role} · ${l.org} (${l.period})\n  ${l.note}`)
        break
      case 'achievements':
      case 'ranks':
        out = achievements.map((a) => `${a.title} (${a.year})\n  ${a.org} — ${a.note}`)
        break
      case 'education':
        out = education.flatMap((e) => [`${e.period.padEnd(14)} ${e.degree}`, `               ${e.school}`, ...e.notes.map((n) => `               • ${n}`), ''])
        break
      case 'vmedha':
      case 'cbit':
        open('p:vmedha-cbit'); out = ['opening VMedha CBIT website (vmedha-cbit.org)…']; break
      case 'contact': out = [`email     ${email}`, ...socials.map((s) => `${s.label.toLowerCase().padEnd(9)} ${s.value}`)]; break
      case 'clear': setLines([]); return
      case 'exit': standUp(); return
      case 'sudo': out = ['nice try.']; break
      case 'ls': out = ['projects/  resume.pdf  ideas.txt  .secrets (permission denied)']; break
      default: out = [`command not found: ${c}. try "help"`]
    }
    setLines((l) => [...l, `› ${cmd}`, ...out, ''])
  }
  return (
    <div className="os-term" onClick={() => input.current?.focus()}>
      <div className="os-term-body" ref={body}>
        {lines.map((l, i) => <pre key={i} className={l.startsWith('›') ? 'me' : ''}>{l}</pre>)}
        <form onSubmit={(e) => { e.preventDefault(); run(v); setV('') }}>
          <span>saimanoj@home ~ %</span>
          <input ref={input} value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => e.stopPropagation()} spellCheck={false} aria-label="Terminal input" />
        </form>
      </div>
    </div>
  )
}

function AboutApp() {
  return (
    <div className="os-about">
      <div className="os-avatar">{profile.photo ? <img src={profile.photo} alt="" /> : <span>{profile.name.split(' ').map((w) => w[0]).join('')}</span>}</div>
      <h3>{profile.name}</h3>
      <p className="os-muted">{profile.roles}</p>
      <p>{profile.bio}</p>
      <p className="os-muted">{profile.location} · {profile.availability}</p>
    </div>
  )
}

function ResumeApp() {
  return (
    <div className="os-resume">
      <div className="os-sheet">
        <h4>{profile.name}</h4>
        <p className="os-muted">{profile.roles}</p>
        <hr />
        <h5>Experience</h5>
        {experience.map((r) => <p key={r.role}><b>{r.role}</b> · {r.org} <em>{r.period}</em></p>)}
        <h5>Leadership</h5>
        {leadership.map((l) => <p key={l.role + l.org}><b>{l.role}</b> · {l.org} <em>{l.period}</em></p>)}
        <h5>State Ranks & Achievements</h5>
        {achievements.map((a) => <p key={a.title}><b>{a.title}</b> — {a.note}</p>)}
        <h5>Education</h5>
        {education.map((e) => <p key={e.degree}><b>{e.degree}</b> · {e.school} <em>{e.period}</em></p>)}
        <h5>Skills</h5>
        <p>{skillGroups.flatMap((g) => g.items.slice(0, 3).map((i) => i.name)).join(' · ')}</p>
      </div>
      <a className="os-btn" href={profile.resume} download>Download PDF ↓</a>
    </div>
  )
}

function ContactApp() {
  const { copied, copy } = useCopyEmail()
  return (
    <div className="os-contact">
      <h3>Got a project?</h3>
      <button className="os-email" onClick={copy}>{copied ? 'Copied! Talk soon.' : email}</button>
      <div className="os-socials">{socials.map((s) => <a key={s.label} href={s.href} target="_blank" rel="noreferrer">{s.label} ↗</a>)}</div>
      <a className="os-btn" href={`mailto:${email}?subject=${encodeURIComponent('Hello from your portfolio')}`}>Write an email</a>
    </div>
  )
}

const TITLES: Record<string, string> = { terminal: 'Terminal', resume: 'Résumé.pdf', contact: 'Contact', about: 'About me', projects: 'Projects' }
const SIZE: Record<string, [number, number]> = { terminal: [560, 340], resume: [420, 470], contact: [400, 300], about: [400, 380], projects: [640, 400] }

export function LaptopOS() {
  const [wins, setWins] = useState<Win[]>([
    { id: 'projects', z: 1, x: 120, y: 70 },
    { id: 'p:vmedha-cbit', z: 2, x: 230, y: 40 },
  ])
  const [booted, setBooted] = useState(false)
  const zTop = useRef(2)
  useEffect(() => { const t = setTimeout(() => setBooted(true), 900); return () => clearTimeout(t) }, [])
  const open = (id: AppId) => {
    playSfx('tick')
    setWins((w) => {
      const z = ++zTop.current
      const ex = w.find((x) => x.id === id)
      if (ex) return w.map((x) => (x.id === id ? { ...x, z } : x))
      const n = w.length
      return [...w, { id, z, x: 180 + ((n * 46) % 260), y: 60 + ((n * 34) % 160) }]
    })
  }
  const close = (id: AppId) => setWins((w) => w.filter((x) => x.id !== id))
  const focus = (id: AppId) => setWins((w) => w.map((x) => (x.id === id ? { ...x, z: ++zTop.current } : x)))
  const drag = (id: AppId, e: React.PointerEvent) => {
    const el = e.currentTarget as HTMLElement
    el.setPointerCapture(e.pointerId)
    const sx = e.clientX, sy = e.clientY
    const w0 = wins.find((x) => x.id === id)!
    // css px are scaled by the 3D transform; measure the ratio from the element itself
    const scale = el.getBoundingClientRect().width / el.offsetWidth || 1
    const move = (ev: PointerEvent) => setWins((w) => w.map((x) => (x.id === id ? { ...x, x: w0.x + (ev.clientX - sx) / scale, y: w0.y + (ev.clientY - sy) / scale } : x)))
    const up = () => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up) }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
  }
  return (
    <div className={`os ${booted ? 'is-booted' : ''}`} onPointerDown={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
      <div className="os-boot"><span>manojOS</span><i /></div>
      <header className="os-bar">
        <span className="os-logo">●</span><b>manojOS</b><span>File</span><span>View</span><span>Go</span>
        <span className="os-bar-right">{profile.name} · 9:41</span>
      </header>
      <div className="os-desktop">
        <div className="os-icons">
          {ICONS.map((ic) => (
            <button key={ic.id} className="os-icon" onClick={() => open(ic.id)}>
              <i>{ic.glyph}</i><span>{ic.label}</span>
            </button>
          ))}
        </div>
        {wins.map((w) => {
          const proj = w.id.startsWith('p:') ? projects.find((p) => `p:${p.slug}` === w.id) : null
          const idx = proj ? projects.indexOf(proj) : 0
          const [ww, wh] = proj ? (proj.slug === 'vmedha-cbit' ? [720, 460] : [520, 420]) : SIZE[w.id] ?? [420, 320]
          return (
            <section key={w.id} className="os-win" style={{ zIndex: w.z, left: w.x, top: w.y, width: ww, height: wh }} onPointerDown={() => focus(w.id)}>
              <header className="os-win-bar" onPointerDown={(e) => drag(w.id, e)}>
                <span className="os-dots"><i onPointerDown={(e) => e.stopPropagation()} onClick={() => close(w.id)} /><i /><i /></span>
                <span>{proj ? proj.title : TITLES[w.id]}</span>
              </header>
              <div className="os-win-body">
                {proj && <ProjectWin p={proj} i={idx} />}
                {w.id === 'projects' && <Folder open={open} />}
                {w.id === 'terminal' && <TerminalApp open={open} />}
                {w.id === 'about' && <AboutApp />}
                {w.id === 'resume' && <ResumeApp />}
                {w.id === 'contact' && <ContactApp />}
              </div>
            </section>
          )
        })}
      </div>
      <footer className="os-dock">
        {ICONS.map((ic) => <button key={ic.id} onClick={() => open(ic.id)} title={ic.label}><i>{ic.glyph}</i></button>)}
        <span className="os-dock-sep" />
        <button onClick={() => standUp()} title="Stand up" className="os-stand"><i>⏏</i></button>
      </footer>
    </div>
  )
}
