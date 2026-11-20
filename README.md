# FOREVYE NEXUS · NEXUS PASS (demo)

Teknik şartnameye göre hazırlanmış statik HTML/CSS/JS arayüz. Derleme gerekmez.

## GitHub Pages
1. Dosyaları bir repoya yükle.
2. Settings → Pages → Branch: `main` / root.
3. `https://<kullanici>.github.io/<repo>/` adresinden aç.

## Not
`assets/app.js` içindeki `API` nesnesi **sahte Pass Service**'tir (veri `localStorage`'da). Şartname gereği gerçek sistemde fiyat, bakiye, süre ve idempotency kontrolü sunucuda yapılmalıdır; `API` fonksiyonlarını `/api/pass/...` uç noktalarına `fetch` ile bağlayarak değiştir.

Kapsam: katalog, satın alma (onay, idempotent, çift üyelik engeli, yetersiz bakiye), Üyeliklerim, sayfalı geçmiş, boş/yükleniyor/hata/çevrimdışı durumları. Admin Studio ve Entitlement Service bu demoda yoktur.
