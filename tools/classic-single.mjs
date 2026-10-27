// Post-process dist-single/index.html: convert the inlined <script type="module"> into a classic
// IIFE <script> at the end of <body>. Some hosts (e.g. sandboxed Page previews) reject ES modules.
//   node tools/classic-single.mjs   (run after `npm run build:single`; included in build:single)
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { build } from 'rolldown'

const file = path.resolve('dist-single/index.html')
let html = fs.readFileSync(file, 'utf8')
const re = /<script type="module"[^>]*>([\s\S]*?)<\/script>/
const m = html.match(re)
if (!m) { console.log('no module script; nothing to do'); process.exit(0) }
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cls-'))
fs.writeFileSync(path.join(tmp, 'in.mjs'), m[1])
await build({
  input: path.join(tmp, 'in.mjs'),
  logLevel: 'warn',
  transform: { define: { 'import.meta.url': 'document.baseURI', 'import.meta.resolve': 'undefined' } },
  output: { format: 'iife', file: path.join(tmp, 'out.js'), minify: true },
})
const js = fs.readFileSync(path.join(tmp, 'out.js'), 'utf8').replace(/<\/script/gi, '<\\/script')
html = html.replace(re, '')
const at = html.lastIndexOf('</body>')
html = html.slice(0, at) + '<script>' + js + '</script>\n' + html.slice(at)
fs.writeFileSync(file, html)
console.log('classic script written', (js.length / 1e6).toFixed(2), 'MB js;', /type="module"/.test(html) ? 'MODULE STILL PRESENT' : 'no module scripts')
