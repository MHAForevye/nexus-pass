/* Nexus Pass yapılandırması (index.html'de app.js'den ÖNCE yüklenir) */
window.NEXUS_PASS_CONFIG = {
  API_BASE: 'https://mikroklimakontrolmerkezi.forevye.workers.dev',
  // FOREVYE ID sitesinin adresi (sonunda / olabilir). Boşsa "FOREVYE ID ile giriş" düğmesi görünmez, yalnızca kristal hesabıyla girilir.
  // Bu sayfanın adresi (ör. https://KULLANICI.github.io/nexus-pass/) Mikro-Klima wrangler.toml → ID_REDIRECTS içinde "nexus-pass=<adres>" olarak tanımlı olmalı.
  ID_URL: ''
};
