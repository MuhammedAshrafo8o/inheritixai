/**
 * Focused checks for CMS-controlled copy and intentional-empty behavior.
 *
 *   npm run start                      # in another terminal
 *   npm run test:content-controls      # BASE_URL defaults to http://localhost:8443
 *
 * Every value changed here is restored at the end (also on failure). A
 * restoration failure, or a project field that does not match its original
 * value afterwards, fails the run (exit 1) after all cleanup was attempted.
 * Requires PREVIEW_SECRET (project cache invalidation after direct DB edits).
 *
 * The Restoration section also self-verifies the DB helpers: it writes a
 * fixture row containing an apostrophe, an empty string, and NULL using
 * parameterized queries; restores it; and confirms all three values round-trip
 * exactly.  A simulated assertion failure is included to confirm that
 * verifyArLocale() correctly reports ok: false when a mismatch is present.
 */
import { getPayload, type Payload } from "payload"
import config from "../src/payload.config"
import {
  expectOk,
  restoreArLocale,
  runCleanup,
  snapshotArLocale,
  verifyArLocale,
  writeArLocale,
  type CleanupTask,
  type ProjectLocaleSnapshot,
} from "./lib/test-fixtures"

const BASE = (process.env.BASE_URL || "http://localhost:8443").replace(/\/+$/, "")
const RUN = Date.now().toString(36)

type Result = { group: string; check: string; ok: boolean; detail?: string }
const results: Result[] = []
let group = ""
/** Cleanup tasks, most recent first (registered with unshift). */
const restore: CleanupTask[] = []
let payload: Payload | null = null
let projectSnapshot: ProjectLocaleSnapshot | null = null
/** Parent-id used for the restoration self-verification sub-test. */
let selfVerifyParentId: number | null = null

function section(name: string) {
  group = name
  console.log(`\n■ ${name}`)
}
function check(name: string, ok: boolean, detail?: string) {
  results.push({ group, check: name, ok, detail })
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`)
}

async function http(path: string, init: RequestInit & { token?: string } = {}) {
  const headers = new Headers(init.headers)
  if (init.token) headers.set("cookie", `payload-token=${init.token}`)
  headers.set("sec-fetch-site", "same-origin")
  return fetch(`${BASE}${path}`, { ...init, headers, redirect: "manual" })
}
const json = async (res: Response) => (await res.json()) as any
async function page(path: string) {
  const res = await http(path)
  return { status: res.status, html: await res.text(), location: res.headers.get("location") }
}
function send(method: "POST" | "PATCH", path: string, token: string, body: unknown) {
  return http(path, { method, token, headers: { "content-type": "application/json" }, body: JSON.stringify(body) })
}

/** Update a global and register its restoration. */
async function setGlobal(token: string, slug: string, locale: "en" | "ar", patch: Record<string, unknown>) {
  const before = await json(await http(`/api/globals/${slug}?locale=${locale}&depth=0&fallbackLocale=none`, { token }))
  const original = Object.fromEntries(Object.keys(patch).map((k) => [k, before[k] ?? null]))
  restore.unshift({
    label: `restore global ${slug} (${locale})`,
    run: async () => expectOk(await send("POST", `/api/globals/${slug}?locale=${locale}`, token, original), `restore ${slug} (${locale})`),
  })
  const res = await send("POST", `/api/globals/${slug}?locale=${locale}`, token, patch)
  if (res.status !== 200) throw new Error(`update ${slug} failed: HTTP ${res.status} ${await res.text()}`)
  return before
}

/**
 * Direct database edits bypass Payload hooks, so the project pages must be
 * revalidated explicitly. Missing configuration or a rejected request is an
 * error — pages are never inspected (or declared restored) on a stale cache.
 */
async function invalidateProjectCache(slug: string, phase: string) {
  const secret = process.env.PREVIEW_SECRET?.trim()
  if (!secret) {
    throw new Error(`cache invalidation (${phase}) impossible: PREVIEW_SECRET is not set (or blank)`)
  }
  const res = await fetch(`${BASE}/api/cache/projects`, {
    method: "POST",
    headers: { authorization: `Bearer ${secret}`, "content-type": "application/json" },
    body: JSON.stringify({ slug }),
  })
  const text = await res.text()
  let body: { revalidated?: boolean; paths?: string[] } = {}
  try {
    body = JSON.parse(text)
  } catch {
    // reported below
  }
  if (res.status !== 200 || body.revalidated !== true) {
    throw new Error(`cache invalidation (${phase}) rejected: HTTP ${res.status} ${text.slice(0, 200)}`)
  }
  return body.paths ?? []
}

async function main() {
  const email = process.env.INHERITIX_EDITOR_EMAIL
  const password = process.env.INHERITIX_EDITOR_PASSWORD
  const adminEmail = process.env.INHERITIX_ADMIN_EMAIL
  const adminPassword = process.env.INHERITIX_ADMIN_PASSWORD
  if (!email || !password || !adminEmail || !adminPassword) throw new Error("INHERITIX_EDITOR_* and INHERITIX_ADMIN_* must be set")
  const login = async (e: string, p: string) =>
    (await json(await send("POST", "/api/users/login", "", { email: e, password: p }))).token as string
  const E = await login(email, password)
  const A = await login(adminEmail, adminPassword)

  section("Arabic optional content and visibility are independent")
  const labelsEn = await setGlobal(E, "site-labels", "en", {})
  await setGlobal(E, "site-labels", "en", {
    contents: "English contents " + RUN,
    articleCta: {
      ...labelsEn.articleCta,
      visible: true,
      title: "English article CTA " + RUN,
    },
  })
  const labelsAr = await setGlobal(E, "site-labels", "ar", {})
  await setGlobal(E, "site-labels", "ar", {
    contents: "",
    articleCta: { ...labelsAr.articleCta, visible: false },
  })
  const [localizedArticleEn, localizedArticleAr] = await Promise.all([
    page("/insights/software-people-adopt"),
    page("/ar/insights/software-people-adopt"),
  ])
  check(
    "clearing an Arabic optional label does not restore English",
    !localizedArticleAr.html.includes("English contents " + RUN),
  )
  check(
    "clearing an Arabic optional label leaves English unchanged",
    localizedArticleEn.html.includes("English contents " + RUN),
  )
  check(
    "explicit untranslated-record fallback keeps English canonical + noindex",
    localizedArticleAr.html.includes("Business software people actually adopt") &&
      localizedArticleAr.html.includes('name="robots" content="noindex') &&
      localizedArticleAr.html.includes(
        'rel="canonical" href="http://localhost:8443/insights/software-people-adopt"',
      ),
  )
  check(
    "Arabic CTA visibility is independent",
    !localizedArticleAr.html.includes("context-link") &&
      localizedArticleEn.html.includes("English article CTA " + RUN),
  )

  // ── Untranslated record with populated Arabic optional field uses English ──
  payload = await getPayload({ config })
  const db = payload
  const publishedProject = (
    await db.find({
      collection: "projects",
      where: { _status: { equals: "published" } },
      limit: 1,
      locale: "en",
    })
  ).docs[0]
  if (!publishedProject) {
    check("untranslated record with populated Arabic optional field uses English on listing card and detail page", false, "no published project to test with")
  } else {
    const parentId = Number(publishedProject.id)
    selfVerifyParentId = parentId
    const slug = publishedProject.slug
    const snapshot = await snapshotArLocale(db, parentId)
    projectSnapshot = snapshot

    // Registered before mutating; run in reverse order: DB restore, then cache invalidation.
    restore.unshift({
      label: `invalidate project cache after restore (${slug})`,
      run: async () => {
        await invalidateProjectCache(slug, "after restore")
      },
    })
    restore.unshift({
      label: `restore Arabic locale row of project ${slug}`,
      run: () => restoreArLocale(db, snapshot),
    })

    // Untranslated Arabic record (no title) with populated optional Arabic fields.
    await writeArLocale(db, parentId, {
      title: null,
      summary: `Arabic Optional Summary ${RUN}`,
      intro: `Arabic Optional Intro ${RUN}`,
    })
    const invalidated = await invalidateProjectCache(slug, "before inspection")
    check("project cache invalidated before inspection", invalidated.includes(`/ar/projects/${slug}`), invalidated.join(", "))

    const [untransProjectListingAr, untransProjectDetailAr] = await Promise.all([
      page("/ar/projects"),
      page(`/ar/projects/${slug}`),
    ])

    check(
      "untranslated record with populated Arabic optional field uses English on listing card and detail page",
      untransProjectListingAr.html.includes(publishedProject.title || "") &&
        !untransProjectListingAr.html.includes("Arabic Optional Summary " + RUN) &&
        !untransProjectListingAr.html.includes("Arabic Optional Intro " + RUN) &&
        untransProjectDetailAr.html.includes(publishedProject.title || "") &&
        !untransProjectDetailAr.html.includes("Arabic Optional Summary " + RUN) &&
        !untransProjectDetailAr.html.includes("Arabic Optional Intro " + RUN),
      `listing has English title: ${untransProjectListingAr.html.includes(publishedProject.title || "")}, detail has English title: ${untransProjectDetailAr.html.includes(publishedProject.title || "")}`,
    )
  }

  const homeEn = await setGlobal(E, "page-home", "en", {})
  await setGlobal(E, "page-home", "en", {
    insightsSection: {
      ...homeEn.insightsSection,
      visible: true,
      title: "English insights " + RUN,
    },
  })
  const homeAr = await setGlobal(E, "page-home", "ar", {})
  await setGlobal(E, "page-home", "ar", {
    insightsSection: {
      ...homeAr.insightsSection,
      visible: false,
      title: "Arabic hidden insights " + RUN,
    },
  })
  const [localizedHomeEn, localizedHomeAr] = await Promise.all([page("/"), page("/ar")])
  check(
    "hiding an Arabic section leaves the English section visible",
    localizedHomeEn.html.includes("English insights " + RUN) &&
      !localizedHomeAr.html.includes("Arabic hidden insights " + RUN) &&
      !localizedHomeAr.html.includes("English insights " + RUN),
  )

  // ── Site Labels drive previously hardcoded copy ──────────────────────────
  section("Site Labels drive visitor-facing copy")
  const project = (await json(await http("/api/projects?where[_status][equals]=published&limit=1&depth=0"))).docs[0]
  await setGlobal(E, "site-labels", "en", {
    sector: `Industry ${RUN}`,
    relatedProjectsLabel: `Related ${RUN}`,
    contents: `In this article ${RUN}`,
    faqTitle: `Answers ${RUN}`,
    serviceKicker: `Capability ${RUN}`,
    languageToggle: `AR ${RUN}`,
    mainNavigation: `Primary ${RUN}`,
    notFoundTitle: `Nothing here ${RUN}`,
    articleCta: { visible: true, eyebrow: `CTA eyebrow ${RUN}`, title: `CTA title ${RUN}`, label: `CTA label ${RUN}`, href: "/services" },
  })
  if (project) {
    const p = await page(`/projects/${project.slug}`)
    check("project fact label from CMS", p.html.includes(`Industry ${RUN}`) && !p.html.includes(">Sector<"))
  } else {
    check("project fact label from CMS", false, "no published project to inspect")
  }
  const article = await page("/insights/software-people-adopt")
  check("article contents label from CMS", article.html.includes(`In this article ${RUN}`) && !article.html.includes(">CONTENTS<"))
  check(
    "article CTA from CMS (eyebrow, title, label, href)",
    article.html.includes(`CTA eyebrow ${RUN}`) && article.html.includes(`CTA title ${RUN}`) && article.html.includes(`CTA label ${RUN}`) && article.html.includes('href="/services"'),
  )
  check("old hardcoded article CTA absent", !article.html.includes("BUILDING AN OPERATIONAL PRODUCT?"))
  const product = await page("/products/logisttex")
  check("product FAQ title from CMS", product.html.includes(`Answers ${RUN}`) && !product.html.includes("Questions, answered."))
  const service = await page("/services/custom-software")
  check("service kicker from CMS", service.html.includes(`Capability ${RUN}`) && !service.html.includes("SERVICE 01"))
  const home = await page("/")
  check("language switch text + nav aria-label from CMS", home.html.includes(`AR ${RUN}`) && home.html.includes(`aria-label="Primary ${RUN}"`))
  const missing = await page(`/no-such-page-${RUN}`)
  check("404 copy from CMS", missing.status === 404 && missing.html.includes(`Nothing here ${RUN}`) && !missing.html.includes("This page isn’t here."), `HTTP ${missing.status}`)
  const missingAr = await page(`/ar/no-such-page-${RUN}`)
  check("Arabic 404 uses Arabic CMS copy", missingAr.status === 404 && missingAr.html.includes("هذه الصفحة غير موجودة."), `HTTP ${missingAr.status}`)
  const errorCopy = await json(await http("/api/globals/site-labels?locale=ar&depth=0"))
  check("500 copy available to the client error view (AR)", errorCopy.errorTitle === "تعذر تحميل هذه الصفحة." && Boolean(errorCopy.errorRetry))

  // ── Intentionally empty content stays empty ──────────────────────────────
  section("Cleared fields hide elements without fallback text")
  await setGlobal(E, "site-labels", "en", {
    contents: "",
    relatedProjectsLabel: "",
    relatedProjectsTitle: "",
    articleCta: { visible: false },
  })
  const article2 = await page("/insights/software-people-adopt")
  check("cleared contents label → no label, no 'CONTENTS'", !article2.html.includes("In this article") && !article2.html.includes(">CONTENTS<"))
  check("article CTA hidden when switched off", !article2.html.includes("context-link") && !article2.html.includes("BUILDING AN OPERATIONAL PRODUCT?"))

  const svc = (await json(await http("/api/services?where[slug][equals]=custom-software&depth=0&locale=en", { token: E }))).docs[0]
  restore.unshift({
    label: "restore service custom-software (en)",
    run: async () =>
      expectOk(
        await send("PATCH", `/api/services/${svc.id}?locale=en`, E, {
          problemHeading: svc.problemHeading,
          problemDescription: svc.problemDescription,
          _status: "published",
        }),
        "restore service custom-software",
      ),
  })
  await send("PATCH", `/api/services/${svc.id}?locale=en`, E, { problemHeading: "", problemDescription: "", _status: "published" })
  const service2 = await page("/services/custom-software")
  check("cleared service problem section hidden (and its nav link)", !service2.html.includes('id="problem"') && !service2.html.includes('href="#problem"'))
  check("no fallback problem copy reappears", !service2.html.includes("Complexity should serve the business"))

  const prod = (await json(await http("/api/products?where[slug][equals]=logisttex&depth=0&locale=en", { token: E }))).docs[0]
  restore.unshift({
    label: "restore product logisttex (en)",
    run: async () =>
      expectOk(
        await send("PATCH", `/api/products/${prod.id}?locale=en`, E, { workflowTitle: prod.workflowTitle, tourTitle: prod.tourTitle, _status: "published" }),
        "restore product logisttex",
      ),
  })
  await send("PATCH", `/api/products/${prod.id}?locale=en`, E, { workflowTitle: "", tourTitle: "", _status: "published" })
  const product2 = await page("/products/logisttex")
  check("cleared product workflow/tour titles stay empty", !product2.html.includes("From order to proof of delivery.") && !product2.html.includes("Operational visibility without the noise."))

  await setGlobal(E, "page-about", "en", { manifestoTitle: "", manifestoEyebrow: "" })
  const about = await page("/about")
  check("cleared About manifesto title/eyebrow stay empty", !about.html.includes("Software should respect the people") && !about.html.includes("WHAT WE BELIEVE"))

  const homeDoc = await setGlobal(E, "page-home", "en", {})
  await setGlobal(E, "page-home", "en", { heroPrimaryCta: { ...homeDoc.heroPrimaryCta, label: "" } })
  const home2 = await page("/")
  const heroStart = home2.html.indexOf('<div class="hero-links">')
  const heroLinks = heroStart >= 0 ? home2.html.slice(heroStart, home2.html.indexOf("</div>", heroStart)) : ""
  check(
    "cleared hero CTA label → CTA hidden (no Site Label fallback)",
    !heroLinks.includes('href="/projects"') && !heroLinks.includes("Explore Our Work"),
  )

  const listing = await setGlobal(E, "listing-pages", "en", {})
  await setGlobal(E, "listing-pages", "en", { services: { ...listing.services, cardNote: "" } })
  const services = await page("/services")
  check("cleared service card note → sentence gone", !services.html.includes("We map the real constraints"))

  // ── Contact form copy and choices ────────────────────────────────────────
  section("Contact form copy from CMS")
  const contact = await setGlobal(E, "page-contact", "en", {})
  await setGlobal(E, "page-contact", "en", { form: { ...contact.form, submitLabel: `Send it ${RUN}`, nameLabel: `Your full name ${RUN}` } })
  const contactPage = await page("/contact")
  check("form labels from CMS", contactPage.html.includes(`Send it ${RUN}`) && contactPage.html.includes(`Your full name ${RUN}`))
  check("service choices are published service titles", contactPage.html.includes(">ERP &amp; business systems<") && !contactPage.html.includes(">ERP / business system<"))
  const contactAr = await page("/ar/contact")
  check("Arabic form copy", contactAr.html.includes("إرسال الاستفسار") && contactAr.html.includes("الاسم الكامل"))

  // ── Redirect status codes ────────────────────────────────────────────────
  section("Redirect status codes")
  const bad = await send("POST", "/api/redirects", A, { from: `/r301-${RUN}`, to: "/about", statusCode: "301" })
  check("301 no longer accepted", bad.status === 400, `HTTP ${bad.status}`)
  for (const code of ["307", "308"] as const) {
    const res = await send("POST", "/api/redirects", A, { from: `/r${code}-${RUN}`, to: "/about", statusCode: code })
    const created = (await json(res)).doc
    if (created?.id) {
      restore.unshift({
        label: `delete test redirect ${code}`,
        run: async () => expectOk(await http(`/api/redirects/${created.id}`, { method: "DELETE", token: A }), `delete redirect ${created.id}`),
      })
    }
    const hit = await page(`/r${code}-${RUN}`)
    check(`stored ${code} served as ${code}`, hit.status === Number(code) && hit.location?.endsWith("/about") === true, `HTTP ${hit.status} → ${hit.location}`)
  }
  const legacy = await page("/legacy-301-test")
  check("legacy 301 row migrated to 308", legacy.status === 308, `HTTP ${legacy.status}`)
}

try {
  await main()
} catch (error) {
  check("unexpected error", false, error instanceof Error ? error.stack : String(error))
} finally {
  section("Restoration")
  // Every task is attempted even if earlier ones fail; each failure fails the run.
  const failures = await runCleanup(restore)
  for (const failure of failures) {
    check(`cleanup: ${failure.label}`, false, failure.error instanceof Error ? failure.error.message : String(failure.error))
  }
  check("all cleanup operations succeeded", failures.length === 0, `${restore.length - failures.length}/${restore.length} succeeded`)
  if (payload && projectSnapshot) {
    const verified = await verifyArLocale(payload, projectSnapshot)
    check("project Arabic locale fields match their original values (every column)", verified.ok, verified.detail)
  }

  // ── Restoration self-verification ─────────────────────────────────────────
  // Exercises writeArLocale / restoreArLocale / verifyArLocale with values that
  // require correct parameterization: an apostrophe, an empty string, and NULL.
  // Also confirms that verifyArLocale reports ok:false on a deliberate mismatch.
  if (payload && selfVerifyParentId !== null) {
    const svPayload = payload
    const svParentId = selfVerifyParentId
    // Snapshot the current state so we can leave the row exactly as we found it.
    const svInitialSnapshot = await snapshotArLocale(svPayload, svParentId)
    let svCleanedUp = false
    const svCleanup = async () => {
      if (!svCleanedUp) {
        svCleanedUp = true
        await restoreArLocale(svPayload, svInitialSnapshot)
      }
    }
    try {
      // Write a fixture row with the three problem value types.
      await writeArLocale(svPayload, svParentId, {
        title: "O'Brien project",
        summary: "",
        intro: null,
      })
      const svSnapshot = await snapshotArLocale(svPayload, svParentId)

      // Overwrite with different values, then restore from snapshot.
      await writeArLocale(svPayload, svParentId, {
        title: "different title",
        summary: "different summary",
        intro: "different intro",
      })
      await restoreArLocale(svPayload, svSnapshot)
      const svVerified = await verifyArLocale(svPayload, svSnapshot)
      check(
        "restoration self-verification: apostrophe, empty string, and NULL round-trip through parameterized restore",
        svVerified.ok,
        svVerified.detail,
      )

      // Simulate a mismatch: write values that differ from the snapshot and do
      // NOT restore — verifyArLocale must return ok: false.
      await writeArLocale(svPayload, svParentId, {
        title: "mismatch title",
        summary: "mismatch summary",
        intro: "mismatch intro",
      })
      const svMismatch = await verifyArLocale(svPayload, svSnapshot)
      check(
        "restoration self-verification: simulated mismatch is correctly detected",
        !svMismatch.ok,
        svMismatch.detail,
      )
    } catch (svError) {
      check(
        "restoration self-verification: apostrophe, empty string, and NULL round-trip through parameterized restore",
        false,
        svError instanceof Error ? svError.message : String(svError),
      )
    } finally {
      await svCleanup()
    }
  }

  const after = await page("/insights/software-people-adopt")
  check("article CTA and contents label restored", after.html.includes("BUILDING AN OPERATIONAL PRODUCT?") && after.html.includes(">CONTENTS<"))
}

const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length} passed, ${failed.length} failed (run ${RUN})`)
process.exit(failed.length ? 1 : 0)

export {}
