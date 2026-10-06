import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto"
import { getServerEnv } from "@/env"

const VERSION = "v1"

function key() {
  const encoded = getServerEnv().EMAIL_ENCRYPTION_KEY
  if (!encoded) {
    throw new Error("EMAIL_ENCRYPTION_KEY is required before an SMTP password can be stored or used.")
  }
  const value = Buffer.from(encoded, "base64")
  if (value.length !== 32) throw new Error("EMAIL_ENCRYPTION_KEY must decode to exactly 32 bytes.")
  return value
}

export function encryptSmtpPassword(plaintext: string) {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", key(), iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  return [VERSION, iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), ciphertext.toString("base64url")].join(".")
}

export function decryptSmtpPassword(value: string) {
  const [version, ivPart, tagPart, ciphertextPart, extra] = value.split(".")
  if (version !== VERSION || !ivPart || !tagPart || !ciphertextPart || extra) {
    throw new Error("The stored SMTP credential has an unsupported format.")
  }
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(ivPart, "base64url"))
  decipher.setAuthTag(Buffer.from(tagPart, "base64url"))
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextPart, "base64url")),
    decipher.final(),
  ]).toString("utf8")
}
