import { spawn } from "node:child_process"
import { mkdir, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"

const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
const outputDirectory = resolve("artifacts/screenshots")
const port = 9333
const profile = join(tmpdir(), `inheritix-responsive-${Date.now()}`)

const captures = [
  { file: "desktop-projects.png", width: 1440, height: 1000, url: "/projects" },
  { file: "tablet-home.png", width: 900, height: 1000, url: "/" },
  { file: "mobile-projects.png", width: 390, height: 844, url: "/projects" },
  { file: "tablet-arabic.png", width: 900, height: 1000, url: "/ar/projects" },
  {
    file: "desktop-project-detail.png",
    width: 1440,
    height: 1000,
    url: "/projects/operations-platform",
  },
]

const chrome = spawn(
  chromePath,
  [
    "--headless=new",
    "--disable-gpu",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    "--no-first-run",
    "about:blank",
  ],
  { stdio: "ignore", windowsHide: true },
)

const delay = (milliseconds) => new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds))

async function findPageTarget() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`)
      const targets = await response.json()
      const page = targets.find((target) => target.type === "page")
      if (page) return page
    } catch {
      // Chrome is still starting.
    }
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
    if (!message.id || !pending.has(message.id)) return
    const { resolveCall, rejectCall } = pending.get(message.id)
    pending.delete(message.id)
    if (message.error) rejectCall(new Error(message.error.message))
    else resolveCall(message.result)
  })

  return {
    ready: new Promise((resolveReady, rejectReady) => {
      socket.addEventListener("open", resolveReady, { once: true })
      socket.addEventListener("error", rejectReady, { once: true })
    }),
    call(method, params = {}) {
      id += 1
      const callId = id
      return new Promise((resolveCall, rejectCall) => {
        pending.set(callId, { resolveCall, rejectCall })
        socket.send(JSON.stringify({ id: callId, method, params }))
      })
    },
  }
}

try {
  await mkdir(outputDirectory, { recursive: true })
  const target = await findPageTarget()
  const client = connect(target.webSocketDebuggerUrl)
  await client.ready
  await client.call("Page.enable")

  for (const capture of captures) {
    await client.call("Emulation.setDeviceMetricsOverride", {
      width: capture.width,
      height: capture.height,
      deviceScaleFactor: 1,
      mobile: capture.width < 600,
      screenWidth: capture.width,
      screenHeight: capture.height,
    })
    await client.call("Page.navigate", { url: `http://localhost:8443${capture.url}` })
    await delay(1800)
    await client.call("Runtime.evaluate", {
      expression:
        "document.fonts.ready.then(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))",
      awaitPromise: true,
    })
    const screenshot = await client.call("Page.captureScreenshot", {
      format: "png",
      fromSurface: true,
      captureBeyondViewport: false,
    })
    await writeFile(join(outputDirectory, capture.file), Buffer.from(screenshot.data, "base64"))
  }

  await client.call("Browser.close")
} finally {
  if (!chrome.killed) chrome.kill()
}
