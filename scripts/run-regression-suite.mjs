import { spawn } from "node:child_process"
import { createRequire } from "node:module"
import path from "node:path"

const PORT = 8456
const BASE_URL = `http://localhost:${PORT}`
process.env.NEXT_PUBLIC_SITE_URL = BASE_URL

const npxCmd = process.platform === "win32" ? "npx.cmd" : "npx"

function run(cmd, args, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const env = { ...process.env, ...extraEnv }
    const child = spawn(cmd, args, { cwd: process.cwd(), stdio: ["ignore", "inherit", "inherit"], shell: process.platform === "win32", env })
    child.once("error", reject)
    child.once("exit", (code) => code === 0 ? resolve() : reject(new Error(`${cmd} ${args.join(" ")} exited ${code}`)))
  })
}

console.log("[regression-suite] applying migrations...")
await run(npxCmd, ["tsx", "scripts/apply-migrations-direct.ts"])

console.log("[regression-suite] seeding content...")
await run(npxCmd, ["tsx", "scripts/seed.ts"])

console.log("[regression-suite] bootstrapping admin and editor users...")
await run(npxCmd, ["tsx", "scripts/bootstrap-users.ts"])

console.log("[regression-suite] starting Next.js server on port " + PORT + "...")
const require = createRequire(import.meta.url)
const nextRoot = path.dirname(require.resolve("next/package.json"))
const app = spawn(process.execPath, [path.join(nextRoot, "dist/bin/next"), "dev", "-p", String(PORT)], {
  cwd: process.cwd(),
  env: { ...process.env, NEXT_PUBLIC_SITE_URL: BASE_URL, PORT: String(PORT) },
  stdio: ["ignore", "pipe", "pipe"],
})
let appLog = ""
app.stdout.on("data", (chunk) => { appLog += chunk.toString() })
app.stderr.on("data", (chunk) => { appLog += chunk.toString() })

async function waitForServer() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const res = await fetch(`${BASE_URL}/contact`)
      if (res.status === 200) return
    } catch { /* wait */ }
    await new Promise((r) => setTimeout(r, 250))
  }
  throw new Error(`Server did not become ready:\n${appLog}`)
}

try {
  await waitForServer()
  console.log("[regression-suite] Next.js server is ready at " + BASE_URL)

  console.log("\n==========================================")
  console.log("RUNNING BROWSER INTERACTION CHECKS")
  console.log("==========================================")
  await run("node", ["scripts/contact-form-browser-check.mjs"], { BASE_URL })

  console.log("\n==========================================")
  console.log("RUNNING CONTENT CONTROLS TEST SUITE")
  console.log("==========================================")
  await run(npxCmd, ["tsx", "scripts/content-controls-check.ts"], { BASE_URL })

  console.log("\n[regression-suite] All regression suites passed successfully!")
} finally {
  app.kill("SIGTERM")
  await new Promise((r) => setTimeout(r, 500))
}
