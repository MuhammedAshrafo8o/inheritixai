import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { sql } from "@payloadcms/db-postgres"
import { getPayload } from "payload"
import config from "../src/payload.config"

const statePath = path.join(os.tmpdir(), "inheritix-localized-visibility-before.json")
const mode = process.argv[2]
if (mode !== "capture" && mode !== "verify") {
  throw new Error("Use the capture argument before migration and verify after migration.")
}
const homeColumns = [
  "showcase_section_visible",
  "selected_work_section_visible",
  "selected_work_section_story_card_visible",
  "capabilities_section_visible",
  "products_dark_section_visible",
  "approach_section_visible",
  "perspective_section_visible",
  "insights_section_visible",
] as const
const rowsOf = (result: unknown) =>
  ((result as { rows?: Array<Record<string, unknown>> }).rows ?? result) as Array<Record<string, unknown>>

const payload = await getPayload({ config })
try {
  const shape = rowsOf(
    await payload.db.drizzle.execute(
      sql.raw(
        "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'page_home' AND column_name = 'showcase_section_visible') AS \"shared\"",
      ),
    ),
  )
  const shared = Boolean(shape[0]?.shared)

  if (mode === "capture") {
    assert.equal(shared, true, "capture must run before the localized visibility migration")
    const home = rowsOf(
      await payload.db.drizzle.execute(
        sql.raw(
          "SELECT id, showcase_section_visible, selected_work_section_visible, selected_work_section_story_card_visible, capabilities_section_visible, products_dark_section_visible, approach_section_visible, perspective_section_visible, insights_section_visible FROM page_home ORDER BY id",
        ),
      ),
    )
    const labels = rowsOf(
      await payload.db.drizzle.execute(
        sql.raw("SELECT id, article_cta_visible FROM site_labels ORDER BY id"),
      ),
    )
    fs.writeFileSync(statePath, JSON.stringify({ home, labels }))
    console.log(
      "PASS captured pre-migration visibility state for " +
        home.length +
        " home global(s) and " +
        labels.length +
        " site-label global(s)",
    )
  } else {
    assert.equal(shared, false, "verify must run after the localized visibility migration")
    const expected = JSON.parse(fs.readFileSync(statePath, "utf8")) as {
      home: Array<Record<string, unknown>>
      labels: Array<Record<string, unknown>>
    }
    const home = rowsOf(
      await payload.db.drizzle.execute(
        sql.raw(
          "SELECT _parent_id, _locale, showcase_section_visible, selected_work_section_visible, selected_work_section_story_card_visible, capabilities_section_visible, products_dark_section_visible, approach_section_visible, perspective_section_visible, insights_section_visible FROM page_home_locales ORDER BY _parent_id, _locale",
        ),
      ),
    )
    const labels = rowsOf(
      await payload.db.drizzle.execute(
        sql.raw(
          "SELECT _parent_id, _locale, article_cta_visible FROM site_labels_locales ORDER BY _parent_id, _locale",
        ),
      ),
    )
    for (const source of expected.home) {
      for (const locale of ["en", "ar"]) {
        const localized = home.find(
          (row) => String(row._parent_id) === String(source.id) && row._locale === locale,
        )
        assert.ok(localized, "missing page_home " + locale + " locale row for parent " + source.id)
        for (const column of homeColumns) {
          assert.equal(localized[column], source[column], column + " " + locale)
        }
      }
    }
    for (const source of expected.labels) {
      for (const locale of ["en", "ar"]) {
        const localized = labels.find(
          (row) => String(row._parent_id) === String(source.id) && row._locale === locale,
        )
        assert.ok(localized, "missing site_labels " + locale + " locale row for parent " + source.id)
        assert.equal(
          localized.article_cta_visible,
          source.article_cta_visible,
          "article_cta_visible " + locale,
        )
      }
    }
    fs.rmSync(statePath, { force: true })
    console.log("PASS migration preserved every visibility value in both English and Arabic")
  }
} finally {
  await payload.destroy()
}
