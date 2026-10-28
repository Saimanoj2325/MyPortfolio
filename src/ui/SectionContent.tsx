// Portfolio sections, rendered from src/data/*. Shared by the in-game frosted panels and the recruiter tour.
import { useState } from 'react'
import type { SectionId } from '../data/chapters'
import { profile } from '../data/profile'
import { skillGroups } from '../data/skills'
import { experience } from '../data/experience'
import { education } from '../data/education'
import { projects, type Project } from '../data/projects'
import { achievements, certifications } from '../data/achievements'
import { github } from '../data/opensource'
import { leadership } from '../data/leadership'
import { testimonials } from '../data/testimonials'
import { posts } from '../data/writing'
import { email, socials } from '../data/contact'
import { submitToGoogleSheet } from '../lib/feedback'

const Arrow = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M7 17L17 7M9 7h8v8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
)

export function Monogram({ size = 96 }: { size?: number }) {
  if (profile.photo) return <img className="monogram" src={profile.photo} alt={profile.name} width={size} height={size} />
  const initials = profile.name.split(' ').map((w) => w[0]).join('').slice(0, 2)
  return (
    <div className="monogram" style={{ width: size, height: size }} aria-label="Photo placeholder">
      <span>{initials}</span>
    </div>
  )
}

export function About() {
  return (
    <div className="sx sx-about">
      <div className="sx-about-head">
        <Monogram size={84} />
        <div>
          <p className="sx-name">{profile.name}</p>
          <p className="sx-muted">{profile.roles}</p>
        </div>
      </div>
      <p className="sx-lead">{profile.bio}</p>
      <dl className="sx-facts">
        <div><dt>Based in</dt><dd>{profile.location}</dd></div>
        <div><dt>Status</dt><dd><i className="dot-live" /> {profile.availability}</dd></div>
      </dl>
    </div>
  )
}

export function Skills() {
  return (
    <div className="sx sx-skills">
      {skillGroups.map((g) => (
        <div key={g.group} className="sx-skill-group">
          <div className="sx-row-head"><h4>{g.group}</h4><span className="sx-muted">{g.note}</span></div>
          <ul>
            {g.items.map((s) => (
              <li key={s.name}>
                <span>{s.name}</span>
                <i className="bar"><b style={{ transform: `scaleX(${s.level / 100})` }} /></i>
                <em>{s.level}</em>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

export function Experience() {
  return (
    <ol className="sx sx-timeline">
      {experience.map((r) => (
        <li key={r.role + r.org}>
          <span className="sx-period">{r.period}</span>
          <div>
            <h4>{r.role}</h4>
            <p className="sx-muted">{r.org} · {r.place}</p>
            <ul className="sx-points">{r.points.map((p) => <li key={p}>{p}</li>)}</ul>
            <p className="sx-tags">{r.tags.join(' · ')}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}

export function Education() {
  return (
    <ol className="sx sx-timeline">
      {education.map((e) => (
        <li key={e.degree}>
          <span className="sx-period">{e.period}</span>
          <div>
            <h4>{e.degree}</h4>
            <p className="sx-muted">{e.school} · {e.place}</p>
            <ul className="sx-points">{e.notes.map((p) => <li key={p}>{p}</li>)}</ul>
          </div>
        </li>
      ))}
    </ol>
  )
}

export function ProjectCover({ p, i }: { p: Project; i: number }) {
  return (
    <div className="cover" style={{ ['--a' as string]: p.palette[0], ['--b' as string]: p.palette[1] }}>
      {p.image ? <img src={p.image} alt="" /> : (
        <>
          <span className="cover-num">{String(i + 1).padStart(2, '0')}</span>
          <span className="cover-title">{p.title}</span>
          <i className="cover-orb" />
        </>
      )}
    </div>
  )
}

export function ProjectList({ withCovers = false }: { withCovers?: boolean }) {
  return (
    <div className="sx sx-projects">
      {projects.map((p, i) => (
        <article key={p.slug} className="sx-proj">
          {withCovers && <ProjectCover p={p} i={i} />}
          <div className="sx-proj-top"><span>{String(i + 1).padStart(2, '0')} · {p.year}</span><span>{p.status}</span></div>
          <h4>{p.title}</h4>
          <p>{p.blurb}</p>
          <div className="sx-proj-foot">
            <span className="sx-tags">{p.tags.join(' · ')}</span>
            <span className="sx-links"><a href={p.demo}>Demo <Arrow /></a><a href={p.source}>Source <Arrow /></a></span>
          </div>
        </article>
      ))}
    </div>
  )
}

export function Achievements() {
  return (
    <div className="sx sx-ach">
      <ul className="sx-list">
        {achievements.map((a) => (
          <li key={a.title}><span className="sx-year">{a.year}</span><div><h4>{a.title}</h4><p className="sx-muted">{a.org}{a.note ? ` — ${a.note}` : ''}</p></div></li>
        ))}
      </ul>
    </div>
  )
}

/** deterministic placeholder contribution grid */
function Heatmap() {
  const cells = Array.from({ length: 7 * 30 }, (_, i) => {
    const v = (Math.sin(i * 12.9898) * 43758.5453) % 1
    return Math.abs(v)
  })
  return (
    <div className="heatmap" aria-label="Contribution graph (placeholder)">
      {cells.map((v, i) => <i key={i} style={{ opacity: 0.12 + Math.pow(v, 1.6) * 0.88 }} />)}
    </div>
  )
}

export function OpenSource() {
  return (
    <div className="sx sx-oss">
      <div className="sx-stats">
        {github.stats.map((s) => <div key={s.label}><b>{s.value}</b><span>{s.label}</span></div>)}
      </div>
      <Heatmap />
      {github.contributions && github.contributions.length > 0 && (
        <ul className="sx-list">
          {github.contributions.map((c) => (
            <li key={c.repo}><span className="sx-year">PR</span><div><h4><a href={c.link}>{c.repo} <Arrow /></a></h4><p className="sx-muted">{c.what}</p></div></li>
          ))}
        </ul>
      )}
      <a className="sx-link" href={github.url} target="_blank" rel="noreferrer">github.com/{github.user} <Arrow /></a>
    </div>
  )
}

export function Leadership() {
  return (
    <ul className="sx sx-list">
      {leadership.map((l) => (
        <li key={l.role + l.org}><span className="sx-year">{l.period}</span><div><h4>{l.role}</h4><p className="sx-muted">{l.org} — {l.note}</p></div></li>
      ))}
    </ul>
  )
}

export function Testimonials() {
  return (
    <div className="sx sx-quotes">
      {testimonials.map((t) => (
        <figure key={t.quote}>
          <blockquote>“{t.quote}”</blockquote>
          <figcaption><b>{t.name}</b> · {t.role}</figcaption>
        </figure>
      ))}
    </div>
  )
}

export function Writing() {
  if (!posts.length) return null
  return (
    <ul className="sx sx-posts">
      {posts.map((p) => (
        <li key={p.title}><a href={p.link}><span className="sx-year">{p.date}</span><span className="sx-post-title">{p.title}</span><span className="sx-muted">{p.read}</span><Arrow /></a></li>
      ))}
    </ul>
  )
}

export function Resume() {
  return (
    <div className="sx sx-resume">
      <p className="sx-lead small">Everything here, on one page. Updated for {new Date().getFullYear()}.</p>
      <a className="btn-line" href={profile.resume} download>Download résumé (PDF) <Arrow /></a>
    </div>
  )
}

export function useCopyEmail(onCopied?: () => void) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try { await navigator.clipboard.writeText(email) } catch { /* clipboard blocked: still show the address */ }
    setCopied(true)
    onCopied?.()
    setTimeout(() => setCopied(false), 2200)
  }
  return { copied, copy }
}

export function ContactForm() {
  const [name, setName] = useState('')
  const [from, setFrom] = useState('')
  const [msg, setMsg] = useState('')
  const href = `mailto:${email}?subject=${encodeURIComponent(`Hello from ${name || 'your portfolio'}`)}&body=${encodeURIComponent(`${msg}\n\n— ${name}${from ? ` (${from})` : ''}`)}`
  return (
    <form className="sx-form" onSubmit={(e) => {
      e.preventDefault()
      submitToGoogleSheet({ name, email: from, message: msg, source: 'Contact Form' })
      window.location.href = href
    }}>
      <label><span>Name</span><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ada Lovelace" /></label>
      <label><span>Email</span><input type="email" value={from} onChange={(e) => setFrom(e.target.value)} placeholder="ada@company.com" /></label>
      <label className="full"><span>Message</span><textarea rows={4} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Tell me about the project…" /></label>
      <button className="btn-solid" type="submit">Send message <Arrow /></button>
    </form>
  )
}

export function Contact({ onCopied }: { onCopied?: () => void }) {
  const { copied, copy } = useCopyEmail(onCopied)
  return (
    <div className="sx sx-contact">
      <button className="sx-email" onClick={copy} title="Copy email">
        <span>{copied ? 'Copied ✓' : email}</span>
      </button>
      <div className="sx-socials">
        {socials.map((s) => <a key={s.label} href={s.href} target="_blank" rel="noreferrer"><span>{s.label}</span><Arrow /></a>)}
      </div>
      <ContactForm />
    </div>
  )
}

export function SectionContent({ id }: { id: SectionId }) {
  switch (id) {
    case 'about': return <About />
    case 'skills': return <Skills />
    case 'experience': return <Experience />
    case 'education': return <Education />
    case 'projects': return <ProjectList />
    case 'achievements': return <Achievements />
    case 'opensource': return <OpenSource />
    case 'leadership': return <Leadership />
    case 'testimonials': return <Testimonials />
    case 'writing': return <Writing />
    case 'resume': return <Resume />
    case 'contact': return <Contact />
  }
}
