// Screenshots of the story, chapter by chapter, for visual review.
// Usage: node tools/shots.mjs <baseUrl> <outDir> [names…]
//   names: title ch1 ch2 ch3 home museum ch4 letter ch5 ch6 project ch7 finale  (default: all)
// CHROME=/path/to/chromium overrides the browser.
import fs from 'node:fs'
import { chromium } from 'playwright-core'

const base = process.argv[2] ?? 'http://localhost:4173/'
const out = process.argv[3] ?? 'shots'
const only = process.argv.slice(4)
fs.mkdirSync(out, { recursive: true })
const exe = process.env.CHROME || (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined)
const W = +(process.env.W || 1280), H = +(process.env.H || 760)

const b = await chromium.launch({ executablePath: exe, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--ignore-gpu-blocklist', '--disable-gpu-watchdog'] })
const errors = []

let cur = null // the page of the scene in progress (closed even when the scene fails, so it stops rendering)
async function open(hash) {
  const p = await b.newPage({ viewport: { width: W, height: H } })
  cur = p
  p.on('pageerror', (e) => errors.push(`[${hash}] PAGEERROR ${e.message}`))
  p.on('console', (m) => { if (m.type() === 'error') errors.push(`[${hash}] ${m.text().slice(0, 200)}`) })
  await p.goto(base + hash)
  await p.waitForFunction(() => !document.querySelector('.loader') && window.__whoami, null, { timeout: 180000 })
  return p
}
const W$ = (p, js) => p.evaluate(js)
/** press Esc until the cutscene has been skipped into `beat` */
async function skipTo(p, beat) {
  for (let i = 0; i < 40; i++) {
    if (await p.evaluate((b) => window.__whoami.useStore.getState().story.beat === b, beat)) return
    const s = await p.evaluate(() => { const s = window.__whoami.useStore.getState(); return { cut: s.cutscene, paused: s.paused } })
    if (s.paused) await p.keyboard.press('Escape')
    else if (s.cut) await p.keyboard.press('Escape')
    await p.waitForTimeout(500)
  }
}
const use = (p, id) => p.evaluate((id) => window.__whoami.interactables.get(id)?.onInteract(), id)
const settle = (p, ms) => p.waitForTimeout(ms)

const scenes = {
  async title() { const p = await open(''); await settle(p, 6000); return p },
  async ch1() { const p = await open('#ch=1'); await settle(p, 9000); return p }, // mid-orbit with the thought cloud
  async ch1b() { const p = await open('#ch=1'); await skipTo(p, 'c1_explore'); await settle(p, 3000); return p },
  async ch2() { const p = await open('#ch=2'); await settle(p, 12000); return p },
  async ch3() { const p = await open('#ch=3'); await settle(p, 9000); return p },
  async museum() {
    const p = await open('#ch=3'); await skipTo(p, 'c3_enter')
    await use(p, 'house-door'); await settle(p, 3500)
    await W$(p, () => window.__whoami.interactables.get('m-photos').onInteract()); await settle(p, 3000)
    return p
  },
  async home() {
    const p = await open('#ch=3'); await skipTo(p, 'c3_enter')
    await use(p, 'house-door'); await settle(p, 3000)
    await W$(p, () => { const a = window.__whoami.actors; a.player.room.x = 0.6; a.player.room.z = 0.6 }); await settle(p, 3000)
    return p
  },
  async laptop() {
    const p = await open('#ch=3'); await skipTo(p, 'c3_enter')
    await use(p, 'house-door'); await settle(p, 2500)
    await use(p, 'm-computer'); await settle(p, 9000)
    return p
  },
  async puppy() {
    const p = await open('#ch=4'); await skipTo(p, 'c4_letterbox')
    await W$(p, () => { const a = window.__whoami.actors; const y = window.__whoami.layout.heightAt(-1, 17); a.player.pos.set(-1.4, y, 18.2); a.player.yaw = Math.PI; a.puppy.mode = 'sit'; a.puppy.pos.set(-0.5, y, 17.0); a.puppy.yaw = 0.6
      a.debugShot([0.75, y + 0.62, 18.7], [-0.45, y + 0.42, 17.05], 30) }); await settle(p, 5000)
    return p
  },
  async parrot() {
    const p = await open('#ch=4'); await skipTo(p, 'c4_letterbox')
    await W$(p, () => { const w = window.__whoami, a = w.actors, r = w.layout.ROOF_PERCH; a.player.pos.set(r.x + 3.2, 0.1, r.z + 2.6); a.debugShot([r.x + 1.25, r.y + 0.45, r.z + 1.05], [r.x, r.y + 0.3, r.z], 32) }); await settle(p, 5000)
    return p
  },
  async parrotSide() {
    const p = await open('#ch=4'); await skipTo(p, 'c4_letterbox')
    await W$(p, () => { const w = window.__whoami, a = w.actors, r = w.layout.ROOF_PERCH; a.player.pos.set(r.x + 30, 0.1, r.z + 20); a.parrot.yaw = 0.5; a.debugShot([r.x + 1.15, r.y + 0.42, r.z + 0.35], [r.x, r.y + 0.3, r.z + 0.05], 30) }); await settle(p, 5000)
    return p
  },
  async homeEnter() {
    const p = await open('#ch=3'); await skipTo(p, 'c3_enter')
    await use(p, 'house-door'); await settle(p, 3500)
    return p
  },
  async perch() {
    const p = await open('#ch=7'); await settle(p, 2500)
    await W$(p, () => { const a = window.__whoami.actors, r = a.parrot.perch; a.debugShot([r.x - 0.5, r.y + 0.15, r.z + 2.3], [r.x, r.y + 0.12, r.z], 36) }); await settle(p, 5000)
    return p
  },
  async ch4() { const p = await open('#ch=4'); await settle(p, 9000); return p },
  async letter() {
    const p = await open('#ch=4'); await skipTo(p, 'c4_letterbox')
    await W$(p, () => window.__whoami.useStore.getState().trigger('openLetterbox')); await settle(p, 2500)
    await p.keyboard.press('Space'); await settle(p, 4500)
    return p
  },
  async ch5() {
    const p = await open('#ch=5'); await settle(p, 2000)
    await W$(p, () => window.__whoami.useStore.getState().trigger('boardBoat')); await settle(p, 5000)
    await p.keyboard.down('w'); await settle(p, 6000); await p.keyboard.up('w'); await settle(p, 1500)
    return p
  },
  async ch6() {
    const p = await open('#ch=6'); await settle(p, 4000)
    await W$(p, () => { const w = window.__whoami; w.actors.player.pos.set(6, w.actors.player.pos.y, -38.5); w.useStore.getState().trigger('enterWorkshop') }); await settle(p, 4000)
    return p
  },
  async project() {
    const p = await open('#ch=6'); await settle(p, 2000)
    await W$(p, () => { const w = window.__whoami; w.actors.player.pos.set(6, w.actors.player.pos.y, -38.5); const s = w.useStore.getState(); s.trigger('enterWorkshop'); s.trigger('project', 'mobile'); s.setProject('geoattend') }); await settle(p, 4000)
    return p
  },
  async ch7() { const p = await open('#ch=7'); await settle(p, 8000); return p },
  async finale() {
    const p = await open('#ch=7'); await settle(p, 1500)
    await W$(p, () => { const s = window.__whoami.useStore.getState(); s.trigger('reachSummit') }); await settle(p, 2500)
    await W$(p, () => { const s = window.__whoami.useStore.getState(); s.setDialogue(null); s.trigger('sit') }); await settle(p, 26000)
    return p
  },
}

for (const [name, fn] of Object.entries(scenes)) {
  if (only.length && !only.includes(name)) continue
  const t0 = Date.now()
  try {
    const p = await fn()
    await p.screenshot({ path: `${out}/${name}.png`, timeout: 100000 })
    console.log(`${name}: ok (${((Date.now() - t0) / 1000).toFixed(0)}s)`)
    await p.close()
  } catch (e) { console.log(`${name}: FAILED ${e.message.split('\n')[0]}`); await cur?.close().catch(() => {}) }
}
console.log(errors.length ? '---errors---\n' + [...new Set(errors)].slice(0, 20).join('\n') : 'no console errors')
await b.close()
