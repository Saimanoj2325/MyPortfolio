import { useEffect } from 'react'
import { useStore } from '../store'

// ─────────────────────────────────────────────────────────────────────────────
// SOUND SYSTEM — Authentic soundscape inspired by Messenger (messenger.abeto.co)
// Composed by Kevin Colombin & Michael Sungaila.
// ─────────────────────────────────────────────────────────────────────────────

let ctx: AudioContext | null = null
let master: GainNode | null = null

function getAudioContext() {
  if (!ctx) {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    ctx = new AudioCtx()
    master = ctx.createGain()
    master.gain.value = 0.7
    master.connect(ctx.destination)
  }
  return { ctx: ctx!, master: master! }
}

export type Sfx =
  | 'tick'
  | 'pick'
  | 'success'
  | 'fail'
  | 'start'
  | 'jump'
  | 'door'
  | 'switch'
  | 'squawk'
  | 'woof'
  | 'bell'
  | 'paper'
  | 'seal'
  | 'splash'

const SFX_FILES: Record<Sfx, string> = {
  tick: 'audio/ui/click2.ogg',
  pick: 'audio/ui/buttons2.ogg',
  success: 'audio/ui/quest-complete.ogg',
  fail: 'audio/ui/click3.ogg',
  start: 'audio/ui/title.ogg',
  jump: 'audio/character/jump-start.ogg',
  door: 'audio/camera/whoosh2.ogg',
  switch: 'audio/ui/openbox1.ogg',
  squawk: 'audio/dialogues/quest.ogg',
  woof: 'audio/dialogues/male1.ogg',
  bell: 'audio/ui/title.ogg',
  paper: 'audio/ui/paper1.ogg',
  seal: 'audio/intro/letters.ogg',
  splash: 'audio/camera/zoom-off-5.ogg',
}

const SFX_VOLUMES: Partial<Record<Sfx, number>> = {
  tick: 0.55,
  pick: 0.65,
  success: 0.8,
  fail: 0.5,
  start: 0.85,
  jump: 0.6,
  door: 0.6,
  switch: 0.55,
  squawk: 0.75,
  woof: 0.65,
  bell: 0.8,
  paper: 0.7,
  seal: 0.75,
  splash: 0.6,
}

// Memory cache for decoded audio buffers
const bufferCache = new Map<string, AudioBuffer>()
const loadPromises = new Map<string, Promise<AudioBuffer | null>>()

async function getSfxBuffer(path: string): Promise<AudioBuffer | null> {
  if (bufferCache.has(path)) return bufferCache.get(path)!
  if (loadPromises.has(path)) return loadPromises.get(path)!

  const p = (async () => {
    try {
      const { ctx } = getAudioContext()
      const url = `${import.meta.env.BASE_URL}${path}`
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const arrayBuf = await res.arrayBuffer()
      const audioBuf = await ctx.decodeAudioData(arrayBuf)
      bufferCache.set(path, audioBuf)
      return audioBuf
    } catch (e) {
      console.warn(`Could not load audio asset ${path}, using fallback:`, e)
      return null
    }
  })()

  loadPromises.set(path, p)
  return p
}

// Fallback synthetic notes in case browser blocks or audio file fails
const FALLBACK_NOTES: Record<Sfx, [number, number, number][]> = {
  tick: [[880, 0, 0.06]],
  pick: [[660, 0, 0.12], [990, 0.06, 0.16]],
  success: [[392, 0, 0.5], [523.3, 0.12, 0.5], [659.3, 0.24, 0.7], [784, 0.36, 0.9]],
  fail: [[220, 0, 0.35], [196, 0.18, 0.5]],
  start: [[330, 0, 0.25], [440, 0.12, 0.4]],
  jump: [[300, 0, 0.08]],
  door: [[180, 0, 0.25], [140, 0.08, 0.3]],
  switch: [[520, 0, 0.08], [780, 0.05, 0.12]],
  squawk: [[1400, 0, 0.09], [1150, 0.07, 0.12], [1500, 0.16, 0.08]],
  woof: [[190, 0, 0.12], [150, 0.06, 0.14]],
  bell: [[1318, 0, 0.5], [1568, 0.12, 0.6]],
  paper: [[2400, 0, 0.05], [1800, 0.04, 0.06]],
  seal: [[260, 0, 0.12], [520, 0.03, 0.08]],
  splash: [[320, 0, 0.2], [240, 0.08, 0.25]],
}

function playFallbackSynth(name: Sfx) {
  const { ctx, master } = getAudioContext()
  const t0 = ctx.currentTime
  for (const [f, s, d] of FALLBACK_NOTES[name] || []) {
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = name === 'squawk' ? 'sawtooth' : name === 'fail' || name === 'door' || name === 'woof' ? 'triangle' : 'sine'
    o.frequency.value = f
    g.gain.setValueAtTime(0, t0 + s)
    g.gain.linearRampToValueAtTime(name === 'tick' ? 0.05 : 0.09, t0 + s + 0.015)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + s + d)
    o.connect(g).connect(master)
    o.start(t0 + s)
    o.stop(t0 + s + d + 0.05)
  }
}

export function playSfx(name: Sfx) {
  if (!useStore.getState().sound) return

  const { ctx, master } = getAudioContext()
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {})
  }

  const relPath = SFX_FILES[name]
  if (!relPath) {
    playFallbackSynth(name)
    return
  }

  getSfxBuffer(relPath).then((buffer) => {
    if (!buffer) {
      playFallbackSynth(name)
      return
    }

    const source = ctx.createBufferSource()
    source.buffer = buffer

    const gainNode = ctx.createGain()
    const targetVol = SFX_VOLUMES[name] ?? 0.7
    gainNode.gain.setValueAtTime(targetVol, ctx.currentTime)

    source.connect(gainNode)
    gainNode.connect(master)
    source.start(0)
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// AMBIENT & SOUNDTRACK SYSTEM
// Plays the cozy acoustic soundtrack & outdoor nature ambience from Messenger.
// ─────────────────────────────────────────────────────────────────────────────

let musicAudio: HTMLAudioElement | null = null
let ambientAudio: HTMLAudioElement | null = null
let fadeTimer: number | null = null

function stopFade() {
  if (fadeTimer) {
    clearInterval(fadeTimer)
    fadeTimer = null
  }
}

function getMusicTrack(): HTMLAudioElement {
  if (!musicAudio) {
    musicAudio = new Audio(`${import.meta.env.BASE_URL}audio/music/bgmusic-highq.ogg`)
    musicAudio.loop = true
    musicAudio.volume = 0
    musicAudio.preload = 'auto'
  }
  return musicAudio
}

function getAmbientTrack(): HTMLAudioElement {
  if (!ambientAudio) {
    ambientAudio = new Audio(`${import.meta.env.BASE_URL}audio/ambiances/base.ogg`)
    ambientAudio.loop = true
    ambientAudio.volume = 0
    ambientAudio.preload = 'auto'
  }
  return ambientAudio
}

export function useAmbientSound() {
  const sound = useStore((s) => s.sound)

  useEffect(() => {
    const music = getMusicTrack()
    const ambience = getAmbientTrack()
    stopFade()

    if (sound) {
      // Resume AudioContext if suspended
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {})
      }

      // Smooth fade-in
      const targetMusicVol = 0.45
      const targetAmbVol = 0.22

      music.play().catch(() => {})
      ambience.play().catch(() => {})

      let curMusic = music.volume
      let curAmb = ambience.volume
      fadeTimer = window.setInterval(() => {
        curMusic = Math.min(targetMusicVol, curMusic + 0.03)
        curAmb = Math.min(targetAmbVol, curAmb + 0.015)
        music.volume = curMusic
        ambience.volume = curAmb
        if (curMusic >= targetMusicVol && curAmb >= targetAmbVol) {
          stopFade()
        }
      }, 50)
    } else {
      // Smooth fade-out and pause
      let curMusic = music.volume
      let curAmb = ambience.volume
      fadeTimer = window.setInterval(() => {
        curMusic = Math.max(0, curMusic - 0.04)
        curAmb = Math.max(0, curAmb - 0.03)
        music.volume = curMusic
        ambience.volume = curAmb
        if (curMusic <= 0 && curAmb <= 0) {
          stopFade()
          music.pause()
          ambience.pause()
        }
      }, 50)
    }

    return () => {
      stopFade()
    }
  }, [sound])
}
