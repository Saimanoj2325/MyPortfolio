// The story as a pure, strictly ordered state machine (no React, no three.js — unit-testable).
// A trigger is accepted ONLY in the beat that expects it; anything else is rejected, so no beat
// can fire early and no chapter can be skipped by walking somewhere.

export const BEATS = [
  'c1_intro', // cutscene: orbit, "Who am I?"
  'c1_explore', // free control in the meadow; "I can't remember anything…"
  'c2_arrive', // cutscene: the parrot flies in and speaks
  'c2_follow', // follow the parrot perch to perch
  'c3_puppy', // cutscene: the puppy runs out of the door, circles, runs in
  'c3_enter', // go inside
  'c3_museum', // explore the six stations of the house
  'c3_leave', // the puppy waits outside
  'c4_postman', // cutscene: the postman delivers
  'c4_letterbox', // open the letterbox
  'c4_letter', // the letter overlay is open
  'c5_board', // board the boat
  'c5_row', // row across
  'c6_workshop', // follow the puppy to the workshop
  'c6_projects', // discover projects (trail opens at 3)
  'c7_climb', // climb the lantern trail
  'c7_bench', // sit on the bench
  'c7_finale', // cutscene: pull back to dusk, final message
  'c7_end', // contact card
] as const
export type Beat = (typeof BEATS)[number]

export const PERCH_COUNT = 8
export const MUSEUM_IDS = ['photos', 'books', 'notebook', 'corner', 'telescope', 'computer'] as const
export const PROJECT_IDS = ['frontend', 'mobile', 'software', 'ai', 'lab'] as const
export const PROJECTS_TO_OPEN_TRAIL = 3

export type Trigger =
  | 'introDone' | 'wandered' | 'parrotIntroDone' | 'perchReached' | 'puppyIntroDone' | 'enterHouse' | 'station'
  | 'exitHouse' | 'postmanDone' | 'openLetterbox' | 'closeLetter' | 'boardBoat' | 'landed' | 'enterWorkshop'
  | 'project' | 'enterTrail' | 'reachSummit' | 'sit' | 'finaleDone'
export const TRIGGERS: Trigger[] = ['introDone', 'wandered', 'parrotIntroDone', 'perchReached', 'puppyIntroDone', 'enterHouse', 'station', 'exitHouse', 'postmanDone', 'openLetterbox', 'closeLetter', 'boardBoat', 'landed', 'enterWorkshop', 'project', 'enterTrail', 'reachSummit', 'sit', 'finaleDone']

export type StoryState = {
  beat: Beat
  perch: number // next perch the parrot waits at (c2_follow)
  stations: string[] // museum stations seen
  projects: string[] // workshop projects discovered
}

export const initialState = (): StoryState => ({ beat: 'c1_intro', perch: 0, stations: [], projects: [] })

export const beatIndex = (b: Beat) => BEATS.indexOf(b)
export const chapterOf = (b: Beat) => Number(b[1])

/** the first beat of each chapter (chapter select) */
export const CHAPTER_START: Record<number, Beat> = { 1: 'c1_intro', 2: 'c2_arrive', 3: 'c3_puppy', 4: 'c4_postman', 5: 'c5_board', 6: 'c6_workshop', 7: 'c7_climb' }

/** a consistent state for jumping straight to a chapter */
export function stateForChapter(ch: number): StoryState {
  const beat = CHAPTER_START[ch] ?? 'c1_intro'
  const i = beatIndex(beat)
  return {
    beat,
    perch: i > beatIndex('c2_follow') ? PERCH_COUNT - 1 : 0,
    stations: i > beatIndex('c3_museum') ? [...MUSEUM_IDS] : [],
    projects: i > beatIndex('c6_projects') ? PROJECT_IDS.slice(0, PROJECTS_TO_OPEN_TRAIL) : [],
  }
}

/** would this trigger be accepted right now? */
export function can(s: StoryState, t: Trigger, arg?: string | number): boolean {
  switch (t) {
    case 'introDone': return s.beat === 'c1_intro'
    case 'wandered': return s.beat === 'c1_explore'
    case 'parrotIntroDone': return s.beat === 'c2_arrive'
    case 'perchReached': return s.beat === 'c2_follow' && (arg === undefined || arg === s.perch)
    case 'puppyIntroDone': return s.beat === 'c3_puppy'
    case 'enterHouse': return s.beat === 'c3_enter' || s.beat === 'c3_museum' || s.beat === 'c3_leave'
    case 'station': return s.beat === 'c3_museum' || s.beat === 'c3_leave' // revisits allowed after done
    case 'exitHouse': return s.beat === 'c3_museum' || s.beat === 'c3_leave'
    case 'postmanDone': return s.beat === 'c4_postman'
    case 'openLetterbox': return s.beat === 'c4_letterbox'
    case 'closeLetter': return s.beat === 'c4_letter'
    case 'boardBoat': return s.beat === 'c5_board'
    case 'landed': return s.beat === 'c5_row'
    case 'enterWorkshop': return s.beat === 'c6_workshop'
    case 'project': return s.beat === 'c6_projects' || s.beat === 'c7_climb'
    case 'enterTrail': return s.beat === 'c6_projects' && s.projects.length >= PROJECTS_TO_OPEN_TRAIL
    case 'reachSummit': return s.beat === 'c7_climb'
    case 'sit': return s.beat === 'c7_bench'
    case 'finaleDone': return s.beat === 'c7_finale'
  }
}

/** apply a trigger; returns the new state, or null when it is not allowed now */
export function fire(s: StoryState, t: Trigger, arg?: string | number): StoryState | null {
  if (!can(s, t, arg)) return null
  const n: StoryState = { ...s, stations: [...s.stations], projects: [...s.projects] }
  const go = (b: Beat) => { n.beat = b; return n }
  switch (t) {
    case 'introDone': return go('c1_explore')
    case 'wandered': return go('c2_arrive')
    case 'parrotIntroDone': return go('c2_follow')
    case 'perchReached':
      n.perch = s.perch + 1
      if (n.perch >= PERCH_COUNT) { n.perch = PERCH_COUNT - 1; return go('c3_puppy') }
      return n
    case 'puppyIntroDone': return go('c3_enter')
    case 'enterHouse': return s.beat === 'c3_enter' ? go('c3_museum') : n
    case 'station': {
      const id = String(arg)
      if (!(MUSEUM_IDS as readonly string[]).includes(id)) return null
      if (!n.stations.includes(id)) n.stations.push(id)
      if (s.beat === 'c3_museum' && n.stations.length >= MUSEUM_IDS.length) return go('c3_leave')
      return n
    }
    case 'exitHouse': return s.beat === 'c3_leave' ? go('c4_postman') : n // leaving early is allowed, story waits
    case 'postmanDone': return go('c4_letterbox')
    case 'openLetterbox': return go('c4_letter')
    case 'closeLetter': return go('c5_board')
    case 'boardBoat': return go('c5_row')
    case 'landed': return go('c6_workshop')
    case 'enterWorkshop': return go('c6_projects')
    case 'project': {
      const id = String(arg)
      if (!(PROJECT_IDS as readonly string[]).includes(id)) return null
      if (!n.projects.includes(id)) n.projects.push(id)
      return n
    }
    case 'enterTrail': return go('c7_climb')
    case 'reachSummit': return go('c7_bench')
    case 'sit': return go('c7_finale')
    case 'finaleDone': return go('c7_end')
  }
}

/** world gates as a function of story state */
export function gateState(s: StoryState) {
  const i = beatIndex(s.beat)
  return {
    meadowGate: i >= beatIndex('c2_follow'),
    houseDoor: i >= beatIndex('c3_enter'),
    letterbox: s.beat === 'c4_letterbox',
    boat: s.beat === 'c5_board',
    workshopDoor: i >= beatIndex('c6_workshop'),
    trailGate: i >= beatIndex('c7_climb') || (s.beat === 'c6_projects' && s.projects.length >= PROJECTS_TO_OPEN_TRAIL),
    bench: s.beat === 'c7_bench',
  }
}
