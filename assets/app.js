'use strict';
/* ===== Pass Service istemcisi: Nexus Worker (/api/pass/*) =====
   Giriş: Nexus'ta "Nexus Pass" düğmesi tek kullanımlık bilet üretir ve bu sayfayı #t=<bilet> ile açar. Bilet bir kez jetona çevrilir,
   adres çubuğundan silinir. Jeton yalnızca bu sekmede (sessionStorage) tutulur ve yalnızca /api/pass/* uçlarında geçerlidir.
   Fiyat, süre, bakiye ve çift satın alma denetimi sunucudadır; buradan gönderilen tutar kullanılmaz. */
const CFG=Object.assign({API_BASE:'',NEXUS_URL:''},window.NEXUS_PASS_CONFIG||{});
const HOUR=3600e3,TK='nexuspass.tok';
const mem={};
const store={get:k=>{try{return sessionStorage.getItem(k)}catch(e){return mem[k]||null}},set:(k,v)=>{try{sessionStorage.setItem(k,v)}catch(e){mem[k]=v}},del:k=>{try{sessionStorage.removeItem(k)}catch(e){delete mem[k]}}};
const now=()=>Date.now();
const uid=p=>p+Array.from(crypto.getRandomValues(new Uint8Array(9)),x=>x.toString(36).padStart(2,'0')).join('').slice(0,16);
const base=()=>CFG.API_BASE.replace(/\/+$/,'');
let tok=store.get(TK)||null,bootErr='';
const boot=(async function takeTicket(){
 const m=/(?:^#|&)t=([A-Za-z0-9_-]{20,80})/.exec(location.hash);
 if(!m)return;
 history.replaceState(null,'',location.pathname+location.search+'#home');
 if(!base()){bootErr='Pass yapılandırılmamış (assets/config.js → API_BASE).';return}
 try{
  const r=await fetch(base()+'/api/pass/exchange',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ticket:m[1]})});
  const j=await r.json().catch(()=>({}));
  if(!r.ok||!j.token)throw new Error((j.error&&j.error.message)||'Giriş tamamlanamadı.');
  tok=j.token;store.set(TK,tok);
 }catch(e){bootErr=e.message||'Giriş tamamlanamadı.'}
})();
async function call(method,path,body){
 if(!tok)throw new Error('AUTH');
 if(!base())throw new Error('Pass yapılandırılmamış (assets/config.js → API_BASE).');
 const r=await fetch(base()+path,{method,headers:Object.assign({Authorization:'Bearer '+tok},body?{'Content-Type':'application/json'}:{}),body:body?JSON.stringify(body):undefined});
 const j=await r.json().catch(()=>({}));
 if(r.status===401){tok=null;store.del(TK);throw new Error('AUTH')}
 if(r.status===429)throw new Error('RATE');
 if(!r.ok)throw new Error((j.error&&j.error.message)||'HTTP '+r.status);
 return j;
}
const API={
 products:async()=>(await call('GET','/api/pass/products')).products,
 product:async id=>(await call('GET','/api/pass/product?id='+encodeURIComponent(id))).product,
 me:()=>call('GET','/api/pass/me'),
 purchases:(page,size=5)=>call('GET','/api/pass/purchases?page='+(page||0)+'&size='+size),
 purchase:(pid,idem)=>call('POST','/api/pass/purchase',{pid,idem}),
 logout(){tok=null;store.del(TK)}
};

/* ===== Arayüz ===== */
const $=s=>document.querySelector(s),app=$('#app');
const fm=v=>(v/100).toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2})+' FN';
const fmt=t=>new Date(t).toLocaleString('tr-TR',{dateStyle:'medium',timeStyle:'short'});
const dur=s=>s>=86400&&s%86400===0?`${s/86400} gün`:`${Math.round(s/3600)} saat`;
const left=t=>{let m=Math.max(0,Math.floor((t-now())/6e4)),d=Math.floor(m/1440),h=Math.floor(m%1440/60);return d?`${d} gün ${h} sa kaldı`:h?`${h} sa ${m%60} dk kaldı`:`${m} dk kaldı`};
const badge=s=>({active:'<span class="badge ok">✓ Aktif</span>',expired:'<span class="badge off">◷ Süresi doldu</span>',success:'<span class="badge ok">✓ Başarılı</span>',failed:'<span class="badge err">✕ Başarısız</span>',cancelled:'<span class="badge warn">⊘ İptal</span>'})[s]||'';
const skel=()=>app.innerHTML='<div class="skel"></div><div class="skel"></div><div class="skel"></div>';
const retry=fn=>{app.innerHTML=`<div class="empty">Bağlantı kurulamadı.<br><br><button class="btn" id="rt">Tekrar dene</button></div>`;$('#rt').onclick=fn};
const entCard=e=>`<a class="card tap" href="#ent/${e.id}"><div class="row"><h3>${e.product.app}</h3>${badge(e.status)}</div><div>${e.product.name}</div><div class="mut">${e.status==='active'?left(e.expires):'Bitiş: '+fmt(e.expires)}</div></a>`;
const prodCard=(p,owned)=>`<a class="card tap" href="#p/${p.id}"><div class="row"><h3>${p.app}</h3><b>${fm(p.price)}</b></div><div>${p.name} · ${dur(p.dur)}</div><div class="mut">${p.desc}</div>${owned?'<div class="ok" style="font-size:13px;margin-top:4px">✓ Aktif üyeliğin var</div>':''}</a>`;
const histRow=x=>`<div class="card"><div class="row"><h3>${x.app}</h3>${badge(x.status)}</div><div>${x.name}</div><div class="mut">${fmt(x.at)} · ${fm(x.status==='success'?x.price:0)} · ${x.id}</div></div>`;

async function refreshBal(){try{const m=await API.me();$('#bal').textContent=fm(m.balance);return m}catch(e){if(e.message==='AUTH')throw e}}

const routes={
 async home(){skel();const m=await refreshBal(),act=m.entitlements.filter(e=>e.status==='active').sort((a,b)=>a.expires-b.expires),h=await API.purchases(0,3);
  app.innerHTML=`<h1>NEXUS PASS</h1><p class="sub">FOREVYE üyeliklerin tek yerde.</p>
  <div class="card"><div class="row"><div><b>${act.length}</b> aktif üyelik</div><div class="mut">${act.length?'En yakın bitiş: '+fmt(act[0].expires):''}</div></div>${act.length?'':'<p class="mut">Henüz aktif bir üyeliğin yok.</p>'}<a class="btn primary" href="#discover">Üyelikleri Keşfet</a></div>
  <h2>Son hareketler</h2>${h.items.length?h.items.map(histRow).join('')+'<a class="btn" href="#history">Tüm geçmiş</a>':'<div class="empty">Henüz hareket yok.</div>'}
  <p style="text-align:center"><button class="link" id="rs">Oturumu kapat</button></p>`;
  $('#rs').onclick=()=>{if(confirm('Bu oturum kapatılsın mı?')){API.logout();route()}}},
 async mine(){skel();const m=await refreshBal(),a=m.entitlements.filter(e=>e.status==='active'),x=m.entitlements.filter(e=>e.status!=='active');
  app.innerHTML=`<h1>Üyeliklerim</h1>${a.length?a.map(entCard).join(''):'<div class="empty">Henüz aktif bir üyeliğin yok.<br><br><a class="btn primary" href="#discover">Üyelikleri Keşfet</a></div>'}${x.length?'<h2>Süresi dolanlar</h2>'+x.map(entCard).join(''):''}`},
 async discover(){skel();const [m,l]=await Promise.all([refreshBal(),API.products()]);
  if(!l.length){app.innerHTML='<div class="empty">Şu anda satışta Premium paketi bulunmuyor.</div>';return}
  const act=new Set(m.entitlements.filter(e=>e.status==='active').map(e=>e.pid)),apps=[...new Set(l.map(p=>p.app))];
  app.innerHTML='<h1>Üyelikleri Keşfet</h1>'+apps.map(a=>`<h2>${a}</h2>`+l.filter(p=>p.app===a).map(p=>prodCard(p,act.has(p.id))).join('')).join('')},
 async ent(id){skel();const m=await refreshBal(),e=m.entitlements.find(x=>x.id===id);
  if(!e){app.innerHTML='<div class="empty">Üyelik bulunamadı.</div>';return}
  app.innerHTML=`<a href="#mine" class="mut">‹ Üyeliklerim</a><h1>${e.product.app}</h1><p>${e.product.name} ${badge(e.status)}</p><div class="card"><table><tr><td>Başlangıç</td><td>${fmt(e.starts)}</td></tr><tr><td>Bitiş</td><td>${fmt(e.expires)}</td></tr><tr><td>Kalan süre</td><td>${e.status==='active'?left(e.expires):'Süresi doldu'}</td></tr><tr><td>Harcanan</td><td>${fm(e.snap.price)}</td></tr><tr><td>İşlem no</td><td>${e.snap.id}</td></tr></table><p class="mut">Otomatik yenileme yok. Süre bitince içeriklerin silinmez, yalnızca Premium özellikler kapanır.</p></div>`},
 async p(id){skel();const [m,p]=await Promise.all([refreshBal(),API.product(id)]);
  if(!p||p.status!=='on'){app.innerHTML='<div class="empty">Bu paket artık satışta değil.<br><br><a class="btn" href="#discover">Kataloğa dön</a></div>';return}
  const owned=m.entitlements.find(e=>e.pid===id&&e.status==='active');
  app.innerHTML=`<a href="#discover" class="mut">‹ Keşfet</a><h1>${p.app}</h1><p>${p.name}</p><div class="card"><b>Premium ile açılanlar</b><ul class="feat">${p.features.map(f=>`<li>${f}</li>`).join('')}</ul><table><tr><td>Süre</td><td>${dur(p.dur)}</td></tr><tr><td>Fiyat</td><td>${fm(p.price)}</td></tr><tr><td>Tahmini bakiye</td><td>${fm(m.balance-p.price)}</td></tr></table><p class="mut">Tek seferlik FN harcaması. Otomatik yenileme yok.</p></div>
  ${owned?`<div class="card ok">✓ Bu üyelik aktif · ${left(owned.expires)}</div>`:''}<button class="btn primary" id="buy" ${owned?'disabled':''}>FN ile Satın Al</button>`;
  $('#buy').onclick=()=>confirmBuy(p,m.balance)},
 async history(page=0){skel();await refreshBal();const h=await API.purchases(page);
  app.innerHTML='<h1>Üyelik geçmişi</h1>'+(h.items.length?h.items.map(histRow).join(''):'<div class="empty">Henüz kayıt yok.</div>')+`<div class="row">${page?'<button class="btn" id="pv">‹ Önceki</button>':''}${h.more?'<button class="btn" id="nx">Sonraki ›</button>':''}</div>`;
  if($('#pv'))$('#pv').onclick=()=>routes.history(page-1);if($('#nx'))$('#nx').onclick=()=>routes.history(page+1)}
};

function confirmBuy(p,bal){
  const m=$('#modal');m.hidden=false;
  m.innerHTML=`<div class="sheet" role="dialog" aria-modal="true"><h3>Satın alma onayı</h3><table><tr><td>Ürün</td><td>${p.app} · ${p.name}</td></tr><tr><td>Süre</td><td>${dur(p.dur)}</td></tr><tr><td>Fiyat</td><td>${fm(p.price)}</td></tr><tr><td>Mevcut bakiye</td><td>${fm(bal)}</td></tr><tr><td>İşlem sonrası</td><td>${fm(bal-p.price)}</td></tr></table><p class="mut">Otomatik yenilenmez. Onay vermeden bakiye düşülmez.</p><button class="btn primary" id="ok">Satın Al</button><button class="btn" id="no">Vazgeç</button></div>`;
  const idem=uid('idem_'); // tekrar denemelerde aynı anahtar
  $('#no').onclick=()=>m.hidden=true;
  $('#ok').onclick=async()=>{const b=$('#ok');b.disabled=true;b.textContent='İşleniyor…';
   try{const r=await API.purchase(p.id,idem);m.hidden=true;result(r,p)}catch(e){b.disabled=false;b.textContent='Satın Al';alert('İşlem durumu belirsiz. Tekrar denemeden önce Geçmiş ekranını kontrol et.')}};
}
function result(r,p){
  if(r.ok){const x=r.purchase,e=r.entitlement;refreshBal();
   app.innerHTML=`<h1 class="ok">✓ Premium üyeliğin etkinleştirildi.</h1><div class="card"><table><tr><td>İşlem referansı</td><td>${x.id}</td></tr><tr><td>Paket</td><td>${x.app} · ${x.name}</td></tr><tr><td>Süre</td><td>${dur(x.dur)}</td></tr>${e?`<tr><td>Başlangıç</td><td>${fmt(e.starts)}</td></tr><tr><td>Bitiş</td><td>${fmt(e.expires)}</td></tr>`:''}</table></div><a class="btn primary" href="#mine">Üyeliklerime git</a>`;return}
  const msg={insufficient:`Bu üyelik için yeterli FN bakiyen bulunmuyor. Bakiye: ${fm(r.balance)}, eksik: ${fm(r.missing)}.`,unavailable:'Paket artık satışta değil. Katalog yenilenecek.',already_active:'Bu paket için zaten aktif bir üyeliğin var.'}[r.code]||'İşlem tamamlanmadı.';
  app.innerHTML=`<h1 class="err">✕ İşlem tamamlanmadı</h1><div class="card">${msg}<p class="mut">Bakiyenden düşülmedi.</p></div><a class="btn primary" href="#discover">Kataloğa dön</a>`;
}

function connectScreen(msg){
  $('#bal').textContent='';
  const nx=CFG.NEXUS_URL?CFG.NEXUS_URL.replace(/\/+$/,'')+'/#/pass':'';
  app.innerHTML=`<h1>NEXUS PASS</h1><p class="sub">FOREVYE üyeliklerin tek yerde.</p>${msg?`<div class="card err">${msg}</div>`:''}
  <div class="card"><b>Nexus ile giriş</b><p class="mut">Nexus Pass, Nexus hesabınla çalışır ve üyelikler FN bakiyenle alınır. Nexus'a girip <b>İşlemler → Nexus Pass</b> düğmesine bas; buraya otomatik giriş yapılır.</p>${nx?`<a class="btn primary" href="${nx}">Nexus'u aç</a>`:'<p class="mut">Nexus adresi ayarlı değil (assets/config.js → NEXUS_URL).</p>'}</div>`;
}
async function route(){
  await boot;
  if(!tok)return connectScreen(bootErr||undefined);
  const [r,a]=(location.hash.slice(1)||'home').split('/');$('#modal').hidden=true;
  document.querySelectorAll('.tabs a').forEach(t=>t.classList.toggle('on',t.dataset.r===(r==='p'?'discover':r==='ent'?'mine':r)));
  try{await (routes[r]||routes.home)(a);window.scrollTo(0,0)}catch(e){if(e.message==='AUTH')connectScreen('Oturum süresi doldu. Nexus’tan Nexus Pass’i yeniden aç.');else if(e.message==='RATE')app.innerHTML='<div class="empty">Çok fazla deneme. Birkaç dakika sonra tekrar dene.</div>';else retry(route)}
}
const net=()=>$('#offline').hidden=navigator.onLine;
addEventListener('online',net);addEventListener('offline',net);addEventListener('hashchange',route);net();route();
