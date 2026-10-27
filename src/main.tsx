import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/fraunces'
import '@fontsource-variable/inter'
import './styles.css'
import './story.css'
import gsap from 'gsap'
import App from './App'
import { runtime, useStore } from './store'
import * as actors from './lib/actors'
import * as machine from './story/machine'
import * as layout from './world/layout'
import { interactables } from './lib/interact'

// UI timing must follow the wall clock even on slow frames (fades, panels, cards)
gsap.ticker.lagSmoothing(0)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// debug / test handle (used by tools/story-e2e.mjs and the screenshot script)
;(window as unknown as { __whoami: unknown }).__whoami = { runtime, useStore, actors, machine, layout, interactables }
