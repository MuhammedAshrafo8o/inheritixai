import { spawn } from "node:child_process"
import { mkdir, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"

const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
const base = (process.env.BASE_URL || "http://localhost:8443").replace(/\/+$/, "")
const outputDirectory = resolve("artifacts/milestone-three")
const port = 9334
const profile = join(tmpdir(), `inheritix-m3-capture-${Date.now()}`)
const delay = (milliseconds) => new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds))

const chrome = spawn(chromePath, [
  "--headless=new", "--disable-gpu", `--remote-debugging-port=${port}`,
  `--user-data-dir=${profile}`, "--no-first-run", "about:blank",
], { stdio: "ignore", windowsHide: true })

async function findPageTarget() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
      const page = targets.find((target) => target.type === "page")
      if (page) return page
    } catch { /* Chrome is starting. */ }
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
    ready: new Promise((resolveReady, rejectReady) => {
      socket.addEventListener("open", resolveReady, { once: true })
      socket.addEventListener("error", rejectReady, { once: true })
    }),
    call(method, params = {}) {
      id += 1
      return new Promise((resolveCall, rejectCall) => {
        pending.set(id, { resolve: resolveCall, reject: rejectCall })
        socket.send(JSON.stringify({ id, method, params }))
      })
    },
  }
}

async function main() {
  await mkdir(outputDirectory, { recursive: true })
  const target = await findPageTarget()
  const client = connect(target.webSocketDebuggerUrl)
  await client.ready
  await client.call("Page.enable")

  async function viewport(width, height) {
    await client.call("Emulation.setDeviceMetricsOverride", {
      width, height, deviceScaleFactor: 1, mobile: width < 600, screenWidth: width, screenHeight: height,
    })
  }
  async function navigate(pathname, wait = 2200) {
    await client.call("Page.navigate", { url: `${base}${pathname}` })
    await delay(wait)
    await client.call("Runtime.evaluate", {
      expression: "document.fonts.ready.then(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))",
      awaitPromise: true,
    })
  }
  async function evaluate(expression) {
    const result = await client.call("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || "Browser evaluation failed")
    return result.result?.value
  }
  async function waitFor(selector, timeout = 12_000) {
    const started = Date.now()
    while (Date.now() - started < timeout) {
      if (await evaluate(`Boolean(document.querySelector(${JSON.stringify(selector)}))`)) return
      await delay(250)
    }
    throw new Error(`Timed out waiting for ${selector}`)
  }
  async function shot(file) {
    const screenshot = await client.call("Page.captureScreenshot", { format: "png", fromSurface: true, captureBeyondViewport: false })
    await writeFile(join(outputDirectory, file), Buffer.from(screenshot.data, "base64"))
    console.log(`[capture] ${file}`)
  }
  async function submitGeneral(pathname, name, email, message) {
    await navigate(pathname)
    await waitFor("form")
    await evaluate(`(() => {
      const set = (selector, value) => {
        const element = document.querySelector(selector)
        const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
        Object.getOwnPropertyDescriptor(prototype, "value").set.call(element, value)
        element.dispatchEvent(new Event("input", { bubbles: true }))
      }
      set('[name="name"]', ${JSON.stringify(name)})
      set('[name="email"]', ${JSON.stringify(email)})
      set('[name="message"]', ${JSON.stringify(message)})
      document.querySelector('form').requestSubmit()
    })()`)
    await waitFor(".contact-result")
  }

  await viewport(390, 844)
  await submitGeneral("/contact?type=general", "Screenshot Visitor", "screenshots@example.test", "This is a verified project inquiry captured for the Milestone Three report.")
  await shot("contact-success-en-mobile.png")

  await viewport(900, 1000)
  await submitGeneral("/ar/contact?type=general", "زائر تجريبي", "screenshots-ar@example.test", "هذه رسالة تحقق مكتملة لطلب عام ضمن اختبار المرحلة الثالثة.")
  await shot("contact-success-ar-tablet.png")

  await viewport(1440, 1000)
  await navigate("/contact?type=general")
  await evaluate("document.querySelector('form').requestSubmit()")
  await waitFor('[aria-invalid="true"]')
  await shot("contact-validation-en-desktop.png")

  const adminEmail = process.env.INHERITIX_ADMIN_EMAIL
  const adminPassword = process.env.INHERITIX_ADMIN_PASSWORD
  if (!adminEmail || !adminPassword) throw new Error("Admin screenshot credentials are required in the environment")
  await navigate("/admin/login", 3500)
  const loginStatus = await evaluate(`fetch('/api/users/login', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: ${JSON.stringify(adminEmail)}, password: ${JSON.stringify(adminPassword)} }) }).then(r => r.status)`)
  if (loginStatus !== 200) throw new Error(`Admin login failed with ${loginStatus}`)

  await navigate("/admin/collections/inquiry-records", 5000)
  await shot("admin-inquiries-list.png")

  const failedId = await evaluate("fetch('/api/inquiry-records?where[notificationStatus][equals]=failed&limit=1', { credentials: 'include' }).then(r => r.json()).then(x => x.docs?.[0]?.id)")
  if (!failedId) throw new Error("A failed notification fixture is required for the retry screenshot")
  await navigate(`/admin/collections/inquiry-records/${failedId}`, 4500)
  await evaluate("window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' })")
  await delay(750)
  await shot("admin-inquiry-detail-failed-retry.png")

  await navigate("/admin/globals/email-settings", 4500)
  await shot("admin-email-settings-secret-hidden.png")
  await client.call("Browser.close")
}

try {
  await main()
} finally {
  if (!chrome.killed) chrome.kill()
}
