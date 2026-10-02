#!/usr/bin/env node
/**
 * Reliable entry point for the Payload CLI (`npm run migrate`, `seed`, ...).
 *
 * Observed behavior on this project (Payload 3.90.2, tsx 4.22.4, Node 22.16,
 * Windows 11): roughly 1 in 4 invocations of the stock `payload` bin produce
 * no output at all. Without a keep-alive the process then exits with code 0
 * having done nothing (e.g. `migrate` reported success but applied nothing;
 * `generate:types` wrote no file). With a keep-alive the same runs hang.
 * A Node diagnostic report captured from one stalled run showed no sockets
 * and no child processes — only a worker thread — and nothing had been
 * printed, so no database work had started. The root cause has NOT been
 * confirmed; module loading through tsx's loader hooks is a suspicion only.
 *
 * This wrapper runs the CLI in a child process with inherited stdio (TTY
 * prompts keep working). If the child prints nothing within the startup
 * window, it has not touched the database yet, so it is killed and retried
 * (up to 3 attempts). Once output starts, the child's exit code is returned
 * unchanged. A stall is therefore either retried safely or reported as a
 * failure — never a false success or an endless hang.
 */
import { spawn } from "node:child_process"
import fs from "node:fs"
import { createRequire } from "node:module"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const self = fileURLToPath(import.meta.url)
const args = process.argv.slice(2)

if (process.env.INHERITIX_PAYLOAD_CHILD === "1") {
  await runPayloadCli()
} else {
  await supervise()
}

async function supervise() {
  const startupMs = Number(process.env.PAYLOAD_CLI_STARTUP_MS || 45_000)
  const attempts = 3
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const child = spawn(process.execPath, [self, ...args], {
      stdio: ["inherit", "inherit", "inherit", "ipc"],
      env: { ...process.env, INHERITIX_PAYLOAD_CHILD: "1" },
    })
    let started = false
    let stalled = false
    child.on("message", (message) => {
      if (message === "started") started = true
    })
    const timer = setTimeout(() => {
      if (!started) {
        stalled = true
        child.kill()
      }
    }, startupMs)
    const code = await new Promise((resolve) => child.on("exit", (exitCode) => resolve(exitCode)))
    clearTimeout(timer)
    if (!stalled) process.exit(code ?? 1)
    console.error(
      `Payload CLI stalled while loading (no output after ${startupMs / 1000}s, nothing executed) — attempt ${attempt}/${attempts}${attempt < attempts ? ", retrying" : ""}.`,
    )
  }
  console.error("Payload CLI failed to start after 3 attempts.")
  process.exit(1)
}

async function runPayloadCli() {
  // Tell the supervisor the CLI is alive as soon as anything is written.
  for (const stream of [process.stdout, process.stderr]) {
    const write = stream.write.bind(stream)
    stream.write = (...writeArgs) => {
      if (process.connected) process.send?.("started")
      return write(...writeArgs)
    }
  }
  process.on("unhandledRejection", (error) => {
    console.error(error)
    process.exit(1)
  })
  // Payload always finishes with an explicit process.exit(); keep the loop
  // alive until then so a slow loader cannot end the process early.
  setInterval(() => {}, 1 << 30)

  const projectRoot = path.resolve(path.dirname(self), "..")
  const payloadDir = fs.realpathSync(path.join(projectRoot, "node_modules", "payload"))
  const payloadUrl = `${pathToFileURL(payloadDir).href}/`
  // Same guard as Payload's bin.js: tsx's sync-hooks path is broken on Node >= 23.5.
  const [major, minor] = process.versions.node.split(".").map(Number)
  if (major > 23 || (major === 23 && minor >= 5)) {
    const nodeModule = await import("node:module")
    nodeModule.default.registerHooks = undefined
  }
  const tsxApi = pathToFileURL(createRequire(path.join(payloadDir, "bin.js")).resolve("tsx/esm/api")).href
  const { tsImport } = await import(tsxApi)
  const { bin } = await tsImport("./dist/bin/index.js", payloadUrl)
  // bin() reads the command from process.argv[2...], exactly as `payload <cmd>`.
  await bin()
}
