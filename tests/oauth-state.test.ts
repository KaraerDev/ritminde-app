import { describe, expect, it } from "vitest";
import { createOAuthState, consumeOAuthState, OAUTH_STATE_TTL_MS, verifyOAuthState } from "../server/_core/oauth-state";
import { ENV } from "../server/_core/env";

const secret = "unit-test-secret";
const baseInput = {
  redirectUri: "https://preview.manus.computer/oauth/callback",
  appId: ENV.appId,
  client: "web" as const,
  flow: "signUp" as const,
};

describe("Manus OAuth state", () => {
  it("nonce ve hedef URL'yi imzalar, web callback'te doğru cookie nonce ister ve tek kez kullanır", () => {
    const now = 1_800_000_000_000;
    const issued = createOAuthState(baseInput, secret, now);
    expect(verifyOAuthState(issued.state, secret, now)?.redirectUri).toBe(baseInput.redirectUri);
    expect(consumeOAuthState(issued.state, "wrong-nonce", secret, now)).toBeNull();
    expect(consumeOAuthState(issued.state, issued.nonce, secret, now)?.flow).toBe("signUp");
    expect(consumeOAuthState(issued.state, issued.nonce, secret, now)).toBeNull();
  });

  it("imza değiştirilirse ya da süre aşılırsa state'i reddeder", () => {
    const now = 1_800_100_000_000;
    const issued = createOAuthState(baseInput, secret, now);
    const tampered = `${issued.state.slice(0, -2)}AA`;
    expect(verifyOAuthState(tampered, secret, now)).toBeNull();
    expect(verifyOAuthState(issued.state, secret, now + OAUTH_STATE_TTL_MS + 1)).toBeNull();
  });

  it("native callback state'ini istemci cookie'si olmadan bir kez kabul eder", () => {
    const now = 1_800_200_000_000;
    const issued = createOAuthState({ ...baseInput, client: "native", flow: "signIn", redirectUri: "manus278548153654955:/oauth/callback" }, secret, now);
    expect(consumeOAuthState(issued.state, undefined, secret, now)?.client).toBe("native");
  });
});
