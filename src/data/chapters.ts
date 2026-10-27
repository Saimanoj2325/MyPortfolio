// THE STORY: a generic engineer's journey, told as eight zones on a tiny planet.
// (Metaphorical, not autobiographical: the portfolio content is Sai's; the story is everyone's.)
// lat/lon place the zone on the sphere; `sections` are the portfolio panels found at its landmark.
export type SectionId =
  | 'about' | 'education' | 'skills' | 'projects' | 'experience' | 'opensource'
  | 'achievements' | 'leadership' | 'testimonials' | 'writing' | 'resume' | 'contact'

export type ChallengeId = 'boot' | 'bug' | 'exam' | 'hackathon' | 'interview' | 'outage' | 'team'

export type ZoneId = 'meadow' | 'ruins' | 'citadel' | 'forge' | 'spire' | 'caverns' | 'harbor' | 'horizon'

export type Chapter = {
  id: ZoneId
  numeral: string
  title: string // story chapter
  place: string // zone name in the world
  narration: string // one line on the title card
  lat: number
  lon: number
  radius: number // metres, the zone's walkable heart
  sections: SectionId[]
  landmark: string // what you interact with for the sections
  challenge?: { id: ChallengeId; name: string; brief: string }
  /** time of day while you're here: 0 = dawn … 1 = night */
  hour: number
}

export const chapters: Chapter[] = [
  { id: 'meadow', numeral: 'I', title: 'Curiosity', place: 'The Meadow Camp', hour: 0.05,
    narration: 'It starts with a question, and a machine that hums back.',
    lat: 8, lon: 0, radius: 10, sections: ['about'], landmark: 'The old terminal',
    challenge: { id: 'boot', name: 'First Boot', brief: 'Wake the old terminal at the camp.' } },
  { id: 'ruins', numeral: 'II', title: 'School', place: 'The Ruins of Fundamentals', hour: 0.18,
    narration: 'Old stones, older rules. Learn them, then learn to break them.',
    lat: 34, lon: 52, radius: 10, sections: ['education'], landmark: 'The lectern',
    challenge: { id: 'bug', name: 'The First Bug', brief: 'One of the rune stones is glitching. Find it and fix its code.' } },
  { id: 'citadel', numeral: 'III', title: 'University', place: 'The Observatory Citadel', hour: 0.32,
    narration: 'Long nights, longer proofs. The sky is full of algorithms.',
    lat: 46, lon: 122, radius: 10, sections: ['skills'], landmark: 'The telescope',
    challenge: { id: 'exam', name: 'Exam Night', brief: 'Collect your scattered notes before the lights go out.' } },
  { id: 'forge', numeral: 'IV', title: 'First Projects', place: 'The Hackathon Forge', hour: 0.46,
    narration: 'Thirty-six hours, cold coffee, one idea worth shipping.',
    lat: 12, lon: 172, radius: 10, sections: ['projects'], landmark: 'The demo stage',
    challenge: { id: 'hackathon', name: 'Hackathon Sprint', brief: 'Sixty seconds. Gather a laptop, coffee and three ideas, and deliver them to the stage.' } },
  { id: 'spire', numeral: 'V', title: 'First Job', place: 'The Glass Spire', hour: 0.58,
    narration: 'A badge, a desk, a team that expects you to deliver.',
    lat: -20, lon: 218, radius: 10, sections: ['experience'], landmark: 'The guild ledger',
    challenge: { id: 'interview', name: 'The Interview', brief: 'Three questions in the glass pavilion. Think fast.' } },
  { id: 'caverns', numeral: 'VI', title: 'Shipping & Open Source', place: 'The Server Caverns', hour: 0.72,
    narration: 'Code meets the real world. Sometimes the real world wins, for a while.',
    lat: -46, lon: 272, radius: 10, sections: ['opensource', 'achievements'], landmark: 'The commit monolith',
    challenge: { id: 'outage', name: 'Production Outage', brief: 'SEV-1. Red alerts are spreading. Flip every breaker before time runs out.' } },
  { id: 'harbor', numeral: 'VII', title: 'Leadership & Community', place: 'The Harbor Camp', hour: 0.84,
    narration: 'You go faster alone. You go further with a crew.',
    lat: -12, lon: 322, radius: 10, sections: ['leadership', 'testimonials'], landmark: 'The campfire',
    challenge: { id: 'team', name: 'Build the Team', brief: 'Three engineers are wandering the harbor. Bring them to the campfire.' } },
  { id: 'horizon', numeral: 'VIII', title: 'The Horizon', place: 'The Lighthouse Cliff', hour: 0.97,
    narration: 'Every summit is a lookout for the next one.',
    lat: -58, lon: 18, radius: 10, sections: ['writing', 'resume', 'contact'], landmark: 'The lighthouse' },
]

export const sectionTitles: Record<SectionId, { kicker: string; title: string }> = {
  about: { kicker: 'About', title: 'Hello, I’m Sai.' },
  education: { kicker: 'Education', title: 'Where I learned the rules' },
  skills: { kicker: 'Skills', title: 'The toolkit' },
  projects: { kicker: 'Projects', title: 'Things I’ve built' },
  experience: { kicker: 'Experience', title: 'Where I’ve worked' },
  opensource: { kicker: 'Open source', title: 'In public' },
  achievements: { kicker: 'Achievements', title: 'State ranks & milestones' },
  leadership: { kicker: 'Leadership', title: 'Crew & community' },
  testimonials: { kicker: 'Testimonials', title: 'Kind words' },
  writing: { kicker: 'Writing', title: 'Notes from the road' },
  resume: { kicker: 'Résumé', title: 'The one-page version' },
  contact: { kicker: 'Contact', title: 'Got a project?' },
}

/** XP & levels: understated progression for the game HUD */
export const XP = { section: 20, crystal: 15, challenge: 100 }
export const levels = [
  { at: 0, title: 'Tinkerer' }, { at: 60, title: 'Apprentice' }, { at: 190, title: 'Scholar' }, { at: 330, title: 'Hacker' },
  { at: 480, title: 'Engineer' }, { at: 640, title: 'Shipper' }, { at: 810, title: 'Lead' }, { at: 990, title: 'Architect' },
]
export function levelFor(xp: number) {
  let i = 0
  while (i < levels.length - 1 && xp >= levels[i + 1].at) i++
  const cur = levels[i], next = levels[i + 1]
  return { level: i + 1, title: cur.title, progress: next ? (xp - cur.at) / (next.at - cur.at) : 1, nextAt: next?.at ?? cur.at }
}
