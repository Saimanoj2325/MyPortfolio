import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { sectionTitles } from '../data/chapters'
import { useStore } from '../store'
import { SectionContent } from './SectionContent'

/** premium frosted panel with large serif titles; tabs when a landmark holds several sections */
export function Panel() {
  const open = useStore((s) => s.open)
  const close = useStore((s) => s.closePanel)
  const [tab, setTab] = useState(open?.section)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => { setTab(open?.section) }, [open])
  useEffect(() => {
    if (!open || !ref.current) return
    const el = ref.current
    gsap.fromTo(el, { opacity: 0, x: 30, filter: 'blur(8px)' }, { opacity: 1, x: 0, filter: 'blur(0px)', duration: 0.9, ease: 'expo.out' })
  }, [open])
  useEffect(() => {
    if (!ref.current) return
    gsap.fromTo(ref.current.querySelectorAll('.p-anim'), { opacity: 0, y: 16 }, { opacity: 1, y: 0, stagger: 0.07, duration: 0.9, ease: 'power3.out' })
  }, [tab])
  if (!open || !tab) return null
  const t = sectionTitles[tab]
  return (
    <aside className="panel glass" ref={ref} role="dialog" aria-label={t.title}>
      <button className="panel-close" onClick={close} aria-label="Close panel"><span>Esc</span></button>
      {open.tabs.length > 1 && (
        <nav className="panel-tabs">
          {open.tabs.map((id) => <button key={id} className={id === tab ? 'on' : ''} onClick={() => setTab(id)}>{sectionTitles[id].kicker}</button>)}
        </nav>
      )}
      <p className="kicker p-anim">{t.kicker}</p>
      <h3 className="panel-title p-anim">{t.title}</h3>
      <div className="panel-body p-anim" key={tab}><SectionContent id={tab} /></div>
    </aside>
  )
}
