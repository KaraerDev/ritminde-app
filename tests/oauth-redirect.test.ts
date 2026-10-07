import { describe, expect, it } from "vitest";
import { APP_DEEP_LINK_SCHEME } from "../shared/appIdentity";
import { isAllowedNativeOAuthRedirectUri, isAllowedWebOAuthRedirectUri } from "../shared/oauthRedirect";

describe("Web OAuth callback URL", () => {
  const origins = ["https://8328-project.manus.computer"];

  it("yalnızca yapılandırılmış proje originindeki sabit callback yolunu kabul eder", () => {
    expect(isAllowedWebOAuthRedirectUri("https://8328-project.manus.computer/oauth/callback", origins)).toBe(true);
    expect(isAllowedWebOAuthRedirectUri("https://8328-project.manus.computer/oauth/callback", origins, "https://8328-project.manus.computer/settings")).toBe(true);
    expect(isAllowedWebOAuthRedirectUri("https://attacker.manus.computer/oauth/callback", origins, "https://attacker.manus.computer/")).toBe(false);
    expect(isAllowedWebOAuthRedirectUri("https://8328-project.manus.computer/oauth/callback", origins, "https://attacker.manus.computer/")).toBe(false);
    expect(isAllowedWebOAuthRedirectUri("https://8328-project.manus.computer/other", origins)).toBe(false);
    expect(isAllowedWebOAuthRedirectUri("https://8328-project.manus.computer/oauth/callback?next=https://attacker.example", origins)).toBe(false);
  });
});

describe("Expo native callback URL", () => {
  it("bu uygulamanın custom scheme callback biçimlerini kabul eder", () => {
    expect(isAllowedNativeOAuthRedirectUri(`${APP_DEEP_LINK_SCHEME}://oauth/callback`)).toBe(true);
    expect(isAllowedNativeOAuthRedirectUri(`${APP_DEEP_LINK_SCHEME}:/oauth/callback`)).toBe(true);
  });

  it("başka uygulama şemasını, genel web yönlendirmesini ve parametreli URL'yi reddeder", () => {
    expect(isAllowedNativeOAuthRedirectUri("manus12345://oauth/callback")).toBe(false);
    expect(isAllowedNativeOAuthRedirectUri("https://evil.example/oauth/callback")).toBe(false);
    expect(isAllowedNativeOAuthRedirectUri(`${APP_DEEP_LINK_SCHEME}://oauth/callback?next=https://evil.example`)).toBe(false);
  });

  it("Expo Go için yerel veya tam yapılandırılmış hostu kabul edip uzak yabancı hostu reddeder", () => {
    expect(isAllowedNativeOAuthRedirectUri("exp://192.168.1.10:8081/--/oauth/callback")).toBe(true);
    expect(isAllowedNativeOAuthRedirectUri("exps://8081-preview.manus.computer/--/oauth/callback", ["8081-preview.manus.computer"])).toBe(true);
    expect(isAllowedNativeOAuthRedirectUri("exp://attacker.example/--/oauth/callback")).toBe(false);
  });
});
