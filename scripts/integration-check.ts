/**
 * Database-backed integration checks against a running Inheritix server.
 *
 *   npm run start                      # in another terminal (or npm run dev)
 *   npm run test:integration           # BASE_URL defaults to http://localhost:8443
 *
 * Exercises the real REST API (the same endpoints the admin UI uses) and the
 * public website over HTTP. Credentials come from INHERITIX_ADMIN_* and
 * INHERITIX_EDITOR_* in the environment; nothing secret is printed.
 * Each run uses unique slugs, so it can be repeated against the same database.
 */
import sharp from "sharp"

const BASE = (process.env.BASE_URL || "http://localhost:8443").replace(/\/+$/, "")
const RUN = Date.now().toString(36)

type Result = { workflow: string; check: string; ok: boolean; detail?: string }
const results: Result[] = []
let currentWorkflow = ""

function workflow(name: string) {
  currentWorkflow = name
  console.log(`\n■ ${name}`)
}

function check(check: string, ok: boolean, detail?: string) {
  results.push({ workflow: currentWorkflow, check, ok, detail })
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${check}${detail ? ` — ${detail}` : ""}`)
  return ok
}

/**
 * Requests behave like a same-origin browser (Payload's CSRF guard only accepts
 * cookie auth with an allowed Origin or Sec-Fetch-Site of same-origin/none).
 */
async function http(
  path: string,
  init: RequestInit & { token?: string; cookies?: string[]; site?: "same-origin" | "cross-site" } = {},
) {
  const headers = new Headers(init.headers)
  const cookies = [...(init.cookies ?? [])]
  if (init.token) cookies.push(`payload-token=${init.token}`)
  if (cookies.length) headers.set("cookie", cookies.join("; "))
  headers.set("sec-fetch-site", init.site ?? "same-origin")
  return fetch(`${BASE}${path}`, { ...init, headers, redirect: "manual" })
}

async function json<T = any>(res: Response): Promise<T> {
  const text = await res.text()
  try {
    return JSON.parse(text) as T
  } catch {
    throw new Error(`Expected JSON from ${res.url} (${res.status}): ${text.slice(0, 200)}`)
  }
}

async function login(email: string, password: string) {
  const res = await http("/api/users/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  })
  const body = await json(res)
  return { status: res.status, token: body.token as string | undefined, user: body.user }
}

async function png(color: string, label: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="100%" height="100%" fill="${color}"/><text x="60" y="440" font-size="96" font-family="Arial" fill="#fff">${label}</text></svg>`
  return sharp(Buffer.from(svg)).png().toBuffer()
}

async function upload(token: string, file: Buffer, filename: string, alt: string, mime = "image/png") {
  const form = new FormData()
  form.append("file", new Blob([new Uint8Array(file)], { type: mime }), filename)
  form.append("_payload", JSON.stringify({ alt }))
  const res = await http("/api/media?locale=en", { method: "POST", body: form, token })
  const body = await json(res)
  return { status: res.status, doc: body.doc }
}

function lexical(...parts: Array<string | { bold: string } | { list: string[] }>) {
  const text = (t: string, format = 0) => ({ type: "text", text: t, format, detail: 0, mode: "normal", style: "", version: 1 })
  return {
    root: {
      type: "root", direction: "ltr", format: "", indent: 0, version: 1,
      children: parts.map((p) =>
        typeof p === "string"
          ? { type: "paragraph", children: [text(p)], direction: "ltr", format: "", indent: 0, version: 1, textFormat: 0, textStyle: "" }
          : "bold" in p
            ? { type: "paragraph", children: [text(p.bold, 1)], direction: "ltr", format: "", indent: 0, version: 1, textFormat: 1, textStyle: "" }
            : {
                type: "list", listType: "bullet", tag: "ul", start: 1, direction: "ltr", format: "", indent: 0, version: 1,
                children: p.list.map((item, i) => ({ type: "listitem", value: i + 1, children: [text(item)], direction: "ltr", format: "", indent: 0, version: 1 })),
              },
      ),
    },
  }
}

async function page(path: string, opts: { cookies?: string[]; token?: string; site?: "same-origin" | "cross-site" } = {}) {
  const res = await http(path, opts)
  return { status: res.status, html: await res.text(), location: res.headers.get("location") }
}

const order = (html: string, a: string, b: string) => html.indexOf(a) > -1 && html.indexOf(a) < html.indexOf(b)

async function main() {
  const adminEmail = process.env.INHERITIX_ADMIN_EMAIL
  const adminPassword = process.env.INHERITIX_ADMIN_PASSWORD
  const editorEmail = process.env.INHERITIX_EDITOR_EMAIL
  const editorPassword = process.env.INHERITIX_EDITOR_PASSWORD
  if (!adminEmail || !adminPassword || !editorEmail || !editorPassword) {
    throw new Error("INHERITIX_ADMIN_* and INHERITIX_EDITOR_* must be set (see .env.local).")
  }

  // ── 1. Authentication and permissions ────────────────────────────────────
  workflow("Admin and editor login and permissions")
  const admin = await login(adminEmail, adminPassword)
  check("admin login succeeds", admin.status === 200 && Boolean(admin.token), `HTTP ${admin.status}, roles=${admin.user?.roles}`)
  const editor = await login(editorEmail, editorPassword)
  check("editor login succeeds", editor.status === 200 && Boolean(editor.token), `HTTP ${editor.status}, roles=${editor.user?.roles}`)
  const wrong = await login(editorEmail, `${editorPassword}x`)
  check("wrong password rejected", wrong.status === 401, `HTTP ${wrong.status}`)
  const legacy = await login("admin@inheritixai.com", "InheritixAdmin2026!")
  check("legacy published default password rejected", legacy.status === 401, `HTTP ${legacy.status}`)
  const A = admin.token!
  const E = editor.token!

  const editorUsers = await json(await http("/api/users?limit=50", { token: E }))
  check("editor can only read own user record", editorUsers.totalDocs === 1 && editorUsers.docs[0]?.email === editorEmail, `sees ${editorUsers.totalDocs}`)
  const editorCreatesUser = await http("/api/users", {
    method: "POST", token: E, headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: `x-${RUN}@example.com`, password: "Zz9!long-enough-pass", name: "x", roles: ["admin"] }),
  })
  check("editor cannot create users", editorCreatesUser.status === 403, `HTTP ${editorCreatesUser.status}`)
  const self = editorUsers.docs[0]
  const escalate = await http(`/api/users/${self.id}`, {
    method: "PATCH", token: E, headers: { "content-type": "application/json" }, body: JSON.stringify({ roles: ["admin"] }),
  })
  const afterEscalate = await json(await http(`/api/users/${self.id}`, { token: A }))
  check("editor cannot grant themselves admin", !afterEscalate.roles?.includes("admin"), `PATCH HTTP ${escalate.status}, roles now ${afterEscalate.roles}`)
  const weak = await http("/api/users", {
    method: "POST", token: A, headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: `weak-${RUN}@example.com`, password: "InheritixAdmin2026!", name: "weak", roles: ["editor"] }),
  })
  check("admin cannot set a published default password", weak.status === 400, `HTTP ${weak.status}`)
  const adminUsers = await json(await http("/api/users?limit=50", { token: A }))
  check("admin can list all users", adminUsers.totalDocs >= 2, `sees ${adminUsers.totalDocs}`)
  const anonDraftList = await json(await http("/api/projects?draft=true&limit=100"))
  check("anonymous REST sees no draft projects", anonDraftList.docs.every((d: any) => d._status === "published"), `${anonDraftList.totalDocs} visible`)

  // ── 2. Client creation and logo upload ───────────────────────────────────
  workflow("Client creation and logo upload")
  const logo = await upload(E, await png("#0178B2", `Client ${RUN}`), `client-logo-${RUN}.png`, `Client ${RUN} logo`)
  check("editor uploads logo to media", logo.status === 201 && Boolean(logo.doc?.url), `HTTP ${logo.status} ${logo.doc?.url ?? ""}`)
  const logoFile = logo.doc?.url ? await fetch(logo.doc.url.startsWith("http") ? logo.doc.url : `${BASE}${logo.doc.url}`) : null
  check("uploaded logo is served", logoFile?.status === 200 && (logoFile.headers.get("content-type") ?? "").startsWith("image/"), `HTTP ${logoFile?.status}`)
  check("thumbnail/card sizes generated", Boolean(logo.doc?.sizes?.thumbnail?.url && logo.doc?.sizes?.card?.url))
  const clientRes = await http("/api/clients?locale=en", {
    method: "POST", token: E, headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: `Northwind ${RUN}`, logo: logo.doc.id, logoDescription: "Blue wordmark", website: "https://example.com" }),
  })
  const client = (await json(clientRes)).doc
  check("editor creates client with logo", clientRes.status === 201 && client?.logo?.id === logo.doc.id, `HTTP ${clientRes.status}`)
  const badClient = await http("/api/clients", {
    method: "POST", token: E, headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Bad", logo: logo.doc.id, logoDescription: "x", website: "javascript:alert(1)" }),
  })
  check("client website must be http(s)", badClient.status === 400, `HTTP ${badClient.status}`)

  // ── 3. Draft project + authorized preview ────────────────────────────────
  workflow("Project draft creation and authorized preview")
  const heroA = await upload(E, await png("#0F243D", "Hero A"), `hero-a-${RUN}.png`, "Hero A")
  const heroB = await upload(E, await png("#00A3CC", "Hero B"), `hero-b-${RUN}.png`, "Hero B")
  const slug = `atlas-${RUN}`
  const title = `Atlas Operations ${RUN}`
  const projectRes = await http("/api/projects?draft=true&locale=en", {
    method: "POST", token: E, headers: { "content-type": "application/json" },
    body: JSON.stringify({
      slug, title, client: client.id, summary: "Dispatch, fleet and billing in one place.", intro: "Intro copy",
      sector: "Logistics", year: "2026", services: [{ name: "Product strategy" }, { name: "Engineering" }],
      techStack: [{ technology: `Next.js ${RUN}` }, { technology: "PostgreSQL" }], featured: true, displayOrder: -1,
      cardImage: heroA.doc.id, heroImage: heroA.doc.id,
      blocks: [
        { blockType: "intro", eyebrow: "The challenge", heading: `FIRST-BLOCK-${RUN}`, body: "Three tools, no single truth." },
        { blockType: "richText", heading: "Approach", body: lexical("Rich text paragraph.", { bold: `BOLD-${RUN}` }, { list: [`LIST-ITEM-${RUN}`] }) },
        { blockType: "metrics", items: [{ value: "38%", label: "Fewer calls" }] },
        { blockType: "quote", quote: `SECOND-BLOCK-${RUN}`, attribution: "Ops lead" },
      ],
      _status: "draft",
    }),
  })
  const project = (await json(projectRes)).doc
  check("editor creates draft project", projectRes.status === 201 && project?._status === "draft", `HTTP ${projectRes.status}`)

  const anonDraft = await page(`/projects/${slug}`)
  check("anonymous visitor gets 404 for draft", anonDraft.status === 404 && !anonDraft.html.includes(title), `HTTP ${anonDraft.status}`)
  const anonApi = await http(`/api/projects/${project.id}`)
  check("anonymous REST cannot read draft by id", anonApi.status === 404 || anonApi.status === 403, `HTTP ${anonApi.status}`)
  const anonPreview = await http(`/api/preview?collection=projects&slug=${slug}`)
  check("preview endpoint rejects anonymous", anonPreview.status === 401, `HTTP ${anonPreview.status}`)
  const paramOnly = await http(`/api/preview?collection=projects&slug=${slug}&secret=anything&token=x`)
  check("query parameters never authorize preview", paramOnly.status === 401, `HTTP ${paramOnly.status}`)

  const preview = await http(`/api/preview?collection=projects&slug=${slug}`, { token: E })
  const bypass = (preview.headers.getSetCookie?.() ?? []).find((c) => c.startsWith("__prerender_bypass="))?.split(";")[0]
  check("editor enters preview", preview.status === 307 && Boolean(bypass) && preview.headers.get("location")?.endsWith(`/projects/${slug}`) === true, `HTTP ${preview.status} → ${preview.headers.get("location")}`)
  check("preview response is not cacheable", (preview.headers.get("cache-control") ?? "").includes("no-store"))
  const draftView = await page(`/projects/${slug}`, { cookies: [bypass!], token: E })
  check("editor sees draft in preview", draftView.status === 200 && draftView.html.includes(title) && draftView.html.includes("Draft preview"), `HTTP ${draftView.status}`)
  const crossSite = await page(`/projects/${slug}`, { cookies: [bypass!], token: E, site: "cross-site" })
  check("cross-site request cannot use the editor cookie for drafts", crossSite.status === 404, `HTTP ${crossSite.status}`)
  const draftNoSession = await page(`/projects/${slug}`, { cookies: [bypass!] })
  check("draft cookie without session shows nothing", draftNoSession.status === 404, `HTTP ${draftNoSession.status}`)

  // logout invalidates the session server-side; the stale token must not unlock drafts
  const editor2 = await login(editorEmail, editorPassword)
  const logout = await http("/api/users/logout", { method: "POST", token: editor2.token })
  const afterLogout = await page(`/projects/${slug}`, { cookies: [bypass!], token: editor2.token })
  check("after logout, draft is denied even with old token + draft cookie", afterLogout.status === 404, `logout HTTP ${logout.status}, page HTTP ${afterLogout.status}`)

  // ── 4. Publish, edit, reorder blocks, replace images ─────────────────────
  workflow("Publish, edit, reorder blocks, replace images")
  const publish = await http(`/api/projects/${project.id}?locale=en`, {
    method: "PATCH", token: E, headers: { "content-type": "application/json" }, body: JSON.stringify({ _status: "published" }),
  })
  check("editor publishes project", publish.status === 200 && (await json(publish)).doc?._status === "published", `HTTP ${publish.status}`)
  let pub = await page(`/projects/${slug}`)
  check("published project is public", pub.status === 200 && pub.html.includes(title), `HTTP ${pub.status}`)
  check("client name and logo rendered", pub.html.includes(`Northwind ${RUN}`) && pub.html.includes(`client-logo-${RUN}`))
  check("project intro shown in hero (not the card summary)", pub.html.includes("Intro copy"))
  check("tech stack rendered", pub.html.includes(`Next.js ${RUN}`))
  check("rich text rendered by Lexical renderer", pub.html.includes(`<strong>BOLD-${RUN}</strong>`) && pub.html.includes(`LIST-ITEM-${RUN}</li>`))
  check("blocks render in saved order", order(pub.html, `FIRST-BLOCK-${RUN}`, `SECOND-BLOCK-${RUN}`))
  const listing = await page("/projects")
  check("published project appears in listing", listing.html.includes(title))
  check("published project appears in sitemap", (await page("/sitemap.xml")).html.includes(`/projects/${slug}<`))

  const full = await json(await http(`/api/projects/${project.id}?locale=en&depth=0`, { token: E }))
  const reordered = [...full.blocks].reverse()
  const edit = await http(`/api/projects/${project.id}?locale=en`, {
    method: "PATCH", token: E, headers: { "content-type": "application/json" },
    body: JSON.stringify({ title: `${title} v2`, blocks: reordered, heroImage: heroB.doc.id, cardImage: heroB.doc.id, _status: "published" }),
  })
  check("edit + reorder + image replace saved", edit.status === 200, `HTTP ${edit.status}`)
  pub = await page(`/projects/${slug}`)
  check("public title updated", pub.html.includes(`${title} v2`))
  check("public block order updated", order(pub.html, `SECOND-BLOCK-${RUN}`, `FIRST-BLOCK-${RUN}`))
  check("public hero image replaced", pub.html.includes(`hero-b-${RUN}`) && !pub.html.includes(`hero-a-${RUN}`))

  const draftEdit = await http(`/api/projects/${project.id}?draft=true&locale=en`, {
    method: "PATCH", token: E, headers: { "content-type": "application/json" }, body: JSON.stringify({ title: `UNPUBLISHED-EDIT-${RUN}` }),
  })
  pub = await page(`/projects/${slug}`)
  check("draft edit of a published project stays private", draftEdit.status === 200 && !pub.html.includes(`UNPUBLISHED-EDIT-${RUN}`) && pub.html.includes(`${title} v2`))
  await http(`/api/projects/${project.id}?locale=en`, {
    method: "PATCH", token: E, headers: { "content-type": "application/json" }, body: JSON.stringify({ title: `${title} v2`, _status: "published" }),
  })

  // related projects: configured selections are used, unpublished picks skipped
  const seeded = await json(await http(`/api/projects?where[slug][equals]=operations-platform&draft=true`, { token: E }))
  const relatedDraft = seeded.docs[0]
  const sibling = await http("/api/projects?locale=en", {
    method: "POST", token: E, headers: { "content-type": "application/json" },
    body: JSON.stringify({
      slug: `beacon-${RUN}`, title: `Beacon ${RUN}`, client: client.id, summary: "Sibling", sector: "Logistics", year: "2025",
      services: [{ name: "Design" }], cardImage: heroA.doc.id, heroImage: heroA.doc.id, _status: "published",
    }),
  })
  const siblingDoc = (await json(sibling)).doc
  await http(`/api/projects/${project.id}?locale=en`, {
    method: "PATCH", token: E, headers: { "content-type": "application/json" },
    body: JSON.stringify({ relatedProjects: [relatedDraft?.id, siblingDoc.id].filter(Boolean), _status: "published" }),
  })
  pub = await page(`/projects/${slug}`)
  check("configured related project rendered", pub.html.includes(`Beacon ${RUN}`))
  check("unpublished related selection skipped", !pub.html.includes("Operations platform"))

  // ── 5. Slug redirect and unpublish ───────────────────────────────────────
  workflow("Slug redirect and unpublish behavior")
  const slug2 = `atlas-renamed-${RUN}`
  const draftRename = await http(`/api/projects/${project.id}?draft=true&locale=en`, {
    method: "PATCH", token: E, headers: { "content-type": "application/json" }, body: JSON.stringify({ slug: slug2 }),
  })
  const redirectsAfterDraft = await json(await http(`/api/redirects?where[from][equals]=/projects/${slug}`))
  check("draft-only slug change creates no redirect", draftRename.status === 200 && redirectsAfterDraft.totalDocs === 0)
  check("old URL still live while rename is a draft", (await page(`/projects/${slug}`)).status === 200)
  await http(`/api/projects/${project.id}?locale=en`, {
    method: "PATCH", token: E, headers: { "content-type": "application/json" }, body: JSON.stringify({ slug: slug2, _status: "published" }),
  })
  const oldUrl = await page(`/projects/${slug}`)
  check("old URL 308-redirects to new slug", oldUrl.status === 308 && oldUrl.location?.endsWith(`/projects/${slug2}`) === true, `HTTP ${oldUrl.status} → ${oldUrl.location}`)
  const oldAr = await page(`/ar/projects/${slug}`)
  check("Arabic old URL redirects too", oldAr.status === 308 && oldAr.location?.endsWith(`/ar/projects/${slug2}`) === true, `HTTP ${oldAr.status} → ${oldAr.location}`)
  check("new URL serves the project", (await page(`/projects/${slug2}`)).status === 200)

  const slug3 = `atlas-final-${RUN}`
  await http(`/api/projects/${project.id}?locale=en`, {
    method: "PATCH", token: E, headers: { "content-type": "application/json" }, body: JSON.stringify({ slug: slug3, _status: "published" }),
  })
  const firstHop = await page(`/projects/${slug}`)
  check("redirect chains are flattened (first slug → latest)", firstHop.location?.endsWith(`/projects/${slug3}`) === true, `→ ${firstHop.location}`)
  await http(`/api/projects/${project.id}?locale=en`, {
    method: "PATCH", token: E, headers: { "content-type": "application/json" }, body: JSON.stringify({ slug, _status: "published" }),
  })
  const back = await page(`/projects/${slug}`)
  check("renaming back to an old slug removes its redirect (no loop)", back.status === 200, `HTTP ${back.status}`)
  const loopTry = await http("/api/redirects", {
    method: "POST", token: A, headers: { "content-type": "application/json" },
    body: JSON.stringify({ from: `/projects/${slug}`, to: `/projects/${slug3}` }),
  })
  check("multi-step redirect loop rejected", loopTry.status === 400, `HTTP ${loopTry.status}`)
  const manual = await http("/api/redirects", {
    method: "POST", token: A, headers: { "content-type": "application/json" },
    body: JSON.stringify({ from: `/old-campaign-${RUN}`, to: "/services", statusCode: "307" }),
  })
  const manualHit = await page(`/old-campaign-${RUN}`)
  check("stored manual redirect resolved on any public path", manual.status === 201 && manualHit.status === 307 && manualHit.location?.endsWith("/services") === true, `HTTP ${manualHit.status} → ${manualHit.location}`)

  const unpublish = await http(`/api/projects/${project.id}?locale=en`, {
    method: "PATCH", token: E, headers: { "content-type": "application/json" }, body: JSON.stringify({ _status: "draft" }),
  })
  const gone = await page(`/projects/${slug}`)
  check("unpublished project returns 404", unpublish.status === 200 && gone.status === 404, `HTTP ${gone.status}`)
  check("unpublished project leaves listing", !(await page("/projects")).html.includes(title))
  check("unpublished project leaves sitemap", !(await page("/sitemap.xml")).html.includes(slug))
  const editorDelete = await http(`/api/projects/${siblingDoc.id}`, { method: "DELETE", token: E })
  check("editor cannot delete content", editorDelete.status === 403, `HTTP ${editorDelete.status}`)

  // ── 6. Two distinct articles ─────────────────────────────────────────────
  workflow("Two distinct articles with rendered content and metadata")
  const a1 = await page("/insights/software-people-adopt")
  check("article 1 (seeded) renders", a1.status === 200 && a1.html.includes("Start with the friction people already feel"))
  check("article 1 rich text rendered", a1.html.includes("<strong>Write the moment down.</strong>") && a1.html.includes("<li"))
  check("article 1 SEO title/description", a1.html.includes("<title>Business software people actually adopt — INHERITIX</title>") && a1.html.includes('name="description" content="Why adoption'))
  check("article 1 article metadata", a1.html.includes('property="og:type" content="article"') && a1.html.includes('property="article:published_time"'))
  check("article 1 has no Arabic hreflang (no translation)", !a1.html.includes('hrefLang="ar"'))

  const cover = await upload(E, await png("#0B94D5", "Judgment"), `judgment-cover-${RUN}.png`, "Abstract judgment cover")
  const posts = await json(await http("/api/posts?where[slug][equals]=automation-with-judgment&draft=true", { token: E }))
  const post2 = posts.docs[0]
  if (post2._status === "published") {
    // Repeat runs: unpublish first so the draft → publish transition is exercised again.
    await http(`/api/posts/${post2.id}?locale=en`, {
      method: "PATCH", token: E, headers: { "content-type": "application/json" }, body: JSON.stringify({ _status: "draft" }),
    })
  }
  const before = await page("/insights/automation-with-judgment")
  check("article 2 hidden while draft", before.status === 404, `HTTP ${before.status}`)
  const finish = await http(`/api/posts/${post2.id}?locale=en`, {
    method: "PATCH", token: E, headers: { "content-type": "application/json" },
    body: JSON.stringify({
      publishedAt: "2026-09-30T08:00:00.000Z",
      coverImage: cover.doc.id,
      sections: [
        { sectionId: "boundaries", heading: "Establish explicit decision boundaries", body: lexical("Define when the system acts alone.", { bold: "Escalate anomalies." }) },
        { sectionId: "review", heading: "Keep humans in the review loop", body: lexical("Review queues need context.", { list: ["Show the evidence", "Show the confidence", "Make overrides cheap"] }) },
      ],
      seo: { title: `Automation with judgment ${RUN}`, description: "How to design automation that knows when to ask a person.", ogImage: cover.doc.id },
      _status: "published",
    }),
  })
  const enDoc = (await json(finish)).doc
  const arPartial = await http(`/api/posts/${post2.id}?locale=ar`, {
    method: "PATCH", token: E, headers: { "content-type": "application/json" },
    body: JSON.stringify({ title: "الأتمتة تحتاج إلى حكمة، لا إلى نموذج فقط", _status: "published" }),
  })
  check("publishing an incomplete Arabic translation is rejected", arPartial.status === 400, `HTTP ${arPartial.status}`)
  const arTitle = await http(`/api/posts/${post2.id}?locale=ar`, {
    method: "PATCH", token: E, headers: { "content-type": "application/json" },
    body: JSON.stringify({
      title: "الأتمتة تحتاج إلى حكمة، لا إلى نموذج فقط",
      excerpt: "الأتمتة العملية تُبنى حول معالجة الاستثناءات والتحقق البشري.",
      sections: enDoc.sections.map((section: { id: string; sectionId: string }, i: number) => ({
        id: section.id,
        sectionId: section.sectionId,
        heading: ["حدّد حدود القرار بوضوح", "أبقِ الإنسان في حلقة المراجعة"][i],
        body: { root: { ...lexical(["متى يتصرف النظام وحده؟", "قوائم المراجعة تحتاج إلى سياق."][i]!).root, direction: "rtl" } },
      })),
      _status: "published",
    }),
  })
  check("editor completes and publishes article 2 (EN + full AR)", finish.status === 200 && arTitle.status === 200, `HTTP ${finish.status}/${arTitle.status}`)
  const a2 = await page("/insights/automation-with-judgment")
  check("article 2 renders distinct content", a2.status === 200 && a2.html.includes("Keep humans in the review loop") && !a2.html.includes("Start with the friction"))
  check("article 2 rich text list", a2.html.includes("Make overrides cheap</li>"))
  check("article 2 SEO title + og:image", a2.html.includes(`<title>Automation with judgment ${RUN} — INHERITIX</title>`) && a2.html.includes(`judgment-cover-${RUN}`))
  check("article 2 advertises Arabic alternate (translated)", a2.html.includes('hrefLang="ar"') && a2.html.includes("/ar/insights/automation-with-judgment"))
  const a2ar = await page("/ar/insights/automation-with-judgment")
  check("Arabic article page uses Arabic title and body", a2ar.status === 200 && a2ar.html.includes("الأتمتة تحتاج إلى حكمة") && a2ar.html.includes("أبقِ الإنسان في حلقة المراجعة"))
  const a1ar = await page("/ar/insights/software-people-adopt")
  check("untranslated Arabic article is noindex with canonical to English", a1ar.html.includes('name="robots" content="noindex') && a1ar.html.includes('rel="canonical" href="http://localhost:8443/insights/software-people-adopt"'))
  const sitemap = await page("/sitemap.xml")
  check("sitemap lists both articles", sitemap.html.includes("/insights/software-people-adopt") && sitemap.html.includes("/insights/automation-with-judgment"))
  check("sitemap excludes remaining draft article", !sitemap.html.includes("designing-operational-clarity"))
  check("sitemap excludes noIndex sample projects", !sitemap.html.includes("operations-platform"))

  // ── 7. Branding and homepage through the dashboard ───────────────────────
  workflow("Branding and homepage changes through the dashboard")
  const brandLogo = await upload(A, await sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="360" height="64"><rect width="64" height="64" fill="#7a2cff"/><text x="80" y="46" font-size="40" font-family="Arial" fill="#2b0a57">BRANDTEST</text></svg>')).png().toBuffer(), `brand-logo-${RUN}.png`, "Inheritix brand test logo")
  const favicon = await upload(A, await png("#7a2cff", "F"), `favicon-${RUN}.png`, "Favicon")
  const badColor = await http("/api/globals/site-settings?locale=en", {
    method: "POST", token: A, headers: { "content-type": "application/json" },
    body: JSON.stringify({ brandColors: { primary: "red;}body{display:none" } }),
  })
  check("invalid brand color rejected", badColor.status === 400, `HTTP ${badColor.status}`)
  const settings = await http("/api/globals/site-settings?locale=en", {
    method: "POST", token: A, headers: { "content-type": "application/json" },
    body: JSON.stringify({ branding: { logo: brandLogo.doc.id, favicon: favicon.doc.id }, brandColors: { primary: "#7A2CFF", accent: "#00CCFF", dark: "#0F243D" } }),
  })
  check("admin updates branding + colors", settings.status === 200, `HTTP ${settings.status}`)
  const homeBefore = await json(await http("/api/globals/page-home?locale=en&depth=0", { token: E }))
  const homeEdit = await http("/api/globals/page-home?locale=en", {
    method: "POST", token: E, headers: { "content-type": "application/json" },
    body: JSON.stringify({
      heroTitleA: `Edited hero ${RUN}.`,
      heroPrimaryCta: { label: `Primary CTA ${RUN}`, href: "/services" },
      showcaseSection: { ...homeBefore.showcaseSection, visible: false },
      sectionOrder: [{ section: "insights" }, { section: "capabilities" }],
      approachSection: { ...homeBefore.approachSection, phases: [...homeBefore.approachSection.phases, { number: "05", name: `Operate ${RUN}`, description: "Run and improve." }] },
    }),
  })
  check("editor updates homepage global", homeEdit.status === 200, `HTTP ${homeEdit.status}`)
  const home = await page("/")
  check("hero title updated on public homepage", home.html.includes(`Edited hero ${RUN}.`))
  check("hero CTA label + href updated", home.html.includes(`Primary CTA ${RUN}`) && home.html.includes('href="/services"'))
  check("hidden section removed", !home.html.includes('class="showcase'))
  check("section order applied (insights before capabilities)", order(home.html, 'class="insights page-pad"', 'class="capabilities page-pad"'))
  check("added approach phase rendered", home.html.includes(`Operate ${RUN}`))
  check("brand color applied to design tokens", home.html.includes("--blue:#7A2CFF"))
  check("logo rendered in header", home.html.includes(`brand-logo-${RUN}`))
  check("favicon from CMS", home.html.includes(`favicon-${RUN}`) && home.html.includes('rel="icon"'))
  const homeAr = await page("/ar")
  check("Arabic homepage keeps its own hero (localized field)", homeAr.html.includes("مصمم بإتقان.") && !homeAr.html.includes(`Edited hero ${RUN}.`))
  check("Arabic CTA prefixed with /ar", homeAr.html.includes('href="/ar/services"'))

  // featured project feeds the homepage story card when the editor selects that source
  const featuredSlug = `featured-${RUN}`
  await http("/api/projects?locale=en", {
    method: "POST", token: E, headers: { "content-type": "application/json" },
    body: JSON.stringify({
      slug: featuredSlug, title: `Featured story ${RUN}`, client: client.id, summary: "Featured on the homepage.", sector: "Logistics",
      year: "2026", services: [{ name: "Design" }], cardImage: heroA.doc.id, heroImage: heroA.doc.id, featured: true, displayOrder: -100, _status: "published",
    }),
  })
  const homeNow = await json(await http("/api/globals/page-home?locale=en&depth=0", { token: E }))
  await http("/api/globals/page-home?locale=en", {
    method: "POST", token: E, headers: { "content-type": "application/json" },
    body: JSON.stringify({ selectedWorkSection: { ...homeNow.selectedWorkSection, storyCard: { ...homeNow.selectedWorkSection.storyCard, source: "featuredProject" } } }),
  })
  const featuredHome = await page("/")
  check("featured project shown in homepage story card", featuredHome.html.includes(`Featured story ${RUN}`) && featuredHome.html.includes(`/projects/${featuredSlug}`))
  await http("/api/globals/page-home?locale=en", {
    method: "POST", token: E, headers: { "content-type": "application/json" },
    body: JSON.stringify({ selectedWorkSection: { ...homeNow.selectedWorkSection, storyCard: { ...homeNow.selectedWorkSection.storyCard, source: "manual" } } }),
  })
  check("manual story card restored", !(await page("/")).html.includes(`Featured story ${RUN}`))

  // restore the homepage + branding edits so repeated runs and screenshots start from the approved state
  await http("/api/globals/page-home?locale=en", {
    method: "POST", token: E, headers: { "content-type": "application/json" },
    body: JSON.stringify({
      heroTitleA: homeBefore.heroTitleA, heroPrimaryCta: homeBefore.heroPrimaryCta, showcaseSection: homeBefore.showcaseSection,
      sectionOrder: homeBefore.sectionOrder, approachSection: homeBefore.approachSection,
    }),
  })
  await http("/api/globals/site-settings?locale=en", {
    method: "POST", token: A, headers: { "content-type": "application/json" },
    body: JSON.stringify({ branding: { logo: null, logoLight: null, favicon: null }, brandColors: { primary: "#0178B2", accent: "#00CCFF", dark: "#0F243D" } }),
  })
  const restored = await page("/")
  check("homepage and branding restored after test", restored.html.includes("--blue:#0178B2") && !restored.html.includes(`Edited hero ${RUN}`))

  // ── 8. Restore homepage/branding so repeated runs start clean ────────────
  results.push({ workflow: "meta", check: `run id ${RUN}`, ok: true })
}

try {
  await main()
} catch (error) {
  check("unexpected error", false, error instanceof Error ? error.stack : String(error))
}

const failed = results.filter((r) => !r.ok)
const byWorkflow = new Map<string, { pass: number; fail: number }>()
for (const r of results) {
  if (r.workflow === "meta") continue
  const entry = byWorkflow.get(r.workflow) ?? { pass: 0, fail: 0 }
  r.ok ? entry.pass++ : entry.fail++
  byWorkflow.set(r.workflow, entry)
}
console.log("\n──────── Summary ────────")
for (const [name, { pass, fail }] of byWorkflow) console.log(`${fail ? "FAILED" : "PASSED"}  ${name} (${pass}/${pass + fail})`)
console.log(`${results.length - failed.length - 1} passed, ${failed.length} failed (run ${RUN})`)
process.exit(failed.length ? 1 : 0)
