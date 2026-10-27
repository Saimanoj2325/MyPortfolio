// Chapter IV: a physical letter. The envelope arrives, the wax seal cracks in two, the flap opens,
// the letter slides out and unfolds (three panels). Closing folds it back into the envelope.
import { useCallback, useEffect, useRef, useState } from 'react'
import { useStore } from '../store'
import { education } from '../data/education'
import { achievements } from '../data/achievements'
import { letter } from '../data/story'
import { profile } from '../data/profile'
import { playSfx } from './sound'

type Stage = 'in' | 'sealed' | 'cracking' | 'opening' | 'open' | 'folding' | 'out'

export function LetterOverlay() {
  const open = useStore((s) => s.letterOpen)
  const [stage, setStage] = useState<Stage>('in')
  const timers = useRef<number[]>([])
  const later = (ms: number, f: () => void) => { timers.current.push(window.setTimeout(f, ms)) }
  useEffect(() => () => { timers.current.forEach(clearTimeout) }, [])
  useEffect(() => {
    if (!open) return
    setStage('in')
    later(60, () => setStage('sealed'))
  }, [open])

  const breakSeal = useCallback(() => {
    if (stage !== 'sealed') return
    playSfx('seal')
    setStage('cracking')
    later(650, () => { setStage('opening'); playSfx('paper') })
    later(2100, () => setStage('open'))
  }, [stage])

  const close = useCallback(() => {
    if (stage !== 'open') return
    playSfx('paper')
    setStage('folding')
    later(1500, () => setStage('out'))
    later(2200, () => {
      const s = useStore.getState()
      s.setLetter(false)
      s.trigger('closeLetter')
    })
  }, [stage])

  useEffect(() => {
    const adv = () => { if (stage === 'sealed') breakSeal(); else if (stage === 'open') close() }
    const cls = () => { if (stage === 'open') close(); else if (stage === 'sealed') breakSeal() }
    window.addEventListener('letter-advance', adv)
    window.addEventListener('letter-close', cls)
    return () => { window.removeEventListener('letter-advance', adv); window.removeEventListener('letter-close', cls) }
  }, [stage, breakSeal, close])

  if (!open) return null
  return (
    <div className={`letter-scrim st-${stage}`} role="dialog" aria-label="A letter">
      <div className="letter-stage">
        {/* the envelope */}
        <div className="envelope" onClick={breakSeal}>
          <div className="env-back" />
          <div className="env-paper-peek" />
          <div className="env-front" />
          <div className="env-flap" />
          <div className="seal">
            <i className="seal-half l" /><i className="seal-half r" />
            <span className="seal-mark">S</span>
          </div>
          <p className="env-to">For <em>{profile.firstName}</em></p>
          {stage === 'sealed' && <button className="env-hint" onClick={breakSeal}>Break the seal <kbd>Space</kbd></button>}
        </div>

        {/* the letter: three folded panels */}
        <div className="paper">
          <section className="panel-p p1">
            <p className="l-date">Hyderabad · {new Date().getFullYear()}</p>
            <p className="l-salute">{letter.salutation}</p>
            <p className="l-body">{letter.opening}</p>
          </section>
          <section className="panel-p p2">
            <h4 className="l-h">Education</h4>
            <ol className="l-timeline">
              {education.map((e) => (
                <li key={e.degree}>
                  <span className="l-when">{e.period}</span>
                  <div><b>{e.degree}</b><span>{e.school}</span></div>
                </li>
              ))}
            </ol>
          </section>
          <section className="panel-p p3">
            <h4 className="l-h">{letter.milestonesTitle}</h4>
            <ul className="l-miles">
              {achievements.map((a) => <li key={a.title}><span className="l-when">{a.year}</span><div><b>{a.title}</b><span>{a.org}</span></div></li>)}
            </ul>
            <p className="l-sign">{letter.signoff}<br /><em>{letter.sign}</em></p>
          </section>
        </div>
      </div>
      {stage === 'open' && <button className="letter-close" onClick={close}>Fold it away <kbd>Space</kbd></button>}
    </div>
  )
}
