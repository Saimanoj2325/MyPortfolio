// Verifies dist-single/index.html inside <iframe sandbox="allow-scripts"> (opaque origin: no
// same-origin, no localStorage). Fails on any console error, page error, or non-data/blob request.
// Usage: CHROME=/tmp/chr/chrome-ns.sh node tools/single-test.mjs [out.png]
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { chromium } from 'playwright-core'

const out = process.argv[2] ?? '../shots/single-iframe.png'
const html = fs.readFileSync(path.resolve('dist-single/index.html'))
// host page and the app are served from one tiny server; the iframe is sandboxed so it is cross-origin anyway
const host = `<!doctype html><html><body style="margin:0;background:#111">
<iframe id="f" src="/app.html" sandbox="allow-scripts" style="border:0;width:100vw;height:100vh;display:block"></iframe></body></html>`
const requests = []
const srv = http.createServer((req, res) => {
  requests.push(req.url)
  if (req.url === '/') { res.writeHead(200, { 'content-type': 'text/html' }); res.end(host) }
  else if (req.url === '/app.html') { res.writeHead(200, { 'content-type': 'text/html' }); res.end(html) }
  else { res.writeHead(404); res.end() }
}).listen(0)
const port = srv.address().port
const exe = process.env.CHROME
const b = await chromium.launch({ executablePath: exe, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--ignore-gpu-blocklist'] })
const p = await b.newPage({ viewport: { width: 1280, height: 760 } })
const errors = [], netw = []
p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text().slice(0, 240)}`) })
p.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message))
p.on('request', (r) => { const u = r.url(); if (!u.startsWith('data:') && !u.startsWith('blob:')) netw.push(u) })
p.on('requestfailed', (r) => errors.push('REQFAILED ' + r.url().slice(0, 80) + ' ' + r.failure()?.errorText))
await p.goto(`http://localhost:${port}/`)
const frame = await (await p.waitForSelector('#f')).contentFrame()
const origin = await frame.evaluate(() => window.origin)
await frame.waitForFunction(() => !document.querySelector('.loader') && document.querySelector('canvas'), null, { timeout: 110000 })
await p.waitForTimeout(5000)
const canvas = await frame.evaluate(() => { const c = document.querySelector('canvas'); return c ? { w: c.width, h: c.height } : null })
// sample the rendered canvas: a WebGL canvas that drew something has non-uniform pixels
await p.screenshot({ path: out })
const shot = fs.readFileSync(out)
console.log('iframe origin:', origin, '| canvas:', JSON.stringify(canvas), '| screenshot bytes:', shot.length)
console.log('non-inline requests:', netw.filter((u) => !u.endsWith(`:${port}/`) && !u.endsWith('/app.html')))
console.log('server saw:', requests)
console.log(errors.length ? 'console:\n' + errors.join('\n') : 'no console errors/warnings')
await b.close(); srv.close()
