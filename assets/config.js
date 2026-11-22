/* Nexus Pass yapılandırması (index.html'de app.js'den ÖNCE yüklenir) */
window.NEXUS_PASS_CONFIG = {
  // Nexus Worker'ın adresi (sonunda / olmadan). /api/pass/* uçları buradadır. Gerçek adresi yaz!
  API_BASE: 'https://forevye-nexus.forevyenexus.workers.dev',
  // Nexus arayüzünün adresi ("Nexus'u aç" düğmesi). Genellikle API_BASE ile aynıdır (statik arayüz ve API aynı Worker'da).
  NEXUS_URL: 'https://forevye-nexus.forevyenexus.workers.dev'
};
