import fs from "node:fs"
import { setTimeout as delay } from "node:timers/promises"

const scenario = process.env.PAYLOAD_WRAPPER_FIXTURE_SCENARIO
const counter = process.env.PAYLOAD_WRAPPER_FIXTURE_COUNTER

if (counter) fs.appendFileSync(counter, "load\n")

if (scenario === "pre-execution-stall") {
  await delay(Number(process.env.PAYLOAD_WRAPPER_FIXTURE_DELAY_MS || 250))
}

export async function bin() {
  if (counter) fs.appendFileSync(counter, "execute\n")
  if (scenario === "silent-execution") {
    await delay(Number(process.env.PAYLOAD_WRAPPER_FIXTURE_DELAY_MS || 250))
    process.exit(0)
  }
  if (scenario === "execution-failure") throw new Error("fixture failure after execution boundary")
  process.exit(0)
}
