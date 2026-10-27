// PROJECTS — featured in the Studio (Chapter VI), LaptopOS, and Recruiter Tour.
export type Station = 'frontend' | 'mobile' | 'software' | 'ai' | 'lab'
export type Project = {
  slug: string
  title: string
  year: string
  blurb: string
  role: string
  /** what I personally did */
  contribution: string
  tags: string[]
  status: string
  demo: string
  source: string
  station: Station
  featured: boolean
  device: 'phone' | 'laptop'
  gimmick: 'scratch' | 'slider' | 'terminal' | 'tap'
  palette: [string, string]
  narration: string[]
  image?: string
}

export const projects: Project[] = [
  {
    slug: 'vmedha-cbit',
    title: 'VMedha CBIT',
    year: '2025 — 26',
    status: 'Live',
    station: 'frontend',
    featured: true,
    device: 'laptop',
    gimmick: 'tap',
    blurb: 'Official web platform for VMedha, the premier technical club at CBIT Hyderabad. Built for campus innovation, tech fests, and community engineering.',
    role: 'Lead Developer & Web Team',
    contribution: 'Architected the official web platform, responsive event portals, hackathon dashboards, and community infrastructure for 2,000+ campus participants.',
    tags: ['React', 'TypeScript', 'Tailwind', 'Vite', 'Web Architecture'],
    demo: 'https://vmedha-cbit.org',
    source: 'https://vmedha-cbit.org',
    palette: ['#e05638', '#1a2238'],
    narration: ['Campus engineering platform at CBIT.', 'Explore the live platform for our community.'],
  },
  {
    slug: 'geoattend',
    title: 'GeoAttend',
    year: '2025 — 26',
    status: 'Production-Ready',
    station: 'mobile',
    featured: true,
    device: 'phone',
    gimmick: 'tap',
    blurb: 'Proof-of-Physical-Presence attendance system with real-time on-device face verification (<80ms TFLite) and physics-based anti-spoofing heuristics.',
    role: 'Android & On-Device ML Developer',
    contribution: 'Implemented on-device TFLite face biometrics, mock-location defenses (velocity sanity, altitude noise, accuracy checks), and geofencing with <2% daily battery drain.',
    tags: ['Android', 'Kotlin', 'TFLite', 'Face Verification', 'Geofencing', 'Edge AI'],
    demo: 'https://github.com/Saimanoj2325/GeoAttend',
    source: 'https://github.com/Saimanoj2325/GeoAttend',
    palette: ['#1d6f42', '#dcf1e3'],
    narration: ['Proof-of-Physical-Presence attendance.', 'Tap the phone to run face & geofence checks.'],
  },
  {
    slug: 'ayursutra',
    title: 'AyurSutra',
    year: '2025 — 26',
    status: 'Completed SaaS',
    station: 'software',
    featured: true,
    device: 'laptop',
    gimmick: 'tap',
    blurb: 'Modern Ayurvedic & Panchakarma clinic management platform. Full-stack SaaS with practitioner and patient portals, therapy scheduling, and AyurBot AI assistant.',
    role: 'Full-Stack & AI Developer',
    contribution: 'Built full-stack SaaS using React 18, FastAPI, Firebase Firestore, and custom RAG AI assistant (AyurBot) for treatment guidance and adherence tracking.',
    tags: ['React 18', 'FastAPI', 'Python', 'Firebase', 'RAG AI', 'Healthcare SaaS'],
    demo: 'https://github.com/Saimanoj2325/AyurSutra',
    source: 'https://github.com/Saimanoj2325/AyurSutra',
    palette: ['#0f766e', '#ccfbf1'],
    narration: ['Digitalizing traditional healthcare workflows.', 'Explore clinical operations and patient portals.'],
  },
  {
    slug: 'resumeverify',
    title: 'ResumeVerify AI',
    year: '2025 — 26',
    status: 'Active Development',
    station: 'ai',
    featured: true,
    device: 'laptop',
    gimmick: 'terminal',
    blurb: 'Evidence-aware technical resume verification engine using multi-agent state graphs, Groq LLM, FAISS vector search, and GitHub code AST inspection.',
    role: 'AI Agent & System Architect',
    contribution: 'Architected LangGraph state graph orchestrating resume parsing (PyMuPDF), technical claim extraction, code AST audit, and streaming SSE recruiter reports.',
    tags: ['LangGraph', 'FastAPI', 'Groq API', 'FAISS', 'Python AST', 'React', 'SSE'],
    demo: 'https://github.com/Saimanoj2325/ResumeVerifyAI',
    source: 'https://github.com/Saimanoj2325/ResumeVerifyAI',
    palette: ['#4f46e5', '#e0e7ff'],
    narration: ['Grounding technical resumes against code evidence.', 'Audit candidate claims in the terminal.'],
  },
  {
    slug: 'revenueguard',
    title: 'RevenueGuard',
    year: '2025',
    status: 'Completed',
    station: 'lab',
    featured: true,
    device: 'phone',
    gimmick: 'tap',
    blurb: 'Intelligent field cash collection and revenue leakage prevention system: real-time reconciliation, fraud anomaly alerts, and offline-first encrypted ledgers.',
    role: 'Lead Engineer',
    contribution: 'Engineered offline-first field agent collection flows, tamper-proof audit trails, automated ledger reconciliation, and revenue leakage detection alerts.',
    tags: ['Android', 'Kotlin', 'Revenue Protection', 'Security', 'Offline-First', 'SQLite'],
    demo: 'https://github.com/Saimanoj2325/RevenueGuard',
    source: 'https://github.com/Saimanoj2325/RevenueGuard',
    palette: ['#b45309', '#fef3c7'],
    narration: ['Protecting revenue integrity in the field.', 'Inspect real-time transaction reconciliation.'],
  },
  {
    slug: 'who-am-i',
    title: 'Who Am I? — 3D Portfolio',
    year: '2026',
    status: 'You’re in it',
    station: 'frontend',
    featured: true,
    device: 'laptop',
    gimmick: 'slider',
    blurb: 'A walkable, narrative-driven 3D portfolio: a lost engineer, an observant parrot, a companion puppy, and mountain summits.',
    role: 'Solo · Design + Engineering',
    contribution: 'Created the story world, character controllers, cinematic camera choreography, physics, and interactive UI in React Three Fiber.',
    tags: ['React', 'Three.js', 'R3F', 'GSAP', 'TypeScript'],
    demo: '#',
    source: 'https://github.com/Saimanoj2325',
    palette: ['#c98a4b', '#2f3b4f'],
    narration: ['You are exploring this world right now.', 'Drag the divider: blockout and final.'],
  },
]
