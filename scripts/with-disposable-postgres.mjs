/**
 * Runs one command against a real, disposable PostgreSQL 16 cluster.
 * Example: node scripts/with-disposable-postgres.mjs npm.cmd run migrate
 */
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { spawn } from "node:child_process"
import { randomBytes } from "node:crypto"
import fs from "node:fs"
import EmbeddedPostgres from "embedded-postgres"

if (fs.existsSync(".env.local")) {
  const lines = fs.readFileSync(".env.local", "utf8").split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eq = trimmed.indexOf("=")
    if (eq > 0) {
      const k = trimmed.slice(0, eq).trim()
      const v = trimmed.slice(eq + 1).trim()
      if (!process.env[k]) process.env[k] = v
    }
  }
}

const command = process.argv[2]
const args = process.argv.slice(3)
if (!command) throw new Error("A command is required.")

const requestedDirectory = process.env.INHERITIX_TEST_PG_REUSE_DIR
const safePrefix = path.resolve(tmpdir(), "inheritix-m3-pg-")
const directory = requestedDirectory ? path.resolve(requestedDirectory) : await mkdtemp(path.join(tmpdir(), "inheritix-m3-pg-"))
if (!directory.startsWith(safePrefix)) throw new Error(`Refusing unexpected database path: ${directory}`)
const reuse = Boolean(requestedDirectory)
const port = Number(process.env.INHERITIX_TEST_PG_PORT || 55439)
if (reuse && !process.env.INHERITIX_TEST_PG_PASSWORD) {
  throw new Error("INHERITIX_TEST_PG_PASSWORD is required when reusing a disposable PostgreSQL directory.")
}
const password = process.env.INHERITIX_TEST_PG_PASSWORD || randomBytes(24).toString("base64url")
const credentialNonce = randomBytes(10).toString("hex")
const adminEmail = `admin-m3-${credentialNonce}@example.test`
const adminPassword = `M3!${randomBytes(24).toString("base64url")}Aa1`
const editorEmail = `editor-m3-${credentialNonce}@example.test`
const editorPassword = `M3!${randomBytes(24).toString("base64url")}Ee1`
const payloadSecret = randomBytes(48).toString("base64url")
const previewSecret = randomBytes(48).toString("base64url")
const emailEncryptionKey = randomBytes(32).toString("base64")
const inquiryIpHashKey = randomBytes(48).toString("base64url")
const database = "inheritix_m3_test"
const pg = new EmbeddedPostgres({
  databaseDir: directory,
  user: "postgres",
  password,
  port,
  persistent: true,
  initdbFlags: ["--encoding=UTF8", "--locale=C"],
  onLog: (message) => process.stdout.write(`[postgres-test] ${String(message)}\n`),
  onError: (message) => process.stderr.write(`[postgres-test] ${String(message)}\n`),
})

let exitCode = 1
try {
  if (!reuse) {
    console.log(`[postgres-test] initializing PostgreSQL 16 on port ${port}`)
    await pg.initialise()
  }
  console.log("[postgres-test] starting server")
  await pg.start()
  if (!reuse) {
    console.log("[postgres-test] creating disposable database")
    await pg.createDatabase(database)
  }
  console.log(`[postgres-test] running ${command} ${args.join(" ")}`)
  const child = spawn(command, args, {
    cwd: process.cwd(),
    stdio: "inherit",
    shell: process.platform === "win32" && (/\.cmd$/i.test(command) || command === "npm" || command === "npx"),
    env: {
      ...process.env,
      DATABASE_URI: `postgresql://postgres:${encodeURIComponent(password)}@127.0.0.1:${port}/${database}`,
      PAYLOAD_SECRET: payloadSecret,
      PREVIEW_SECRET: previewSecret,
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:8443",
      EMAIL_ENCRYPTION_KEY: emailEncryptionKey,
      INQUIRY_IP_HASH_KEY: inquiryIpHashKey,
      INHERITIX_TRUSTED_PROXY_HOPS: "1",
      INHERITIX_ADMIN_EMAIL: adminEmail,
      INHERITIX_ADMIN_PASSWORD: adminPassword,
      INHERITIX_ADMIN_NAME: "Disposable M3 Administrator",
      INHERITIX_EDITOR_EMAIL: editorEmail,
      INHERITIX_EDITOR_PASSWORD: editorPassword,
      INHERITIX_EDITOR_NAME: "Disposable M3 Editor",
      ...(args.includes("build") ? {} : { INHERITIX_ALLOW_INSECURE_LOCAL_SMTP: process.env.INHERITIX_ALLOW_INSECURE_LOCAL_SMTP || "true" }),
    },
  })
  exitCode = await new Promise((resolve, reject) => {
    child.once("error", reject)
    child.once("exit", (code) => resolve(code ?? 1))
  })
} finally {
  if (process.platform === "win32") {
    let pgCtl = null
    try {
      const { createRequire } = await import("node:module")
      const req = createRequire(import.meta.url)
      const winPkg = req.resolve("@embedded-postgres/windows-x64/package.json")
      pgCtl = path.resolve(path.dirname(winPkg), "native/bin/pg_ctl.exe")
    } catch {
      pgCtl = path.resolve("node_modules/@embedded-postgres/windows-x64/native/bin/pg_ctl.exe")
    }
    await new Promise((resolve) => {
      const stop = spawn(pgCtl, ["-D", directory, "stop", "-m", "fast", "-w"], { stdio: "inherit" })
      stop.once("error", () => resolve())
      stop.once("exit", () => resolve())
    })
  } else {
    await pg.stop().catch(() => {})
  }
  const resolved = path.resolve(directory)
  if (!resolved.startsWith(safePrefix)) throw new Error(`Refusing to remove unexpected database path: ${resolved}`)
  if (process.env.INHERITIX_TEST_PG_KEEP === "true") {
    console.log(`[postgres-test] retained ${resolved} for explicit status inspection`)
  } else {
    await new Promise((resolve) => setTimeout(resolve, 3000))
    await rm(resolved, { recursive: true, force: true, maxRetries: 20, retryDelay: 500 }).catch((error) => {
      process.stderr.write(`[postgres-test] cleanup failed: ${error instanceof Error ? error.message : String(error)}\n`)
      exitCode = 1
    })
  }
}
process.exit(exitCode)
