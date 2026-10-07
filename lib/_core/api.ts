import { Platform } from "react-native";
import { getApiBaseUrl } from "@/constants/oauth";
import * as Auth from "./auth";

type ApiResponse<T> = { data?: T; error?: string };
export type AuthenticatedUser = {
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  loginMethod: string | null;
  lastSignedIn: string;
};

export async function apiCall<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };
  if (Platform.OS !== "web") {
    const sessionToken = await Auth.getSessionToken();
    if (sessionToken) headers.Authorization = `Bearer ${sessionToken}`;
  }

  const baseUrl = getApiBaseUrl();
  const cleanBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = baseUrl ? `${cleanBaseUrl}${cleanEndpoint}` : endpoint;
  try {
    const response = await fetch(url, { ...options, headers, credentials: "include" });
    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = errorText;
      try {
        const errorJson = JSON.parse(errorText) as { error?: string; message?: string };
        errorMessage = errorJson.error || errorJson.message || errorText;
      } catch { /* Use the server's text message. */ }
      throw new Error(errorMessage || `API isteği başarısız: ${response.statusText}`);
    }
    const contentType = response.headers.get("content-type");
    if (contentType?.includes("application/json")) return (await response.json()) as T;
    const text = await response.text();
    return (text ? JSON.parse(text) : {}) as T;
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error("Sunucuya bağlanılamadı.");
  }
}

export async function exchangeOAuthCode(
  code: string,
  state: string,
): Promise<{ sessionToken: string; user: AuthenticatedUser }> {
  const result = await apiCall<{ app_session_id: string; user: AuthenticatedUser }>("/api/oauth/mobile", {
    method: "POST",
    body: JSON.stringify({ code, state }),
  });
  return { sessionToken: result.app_session_id, user: result.user };
}

export async function logout(): Promise<void> {
  // Native auth is a bearer token stored only on-device; Web auth is an HttpOnly cookie.
  if (Platform.OS !== "web") return;
  await apiCall<void>("/api/auth/logout", { method: "POST" });
}

export async function getMe(): Promise<AuthenticatedUser | null> {
  try {
    const result = await apiCall<{ user: AuthenticatedUser | null }>("/api/auth/me");
    return result.user || null;
  } catch {
    return null;
  }
}

export async function establishSession(token: string): Promise<boolean> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/api/auth/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      credentials: "include",
    });
    return response.ok;
  } catch {
    return false;
  }
}
