/** Test-harness entry point. Production and CI continue using scripts/payload.mjs. */
import payload from "payload"
import config from "../src/payload.config"

await payload.init({ config, disableOnInit: true })
await payload.db.migrate()
await payload.db.migrateStatus()
process.exit(0)
