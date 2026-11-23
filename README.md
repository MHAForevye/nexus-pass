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

## Kristal ile alınan abonelikler (Mağaza'dan taşındı)
Forevye Mağaza'nın abonelik tarafı Nexus Pass'in kendi ekranlarına işlendi; ayrı bir Mağaza sitesi yok:
- **Keşfet:** Nexus Pass paketlerinin (FN) altında *Kristal ile* bölümü: Mantar Pano (Pro / Sınırsız), Zamanlayıcı (Plus / Premium, 3 ve 7 gün), Retro Camera (Premium, 3 ve 7 gün) ve Astrophoto Cam aktivasyon paketleri. Her paketin kendi sayfası ve onaylı satın alması var (`#k/...`).
- **Üyeliklerim:** satın alınan Mantar Pano, Zamanlayıcı ve Retro Camera kodları (durum, kopyala, uygulamada aç; kod `#kod=` ile taşınır ve uygulama kendiliğinden etkinleştirir). **Geçmiş:** Astrophoto Cam talepleri ve bekleyen mail düğmeleri (maili tekrar aç, Gmail'de aç, metni kopyala, gizle).
- **Hesap** (`#acct`, ana sayfadaki kristal kartı ya da üstteki ◆ rozeti): kristal bakiyesi, Site ID, hesap yedeği, önceki hesabı geri yükleme. Hesap taşıma bağlantısı `#hesap=ID.ANAHTAR` hâlâ çalışır; hava uygulamasının ve eski Mağaza'nın yedek metni kabul edilir.
- **Yönetici:** Hesap sayfasında, Astrophoto Cam ID alanına gizli kelime yazılınca açılır (yalnızca Mantar/Zamanlayıcı/Retro Camera kodu üretme ve gelen mail doğrulama; yetki sunucudaki `ADMIN_TOKEN`'da).
- **Gelmeyenler:** hediye kartı, seri ateşi ve alev koleksiyonu, hediye kodu, kristal ekleme (yönetici). Günlük ödül ve seri sunucuda hesaplanır; her açılışta verilir.

Kristal sunucusu ayrıdır (Cloudflare Worker + D1, hava reposundaki `worker/`); Nexus girişi gerektirmez, kendi hesabı vardır (Site ID + anahtar, `localStorage`). **Kurulum:** `assets/config.js` → `KRISTAL_API_BASE`; hava reposunda `wrangler.toml` → `MARKET_ORIGIN = "https://mhaforevye.github.io"` (yalnızca alan adı) ve `npx wrangler deploy`, yoksa bakiye gelmez (CORS). Hava'daki `MARKET_URL` ve Mantar Pano'daki `STORE_URL` bu sitenin adresine (`…/nexus-pass/`) çevrilmeli. Testler: `npm test`.

**Retro Camera:** `config.js` → `RETRO_URL` (ve `ZAMAN_URL`) gerçek yayın adresi olmalı. Sunucu tarafında `retro` ürünü, `/api/rpass/buy`, `/api/admin/rpass(es)` ve `/api/retro/redeem|verify` uçları gerekir; ayrıntı Retro Camera'daki `SUNUCU.md` dosyasında.
