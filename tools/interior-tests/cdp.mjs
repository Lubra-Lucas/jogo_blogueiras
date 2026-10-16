// Mini cliente CDP (sem dependencias): abre Edge headless, conecta por WebSocket (Node 22+ tem WebSocket global).
import { spawn } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const EDGE = process.env.EDGE || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export async function launch({ url, port = 9400 + Math.floor(Math.random() * 400), w = 1280, h = 720, touch = false }) {
  const dir = mkdtempSync(join(tmpdir(), 'ib-edge-'))
  const proc = spawn(EDGE, ['--headless=new', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', `--user-data-dir=${dir}`, `--remote-debugging-port=${port}`, `--window-size=${w},${h}`, 'about:blank'], { stdio: 'ignore' })
  let tab
  for (let i = 0; i < 60 && !tab; i++) {
    await sleep(500)
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json()
      tab = list.find((t) => t.type === 'page')
    } catch {}
  }
  if (!tab) throw new Error('Edge nao subiu')
  const ws = new WebSocket(tab.webSocketDebuggerUrl)
  await new Promise((r) => (ws.onopen = r))
  let id = 0
  const pend = new Map()
  const logs = []
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data)
    if (d.id && pend.has(d.id)) {
      const { res, rej } = pend.get(d.id)
      pend.delete(d.id)
      d.error ? rej(new Error(JSON.stringify(d.error))) : res(d.result)
    } else if (d.method === 'Runtime.consoleAPICalled' && (d.params.type === 'error' || d.params.type === 'warning')) logs.push(d.params.type + ': ' + d.params.args.map((a) => a.value ?? a.description).join(' '))
    else if (d.method === 'Runtime.exceptionThrown') logs.push('EXC: ' + (d.params.exceptionDetails.exception?.description ?? d.params.exceptionDetails.text))
  }
  const send = (method, params = {}, ms = 240000) =>
    new Promise((res, rej) => {
      const i = ++id
      const t = setTimeout(() => { pend.delete(i); rej(new Error('timeout CDP ' + method)) }, ms)
      pend.set(i, { res: (v) => { clearTimeout(t); res(v) }, rej: (e) => { clearTimeout(t); rej(e) } })
      ws.send(JSON.stringify({ id: i, method, params }))
    })
  await send('Runtime.enable')
  await send('Page.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: touch })
  if (touch) await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
  await send('Page.navigate', { url })
  const ev = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text)
    return r.result.value
  }
  const key = async (code, k, down = 90) => {
    const base = { key: k, code, windowsVirtualKeyCode: k.length === 1 ? k.toUpperCase().charCodeAt(0) : 0 }
    await send('Input.dispatchKeyEvent', { type: 'keyDown', ...base })
    await sleep(down)
    await send('Input.dispatchKeyEvent', { type: 'keyUp', ...base })
  }
  const click = async (x, y, { touch: t = false } = {}) => {
    if (t) {
      await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
      await sleep(60)
      await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    } else {
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y })
      await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 })
      await sleep(60)
      await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 })
    }
  }
  const shot = async (file) => {
    const r = await send('Page.captureScreenshot', { format: 'png' })
    mkdirSync(join(file, '..'), { recursive: true })
    writeFileSync(file, Buffer.from(r.data, 'base64'))
  }
  const close = async () => { try { await send('Browser.close') } catch {} ; try { proc.kill() } catch {} }
  return { send, ev, key, click, shot, close, logs }
}

export async function waitFor(c, expr, ms = 120000, step = 500) {
  const t0 = Date.now()
  while (Date.now() - t0 < ms) {
    try { if (await c.ev(expr)) return true } catch {}
    await sleep(step)
  }
  throw new Error('timeout: ' + expr)
}

/** espera o jogo carregar de verdade (canvas montado e sem "Carregando..." por 4 s seguidos). */
export async function waitReady(c, ms = 600000) {
  const t0 = Date.now()
  let okSince = 0
  let lastReload = Date.now()
  while (Date.now() - t0 < ms) {
    let ok = false
    try { ok = await c.ev(`!document.querySelector('.loading') && !!document.querySelector('canvas') && !!window.__interior`) } catch {}
    if (ok) { okSince ||= Date.now(); if (Date.now() - okSince > 4000) return } else okSince = 0
    // sem HMR o Vite nao recarrega sozinho quando reotimiza dependencias: recarrega de tempos em tempos
    if (Date.now() - lastReload > 100000) { lastReload = Date.now(); okSince = 0; try { await c.send('Page.reload') } catch {} }
    await sleep(500)
  }
  throw new Error('jogo nao carregou')
}
