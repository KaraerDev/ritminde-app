import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { ENV } from "./env";

export const OAUTH_NONCE_COOKIE = "webdev_oauth_nonce";
export const OAUTH_STATE_TTL_MS = 10 * 60_000;
export type OAuthClient = "web" | "native";
export type OAuthFlow = "signIn" | "signUp";
export type OAuthStatePayload = {
  redirectUri: string;
  nonce: string;
  appId: string;
  issuedAt: number;
  client: OAuthClient;
  flow: OAuthFlow;
};

const issuedNonces = new Map<string, number>();

function sign(payload: OAuthStatePayload, secret: string): string {
  const ordered = {
    redirectUri: payload.redirectUri,
    nonce: payload.nonce,
    appId: payload.appId,
    issuedAt: payload.issuedAt,
    client: payload.client,
    flow: payload.flow,
  };
  return createHmac("sha256", secret).update(JSON.stringify(ordered)).digest("base64url");
}

export function createOAuthState(
  input: Pick<OAuthStatePayload, "redirectUri" | "appId" | "client" | "flow">,
  secret = ENV.cookieSecret,
  now = Date.now(),
): { state: string; nonce: string; expiresAt: number } {
  if (!secret) throw new Error("OAuth signing secret is unavailable");
  const nonce = randomBytes(32).toString("base64url");
  const payload: OAuthStatePayload = { ...input, nonce, issuedAt: now };
  const value = { ...payload, signature: sign(payload, secret) };
  const state = Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
  issuedNonces.set(nonce, now + OAUTH_STATE_TTL_MS);
  if (issuedNonces.size > 2048) {
    for (const [key, expiry] of issuedNonces) {
      if (expiry <= now) issuedNonces.delete(key);
    }
  }
  return { state, nonce, expiresAt: now + OAUTH_STATE_TTL_MS };
}

export function verifyOAuthState(
  state: string,
  secret = ENV.cookieSecret,
  now = Date.now(),
): OAuthStatePayload | null {
  if (!secret || typeof state !== "string" || state.length > 4096) return null;
  try {
    const decoded = JSON.parse(Buffer.from(state, "base64url").toString("utf8")) as Record<string, unknown>;
    const { redirectUri, nonce, appId, issuedAt, client, flow, signature } = decoded;
    if (
      typeof redirectUri !== "string" ||
      typeof nonce !== "string" ||
      typeof appId !== "string" ||
      typeof issuedAt !== "number" ||
      (client !== "web" && client !== "native") ||
      (flow !== "signIn" && flow !== "signUp") ||
      typeof signature !== "string" ||
      appId !== ENV.appId ||
      issuedAt > now + 30_000 ||
      now - issuedAt > OAUTH_STATE_TTL_MS
    ) return null;

    const payload: OAuthStatePayload = { redirectUri, nonce, appId, issuedAt, client, flow };
    const expected = Buffer.from(sign(payload, secret), "base64url");
    const supplied = Buffer.from(signature, "base64url");
    if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function consumeOAuthState(
  state: string,
  suppliedNonce?: string,
  secret = ENV.cookieSecret,
  now = Date.now(),
): OAuthStatePayload | null {
  const payload = verifyOAuthState(state, secret, now);
  if (!payload) return null;
  const expiry = issuedNonces.get(payload.nonce);
  if (expiry === undefined || expiry <= now) {
    issuedNonces.delete(payload.nonce);
    return null;
  }
  if (payload.client === "web" && suppliedNonce !== payload.nonce) return null;
  issuedNonces.delete(payload.nonce);
  return payload;
}
