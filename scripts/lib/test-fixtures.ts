/**
 * Test-only helpers shared by the content checks.
 *
 * - Project Arabic-locale fixture: snapshot / write / restore / verify the
 *   `projects_locales` row for locale `ar`, using parameterized SQL only
 *   (values are bound, never interpolated), so apostrophes, empty strings and
 *   NULL round-trip exactly.
 * - Cleanup runner: runs every cleanup task even when earlier ones fail and
 *   reports each failure, so the caller can fail the process.
 */
import { sql } from "@payloadcms/db-postgres"
import type { Payload } from "payload"

export type ProjectLocaleFields = {
  title: string | null
  summary: string | null
  intro: string | null
}

/** Full `projects_locales` row (all columns, as JSON) or null when no Arabic row exists. */
export type ProjectLocaleSnapshot = {
  parentId: number
  row: Record<string, unknown> | null
}

type Row = Record<string, unknown>

function rowsOf(result: unknown): Row[] {
  const withRows = result as { rows?: Row[] }
  return Array.isArray(withRows?.rows) ? withRows.rows : (result as Row[])
}

async function execute(payload: Payload, query: ReturnType<typeof sql>) {
  return rowsOf(await payload.db.drizzle.execute(query))
}

export async function snapshotArLocale(payload: Payload, parentId: number): Promise<ProjectLocaleSnapshot> {
  const rows = await execute(
    payload,
    sql`SELECT to_jsonb(pl) AS row FROM projects_locales pl WHERE pl._parent_id = ${parentId} AND pl._locale = 'ar'`,
  )
  if (rows.length > 1) throw new Error(`expected at most one Arabic locale row for project ${parentId}, found ${rows.length}`)
  return { parentId, row: (rows[0]?.row as Row | undefined) ?? null }
}

/** Sets title/summary/intro of the Arabic row, creating the row when absent. */
export async function writeArLocale(payload: Payload, parentId: number, fields: ProjectLocaleFields) {
  const updated = await execute(
    payload,
    sql`UPDATE projects_locales
        SET title = ${fields.title}, summary = ${fields.summary}, intro = ${fields.intro}
        WHERE _parent_id = ${parentId} AND _locale = 'ar'
        RETURNING id`,
  )
  if (updated.length === 0) {
    await execute(
      payload,
      sql`INSERT INTO projects_locales (_parent_id, _locale, title, summary, intro)
          VALUES (${parentId}, 'ar', ${fields.title}, ${fields.summary}, ${fields.intro})`,
    )
  }
}

export async function deleteArLocale(payload: Payload, parentId: number) {
  await execute(payload, sql`DELETE FROM projects_locales WHERE _parent_id = ${parentId} AND _locale = 'ar'`)
}

const fieldValue = (row: Row, key: keyof ProjectLocaleFields) => {
  const value = row[key]
  if (value === null || typeof value === "string") return value
  throw new Error(`unexpected ${key} value in snapshot: ${JSON.stringify(value)}`)
}

/** Puts the Arabic row back exactly as snapshotted (or removes it if it did not exist). */
export async function restoreArLocale(payload: Payload, snapshot: ProjectLocaleSnapshot) {
  if (!snapshot.row) {
    await deleteArLocale(payload, snapshot.parentId)
    return
  }
  const updated = await execute(
    payload,
    sql`UPDATE projects_locales
        SET title = ${fieldValue(snapshot.row, "title")},
            summary = ${fieldValue(snapshot.row, "summary")},
            intro = ${fieldValue(snapshot.row, "intro")}
        WHERE _parent_id = ${snapshot.parentId} AND _locale = 'ar'
        RETURNING id`,
  )
  if (updated.length === 1) return
  if (updated.length > 1) {
    throw new Error(`restore updated ${updated.length} Arabic rows for project ${snapshot.parentId}; expected 1`)
  }
  // The row was removed meanwhile: re-insert the complete original row (all
  // columns, including its id) from the snapshot, passed as a bound JSON value.
  await execute(
    payload,
    sql`INSERT INTO projects_locales
        SELECT * FROM jsonb_populate_record(NULL::projects_locales, ${JSON.stringify(snapshot.row)}::jsonb)`,
  )
}

function stable(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`
  const entries = Object.entries(value as Row).sort(([a], [b]) => a.localeCompare(b))
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stable(v)}`).join(",")}}`
}

/** Compares the current row (every column) with the snapshot. */
export async function verifyArLocale(payload: Payload, snapshot: ProjectLocaleSnapshot) {
  const current = await snapshotArLocale(payload, snapshot.parentId)
  const ok = stable(current.row) === stable(snapshot.row)
  const pick = (row: Row | null) =>
    row ? { title: row.title, summary: row.summary, intro: row.intro } : "no Arabic row"
  return {
    ok,
    current,
    detail: ok
      ? `matches original: ${JSON.stringify(pick(snapshot.row))}`
      : `expected ${JSON.stringify(pick(snapshot.row))}, found ${JSON.stringify(pick(current.row))}`,
  }
}

export type CleanupTask = { label: string; run: () => Promise<void> }
export type CleanupFailure = { label: string; error: unknown }

/** Runs every task in order; a failing task never stops the remaining ones. */
export async function runCleanup(tasks: CleanupTask[]): Promise<CleanupFailure[]> {
  const failures: CleanupFailure[] = []
  for (const task of tasks) {
    try {
      await task.run()
    } catch (error) {
      failures.push({ label: task.label, error })
    }
  }
  return failures
}

/** Throws unless the HTTP response is 2xx (used by cleanup tasks). */
export async function expectOk(res: Response, label: string) {
  if (!res.ok) throw new Error(`${label}: HTTP ${res.status} ${(await res.text()).slice(0, 300)}`)
}
