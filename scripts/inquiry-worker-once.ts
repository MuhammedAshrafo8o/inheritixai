import { runInquiryWorker } from "../src/email/inquiry-worker"

runInquiryWorker({ once: true }).then((result) => {
  console.log(`[inquiry-worker] ${result?.processed ? result.status : "no pending work"}`)
}).catch((error) => {
  console.error("[inquiry-worker] stopped with an error", error instanceof Error ? error.name : "unknown")
  process.exitCode = 1
})
