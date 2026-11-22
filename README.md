# FOREVYE NEXUS · NEXUS PASS

Süreli üyelik arayüzü (statik HTML/CSS/JS, derleme yok). Arka uç **Nexus Worker**'dadır (`forevye-nexus` deposu, `/api/pass/*`):
katalog, fiyat, süre, bakiye düşümü, idempotency ve çift üyelik denetimi sunucuda yapılır; üyelikler FN bakiyesiyle alınır.

## Giriş akışı
1. Nexus → **İşlemler → Nexus Pass** düğmesi tek kullanımlık (5 dk) bilet üretir ve bu siteyi `#t=<bilet>` ile açar.
2. Bu site bileti `POST /api/pass/exchange` ile jetona çevirir (30 dk kayan, en çok 8 saat) ve adres çubuğundan siler.
3. Jeton yalnızca `/api/pass/*` uçlarında geçerlidir (transfer, profil, kart açılmaz) ve yalnızca bu sekmede (`sessionStorage`) durur.

## Kurulum
- `assets/config.js` → `API_BASE` ve `NEXUS_URL`: Nexus Worker'ın gerçek adresi.
- Nexus `wrangler.toml` → `PASS_URL` bu sitenin adresi olmalı (CORS yalnızca bu kaynağa açılır). Örn. `https://mhaforevye.github.io/nexus-pass/`
- Nexus tarafında `npm run db:migrate:remote` (0006_pass.sql) çalıştırılmalı.
- GitHub Pages: Settings → Pages → Branch `main` / root.

## Diğer sistemlerle entegrasyon
Hava, Mağaza vb. bir üyeliğin aktif olup olmadığını **sunucudan sunucuya** sorar (tarayıcıdan çağrılamaz):

    POST {NEXUS}/api/internal/entitlement
    Authorization: Bearer <INTERNAL_API_KEY>
    { "user_id": "<nexus kullanıcı id>" }   veya   { "id_user_id": "<FOREVYE ID kimliği>" }
    isteğe bağlı: "app": "Mikro-Klima Hava", "product_id": "weather-premium-30"
    → { "active": true, "entitlements": [{ "product_id", "app", "name", "starts_at", "expires_at" }] }

İade/düzeltme (`/api/internal/refund`, yönetici ters kaydı) üyeliği hemen kapatır. Katalog: yönetici API'si `POST /api/admin/pass/products` (süper yönetici).
