import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { createCorsMiddleware } from "./cors";
import { clearLegacySessionCookie } from "./cookies";
import { transcribeAudioBuffer } from "./voiceTranscription";
import { sdk } from "./sdk";

const voiceRateWindows = new Map<string, { count: number; startedAt: number }>();
const VOICE_REQUEST_LIMIT = 20;
const VOICE_WINDOW_MS = 60 * 60_000;
const allowedAudioTypes = new Set(["audio/m4a", "audio/mp4", "audio/webm", "audio/wav", "audio/x-wav", "audio/mpeg", "audio/ogg"]);

function limitVoiceRequests(req: express.Request, res: express.Response, next: express.NextFunction) {
  const now = Date.now();
  const client = String(res.locals.voiceMemberId || req.ip || req.socket.remoteAddress || "unknown");
  let window = voiceRateWindows.get(client);
  if (!window || now - window.startedAt >= VOICE_WINDOW_MS) {
    window = { count: 0, startedAt: now };
    voiceRateWindows.set(client, window);
  }
  if (window.count >= VOICE_REQUEST_LIMIT) {
    res.setHeader("Retry-After", String(Math.ceil((window.startedAt + VOICE_WINDOW_MS - now) / 1000)));
    res.status(429).json({ error: "Sesli görev ekleme sınırına ulaşıldı. Bir saat sonra yeniden deneyebilirsin." });
    return;
  }
  window.count += 1;
  res.setHeader("RateLimit-Limit", String(VOICE_REQUEST_LIMIT));
  res.setHeader("RateLimit-Remaining", String(VOICE_REQUEST_LIMIT - window.count));
  if (voiceRateWindows.size > 2048) {
    for (const [key, entry] of voiceRateWindows) {
      if (now - entry.startedAt >= VOICE_WINDOW_MS) voiceRateWindows.delete(key);
    }
  }
  next();
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  app.use(createCorsMiddleware());
  app.use(clearLegacySessionCookie());

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  app.post("/api/voice/transcribe", async (req, res, next) => {
    try {
      const user = await sdk.authenticateRequest(req);
      res.locals.voiceMemberId = user.openId;
      next();
    }
    catch { res.status(401).json({ error: "Sesli görev eklemek için oturum açman gerekiyor." }); }
  }, limitVoiceRequests, express.raw({ type: "audio/*", limit: "16mb" }), async (req, res) => {
    const contentType = (req.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    if (!allowedAudioTypes.has(contentType)) {
      res.status(415).json({ error: "Desteklenen bir ses kayıt biçimi seç." });
      return;
    }
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      res.status(400).json({ error: "Ses kaydı boş görünüyor." });
      return;
    }
    const result = await transcribeAudioBuffer(req.body, contentType, "tr");
    if ("error" in result) {
      res.status(result.code === "FILE_TOO_LARGE" ? 413 : 502).json({ error: result.error });
      return;
    }
    res.json({ text: result.text, language: result.language });
  });

  registerStorageProxy(app);
  registerOAuthRoutes(app);

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, timestamp: Date.now() });
  });

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );

  const port = parseInt(process.env.PORT || "3000");
  server.listen(port, () => {
    console.log("[api] server listening");
  });
}

startServer().catch(() => {
  console.error("[api] server failed to start");
});
