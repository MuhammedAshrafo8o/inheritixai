import { spawn } from "node:child_process"
import { readdir } from "node:fs/promises"

function run(args) {
  return new Promise((resolve, reject) => {
    const child = spawn("npm.cmd", args, { cwd: process.cwd(), stdio: "inherit", shell: true, env: process.env })
    child.once("error", reject)
    child.once("exit", (code) => code === 0 ? resolve() : reject(new Error(`npm ${args.join(" ")} exited ${code}`)))
  })
}

function runNode(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { cwd: process.cwd(), stdio: "inherit", env: process.env })
    child.once("error", reject)
    child.once("exit", (code) => code === 0 ? resolve() : reject(new Error(`node ${args.join(" ")} exited ${code}`)))
  })
}

// The direct adapter entry point is test-only and avoids depending on the
// platform-specific Payload CLI startup behavior while still applying the
// exact registered versioned migrations to a real disposable PostgreSQL DB.
await runNode(["node_modules/.pnpm/tsx@4.22.4/node_modules/tsx/dist/cli.mjs", "scripts/apply-migrations-direct.ts"])
const before = new Set(await readdir("src/migrations"))
await run(["run", "migrate:check"])
const generated = (await readdir("src/migrations")).filter((name) => !before.has(name) && name.includes("drift_check"))
if (generated.length > 0) throw new Error(`Schema drift detected: ${generated.join(", ")}`)
console.log("[migration-verification] fresh apply, status, and zero-drift generation check passed")
