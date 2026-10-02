/**
 * Secure CMS account bootstrap.
 *
 *   npm run bootstrap:users
 *
 * Credentials come only from the environment or an interactive hidden prompt:
 *   INHERITIX_ADMIN_EMAIL / INHERITIX_ADMIN_PASSWORD / INHERITIX_ADMIN_NAME
 *   INHERITIX_EDITOR_EMAIL / INHERITIX_EDITOR_PASSWORD / INHERITIX_EDITOR_NAME (optional)
 * There are no default passwords and nothing secret is ever printed.
 *
 * It also audits every account for the published legacy default passwords
 * from the original seed. Any match is locked (random unknown password +
 * passwordRotationRequired) until a new password is supplied here or set by
 * an administrator. Hashes are verified offline, so no login attempts are used.
 */
import crypto from "node:crypto"
import readline from "node:readline"
import { getPayload, type Payload } from "payload"
import config from "../src/payload.config"
import { LEGACY_DEFAULT_PASSWORDS, passwordPolicyProblem } from "../src/cms/credential-policy"

type Role = "admin" | "editor"
type AccountRequest = { role: Role; email: string; password: string; name: string }

const context = { disableRevalidate: true }
const interactive = Boolean(process.stdin.isTTY && process.stdout.isTTY)

function ask(question: string, hidden = false): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true })
    if (hidden) {
      const output = rl as unknown as { _writeToOutput: (s: string) => void }
      output._writeToOutput = (s: string) => {
        if (s.includes(question)) process.stdout.write(question)
      }
    }
    rl.question(question, (answer) => {
      rl.close()
      if (hidden) process.stdout.write("\n")
      resolve(answer.trim())
    })
  })
}

async function readAccount(role: Role, required: boolean): Promise<AccountRequest | null> {
  const prefix = `INHERITIX_${role.toUpperCase()}`
  let email = process.env[`${prefix}_EMAIL`]?.trim() ?? ""
  let password = process.env[`${prefix}_PASSWORD`] ?? ""
  let name = process.env[`${prefix}_NAME`]?.trim() ?? ""

  if (!email && interactive) {
    email = await ask(`${role} email${required ? "" : " (blank to skip)"}: `)
  }
  if (!email) {
    if (required) {
      throw new Error(
        `No ${role} credentials supplied. Set ${prefix}_EMAIL and ${prefix}_PASSWORD, or run this command in an interactive terminal.`,
      )
    }
    return null
  }
  if (!password && interactive) {
    password = await ask(`${role} password for ${email} (hidden): `, true)
    const confirm = await ask("Confirm password (hidden): ", true)
    if (confirm !== password) throw new Error("Passwords do not match.")
  }
  if (!password) throw new Error(`${prefix}_PASSWORD is required for ${email}.`)
  const problem = passwordPolicyProblem(password, email)
  if (problem) throw new Error(`${role} password rejected: ${problem}`)
  if (!name) name = interactive ? (await ask(`${role} display name: `)) || email : email
  return { role, email: email.toLowerCase(), password, name }
}

function matchesPassword(password: string, salt: string, storedHash: string) {
  const current = storedHash.startsWith("pbkdf2-sha256-v1:")
  const hex = current ? storedHash.slice("pbkdf2-sha256-v1:".length) : storedHash
  const derived = crypto.pbkdf2Sync(password, salt, current ? 600000 : 25000, current ? 32 : 512, "sha256")
  const stored = Buffer.from(hex, "hex")
  return derived.length === stored.length && crypto.timingSafeEqual(derived, stored)
}

async function auditLegacyPasswords(payload: Payload, replacements: Set<string>) {
  const rows = (await payload.db.find({
    collection: "users",
    limit: 0,
    pagination: false,
  })) as { docs: Array<{ id: number; email: string; salt?: string; hash?: string }> }

  let locked = 0
  for (const user of rows.docs) {
    if (!user.salt || !user.hash) continue
    const legacy = LEGACY_DEFAULT_PASSWORDS.some((pw) => matchesPassword(pw, user.salt!, user.hash!))
    if (!legacy) continue
    if (replacements.has(user.email.toLowerCase())) {
      console.log(`  ! ${user.email} used a published default password — it will be replaced now.`)
      continue
    }
    await payload.update({
      collection: "users",
      id: user.id,
      data: {
        password: `${crypto.randomBytes(32).toString("base64url")}aA1!`,
        passwordRotationRequired: true,
      },
      overrideAccess: true,
      context,
    })
    // beforeChange clears the flag when a password is set; re-assert the lock.
    await payload.db.updateOne({
      collection: "users",
      id: user.id,
      data: { passwordRotationRequired: true },
    })
    locked += 1
    console.log(
      `  ✗ ${user.email} used a published default password. The account is now locked with an unknown password; supply a new password for it via this command.`,
    )
  }
  return locked
}

async function upsertAccount(payload: Payload, account: AccountRequest) {
  const existing = await payload.find({
    collection: "users",
    where: { email: { equals: account.email } },
    limit: 1,
    overrideAccess: true,
  })
  if (existing.docs[0]) {
    const roles = new Set([...(existing.docs[0].roles ?? []), account.role])
    await payload.update({
      collection: "users",
      id: existing.docs[0].id,
      data: { password: account.password, name: account.name, roles: [...roles], passwordRotationRequired: false },
      overrideAccess: true,
      context,
    })
    console.log(`  ✓ Updated ${account.role} ${account.email} (password replaced, roles: ${[...roles].join(", ")}).`)
  } else {
    await payload.create({
      collection: "users",
      data: { email: account.email, password: account.password, name: account.name, roles: [account.role] },
      overrideAccess: true,
      context,
    })
    console.log(`  ✓ Created ${account.role} ${account.email}.`)
  }
}

async function main() {
  const payload = await getPayload({ config })

  const admins = await payload.count({ collection: "users", where: { roles: { contains: "admin" } }, overrideAccess: true })
  const accounts: AccountRequest[] = []
  const admin = await readAccount("admin", admins.totalDocs === 0)
  if (admin) accounts.push(admin)
  const editor = await readAccount("editor", false)
  if (editor) accounts.push(editor)

  console.log("→ Auditing existing accounts for published default passwords")
  const locked = await auditLegacyPasswords(payload, new Set(accounts.map((a) => a.email)))
  if (locked === 0) console.log("  ✓ No account uses a published default password.")

  if (accounts.length > 0) console.log("→ Applying supplied accounts")
  for (const account of accounts) await upsertAccount(payload, account)

  if (locked > 0) {
    console.warn(`\n⚠ ${locked} account(s) remain locked until a new password is supplied (exit code 2).`)
    process.exitCode = 2
    return
  }
  console.log("\n✅ Account bootstrap finished.")
}

try {
  await main()
  process.exit(process.exitCode ?? 0)
} catch (error) {
  console.error(`\n❌ Account bootstrap failed: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
}
