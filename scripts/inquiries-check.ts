import http from "node:http"
import net from "node:net"
import path from "node:path"
import { createRequire } from "node:module"
import { randomUUID } from "node:crypto"
import { spawn } from "node:child_process"
import { sql } from "@payloadcms/db-postgres"
import { getPayload } from "payload"
import config from "../src/payload.config"
import { messageFor, processNextInquiryNotification } from "../src/email/inquiry-worker"
import { escapeHtml } from "../src/email/smtp"

const PORT = 8452
const SMTP_PORT = 2526
const ORIGIN = `http://localhost:${PORT}`
const checks: Array<{ name: string; ok: boolean; detail?: string }> = []
const check = (name: string, ok: unknown, detail?: unknown) => {
  checks.push({ name, ok: Boolean(ok), detail: detail == null ? undefined : String(detail) })
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail == null ? "" : ` — ${detail}`}`)
}
const payload = await getPayload({ config })

// This suite is destructive by design and must only target its documented
// disposable database. Reset Milestone Three operational rows for repeatability.
if (!process.env.DATABASE_URI?.includes("m3_test")) throw new Error("test:inquiries requires a disposable *_m3_test database")
try {
  await payload.db.migrate()
} catch (err) {
  console.log("[test:inquiries] migrate note:", err instanceof Error ? err.message : String(err))
}

const existingAdmin = (await payload.find({ collection: "users", where: { email: { equals: "admin-m3@example.test" } }, overrideAccess: true, limit: 1 })).docs[0]
if (!existingAdmin) {
  await payload.create({
    collection: "users",
    data: { email: "admin-m3@example.test", password: "M3-Admin-Verification-2026!", name: "Admin M3", roles: ["admin"] },
    overrideAccess: true,
  })
}
const existingEditor = (await payload.find({ collection: "users", where: { email: { equals: "editor-m3@example.test" } }, overrideAccess: true, limit: 1 })).docs[0]
if (!existingEditor) {
  await payload.create({
    collection: "users",
    data: { email: "editor-m3@example.test", password: "M3-Editor-Verification-2026!", name: "Editor M3", roles: ["editor"] },
    overrideAccess: true,
  })
}

const productCount = (await payload.count({ collection: "products", overrideAccess: true })).totalDocs
if (productCount === 0) {
  console.log("[test:inquiries] seeding fixtures...")
  const npxCmd = process.platform === "win32" ? "npx.cmd" : "npx"
  await new Promise<void>((resolve, reject) => {
    const seedProc = spawn(npxCmd, ["tsx", "scripts/seed.ts"], {
      cwd: process.cwd(),
      env: process.env,
      stdio: "inherit",
      shell: process.platform === "win32",
    })
    seedProc.on("exit", (code) => code === 0 ? resolve() : reject(new Error(`Seed exited ${code}`)))
  })
}

await payload.db.drizzle.execute(sql`TRUNCATE TABLE "inquiry_records" RESTART IDENTITY CASCADE`)
await payload.db.drizzle.execute(sql`TRUNCATE TABLE "inquiry_rate_limits" RESTART IDENTITY CASCADE`)

function smtpCapture() {
  const messages: string[] = []
  let dropAfterData = false
  const server = net.createServer((socket) => {
    socket.setEncoding("utf8")
    socket.write("220 localhost Inheritix test SMTP\r\n")
    let buffer = ""
    let dataMode = false
    socket.on("data", (chunk) => {
      buffer += chunk
      while (true) {
        if (dataMode) {
          const end = buffer.indexOf("\r\n.\r\n")
          if (end < 0) return
          messages.push(buffer.slice(0, end))
          buffer = buffer.slice(end + 5)
          dataMode = false
          if (dropAfterData) {
            socket.destroy()
            return
          }
          socket.write("250 2.0.0 accepted\r\n")
          continue
        }
        const end = buffer.indexOf("\r\n")
        if (end < 0) return
        const line = buffer.slice(0, end)
        buffer = buffer.slice(end + 2)
        const command = line.split(" ")[0]!.toUpperCase()
        if (command === "EHLO" || command === "HELO") socket.write("250-localhost\r\n250 PIPELINING\r\n")
        else if (command === "DATA") { dataMode = true; socket.write("354 End data with <CR><LF>.<CR><LF>\r\n") }
        else if (command === "QUIT") { socket.write("221 bye\r\n"); socket.end() }
        else socket.write("250 ok\r\n")
      }
    })
  })
  return {
    messages,
    server,
    setDropAfterData: (value: boolean) => { dropAfterData = value },
  }
}

const capture = smtpCapture()
await new Promise<void>((resolve, reject) => {
  capture.server.once("error", reject)
  capture.server.listen(SMTP_PORT, "127.0.0.1", resolve)
})

await payload.updateGlobal({
  slug: "email-settings",
  overrideAccess: true,
  data: {
    notificationsEnabled: true, smtpHost: "127.0.0.1", smtpPort: SMTP_PORT,
    encryptionMode: "none", smtpUsername: "", smtpPassword: "m3-local-capture-password",
    senderName: "Inheritix Website", senderEmail: "notifications@example.test",
    notificationRecipient: "operations@example.test", submissionLimitPerHour: 100, adminTestLimitPerHour: 20,
  },
})

const require = createRequire(import.meta.url)
const nextRoot = path.dirname(require.resolve("next/package.json"))
const app = spawn(process.execPath, [path.join(nextRoot, "dist/bin/next"), "dev", "-p", String(PORT)], {
  cwd: process.cwd(), env: { ...process.env, NEXT_PUBLIC_SITE_URL: ORIGIN }, stdio: ["ignore", "pipe", "pipe"],
})
let appLog = ""
app.stdout.on("data", (chunk) => { appLog += chunk.toString() })
app.stderr.on("data", (chunk) => { appLog += chunk.toString() })

async function waitForServer() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try { const response = await fetch(`${ORIGIN}/contact`); if (response.status === 200) return } catch { /* retry */ }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error(`Next server did not become ready.\n${appLog}`)
}
function requestHeaders(ip = "203.0.113.10", cookie?: string) {
  return { "Content-Type": "application/json", Origin: ORIGIN, "X-Forwarded-For": ip, ...(cookie ? { Cookie: cookie } : {}) }
}
const api = (pathname: string, options: RequestInit = {}) => fetch(`${ORIGIN}${pathname}`, options)
async function login(email: string, password: string) {
  const response = await api("/api/users/login", { method: "POST", headers: requestHeaders(), body: JSON.stringify({ email, password }) })
  const cookie = response.headers.get("set-cookie")?.split(";")[0] || ""
  check(`login ${email}`, response.status === 200 && Boolean(cookie), response.status)
  return cookie
}

function sendRaw(bodyString: string, chunked = false, ip = "198.51.100.90") {
  return new Promise<{ status: number; body: string; json: Record<string, unknown> }>((resolve, reject) => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Origin: ORIGIN,
      "X-Forwarded-For": ip,
    }
    if (chunked) {
      headers["Transfer-Encoding"] = "chunked"
    } else {
      headers["Content-Length"] = String(Buffer.byteLength(bodyString))
    }
    const req = http.request(`${ORIGIN}/api/inquiries`, {
      method: "POST",
      headers,
    }, (res) => {
      let data = ""
      res.on("data", (chunk) => { data += chunk })
      res.on("end", () => {
        let parsed: Record<string, unknown> = {}
        try { parsed = JSON.parse(data) } catch { /* ignore */ }
        resolve({ status: res.statusCode || 0, body: data, json: parsed })
      })
    })
    req.on("error", reject)
    if (chunked) {
      const half = Math.floor(bodyString.length / 2)
      req.write(bodyString.slice(0, half))
      req.write(bodyString.slice(half))
    } else {
      req.write(bodyString)
    }
    req.end()
  })
}

const product = (await payload.find({ collection: "products", where: { _status: { equals: "published" } }, limit: 1, overrideAccess: true, depth: 0 })).docs[0]
const service = (await payload.find({ collection: "services", where: { _status: { equals: "published" } }, limit: 1, overrideAccess: true, depth: 0 })).docs[0]
if (!product || !service) throw new Error("Published product and service fixtures are required.")

function submission(type: "project" | "demo" | "general", locale: "en" | "ar", idempotencyKey = randomUUID(), extra: Record<string, unknown> = {}) {
  return {
    type, locale, name: locale === "ar" ? "عميل تجريبي" : "Test Visitor", email: "visitor@example.test",
    message: locale === "ar" ? "هذه رسالة اختبار صالحة تحتوي على تفاصيل كافية." : "A valid integration inquiry with enough detail.",
    productId: type === "demo" ? String(product.id) : undefined,
    serviceId: type === "project" ? String(service.id) : undefined,
    sourcePath: locale === "ar" ? "/ar/contact?type=general" : "/contact?type=general",
    idempotencyKey, website: "", ...extra,
  }
}
async function submit(body: Record<string, unknown>, ip?: string) {
  const response = await api("/api/inquiries", { method: "POST", headers: requestHeaders(ip), body: JSON.stringify(body) })
  const json = await response.json().catch(() => ({})) as Record<string, unknown>
  return { response, json }
}

try {
  await waitForServer()
  const en = await api("/contact"); const enHtml = await en.text()
  const ar = await api("/ar/contact"); const arHtml = await ar.text()
  check("English contact form renders CMS operational copy", en.status === 200 && enHtml.includes("Inquiry received"))
  check("Arabic RTL contact form renders Arabic operational copy", ar.status === 200 && arHtml.includes('dir="rtl"') && arHtml.includes("تم استلام استفسارك"))
  check("contact form contains accessible fieldset with submitting disabled protection", enHtml.includes("<fieldset") && enHtml.includes('role="tablist"'))

  let ip = 20
  for (const locale of ["en", "ar"] as const) for (const type of ["project", "demo", "general"] as const) {
    const result = await submit(submission(type, locale), `203.0.113.${ip++}`)
    check(`${locale} ${type} submission saved`, result.response.status === 201 && typeof result.json.reference === "string", `${result.response.status}/${result.json.code}`)
  }
  const all = await payload.find({ collection: "inquiry-records", pagination: false, overrideAccess: true, depth: 0 })
  check("six bilingual/type submissions are durable", all.totalDocs === 6, all.totalDocs)

  const duplicateKey = randomUUID()
  const duplicateBody = submission("general", "en", duplicateKey)
  const concurrent = await Promise.all(Array.from({ length: 5 }, (_, index) => submit(duplicateBody, `198.51.100.${index + 1}`)))
  const matching = await payload.find({ collection: "inquiry-records", where: { idempotencyKey: { equals: duplicateKey } }, pagination: false, overrideAccess: true, depth: 0 })
  check("concurrent idempotent requests create one inquiry", matching.totalDocs === 1 && concurrent.every(({ response }) => response.ok), `${matching.totalDocs}/${concurrent.map((x) => x.response.status).join(",")}`)
  const conflict = await submit({ ...duplicateBody, message: "A changed message that must conflict." }, "198.51.100.40")
  check("changed payload with reused key conflicts", conflict.response.status === 409 && conflict.json.code === "IDEMPOTENCY_CONFLICT")

  const invalid = await submit({ ...submission("general", "en"), name: "x", status: "closed" }, "198.51.100.41")
  check("unknown administrative fields and invalid values rejected", invalid.response.status === 400 && invalid.json.code === "INVALID_INPUT")
  const wrongSelection = await submit({ ...submission("demo", "en"), productId: "99999999" }, "198.51.100.42")
  check("unpublished/missing selection rejected server-side", wrongSelection.response.status === 400)
  const contentType = await api("/api/inquiries", { method: "POST", headers: { Origin: ORIGIN, "Content-Type": "text/plain" }, body: "x" })
  check("content type enforced", contentType.status === 415)
  const oversized = await api("/api/inquiries", { method: "POST", headers: requestHeaders("198.51.100.43"), body: JSON.stringify({ padding: "x".repeat(33_000) }) })
  check("advertised 32KB request limit enforced", oversized.status === 413)

  // ── Chunked stream limit enforcement and boundary tests ─────────────────
  const chunkedOversized = await sendRaw(JSON.stringify({ padding: "x".repeat(33_000) }), true, "198.51.100.45")
  check("chunked request without Content-Length exceeding 32KiB canceled and rejected with 413", chunkedOversized.status === 413)

  // Boundary check: exactly 32768 bytes (32 KiB)
  const basePayload = submission("general", "en", randomUUID())
  const baseJson = JSON.stringify(basePayload)
  const padTo32k = 32768 - Buffer.byteLength(baseJson)
  const exact32kJson = baseJson + " ".repeat(padTo32k)
  const exact32kResult = await sendRaw(exact32kJson, false, "198.51.100.46")
  check("request at exactly 32KiB (32768 bytes) boundary accepted", Buffer.byteLength(exact32kJson) === 32768 && exact32kResult.status === 201)

  // Boundary check: 32769 bytes (exceeds by 1 byte)
  const over32kJson = baseJson + " ".repeat(padTo32k + 1)
  const over32kResult = await sendRaw(over32kJson, false, "198.51.100.47")
  check("request exceeding 32KiB boundary by 1 byte rejected with 413", Buffer.byteLength(over32kJson) === 32769 && over32kResult.status === 413)

  const crossOrigin = await api("/api/inquiries", { method: "POST", headers: { "Content-Type": "application/json", Origin: "https://evil.example" }, body: JSON.stringify(submission("general", "en")) })
  check("cross-origin submission rejected", crossOrigin.status === 403)
  const beforeHoney = (await payload.count({ collection: "inquiry-records", overrideAccess: true })).totalDocs
  const honey = await submit(submission("general", "en", randomUUID(), { website: "spam.example" }), "198.51.100.44")
  const afterHoney = (await payload.count({ collection: "inquiry-records", overrideAccess: true })).totalDocs
  check("honeypot accepts generically without persistence", honey.response.status === 202 && beforeHoney === afterHoney)

  await payload.updateGlobal({ slug: "email-settings", overrideAccess: true, data: { submissionLimitPerHour: 1 } })
  const rateOne = await submit(submission("general", "en"), "198.51.100.200")
  const rateTwo = await submit(submission("general", "en"), "198.51.100.200")
  check("persistent rate limit returns 429", rateOne.response.status === 201 && rateTwo.response.status === 429)
  await payload.updateGlobal({ slug: "email-settings", overrideAccess: true, data: { submissionLimitPerHour: 100 } })

  await payload.updateGlobal({ slug: "email-settings", overrideAccess: true, data: { notificationsEnabled: false } })
  const disabled = await submit(submission("general", "en"), "198.51.100.201")
  const disabledDoc = (await payload.find({ collection: "inquiry-records", where: { publicReference: { equals: disabled.json.reference } }, limit: 1, overrideAccess: true, depth: 0 })).docs[0]
  check("disabled SMTP preserves inquiry without queue backlog", disabled.response.status === 201 && disabledDoc?.notificationStatus === "disabled")
  await payload.update({ collection: "inquiry-records", where: { notificationStatus: { in: ["pending", "retry-wait"] } }, data: { notificationStatus: "disabled", notificationNextAttemptAt: null, notificationLockedAt: null } as never, overrideAccess: true, context: { inquirySystemOperation: true } })
  await payload.updateGlobal({ slug: "email-settings", overrideAccess: true, data: { notificationsEnabled: true, smtpPort: 2599 } })
  const failing = await submit(submission("general", "en"), "198.51.100.202")
  await processNextInquiryNotification(payload)
  const failedDoc = (await payload.find({ collection: "inquiry-records", where: { publicReference: { equals: failing.json.reference } }, limit: 1, overrideAccess: true, depth: 0 })).docs[0]
  check("SMTP failure preserves inquiry and schedules bounded retry", failing.response.status === 201 && failedDoc?.notificationStatus === "retry-wait" && failedDoc.notificationAttempts === 1)

  await payload.update({ collection: "inquiry-records", where: { notificationStatus: { in: ["pending", "retry-wait"] } }, data: { notificationStatus: "disabled", notificationNextAttemptAt: null, notificationLockedAt: null } as never, overrideAccess: true, context: { inquirySystemOperation: true } })
  await payload.updateGlobal({ slug: "email-settings", overrideAccess: true, data: { smtpPort: SMTP_PORT } })
  const deliverable = await submit(submission("general", "en", randomUUID(), { message: "Please review <script>alert('never')</script> safely." }), "198.51.100.203")
  const beforeMail = capture.messages.length
  const workerResults = await Promise.all([processNextInquiryNotification(payload), processNextInquiryNotification(payload)])
  const deliveredDoc = (await payload.find({ collection: "inquiry-records", where: { publicReference: { equals: deliverable.json.reference } }, limit: 1, overrideAccess: true, depth: 0 })).docs[0]
  check("concurrent workers claim one persisted job", workerResults.filter((x) => x.processed).length === 1 && capture.messages.length === beforeMail + 1)
  check("SMTP acceptance stored separately from workflow", deliveredDoc?.notificationStatus === "accepted" && deliveredDoc.workflowStatus === "new")
  const rendered = messageFor({ id: "test", publicReference: "INQ-TEST", inquiryType: "general", name: "Visitor", email: "visitor@example.test", message: "<script>alert('never')</script>" })
  check("HTML notification escapes submitted markup", escapeHtml("<script>") === "&lt;script&gt;" && rendered.html.includes("&lt;script&gt;") && !rendered.html.includes("<script>"))

  // ── Ambiguous SMTP outcome: connection drop after DATA ──────────────────
  capture.setDropAfterData(true)
  const dropSub = await submit(submission("general", "en", randomUUID()), "198.51.100.208")
  const dropDoc = (await payload.find({ collection: "inquiry-records", where: { publicReference: { equals: dropSub.json.reference } }, limit: 1, overrideAccess: true, depth: 0 })).docs[0]!
  const dropWorkerResult = await processNextInquiryNotification(payload)
  const dropUpdated = await payload.findByID({ collection: "inquiry-records", id: dropDoc.id, overrideAccess: true, depth: 0 })
  check("post-DATA SMTP connection drop classified as uncertain outcome", dropWorkerResult.status === "uncertain" && dropUpdated.notificationStatus === "uncertain" && dropUpdated.notificationFailureCode === "uncertain-data-transmitted")

  // Prove subsequent worker runs do not resend uncertain notification
  const subsequentWorker = await processNextInquiryNotification(payload)
  check("subsequent worker runs do not resend uncertain notification", subsequentWorker.processed === false)
  capture.setDropAfterData(false)

  const abandoned = await submit(submission("general", "en"), "198.51.100.204")
  const abandonedDoc = (await payload.find({ collection: "inquiry-records", where: { publicReference: { equals: abandoned.json.reference } }, limit: 1, overrideAccess: true, depth: 0 })).docs[0]!
  await payload.update({ collection: "inquiry-records", id: abandonedDoc.id, data: { notificationStatus: "processing", notificationLockedAt: new Date(Date.now() - 20 * 60_000).toISOString() } as never, overrideAccess: true, context: { inquirySystemOperation: true } })
  await processNextInquiryNotification(payload)
  const uncertain = await payload.findByID({ collection: "inquiry-records", id: abandonedDoc.id, overrideAccess: true, depth: 0 })
  check("abandoned processing becomes visible uncertain outcome without auto-resend", uncertain.notificationStatus === "uncertain")

  const adminCookie = await login("admin-m3@example.test", "M3-Admin-Verification-2026!")
  const editorCookie = await login("editor-m3@example.test", "M3-Editor-Verification-2026!")
  const anonymousPrivate = await api("/api/inquiry-records")
  const editorPrivate = await api("/api/inquiry-records", { headers: requestHeaders(undefined, editorCookie) })
  const adminPrivate = await api("/api/inquiry-records", { headers: requestHeaders(undefined, adminCookie) })
  check("anonymous and editor inquiry reads denied; administrator allowed", !anonymousPrivate.ok && !editorPrivate.ok && adminPrivate.ok, `${anonymousPrivate.status}/${editorPrivate.status}/${adminPrivate.status}`)
  const editorSettings = await api("/api/globals/email-settings", { headers: requestHeaders(undefined, editorCookie) })
  const adminSettings = await api("/api/globals/email-settings", { headers: requestHeaders(undefined, adminCookie) })
  const settingsJson = await adminSettings.json() as Record<string, unknown>
  check("editor SMTP access denied and admin allowed", !editorSettings.ok && adminSettings.ok)
  check("SMTP plaintext and ciphertext absent from normal admin API", settingsJson.passwordConfigured === true && !("smtpPassword" in settingsJson) && !JSON.stringify(settingsJson).includes("m3-local-capture-password"))
  const adminSecrets = await api("/api/email-secrets", { headers: requestHeaders(undefined, adminCookie) })
  check("email secret collection denied even to administrator REST", !adminSecrets.ok)

  const verify = await api("/api/admin/email/verify", { method: "POST", headers: requestHeaders(undefined, adminCookie), body: "{}" })
  const testMail = await api("/api/admin/email/test", { method: "POST", headers: requestHeaders(undefined, adminCookie), body: "{}" })
  check("administrator connection verification succeeds without sending", verify.status === 200)
  check("administrator test email receives SMTP acceptance wording", testMail.status === 200 && (await testMail.json() as { message?: string }).message?.includes("accept"))
  const editorTest = await api("/api/admin/email/test", { method: "POST", headers: requestHeaders(undefined, editorCookie), body: "{}" })
  check("editor cannot use SMTP actions", editorTest.status === 403)

  // ── Interleaved retry requests with worker claim & duplicate acknowledgment ──
  // 1. Uncertain retry without acknowledgment rejected with 409
  const unackRetry = await api(`/api/admin/inquiries/${dropDoc.id}/retry`, {
    method: "POST",
    headers: requestHeaders(undefined, adminCookie),
    body: JSON.stringify({ acknowledgeDuplicate: false }),
  })
  const unackJson = await unackRetry.json() as { code?: string }
  check("retry of uncertain notification without explicit duplicate acknowledgment rejected with 409", unackRetry.status === 409 && unackJson.code === "DUPLICATE_ACKNOWLEDGMENT_REQUIRED")

  // 2. First retry request with acknowledgment succeeds and transitions to pending
  const ackRetry = await api(`/api/admin/inquiries/${dropDoc.id}/retry`, {
    method: "POST",
    headers: requestHeaders(undefined, adminCookie),
    body: JSON.stringify({ acknowledgeDuplicate: true }),
  })
  check("retry of uncertain notification with duplicate acknowledgment queues pending retry", ackRetry.status === 200)

  // 3. Worker claims the pending notification (transitions to processing)
  await payload.update({
    collection: "inquiry-records",
    id: dropDoc.id,
    data: { notificationStatus: "processing", notificationLockedAt: new Date().toISOString() } as never,
    overrideAccess: true,
    context: { inquirySystemOperation: true },
  })

  // 4. Interleaved second retry request while worker is processing
  const losingRetry = await api(`/api/admin/inquiries/${dropDoc.id}/retry`, {
    method: "POST",
    headers: requestHeaders(undefined, adminCookie),
    body: JSON.stringify({ acknowledgeDuplicate: true }),
  })
  const losingJson = await losingRetry.json() as { code?: string }
  check("interleaved retry while notification is processing is rejected with 409 conflict", losingRetry.status === 409 && losingJson.code === "INVALID_STATE")

  // 5. Prove row remained in processing without being requeued
  const afterLosing = await payload.findByID({ collection: "inquiry-records", id: dropDoc.id, overrideAccess: true, depth: 0 })
  check("processing notification state was not reset or requeued by losing retry", afterLosing.notificationStatus === "processing")

  // Settle row
  await payload.update({
    collection: "inquiry-records",
    id: dropDoc.id,
    data: { notificationStatus: "accepted", notificationAcceptedAt: new Date().toISOString(), notificationLockedAt: null } as never,
    overrideAccess: true,
    context: { inquirySystemOperation: true },
  })

  // Normal failed retry check
  await payload.update({ collection: "inquiry-records", id: failedDoc!.id, data: { notificationStatus: "failed" } as never, overrideAccess: true, context: { inquirySystemOperation: true } })
  const retry = await api(`/api/admin/inquiries/${failedDoc!.id}/retry`, { method: "POST", headers: requestHeaders(undefined, adminCookie), body: "{}" })
  check("administrator protected retry reuses the persisted queue row", retry.status === 200)

  const noteResponse = await api(`/api/inquiry-records/${failedDoc!.id}`, { method: "PATCH", headers: requestHeaders(undefined, adminCookie), body: JSON.stringify({ unread: false, workflowStatus: "in-progress", internalNotes: [{ note: "Reviewed during verification." }] }) })
  const noted = await noteResponse.json() as Record<string, unknown>
  const notedDoc = (noted.doc ?? noted) as Record<string, unknown>
  check("administrator can mark read, change workflow, and append stamped note", noteResponse.ok && notedDoc.unread === false && notedDoc.workflowStatus === "in-progress" && Array.isArray(notedDoc.internalNotes), noteResponse.status)
  const immutable = await api(`/api/inquiry-records/${failedDoc!.id}`, { method: "PATCH", headers: requestHeaders(undefined, adminCookie), body: JSON.stringify({ email: "rewritten@example.test" }) })
  check("submitted identity remains immutable in normal admin flow", !immutable.ok)

  await payload.update({ collection: "inquiry-records", id: failedDoc!.id, data: { notificationStatus: "failed", notificationFailureCode: "smtp-permanent", notificationNextAttemptAt: null } as never, overrideAccess: true, context: { inquirySystemOperation: true } })

  await payload.db.drizzle.execute(sql`ALTER TABLE "inquiry_records" RENAME TO "inquiry_records_failure_test"`)
  let dbFailure
  try { dbFailure = await submit(submission("general", "en"), "198.51.100.205") }
  finally { await payload.db.drizzle.execute(sql`ALTER TABLE "inquiry_records_failure_test" RENAME TO "inquiry_records"`) }
  check("database failure never produces visitor success", dbFailure!.response.status === 503)
} finally {
  app.kill("SIGTERM")
  capture.server.close()
  await new Promise((resolve) => setTimeout(resolve, 500))
}

const failures = checks.filter((item) => !item.ok)
console.log(`\n${checks.length - failures.length}/${checks.length} checks passed.`)
if (failures.length) { console.error(appLog.slice(-4000)); process.exit(1) }
process.exit(0)
