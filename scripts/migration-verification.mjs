import { spawn } from "node:child_process"
import { readdir } from "node:fs/promises"

const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm"
const npxCmd = process.platform === "win32" ? "npx.cmd" : "npx"

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd: process.cwd(), stdio: ["ignore", "inherit", "inherit"], shell: process.platform === "win32", env: process.env })
    child.once("error", reject)
    child.once("exit", (code) => code === 0 ? resolve() : reject(new Error(`${cmd} ${args.join(" ")} exited ${code}`)))
  })
}

// The direct adapter entry point is test-only and avoids depending on the
// platform-specific Payload CLI startup behavior while still applying the
// exact registered versioned migrations to a real disposable PostgreSQL DB.
await run(npxCmd, ["tsx", "scripts/apply-migrations-direct.ts"])
const before = new Set(await readdir("src/migrations"))
await run(npmCmd, ["run", "migrate:check"])
const generated = (await readdir("src/migrations")).filter((name) => !before.has(name) && name.includes("drift_check"))
if (generated.length > 0) throw new Error(`Schema drift detected: ${generated.join(", ")}`)
console.log("[migration-verification] fresh apply, status, and zero-drift generation check passed")
