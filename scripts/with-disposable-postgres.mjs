/**
 * Runs one command against a real, disposable PostgreSQL 16 cluster.
 * Example: node scripts/with-disposable-postgres.mjs npm.cmd run migrate
 */
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { spawn } from "node:child_process"
import { randomBytes } from "node:crypto"
import EmbeddedPostgres from "embedded-postgres"

const command = process.argv[2]
const args = process.argv.slice(3)
if (!command) throw new Error("A command is required.")

const requestedDirectory = process.env.INHERITIX_TEST_PG_REUSE_DIR
const safePrefix = path.resolve(tmpdir(), "inheritix-m3-pg-")
const directory = requestedDirectory ? path.resolve(requestedDirectory) : await mkdtemp(path.join(tmpdir(), "inheritix-m3-pg-"))
if (!directory.startsWith(safePrefix)) throw new Error(`Refusing unexpected database path: ${directory}`)
const reuse = Boolean(requestedDirectory)
const port = Number(process.env.INHERITIX_TEST_PG_PORT || 55439)
const password = "local-disposable-only"
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
    shell: process.platform === "win32" && /\.cmd$/i.test(command),
    env: {
      ...process.env,
      DATABASE_URI: `postgresql://postgres:${password}@127.0.0.1:${port}/${database}`,
      PAYLOAD_SECRET: process.env.PAYLOAD_SECRET || "disposable-m3-payload-secret-abcdefghijklmnopqrstuvwxyz",
      PREVIEW_SECRET: process.env.PREVIEW_SECRET || "disposable-m3-preview-secret-abcdefghijklmnopqrstuvwxyz",
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:8443",
      EMAIL_ENCRYPTION_KEY: process.env.EMAIL_ENCRYPTION_KEY || randomBytes(32).toString("base64"),
      INQUIRY_IP_HASH_KEY: process.env.INQUIRY_IP_HASH_KEY || randomBytes(48).toString("base64url"),
      INHERITIX_TRUSTED_PROXY_HOPS: "1",
      INHERITIX_ALLOW_INSECURE_LOCAL_SMTP: "true",
    },
  })
  exitCode = await new Promise((resolve, reject) => {
    child.once("error", reject)
    child.once("exit", (code) => resolve(code ?? 1))
  })
} finally {
  if (process.platform === "win32") {
    const pgCtl = path.resolve("node_modules/@embedded-postgres/windows-x64/native/bin/pg_ctl.exe")
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
