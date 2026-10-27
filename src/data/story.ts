// ─────────────────────────────────────────────────────────────────────────────
// STORY TEXT — narration, chapter titles, objectives, dialogue, museum stations.
// All content matches authentic portfolio data from Kura Sai Manoj's resume.
// ─────────────────────────────────────────────────────────────────────────────

export const chapterCards = [
  { numeral: 'I', title: 'Who am I?', line: 'A quiet meadow. No name, no memory — only a question.' },
  { numeral: 'II', title: 'The Parrot', line: 'Someone seems to know the way.' },
  { numeral: 'III', title: 'Home', line: 'A door left open, and a small dog who remembers you.' },
  { numeral: 'IV', title: 'The Letter', line: 'Some memories arrive by post.' },
  { numeral: 'V', title: 'The Crossing', line: 'Beyond the water, the things I built.' },
  { numeral: 'VI', title: 'The Studio', line: 'Where code meets the real world — projects, leadership, and craft.' },
  { numeral: 'VII', title: 'The Summit', line: 'From up here, the whole story fits in one view.' },
]

export const objectives: Record<string, string> = {
  c1_explore: 'Look around the meadow',
  c2_follow: 'Follow the parrot',
  c3_enter: 'Follow the puppy inside the house',
  c3_museum: 'Explore your home',
  c3_leave: 'The puppy is waiting outside',
  c4_letterbox: 'Open the letterbox by the road',
  c4_letter: 'Read the letter',
  c5_board: 'Board the rowing boat at the jetty',
  c5_row: 'Row across the river  ·  W forward  ·  A / D steer',
  c6_workshop: 'Follow the puppy to the studio',
  c6_projects: 'Discover projects & experience',
  c7_climb: 'Climb the lantern trail to the summit',
  c7_bench: 'Sit on the bench beside the puppy',
}

export type Line = { who: 'player' | 'parrot' | 'puppy' | 'postman'; text: string; thought?: boolean }

export const lines = {
  wake: [{ who: 'player', text: 'Who am I?', thought: true }] as Line[],
  forgot: [{ who: 'player', text: 'I can’t remember anything…', thought: true }] as Line[],
  parrotIntro: [
    { who: 'parrot', text: 'You want to know who you are?' },
    { who: 'parrot', text: 'Come, follow me. I’ll show you the way.' },
  ] as Line[],
  parrotPerch: [
    'This way! Through the meadow!',
    'Through the gate into the village!',
    'Follow me down the lane!',
    'See the cottages waking up?',
    'Past the crossroads, this way!',
    'All the way to the river path!',
    'Wait… look down this garden lane!',
    'Here. You know this place.',
  ],
  puppyHello: [{ who: 'puppy', text: 'Woof! Woof!' }, { who: 'player', text: 'He… knows me?', thought: true }] as Line[],
  museumDone: [{ who: 'player', text: 'So this is me. Or part of me.', thought: true }, { who: 'puppy', text: 'Woof!' }] as Line[],
  postman: [{ who: 'postman', text: 'Post for you! Signed, sealed, delivered.' }] as Line[],
  letterAfter: [{ who: 'player', text: 'The rest must be across the river.', thought: true }] as Line[],
  river: [{ who: 'player', text: 'Maybe some answers lie beyond where I started.', thought: true }] as Line[],
  workshop: [{ who: 'player', text: 'The Studio… where ideas become software.', thought: true }] as Line[],
  trailOpen: [{ who: 'parrot', text: 'Enough looking back. Come up the hill!' }] as Line[],
  summit: [{ who: 'parrot', text: 'Sit. Look how far you came.' }] as Line[],
}

/** parrot hints when clicked or E pressed */
export const parrotHints: Record<number, string[]> = {
  1: ['Hello, stranger.'],
  2: ['Follow me! Squawk!', 'Don’t dawdle!'],
  3: ['Your home has answers. Look at everything.', 'Check the photographs.', 'That computer remembers what you built.'],
  4: ['The postman never misses. Check the letterbox!', 'Paper remembers what heads forget.'],
  5: ['Boats float better with you in them. Hop in!', 'Row, row, row across!'],
  6: ['Every station holds something you made.', 'Check the experience board and projects.', 'Discover three or more to unlock the summit trail.'],
  7: ['Up! Up! The view is worth it.', 'Sit with the pup. Breathe.'],
}

export const puppyLines = ['Woof!', 'Woof woof!', '♥', 'Arf!', '*happy wiggle*']

// ─── chapter III: the house as a personal museum ─────────────────────────────
export type MuseumStation = { id: string; label: string; verb: string; kicker: string; title: string; body: string[]; list?: { k: string; v: string }[] }
export const museum: MuseumStation[] = [
  { id: 'photos', label: 'Photo frames', verb: 'Look closer', kicker: 'About', title: 'Hello, I’m Sai Manoj.',
    body: [
      'AI/ML engineer at Chaitanya Bharathi Institute of Technology (CBIT), Hyderabad.',
      'State 111 Rank in TS ECET-2024 and State 330 Rank in TS Polycet-2021.',
      'I build agentic AI workflows, on-device machine learning, and dependable software that solves tangible problems.',
    ],
    list: [
      { k: 'Based in', v: 'Hyderabad, India' },
      { k: 'Education', v: 'B.E. AI & ML, CBIT (2024–2027)' },
      { k: 'Diploma', v: 'CSE, Govt. Polytechnic (2021–2024)' },
      { k: 'Status', v: 'Open to AI/ML & Software roles' },
    ] },
  { id: 'books', label: 'Bookshelf', verb: 'Browse', kicker: 'Deep Focus', title: 'What I Study & Architect',
    body: ['Core architectural and technical domains:'],
    list: [
      { k: 'Agentic AI', v: 'LangGraph, state graphs, tool orchestration, RAG' },
      { k: 'Edge & On-Device ML', v: 'TFLite, MobileFaceNet, YOLOv5, biometric verification' },
      { k: 'Full-Stack & Systems', v: 'FastAPI, React 18, Kotlin Android SDK, PostgreSQL, Firebase' },
      { k: 'Algorithms', v: '400+ problems solved on LeetCode & GeeksforGeeks' },
    ] },
  { id: 'notebook', label: 'Notebook', verb: 'Read', kicker: 'Toolkit', title: 'Engineering Stack',
    body: ['Languages, tools, and runtimes I build with:'],
    list: [
      { k: 'Languages', v: 'Python · Kotlin · Java · TypeScript · C++ · SQL' },
      { k: 'AI & Data', v: 'LangGraph · PyTorch · TFLite · OpenCV · FAISS' },
      { k: 'Web & Mobile', v: 'React · FastAPI · Android SDK · Node.js · Three.js' },
      { k: 'DevOps & Tools', v: 'Git · Linux · Docker · Firebase · Postman' },
    ] },
  { id: 'corner', label: 'Personal corner', verb: 'Sit a moment', kicker: 'Leadership', title: 'Community & Leadership',
    body: ['Where I lead, mentor, and build community:'],
    list: [
      { k: 'VMEDHA Club', v: 'Technical Head — co-led VIVE-LE-Tech (2,000+ registrations) & DSA Master' },
      { k: 'COSC Community', v: 'Joint Secretary — led 40 developers, Hacktoberfest (1,700+ attendees)' },
      { k: 'Mentorship', v: 'Guided student engineers in algorithms, data structures, and Git' },
    ] },
  { id: 'telescope', label: 'Window & telescope', verb: 'Look out', kicker: 'Ambition', title: 'Wanna reach heights in my life…',
    body: [
      'Through the brass lens, towering mountain summits rise sharply above the clouds.',
      'Wanna reach heights in my life.',
      'Engineering intelligent systems, architecting software that creates meaningful impact, and climbing new summits with every challenge.',
    ] },
  { id: 'computer', label: 'The computer', verb: 'Wake it up', kicker: 'Projects & Shell', title: 'The computer', body: [] },
]

// ─── chapter IV: the letter ──────────────────────────────────────────────────
export const letter = {
  salutation: 'Dear Sai Manoj,',
  opening: 'In case you ever forget — here is the road you have walked so far. The entrance ranks, the sleepless builds, the people who believe in you.',
  signoff: 'With pride, from home',
  sign: '— The Journey',
  milestonesTitle: 'Milestones & State Ranks',
}

// ─── chapter VII: finale ─────────────────────────────────────────────────────
export const finale = {
  message: ['Maybe knowing who I am isn’t about looking backward.', 'It’s about how far I can climb from here.'],
  cardTitle: 'Let’s build something together.',
  cardLine: 'Kura Sai Manoj · AI/ML Engineer · Hyderabad',
}
