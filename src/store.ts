import { create } from 'zustand'
import type { SectionId } from './data/chapters'
import { fire, initialState, stateForChapter, chapterOf, type StoryState, type Trigger } from './story/machine'
import type { Line } from './data/story'
import { chapterCards } from './data/story'

export type Phase = 'loading' | 'title' | 'transitioning' | 'play' | 'tour'

/** an interactable the player is standing near (handlers live in lib/interact.ts) */
export type Nearby = { id: string; label: string; verb: string }

export type Dialogue = { line: Line; key: number; auto?: number } | null

type State = {
  phase: Phase
  nearby: Nearby | null
  sound: boolean
  paused: boolean
  /** legacy section panel (still used by the tour + laptop helpers) */
  open: { section: SectionId; tabs: SectionId[] } | null
  /** where the player is: outdoors, or inside the house */
  place: 'world' | 'home'
  seated: boolean
  story: StoryState
  /** bumps when the story is jumped (chapter select / replay) so the 3D world re-stages itself */
  epoch: number
  card: { numeral: string; title: string; line: string; key: number } | null
  dialogue: Dialogue
  cutscene: boolean
  museum: string | null
  letterOpen: boolean
  riverMessageOpen: boolean
  riverBottleState: 'in_river' | 'retrieved' | 'released'
  project: string | null
  finale: 0 | 1 | 2 // 0 none, 1 message, 2 contact card
  /** a short non-blocking bubble (parrot hints, puppy woofs) */
  ambient: { who: string; text: string; key: number } | null
  setAmbient: (a: { who: string; text: string } | null) => void
  setPhase: (p: Phase) => void
  setNearby: (n: Nearby | null) => void
  toggleSound: () => void
  setPaused: (v: boolean) => void
  setPlace: (p: 'world' | 'home') => void
  setSeated: (v: boolean) => void
  closePanel: () => void
  trigger: (t: Trigger, arg?: string | number) => boolean
  jumpToChapter: (ch: number) => void
  showCard: (chapter: number) => void
  setDialogue: (d: Dialogue) => void
  setCutscene: (v: boolean) => void
  setMuseum: (id: string | null) => void
  setLetter: (v: boolean) => void
  setRiverMessageOpen: (v: boolean) => void
  setRiverBottleState: (s: 'in_river' | 'retrieved' | 'released') => void
  setProject: (id: string | null) => void
  setFinale: (v: 0 | 1 | 2) => void
}

let key = 1

export const useStore = create<State>((set, get) => ({
  phase: typeof window !== 'undefined' && /tour|recruiter/.test(window.location.hash) ? 'tour' : 'loading',
  nearby: null,
  sound: false,
  paused: false,
  open: null,
  place: 'world',
  seated: false,
  story: initialState(),
  epoch: 0,
  card: null,
  dialogue: null,
  cutscene: false,
  museum: null,
  letterOpen: false,
  riverMessageOpen: false,
  riverBottleState: 'in_river',
  project: null,
  finale: 0,
  ambient: null,
  setAmbient: (a) => set({ ambient: a ? { ...a, key: key++ } : null }),
  setPhase: (phase) => set({ phase, nearby: null, paused: false }),
  setNearby: (nearby) => {
    const cur = get().nearby
    if (cur === nearby) return
    if (cur && nearby && cur.id === nearby.id && cur.label === nearby.label && cur.verb === nearby.verb) return
    set({ nearby })
  },
  toggleSound: () => set((s) => ({ sound: !s.sound })),
  setPaused: (paused) => set({ paused }),
  setPlace: (place) => set({ place, nearby: null, seated: false, museum: null }),
  setSeated: (seated) => set({ seated }),
  closePanel: () => set({ open: null }),
  trigger: (t, arg) => {
    const s = get().story
    const n = fire(s, t, arg)
    if (!n) return false
    set({ story: n })
    if (chapterOf(n.beat) !== chapterOf(s.beat)) get().showCard(chapterOf(n.beat))
    return true
  },
  jumpToChapter: (ch) => {
    set({
      story: stateForChapter(ch), epoch: get().epoch + 1, paused: false, dialogue: null, museum: null, letterOpen: false,
      riverMessageOpen: false, riverBottleState: 'in_river',
      project: null, finale: 0, seated: false, place: 'world', cutscene: false, nearby: null,
    })
    get().showCard(ch)
  },
  showCard: (chapter) => {
    const c = chapterCards[chapter - 1]
    if (c) set({ card: { numeral: c.numeral, title: c.title, line: c.line, key: key++ } })
  },
  setDialogue: (dialogue) => set({ dialogue }),
  setCutscene: (cutscene) => set({ cutscene }),
  setMuseum: (museum) => set({ museum }),
  setLetter: (letterOpen) => set({ letterOpen }),
  setRiverMessageOpen: (riverMessageOpen) => set({ riverMessageOpen }),
  setRiverBottleState: (riverBottleState) => set({ riverBottleState }),
  setProject: (project) => set({ project }),
  setFinale: (finale) => set({ finale }),
}))

/** Per-frame mutable values (never trigger React renders). */
export const runtime = {
  keys: new Set<string>(),
  joy: { x: 0, y: 0 },
  interactQueued: false,
  advanceQueued: false,
  runHeld: false,
  dragYaw: 0,
  dragPitch: 0,
  /** screen-space anchors for speech bubbles, written by the canvas each frame */
  anchors: {} as Record<string, { x: number; y: number; vis: boolean; behind: boolean }>,
  /** 0..1 dusk amount for the finale */
  dusk: 0,
  /** dialogue advance key counter (UI → director) */
  lineDone: 0,
}

/** safe storage: the single-file build runs in a sandboxed iframe without same-origin */
export const safeStorage = {
  get(k: string) { try { return window.localStorage.getItem(k) } catch { return null } },
  set(k: string, v: string) { try { window.localStorage.setItem(k, v) } catch { /* sandboxed */ } },
}
