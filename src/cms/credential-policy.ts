/**
 * Password policy for CMS accounts.
 *
 * The milestone-two baseline (commit fe32d46) shipped seed fallbacks with
 * publicly known passwords. Those values are blocked here forever and are used
 * by `npm run bootstrap:users` to detect and lock any account still using them.
 * They are compared, never logged.
 */
export const LEGACY_DEFAULT_PASSWORDS: readonly string[] = [
  "InheritixAdmin2026!",
  "InheritixEditor2026!",
]

export const LEGACY_DEFAULT_ACCOUNTS: readonly string[] = [
  "admin@inheritixai.com",
  "editor@inheritixai.com",
]

export const MIN_PASSWORD_LENGTH = 14

export function passwordPolicyProblem(password: string, email?: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
  }
  if (LEGACY_DEFAULT_PASSWORDS.some((legacy) => legacy.toLowerCase() === password.toLowerCase())) {
    return "This password was a published default and can never be used."
  }
  if (email && password.toLowerCase().includes(email.split("@")[0]!.toLowerCase())) {
    return "Password must not contain the account name."
  }
  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((re) => re.test(password)).length
  if (classes < 3) {
    return "Password must mix at least three of: lowercase, uppercase, digits, symbols."
  }
  return null
}
