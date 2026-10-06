import { spawn } from "node:child_process"

const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm"
const npxCmd = process.platform === "win32" ? "npx.cmd" : "npx"

function run(cmd, args, envOverrides = {}) {
  return new Promise((resolve, reject) => {
    const env = { ...process.env, ...envOverrides }
    for (const [key, val] of Object.entries(envOverrides)) {
      if (val === undefined || val === null || val === "") delete env[key]
    }
    const child = spawn(cmd, args, { cwd: process.cwd(), stdio: ["ignore", "inherit", "inherit"], shell: process.platform === "win32", env })
    child.once("error", reject)
    child.once("exit", (code) => code === 0 ? resolve() : reject(new Error(`${cmd} ${args.join(" ")} exited ${code}`)))
  })
}

console.log("[build-verification] migrating and seeding disposable database for build...")
await run(npxCmd, ["tsx", "scripts/apply-migrations-direct.ts"])
await run(npxCmd, ["tsx", "scripts/seed.ts"])

console.log("[build-verification] executing next build without insecure local smtp flag...")
await run(npmCmd, ["run", "build"], { INHERITIX_ALLOW_INSECURE_LOCAL_SMTP: "" })
console.log("[build-verification] production build completed successfully")
