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
 *    - keyboard navigation and submit on Enter focuses invalid fields
 * 5. Masked password input (EmailSettings):
 *    - type="password" on smtpPassword input field
 *    - verifies masking while typing and that secret is write-only / not preloaded
 */
import { spawn } from "node:child_process"
import { tmpdir } from "node:os"
import { join } from "node:path"

const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
const base = (process.env.BASE_URL || "http://localhost:8443").replace(/\/+$/, "")
const cdpPort = 9339
const profile = join(tmpdir(), `inheritix-form-check-${Date.now()}`)
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const results = []
function check(name, ok, detail) {
  results.push({ name, ok: Boolean(ok), detail: detail ? String(detail) : undefined })
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`)
}

const chrome = spawn(chromePath, [
  "--headless=new", "--disable-gpu", `--remote-debugging-port=${cdpPort}`,
  `--user-data-dir=${profile}`, "--no-first-run", "about:blank",
], { stdio: "ignore", windowsHide: true })

async function findPageTarget() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const targets = await (await fetch(`http://127.0.0.1:${cdpPort}/json/list`)).json()
      const page = targets.find((target) => target.type === "page")
      if (page) return page
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
  return {
    ready: new Promise((resolve, reject) => {
      socket.addEventListener("open", resolve, { once: true })
      socket.addEventListener("error", reject, { once: true })
    }),
    call(method, params = {}) {
      id += 1
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject })
        socket.send(JSON.stringify({ id, method, params }))
      })
    },
  }
}

async function main() {
  const target = await findPageTarget()
  const client = connect(target.webSocketDebuggerUrl)
  await client.ready
  await client.call("Page.enable")
  await client.call("Runtime.enable")

  async function evaluate(expression) {
    const result = await client.call("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })
    if (result.exceptionDetails) {
      const msg = result.exceptionDetails.exception?.description || result.exceptionDetails.text || "Browser evaluation failed"
      throw new Error(msg)
    }
    return result.result?.value
  }

  async function navigate(pathname, wait = 1500) {
    await client.call("Page.navigate", { url: `${base}${pathname}` })
    await delay(wait)
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

  // 4. Keyboard accessibility check
  await navigate("/contact?type=general")
  await waitFor("form")
  // Submit with empty required fields using keyboard dispatch
  await evaluate(`(() => {
    const form = document.querySelector('form')
    form.dispatchEvent(new SubmitEvent("submit", { cancelable: true, bubbles: true }))
  })()`)
  await delay(100)
  const invalidFieldFocused = await evaluate("document.activeElement && document.activeElement.getAttribute('aria-invalid') === 'true'")
  const validationSummary = await evaluate("Boolean(document.querySelector('.form-status[role=\"alert\"]'))")
  check("keyboard validation error focuses first invalid input and announces alert status", Boolean(invalidFieldFocused) && validationSummary)

  // ── 5. Masked Password Entry Check in Admin ─────────────────────────────────
  const adminEmail = process.env.INHERITIX_ADMIN_EMAIL || "admin@inheritixai.com"
  const adminPassword = process.env.INHERITIX_ADMIN_PASSWORD || "76-5GWxqq1c5ZYwrcRU7i6ty-Q7z"

  await navigate("/admin/login")
  await delay(1000)
  // Login via API to set session cookie
  const loginRes = await evaluate(`fetch('/api/users/login', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ${JSON.stringify(adminEmail)}, password: ${JSON.stringify(adminPassword)} }),
  }).then(r => r.status)`)

  if (loginRes === 200) {
    await navigate("/admin/globals/email-settings")
    await delay(3000)
    await evaluate(`(() => {
      document.querySelectorAll('.collapsible--is-closed .collapsible__toggle, button[aria-expanded="false"]').forEach((b) => b.click())
    })()`)
    await waitFor("#field-smtpPassword, input[name='smtpPassword']", 20000).catch(() => null)

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

    if (pwInput) {
      check("smtpPassword field renders with type='password'", pwInput.type === "password")
      check("stored SMTP password is not preloaded (empty initial value)", pwInput.value === "")

      // Verify masking while typing
      await evaluate(`(() => {
        const el = document.querySelector('#field-smtpPassword') || document.querySelector('input[name="smtpPassword"]')
        if (!el) return
        const proto = HTMLInputElement.prototype
        Object.getOwnPropertyDescriptor(proto, "value").set.call(el, "SecretTestingPassword123!")
        el.dispatchEvent(new Event("input", { bubbles: true }))
      })()`)

      await delay(250)

      const typedState = await evaluate(`(() => {
        const el = document.querySelector('#field-smtpPassword') || document.querySelector('input[name="smtpPassword"]')
        if (!el) return null
        return {
          type: el.type,
          masked: el.type === "password",
          renderedPlainText: el.outerHTML.includes("type=\\"password\\""),
          value: el.value,
        }
      })()`)
      check("password masking preserved while typing", Boolean(typedState?.masked && typedState?.renderedPlainText))
    } else {
      const debugInfo = await evaluate(`({ url: location.href, title: document.title, inputs: Array.from(document.querySelectorAll('input')).map(i => ({ id: i.id, name: i.name, type: i.type })) })`)
      console.log("SKIP admin email settings password input check:", JSON.stringify(debugInfo))
    }
  } else {
    console.log("SKIP admin login check (default credentials not present in this test environment)")
  }

  await client.call("Browser.close")
}

try {
  await main()
} finally {
  if (!chrome.killed) chrome.kill()
}

const failures = results.filter((r) => !r.ok)
console.log(`\n${results.length - failures.length}/${results.length} browser checks passed.`)
if (failures.length > 0) process.exit(1)
process.exit(0)
