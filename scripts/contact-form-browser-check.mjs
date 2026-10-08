/**
 * Browser-based interaction tests for ContactForm and EmailSettings:
 * 1. Delayed response:
 *    - submission while pending displays submitting state (aria-busy=true, fieldset disabled)
 *    - tab switching prevented while submitting
 *    - rapid repeated submission dispatches only one request
 * 2. Unchanged network retry:
 *    - preserves entered input values after network failure
 *    - keeps same idempotency key on unchanged retry
 * 3. Edited new attempt:
 *    - typing/changing an input generates a new idempotency key
 *    - submits without 409 conflict round trip
 * 4. Keyboard accessibility:
 *    - trusted browser keyboard activation focuses the first invalid field
 * 5. Masked password input (EmailSettings):
 *    - type="password" on smtpPassword input field
 *    - verifies masking while typing and that secret is write-only / not preloaded
 */
import { spawn } from "node:child_process"
import { accessSync, constants, existsSync, statSync } from "node:fs"
import { rm } from "node:fs/promises"
import net from "node:net"
import { tmpdir } from "node:os"
import { delimiter, join } from "node:path"
import { randomUUID } from "node:crypto"

const base = (process.env.BASE_URL || "http://localhost:8443").replace(/\/+$/, "")
const profile = join(tmpdir(), `inheritix-form-check-${randomUUID()}`)
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const adminEmail = process.env.INHERITIX_ADMIN_EMAIL?.trim()
const adminPassword = process.env.INHERITIX_ADMIN_PASSWORD

if (!adminEmail || !adminPassword) {
  throw new Error("Browser checks require generated INHERITIX_ADMIN_EMAIL and INHERITIX_ADMIN_PASSWORD values from the disposable test runner.")
}

function isExecutable(file) {
  if (!file || !existsSync(file) || !statSync(file).isFile()) return false
  if (process.platform !== "win32") {
    try { accessSync(file, constants.X_OK) } catch { return false }
  }
  return true
}

function discoverBrowser() {
  if (process.env.CHROME_PATH) {
    if (!isExecutable(process.env.CHROME_PATH)) {
      throw new Error(`CHROME_PATH does not point to an executable file: ${process.env.CHROME_PATH}`)
    }
    return process.env.CHROME_PATH
  }

  const candidates = process.platform === "win32"
    ? [
        process.env.PROGRAMFILES && join(process.env.PROGRAMFILES, "Google", "Chrome", "Application", "chrome.exe"),
        process.env["PROGRAMFILES(X86)"] && join(process.env["PROGRAMFILES(X86)"], "Google", "Chrome", "Application", "chrome.exe"),
        process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, "Google", "Chrome", "Application", "chrome.exe"),
        process.env.PROGRAMFILES && join(process.env.PROGRAMFILES, "Microsoft", "Edge", "Application", "msedge.exe"),
        process.env["PROGRAMFILES(X86)"] && join(process.env["PROGRAMFILES(X86)"], "Microsoft", "Edge", "Application", "msedge.exe"),
      ]
    : [
        "/usr/bin/google-chrome",
        "/usr/bin/google-chrome-stable",
        "/usr/bin/chromium",
        "/usr/bin/chromium-browser",
        "/snap/bin/chromium",
        ...String(process.env.PATH || "").split(delimiter).flatMap((entry) => [
          join(entry, "google-chrome"), join(entry, "google-chrome-stable"), join(entry, "chromium"), join(entry, "chromium-browser"),
        ]),
      ]
  const found = candidates.filter(Boolean).find(isExecutable)
  if (!found) {
    throw new Error("No supported Chromium browser was found. Set CHROME_PATH to an executable Chrome, Chromium, or Edge binary.")
  }
  return found
}

async function availablePort() {
  const server = net.createServer()
  await new Promise((resolve, reject) => {
    server.once("error", reject)
    server.listen(0, "127.0.0.1", resolve)
  })
  const address = server.address()
  const port = typeof address === "object" && address ? address.port : 0
  await new Promise((resolve) => server.close(resolve))
  if (!port) throw new Error("Could not reserve a browser debugging port.")
  return port
}

const chromePath = discoverBrowser()
const cdpPort = await availablePort()

const results = []
const requiredChecks = new Set([
  "submitting state sets aria-busy and disables fieldset and buttons",
  "tab switching is blocked while request is pending",
  "rapid repeated submissions do not dispatch duplicate requests",
  "entered values preserved after recoverable network failure",
  "unchanged retry retains the same idempotency key",
  "edited submission generates a new idempotency key",
  "successful submission renders contact result with reference",
  "trusted keyboard submission focuses first invalid input and announces alert status",
  "administrator authentication succeeds",
  "smtpPassword field renders with type='password'",
  "stored SMTP password is not preloaded (empty initial value)",
  "password masking preserved while typing",
])
function check(name, ok, detail) {
  if (!requiredChecks.has(name)) throw new Error(`Unregistered browser check: ${name}`)
  if (results.some((result) => result.name === name)) throw new Error(`Duplicate browser check: ${name}`)
  results.push({ name, ok: Boolean(ok), detail: detail ? String(detail) : undefined })
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`)
}

console.log(`[browser-check] using ${chromePath}`)
let browserLog = ""
const chrome = spawn(chromePath, [
  "--headless=new", "--disable-gpu", `--remote-debugging-port=${cdpPort}`,
  `--user-data-dir=${profile}`, "--no-first-run", "about:blank",
], { stdio: ["ignore", "ignore", "pipe"], windowsHide: true })
chrome.stderr.on("data", (chunk) => { browserLog = (browserLog + chunk.toString()).slice(-8000) })
let chromeSpawnError
let chromeExited = false
const chromeExit = new Promise((resolve) => {
  chrome.once("error", (error) => {
    chromeSpawnError = error
    chromeExited = true
    resolve({ code: null, signal: null, error })
  })
  chrome.once("exit", (code, signal) => {
    chromeExited = true
    resolve({ code, signal })
  })
})

async function findBrowserEndpoint() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (chromeSpawnError) throw new Error(`Browser failed to start: ${chromeSpawnError.message}`)
    if (chromeExited) throw new Error("Browser exited before the DevTools connection became available.")
    try {
      const version = await (await fetch(`http://127.0.0.1:${cdpPort}/json/version`)).json()
      if (version.webSocketDebuggerUrl) return version.webSocketDebuggerUrl
    } catch { /* Chrome starting */ }
    await delay(200)
  }
  throw new Error("Chrome DevTools target did not become available")
}

function connect(url) {
  const socket = new WebSocket(url)
  let id = 0
  const pending = new Map()
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data)
    const call = pending.get(message.id)
    if (!call) return
    pending.delete(message.id)
    message.error ? call.reject(new Error(message.error.message)) : call.resolve(message.result)
  })
  socket.addEventListener("close", () => {
    for (const call of pending.values()) call.reject(new Error("Browser DevTools connection closed."))
    pending.clear()
  })
  return {
    ready: new Promise((resolve, reject) => {
      socket.addEventListener("open", resolve, { once: true })
      socket.addEventListener("error", reject, { once: true })
    }),
    call(method, params = {}, sessionId) {
      id += 1
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject })
        socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }))
      })
    },
    close() {
      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) socket.close()
    },
  }
}

let client
async function main() {
  const browserWebSocketUrl = await findBrowserEndpoint()
  client = connect(browserWebSocketUrl)
  await client.ready
  const created = await client.call("Target.createTarget", { url: "about:blank" })
  const attached = await client.call("Target.attachToTarget", { targetId: created.targetId, flatten: true })
  const sessionId = attached.sessionId
  if (!sessionId) throw new Error("Browser did not create an isolated DevTools page session.")
  await client.call("Page.enable", {}, sessionId)
  await client.call("Runtime.enable", {}, sessionId)

  async function evaluate(expression) {
    const result = await client.call("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true }, sessionId)
    if (result.exceptionDetails) {
      const msg = result.exceptionDetails.exception?.description || result.exceptionDetails.text || "Browser evaluation failed"
      throw new Error(msg)
    }
    return result.result?.value
  }

  async function navigate(pathname, wait = 1500) {
    const navigation = await client.call("Page.navigate", { url: `${base}${pathname}` }, sessionId)
    if (navigation.errorText) throw new Error(`Navigation to ${pathname} failed: ${navigation.errorText}`)
    await delay(wait)
    const current = await evaluate("({ href: location.href, ready: document.readyState })")
    if (!current?.href?.startsWith(base) || current.ready === "loading") throw new Error(`Navigation to ${pathname} did not complete.`)
    await evaluate("document.fonts.ready.then(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))))")
  }

  async function waitFor(selector, timeout = 12000) {
    const started = Date.now()
    while (Date.now() - started < timeout) {
      if (await evaluate(`Boolean(document.querySelector(${JSON.stringify(selector)}))`)) return
      await delay(200)
    }
    throw new Error(`Timed out waiting for ${selector}`)
  }

  async function waitUntil(expression, label, timeout = 12000) {
    const started = Date.now()
    while (Date.now() - started < timeout) {
      if (await evaluate(`Boolean(${expression})`)) return
      await delay(50)
    }
    throw new Error(`Timed out waiting for ${label}`)
  }

  // ── ContactForm Interaction Checks ──────────────────────────────────────────
  await navigate("/contact?type=general")
  await waitFor("form")

  // Install test harness on window.fetch to inspect outgoing requests and inject delays/errors
  await evaluate(`(() => {
    window.__inquiryRequests = []
    window.__inquiryDelayMs = 0
    window.__inquiryNetworkFail = false
    window.__inquiryCustomResponse = null

    const origFetch = window.fetch
    window.fetch = async (input, init) => {
      const url = typeof input === "string" ? input : input?.url || ""
      if (url.includes("/api/inquiries")) {
        const payload = init?.body ? JSON.parse(init.body) : null
        window.__inquiryRequests.push({ payload, time: Date.now() })

        if (window.__inquiryDelayMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, window.__inquiryDelayMs))
        }
        if (window.__inquiryNetworkFail) {
          throw new TypeError("Failed to fetch")
        }
        if (window.__inquiryCustomResponse) {
          return new Response(JSON.stringify(window.__inquiryCustomResponse.body), {
            status: window.__inquiryCustomResponse.status,
            headers: { "Content-Type": "application/json" },
          })
        }
      }
      return origFetch(input, init)
    }
  })()`)

  // Fill in form values
  await evaluate(`(() => {
    const set = (name, value) => {
      const el = document.querySelector('[name="' + name + '"]')
      const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
      Object.getOwnPropertyDescriptor(proto, "value").set.call(el, value)
      el.dispatchEvent(new Event("input", { bubbles: true }))
    }
    set("name", "Browser Test User")
    set("email", "browsertest@example.test")
    set("message", "This is an automated browser test for contact form interaction.")
  })()`)

  // 1. Delayed response & pending interaction test
  await evaluate("window.__inquiryDelayMs = 2000; window.__inquiryNetworkFail = true")
  // Click submit to initiate request
  await evaluate("document.querySelector('button.submit').click()")

  // Verify form is in submitting state while request is in flight
  const isBusy = await evaluate("document.querySelector('form').getAttribute('aria-busy') === 'true'")
  const isFieldsetDisabled = await evaluate("document.querySelector('fieldset').disabled === true")
  const isSubmitDisabled = await evaluate("document.querySelector('button.submit').disabled === true")
  const tabsDisabled = await evaluate(`(() => {
    const tabs = Array.from(document.querySelectorAll('[role="tab"]'))
    return tabs.length > 0 && tabs.every(t => t.disabled === true)
  })()`)
  check("submitting state sets aria-busy and disables fieldset and buttons", isBusy && isFieldsetDisabled && isSubmitDisabled && tabsDisabled)

  // Attempt tab switching during pending request
  await evaluate(`(() => {
    const tab = document.querySelector('[role="tab"]:not(.active)')
    if (tab) tab.click()
  })()`)
  const activeTabUnchanged = await evaluate(`(() => {
    const active = document.querySelector('[role="tab"].active')
    return active ? active.textContent.includes("General") : true
  })()`)
  check("tab switching is blocked while request is pending", activeTabUnchanged)

  // Rapid repeated submissions during pending request
  await evaluate(`(() => {
    const btn = document.querySelector('button.submit')
    for (let i = 0; i < 5; i++) {
      if (btn) btn.click()
    }
  })()`)
  const requestCountDuringDelay = await evaluate("window.__inquiryRequests.length")
  check("rapid repeated submissions do not dispatch duplicate requests", requestCountDuringDelay === 1, `count: ${requestCountDuringDelay}`)

  // Wait for the delayed network error to reject
  await delay(2200)

  // 2. Unchanged network retry
  const formStateAfterFail = await evaluate("document.querySelector('.form-status') ? document.querySelector('.form-status').textContent : ''")
  const nameValuePreserved = await evaluate("document.querySelector('[name=\"name\"]').value")
  const emailValuePreserved = await evaluate("document.querySelector('[name=\"email\"]').value")
  const messageValuePreserved = await evaluate("document.querySelector('[name=\"message\"]').value")
  check("entered values preserved after recoverable network failure", nameValuePreserved === "Browser Test User" && emailValuePreserved === "browsertest@example.test" && messageValuePreserved.length > 10, formStateAfterFail)

  // Submit unchanged retry
  const firstKey = await evaluate("window.__inquiryRequests[0].payload.idempotencyKey")
  await evaluate("window.__inquiryDelayMs = 0; window.__inquiryNetworkFail = true")
  await evaluate("document.querySelector('button.submit').click()")
  await delay(100)

  const secondKey = await evaluate("window.__inquiryRequests[1].payload.idempotencyKey")
  check("unchanged retry retains the same idempotency key", firstKey && firstKey === secondKey, `keys: ${firstKey} === ${secondKey}`)

  // 3. Edited new attempt
  // User edits input after failure
  await evaluate(`(() => {
    const el = document.querySelector('[name="message"]')
    const proto = HTMLTextAreaElement.prototype
    Object.getOwnPropertyDescriptor(proto, "value").set.call(el, el.value + " (edited)")
    el.dispatchEvent(new Event("input", { bubbles: true }))
  })()`)

  // Next submission should generate a new key and succeed
  await evaluate("window.__inquiryNetworkFail = false; window.__inquiryCustomResponse = { status: 201, body: { ok: true, code: 'RECEIVED', reference: 'INQ-BROWSER-PASS-1' } }")
  await evaluate("document.querySelector('button.submit').click()")
  await delay(200)

  const thirdKey = await evaluate("window.__inquiryRequests[2].payload.idempotencyKey")
  check("edited submission generates a new idempotency key", thirdKey && thirdKey !== firstKey, `keys: ${thirdKey} !== ${firstKey}`)

  const resultShown = await evaluate("Boolean(document.querySelector('.contact-result'))")
  const resultRef = await evaluate("document.querySelector('.contact-result') ? document.querySelector('.contact-result').textContent : ''")
  check("successful submission renders contact result with reference", resultShown && resultRef.includes("INQ-BROWSER-PASS-1"))

  // 4. Keyboard accessibility check using trusted browser input events.
  await navigate("/contact?type=general")
  await waitFor("form")
  const submitFocused = await evaluate(`(() => {
    const button = document.querySelector('button.submit')
    window.__trustedKeyboardSubmit = false
    document.querySelector('form').addEventListener('submit', (event) => { window.__trustedKeyboardSubmit = event.isTrusted }, { once: true })
    button.focus()
    return document.activeElement === button
  })()`)
  if (!submitFocused) throw new Error("Could not focus the submit button for the keyboard check.")
  await client.call("Input.dispatchKeyEvent", { type: "keyDown", key: " ", code: "Space", text: " ", windowsVirtualKeyCode: 32, nativeVirtualKeyCode: 32 }, sessionId)
  await client.call("Input.dispatchKeyEvent", { type: "keyUp", key: " ", code: "Space", windowsVirtualKeyCode: 32, nativeVirtualKeyCode: 32 }, sessionId)
  await waitFor('.form-status[role="alert"]')
  await waitUntil("document.activeElement && document.activeElement.getAttribute('aria-invalid') === 'true'", "first invalid field focus")
  const invalidFieldFocused = await evaluate("document.activeElement && document.activeElement.getAttribute('aria-invalid') === 'true'")
  const validationSummary = await evaluate("Boolean(document.querySelector('.form-status[role=\"alert\"]'))")
  const trustedKeyboardSubmit = await evaluate("window.__trustedKeyboardSubmit === true")
  check("trusted keyboard submission focuses first invalid input and announces alert status", Boolean(invalidFieldFocused) && validationSummary && trustedKeyboardSubmit)

  // ── 5. Masked Password Entry Check in Admin ─────────────────────────────────
  await navigate("/admin/login")
  await delay(1000)
  // Login via API to set session cookie
  const loginRes = await evaluate(`fetch('/api/users/login', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ${JSON.stringify(adminEmail)}, password: ${JSON.stringify(adminPassword)} }),
  }).then(r => r.status)`)

  check("administrator authentication succeeds", loginRes === 200, `HTTP ${loginRes}`)
  if (loginRes !== 200) throw new Error(`Administrator authentication failed with HTTP ${loginRes}.`)

  await navigate("/admin/globals/email-settings")
  await delay(3000)
  await evaluate(`(() => {
    document.querySelectorAll('.collapsible--is-closed .collapsible__toggle, button[aria-expanded="false"]').forEach((b) => b.click())
  })()`)
  await waitFor("#field-smtpPassword, input[name='smtpPassword']", 20000)

  const pwInput = await evaluate(`(() => {
    const el = document.querySelector('#field-smtpPassword') || document.querySelector('input[name="smtpPassword"]')
    if (!el) return null
    return {
      type: el.type,
      name: el.name,
      autoComplete: el.getAttribute('autocomplete'),
      value: el.value,
      placeholder: el.placeholder,
    }
  })()`)
  if (!pwInput) throw new Error("Required smtpPassword input is missing from Email Settings.")
  check("smtpPassword field renders with type='password'", pwInput.type === "password")
  check("stored SMTP password is not preloaded (empty initial value)", pwInput.value === "")

  // Verify masking while typing. This does not save the settings form.
  await evaluate(`(() => {
    const el = document.querySelector('#field-smtpPassword') || document.querySelector('input[name="smtpPassword"]')
    if (!el) throw new Error('smtpPassword input disappeared')
    const proto = HTMLInputElement.prototype
    Object.getOwnPropertyDescriptor(proto, "value").set.call(el, "EphemeralBrowserInput-Aa1!")
    el.dispatchEvent(new Event("input", { bubbles: true }))
  })()`)

  await delay(250)

  const typedState = await evaluate(`(() => {
    const el = document.querySelector('#field-smtpPassword') || document.querySelector('input[name="smtpPassword"]')
    if (!el) return null
    return {
      type: el.type,
      masked: el.type === "password",
      renderedAsPasswordInput: el.outerHTML.includes("type=\\"password\\""),
    }
  })()`)
  check("password masking preserved while typing", Boolean(typedState?.masked && typedState?.renderedAsPasswordInput))

  await client.call("Browser.close")
}

let executionError
try {
  await main()
} catch (error) {
  executionError = error
  console.error(`[browser-check] ${error instanceof Error ? error.message : String(error)}`)
  if (browserLog.trim()) console.error(`[browser-check] browser diagnostics:\n${browserLog.trim()}`)
} finally {
  client?.close()
  if (!chromeExited) chrome.kill()
  await Promise.race([chromeExit, delay(5000)])
  if (!chromeExited) {
    chrome.kill("SIGKILL")
    await Promise.race([chromeExit, delay(5000)])
  }
  if (!chromeExited) {
    executionError ??= new Error("Browser process did not exit during cleanup.")
    console.error("[browser-check] browser process did not exit during cleanup")
  }
  await rm(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }).catch((error) => {
    executionError ??= error
    console.error(`[browser-check] temporary profile cleanup failed: ${error instanceof Error ? error.message : String(error)}`)
  })
}

const missing = [...requiredChecks].filter((name) => !results.some((result) => result.name === name))
for (const name of missing) console.error(`FAIL required check did not execute: ${name}`)
const failures = results.filter((result) => !result.ok)
const passedRequired = [...requiredChecks].filter((name) => results.some((result) => result.name === name && result.ok)).length
console.log(`\n${passedRequired}/${requiredChecks.size} required browser checks passed.`)
if (executionError || failures.length > 0 || missing.length > 0) process.exit(1)
process.exit(0)
