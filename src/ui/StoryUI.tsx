// Everything drawn over the 3D world while playing: chapter cards, objective + counters,
// interact prompt, speech/thought bubbles anchored to speakers, cinematic letterbox + Skip,
// museum + project panels, pause menu with chapter select, and the finale.
import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { runtime, useStore } from '../store'
import { objectives, museum, finale, chapterCards } from '../data/story'
import { projects } from '../data/projects'
import { email, socials } from '../data/contact'
import { profile } from '../data/profile'
import { experience } from '../data/experience'
import { leadership } from '../data/leadership'
import { achievements } from '../data/achievements'
import { chapterOf, MUSEUM_IDS, PROJECT_IDS, PROJECTS_TO_OPEN_TRAIL } from '../story/machine'
import { PERCHES } from '../world/layout'
import { skipCutscene } from '../story/Director'
import { standUp } from '../three/Player'
import { ProjectCover } from './SectionContent'
import { advanceDialogue } from './useInput'
import { playSfx } from './sound'
import { TelescopeView } from './TelescopeView'

const NAMES: Record<string, string> = { player: profile.firstName, parrot: 'Parrot', puppy: 'Puppy', postman: 'Postman' }

// ───────────────────────── chapter title card
function ChapterCard() {
  const card = useStore((s) => s.card)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!card || !ref.current) return
    const el = ref.current
    const tl = gsap.timeline()
    tl.set(el, { opacity: 1 })
      .fromTo(el.querySelectorAll('.cc-anim'), { opacity: 0, y: 18, filter: 'blur(10px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', stagger: 0.18, duration: 1.3, ease: 'expo.out' })
      .to(el.querySelectorAll('.cc-anim'), { opacity: 0, y: -10, filter: 'blur(8px)', stagger: 0.08, duration: 0.9, ease: 'power2.in', delay: 2.6 })
      .set(el, { opacity: 0 })
    return () => { tl.kill() }
  }, [card])
  if (!card) return null
  return (
    <div className="ccard" ref={ref} key={card.key} aria-live="polite">
      <div className="ccard-inner">
        <p className="ccard-kicker cc-anim">Chapter {card.numeral}</p>
        <h2 className="ccard-title cc-anim">{card.title}</h2>
        <p className="ccard-line cc-anim">{card.line}</p>
      </div>
    </div>
  )
}

// ───────────────────────── objective (top-left)
function Objective() {
  const story = useStore((s) => s.story)
  const cutscene = useStore((s) => s.cutscene)
  const place = useStore((s) => s.place)
  const ch = chapterOf(story.beat)
  const text = objectives[story.beat]
  let counter: string | null = null
  if (story.beat === 'c2_follow') counter = `Perch ${story.perch + 1}/${PERCHES.length} · ${PERCHES[story.perch]?.label ?? ''}`
  if (story.beat === 'c3_museum' || (story.beat === 'c3_leave' && place === 'home')) counter = `Memories found ${story.stations.length}/${MUSEUM_IDS.length}`
  if (story.beat === 'c6_projects' || story.beat === 'c6_workshop') counter = `Projects discovered ${story.projects.length}/${PROJECT_IDS.length}`
  const trailHint = story.beat === 'c6_projects' && story.projects.length >= PROJECTS_TO_OPEN_TRAIL ? 'The summit trail is open — or keep exploring' : null
  const card = chapterCards[ch - 1]
  return (
    <div className={`objective ${cutscene ? 'is-hidden' : ''}`}>
      <p className="obj-chapter"><span>{card.numeral}</span>{card.title}</p>
      {text && <p className="obj-text" key={story.beat}>{trailHint ?? text}</p>}
      {counter && <p className="obj-counter">{counter}</p>}
    </div>
  )
}

// ───────────────────────── interact prompt
function Prompt() {
  const nearby = useStore((s) => s.nearby)
  if (!nearby) return null
  return (
    <div className="iprompt" key={nearby.id}>
      <kbd>E</kbd>
      <span className="iprompt-verb">{nearby.verb}</span>
      <span className="iprompt-label">{nearby.label}</span>
    </div>
  )
}

// ───────────────────────── speech + thought bubbles
function useAnchor(who: string, el: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    let raf = 0
    const tick = () => {
      const a = runtime.anchors[who]
      const node = el.current
      if (node) {
        const w = node.offsetWidth, h = node.offsetHeight
        const vw = window.innerWidth, vh = window.innerHeight
        let x = vw / 2, y = vh - 150 - h, pinned = true
        if (a && a.vis && a.x > -40 && a.x < vw + 40 && a.y > 20 && a.y < vh + 40) { x = a.x; y = a.y - h - 18; pinned = false }
        const cx = Math.min(Math.max(x, w / 2 + 16), vw - w / 2 - 16)
        const cy = Math.min(Math.max(y, 80), vh - h - 110)
        node.style.transform = `translate3d(${cx - w / 2}px, ${cy}px, 0)`
        node.style.setProperty('--tail', `${Math.min(Math.max(x - (cx - w / 2), 24), w - 24)}px`)
        node.classList.toggle('is-pinned', pinned || Math.abs(cy - y) > 30)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [who, el])
}

function Dialogue() {
  const d = useStore((s) => s.dialogue)
  const setDialogue = useStore((s) => s.setDialogue)
  const el = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(0)
  const full = d?.line.text ?? ''
  useAnchor(d?.line.who ?? 'player', el)
  useEffect(() => { setShown(0) }, [d?.key])
  useEffect(() => {
    if (!d) return
    if (shown >= full.length) return
    const t = setTimeout(() => setShown((n) => Math.min(full.length, n + 1)), 28)
    return () => clearTimeout(t)
  }, [d, shown, full])
  // auto-advance thoughts / timed lines
  useEffect(() => {
    if (!d?.auto) return
    const t = setTimeout(() => { if (useStore.getState().dialogue?.key === d.key) setDialogue(null) }, d.auto)
    return () => clearTimeout(t)
  }, [d, setDialogue])
  // Space / click / E: finish typing, then advance
  useEffect(() => {
    let raf = 0
    const tick = () => {
      if (runtime.advanceQueued) {
        runtime.advanceQueued = false
        const cur = useStore.getState().dialogue
        if (cur) {
          if (shownRef.current < cur.line.text.length) setShown(cur.line.text.length)
          else { setDialogue(null); playSfx('tick') }
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [setDialogue])
  const shownRef = useRef(0); shownRef.current = shown
  if (!d) return null
  const thought = !!d.line.thought
  return (
    <div ref={el} className={`bubble ${thought ? 'bubble-thought' : 'bubble-speech'} who-${d.line.who}`} key={d.key}
      onPointerDown={(e) => { e.stopPropagation(); advanceDialogue() }} role="dialog" aria-live="polite">
      {!thought && <p className="bubble-name">{NAMES[d.line.who]}</p>}
      <p className="bubble-text" aria-label={full}>
        <span>{full.slice(0, shown)}</span><span className="bubble-ghost">{full.slice(shown)}</span>
      </p>
      {!thought && !d.auto && <p className="bubble-next">{shown < full.length ? '' : <><kbd>Space</kbd> continue</>}</p>}
      <i className="bubble-tail" />
      {thought && <><i className="dot d1" /><i className="dot d2" /></>}
    </div>
  )
}

function Ambient() {
  const a = useStore((s) => s.ambient)
  const setAmbient = useStore((s) => s.setAmbient)
  const el = useRef<HTMLDivElement>(null)
  useAnchor(a?.who ?? 'parrot', el)
  useEffect(() => {
    if (!a) return
    const t = setTimeout(() => { if (useStore.getState().ambient?.key === a.key) setAmbient(null) }, 2400 + a.text.length * 40)
    return () => clearTimeout(t)
  }, [a, setAmbient])
  if (!a) return null
  return (
    <div ref={el} className={`bubble bubble-speech bubble-small who-${a.who}`} key={a.key}>
      <p className="bubble-text">{a.text}</p>
      <i className="bubble-tail" />
    </div>
  )
}

// ───────────────────────── cinematic bars + skip
function Letterbox() {
  const on = useStore((s) => s.cutscene)
  return (
    <div className={`lbox ${on ? 'is-on' : ''}`} aria-hidden={!on}>
      <i className="lbox-bar top" /><i className="lbox-bar bottom" />
      {on && <button className="skip" onClick={() => skipCutscene()}>Skip <kbd>Esc</kbd></button>}
    </div>
  )
}

// ───────────────────────── panels
function MuseumPanel() {
  const id = useStore((s) => s.museum)
  const setMuseum = useStore((s) => s.setMuseum)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!id || !ref.current) return
    gsap.fromTo(ref.current, { opacity: 0, y: 24, filter: 'blur(10px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.9, ease: 'expo.out' })
    gsap.fromTo(ref.current.querySelectorAll('.p-anim'), { opacity: 0, y: 14 }, { opacity: 1, y: 0, stagger: 0.07, duration: 0.8, ease: 'power3.out', delay: 0.1 })
  }, [id])
  if (!id) return null
  if (id === 'telescope') return <TelescopeView onClose={() => setMuseum(null)} />
  const m = museum.find((x) => x.id === id)
  if (!m) return null
  return (
    <div className="scrim" onPointerDown={() => setMuseum(null)}>
      <article className="card museum" ref={ref} onPointerDown={(e) => e.stopPropagation()} role="dialog" aria-label={m.title}>
        <button className="card-close" onClick={() => setMuseum(null)} aria-label="Close">Close <kbd>E</kbd></button>
        {m.id === 'photos' && (
          <div className="museum-photo-card p-anim">
            <img src={`${import.meta.env.BASE_URL}profile.jpg`} alt={profile.name} className="museum-photo-img" />
          </div>
        )}
        <p className="card-kicker p-anim">{m.kicker}</p>
        <h3 className="card-title p-anim">{m.title}</h3>
        {m.body.map((b) => <p key={b} className="card-body p-anim">{b}</p>)}
        {m.list && (
          <dl className="card-list p-anim">
            {m.list.map((r) => <div key={r.k}><dt>{r.k}</dt><dd>{r.v}</dd></div>)}
          </dl>
        )}
      </article>
    </div>
  )
}

function ExperienceCard() {
  const setProject = useStore((s) => s.setProject)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!ref.current) return
    gsap.fromTo(ref.current, { opacity: 0, x: 40, filter: 'blur(10px)' }, { opacity: 1, x: 0, filter: 'blur(0px)', duration: 0.8, ease: 'expo.out' })
    gsap.fromTo(ref.current.querySelectorAll('.p-anim'), { opacity: 0, y: 14 }, { opacity: 1, y: 0, stagger: 0.05, duration: 0.7, ease: 'power3.out', delay: 0.1 })
  }, [])
  return (
    <div className="scrim scrim-right" onPointerDown={() => setProject(null)}>
      <article className="card project" ref={ref} onPointerDown={(e) => e.stopPropagation()} role="dialog" aria-label="Experience & Leadership" style={{ maxWidth: '560px', maxHeight: '88vh', overflowY: 'auto' }}>
        <button className="card-close" onClick={() => setProject(null)} aria-label="Close">Close <kbd>E</kbd></button>
        <p className="card-kicker p-anim">Experience & Leadership · 2021 — Present</p>
        <h3 className="card-title p-anim">{profile.name}</h3>
        <p className="card-body p-anim" style={{ margin: '6px 0 14px 0' }}>{profile.bio}</p>

        {/* Work Experience */}
        <div className="p-anim" style={{ marginTop: '14px', borderTop: '1px solid rgba(255,255,255,0.12)', paddingTop: '12px' }}>
          <p className="card-kicker" style={{ color: 'var(--ember, #e9a66a)', marginBottom: '8px' }}>Work Experience</p>
          {experience.map((exp) => (
            <div key={exp.role + exp.org} style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap' }}>
                <b style={{ fontSize: '15px', color: '#fff' }}>{exp.role}</b>
                <span style={{ fontSize: '12px', opacity: 0.7 }}>{exp.period}</span>
              </div>
              <p style={{ margin: '2px 0 6px 0', fontSize: '13px', color: '#a0c4e8' }}>{exp.org} · {exp.place}</p>
              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12.5px', lineHeight: '1.5', opacity: 0.9 }}>
                {exp.points.map((pt, idx) => <li key={idx} style={{ marginBottom: '3px' }}>{pt}</li>)}
              </ul>
              <div className="chips" style={{ marginTop: '6px' }}>
                {exp.tags.map((t) => <span key={t} className="tchip" style={{ fontSize: '11px', padding: '2px 7px' }}>{t}</span>)}
              </div>
            </div>
          ))}
        </div>

        {/* Leadership & Community */}
        <div className="p-anim" style={{ marginTop: '14px', borderTop: '1px solid rgba(255,255,255,0.12)', paddingTop: '12px' }}>
          <p className="card-kicker" style={{ color: 'var(--ember, #e9a66a)', marginBottom: '8px' }}>Leadership & Community</p>
          {leadership.map((l) => (
            <div key={l.role + l.org} style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap' }}>
                <b style={{ fontSize: '14px', color: '#fff' }}>{l.role}</b>
                <span style={{ fontSize: '12px', opacity: 0.7 }}>{l.period}</span>
              </div>
              <p style={{ margin: '2px 0', fontSize: '13px', color: '#a0c4e8' }}>{l.org}</p>
              <p style={{ margin: 0, fontSize: '12.5px', lineHeight: '1.45', opacity: 0.9 }}>{l.note}</p>
            </div>
          ))}
        </div>

        {/* Key Achievements & State Ranks */}
        <div className="p-anim" style={{ marginTop: '14px', borderTop: '1px solid rgba(255,255,255,0.12)', paddingTop: '12px' }}>
          <p className="card-kicker" style={{ color: 'var(--ember, #e9a66a)', marginBottom: '8px' }}>Key Achievements & State Ranks</p>
          <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', lineHeight: '1.5' }}>
            {achievements.map((a) => (
              <li key={a.title} style={{ marginBottom: '6px' }}>
                <b style={{ color: '#fff' }}>{a.title}</b>
                <div style={{ fontSize: '12px', opacity: 0.8 }}>{a.org} ({a.year}) — {a.note}</div>
              </li>
            ))}
          </ul>
        </div>

        {/* Action Links */}
        <div className="project-links p-anim" style={{ marginTop: '18px', paddingTop: '14px', borderTop: '1px solid rgba(255,255,255,0.12)' }}>
          <a className="btn btn-solid" href={profile.resume} download>Download Résumé PDF ↗</a>
          <a className="btn" href="https://github.com/Saimanoj2325" target="_blank" rel="noreferrer">GitHub ↗</a>
          <a className="btn" href="https://linkedin.com/in/saimanojkura" target="_blank" rel="noreferrer">LinkedIn ↗</a>
        </div>
      </article>
    </div>
  )
}

function ProjectPanel() {
  const slug = useStore((s) => s.project)
  const found = useStore((s) => s.story.projects.length)
  const setProject = useStore((s) => s.setProject)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!slug || !ref.current) return
    gsap.fromTo(ref.current, { opacity: 0, x: 40, filter: 'blur(10px)' }, { opacity: 1, x: 0, filter: 'blur(0px)', duration: 0.9, ease: 'expo.out' })
    gsap.fromTo(ref.current.querySelectorAll('.p-anim'), { opacity: 0, y: 14 }, { opacity: 1, y: 0, stagger: 0.06, duration: 0.8, ease: 'power3.out', delay: 0.1 })
  }, [slug])
  if (slug === 'experience') return <ExperienceCard />
  const i = projects.findIndex((p) => p.slug === slug)
  const p = projects[i]
  if (!p) return null
  return (
    <div className="scrim scrim-right" onPointerDown={() => setProject(null)}>
      <article className="card project" ref={ref} onPointerDown={(e) => e.stopPropagation()} role="dialog" aria-label={p.title}>
        <button className="card-close" onClick={() => setProject(null)} aria-label="Close">Close <kbd>E</kbd></button>
        <div className="project-preview p-anim"><ProjectCover p={p} i={i} /></div>
        <p className="card-kicker p-anim">{p.year} · {p.status}</p>
        <h3 className="card-title p-anim">{p.title}</h3>
        <p className="card-body p-anim">{p.blurb}</p>
        <div className="project-mine p-anim"><p className="card-kicker">What I did</p><p>{p.contribution}</p><p className="project-role">{p.role}</p></div>
        <div className="chips p-anim">{p.tags.map((t) => <span key={t} className="tchip">{t}</span>)}</div>
        <div className="project-links p-anim">
          <a className="btn btn-solid" href={p.demo} target="_blank" rel="noreferrer">Live demo ↗</a>
          <a className="btn" href={p.source} target="_blank" rel="noreferrer">Source ↗</a>
        </div>
        <p className="project-count p-anim">Projects discovered <b>{found}/{PROJECT_IDS.length}</b></p>
      </article>
    </div>
  )
}

// ───────────────────────── pause menu (chapter select)
function PauseMenu() {
  const paused = useStore((s) => s.paused)
  const sound = useStore((s) => s.sound)
  const toggleSound = useStore((s) => s.toggleSound)
  const setPaused = useStore((s) => s.setPaused)
  const jump = useStore((s) => s.jumpToChapter)
  const beat = useStore((s) => s.story.beat)
  if (!paused) return null
  const ch = chapterOf(beat)
  return (
    <div className="scrim scrim-dark" onPointerDown={() => setPaused(false)}>
      <div className="pause" onPointerDown={(e) => e.stopPropagation()} role="dialog" aria-label="Paused">
        <p className="card-kicker">Paused</p>
        <h3 className="pause-title">Who am I?</h3>
        <div className="pause-row">
          <button className="btn btn-solid" onClick={() => setPaused(false)}>Resume</button>
          <button className="btn" onClick={toggleSound}>Sound: {sound ? 'on' : 'off'}</button>
          <a className="btn" href="#tour" onClick={() => { useStore.getState().setPhase('tour') }}>Recruiter tour</a>
        </div>
        <p className="card-kicker pause-sub">Chapters</p>
        <ol className="chapters">
          {chapterCards.map((c, i) => (
            <li key={c.numeral}>
              <button className={i + 1 === ch ? 'on' : ''} onClick={() => jump(i + 1)}>
                <span>{c.numeral}</span><b>{c.title}</b><em>{c.line}</em>
              </button>
            </li>
          ))}
        </ol>
        <p className="pause-help"><kbd>W A S D</kbd> move · <kbd>Shift</kbd> run · <kbd>E</kbd> interact · <kbd>Space</kbd> continue · drag to look · <kbd>Esc</kbd> pause</p>
      </div>
    </div>
  )
}

// ───────────────────────── top-right controls
function Corner() {
  const sound = useStore((s) => s.sound)
  const toggleSound = useStore((s) => s.toggleSound)
  const setPaused = useStore((s) => s.setPaused)
  const seated = useStore((s) => s.seated)
  const cutscene = useStore((s) => s.cutscene)
  return (
    <>
      <div className={`corner ${cutscene ? 'is-hidden' : ''}`}>
        <button className="round" onClick={toggleSound} aria-label={sound ? 'Mute' : 'Sound on'}><span className={`eq ${sound ? 'on' : ''}`}><i /><i /><i /><i /></span></button>
        <button className="round" onClick={() => setPaused(true)} aria-label="Pause and chapters"><span className="burger"><i /><i /></span></button>
      </div>
      {seated && <button className="standup-pill" onClick={() => standUp()}>Stand up <kbd>Esc</kbd></button>}
    </>
  )
}

function ControlsHint() {
  const beat = useStore((s) => s.story.beat)
  const cutscene = useStore((s) => s.cutscene)
  const [gone, setGone] = useState(false)
  useEffect(() => { if (beat !== 'c1_explore' && beat !== 'c2_arrive') { const t = setTimeout(() => setGone(true), 6000); return () => clearTimeout(t) } }, [beat])
  if (gone || cutscene || beat !== 'c1_explore') return null
  return <div className="controls-hint2"><kbd>W A S D</kbd> walk · <kbd>Shift</kbd> run · drag to look · <kbd>E</kbd> interact · <kbd>Esc</kbd> menu</div>
}

// ───────────────────────── finale
function Finale() {
  const f = useStore((s) => s.finale)
  const jump = useStore((s) => s.jumpToChapter)
  const msg = useRef<HTMLDivElement>(null)
  const card = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (f === 1 && msg.current) gsap.fromTo(msg.current.querySelectorAll('.fl'), { opacity: 0, y: 20, filter: 'blur(14px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', stagger: 1.4, duration: 2.2, ease: 'power3.out' })
    if (f === 2 && card.current) gsap.fromTo(card.current, { opacity: 0, y: 24, filter: 'blur(10px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.4, ease: 'expo.out', delay: 0.3 })
  }, [f])
  if (!f) return null
  return (
    <div className={`finale ${f === 2 ? 'is-card' : ''}`}>
      <div className="finale-msg" ref={msg}>
        {finale.message.map((l) => <p key={l} className="fl">{l}</p>)}
      </div>
      {f === 2 && (
        <div className="finale-card" ref={card}>
          <h3>{finale.cardTitle}</h3>
          <p className="finale-line">{finale.cardLine}</p>
          <div className="finale-links">
            {socials.map((s) => <a key={s.label} className="btn" href={s.href} target="_blank" rel="noreferrer">{s.label} ↗</a>)}
            <a className="btn" href={`mailto:${email}`}>Email ↗</a>
          </div>
          <p className="finale-email">{email}</p>
          <button className="replay" onClick={() => jump(1)}>↺ Replay the journey</button>
        </div>
      )}
    </div>
  )
}

export function StoryUI() {
  return (
    <div className="sui">
      <Objective />
      <Corner />
      <Prompt />
      <ControlsHint />
      <Ambient />
      <Dialogue />
      <Letterbox />
      <ChapterCard />
      <MuseumPanel />
      <ProjectPanel />
      <Finale />
      <PauseMenu />
    </div>
  )
}
