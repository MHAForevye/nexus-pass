'use strict';
/* ===== Pass Service istemcisi: Mikro-Klima sunucusu (kristal hesabı) =====
   Hesap = Mikro-Klima kristal hesabı (8 haneli ID + anahtar). Hava uygulaması/Mağaza ile aynı hesap: #hesap=ID.ANAHTAR bağlantısı gelirse
   bir kez okunur, adres çubuğundan silinir. Üyelik fiyatları ve süreleri sunucuda belirlenir; buradan gönderilen tutar kullanılmaz. */
const CFG=Object.assign({API_BASE:'https://mikroklimakontrolmerkezi.forevye.workers.dev'},window.NEXUS_PASS_CONFIG||{});
const HOUR=3600e3,KEY='nexuspass.acct';
const mem={};
const store={get:k=>{try{return localStorage.getItem(k)}catch(e){return mem[k]||null}},set:(k,v)=>{try{localStorage.setItem(k,v)}catch(e){mem[k]=v}},del:k=>{try{localStorage.removeItem(k)}catch(e){delete mem[k]}}};
const now=()=>Date.now();
const uid=p=>p+Array.from(crypto.getRandomValues(new Uint8Array(9)),x=>x.toString(36).padStart(2,'0')).join('').slice(0,16);
const PAIR=/^(\d{8})\.([A-Za-z0-9_-]{20,64})$/;
function parsePair(t){t=String(t||'').trim();let m=/(?:^#|&|[?&])hesap=([^&\s]+)/.exec(t);if(m)try{t=decodeURIComponent(m[1])}catch(e){t=m[1]}
 m=PAIR.exec(t);if(m)return{id:m[1],token:m[2]};
 m=/(\d{8})\D{0,8}([A-Za-z0-9_-]{20,64})/.exec(t);return m?{id:m[1],token:m[2]}:null}
let acct=null;try{acct=JSON.parse(store.get(KEY)||'null')}catch(e){}
(function takeHash(){const c=/(?:^#|&)hesap=/.test(location.hash)?parsePair(location.hash):null;
 if(c){acct=c;store.set(KEY,JSON.stringify(c));history.replaceState(null,'',location.pathname+location.search)}})();
async function call(path,body){
 if(!acct)throw new Error('AUTH');
 const r=await fetch(CFG.API_BASE+path,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+acct.id+'.'+acct.token},body:JSON.stringify(body||{})});
 const j=await r.json().catch(()=>({}));
 if(r.status===401){acct=null;store.del(KEY);throw new Error('AUTH')}
 if(r.status===429)throw new Error('RATE');
 if(!r.ok&&r.status!==200)throw new Error(j.error||'HTTP '+r.status);
 return j;
}
const API={
 products:async()=>(await call('/api/npass/products')).products,
 product:async id=>(await call('/api/npass/product',{id})).product,
 me:async()=>call('/api/npass/me'),
 purchases:async(page,size=5)=>call('/api/npass/purchases',{page}),
 purchase:(pid,idem)=>call('/api/npass/purchase',{pid,idem}),
 logout(){acct=null;store.del(KEY)},
 async create(){const r=await fetch(CFG.API_BASE+'/api/init',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});const j=await r.json();
  if(!r.ok||!j.id||!j.token)throw new Error('init');acct={id:j.id,token:j.token};store.set(KEY,JSON.stringify(acct));return acct}
};

/* ===== Arayüz ===== */
const $=s=>document.querySelector(s),app=$('#app');
const fmt=t=>new Date(t).toLocaleString('tr-TR',{dateStyle:'medium',timeStyle:'short'});
const dur=s=>s>=86400&&s%86400===0?`${s/86400} gün`:`${Math.round(s/3600)} saat`;
const left=t=>{let m=Math.max(0,Math.floor((t-now())/6e4)),d=Math.floor(m/1440),h=Math.floor(m%1440/60);return d?`${d} gün ${h} sa kaldı`:h?`${h} sa ${m%60} dk kaldı`:`${m} dk kaldı`};
const badge=s=>({active:'<span class="badge ok">✓ Aktif</span>',expired:'<span class="badge off">◷ Süresi doldu</span>',success:'<span class="badge ok">✓ Başarılı</span>',failed:'<span class="badge err">✕ Başarısız</span>',cancelled:'<span class="badge warn">⊘ İptal</span>'})[s]||'';
const skel=()=>app.innerHTML='<div class="skel"></div><div class="skel"></div><div class="skel"></div>';
const retry=fn=>{app.innerHTML=`<div class="empty">Bağlantı kurulamadı.<br><br><button class="btn" id="rt">Tekrar dene</button></div>`;$('#rt').onclick=fn};
const entCard=e=>`<a class="card tap" href="#ent/${e.id}"><div class="row"><h3>${e.product.app}</h3>${badge(e.status)}</div><div>${e.product.name}</div><div class="mut">${e.status==='active'?left(e.expires):'Bitiş: '+fmt(e.expires)}</div></a>`;
const prodCard=(p,owned)=>`<a class="card tap" href="#p/${p.id}"><div class="row"><h3>${p.app}</h3><b>◆ ${p.price}</b></div><div>${p.name} · ${dur(p.dur)}</div><div class="mut">${p.desc}</div>${owned?'<div class="ok" style="font-size:13px;margin-top:4px">✓ Aktif üyeliğin var</div>':''}</a>`;
const histRow=x=>`<div class="card"><div class="row"><h3>${x.app}</h3>${badge(x.status)}</div><div>${x.name}</div><div class="mut">${fmt(x.at)} · ◆ ${x.status==='success'?x.price:0} · ${x.id}</div></div>`;

async function refreshBal(){try{const m=await API.me();$('#bal').textContent='◆ '+m.balance;return m}catch(e){if(e.message==='AUTH')throw e}}

const routes={
 async home(){skel();const m=await refreshBal(),act=m.entitlements.filter(e=>e.status==='active').sort((a,b)=>a.expires-b.expires),h=await API.purchases(0,3);
  app.innerHTML=`<h1>NEXUS PASS</h1><p class="sub">FOREVYE üyeliklerin tek yerde.</p>
  <div class="card"><div class="row"><div><b>${act.length}</b> aktif üyelik</div><div class="mut">${act.length?'En yakın bitiş: '+fmt(act[0].expires):''}</div></div>${act.length?'':'<p class="mut">Henüz aktif bir üyeliğin yok.</p>'}<a class="btn primary" href="#discover">Üyelikleri Keşfet</a></div>
  <h2>Son hareketler</h2>${h.items.length?h.items.map(histRow).join('')+'<a class="btn" href="#history">Tüm geçmiş</a>':'<div class="empty">Henüz hareket yok.</div>'}
  <p style="text-align:center"><button class="link" id="rs">Hesaptan çık</button></p>`;
  $('#rs').onclick=()=>{if(confirm('Bu cihazdan çıkış yapılsın mı? Hesap anahtarını sakladıysan tekrar bağlanabilirsin.')){API.logout();route()}}},
 async mine(){skel();const m=await refreshBal(),a=m.entitlements.filter(e=>e.status==='active'),x=m.entitlements.filter(e=>e.status!=='active');
  app.innerHTML=`<h1>Üyeliklerim</h1>${a.length?a.map(entCard).join(''):'<div class="empty">Henüz aktif bir üyeliğin yok.<br><br><a class="btn primary" href="#discover">Üyelikleri Keşfet</a></div>'}${x.length?'<h2>Süresi dolanlar</h2>'+x.map(entCard).join(''):''}`},
 async discover(){skel();const [m,l]=await Promise.all([refreshBal(),API.products()]);
  if(!l.length){app.innerHTML='<div class="empty">Şu anda satışta Premium paketi bulunmuyor.</div>';return}
  const act=new Set(m.entitlements.filter(e=>e.status==='active').map(e=>e.pid)),apps=[...new Set(l.map(p=>p.app))];
  app.innerHTML='<h1>Üyelikleri Keşfet</h1>'+apps.map(a=>`<h2>${a}</h2>`+l.filter(p=>p.app===a).map(p=>prodCard(p,act.has(p.id))).join('')).join('')},
 async ent(id){skel();const m=await refreshBal(),e=m.entitlements.find(x=>x.id===id);
  if(!e){app.innerHTML='<div class="empty">Üyelik bulunamadı.</div>';return}
  app.innerHTML=`<a href="#mine" class="mut">‹ Üyeliklerim</a><h1>${e.product.app}</h1><p>${e.product.name} ${badge(e.status)}</p><div class="card"><table><tr><td>Başlangıç</td><td>${fmt(e.starts)}</td></tr><tr><td>Bitiş</td><td>${fmt(e.expires)}</td></tr><tr><td>Kalan süre</td><td>${e.status==='active'?left(e.expires):'Süresi doldu'}</td></tr><tr><td>Harcanan</td><td>◆ ${e.snap.price}</td></tr><tr><td>İşlem no</td><td>${e.snap.id}</td></tr></table><p class="mut">Otomatik yenileme yok. Süre bitince içeriklerin silinmez, yalnızca Premium özellikler kapanır.</p></div>`},
 async p(id){skel();const [m,p]=await Promise.all([refreshBal(),API.product(id)]);
  if(!p||p.status!=='on'){app.innerHTML='<div class="empty">Bu paket artık satışta değil.<br><br><a class="btn" href="#discover">Kataloğa dön</a></div>';return}
  const owned=m.entitlements.find(e=>e.pid===id&&e.status==='active');
  app.innerHTML=`<a href="#discover" class="mut">‹ Keşfet</a><h1>${p.app}</h1><p>${p.name}</p><div class="card"><b>Premium ile açılanlar</b><ul class="feat">${p.features.map(f=>`<li>${f}</li>`).join('')}</ul><table><tr><td>Süre</td><td>${dur(p.dur)}</td></tr><tr><td>Fiyat</td><td>◆ ${p.price}</td></tr><tr><td>Tahmini bakiye</td><td>◆ ${m.balance-p.price}</td></tr></table><p class="mut">Tek seferlik kristal harcaması. Otomatik yenileme yok.</p></div>
  ${owned?`<div class="card ok">✓ Bu üyelik aktif · ${left(owned.expires)}</div>`:''}<button class="btn primary" id="buy" ${owned?'disabled':''}>Kristal ile Satın Al</button>`;
  $('#buy').onclick=()=>confirmBuy(p,m.balance)},
 async history(page=0){skel();await refreshBal();const h=await API.purchases(page);
  app.innerHTML='<h1>Üyelik geçmişi</h1>'+(h.items.length?h.items.map(histRow).join(''):'<div class="empty">Henüz kayıt yok.</div>')+`<div class="row">${page?'<button class="btn" id="pv">‹ Önceki</button>':''}${h.more?'<button class="btn" id="nx">Sonraki ›</button>':''}</div>`;
  if($('#pv'))$('#pv').onclick=()=>routes.history(page-1);if($('#nx'))$('#nx').onclick=()=>routes.history(page+1)}
};

function confirmBuy(p,bal){
  const m=$('#modal');m.hidden=false;
  m.innerHTML=`<div class="sheet" role="dialog" aria-modal="true"><h3>Satın alma onayı</h3><table><tr><td>Ürün</td><td>${p.app} · ${p.name}</td></tr><tr><td>Süre</td><td>${dur(p.dur)}</td></tr><tr><td>Fiyat</td><td>◆ ${p.price}</td></tr><tr><td>Mevcut bakiye</td><td>◆ ${bal}</td></tr><tr><td>İşlem sonrası</td><td>◆ ${bal-p.price}</td></tr></table><p class="mut">Otomatik yenilenmez. Onay vermeden kristal düşülmez.</p><button class="btn primary" id="ok">Satın Al</button><button class="btn" id="no">Vazgeç</button></div>`;
  const idem=uid('idem_'); // tekrar denemelerde aynı anahtar
  $('#no').onclick=()=>m.hidden=true;
  $('#ok').onclick=async()=>{const b=$('#ok');b.disabled=true;b.textContent='İşleniyor…';
   try{const r=await API.purchase(p.id,idem);m.hidden=true;result(r,p)}catch(e){b.disabled=false;b.textContent='Satın Al';alert('İşlem durumu belirsiz. Tekrar denemeden önce Geçmiş ekranını kontrol et.')}};
}
function result(r,p){
  if(r.ok){const x=r.purchase,e=r.entitlement;refreshBal();
   app.innerHTML=`<h1 class="ok">✓ Premium üyeliğin etkinleştirildi.</h1><div class="card"><table><tr><td>İşlem referansı</td><td>${x.id}</td></tr><tr><td>Paket</td><td>${x.app} · ${x.name}</td></tr><tr><td>Süre</td><td>${dur(x.dur)}</td></tr>${e?`<tr><td>Başlangıç</td><td>${fmt(e.starts)}</td></tr><tr><td>Bitiş</td><td>${fmt(e.expires)}</td></tr>`:''}</table></div><a class="btn primary" href="#mine">Üyeliklerime git</a>`;return}
  const msg={insufficient:`Bu üyelik için yeterli kristalin bulunmuyor. Bakiye: ◆ ${r.balance}, eksik: ◆ ${r.missing}.`,unavailable:'Paket artık satışta değil. Katalog yenilenecek.',already_active:'Bu paket için zaten aktif bir üyeliğin var.'}[r.code]||'İşlem tamamlanmadı.';
  app.innerHTML=`<h1 class="err">✕ İşlem tamamlanmadı</h1><div class="card">${msg}<p class="mut">Kristal düşülmedi.</p></div><a class="btn primary" href="#discover">Kataloğa dön</a>`;
}

function connectScreen(msg){
  $('#bal').textContent='';
  app.innerHTML=`<h1>NEXUS PASS</h1><p class="sub">Kristal hesabını bağla.</p>${msg?`<div class="card err">${msg}</div>`:''}
  <div class="card"><b>Mevcut hesabın var mı?</b><p class="mut">Hava uygulamasındaki veya Mağaza'daki hesap bağlantısını / “ID.ANAHTAR” metnini yapıştır. Aynı kristal bakiyen burada da geçer.</p>
  <input id="ak" autocomplete="off" spellcheck="false" placeholder="12345678.anahtar… veya hesap bağlantısı" style="width:100%;box-sizing:border-box;padding:12px;margin:6px 0;border-radius:10px;border:1px solid var(--line,#8884);background:transparent;color:inherit">
  <button class="btn primary" id="ab">Hesabı Bağla</button></div>
  <div class="card"><b>Hesabın yok mu?</b><p class="mut">Yeni bir kristal hesabı açılır (her gün giriş ödülü Hava uygulamasından kazanılır).</p><button class="btn" id="an">Yeni Hesap Oluştur</button></div>`;
  $('#ab').onclick=()=>{const c=parsePair($('#ak').value);if(!c)return connectScreen('Hesap bilgisi tanınmadı. “8 haneli ID.ANAHTAR” biçiminde olmalı.');acct=c;store.set(KEY,JSON.stringify(c));route()};
  $('#an').onclick=async()=>{try{const c=await API.create();app.innerHTML=`<h1 class="ok">✓ Hesap açıldı</h1><div class="card"><p>Bu bilgiyi güvenli bir yere kaydet; cihaz değiştirirsen bununla bağlanırsın:</p><p><b style="word-break:break-all;user-select:all">${c.id}.${c.token}</b></p><p class="mut">Bu anahtarı kimseyle paylaşma.</p></div><a class="btn primary" href="#home" id="go">Devam</a>`;$('#go').onclick=()=>setTimeout(route,0)}catch(e){connectScreen('Hesap açılamadı. Bağlantını kontrol edip tekrar dene.')}};
}
async function route(){
  if(!acct)return connectScreen();
  const [r,a]=(location.hash.slice(1)||'home').split('/');$('#modal').hidden=true;
  document.querySelectorAll('.tabs a').forEach(t=>t.classList.toggle('on',t.dataset.r===(r==='p'?'discover':r==='ent'?'mine':r)));
  try{await (routes[r]||routes.home)(a);window.scrollTo(0,0)}catch(e){if(e.message==='AUTH')connectScreen('Oturum geçersiz. Hesabını yeniden bağla.');else if(e.message==='RATE')app.innerHTML='<div class="empty">Çok fazla deneme. Birkaç dakika sonra tekrar dene.</div>';else retry(route)}
}
const net=()=>$('#offline').hidden=navigator.onLine;
addEventListener('online',net);addEventListener('offline',net);addEventListener('hashchange',route);net();route();
