import { useEffect } from 'react'
import { useStore } from '../store'

// Procedural audio (no files): a soft ambient bed and a few understated UI/game cues. Off by default.
let ctx: AudioContext | null = null
let master: GainNode | null = null
function audio() {
  if (!ctx) {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    ctx = new Ctx()
    master = ctx.createGain()
    master.gain.value = 0.6
    master.connect(ctx.destination)
  }
  return { ctx: ctx!, master: master! }
}

export type Sfx = 'tick' | 'pick' | 'success' | 'fail' | 'start' | 'jump' | 'door' | 'switch' | 'squawk' | 'woof' | 'bell' | 'paper' | 'seal' | 'splash'
const NOTES: Record<Sfx, [number, number, number][]> = {
  // [freq, start, duration]
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

export function playSfx(name: Sfx) {
  if (!useStore.getState().sound) return
  const { ctx, master } = audio()
  const t0 = ctx.currentTime
  for (const [f, s, d] of NOTES[name]) {
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

/** soft wind + a slow, warm pad */
export function useAmbientSound() {
  const sound = useStore((s) => s.sound)
  useEffect(() => {
    if (!sound) return
    const { ctx, master } = audio()
    if (ctx.state === 'suspended') ctx.resume()
    const bus = ctx.createGain()
    bus.gain.value = 0
    bus.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 2.5)
    bus.connect(master)
    const buf = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate)
    const data = buf.getChannelData(0)
    let last = 0
    for (let i = 0; i < data.length; i++) { last = last * 0.985 + (Math.random() * 2 - 1) * 0.015; data[i] = last * 3 }
    const noise = ctx.createBufferSource()
    noise.buffer = buf; noise.loop = true
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500
    const wg = ctx.createGain(); wg.gain.value = 0.3
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07
    const lfoG = ctx.createGain(); lfoG.gain.value = 220
    lfo.connect(lfoG).connect(lp.frequency)
    noise.connect(lp).connect(wg).connect(bus)
    const padG = ctx.createGain(); padG.gain.value = 0.028
    const oscs = [146.8, 220, 277.2, 329.6].map((f, i) => {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f; o.detune.value = i * 4
      o.connect(padG); o.start(); return o
    })
    padG.connect(bus)
    noise.start(); lfo.start()
    return () => {
      bus.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5)
      setTimeout(() => { oscs.forEach((o) => o.stop()); noise.stop(); lfo.stop(); bus.disconnect() }, 600)
    }
  }, [sound])
}
