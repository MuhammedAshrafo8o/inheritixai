#!/usr/bin/env node
/**
 * Supervised entry point for the Payload CLI.
 *
 * Console output cannot prove whether command execution has begun: legitimate
 * work may be slow and silent. The child therefore sends an acknowledged IPC
 * signal after module preparation and immediately before invoking bin().
 * Automatic retries are limited to that explicitly pre-execution stage. Once
 * the boundary is crossed, a mutating command is never retried automatically.
 */
import { spawn } from "node:child_process"
import fs from "node:fs"
import { createRequire } from "node:module"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const EXECUTION_BOUNDARY = "payload-cli:execution-boundary"
const self = fileURLToPath(import.meta.url)
const args = process.argv.slice(2)

if (process.env.INHERITIX_PAYLOAD_CHILD === "1") {
  await runPayloadCli()
} else {
  await supervise()
}

function isMutatingCommand(commandArgs) {
  const command = commandArgs[0]
  return !["migrate:status", "generate:types", "generate:importmap"].includes(command)
}

async function supervise() {
  const startupMs = Number(process.env.PAYLOAD_CLI_STARTUP_MS || 45_000)
  const attempts = 3
  const mutating = isMutatingCommand(args)

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const child = spawn(process.execPath, [self, ...args], {
      stdio: ["inherit", "inherit", "inherit", "ipc"],
      env: { ...process.env, INHERITIX_PAYLOAD_CHILD: "1" },
    })
    let stage = "pre-execution"
    let preparationTimedOut = false
    let timer

    child.on("message", (message) => {
      if (message === EXECUTION_BOUNDARY) {
        stage = "execution"
        clearTimeout(timer)
      }
    })

    timer = setTimeout(() => {
      if (stage === "pre-execution") {
        preparationTimedOut = true
        child.kill()
      }
    }, startupMs)

    const { code, signal } = await new Promise((resolve) =>
      child.on("exit", (exitCode, exitSignal) => resolve({ code: exitCode, signal: exitSignal })),
    )
    clearTimeout(timer)

    if (stage === "execution") {
      if (mutating && (code !== 0 || signal)) {
        console.error(
          "Payload command crossed the execution boundary and did not complete successfully. Its database outcome may be indeterminate; do not retry it automatically. Run 'npm run migrate:status' and inspect the database before deciding whether to retry.",
        )
      }
      process.exit(code ?? 1)
    }

    const reason = preparationTimedOut
      ? "pre-execution preparation exceeded " + startupMs / 1000 + "s"
      : "child exited before the execution boundary (code " +
        (code ?? "none") +
        (signal ? ", signal " + signal : "") +
        ")"
    console.error(
      "Payload CLI " +
        reason +
        " — attempt " +
        attempt +
        "/" +
        attempts +
        (attempt < attempts ? "; safe to retry because bin() was not invoked" : "") +
        ".",
    )
  }

  console.error("Payload CLI could not reach the execution boundary after 3 attempts; no CLI command was invoked.")
  process.exit(1)
}

async function signalExecutionBoundary() {
  if (!process.connected || !process.send) {
    throw new Error("Payload CLI child has no IPC channel for the execution-boundary signal.")
  }
  await new Promise((resolve, reject) => {
    process.send(EXECUTION_BOUNDARY, (error) => (error ? reject(error) : resolve()))
  })
}

async function loadPayloadBin() {
  // Test-only injection exercises supervision without loading Payload.
  if (process.env.INHERITIX_PAYLOAD_CLI_TEST_MODULE) {
    if (process.env.NODE_ENV !== "test") {
      throw new Error("INHERITIX_PAYLOAD_CLI_TEST_MODULE is available only with NODE_ENV=test.")
    }
    return import(process.env.INHERITIX_PAYLOAD_CLI_TEST_MODULE)
  }

  const projectRoot = path.resolve(path.dirname(self), "..")
  const payloadDir = fs.realpathSync(path.join(projectRoot, "node_modules", "payload"))
  const payloadUrl = pathToFileURL(payloadDir).href + "/"
  // Same guard as Payload's bin.js: tsx's sync-hooks path is broken on Node >= 23.5.
  const [major, minor] = process.versions.node.split(".").map(Number)
  if (major > 23 || (major === 23 && minor >= 5)) {
    const nodeModule = await import("node:module")
    nodeModule.default.registerHooks = undefined
  }
  const tsxApi = pathToFileURL(createRequire(path.join(payloadDir, "bin.js")).resolve("tsx/esm/api")).href
  const { tsImport } = await import(tsxApi)
  return tsImport("./dist/bin/index.js", payloadUrl)
}

async function runPayloadCli() {
  process.on("unhandledRejection", (error) => {
    console.error(error)
    process.exit(1)
  })
  // Keep the loop alive during preparation so an early event-loop drain is
  // reported as a preparation timeout rather than false success.
  setInterval(() => {}, 1 << 30)

  const { bin } = await loadPayloadBin()
  if (typeof bin !== "function") throw new TypeError("Payload CLI module did not export bin().")

  // This acknowledged signal is independent of stdout/stderr and is sent
  // immediately before command execution can begin.
  await signalExecutionBoundary()
  await bin()
}
