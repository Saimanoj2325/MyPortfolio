// Loads a page in headless Chromium and prints console errors.
// Usage: node tools/smoke.mjs <url> [waitMs] [js-to-eval]
// CHROME=/path/to/chromium overrides the browser (default: playwright's, or /usr/bin/chromium).
import fs from 'node:fs'
import { chromium } from 'playwright-core'
const url = process.argv[2]
const wait = +process.argv[3] || 8000
const exe = process.env.CHROME || (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined)
const b = await chromium.launch({ executablePath: exe, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--ignore-gpu-blocklist', '--disable-gpu-watchdog'] })
const p = await b.newPage({ viewport: { width: 1280, height: 760 } })
const errs = []
p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text().slice(0, 300)) })
p.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message.slice(0, 400)))
await p.goto(url)
await p.waitForTimeout(wait)
const extra = process.argv[4]
if (extra) { await p.evaluate(extra).catch((e) => errs.push('EVAL: ' + e.message)); await p.waitForTimeout(wait) }
console.log(await p.evaluate(() => document.body.innerText.slice(0, 600)))
console.log('---errors---\n' + [...new Set(errs)].slice(0, 30).join('\n'))
await b.close()
