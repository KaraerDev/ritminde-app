# Ritminde

Günü kendi ritminde kur. Günlük görevler, takvim planları ve hatırlatıcılar için Expo + tRPC uygulaması.

## Gereksinimler

- Node.js 20+
- pnpm 9 (`npm i -g pnpm`)
- MySQL (yalnızca DB gerektiren sunucu özellikleri için)

## Kurulum

```bash
pnpm install
cp .env.example .env
# .env içini kendi değerlerinle doldur
```

## Geliştirme

```bash
pnpm dev          # API (3000) + Expo web (8081)
pnpm dev:server   # yalnızca API
pnpm dev:metro    # yalnızca Expo
```

## Diğer komutlar

```bash
pnpm check        # tsc --noEmit
pnpm lint         # expo lint
pnpm test         # vitest
pnpm db:push      # drizzle generate + migrate (DATABASE_URL gerekli)
pnpm build        # sunucu bundle (dist/)
pnpm start        # üretim sunucusu
pnpm qr           # QR üretimi
```

## Ortam değişkenleri

Bkz. `.env.example`. Kurallar:

- Secret'lar (`.env`) repoya **gönderilmez** (`.gitignore` kapsamında).
- `EXPO_PUBLIC_*` değerleri istemciye gömülür — secret koyma.
- Sunucu secret'ları (`MANUS_JWT_SECRET` / `JWT_SECRET`, `DATABASE_URL`, `BUILT_IN_FORGE_API_KEY`, `OPENAI_API_KEY`) yalnızca sunucuda kalır, `app.config.ts` içindeki `extra` alanına asla eklenmez.
- OAuth değişkenleri ayarlı değilse giriş akışı devre dışı kalır; uygulama açılır ama hesap bağlantısı hata verir.

## Proje yapısı

- `app/` — Expo Router ekranları (`(tabs)`: Gün, Takvim, İlerleme, Ayarlar)
- `server/` — Express + tRPC API (`server/_core`: auth, CORS, OAuth, bildirim)
- `lib/planner/` — görev/takvim durumu, bildirimler, aktivite sınıflandırma
- `components/planner/` — logo, aktivite simgesi, takvim bileşenleri
- `drizzle/` — MySQL şeması ve migration'lar
- `tests/` — vitest testleri

## Notlar

- Bundle ID / slug / deep-link scheme (`space.manus.gunakis.*`, `manus*`) mevcut oturumları bozmamak için sabit tutulur — değiştirme.
- Takvim bildirimleri cihazda yerel olarak zamanlanır; web önizlemesinde alarm çalışmaz, kayıt korunur.
- `plan.md` ve `TODO.md` iç planlama notlarıdır.

## Lisans

MIT — bkz. `LICENSE`.
