// SKILLS: grouped, each with proficiency (rendered as a thin bar).
export type Skill = { name: string; level: number }
export const skillGroups: { group: string; note: string; items: Skill[] }[] = [
  { group: 'AI & ML', note: 'Agents, RAG & Edge AI', items: [
    { name: 'LangGraph & Multi-Agent', level: 90 }, { name: 'LLaMA 3 & Mistral', level: 86 }, { name: 'RAG & FAISS', level: 88 }, { name: 'MobileFaceNet & TFLite', level: 85 }, { name: 'YOLOv5 & OpenCV', level: 80 }, { name: 'scikit-learn', level: 82 },
  ] },
  { group: 'Languages & Frameworks', note: 'Full-stack & mobile', items: [
    { name: 'Python', level: 92 }, { name: 'FastAPI', level: 88 }, { name: 'React 18', level: 86 }, { name: 'Java & Android SDK', level: 84 }, { name: 'JavaScript & TypeScript', level: 82 }, { name: 'SQL', level: 80 }, { name: 'Pydantic', level: 85 },
  ] },
  { group: 'Tools & Systems', note: 'Production infrastructure', items: [
    { name: 'Git & GitHub Actions', level: 90 }, { name: 'Docker', level: 78 }, { name: 'Linux', level: 82 }, { name: 'REST & GraphQL APIs', level: 86 }, { name: 'Server-Sent Events (SSE)', level: 84 }, { name: 'Firebase & MySQL', level: 85 },
  ] },
  { group: 'Core Fundamentals', note: 'Computer science bedrock', items: [
    { name: 'Data Structures & Algorithms (400+ solved)', level: 92 }, { name: 'OOP & System Design', level: 88 }, { name: 'Operating Systems', level: 85 }, { name: 'DBMS', level: 84 }, { name: 'Computer Networks', level: 80 },
  ] },
]
export const allSkills: string[] = skillGroups.flatMap((g) => g.items.map((i) => i.name))
