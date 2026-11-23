/* Nexus Pass yapılandırması (index.html'de app.js'den ÖNCE yüklenir) */
window.NEXUS_PASS_CONFIG = {
  // Nexus Worker'ın adresi (sonunda / olmadan). /api/pass/* uçları buradadır. Gerçek adresi yaz!
  API_BASE: 'https://forevye-nexus.forevyenexus.workers.dev',
  // Nexus arayüzünün adresi ("Nexus'u aç" düğmesi). Genellikle API_BASE ile aynıdır (statik arayüz ve API aynı Worker'da).
  // Kristal sunucusu (Cloudflare Worker + D1, hava reposundaki worker/): Mantar Pano, Zamanlayıcı, Retro Camera ve Astrophoto Cam paketleri kristalle alınır.
  // Bu sitenin alan adı hava reposunda wrangler.toml → MARKET_ORIGIN olarak yazılı olmalı (yalnızca alan adı), yoksa bakiye gelmez (CORS).
  KRISTAL_API_BASE: 'https://mikroklimakontrolmerkezi.forevye.workers.dev',
  // Mantar Pano adresi (sonunda /): kod satın alınınca "Mantar Pano'da aç" düğmesi kodu bağlantıyla (#kod=) taşır, Mantar Pano kendiliğinden etkinleştirir.
  MANTAR_URL: 'https://frovyes.github.io/mantarpano/',
  // Zamanlayıcı ve Retro Camera adresleri (sonunda /): kod satın alınınca "…'da aç" düğmesi kodu #kod= ile taşır, uygulama kendiliğinden etkinleştirir.
  // Gerçek yayın adreslerini yaz; boş bırakılırsa ilgili "aç" düğmesi çıkmaz (kod yine kopyalanabilir).
  ZAMAN_URL: 'https://frovyes.github.io/zamanlayici/',
  RETRO_URL: 'https://frovyes.github.io/retro-camera/',
  NEXUS_URL: 'https://forevye-nexus.forevyenexus.workers.dev'
};
