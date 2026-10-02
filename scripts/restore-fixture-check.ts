/**
 * Self-test for the cleanup used by content-controls-check.ts.
 *
 *   npm run test:restore-fixtures      # database only; no web server needed
 *
 * For original Arabic project values containing an apostrophe, an empty
 * string, NULL, and for a missing Arabic row, it mutates the row, throws a
 * simulated assertion failure, runs the same cleanup path, and verifies every
 * column matches the original. It also proves the cleanup runner keeps going
 * after a failing task and reports that failure. The project's real Arabic
 * row is snapshotted first and restored (and verified) at the end.
 */
import { getPayload } from "payload"
import config from "../src/payload.config"
import {
  deleteArLocale,
  restoreArLocale,
  runCleanup,
  snapshotArLocale,
  verifyArLocale,
  writeArLocale,
  type ProjectLocaleFields,
} from "./lib/test-fixtures"

const results: Array<{ name: string; ok: boolean; detail?: string }> = []
function check(name: string, ok: boolean, detail?: string) {
  results.push({ name, ok, detail })
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`)
}

const payload = await getPayload({ config })
const project = (
  await payload.find({ collection: "projects", where: { _status: { equals: "published" } }, limit: 1, depth: 0 })
).docs[0]
if (!project) {
  console.error("No published project available for the fixture test.")
  process.exit(1)
}
const parentId = Number(project.id)
const realSnapshot = await snapshotArLocale(payload, parentId)
console.log(`Project ${project.slug} (id ${parentId}); real Arabic row ${realSnapshot.row ? "present" : "absent"} — snapshotted.`)

type Scenario = { name: string; original: ProjectLocaleFields | null }
const scenarios: Scenario[] = [
  { name: "apostrophes + empty string + NULL", original: { title: "O'Brien's “quoted” project", summary: "", intro: null } },
  { name: "NULL title, SQL-like text, empty intro", original: { title: null, summary: "it's ''double''; DROP TABLE x; --", intro: "" } },
  { name: "all empty strings", original: { title: "", summary: "", intro: "" } },
  { name: "all NULL", original: { title: null, summary: null, intro: null } },
  { name: "no Arabic row", original: null },
]

const mutated: ProjectLocaleFields = { title: null, summary: "MUTATED summary", intro: "MUTATED intro" }

try {
  console.log("\n■ Restoration after a simulated assertion failure")
  for (const scenario of scenarios) {
    // Arrange: make the scenario's values the "original" state.
    if (scenario.original) await writeArLocale(payload, parentId, scenario.original)
    else await deleteArLocale(payload, parentId)
    const original = await snapshotArLocale(payload, parentId)

    const stored = original.row
    const exact = scenario.original
      ? stored?.title === scenario.original.title &&
        stored?.summary === scenario.original.summary &&
        stored?.intro === scenario.original.intro
      : stored === null
    check(`${scenario.name}: original stored exactly (parameterized write)`, exact, JSON.stringify(stored && { title: stored.title, summary: stored.summary, intro: stored.intro }))

    // Act: mutate, then fail mid-test exactly like a failing check would.
    let simulated = false
    try {
      await writeArLocale(payload, parentId, mutated)
      throw new Error("simulated assertion failure")
    } catch (error) {
      simulated = error instanceof Error && error.message === "simulated assertion failure"
    } finally {
      const failures = await runCleanup([{ label: "restore Arabic row", run: () => restoreArLocale(payload, original) }])
      check(`${scenario.name}: cleanup ran after the simulated failure`, simulated && failures.length === 0, failures.map((f) => String(f.error)).join("; "))
    }

    const verified = await verifyArLocale(payload, original)
    check(`${scenario.name}: every column matches the original`, verified.ok, verified.detail)
  }

  // An existing row deleted mid-test must come back with every column (incl. id).
  await writeArLocale(payload, parentId, { title: "Rock 'n' roll", summary: "", intro: null })
  const beforeDelete = await snapshotArLocale(payload, parentId)
  let simulatedDelete = false
  try {
    await deleteArLocale(payload, parentId)
    throw new Error("simulated assertion failure")
  } catch (error) {
    simulatedDelete = error instanceof Error && error.message === "simulated assertion failure"
  } finally {
    const failures = await runCleanup([{ label: "restore deleted Arabic row", run: () => restoreArLocale(payload, beforeDelete) }])
    check("row deleted mid-test: cleanup ran after the simulated failure", simulatedDelete && failures.length === 0, failures.map((f) => String(f.error)).join("; "))
  }
  const reinserted = await verifyArLocale(payload, beforeDelete)
  check("row deleted mid-test: re-inserted with every column (incl. id) matching", reinserted.ok, `id ${beforeDelete.row?.id} — ${reinserted.detail}`)

  console.log("\n■ Cleanup runner")
  const ran: string[] = []
  const failures = await runCleanup([
    { label: "first", run: async () => void ran.push("first") },
    {
      label: "failing restore",
      run: async () => {
        ran.push("failing")
        throw new Error("simulated restoration failure")
      },
    },
    { label: "last", run: async () => void ran.push("last") },
  ])
  check("remaining cleanup still runs after a failing task", ran.join(",") === "first,failing,last", ran.join(","))
  check(
    "the failing task is reported (and would fail the run)",
    failures.length === 1 && failures[0]!.label === "failing restore",
    failures.map((f) => `${f.label}: ${f.error instanceof Error ? f.error.message : f.error}`).join("; "),
  )
} catch (error) {
  check("unexpected error", false, error instanceof Error ? error.stack : String(error))
} finally {
  console.log("\n■ Real data")
  const failures = await runCleanup([{ label: "restore real Arabic row", run: () => restoreArLocale(payload, realSnapshot) }])
  check("real Arabic row restore succeeded", failures.length === 0, failures.map((f) => String(f.error)).join("; "))
  const verified = await verifyArLocale(payload, realSnapshot)
  check("real Arabic row matches its snapshot (every column)", verified.ok, verified.detail)
}

const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length} passed, ${failed.length} failed`)
process.exit(failed.length ? 1 : 0)
