# Who am I? — Saimanoj Kura, an interactive story

A walkable 3D portfolio told as a short story in seven chapters. A man wakes in a meadow with no memory.
A scarlet macaw shows him the way, a golden-retriever pup remembers him, a postman brings a letter, a rowing
boat carries him across the river to a workshop full of things he built, and a lantern trail leads to a bench
on the summit at dusk, where the story ends with a message and a contact card.

For visitors in a hurry there is a **recruiter tour** (`#tour`): a one-page, scroll-driven version of the same
content with a small narrating guide.

Stack: Vite 8 · React 19 · TypeScript · @react-three/fiber 9 · drei · @react-three/postprocessing · zustand · GSAP · Lenis.
No physics engine: a flat-terrain controller with circle/box colliders, plus a separate room controller indoors.

## The story

| Ch. | Title | What happens | Portfolio content |
|---|---|---|---|
| I | Who am I? | Orbit cutscene, "Who am I?"; wander the meadow | — |
| II | The Parrot | The macaw lands on the big tree; follow it across 6 perches (tree → gate → lamp → roof → fence → house roof) | — |
| III | Home | The pup runs out of the house and back in. Inside, six stations: photos, bookshelf, notebook, personal corner, window & telescope, computer (a small desktop OS with project windows + terminal) | About, what I learn, skills, beyond code, ambitions, projects |
| IV | The Letter | The postman cycles in and posts a letter; open the letterbox; break the wax seal and read it | Education, milestones |
| V | The Crossing | Row the boat across the river (W forward, A/D steer) with the pup and the parrot aboard | — |
| VI | The Workshop | Five stations (screens, phone stand, software bench, AI rig, lab). Find 3 to open the trail | Projects |
| VII | The Summit | Climb the lantern trail, sit on the bench beside the pup; the camera pulls back to dusk | Final message + contact card |

Every chapter is gated by a strict state machine (`src/story/machine.ts`): a step only advances in the beat
that expects it, so nothing can be skipped by walking somewhere. Cutscenes can be skipped with **Esc**; the
pause menu has a chapter select.

**Controls** — WASD / arrows move · Shift run · E interact · Space / Enter advance dialogue · drag to look · Esc skip / pause.
Touch: joystick + E button. Deep links: `#ch=1` … `#ch=7` start at a chapter; `#tour` opens the recruiter tour.

## Run

```bash
npm i
npm run dev            # http://localhost:5173
npm run build          # type-check + production build → dist/
npm run preview        # serve dist/ on :4173
npm run build:single   # one self-contained file → dist-single/index.html (≈9.5 MB)
```

`dist-single/index.html` has everything inlined (JS, CSS, fonts, the three GLB models as base64 data URLs,
the résumé). It runs from `file://`, and inside `<iframe sandbox="allow-scripts">` (no same-origin, so no
localStorage — the game falls back gracefully).

## Deploy

- **Vercel** — import the folder (framework "Vite"); `vercel.json` sets build `npm run build`, output `dist`,
  and long cache headers for `/models` and `/assets`.
- **Any static host** (Netlify, GitHub Pages, S3) — upload `dist/`. `base: './'` makes sub-paths work.
- **Single file** — host or email `dist-single/index.html` anywhere; nothing else is needed.

## Edit the content

All words live in `src/data/` (placeholders are marked `TODO`):

| File | What |
|---|---|
| `story.ts` | chapter cards, objectives, every line of dialogue, parrot hints, the six house stations, the letter, the finale message and card |
| `profile.ts` | name, roles, bio, location, photo, résumé path |
| `projects.ts` | the workshop projects (one per station), also used by the laptop OS and the tour |
| `education.ts`, `achievements.ts` | the letter's two inner panels (keep ~3 entries each so the panels fit) |
| `contact.ts` | email + social links (finale card, tour, laptop) |
| `skills.ts`, `experience.ts`, `opensource.ts`, `leadership.ts`, `testimonials.ts`, `writing.ts`, `tour.ts`, `chapters.ts` | recruiter tour sections and guide lines |

Real project images: put files in `public/projects/` and set `image: 'projects/my-shot.jpg'` on a project.
Résumé: replace `public/resume.pdf`. Photo: `public/photo.jpg` and `photo: 'photo.jpg'` in `profile.ts`.
See **HANDOFF.md** for the code map and details.

## Tests

```bash
node tools/story-test.mjs                         # pure state-machine test (853 checks, no browser)
sh tools/setup-chromium.sh                        # one-off: headless Chromium for ARM sandboxes → /tmp/chr
npm run preview &                                 # then, against the preview server:
CHROME=/tmp/chr/chrome-ns.sh node tools/story-e2e.mjs http://localhost:4173/ 1 7
CHROME=/tmp/chr/chrome-ns.sh node tools/shots.mjs http://localhost:4173/ shots [title ch1 … finale]
npm run build:single && CHROME=/tmp/chr/chrome-ns.sh node tools/single-test.mjs shots/single.png
```

On a normal machine with Playwright's Chromium (`npx playwright install chromium`), drop the `CHROME=` prefix.

## Assets

All 3D models are CC0 (Quaternius, Kenney) — see `CREDITS.md`. Animals, the postman's bicycle, the boat,
the workshop and the summit are procedural (code + canvas textures, no image files).
