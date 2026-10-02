import assert from "node:assert/strict"
import { spawn } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const scriptsDir = path.dirname(fileURLToPath(import.meta.url))
const wrapper = path.join(scriptsDir, "payload.mjs")
const fixture = pathToFileURL(path.join(scriptsDir, "fixtures", "payload-cli-fixture.mjs")).href
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "inheritix-payload-wrapper-"))

function run(scenario, command = "migrate") {
  const counter = path.join(tempDir, scenario + ".log")
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [wrapper, command], {
      windowsHide: true,
      env: {
        ...process.env,
        NODE_ENV: "test",
        PAYLOAD_CLI_STARTUP_MS: "120",
        PAYLOAD_WRAPPER_FIXTURE_DELAY_MS: "360",
        PAYLOAD_WRAPPER_FIXTURE_ACK_DELAY_MS: "180",
        PAYLOAD_WRAPPER_FIXTURE_SCENARIO: scenario,
        PAYLOAD_WRAPPER_FIXTURE_COUNTER: counter,
        INHERITIX_PAYLOAD_CLI_TEST_MODULE: fixture,
      },
      stdio: ["ignore", "pipe", "pipe"],
    })
    let stdout = ""
    let stderr = ""
    child.stdout.on("data", (chunk) => (stdout += chunk))
    child.stderr.on("data", (chunk) => (stderr += chunk))
    child.on("exit", (code) => {
      const events = fs.existsSync(counter)
        ? fs.readFileSync(counter, "utf8").trim().split(/\r?\n/).filter(Boolean)
        : []
      resolve({ code, stdout, stderr, events })
    })
  })
}

try {
  const silent = await run("silent-execution")
  assert.equal(silent.code, 0)
  assert.equal(silent.events.filter((event) => event === "execute").length, 1)
  assert.doesNotMatch(silent.stderr, /retry/i)
  console.log("PASS slow, silent execution crosses the boundary and runs exactly once")

  const preExecution = await run("pre-execution-stall")
  assert.equal(preExecution.code, 1)
  assert.equal(preExecution.events.filter((event) => event === "load").length, 3)
  assert.equal(preExecution.events.filter((event) => event === "execute").length, 0)
  assert.match(preExecution.stderr, /safe to retry because bin\(\) was not invoked/)
  console.log("PASS retries are limited to the identified pre-execution preparation stage")

  const delayedAck = await run("delayed-acknowledgment")
  assert.equal(delayedAck.code, 0)
  assert.equal(delayedAck.events.filter((event) => event === "execute").length, 1)
  assert.doesNotMatch(delayedAck.stderr, /retry/i)
  console.log("PASS delayed acknowledgment near preparation timeout cancels the timer and executes safely")

  const failed = await run("execution-failure")
  assert.equal(failed.code, 1)
  assert.equal(failed.events.filter((event) => event === "execute").length, 1)
  assert.match(failed.stderr, /outcome may be indeterminate/)
  assert.match(failed.stderr, /npm run migrate:status/)
  console.log("PASS a mutating failure after the boundary is not retried and requires a status check")
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true })
}

