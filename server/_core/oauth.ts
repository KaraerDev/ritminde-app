import { ONE_YEAR_MS } from "../../shared/const.js";
import { parse as parseCookieHeader } from "cookie";
import type { Express, Request, Response } from "express";
import { getUserByOpenId, upsertUser } from "../db";
import { ENV } from "./env";
import {
  consumeOAuthState,
  createOAuthState,
  OAUTH_NONCE_COOKIE,
  OAUTH_STATE_TTL_MS,
  verifyOAuthState,
} from "./oauth-state";
import { getSessionCookieName, getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import { isAllowedNativeOAuthRedirectUri, isAllowedWebOAuthRedirectUri } from "../../shared/oauthRedirect";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

function configuredWebOrigins(): string[] {
  return [process.env.EXPO_WEB_PREVIEW_URL, process.env.EXPO_PACKAGER_PROXY_URL]
    .flatMap((value) => {
      if (!value) return [];
      try {
        const url = new URL(value);
        return url.protocol === "https:" || url.protocol === "http:" ? [url.origin] : [];
      } catch { return []; }
    });
}

function configuredExpoHosts(): string[] {
  return [process.env.EXPO_PACKAGER_PROXY_URL, process.env.EXPO_WEB_PREVIEW_URL]
    .flatMap((value) => {
      if (!value) return [];
      try { return [new URL(value).hostname]; } catch { return []; }
    });
}

function isAllowedRedirectUri(raw: string, client: "web" | "native", req: Request): boolean {
  if (client === "native") return isAllowedNativeOAuthRedirectUri(raw, configuredExpoHosts());
  return isAllowedWebOAuthRedirectUri(raw, configuredWebOrigins(), req.get("origin") || req.get("referer"));
}

function syncUser(userInfo: {
  openId?: string | null;
  name?: string | null;
  email?: string | null;
  loginMethod?: string | null;
  platform?: string | null;
}) {
  if (!userInfo.openId) throw new Error("OAuth kimliği alınamadı.");
  const lastSignedIn = new Date();
  return (async () => {
    await upsertUser({
      openId: userInfo.openId!,
      name: userInfo.name || null,
      email: userInfo.email ?? null,
      loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
      lastSignedIn,
    });
    const saved = await getUserByOpenId(userInfo.openId!);
    return saved ?? {
      openId: userInfo.openId!,
      name: userInfo.name,
      email: userInfo.email,
      loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
      lastSignedIn,
    };
  })();
}

function buildUserResponse(user: Awaited<ReturnType<typeof getUserByOpenId>> | {
  openId: string;
  name?: string | null;
  email?: string | null;
  loginMethod?: string | null;
  lastSignedIn?: Date | null;
}) {
  return {
    id: (user as any)?.id ?? null,
    openId: user?.openId ?? null,
    name: user?.name ?? null,
    email: user?.email ?? null,
    loginMethod: user?.loginMethod ?? null,
    lastSignedIn: (user?.lastSignedIn ?? new Date()).toISOString(),
  };
}

function consumeRequestState(req: Request, res: Response, state: string) {
  const cookies = req.headers.cookie ? parseCookieHeader(req.headers.cookie) : {};
  const stateInfo = verifyOAuthState(state);
  const payload = consumeOAuthState(state, cookies[OAUTH_NONCE_COOKIE]);
  if (stateInfo?.client === "web") {
    res.clearCookie(OAUTH_NONCE_COOKIE, getSessionCookieOptions(req));
  }
  return payload;
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/start", (req: Request, res: Response) => {
    const redirectUri = getQueryParam(req, "redirectUri");
    const clientValue = getQueryParam(req, "client");
    const flowValue = getQueryParam(req, "flow");
    const client = clientValue === "web" || clientValue === "native" ? clientValue : null;
    const flow = flowValue === "signUp" || flowValue === "signIn" ? flowValue : null;

    if (!redirectUri || !client || !flow || !isAllowedRedirectUri(redirectUri, client, req)) {
      res.status(400).json({ error: "Güvenli giriş dönüş adresi doğrulanamadı. Lütfen yeniden deneyin." });
      return;
    }
    if (!ENV.oAuthPortalUrl || !ENV.appId || !ENV.cookieSecret) {
      res.status(503).json({ error: "Üyelik hizmeti şu anda kullanılamıyor." });
      return;
    }

    try {
      const { state, nonce } = createOAuthState({ redirectUri, appId: ENV.appId, client, flow });
      if (client === "web") {
        res.cookie(OAUTH_NONCE_COOKIE, nonce, {
          ...getSessionCookieOptions(req),
          maxAge: OAUTH_STATE_TTL_MS,
        });
      }
      const portalUrl = new URL(`${ENV.oAuthPortalUrl.replace(/\/$/, "")}/app-auth`);
      portalUrl.searchParams.set("appId", ENV.appId);
      portalUrl.searchParams.set("redirectUri", redirectUri);
      portalUrl.searchParams.set("state", state);
      portalUrl.searchParams.set("responseType", "code");
      portalUrl.searchParams.set("type", flow);
      res.redirect(302, portalUrl.toString());
    } catch {
      console.error("[OAuth] Unable to start account flow");
      res.status(500).json({ error: "Giriş penceresi başlatılamadı. Biraz sonra tekrar deneyin." });
    }
  });

  // Compatibility callback for providers that return directly to the API host.
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    if (!code || !state) {
      res.status(400).json({ error: "Giriş tamamlanamadı. Kod ve durum bilgisi eksik." });
      return;
    }
    const oauthState = consumeRequestState(req, res, state);
    if (!oauthState || oauthState.client !== "web") {
      res.status(400).json({ error: "Giriş isteğinin süresi doldu. Lütfen yeniden deneyin." });
      return;
    }
    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      await syncUser(userInfo);
      const sessionToken = await sdk.createSessionToken(userInfo.openId!, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });
      res.cookie(getSessionCookieName(req), sessionToken, {
        ...getSessionCookieOptions(req),
        maxAge: ONE_YEAR_MS,
      });
      res.redirect(302, new URL("/", oauthState.redirectUri).toString());
    } catch {
      console.error("[OAuth] Browser callback failed");
      res.status(500).json({ error: "Hesap bağlantısı tamamlanamadı. Yeniden deneyin." });
    }
  });

  app.post("/api/oauth/mobile", async (req: Request, res: Response) => {
    const code = typeof req.body?.code === "string" ? req.body.code : "";
    const state = typeof req.body?.state === "string" ? req.body.state : "";
    if (!code || !state) {
      res.status(400).json({ error: "Giriş tamamlanamadı. Kod ve durum bilgisi eksik." });
      return;
    }
    const oauthState = consumeRequestState(req, res, state);
    if (!oauthState) {
      res.status(400).json({ error: "Giriş isteğinin süresi doldu veya doğrulanamadı. Lütfen yeniden deneyin." });
      return;
    }

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      const user = await syncUser(userInfo);
      const sessionToken = await sdk.createSessionToken(userInfo.openId!, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });
      res.cookie(getSessionCookieName(req), sessionToken, {
        ...getSessionCookieOptions(req),
        maxAge: ONE_YEAR_MS,
      });
      res.json({ app_session_id: sessionToken, user: buildUserResponse(user) });
    } catch {
      console.error("[OAuth] Account code exchange failed");
      res.status(502).json({ error: "Hesap bilgisi alınamadı. Giriş işlemini yeniden başlatın." });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    res.clearCookie(getSessionCookieName(req), { ...getSessionCookieOptions(req), maxAge: -1 });
    res.json({ success: true });
  });

  app.get("/api/auth/me", async (req: Request, res: Response) => {
    try {
      const user = await sdk.authenticateRequest(req);
      res.json({ user: buildUserResponse(user) });
    } catch {
      res.status(401).json({ error: "Oturum açık değil.", user: null });
    }
  });

  app.post("/api/auth/session", async (req: Request, res: Response) => {
    try {
      const user = await sdk.authenticateRequest(req);
      const authHeader = req.headers.authorization || req.headers.Authorization;
      if (typeof authHeader !== "string" || !authHeader.startsWith("Bearer ")) {
        res.status(400).json({ error: "Bearer oturum anahtarı gerekli." });
        return;
      }
      const token = authHeader.slice("Bearer ".length).trim();
      res.cookie(getSessionCookieName(req), token, {
        ...getSessionCookieOptions(req),
        maxAge: ONE_YEAR_MS,
      });
      res.json({ success: true, user: buildUserResponse(user) });
    } catch {
      res.status(401).json({ error: "Oturum doğrulanamadı." });
    }
  });
}
