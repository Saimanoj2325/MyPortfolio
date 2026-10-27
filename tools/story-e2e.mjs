// In-browser story test: drives the REAL game (Director scripts, interactables, gates, overlays)
// through chapters 1 → 7 and checks at every beat that (a) the expected trigger fires through the
// game's own mechanism and (b) no other trigger can advance the story early.
// Usage: node tools/story-e2e.mjs <baseUrl> [fromChapter] [toChapter]
// Long runs can be split by chapter range (each segment starts from the chapter-select state).
import fs from 'node:fs'
import { chromium } from 'playwright-core'

const base = process.argv[2] ?? 'http://localhost:4173/'
const from = +(process.argv[3] ?? 1), to = +(process.argv[4] ?? 7)
const exe = process.env.CHROME || (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined)
const b = await chromium.launch({ executablePath: exe, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-gpu-watchdog'] })
const p = await b.newPage({ viewport: { width: 480, height: 300 } })
const errors = []
p.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message))
p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)) })

let fails = 0, checks = 0
const ok = (c, msg) => { checks++; if (!c) { fails++; console.log('   ✗ ' + msg) } }
const beat = () => p.evaluate(() => window.__whoami.useStore.getState().story.beat)
const waitBeat = async (b, ms = 40000) => {
  const t0 = Date.now()
  while (Date.now() - t0 < ms) { if ((await beat()) === b) return true; await p.waitForTimeout(250) }
  return false
}
const enabled = () => p.evaluate(() => [...window.__whoami.interactables.values()].filter((i) => i.enabled()).map((i) => i.id).sort())
const gates = () => p.evaluate(() => { const g = window.__whoami.layout.gates; return { meadow: g.meadow.open, workshop: g.workshop.open, trail: g.trail.open } })
const interact = (id) => p.evaluate((id) => { const it = window.__whoami.interactables.get(id); if (!it || !it.enabled()) return false; it.onInteract(); return true }, id)
const tp = (x, z) => p.evaluate(([x, z]) => { const a = window.__whoami.actors; a.player.pos.set(x, window.__whoami.layout.heightAt(x, z), z); a.player.mode = 'free' }, [x, z])
const skip = async () => { await p.keyboard.press('Escape'); await p.waitForTimeout(300) }

/** every trigger except the expected ones must leave the beat unchanged */
async function noEarly(expect) {
  const r = await p.evaluate((expect) => {
    const { useStore, machine } = window.__whoami
    const s0 = useStore.getState().story
    const bad = []
    for (const t of machine.TRIGGERS) {
      if (expect.includes(t)) continue
      const args = t === 'station' ? machine.MUSEUM_IDS : t === 'project' ? machine.PROJECT_IDS : t === 'perchReached' ? [0, 1, 2, 3, 4, 5] : [undefined]
      for (const a of args) {
        const n = machine.fire(s0, t, a)
        if (n && n.beat !== s0.beat) bad.push(`${t}${a !== undefined ? ':' + a : ''}`)
      }
    }
    return { beat: s0.beat, bad }
  }, expect)
  ok(r.bad.length === 0, `${r.beat}: could advance early via ${r.bad.join(', ')}`)
}
const step = (name) => console.log(` · ${name}`)

async function start(ch) {
  await p.goto(base + `?skip=fx,nature,shadow#ch=${ch}`)
  await p.waitForFunction(() => window.__whoami && !document.querySelector('.loader') && window.__whoami.useStore.getState().phase === 'play', null, { timeout: 110000 })
  await p.waitForTimeout(800)
}

const chapters = {
  async 1() {
    await start(1)
    ok((await beat()) === 'c1_intro', 'chapter 1 starts in c1_intro')
    await noEarly(['introDone'])
    ok(!(await gates()).meadow, 'meadow gate closed during chapter 1')
    ok(!(await enabled()).includes('house-door'), 'house door inactive in chapter 1')
    step('skip the opening orbit'); await skip()
    ok(await waitBeat('c1_explore', 5000), 'skip → c1_explore')
    await noEarly(['wandered'])
    step('walk away from the spawn'); await tp(0, 52)
    ok(await waitBeat('c2_arrive', 20000), '"I can\'t remember anything…" → c2_arrive (Director)')
  },
  async 2() {
    if (from === 2) await start(2)
    await noEarly(['parrotIntroDone'])
    step('skip the parrot cutscene'); await skip()
    ok(await waitBeat('c2_follow', 5000), 'skip → c2_follow')
    await p.waitForTimeout(600)
    ok((await gates()).meadow, 'meadow gate opens to follow the parrot')
    // jumping ahead to a later perch must not count
    const P = await p.evaluate(() => window.__whoami.layout.PERCHES.map((q) => [q.x, q.z]))
    const before = await p.evaluate(() => window.__whoami.useStore.getState().story.perch) // perch 0 may already be in range at spawn
    await tp(P[3][0] + 1, P[3][1] + 2); await p.waitForTimeout(2500)
    const after = await p.evaluate(() => window.__whoami.useStore.getState().story.perch)
    ok(after <= 1 && after === before, `standing at perch 3 early does not count (perch ${before} → ${after})`)
    for (let i = after; i < P.length; i++) {
      await p.waitForFunction(() => window.__whoami.actors.parrot.mode === 'perch', null, { timeout: 20000 })
      await tp(P[i][0] + 1.5, P[i][1] + 1.5)
      if (i < P.length - 1) await p.waitForFunction((i) => window.__whoami.useStore.getState().story.perch > i, i, { timeout: 15000 }).catch(() => {})
      ok((await p.evaluate(() => window.__whoami.useStore.getState().story.perch)) >= Math.min(i + 1, P.length - 1), `perch ${i} reached in order`)
    }
    ok(await waitBeat('c3_puppy', 15000), 'last perch (house roof) → c3_puppy')
  },
  async 3() {
    if (from === 3) await start(3)
    ok(!(await enabled()).includes('house-door'), 'house door inactive until the puppy appears')
    await noEarly(['puppyIntroDone'])
    step('skip the puppy cutscene'); await skip()
    ok(await waitBeat('c3_enter', 5000), 'skip → c3_enter')
    const L = await p.evaluate(() => window.__whoami.layout.HOUSE_DOOR_OUT)
    await tp(L.x + 0.3, L.z); await p.waitForTimeout(800)
    ok((await enabled()).includes('house-door'), 'house door active now')
    ok(!(await enabled()).includes('letterbox'), 'letterbox inactive before the house is explored')
    ok(await interact('house-door'), 'go inside'); ok(await waitBeat('c3_museum', 8000), 'enter → c3_museum')
    await p.waitForTimeout(2500)
    await noEarly(['station', 'exitHouse'])
    for (const id of ['photos', 'books', 'notebook', 'corner', 'telescope']) {
      ok(await interact('m-' + id), `open ${id}`); await p.waitForTimeout(300)
      ok((await p.evaluate(() => window.__whoami.useStore.getState().museum)) === id, `${id} panel open`)
      await p.keyboard.press('Escape'); await p.waitForTimeout(200)
      ok((await beat()) === 'c3_museum', `still exploring after ${id}`)
    }
    ok(await interact('m-computer'), 'wake the computer'); await p.waitForTimeout(3000)
    await p.evaluate(() => window.__whoami.useStore.getState().seated) && await p.keyboard.press('Escape')
    ok(await waitBeat('c3_leave', 6000), 'all six memories → c3_leave')
    await p.waitForTimeout(3000)
    ok(await interact('room-door'), 'step outside')
    ok(await waitBeat('c4_postman', 8000), 'exit → c4_postman')
  },
  async 4() {
    if (from === 4) await start(4)
    ok(!(await enabled()).includes('letterbox'), 'letterbox inactive while the postman rides in')
    await noEarly(['postmanDone'])
    step('skip the postman'); await skip()
    ok(await waitBeat('c4_letterbox', 5000), 'skip → c4_letterbox')
    ok(!(await enabled()).includes('boat'), 'boat inactive before the letter is read')
    const LB = await p.evaluate(() => window.__whoami.layout.LETTERBOX)
    await tp(LB.x + 0.8, LB.z - 1); await p.waitForTimeout(600)
    await noEarly(['openLetterbox'])
    ok(await interact('letterbox'), 'open the letterbox')
    ok(await waitBeat('c4_letter', 4000), '→ c4_letter')
    await p.waitForSelector('.letter-scrim.st-sealed', { timeout: 6000 }).catch(() => {})
    await noEarly(['closeLetter'])
    await p.keyboard.press('Space'); await p.waitForTimeout(2600)
    ok(await p.evaluate(() => !!document.querySelector('.letter-scrim.st-open')), 'seal broken, letter unfolded')
    await p.keyboard.press('Space')
    ok(await waitBeat('c5_board', 6000), 'fold it away → c5_board')
  },
  async 5() {
    if (from === 5) await start(5)
    await noEarly(['boardBoat'])
    const J = await p.evaluate(() => window.__whoami.layout.JETTY_S)
    await tp(J.x - 1.6, J.z - 2); await p.waitForTimeout(600)
    ok((await enabled()).includes('boat'), 'boat active after the letter')
    ok(await interact('boat'), 'board'); ok(await waitBeat('c5_row', 4000), '→ c5_row')
    ok(!(await gates()).workshop, 'workshop door closed until the crossing is done')
    await noEarly(['landed'])
    step('row across'); await p.keyboard.down('w'); await p.waitForTimeout(6000)
    ok((await p.evaluate(() => window.__whoami.actors.boat.speed)) > 0.05, 'W rows the boat forward'); await p.keyboard.up('w')
    await p.evaluate(() => { const w = window.__whoami; w.actors.boat.pos.z = w.layout.BOAT_END_Z + 0.2 })
    ok(await waitBeat('c6_workshop', 8000), 'reach the far jetty → c6_workshop')
  },
  async 6() {
    if (from === 6) await start(6)
    await p.waitForTimeout(800)
    ok((await gates()).workshop, 'workshop door open after the crossing')
    await noEarly(['enterWorkshop'])
    await tp(6, -38.5)
    ok(await waitBeat('c6_projects', 6000), 'walk in → c6_projects')
    ok(!(await gates()).trail, 'trail gate closed with 0 projects')
    for (const [i, id] of ['frontend', 'mobile', 'ai'].entries()) {
      await noEarly(['project'])
      ok(await interact('station-' + id), `open ${id}`); await p.waitForTimeout(300)
      ok(!!(await p.evaluate(() => window.__whoami.useStore.getState().project)), `${id} project panel open`)
      await p.keyboard.press('Escape'); await p.waitForTimeout(400)
      const g = (await gates()).trail
      ok(i < 2 ? !g : true, `trail still closed with ${i + 1} project(s)`)
    }
    await p.waitForTimeout(800)
    ok((await gates()).trail, 'trail gate opens at 3 projects')
    const TG = await p.evaluate(() => window.__whoami.layout.TRAIL_GATE)
    await tp(TG.x, TG.z - 3)
    ok(await waitBeat('c7_climb', 10000), 'walk through the gate → c7_climb')
  },
  async 7() {
    if (from === 7) await start(7)
    await noEarly(['reachSummit', 'project'])
    ok(!(await enabled()).includes('bench'), 'bench inactive until the summit')
    const B = await p.evaluate(() => window.__whoami.layout.BENCH)
    await tp(B.x + 1, B.z + 3)
    ok(await waitBeat('c7_bench', 8000), 'reach the summit → c7_bench')
    await p.waitForTimeout(800)
    for (let k = 0; k < 3; k++) { await p.keyboard.press('Space'); await p.waitForTimeout(500) }
    await noEarly(['sit', 'project'])
    ok(await interact('bench'), 'sit on the bench')
    ok(await waitBeat('c7_finale', 4000), '→ c7_finale')
    await noEarly(['finaleDone'])
    step('skip the finale'); await skip()
    ok(await waitBeat('c7_end', 5000), 'skip → c7_end')
    ok(await p.evaluate(() => !!document.querySelector('.finale-card')), 'contact card shown')
    ok(await p.evaluate(() => document.querySelector('.finale-msg')?.textContent?.includes('discovering what I can become')), 'final message present')
  },
}

for (let ch = from; ch <= to; ch++) {
  console.log(`Chapter ${ch}`)
  if (ch === from && ch === 1) { /* start(1) inside */ }
  try { await chapters[ch]() } catch (e) { fails++; console.log('   ✗ exception: ' + e.message.split('\n')[0]) }
}
console.log(`\n${checks} checks, ${fails} failures${errors.length ? '\nconsole errors:\n' + [...new Set(errors)].slice(0, 10).join('\n') : ''}`)
await b.close()
process.exit(fails ? 1 : 0)
