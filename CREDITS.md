# Credits & licences

All 3D assets are CC0 (public domain). Credit is not required but is given gladly.

| File | Source | Author | Licence |
|---|---|---|---|
| `public/models/engineer.glb` | **Universal Base Characters [Standard]** — `Superhero_Male_FullBody` + `Hair_SimpleParted` — https://quaternius.itch.io/universal-base-characters | Quaternius (quaternius.com) | CC0 1.0 |
| `public/models/engineer.glb` (animations) | **Universal Animation Library [Standard]** — `UAL1_Standard.glb` (Idle, Walk, Jog, Sprint, Jump start/loop/land, Dance, Interact, Talking, Sitting, Hit, Roll, Pick up, Fixing, Crouch, Death, Spell) — https://quaternius.itch.io/universal-animation-library | Quaternius | CC0 1.0 |
| `public/models/kit.glb` (nature) | **Stylized Nature MegaKit [Standard]** — trees, pines, twisted/dead trees, rocks, bushes, grass, flowers, ferns, mushrooms, pebbles — https://quaternius.itch.io/stylized-nature-megakit | Quaternius | CC0 1.0 |
| `public/models/kit.glb` (props) | **Fantasy Props MegaKit [Standard]** — lanterns, books, bookcase, scrolls, workbench, anvil, crates, barrels, benches, tables, chairs… — https://quaternius.itch.io/fantasy-props-megakit | Quaternius | CC0 1.0 |
| `public/models/furniture.glb` | **Furniture Kit** — desk, desk chair, monitor, lamps, bookcases, plants, rug, lounge chair, side table… — https://kenney.nl/assets/furniture-kit | Kenney (kenney.nl) | CC0 1.0 |

Downloaded but not used in the final build (evaluated for the earlier "modern city" direction, then dropped when the brief changed to a stylised game world):
KayKit City Builder Bits (Kay Lousberg), Kenney City Kit Commercial / Suburban / Roads, Kenney Car Kit — all CC0.

## Processing (see `tools/`)
- `build-character.mjs` merges the base character + hair, retargets 18 UAL clips by bone name (rotations + pelvis
  translation, scaled to the taller body), drops normal/roughness maps, resizes the colour maps to 512 px WebP and
  meshopt-compresses. The hoodie / jeans / sneakers are painted at runtime from skin weights (`src/three/engineerLook.ts`);
  the hood and backpack are procedural meshes attached to the spine bone.
- `build-kit.mjs` merges the chosen nature + prop pieces into one GLB, each wrapped in a node named by key (e.g. `pine_a`,
  `lantern`), drops normal/ORM maps, 512 px WebP colour maps, meshopt.
- `build-furniture.mjs` merges the Kenney furniture pieces (flat material colours; recoloured to the palette in `Home.tsx`).
- All shipped GLBs are meshopt-compressed (decoded by drei's `useGLTF`).

Architecture (ruins, observatory, forge, spire, caverns, harbor, lighthouse, the cabin and the room shell), the planet
shader, sky, mist veils, particles, post-processing grade, laptop, UI and all copy are original code.

Fonts: Fraunces and Inter via @fontsource (SIL Open Font License 1.1).
