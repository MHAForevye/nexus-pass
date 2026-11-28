'use strict';
/* Kristal ile alınan abonelikler (Mantar Pano, Zamanlayıcı, Retro Camera) ve Astrophoto Cam paketleri: Nexus Pass ekranlarına eklenen parçalar.
   Her parça HTML metni döndürür (sunucudan gelen her değer esc ile kaçırılır); tıklamalar tek bir olay dinleyicisiyle (data-act) işlenir. */
(function () {
  var K = window.KR, $ = function (s) { return document.querySelector(s); };
  var esc = function (v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); };
  var kc = function (n) { return '<span class="kamt"><img src="assets/crystal.svg" alt="">' + (+n || 0).toLocaleString('tr-TR', { maximumFractionDigits: 4 }) + '</span>'; };
  var admOpen = false, lastNo = '', camDraft = '';

  /* ===== Liste kartları ===== */
  function item(href, icon, title, sub, right, off) {
    return '<a class="card tap item' + (off ? ' dim' : '') + '" href="#' + href + '"><span class="item-ic">' + icon + '</span><div class="item-body"><div class="row"><h3>' + esc(title) + '</h3><b>' + right + '</b></div><div class="mut">' + esc(sub) + '</div></div></a>';
  }
  function shop() {
    var S = K.S(), h = '<div class="section-head"><h2>Kristal ile abonelikler</h2><a class="text-link" href="#acct">Hesap' + IC.chevR + '</a></div><p class="mut lead">Bakiyen: <b>' + kc(S.bal) + '</b>' + (K.offline() ? '. Sunucuya bağlanılamadı, son bilinen değer gösteriliyor.' : '') + '</p>';
    var md = K.mantarCfg().days;
    h += '<h3 class="grp">Mantar Pano</h3>' + (K.mantarCfg().tiers.map(function (t) { return item('k/mantar/' + t.id, IC.board, t.name, md + ' gün · kod ile', kc(t.cost), S.bal < t.cost); }).join('') || '<div class="empty">Paket yok.</div>');
    h += '<h3 class="grp">Zamanlayıcı</h3>' + (K.zamanCfg().plans.map(function (p) {
      var t = K.zTier(p.tier), pct = p.days === 7 ? K.zSave(p.tier) : 0;
      return item('k/zaman/' + p.tier + '-' + p.days, IC.timer, (t ? t.name : p.tier) + ' · ' + p.days + ' gün', pct > 0 ? '%' + pct + ' tasarruf · kod ile' : 'kod ile', kc(p.cost), S.bal < p.cost);
    }).join('') || '<div class="empty">Paket yok.</div>');
    var rc = K.retroCfg();
    h += '<h3 class="grp">Retro Camera</h3>' + (rc.plans.map(function (p) {
      var t = K.rTier(p.tier), pct = p.days === 7 ? K.rSave(p.tier) : 0;
      return item('k/retro/' + p.tier + '-' + p.days, IC.camera, (t ? t.name : p.tier) + ' · ' + p.days + ' gün', pct > 0 ? '%' + pct + ' tasarruf · kod ile' : 'kod ile', kc(p.cost), S.bal < p.cost);
    }).join('') || '<div class="empty">Paket yok.</div>');
    h += '<h3 class="grp">' + esc(K.app) + '</h3>' + K.cfg().packs.map(function (pk, i) { return item('k/pack/' + i, IC.star, pk.name, 'aktivasyon hakkı · mail ile teslim', kc(pk.cost), S.bal < pk.cost); }).join('');
    return h;
  }
  function codeRow(p, label, kind) {
    var st = K.passState(p);
    return '<div class="card"><div class="row"><h3>' + esc(label) + '</h3><span class="badge ' + (st.cls === 'on' ? 'ok' : st.cls === 'old' ? 'off' : 'warn') + '">' + (st.cls === 'on' ? IC.check + 'Aktif' : st.cls === 'old' ? IC.clock + 'Süresi doldu' : IC.dot + 'Hazır') + '</span></div>' +
      '<div class="code">' + esc(K.fmtCode(p.c)) + '</div><div class="mut">' + esc(st.text) + '</div><button class="btn sm" data-act="copy" data-v="' + esc(K.fmtCode(p.c)) + '">' + IC.copy + 'Kodu kopyala</button>' + openLink(kind, p.c, 'btn sm') + '</div>';
  }
  /* Mantar Pano, Zamanlayıcı, Retro Camera: kod bağlantıyla taşınır, uygulama kendiliğinden etkinleştirir (yapıştırmaya gerek yok) */
  var APPNAME = { mantar: 'Mantar Pano', zaman: 'Zamanlayıcı', retro: 'Retro Camera' };
  function openLink(kind, code, cls) { var u = K.appUrl(kind, code); return u ? ' <a class="' + cls + '" href="' + esc(u) + '" target="_blank" rel="noopener">' + esc(APPNAME[kind]) + '’da aç' + IC.ext + '</a>' : ''; }
  function codes() {
    var S = K.S(), h = '';
    if (S.passes.length) h += '<h2>Mantar Pano kodlarım</h2><p class="mut">Kodu Mantar Pano’da Premium kodu alanına yapıştır. Süre, kodu ilk kullandığın anda başlar.</p>' + S.passes.slice().reverse().map(function (p) { var t = K.mTier(p.tier); return codeRow(p, (t ? t.name : 'Mantar Pano ' + p.tier) + ' · ' + (p.days || K.mantarCfg().days) + ' gün', 'mantar'); }).join('');
    if (S.zpasses.length) h += '<h2>Zamanlayıcı kodlarım</h2><p class="mut">Kodu Zamanlayıcı uygulamasındaki kod alanına yapıştır. Süre, kodu ilk kullandığın anda başlar; kod en fazla 2 cihazda çalışır.</p>' + S.zpasses.slice().reverse().map(function (p) { var t = K.zTier(p.tier); return codeRow(p, (t ? t.name : 'Zamanlayıcı ' + p.tier) + ' · ' + p.days + ' gün', 'zaman'); }).join('');
    if (S.rpasses.length) h += '<h2>Retro Camera kodlarım</h2><p class="mut">Kodu Retro Camera’nın Premium sayfasındaki kod alanına yapıştır ya da “Retro Camera’da aç” düğmesini kullan. Süre, kodu ilk kullandığın anda başlar; kod en fazla 2 cihazda çalışır.</p>' + S.rpasses.slice().reverse().map(function (p) { var t = K.rTier(p.tier); return codeRow(p, (t ? t.name : 'Retro Camera') + ' · ' + p.days + ' gün', 'retro'); }).join('');
    return h;
  }
  function reqs() {
    var S = K.S(), h = '', pr = K.pendingReq();
    if (pr) h += pending(pr);
    if (S.reqs.length) h += '<h2>' + esc(K.app) + ' talepleri</h2>' + S.reqs.slice(-5).reverse().map(function (r) {
      return '<div class="card"><div class="row"><h3>' + esc(r.pack) + '</h3><span class="badge ' + (r.status === 'done' ? 'ok' : 'warn') + '">' + (r.status === 'done' ? IC.check + 'Tamamlandı' : IC.dot + 'Bekliyor') + '</span></div><div class="mut">' + esc(r.t) + ' · ' + kc(r.cost) + ' · #' + esc(r.no) + '</div></div>';
    }).join('');
    return h;
  }
  function pending(r) {
    return '<div class="card pend"><b>Bekleyen talep</b><p class="mut">' + esc(r.pack) + ' · Talep no ' + esc(r.no) + '. Alıcı: ' + esc(K.mailAddr()) + '. Mail açılmadıysa aşağıdaki düğmeleri kullan; kristalin zaten düşüldü.</p>' +
      '<button class="btn" data-act="mailagain">Maili tekrar aç</button><button class="btn" data-act="gmail">Gmail’de aç</button><button class="btn" data-act="mailcopy">Mail metnini kopyala</button><button class="btn" data-act="maildone">Talebi gönderdim, gizle</button></div>';
  }
  function homeCard() {
    var S = K.S();
    return '<a class="card tap" href="#acct"><div class="row"><h3>Kristal hesabım</h3><b>' + kc(S.bal) + '</b></div><div class="mut">Site ID: ' + esc(S.id) + (S.last && S.last === K.today() ? ' · bugünkü giriş ödülün alındı' : '') + '</div></a>';
  }

  /* ===== Ürün sayfası ve satın alma ===== */
  function need(cost) { var S = K.S(); return S.bal >= cost ? '' : '<p class="err">Yetersiz kristal · yaklaşık ' + K.daysToAfford(cost - S.bal) + ' gün daha (seri ödülü hesaba katılmadan).</p>'; }
  function detail(kind, id) {
    var S = K.S(), back = '<a href="#discover" class="back">' + IC.chevL + 'Keşfet</a>';
    if (kind === 'mantar') {
      var t = K.mTier(id); if (!t) return back + '<div class="empty">Paket bulunamadı.</div>';
      return back + '<h1>' + esc(t.name) + '</h1><div class="card"><p>' + K.mantarCfg().days + ' günlük ' + esc(t.short) + ' erişimi. Alınca sana bir kod verilir; kodu Mantar Pano’da gir, süre ilk kullandığın anda başlar. Mantar Pano’nun şimdiki özellikleri zaten ücretsiz kalır; bu paket yeni özellikleri açar.</p>' + tbl(t.cost, S.bal) + need(t.cost) + '</div>' + buyBtn('mantar', t.id, t.cost, '');
    }
    if (kind === 'zaman') {
      var m = /^(plus|premium)-(\d+)$/.exec(id || ''), p = m && K.zPlanOf(m[1], +m[2]); if (!p) return back + '<div class="empty">Paket bulunamadı.</div>';
      var tr = K.zTier(p.tier), d3 = K.zPlanOf(p.tier, 3), pct = K.zSave(p.tier), ex = p.days === 7 && d3 && pct > 0 ? ' 3 günlük paketin günlük fiyatıyla 7 gün ' + Math.round(d3.cost * 7 / 3) + ' kristal tutardı; bu pakette günlük maliyet %' + pct + ' daha düşük.' : '';
      return back + '<h1>' + esc(tr ? tr.name : 'Zamanlayıcı') + ' · ' + p.days + ' gün</h1><div class="card"><p>' + p.days + ' günlük ' + esc(tr ? tr.short : '') + ' erişimi. Alınca sana bir kod verilir; kodu Zamanlayıcı uygulamasında gir, süre ilk kullandığın anda başlar. Kod en fazla 2 cihazda kullanılır.' + esc(ex) + '</p>' + tbl(p.cost, S.bal) + need(p.cost) + '</div>' + buyBtn('zaman', id, p.cost, '');
    }
    if (kind === 'retro') {
      var rm = /^(premium)-(\d+)$/.exec(id || ''), rp = rm && K.rPlanOf(rm[1], +rm[2]); if (!rp) return back + '<div class="empty">Paket bulunamadı.</div>';
      var rt = K.rTier(rp.tier), r3 = K.rPlanOf(rp.tier, 3), rpct = K.rSave(rp.tier), rex = rp.days === 7 && r3 && rpct > 0 ? ' 3 günlük paketin günlük fiyatıyla 7 gün ' + Math.round(r3.cost * 7 / 3) + ' kristal tutardı; bu pakette günlük maliyet %' + rpct + ' daha düşük.' : '';
      return back + '<h1>' + esc(rt ? rt.name : 'Retro Camera') + ' · ' + rp.days + ' gün</h1><div class="card"><p>' + rp.days + ' günlük Premium erişimi: 2 GB arşiv, sınırsız albüm ve albüm kapağı, film şeridi / siyah pasparto / tarih damgası çerçeveleri, PDF fotokitap. Alınca sana bir kod verilir; kodu Retro Camera’da gir, süre ilk kullandığın anda başlar. Kod en fazla 2 cihazda kullanılır. Süre bitince fotoğrafların silinmez, yalnızca Premium özellikler kapanır.' + esc(rex) + '</p>' + tbl(rp.cost, S.bal) + need(rp.cost) + '</div>' + buyBtn('retro', id, rp.cost, '');
    }
    if (kind === 'pack') {
      var pk = K.cfg().packs[+id]; if (!pk) return back + '<div class="empty">Paket bulunamadı.</div>';
      return back + '<h1>' + esc(pk.name) + '</h1><div class="card"><p>' + esc(K.app) + ' için ' + esc(pk.short) + ' aktivasyon hakkı. Alınca talebin sunucuda kayıt altına alınır ve mail taslağı açılır; kod, doğrulamadan sonra mail ile gönderilir.</p>' + tbl(pk.cost, S.bal) +
        '<label class="lbl" for="camId">' + esc(K.app) + ' ID’n <span class="mut">(mail taslağına yazılır)</span></label><input class="inp" id="camId" maxlength="60" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="ID" value="' + esc(camDraft || S.cam) + '">' + need(pk.cost) + '</div>' + buyBtn('pack', id, pk.cost, '');
    }
    return back + '<div class="empty">Paket bulunamadı.</div>';
  }
  function tbl(cost, bal) { return '<table><tr><td>Fiyat</td><td>' + kc(cost) + '</td></tr><tr><td>Bakiyen</td><td>' + kc(bal) + '</td></tr><tr><td>İşlem sonrası</td><td>' + (bal >= cost ? kc(bal - cost) : '—') + '</td></tr></table>'; }
  function buyBtn(kind, id, cost) { return '<button class="btn primary" data-act="buy" data-kind="' + esc(kind) + '" data-id="' + esc(id) + '"' + (K.S().bal < cost ? ' disabled' : '') + '>Kristal ile al</button>'; }

  function codeResult(kind, p, name, where) {
    var code = K.fmtCode(p.c);
    return '<div class="result ok">' + IC.check + '</div><h1>Kodun hazır</h1><div class="card"><b>' + esc(name) + '</b><div class="code">' + esc(code) + '</div><p class="mut">' + (openLink(kind, p.c, '') ? 'Aşağıdaki düğme uygulamayı açar ve kodu kendiliğinden girer. ' : '') + 'Elle girmek istersen kodu şuraya yapıştır: ' + esc(where) + '. ' + esc(p.days) + ' günlük süre, kodu ilk kullandığın anda başlar. Kod “Üyeliklerim” sayfasında da durur.</p>' + (openLink(kind, p.c, 'btn primary') ? openLink(kind, p.c, 'btn primary').trim() + '<button class="btn" data-act="copy" data-v="' + esc(code) + '">Kodu kopyala</button>' : '<button class="btn primary" data-act="copy" data-v="' + esc(code) + '">Kodu kopyala</button>') + '</div><a class="btn" href="#mine">Üyeliklerime git</a>';
  }
  function buy(kind, id, btn) {
    var S = K.S(), label, run, show;
    if (kind === 'mantar') { var t = K.mTier(id); if (!t) return; label = t.name + ' (' + K.mantarCfg().days + ' gün) için ' + t.cost + ' kristal'; run = function () { return K.buyMantar(t.id); }; show = function (d) { return d.pass ? codeResult('mantar', d.pass, t.name, 'Mantar Pano’da Premium kodu alanı') : ''; }; }
    else if (kind === 'retro') { var rm = /^(premium)-(\d+)$/.exec(id), rp = rm && K.rPlanOf(rm[1], +rm[2]); if (!rp) return; var rt = K.rTier(rp.tier); label = (rt ? rt.name : 'Retro Camera') + ' ' + rp.days + ' gün için ' + rp.cost + ' kristal'; run = function () { return K.buyRetro(rp.tier, rp.days); }; show = function (d) { return d.rpass ? codeResult('retro', d.rpass, (rt ? rt.name : 'Retro Camera'), 'Retro Camera’nın Premium sayfasındaki kod alanı') : ''; }; }
    else if (kind === 'zaman') { var m = /^(plus|premium)-(\d+)$/.exec(id), p = m && K.zPlanOf(m[1], +m[2]); if (!p) return; var tr = K.zTier(p.tier); label = (tr ? tr.name : 'Zamanlayıcı') + ' ' + p.days + ' gün için ' + p.cost + ' kristal'; run = function () { return K.buyZaman(p.tier, p.days); }; show = function (d) { return d.zpass ? codeResult('zaman', d.zpass, (tr ? tr.name : 'Zamanlayıcı'), 'Zamanlayıcı uygulamasındaki kod alanı') : ''; }; }
    else { var pk = K.cfg().packs[+id]; if (!pk) return; var cam = ($('#camId') ? $('#camId').value : '').trim(); camDraft = cam;
      if (cam.length < 3) { if ($('#camId')) $('#camId').focus(); return K.toast('Önce ' + K.app + ' ID’ni yaz.'); }
      label = pk.name + ' için ' + pk.cost + ' kristal'; run = function () { return K.buyPack(+id, cam); };
      show = function (d) { setTimeout(function () { K.openMail(d.req); }, 50); return '<div class="result ok">' + IC.check + '</div><h1>Talebin alındı</h1><div class="card"><p>' + esc(pk.name) + ' · Talep no ' + esc(d.req.no) + '. Mail taslağı açıldı; mail açılmadıysa aşağıdaki düğmeleri kullan. Kod, doğrulamadan sonra mail ile gönderilir.</p></div>' + pending(d.req) + '<a class="btn" href="#history">Taleplerime git</a>'; }; }
    UI.confirm({ title: 'Satın alma onayı', body: label + ' harcanacak. Onay vermeden kristalin düşülmez.', ok: 'Kristal ile al' }).then(function (yes) {
      if (!yes) return;
      btn.disabled = true; btn.textContent = 'İşleniyor…';
      run().then(function (d) { $('#app').innerHTML = show(d); window.scrollTo(0, 0); }, function (e) { btn.disabled = false; btn.textContent = 'Kristal ile al'; K.toast(e.message); window.dispatchEvent(new Event('kr:refresh')); });
    });
  }

  /* ===== Hesap sayfası ===== */
  function acct() {
    var S = K.S(), h = '<a href="#home" class="back">' + IC.chevL + 'Genel bakış</a><h1>Kristal hesabım</h1><div class="card"><div class="row"><div><div class="mut">Kristal bakiyen</div><div class="big">' + kc(S.bal) + '</div></div><div style="text-align:right"><div class="mut">Site ID’n</div><div class="big">' + esc(S.id) + '</div><button class="btn sm" data-act="copy" data-v="' + esc(S.id) + '">Kopyala</button></div></div>' +
      '<p class="mut">' + (K.offline() ? 'Sunucuya bağlanılamadı, son bilinen bakiye gösteriliyor. ' : '') + (S.last && S.last === K.today() ? 'Bugünkü giriş ödülün alındı. ' : '') + 'Toplam giriş günü: ' + esc(S.days) + '. Günlük ödül, Mağaza’yı ya da hava uygulamasını günde bir kez açınca verilir (iki yerde aynı hesap).</p></div>';
    if (K.oldCreds()) h += '<div class="card"><button class="btn" data-act="restoreold">Önceki hesabımı geri yükle</button><p class="mut">Bu cihazda daha önce başka bir hesap kullanılmıştı; geri yüklersen onun bakiyesi geri gelir.</p></div>';
    h += '<h2>Hesap yedeği</h2><div class="card"><p class="mut">Başka cihazda ya da tarayıcıda aynı hesabı açmak için yedeği kopyala, orada aşağıya yapıştır. Hava uygulamasının ve Mağaza’nın yedek metni de çalışır. Yedek metni hesabı açar, kimseyle paylaşma.</p><button class="btn" data-act="backcopy">Yedeği kopyala</button>' +
      '<label class="lbl" for="backIn">Yedekten yükle</label><textarea class="inp" id="backIn" rows="3" placeholder="Yedek metnini buraya yapıştır" autocomplete="off" spellcheck="false"></textarea><button class="btn" data-act="backload">Hesabı yükle</button></div>';
    if (admOpen) h += adminHtml();
    return h;
  }
  function adminHtml() {
    return '<h2>Yönetici</h2><div class="card"><label class="lbl" for="admKey">Yönetici anahtarı <span class="mut">(sunucudaki ADMIN_TOKEN)</span></label><input class="inp" id="admKey" type="password" autocomplete="off" spellcheck="false" placeholder="anahtar">' +
      '<div class="lbl">Mantar Pano kodu (ücretsiz)</div><div class="row2"><select class="inp" id="mTier"><option value="pro">Pro</option><option value="unl">Sınırsız</option></select><input class="inp" id="mDays" inputmode="numeric" value="7" aria-label="Gün"></div><div class="code" id="mOut"></div>' +
      '<button class="btn" data-act="mmake">Mantar kodu üret</button><button class="btn" data-act="mlist">Üretilen kodları göster</button><div class="mut pre" id="mMade"></div>' +
      '<div class="lbl">Zamanlayıcı kodu (ücretsiz)</div><div class="row2"><select class="inp" id="zTier"><option value="plus">Plus</option><option value="premium">Premium</option></select><input class="inp" id="zDays" inputmode="numeric" value="7" aria-label="Gün"></div><div class="code" id="zOut"></div>' +
      '<button class="btn" data-act="zmake">Zamanlayıcı kodu üret</button><button class="btn" data-act="zlist">Üretilen kodları göster</button><div class="mut pre" id="zMade"></div>' +
      '<div class="lbl">Retro Camera kodu (ücretsiz)</div><div class="row2"><select class="inp" id="rTier"><option value="premium">Premium</option></select><input class="inp" id="rDays" inputmode="numeric" value="7" aria-label="Gün"></div><div class="code" id="rOut"></div>' +
      '<button class="btn" data-act="rmake">Retro Camera kodu üret</button><button class="btn" data-act="rlist">Üretilen kodları göster</button><div class="mut pre" id="rMade"></div>' +
      '<div class="lbl">' + esc(K.app) + ' · gelen maili doğrula</div><textarea class="inp" id="verIn" rows="5" placeholder="Gelen mailin tamamını buraya yapıştır" autocomplete="off" spellcheck="false"></textarea>' +
      '<button class="btn" data-act="verify">Maili doğrula</button><button class="btn" data-act="verdone">Talebi tamamlandı say</button><div class="mut pre" id="verOut"></div><button class="btn" data-act="admclose">Bu bölümü kapat</button></div>';
  }
  function admKey() { var k = $('#admKey') ? $('#admKey').value.trim() : ''; if (!k) K.toast('Önce yönetici anahtarını yaz.'); return k; }
  function listInto(box, d) {
    box.textContent = '';
    if (!d.passes.length) { box.textContent = 'Henüz üretilmiş kod yok.'; return; }
    d.passes.forEach(function (p) { var r = document.createElement('div'), b = document.createElement('button'); r.textContent = (p.tier) + ' · ' + p.days + ' gün · ' + K.fmtCode(p.c) + ' · ' + K.passState(p).text + ' '; b.type = 'button'; b.className = 'link'; b.textContent = 'Kopyala'; b.dataset.act = 'copy'; b.dataset.v = K.fmtCode(p.c); r.appendChild(b); box.appendChild(r); });
  }
  function make(kind) {
    var k = admKey(); if (!k) return;
    var call = kind === 'm' ? K.admin.passMake(k, $('#mTier').value, $('#mDays').value) : kind === 'r' ? K.admin.rMake(k, $('#rTier').value, $('#rDays').value) : K.admin.zMake(k, $('#zTier').value, $('#zDays').value), nm = kind === 'm' ? 'Mantar' : kind === 'r' ? 'Retro Camera' : 'Zamanlayıcı';
    call.then(function (d) { $('#' + kind + 'Out').textContent = K.fmtCode(d.code); K.copy(K.fmtCode(d.code), nm + ' kodu üretildi ve kopyalandı: ' + K.fmtCode(d.code) + ' (' + d.name + ', ' + d.days + ' gün)'); list(kind, true); }, function (e) { K.toast(e.message); });
  }
  function list(kind, quiet) {
    var k = quiet ? ($('#admKey') ? $('#admKey').value.trim() : '') : admKey(); if (!k) return;
    (kind === 'm' ? K.admin.passList(k) : kind === 'r' ? K.admin.rList(k) : K.admin.zList(k)).then(function (d) { var b = $('#' + kind + 'Made'); if (b) listInto(b, d); }, function (e) { if (!quiet) K.toast(e.message); });
  }

  /* ===== Tıklamalar ===== */
  document.addEventListener('click', function (ev) {
    var b = ev.target.closest && ev.target.closest('[data-act]'); if (!b) return;
    var a = b.dataset.act, r;
    if (a === 'copy') K.copy(b.dataset.v, 'Kopyalandı: ' + b.dataset.v);
    else if (a === 'buy') buy(b.dataset.kind, b.dataset.id, b);
    else if (a === 'mailagain') { if ((r = K.pendingReq())) K.openMail(r); }
    else if (a === 'gmail') { if ((r = K.pendingReq())) K.openGmail(r); }
    else if (a === 'mailcopy') { if ((r = K.pendingReq())) K.mailCopy(r); }
    else if (a === 'maildone') K.mailDone().then(function () { window.dispatchEvent(new Event('kr:refresh')); }, function (e) { K.toast(e.message); });
    else if (a === 'backcopy') K.backupCopy();
    else if (a === 'backload') K.backupLoad($('#backIn').value).then(function (ok) { if (ok) { $('#backIn').value = ''; window.dispatchEvent(new Event('kr:refresh')); } });
    else if (a === 'restoreold') K.restoreOld();
    else if (a === 'admclose') { admOpen = false; window.dispatchEvent(new Event('kr:refresh')); }
    else if (a === 'mmake') make('m'); else if (a === 'zmake') make('z'); else if (a === 'rmake') make('r');
    else if (a === 'mlist') list('m'); else if (a === 'zlist') list('z'); else if (a === 'rlist') list('r');
    else if (a === 'verify') { var k = admKey(); if (k) K.admin.verify(k, $('#verIn').value).then(function (d) { lastNo = d.no || ''; $('#verOut').textContent = d.out; }, function (e) { $('#verOut').textContent = e.message; }); }
    else if (a === 'verdone') { var k2 = admKey(); if (!k2) return; if (!lastNo) return K.toast('Önce maili doğrula.'); K.admin.done(k2, lastNo).then(function () { K.toast('#' + lastNo + ' tamamlandı olarak işaretlendi.'); }, function (e) { K.toast(e.message); }); }
  });
  /* gizli kelime: Astrophoto Cam ID alanına yazılınca yönetici bölümü açılır (yetki vermez; yetki sunucuda) */
  document.addEventListener('input', function (ev) {
    if (ev.target.id !== 'camId') return;
    if (K.isOwnerWord(ev.target.value)) { ev.target.value = ''; admOpen = true; location.hash = '#acct'; window.dispatchEvent(new Event('kr:refresh')); }
  });
  window.KRUI = { amount: kc, shop: shop, codes: codes, reqs: reqs, homeCard: homeCard, detail: detail, acct: acct };
})();
