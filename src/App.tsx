import { lazy, Suspense, useEffect } from 'react'
import { Experience } from './three/Experience'
import { Loader } from './ui/Loader'
import { TitleScreen } from './ui/TitleScreen'
import { StoryUI } from './ui/StoryUI'
import { LetterOverlay } from './ui/LetterOverlay'
import { RiverMessageModal } from './ui/RiverMessageModal'
import { TouchControls } from './ui/TouchControls'
import { useInput } from './ui/useInput'
import { useStore } from './store'
import { useAmbientSound } from './ui/sound'

const Tour = lazy(() => import('./tour/Tour').then((m) => ({ default: m.Tour })))

export default function App() {
  const phase = useStore((s) => s.phase)
  useInput()
  useAmbientSound()

  useEffect(() => {
    const onHash = () => {
      const h = window.location.hash
      if (/tour|recruiter/.test(h)) {
        useStore.getState().setPhase('tour')
        return
      }
      const m = /ch=(\d)/.exec(h)
      if (m) {
        useStore.getState().setPhase('play')
        useStore.getState().jumpToChapter(+m[1])
      }
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  if (phase === 'tour') {
    return (
      <Suspense fallback={<div className="tour-fallback"><span>Saimanoj</span></div>}>
        <Tour />
      </Suspense>
    )
  }
  return (
    <>
      <div className="stage" id="stage">
        <Experience />
      </div>
      <div className="fader" id="fader" />
      {phase === 'title' && <TitleScreen />}
      {phase === 'play' && (
        <>
          <StoryUI />
          <LetterOverlay />
          <RiverMessageModal />
          <TouchControls />
        </>
      )}
      <Loader />
    </>
  )
}
