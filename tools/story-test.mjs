// Walks the story state machine 1 → 7 and proves that every trigger fires only in its own beat.
// Usage: node tools/story-test.mjs   (no browser needed; transpiles src/story/machine.ts on the fly)
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import ts from 'typescript'

const src = fs.readFileSync(new URL('../src/story/machine.ts', import.meta.url), 'utf8')
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText
const tmp = path.join(os.tmpdir(), `machine-${process.pid}.mjs`)
fs.writeFileSync(tmp, js)
import { pathToFileURL } from 'node:url'
const M = await import(pathToFileURL(tmp).href)

let failures = 0, checks = 0
const ok = (cond, msg) => { checks++; if (!cond) { failures++; console.log('  ✗ ' + msg) } }

// the scripted happy path: [trigger, arg]
const path1 = [
  ['introDone'], ['wandered'], ['parrotIntroDone'],
  ...Array.from({ length: M.PERCH_COUNT }, (_, i) => ['perchReached', i]),
  ['puppyIntroDone'], ['enterHouse'],
  ...M.MUSEUM_IDS.map((id) => ['station', id]),
  ['exitHouse'], ['postmanDone'], ['openLetterbox'], ['closeLetter'], ['boardBoat'], ['landed'], ['enterWorkshop'],
  ...M.PROJECT_IDS.slice(0, 3).map((id) => ['project', id]),
  ['enterTrail'], ['reachSummit'], ['sit'], ['finaleDone'],
]

// triggers that may legitimately be accepted without changing the beat (revisits / counters)
const NON_ADVANCING = new Set(['station', 'project', 'enterHouse', 'exitHouse', 'perchReached'])

let s = M.initialState()
const seen = [s.beat]
console.log('Walking the story…')
for (const [t, arg] of path1) {
  // 1) before firing: every OTHER trigger that would change the beat must be rejected
  for (const other of M.TRIGGERS) {
    if (other === t) continue
    const args = other === 'station' ? M.MUSEUM_IDS : other === 'project' ? M.PROJECT_IDS : other === 'perchReached' ? [s.perch] : [undefined]
    for (const a of args) {
      const n = M.fire(s, other, a)
      if (n && n.beat !== s.beat) ok(false, `"${other}" advanced ${s.beat} → ${n.beat} early`)
      else checks++
    }
  }
  // 2) fire the expected trigger
  const n = M.fire(s, t, arg)
  ok(!!n, `"${t}${arg !== undefined ? ':' + arg : ''}" rejected in ${s.beat}`)
  if (!n) break
  if (n.beat !== s.beat) { seen.push(n.beat); console.log(`  ✓ ${s.beat.padEnd(13)} --${t}--> ${n.beat}`) }
  else if (!NON_ADVANCING.has(t)) ok(false, `"${t}" did not advance ${s.beat}`)
  s = n
}
ok(s.beat === 'c7_end', `ended in ${s.beat}, expected c7_end`)
ok(JSON.stringify(seen) === JSON.stringify(M.BEATS), 'beats visited out of order: ' + seen.join(' → '))

// specific gating rules
console.log('Gating rules…')
const at = (beat, extra = {}) => ({ ...M.initialState(), beat, ...extra })
ok(!M.gateState(at('c1_explore')).meadowGate, 'meadow gate must be closed in chapter 1')
ok(M.gateState(at('c2_follow')).meadowGate, 'meadow gate opens when following the parrot')
ok(!M.gateState(at('c2_follow')).houseDoor, 'house door closed before the puppy')
ok(!M.can(at('c3_museum'), 'openLetterbox'), 'letterbox inactive while exploring the house')
ok(!M.gateState(at('c3_leave')).letterbox, 'letterbox inactive until the postman delivered')
ok(M.gateState(at('c4_letterbox')).letterbox, 'letterbox active after delivery')
ok(!M.can(at('c4_letterbox'), 'boardBoat') && !M.gateState(at('c4_letter')).boat, 'boat inactive until the letter is read')
ok(M.gateState(at('c5_board')).boat, 'boat active after the letter')
ok(!M.gateState(at('c5_row')).workshopDoor, 'workshop door closed until the crossing is done')
ok(M.gateState(at('c6_workshop')).workshopDoor, 'workshop door opens after landing')
ok(!M.gateState(at('c6_projects', { projects: ['ai', 'lab'] })).trailGate, 'trail closed with 2 projects')
ok(!M.can(at('c6_projects', { projects: ['ai', 'lab'] }), 'enterTrail'), 'cannot enter trail with 2 projects')
ok(M.gateState(at('c6_projects', { projects: ['ai', 'lab', 'mobile'] })).trailGate, 'trail opens with 3 projects')
ok(!M.can(at('c7_climb'), 'sit'), 'bench inactive until summit reached')
ok(!M.can(at('c2_follow', { perch: 2 }), 'perchReached', 4), 'parrot perches must be reached in order')
ok(M.fire(at('c3_museum'), 'station', 'nope') === null, 'unknown station rejected')
// partial museum does not advance
let m = at('c3_museum'); for (const id of M.MUSEUM_IDS.slice(0, 5)) m = M.fire(m, 'station', id)
ok(m.beat === 'c3_museum', 'museum needs all six stations')
ok(M.fire(m, 'exitHouse').beat === 'c3_museum', 'leaving the house early does not skip chapter 4 setup')
// chapter select produces consistent states
for (let ch = 1; ch <= 7; ch++) {
  const c = M.stateForChapter(ch)
  ok(M.chapterOf(c.beat) === ch, `chapter select ${ch} lands in ${c.beat}`)
}

fs.unlinkSync(tmp)
console.log(`\n${checks} checks, ${failures} failures`)
process.exit(failures ? 1 : 0)
