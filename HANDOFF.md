# HANDOFF — "Who am I?" 3D story portfolio

Everything a developer needs to keep working on this project. For the player-facing overview see README.md.

## 1. What changed vs the original

The original (kept untouched in `../src`) was "an engineer's journey on a tiny planet": a spherical-gravity
world with eight zones, six mini-game trials (code-block puzzle, exam timer, hackathon sprint, interview quiz,
outage boss, team escort), XP/levels, a quest log, commit-crystal collectibles and a minimap.

The rework replaces all of that with a linear, cinematic **seven-chapter story** on one flat valley:

| Removed (original) | Added (rework) |
|---|---|
| Planet + spherical gravity (`lib/sphere.ts`, `Planet.tsx`, `Zones.tsx`) | One continuous valley, south → north (`world/layout.ts`, `three/Terrain.tsx`) |
| Trials / XP / quest log / crystals (`Challenges.tsx`, `ChallengeOverlay.tsx`, `Hud.tsx`) | A strict story state machine (`story/machine.ts`) + a Director that stages each beat (`story/Director.tsx`) |
| Scroll intro (`ui/Intro.tsx`) | Title screen over an aerial shot (`ui/TitleScreen.tsx`), chapter cards, cinematic letterbox + skip |
| Landmark sections | Diegetic content: house museum stations, a physical letter, workshop project stations, summit finale |
| — | Procedural characters: scarlet macaw (`Parrot.tsx`), golden-retriever pup (`Puppy.tsx`), postman on a bicycle (`Postman.tsx`) |
| — | Rowing boat crossing (`Boat.tsx`), workshop (`Workshop.tsx`), lantern trail + bench (`Summit.tsx`), village (`Village.tsx`) |
| — | Mood per chapter (morning → bright → misty river → late afternoon → dusk with stars) in `Environment.tsx` |
| — | Single-file build (`vite.single.config.ts`, `npm run build:single`) |
| — | Tests: `tools/story-test.mjs`, `tools/story-e2e.mjs`, screenshots `tools/shots.mjs`, `tools/single-test.mjs` |

Kept and reused: the engineer character (`engineerLook.ts` + `public/models/engineer.glb`), the CC0 kit and
furniture GLBs, the house interior and laptop OS (`Home.tsx`, `ui/LaptopOS.tsx`), `SectionContent.tsx`, and
the whole recruiter tour (`src/tour/`, `#tour`).

### Last pass (this handoff)
- Letter overlay: panels now have a fixed readable size (no vh-based font scaling, so text stays crisp); on
  short screens (<~800 px tall) the overlay scrolls instead of clipping, and "Fold it away" sticks to the bottom.
- House interior: camera lowered from a near top-down view to a ~3/4 view (`roomCam.corner.y` 2.75 → 2.05);
  near the door wall it slides sideways and looks into the room so the player stays in frame.
- Summit parrot perch moved onto a real bark fork of the tree (checked by raycast, `tools/perchcheck.mjs`).
- Parrot: slimmer, longer body; bigger hooked beak; the bare white face patch now hugs the skull (it read as
  two bolt-on discs) with the eye set inside it; folded wings sit on the body side along its lean.
- Puppy: shorter, broader muzzle; bigger glossy eyes set forward of the fur shells; tail carried out behind
  (it hung straight down) with longer cream feathering.
- Recruiter tour uses the guarded `safeStorage` (it called `localStorage` directly → crashed in a sandboxed iframe).
- New: `vite.single.config.ts`, `build:single` script, `tools/single-test.mjs`, `tools/perchcheck.mjs`, extra
  shots (`homeEnter`, `perch`, `parrotSide`) in `tools/shots.mjs`.

## 2. Architecture / code map

```
src/
  main.tsx            mounts <App>; exposes window.__whoami {runtime, useStore, actors, machine, layout, interactables} for tests
  App.tsx             phase switch: loading/title/play → 3D + overlays;  tour → lazy-loaded recruiter tour
  store.ts            zustand store: phase, story state, dialogue, cutscene, overlays (museum/letter/project/finale),
                      trigger() (→ machine.fire), jumpToChapter(); `runtime` = per-frame mutable input; safeStorage
  story/machine.ts    PURE state machine: BEATS (19, c1_intro … c7_end), Trigger, can()/fire(), stateForChapter(),
                      gateState() (which doors/gates/boat/bench are usable in this beat)
  story/Director.tsx  on each beat: stage() puts every actor where that beat expects them (also used by chapter
                      jumps), then runs the beat's async script (camera splines, dialogue, flyTo/puppyGo…).
                      Scripts are cancellable; cutscenes skippable (skip = jump to the beat's end state + same trigger).
                      Per-frame proximity triggers (perches, river landing, trail, summit).
  world/layout.ts     the map: positions of everything (SPAWN, HOUSE, LETTERBOX, JETTY_*, WORKSHOP, TRAIL, BENCH,
                      SUMMIT_TREE, PERCHES…), heightAt(), colliders (blockedAt), live gates
  lib/actors.ts       shared mutable per-frame state of player/parrot/puppy/postman/boat + camState + debugShot()
  lib/interact.ts     interactable registry; three/Interactions.tsx picks the nearest enabled one (E / tap)
  lib/room.ts         house interior coordinates (lives at ROOM_ORIGIN, off the valley), furniture positions
  three/
    Experience.tsx    <Canvas>: lighting, sky, terrain, village, house, characters, boat, workshop, summit,
                      Director, camera, effects; adaptive DPR + PerformanceMonitor "lite" mode
    CameraRig.tsx     cutscene splines · third-person follow (drag to orbit, terrain-safe, workshop clamp) ·
                      boat camera · house cameras (3/4 corner view, laptop dolly)
    Player.tsx        controller outdoors + in the room, blended Idle/Walk/Jog, procedural head look, sit/pet/bench modes
    Parrot.tsx        macaw: procedural mesh + flights (spline, flap/glide/flare), perched idles, head tracking, E/click
    Puppy.tsx         pup: procedural mesh + fur shells, companion AI (follow/lead/sit/happy/boat/bench), spring ears, wag
    Postman.tsx       postman + bicycle (spinning wheels, pedalling), letter toss
    Boat.tsx          jetties, rowing boat (W row, A/D steer, auto-glide), oars
    Village.tsx       house exterior, cottages, hedge + gate, lamps, fences, letterbox, meadow tree
    Home.tsx          house door + interior museum (6 stations), roomCam
    Workshop.tsx      the building + 5 project stations
    Summit.tsx        lantern trail steps + lanterns, trail gate with veil, stone wall, bench, summit tree
    Terrain.tsx       ground, river, instanced grass/flowers/trees, pollen
    Environment.tsx   per-chapter light/sky/fog moods, dusk stars
    Effects.tsx       postprocessing (skipped in lite mode)
    kit.tsx / materials.ts / proceduralTex.ts / textTex.ts   kit GLB pieces, palette + toon materials, canvas textures
  ui/
    StoryUI.tsx       chapter cards, objective + counters, interact prompt, speech/thought bubbles anchored to actors,
                      letterbox + Skip, museum/project panels, pause menu + chapter select, finale message + contact card
    LetterOverlay.tsx chapter IV letter (envelope → seal crack → three-panel unfold → fold away)
    LaptopOS.tsx      the laptop desktop (project windows, terminal, résumé, contact)
    TitleScreen.tsx, Loader.tsx, TouchControls.tsx, useInput.ts, sound.ts (WebAudio-synthesised sfx, no files)
    SectionContent.tsx  shared section renderers (in-game panels + recruiter tour)
  tour/               recruiter tour (Tour.tsx, Guide.tsx, Device.tsx, guideStore.ts, tour.css)
  data/               ALL content (see §3)
```

### Story flow and gating
`trigger(t, arg)` in the store calls `machine.fire()`; it returns `null` (rejected) unless the current beat
expects that trigger, so nothing advances early. World objects ask `gateState(story)` whether they are usable
(e.g. the house door only opens from `c3_enter`, the boat only in `c5_board`, the trail gate once 3 projects are
found). Counters: 6 parrot perches, 6 museum stations, 3 of 5 projects. Chapter jumps (`#ch=N`, pause menu)
use `stateForChapter(n)` + `Director.stage()` so every actor is in a consistent place.

To add a beat: add it to `BEATS`, add/extend a `Trigger`, handle it in `can()` and `fire()`, stage it in
`Director.stage()`, give it a script in the Director's beat switch, an objective in `data/story.ts`, then run
`node tools/story-test.mjs` (it walks every beat and checks no other trigger can fire).

## 3. Editing content (`src/data/`)

| File | Drives |
|---|---|
| `story.ts` | chapter cards, objectives, all dialogue (`lines`), parrot hints per chapter, puppy lines, the six house stations (`museum`), the letter's salutation/opening/sign-off, the finale message + card text |
| `projects.ts` | the projects: `station` (`frontend`/`mobile`/`software`/`ai`/`lab`) places it in the workshop; also feeds the laptop OS and the tour (`featured`, `device`, `gimmick`, `palette`, `narration`) |
| `profile.ts` | name, first name (used in the letter), roles, bio, location, `photo`, `resume` |
| `education.ts` | letter panel 2 (timeline) and the laptop |
| `achievements.ts` | letter panel 3 (milestones); `certifications` for the tour |
| `contact.ts` | email + socials (finale card, tour, laptop) — GitHub/LinkedIn are still placeholders |
| others | `skills`, `experience`, `opensource`, `leadership`, `testimonials`, `writing`, `tour` (guide lines), `chapters` (tour section titles), `intro` (unused since the scroll intro was removed) |

Most entries are marked `TODO` / placeholder and need the owner's real details. The letter's panels are a
fixed height: keep about 3 education entries and 3 milestones with short titles, or the third panel overflows.

**Real project images**: put them in `public/projects/` and set `image: 'projects/name.jpg'` on the project
(rendered by `ProjectCover` in `SectionContent.tsx`; falls back to a generated cover). For the single-file
build, images under `public/` are not inlined automatically — either import them in `projects.ts`
(`import shot from '../assets/shot.jpg'` → Vite inlines/copies it) or extend the `inlinePublicAssets` plugin.
**Résumé**: replace `public/resume.pdf` (inlined as a data URL in the single-file build).
**Photo**: `public/photo.jpg` and `photo: 'photo.jpg'` in `profile.ts`.

## 4. Run, build, deploy

```bash
npm i
npm run dev           # Vite dev server :5173
npm run build         # tsc -b && vite build → dist/  (models copied to dist/models)
npm run preview       # serves dist/ on :4173 (used by the test scripts)
npm run build:single  # tsc -b && vite build --config vite.single.config.ts → dist-single/index.html
```

`vite.single.config.ts`: `vite-plugin-singlefile` inlines all JS/CSS (fonts become data URLs); a small
`inline-public-assets` plugin rewrites `${import.meta.env.BASE_URL}models/*.glb` to base64 `data:` URLs and the
résumé link to a PDF data URL; `publicDir: false`. Meshopt decoding uses drei's inline WASM decoder (no
worker, no fetch). The models use no Draco, so drei's Draco loader (which would fetch from gstatic) is never
invoked. Output ≈ 9.5 MB (≈ 4.9 MB gzipped). It runs inside `<iframe sandbox="allow-scripts">` (opaque origin):
storage is wrapped in `safeStorage` (try/catch). External links (GitHub, mailto) still need `allow-popups` /
`allow-top-navigation-by-user-activation` on the iframe to open.

**Vercel**: import the folder, framework "Vite"; `vercel.json` already sets `npm run build` → `dist` and
immutable cache headers for `/assets` and `/models`. Any static host works (`base: './'`).

## 5. Tests and the headless Chromium

| Command | What |
|---|---|
| `node tools/story-test.mjs` | pure machine test, no browser: walks 1 → 7, checks each trigger fires only in its beat (853 checks) |
| `node tools/story-e2e.mjs <url> [from] [to]` | drives the REAL game in Chromium through chapters, via the game's own interactables/scripts; split by chapter range for speed |
| `node tools/shots.mjs <url> <outDir> [names…]` | screenshots: `title ch1 ch1b ch2 ch3 museum home laptop puppy parrot parrotSide homeEnter perch ch4 letter ch5 ch6 project ch7 finale`; `W=`/`H=` env for viewport |
| `node tools/single-test.mjs [out.png]` | loads `dist-single/index.html` in an `allow-scripts`-only iframe; reports console errors, any non-inline request, canvas size; screenshot |
| `node tools/perchcheck.mjs <piece> <scale> <yOff> x y z` | raycasts a kit tree to verify a perch point is on bark |
| `node tools/smoke.mjs <url>` | load + console errors |
| `node tools/gltfcheck.mjs <glb>` | sizes / meshes / animations of a model |

In this ARM sandbox Playwright's own browser is unavailable: run `sh tools/setup-chromium.sh` once (downloads
Debian's `chromium-headless-shell` + libs into `/tmp/chr`, and works around a SwiftShader SIGILL on Neoverse-V2
by faking `/proc/cpuinfo` in a user namespace), then prefix commands with `CHROME=/tmp/chr/chrome-ns.sh`.
Software rendering is slow: each screenshot scene takes ~1.5–2 min, so run them in the background and never run
two browser jobs at once. On a normal machine: `npx playwright install chromium` and drop `CHROME=`.

### Single-file build note
`build:single` ends with `tools/classic-single.mjs`, which converts the inlined ES-module script into a classic IIFE `<script>` at the end of `<body>` (some preview hosts reject `type=module`). Verified in a `sandbox="allow-scripts"` iframe: no errors, no network requests.

## 6. Known issues and next steps

- **Performance is unmeasured on a real GPU.** Everything was verified with SwiftShader (CPU). Profile on a
  mid-range laptop and a phone: draw calls (kit trees, grass instancing), shadow map size, fur shells on the
  pup (3 extra passes per mesh), postprocessing. `PerformanceMonitor` drops to a lite mode, but its thresholds
  are untuned.
- Bundle: `r3f` chunk ≈ 1.4 MB (420 KB gz) and the models ≈ 5.5 MB. Consider lazy-loading the workshop/summit
  and dropping unused drei imports.
- Placeholder content everywhere in `src/data` (bio, projects, links, achievements, testimonials).
- The parrot and pup are procedural; they read well at gameplay distance but are stylised in extreme
  close-ups. A sculpted/rigged GLB would be the real upgrade.
- The summit tree sways in the vertex shader; the parrot perch is static, so at close range the branch moves
  slightly under the bird.
- The single-file build is 9.5 MB; some hosts/emails cap attachments. External links in a sandboxed iframe
  need popup permissions.
- `src/data/intro.ts` and `ui/Panel.tsx` are unused leftovers from the original.
- Audio is synthesised; there is no music.
