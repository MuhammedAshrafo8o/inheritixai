import { runInquiryWorker } from "../src/email/inquiry-worker"

const once = process.argv.includes("--once") || process.env.INQUIRY_WORKER_ONCE === "true"

runInquiryWorker({ once }).then((result) => {
  if (once) console.log(`[inquiry-worker] ${result?.processed ? result.status : "no pending work"}`)
}).catch((error) => {
  console.error("[inquiry-worker] stopped with an error", error instanceof Error ? error.name : "unknown")
  process.exitCode = 1
})
