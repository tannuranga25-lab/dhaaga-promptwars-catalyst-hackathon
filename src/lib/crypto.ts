import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const PASSCODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export async function hashPasscode(passcode: string): Promise<string> {
  const salt = randomBytes(16);
  const derivedKey = (await scrypt(passcode, salt, 64)) as Buffer;
  return `scrypt$${salt.toString("base64url")}$${derivedKey.toString("base64url")}`;
}

export async function verifyPasscode(passcode: string, encoded: string): Promise<boolean> {
  const [algorithm, saltText, keyText] = encoded.split("$");
  if (algorithm !== "scrypt" || !saltText || !keyText) return false;
  try {
    const salt = Buffer.from(saltText, "base64url");
    const expected = Buffer.from(keyText, "base64url");
    if (salt.length !== 16 || expected.length !== 64) return false;
    const actual = (await scrypt(passcode, salt, expected.length)) as Buffer;
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export function generatePasscode(length = 8): string {
  if (!Number.isInteger(length) || length < 1 || length > 128) {
    throw new RangeError("Passcode length must be between 1 and 128.");
  }
  const output: string[] = [];
  for (let index = 0; index < length; index += 1) {
    output.push(PASSCODE_ALPHABET[randomBytes(1)[0] % PASSCODE_ALPHABET.length]);
  }
  return output.join("");
}

export function generateCircleCode(): string {
  return `${generatePasscode(4)}-${generatePasscode(4)}`;
}

export function normalizeCircleCode(code: string): string {
  return code.replaceAll("-", "").toUpperCase();
}
