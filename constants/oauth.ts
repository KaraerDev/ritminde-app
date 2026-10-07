import * as Linking from "expo-linking";
import Constants from "expo-constants";
import * as ReactNative from "react-native";
import { APP_DEEP_LINK_SCHEME } from "@/shared/appIdentity";

const schemeFromBundleId = APP_DEEP_LINK_SCHEME;
const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string | undefined>;

const env = {
  portal: extra.oauthPortalUrl ?? process.env.EXPO_PUBLIC_OAUTH_PORTAL_URL ?? "",
  server: extra.oauthServerUrl ?? process.env.EXPO_PUBLIC_OAUTH_SERVER_URL ?? "",
  appId: extra.appId ?? process.env.EXPO_PUBLIC_APP_ID ?? "",
  ownerId: process.env.EXPO_PUBLIC_OWNER_OPEN_ID ?? "",
  ownerName: process.env.EXPO_PUBLIC_OWNER_NAME ?? "",
  apiBaseUrl: extra.apiBaseUrl ?? process.env.EXPO_PUBLIC_API_BASE_URL ?? "",
  deepLinkScheme: schemeFromBundleId,
};

export const OAUTH_PORTAL_URL = env.portal;
export const OAUTH_SERVER_URL = env.server;
export const APP_ID = env.appId;
export const OWNER_OPEN_ID = env.ownerId;
export const OWNER_NAME = env.ownerName;
export const API_BASE_URL = env.apiBaseUrl;

export function getApiBaseUrl(): string {
  if (API_BASE_URL) return API_BASE_URL.replace(/\/$/, "");
  if (ReactNative.Platform.OS === "web" && typeof window !== "undefined") {
    const { protocol, hostname } = window.location;
    const apiHostname = hostname.replace(/^8081-/, "3000-");
    if (apiHostname !== hostname) return `${protocol}//${apiHostname}`;
  }
  return "";
}

export const SESSION_TOKEN_KEY = "app_session_token";
export const USER_INFO_KEY = "manus-runtime-user-info";
export type LoginFlow = "signIn" | "signUp";

export function getRedirectUri(): string {
  if (ReactNative.Platform.OS === "web" && typeof window !== "undefined") {
    return new URL("/oauth/callback", window.location.origin).toString();
  }
  return Linking.createURL("/oauth/callback", { scheme: env.deepLinkScheme });
}

/** The API creates the signed state and its one-use nonce before sending the browser to Manus OAuth. */
export function getLoginUrl(flow: LoginFlow = "signIn"): string {
  const apiBase = getApiBaseUrl();
  if (!apiBase || !env.appId || !env.portal) {
    throw new Error("Güvenli hesap bağlantısı şu anda kullanılamıyor.");
  }
  const startUrl = new URL("/api/oauth/start", apiBase);
  startUrl.searchParams.set("flow", flow);
  startUrl.searchParams.set("client", ReactNative.Platform.OS === "web" ? "web" : "native");
  startUrl.searchParams.set("redirectUri", getRedirectUri());
  return startUrl.toString();
}

export async function startOAuthLogin(flow: LoginFlow = "signIn"): Promise<void> {
  const loginUrl = getLoginUrl(flow);
  if (ReactNative.Platform.OS === "web") {
    if (typeof window === "undefined") throw new Error("Bu tarayıcıda hesap bağlantısı açılamadı.");
    window.location.assign(loginUrl);
    return;
  }
  if (!(await Linking.canOpenURL(loginUrl))) throw new Error("Güvenli giriş penceresi açılamadı.");
  await Linking.openURL(loginUrl);
}
