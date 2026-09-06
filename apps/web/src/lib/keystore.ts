/**
 * A browser-side keystore.
 *
 * This is the file that makes the pitch true of the console itself. Before it,
 * the server derived every private key and a "signature" would have been the
 * server verifying its own work — you cannot prove possession of a key to
 * something that already holds it.
 *
 * Now the key lives here, encrypted at rest with a passphrase the server never
 * sees, and sign-in is a signature the server can check against on-chain state.
 * It also makes GuardianRecovery mean something: if the key is genuinely the
 * person's, losing it is a real event and an m-of-n quorum is a real answer.
 *
 * PBKDF2-SHA256 → AES-GCM, both via WebCrypto. No dependency, and nothing here
 * runs on the server.
 */

const STORAGE_KEY = "sih26125.keystore.v1";
const PBKDF2_ITERATIONS = 310_000; // OWASP's floor for PBKDF2-SHA256

export interface StoredKeystore {
  address: string;
  salt: string;
  iv: string;
  ciphertext: string;
  createdAt: string;
}

function toBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

function fromBase64(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export function readKeystore(): StoredKeystore | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredKeystore) : null;
  } catch {
    return null;
  }
}

export function forgetKeystore(): void {
  window.localStorage.removeItem(STORAGE_KEY);
}

/** Encrypt a private key under a passphrase and keep it in this browser only. */
export async function enrolKey(
  privateKey: string,
  passphrase: string,
  address: string,
): Promise<StoredKeystore> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);

  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv as BufferSource },
      key,
      new TextEncoder().encode(privateKey),
    ),
  );

  const stored: StoredKeystore = {
    address,
    salt: toBase64(salt),
    iv: toBase64(iv),
    ciphertext: toBase64(ciphertext),
    createdAt: new Date().toISOString(),
  };

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  return stored;
}

/**
 * Decrypt the stored key. Returns null on a wrong passphrase — AES-GCM's
 * authentication tag fails to verify, which is the check, so there is no
 * separate password comparison to get wrong.
 */
export async function unlockKey(passphrase: string): Promise<string | null> {
  const stored = readKeystore();
  if (!stored) return null;

  try {
    const key = await deriveKey(passphrase, fromBase64(stored.salt));
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromBase64(stored.iv) as BufferSource },
      key,
      fromBase64(stored.ciphertext) as BufferSource,
    );
    return new TextDecoder().decode(plaintext);
  } catch {
    return null;
  }
}
