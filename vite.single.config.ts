// Single-file build: everything (JS, CSS, fonts, the three GLB models, the résumé) inlined into
// dist-single/index.html, so it runs from file:// or inside a sandboxed iframe (allow-scripts only,
// no same-origin → no localStorage, guarded in src/store.ts). GLBs become base64 data: URLs, which
// GLTFLoader fetches without any network request. Meshopt decoding is drei's inline-WASM decoder
// (no worker); Draco is never requested because none of the models use it.
//   npm run build:single
import fs from 'node:fs'
import path from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

const PUBLIC = path.resolve(__dirname, 'public')
const dataUrl = (file: string, mime: string) => `data:${mime};base64,${fs.readFileSync(path.join(PUBLIC, file)).toString('base64')}`

/** rewrites `${import.meta.env.BASE_URL}models/x.glb` and the résumé link to inline data: URLs */
function inlinePublicAssets(): Plugin {
  return {
    name: 'inline-public-assets',
    enforce: 'pre',
    transform(code, id) {
      if (!/\/src\/.*\.(ts|tsx)$/.test(id)) return null
      let out = code.replace(/`\$\{import\.meta\.env\.BASE_URL\}models\/([\w-]+)\.glb`/g, (_, name) => JSON.stringify(dataUrl(`models/${name}.glb`, 'model/gltf-binary')))
      if (id.endsWith('/src/data/profile.ts')) out = out.replace(/resume:\s*'resume\.pdf'/, () => `resume: ${JSON.stringify(dataUrl('resume.pdf', 'application/pdf'))}`)
      return out === code ? null : { code: out, map: null }
    },
  }
}

export default defineConfig({
  base: './',
  publicDir: false, // nothing is copied next to the html: it is all inlined
  plugins: [inlinePublicAssets(), react(), viteSingleFile({ removeViteModuleLoader: true })],
  build: {
    outDir: 'dist-single',
    target: 'es2020',
    chunkSizeWarningLimit: 20000,
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
    modulePreload: false,
  },
})
