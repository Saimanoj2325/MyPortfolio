// Recruiter mode: a smooth-scrolling, one-page guided tour narrated by the engineer.
import { useEffect, useRef } from 'react'
import Lenis from 'lenis'
import gsap from 'gsap'
import { profile } from '../data/profile'
import { projects } from '../data/projects'
import { tourLines } from '../data/tour'
import { sectionTitles, type SectionId } from '../data/chapters'
import { email, socials } from '../data/contact'
import { safeStorage, useStore } from '../store'
import { Guide } from './Guide'
import { useGuide } from './guideStore'
import { Device, Gimmick } from './Device'
import {
  Achievements, ContactForm, Education, Experience, Leadership, Monogram, OpenSource, ProjectCover,
  Skills, Testimonials, Writing, useCopyEmail,
} from '../ui/SectionContent'
import './tour.css'

const VISIT_KEY = 'sm-tour-visited'
const Arrow = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M7 17L17 7M9 7h8v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>

function SplitWords({ text, className }: { text: string; className?: string }) {
  return (
    <span className={className}>
      {text.split(' ').map((w, i) => (
        <span className="w" key={i}><span className="wi">{w}</span>{' '}</span>
      ))}
    </span>
  )
}

function Section({ id, say, children, wide }: { id: SectionId | 'work'; say: string[]; children: React.ReactNode; wide?: boolean }) {
  const t = id === 'work' ? { kicker: 'Index', title: 'All work' } : sectionTitles[id]
  return (
    <section className={`t-sec ${wide ? 'is-wide' : ''}`} id={`t-${id}`} data-say={JSON.stringify(say)}>
      <header className="t-sec-head" data-reveal>
        <p className="t-kicker">{t.kicker}</p>
        <h2 className="t-h2">{t.title}</h2>
      </header>
      <div data-reveal>{children}</div>
    </section>
  )
}

export function Tour() {
  const setPhase = useStore((s) => s.setPhase)
  const root = useRef<HTMLDivElement>(null)
  const featured = projects.filter((p) => p.featured)
  const { copied, copy } = useCopyEmail(() => useGuide.getState().say(tourLines.copied, { hold: 2600, force: true }))

  useEffect(() => {
    document.documentElement.classList.add('is-tour')
    window.scrollTo(0, 0)
    const lenis = new Lenis({ duration: 1.25, smoothWheel: true, touchMultiplier: 1.3 })
    ;(window as unknown as { __lenis?: Lenis }).__lenis = lenis
    let raf = 0
    const el = root.current!
    const sayEls = () => Array.from(el.querySelectorAll<HTMLElement>('[data-say]'))
    const projEls = () => Array.from(el.querySelectorAll<HTMLElement>('.t-proj'))
    let lastLine = ''

    // greeting
    const visited = safeStorage.get(VISIT_KEY)
    const g = useGuide.getState()
    if (visited) {
      g.say(tourLines.back, {
        force: true, hold: 60000,
        buttons: [
          { label: 'Yes, show me', onClick: () => { useGuide.setState({ holdUntil: 0 }); lenis.scrollTo(0); useGuide.getState().say(tourLines.hello[0], { force: true }); useGuide.getState().act('Wave') } },
          { label: 'I’ll browse', onClick: () => { useGuide.setState({ holdUntil: 0 }); useGuide.getState().say('Cool. I’ll be right here.', { force: true }) } },
        ],
      })
    } else {
      setTimeout(() => useGuide.getState().act('Wave'), 1100)
    }
    safeStorage.set(VISIT_KEY, '1')

    const loop = (time: number) => {
      lenis.raf(time)
      const vh = window.innerHeight
      // featured projects: progress drives the device tilt and the narration line
      for (const pe of projEls()) {
        const r = pe.getBoundingClientRect()
        const p = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - vh)))
        pe.style.setProperty('--p', p.toFixed(4))
        const enter = Math.min(1, Math.max(0, 1 - r.top / vh))
        pe.style.setProperty('--e', enter.toFixed(4))
      }
      // which narrated block is at the eye line?
      let line = ''
      for (const se of sayEls()) {
        const r = se.getBoundingClientRect()
        if (r.top < vh * 0.55 && r.bottom > vh * 0.45) {
          const lines: string[] = JSON.parse(se.dataset.say || '[]')
          if (!lines.length) continue
          const p = Math.min(0.999, Math.max(0, (vh * 0.5 - r.top) / r.height))
          line = lines[Math.floor(p * lines.length)]
        }
      }
      if (line && line !== lastLine) { lastLine = line; useGuide.getState().say(line) }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    // reveals
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target) }
    }, { rootMargin: '0px 0px -12% 0px' })
    el.querySelectorAll('[data-reveal]').forEach((n) => io.observe(n))

    // hero entrance
    const ctx = gsap.context(() => {
      gsap.from('.t-hero .wi', { yPercent: 110, duration: 1.4, ease: 'expo.out', stagger: 0.06, delay: 0.25 })
      gsap.from('.t-hero .t-fade', { opacity: 0, y: 16, duration: 1.2, ease: 'power3.out', stagger: 0.1, delay: 0.7 })
    }, el)

    // resize reactions
    const mq = window.matchMedia('(max-width: 760px)')
    const onMq = () => useGuide.getState().say(mq.matches ? tourLines.mobile : tourLines.desktop, { hold: 2200, force: true })
    mq.addEventListener('change', onMq)

    return () => {
      cancelAnimationFrame(raf)
      lenis.destroy()
      io.disconnect()
      ctx.revert()
      mq.removeEventListener('change', onMq)
      document.documentElement.classList.remove('is-tour')
    }
  }, [])

  const goto = (id: string) => {
    const l = (window as unknown as { __lenis?: Lenis }).__lenis
    const target = document.getElementById(id)
    if (l && target) l.scrollTo(target, { offset: -40, duration: 1.6 })
  }
  const play = () => { window.location.hash = ''; setPhase('loading') }

  return (
    <div className="tour" ref={root}>
      <div className="t-grain" aria-hidden />
      <header className="t-top">
        <button className="t-brand" onClick={() => goto('t-hero')}><i />{profile.name}</button>
        <nav className="t-nav">
          <button onClick={() => goto('t-projects')}>Work</button>
          <button onClick={() => goto('t-about')}>About</button>
          <button onClick={() => goto('t-experience')}>Experience</button>
          <button onClick={() => goto('t-contact')}>Contact</button>
        </nav>
        <button className="t-play" onClick={play}><span>Play the game</span><Arrow /></button>
      </header>

      <Guide />

      <main className="t-main">
        <section className="t-hero" id="t-hero" data-say={JSON.stringify(tourLines.hello)}>
          <p className="t-kicker t-fade">{profile.name} — {profile.roles}</p>
          <h1 className="t-h1"><SplitWords text={profile.headline} /></h1>
          <div className="t-hero-foot t-fade">
            <button className="btn-solid" onClick={() => goto('t-contact')}>Get in touch <Arrow /></button>
            <a className="btn-line" href={profile.resume} download>Résumé</a>
            <span className="t-status"><i className="dot-live" />{profile.availability}</span>
          </div>
          <div className="t-scrollcue t-fade"><span>Scroll</span><i /></div>
        </section>

        <section className="t-sec t-about" id="t-about" data-say={JSON.stringify(tourLines.about)}>
          <header className="t-sec-head" data-reveal><p className="t-kicker">About</p></header>
          <div className="t-about-grid" data-reveal>
            <Monogram size={132} />
            <div>
              <p className="t-lead">{profile.bio}</p>
              {profile.about.map((a) => <p key={a} className="t-body">{a}</p>)}
              <dl className="t-facts">
                <div><dt>Based in</dt><dd>{profile.location}</dd></div>
                <div><dt>Focus</dt><dd>{profile.roles}</dd></div>
                <div><dt>Now</dt><dd>{profile.availability}</dd></div>
              </dl>
            </div>
          </div>
        </section>

        <div id="t-projects" className="t-projects-head" data-reveal>
          <p className="t-kicker">Selected work</p>
          <h2 className="t-h2">Featured projects</h2>
        </div>
        {featured.map((p, i) => (
          <section key={p.slug} className={`t-proj is-${p.device}`} data-say={JSON.stringify(p.narration)}>
            <div className="t-proj-sticky">
              <div className="t-proj-info">
                <p className="t-kicker">{String(i + 1).padStart(2, '0')} / {String(featured.length).padStart(2, '0')} · {p.year}</p>
                <h3 className="t-h3">{p.title}</h3>
                <p className="t-body">{p.blurb}</p>
                <p className="t-meta">{p.role}</p>
                <p className="t-tags">{p.tags.map((t) => <span key={t}>{t}</span>)}</p>
                <p className="t-links"><a href={p.demo}>Live demo <Arrow /></a><a href={p.source}>Source <Arrow /></a></p>
              </div>
              <div className="t-proj-device">
                <Device p={p}><Gimmick p={p} /></Device>
              </div>
            </div>
          </section>
        ))}

        <Section id="experience" say={tourLines.experience}><Experience /></Section>
        <Section id="skills" say={tourLines.skills}><Skills /></Section>
        <Section id="education" say={tourLines.education}><Education /></Section>
        <Section id="achievements" say={tourLines.achievements}><Achievements /></Section>
        <Section id="opensource" say={tourLines.opensource}><OpenSource /></Section>
        <Section id="leadership" say={tourLines.leadership}><Leadership /></Section>
        <Section id="testimonials" say={tourLines.testimonials} wide><Testimonials /></Section>
        <Section id="resume" say={tourLines.resume}>
          <div className="t-resume">
            <div className="t-resume-sheet" aria-hidden><i /><i /><i /><i /><i /><i /></div>
            <div>
              <p className="t-lead">Everything on this page, on one sheet of paper.</p>
              <a className="btn-solid" href={profile.resume} download>Download résumé (PDF) <Arrow /></a>
            </div>
          </div>
        </Section>
        <Section id="work" say={tourLines.allWork} wide>
          <div className="t-grid">
            {projects.map((p, i) => (
              <a key={p.slug} className="t-card" href={p.demo}>
                <ProjectCover p={p} i={i} />
                <div className="t-card-meta"><h4>{p.title}</h4><span>{p.year} · {p.status}</span></div>
                <p>{p.tags.join(' · ')}</p>
              </a>
            ))}
          </div>
        </Section>

        <section className="t-contact" id="t-contact" data-say={JSON.stringify(tourLines.contact)}>
          <p className="t-kicker" data-reveal>Contact</p>
          <h2 className="t-giant" data-reveal><SplitWords text="Got a project?" /></h2>
          <button className="t-email" onClick={copy} data-reveal>
            <span>{copied ? 'Copied! Talk soon.' : email}</span>
            <em>{copied ? '✓' : 'Click to copy'}</em>
          </button>
          <div className="t-contact-grid" data-reveal>
            <ContactForm />
            <ul className="t-socials">
              {socials.map((x) => <li key={x.label}><a href={x.href} target="_blank" rel="noreferrer"><span>{x.label}</span><em>{x.value}</em><Arrow /></a></li>)}
            </ul>
          </div>
          <footer className="t-foot">
            <span>© {new Date().getFullYear()} {profile.name}</span>
            <button onClick={play}>Prefer to explore? Play the game <Arrow /></button>
          </footer>
        </section>
      </main>
    </div>
  )
}
