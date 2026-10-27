import { create } from 'zustand'
import { profile } from '../data/profile'

export type GuideAction = 'Wave' | 'Dance' | 'Panic' | 'Jump' | 'Sneeze' | 'Sulk' | 'Selfie' | 'Type' | 'Poke' | 'Talk'
export type BubbleButton = { label: string; onClick: () => void }

type GuideState = {
  text: string
  key: number
  buttons: BubbleButton[] | null
  /** an interrupting line (poke, action, copy) holds the bubble until this time */
  holdUntil: number
  action: { name: GuideAction; key: number } | null
  say: (text: string, opts?: { buttons?: BubbleButton[]; hold?: number; force?: boolean }) => void
  act: (name: GuideAction) => void
}

export const fill = (s: string) => s.replace(/\{name\}/g, profile.firstName)

export const useGuide = create<GuideState>((set, get) => ({
  text: '',
  key: 0,
  buttons: null,
  holdUntil: 0,
  action: null,
  say: (text, opts = {}) => {
    const now = performance.now()
    if (!opts.force && !opts.hold && now < get().holdUntil) return
    const t = fill(text)
    if (t === get().text && !opts.buttons && !opts.force) return
    set({ text: t, key: get().key + 1, buttons: opts.buttons ?? null, holdUntil: opts.hold ? now + opts.hold : get().holdUntil })
  },
  act: (name) => set({ action: { name, key: (get().action?.key ?? 0) + 1 } }),
}))
