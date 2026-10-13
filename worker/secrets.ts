const enc = new TextEncoder();
const dec = new TextDecoder();
const pack = (b: Uint8Array) => btoa(String.fromCharCode(...b));
const unpack = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
async function key(value: string) {
  const b = unpack(value);
  if (b.length !== 32) throw Error("Secret key must be 32 bytes");
  return crypto.subtle.importKey("raw", b, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}
export async function encryptSecret(s: string, id: string, master: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: enc.encode(id) },
    await key(master),
    enc.encode(s),
  );
  return `v1.${pack(iv)}.${pack(new Uint8Array(cipher))}`;
}
export async function decryptSecret(s: string, id: string, master: string) {
  const [v, iv, data] = s.split(".");
  if (v !== "v1") throw Error("Unknown key version");
  return dec.decode(
    await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: unpack(iv), additionalData: enc.encode(id) },
      await key(master),
      unpack(data),
    ),
  );
}
export function validateWebhook(value: string) {
  const u = new URL(value);
  if (
    u.protocol !== "https:" ||
    u.hostname !== "chat.googleapis.com" ||
    u.port ||
    u.username ||
    u.password ||
    !/^\/v1\/spaces\/[^/]+\/messages$/.test(u.pathname) ||
    !u.searchParams.get("key") ||
    !u.searchParams.get("token")
  )
    throw Error("Webhook Google Chat không hợp lệ");
  return u.toString();
}
