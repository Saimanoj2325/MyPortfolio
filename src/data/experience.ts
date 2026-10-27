// EXPERIENCE timeline (newest first).
export type Role = { role: string; org: string; period: string; place: string; points: string[]; tags: string[] }
export const experience: Role[] = [
  {
    role: 'Software Development Intern',
    org: 'Crimson Innovative Technologies',
    period: 'Jun 2023 — Nov 2023',
    place: 'Hyderabad, India',
    points: [
      'Shipped 2 production apps with Firebase Realtime Database and MySQL, architecting modular OOP codebases.',
      'Sped up screen load times by 20% by indexing MySQL queries and implementing asynchronous caching.',
      'Engineered on-device YOLOv5 object detection pipeline with transfer learning and validated inference accuracy.',
    ],
    tags: ['Java', 'Android SDK', 'Firebase', 'MySQL', 'YOLOv5'],
  },
  {
    role: 'Technical Head',
    org: 'VMEDHA Club (CBIT)',
    period: 'Sep 2024 — Present',
    place: 'Hyderabad, India',
    points: [
      'Co-organized VIVE-LE-Tech fest, scaling registrations to 2,000+ participants.',
      'Built custom algorithmic challenge platform and hosted 200+ students for "DSA Master" contest.',
      'Engineered official web application (vmedha-cbit.org) for student initiatives.',
    ],
    tags: ['Web Engineering', 'System Design', 'Leadership', 'Competitive Programming'],
  },
  {
    role: 'Joint Secretary',
    org: 'CBIT Open Source Community (COSC)',
    period: 'Aug 2024 — Present',
    place: 'Hyderabad, India',
    points: [
      'Directed 40 developers running recurring open-source drives across student software projects.',
      'Drove 1,700+ participant registrations for Hacktoberfest as core organizer and guided 50+ first-time PRs.',
    ],
    tags: ['Open Source', 'Community Leadership', 'Mentorship', 'Git'],
  },
]
