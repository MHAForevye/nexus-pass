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
 if(!r.ok){const e=new Error((j.error&&j.error.message)||'HTTP '+r.status);e.status=r.status;throw e}
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
const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const fm=v=>(v/100).toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2})+' FN';
const fmt=t=>new Date(t).toLocaleString('tr-TR',{dateStyle:'medium',timeStyle:'short'});
const dur=s=>s>=86400&&s%86400===0?`${s/86400} gün`:`${Math.round(s/3600)} saat`;
const left=t=>{let m=Math.max(0,Math.floor((t-now())/6e4)),d=Math.floor(m/1440),h=Math.floor(m%1440/60);return d?`${d} gün ${h} sa kaldı`:h?`${h} sa ${m%60} dk kaldı`:`${m} dk kaldı`};
const badge=s=>({active:'<span class="badge ok">✓ Aktif</span>',expired:'<span class="badge off">◷ Süresi doldu</span>',success:'<span class="badge ok">✓ Başarılı</span>',failed:'<span class="badge err">✕ Başarısız</span>',cancelled:'<span class="badge warn">⊘ İptal</span>'})[s]||'';
const skel=()=>app.innerHTML='<div class="skel"></div><div class="skel"></div><div class="skel"></div>';
const retry=fn=>{app.innerHTML=`<div class="empty">Bağlantı kurulamadı.<br><br><button class="btn" id="rt">Tekrar dene</button></div>`;$('#rt').onclick=fn};
const entCard=e=>`<a class="card tap" href="#ent/${encodeURIComponent(e.id)}"><div class="row"><h3>${esc(e.product.app)}</h3>${badge(e.status)}</div><div>${esc(e.product.name)}</div><div class="mut">${e.status==='active'?left(e.expires):e.status==='cancelled'?'Kapatıldı (iade)':'Bitiş: '+fmt(e.expires)}</div></a>`;
const prodCard=(p,owned)=>`<a class="card tap" href="#p/${encodeURIComponent(p.id)}"><div class="row"><h3>${esc(p.app)}</h3><b>${fm(p.price)}</b></div><div>${esc(p.name)} · ${dur(p.dur)}</div><div class="mut">${esc(p.desc)}</div>${owned?'<div class="ok" style="font-size:13px;margin-top:4px">✓ Aktif üyeliğin var</div>':''}</a>`;
const histRow=x=>`<div class="card"><div class="row"><h3>${esc(x.app)}</h3>${badge(x.status)}</div><div>${esc(x.name)}</div><div class="mut">${fmt(x.at)} · ${fm(x.status==='success'?x.price:0)} · ${esc(x.id)}</div></div>`;

function systemCard(icon,kind,name,desc,url,action,state,internal){
 const href=internal?url:(/^https:\/\//i.test(String(url||''))?url:'');
 return `<article class="system-card"><div class="system-card-top"><span class="system-icon">${icon}</span><span class="system-kind">${esc(kind)}</span></div><h3>${esc(name)}</h3><p>${esc(desc)}</p><div class="system-state"><i class="${state&&state.includes('ÇEVRİMDIŞI')?'is-off':''}"></i>${esc(state)}</div>${href?`<a class="system-open" href="${esc(href)}" ${internal?'':'target="_blank" rel="noopener noreferrer"'}>${esc(action)} <span>↗</span></a>`:`<span class="system-open disabled">Adres tanımlanmamış</span>`}</article>`;
}
function systemsMarkup(compact){
 const entries=[
  systemCard('✦','CORE / ACCOUNT','FOREVYE NEXUS','Ana hesap, FN bakiyesi, profil ve Nexus servislerinin merkezi.',CFG.NEXUS_URL,'Nexus’u aç',tok?'PASS OTURUMU AKTİF':'NEXUS HESABIYLA GİRİŞ',false),
  systemCard('<img class="crystal-mark" src="assets/crystal.svg" alt="">','WALLET / CRYSTAL','Kristal hesabı','Hava ve önceki Mağaza ile ortak Site ID hesabın, bakiye ve hesap yedeği.','#acct','Hesabı yönet',KR.offline()?'ÇEVRİMDIŞI · SON BİLİNEN VERİ':'KRİSTAL SERVİSİ HAZIR',true),
  systemCard('⌘','PRODUCTIVITY','Mantar Pano','Satın aldığın Pro ve Sınırsız kodları tek dokunuşla uygulamaya aktar. ',CFG.MANTAR_URL,'Mantar Pano’yu aç',CFG.MANTAR_URL?'YAYIN ADRESİ TANIMLI':'ADRES BEKLENİYOR',false),
  systemCard('◷','FOCUS / TIME','Zamanlayıcı','Plus ve Premium erişimini, kodlarını ve sürelerini buradan yönet.',CFG.ZAMAN_URL,'Zamanlayıcı’yı aç',CFG.ZAMAN_URL?'YAYIN ADRESİ TANIMLI':'ADRES BEKLENİYOR',false),
  systemCard('▣','CREATIVE / CAMERA','Retro Camera','Premium aktivasyon kodların ve kamera uygulaması aynı akışta.',CFG.RETRO_URL,'Retro Camera’yı aç',CFG.RETRO_URL?'YAYIN ADRESİ TANIMLI':'ADRES BEKLENİYOR',false),
  systemCard('✧','PHOTO / ACTIVATION','Astrophoto Cam','Kristal aktivasyon paketlerini keşfet; talep ve teslimat geçmişini takip et.','#discover','Paketleri incele','KRİSTAL PAKET AKIŞI',true)
 ];
 return `<section class="systems-section ${compact?'compact':''}"><div class="section-heading"><div><span class="eyebrow">ONE ECOSYSTEM</span><h2>Bağlı uygulamalar</h2></div>${compact?'<a href="#systems" class="text-link">Tüm sistemler ↗</a>':'<span class="section-note">FOREVYE dijital alanın</span>'}</div><div class="systems-grid">${entries.join('')}</div></section>`;
}

async function refreshBal(){const m=await API.me();$('#bal').textContent=fm(m.balance);paintSession();return m}

const routes={
 async home(){skel();const m=await refreshBal(),act=m.entitlements.filter(e=>e.status==='active').sort((a,b)=>a.expires-b.expires),h=await API.purchases(0,3);
  app.innerHTML=`<section class="welcome-panel"><div class="welcome-copy"><span class="eyebrow">YOUR MEMBERSHIP, REIMAGINED</span><h1>Üyeliklerinin kontrolü <em>sende.</em></h1><p>FOREVYE dünyasındaki dijital ayrıcalıkların, uygulamaların ve hesapların için kişisel kontrol alanın.</p><div class="welcome-actions"><a class="btn primary" href="#discover">Paketleri keşfet <span>↗</span></a><a class="quiet-link" href="#systems">Ekosistemi görüntüle</a></div></div><div class="welcome-art"><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><div class="welcome-glyph">N<span>✦</span></div><div class="art-caption">NEXUS PASS <b>STUDIO / 01</b></div></div></section>
  <section class="metric-grid"><article class="metric-card"><span>AKTİF ÜYELİK</span><strong>${act.length.toString().padStart(2,'0')}</strong><small>${act.length?'Kullanıma hazır ayrıcalık':'Henüz aktif üyelik yok'}</small></article><article class="metric-card accent"><span>FN BAKİYESİ</span><strong>${fm(m.balance)}</strong><small>Nexus ana hesabın</small></article><article class="metric-card"><span>EN YAKIN BİTİŞ</span><strong class="metric-date">${act.length?fmt(act[0].expires).split(' ').slice(0,2).join(' '):'—'}</strong><small>${act.length?left(act[0].expires)+' kaldı':'Aktif süre bulunmuyor'}</small></article></section>
  ${systemsMarkup(true)}
  <section class="lower-grid"><div><div class="section-heading"><div><span class="eyebrow">RECENT ACTIVITY</span><h2>Son hareketler</h2></div><a href="#history" class="text-link">Tüm geçmiş ↗</a></div>${h.items.length?h.items.map(histRow).join(''):'<div class="empty">Henüz hareket yok. İlk üyeliğini keşfetmeye başlayabilirsin.</div>'}</div><div class="account-shortcut">${KRUI.homeCard()}<div class="account-note"><span>GÜVENLİ OTURUM</span><p>Nexus Pass erişimin bu sekmede saklanır. Çıkış yaptığında tekrar Nexus üzerinden bağlanabilirsin.</p><button class="link" id="rs">Oturumu kapat</button></div></div></section>`;
  $('#rs').onclick=()=>{if(confirm('Bu oturum kapatılsın mı?')){API.logout();route()}}},
 async mine(){skel();const m=await refreshBal(),a=m.entitlements.filter(e=>e.status==='active'),x=m.entitlements.filter(e=>e.status!=='active');
  app.innerHTML=`<h1>Üyeliklerim</h1>${a.length?a.map(entCard).join(''):'<div class="empty">Henüz aktif bir üyeliğin yok.<br><br><a class="btn primary" href="#discover">Üyelikleri Keşfet</a></div>'}${x.length?'<h2>Süresi dolanlar</h2>'+x.map(entCard).join(''):''}${KRUI.codes()}`},
 async discover(){skel();const [m,l]=await Promise.all([refreshBal(),API.products()]);
  if(!l.length){app.innerHTML='<div class="empty">Şu anda satışta Nexus Pass paketi bulunmuyor.</div>'+KRUI.shop();return}
  const act=new Set(m.entitlements.filter(e=>e.status==='active').map(e=>e.pid)),apps=[...new Set(l.map(p=>p.app))];
  app.innerHTML='<h1>Üyelikleri Keşfet</h1><h2>Nexus Pass · FN ile</h2>'+apps.map(a=>`<h3 class="grp">${esc(a)}</h3>`+l.filter(p=>p.app===a).map(p=>prodCard(p,act.has(p.id))).join('')).join('')+KRUI.shop()},
 async ent(id){skel();const m=await refreshBal(),e=m.entitlements.find(x=>x.id===id);
  if(!e){app.innerHTML='<div class="empty">Üyelik bulunamadı.</div>';return}
  app.innerHTML=`<a href="#mine" class="mut">‹ Üyeliklerim</a><h1>${esc(e.product.app)}</h1><p>${esc(e.product.name)} ${badge(e.status)}</p><div class="card"><table><tr><td>Başlangıç</td><td>${fmt(e.starts)}</td></tr><tr><td>Bitiş</td><td>${fmt(e.expires)}</td></tr><tr><td>Kalan süre</td><td>${e.status==='active'?left(e.expires):e.status==='cancelled'?'İade edildi / kapatıldı':'Süresi doldu'}</td></tr><tr><td>Harcanan</td><td>${fm(e.snap.price)}</td></tr><tr><td>İşlem no</td><td>${esc(e.snap.id)}</td></tr></table><p class="mut">Otomatik yenileme yok. Süre bitince içeriklerin silinmez, yalnızca Premium özellikler kapanır.</p></div>`},
 async p(id){skel();const [m,p]=await Promise.all([refreshBal(),API.product(id)]);
  if(!p||p.status!=='on'){app.innerHTML='<div class="empty">Bu paket artık satışta değil.<br><br><a class="btn" href="#discover">Kataloğa dön</a></div>';return}
  const owned=m.entitlements.find(e=>e.pid===id&&e.status==='active');
  app.innerHTML=`<a href="#discover" class="mut">‹ Keşfet</a><h1>${esc(p.app)}</h1><p>${esc(p.name)}</p><div class="card"><b>Premium ile açılanlar</b><ul class="feat">${(p.features||[]).map(f=>`<li>${esc(f)}</li>`).join('')}</ul><table><tr><td>Süre</td><td>${dur(p.dur)}</td></tr><tr><td>Fiyat</td><td>${fm(p.price)}</td></tr><tr><td>Tahmini bakiye</td><td>${fm(m.balance-p.price)}</td></tr></table><p class="mut">Tek seferlik FN harcaması. Otomatik yenileme yok.</p></div>
  ${owned?`<div class="card ok">✓ Bu üyelik aktif · ${left(owned.expires)}</div>`:''}<button class="btn primary" id="buy" ${owned?'disabled':''}>FN ile Satın Al</button>`;
  $('#buy').onclick=()=>confirmBuy(p,m.balance)},
 async systems(){skel();if(tok)await refreshBal();app.innerHTML=`<section class="page-intro"><span class="eyebrow">CONNECTED WORKSPACE</span><h1>FOREVYE <em>ekosistemi.</em></h1><p>Tek bir merkezden erişebildiğin uygulamalar. Satın aldığın kodlar, ilgili uygulamalara aktarılmak üzere üyeliklerinde hazır tutulur.</p></section>${systemsMarkup(false)}<div class="integration-note"><b>Hesaplar nasıl bağlanıyor?</b><p>FN üyelikleri Nexus hesabınla; Kristal bakiyesi ise Site ID hesabınla çalışır. Kristal hesabın Hava ve eski Mağaza ile ortak kimliğini kullanır. Bu ayrım, farklı servislerin güvenlik anahtarlarını birbirinden bağımsız tutar.</p><a href="#acct" class="text-link">Kristal hesabını yönet ↗</a></div>`},
 async history(page=0){skel();await refreshBal();const h=await API.purchases(page);
  app.innerHTML='<h1>Üyelik geçmişi</h1>'+(h.items.length?h.items.map(histRow).join(''):'<div class="empty">Henüz kayıt yok.</div>')+`<div class="row">${page?'<button class="btn" id="pv">‹ Önceki</button>':''}${h.more?'<button class="btn" id="nx">Sonraki ›</button>':''}</div>`+KRUI.reqs();
  if($('#pv'))$('#pv').onclick=()=>routes.history(page-1);if($('#nx'))$('#nx').onclick=()=>routes.history(page+1)}
};

function confirmBuy(p,bal){
  const m=$('#modal');m.hidden=false;
  m.innerHTML=`<div class="sheet" role="dialog" aria-modal="true"><h3>Satın alma onayı</h3><table><tr><td>Ürün</td><td>${esc(p.app)} · ${esc(p.name)}</td></tr><tr><td>Süre</td><td>${dur(p.dur)}</td></tr><tr><td>Fiyat</td><td>${fm(p.price)}</td></tr><tr><td>Mevcut bakiye</td><td>${fm(bal)}</td></tr><tr><td>İşlem sonrası</td><td>${fm(bal-p.price)}</td></tr></table><p class="mut">Otomatik yenilenmez. Onay vermeden bakiye düşülmez.</p><button class="btn primary" id="ok">Satın Al</button><button class="btn" id="no">Vazgeç</button></div>`;
  const idem=uid('idem_'); // tekrar denemelerde aynı anahtar
  $('#no').onclick=()=>m.hidden=true;
  $('#ok').onclick=async()=>{const b=$('#ok');b.disabled=true;b.textContent='İşleniyor…';
   try{const r=await API.purchase(p.id,idem);m.hidden=true;result(r,p)}catch(e){b.disabled=false;b.textContent='Satın Al';
    if(e.message==='AUTH'){m.hidden=true;route();return}
    if(e.message==='RATE')alert('Çok fazla deneme. Birkaç dakika sonra tekrar dene.');
    else if(e.status>=400&&e.status<500)alert(e.message); // sunucu kesin reddetti, bakiyeden düşülmedi
    else alert('İşlem durumu belirsiz. Tekrar denemeden önce Geçmiş ekranını kontrol et.')}};
}
function result(r,p){
  if(r.ok){const x=r.purchase,e=r.entitlement;refreshBal().catch(()=>{});
   app.innerHTML=`<h1 class="ok">✓ Premium üyeliğin etkinleştirildi.</h1><div class="card"><table><tr><td>İşlem referansı</td><td>${esc(x.id)}</td></tr><tr><td>Paket</td><td>${esc(x.app)} · ${esc(x.name)}</td></tr><tr><td>Süre</td><td>${dur(x.dur)}</td></tr>${e?`<tr><td>Başlangıç</td><td>${fmt(e.starts)}</td></tr><tr><td>Bitiş</td><td>${fmt(e.expires)}</td></tr>`:''}</table></div><a class="btn primary" href="#mine">Üyeliklerime git</a>`;return}
  const msg={insufficient:`Bu üyelik için yeterli FN bakiyen bulunmuyor. Bakiye: ${fm(r.balance)}, eksik: ${fm(r.missing)}.`,unavailable:'Paket artık satışta değil. Katalog yenilenecek.',already_active:'Bu paket için zaten aktif bir üyeliğin var.'}[r.code]||'İşlem tamamlanmadı.';
  app.innerHTML=`<h1 class="err">✕ İşlem tamamlanmadı</h1><div class="card">${msg}<p class="mut">Bakiyenden düşülmedi.</p></div><a class="btn primary" href="#discover">Kataloğa dön</a>`;
}

function connectCard(msg){
  const nx=CFG.NEXUS_URL?CFG.NEXUS_URL.replace(/\/+$/,'')+'/#/pass':'';
  return `${msg?`<div class="card err">${esc(msg)}</div>`:''}<div class="card"><b>Nexus ile giriş</b><p class="mut">Nexus Pass üyelikleri Nexus hesabınla çalışır ve FN bakiyenle alınır. Nexus'a girip <b>İşlemler → Nexus Pass</b> düğmesine bas; buraya otomatik giriş yapılır. Kristalle alınan abonelikler (Mantar Pano, Zamanlayıcı, Astrophoto Cam) için Nexus girişi gerekmez.</p>${nx?`<a class="btn primary" href="${nx}">Nexus'u aç</a>`:'<p class="mut">Nexus adresi ayarlı değil (assets/config.js → NEXUS_URL).</p>'}</div>`;
}
function connectScreen(msg){$('#bal').textContent='';app.innerHTML=`<section class="page-intro"><span class="eyebrow">NEXUS MEMBERSHIP</span><h1>NEXUS PASS <em>Studio.</em></h1><p>FN ile alınan üyelikleri görüntülemek ve yönetmek için Nexus hesabından güvenli geçiş yap.</p></section>`+connectCard(msg)+systemsMarkup(true)}
/* Nexus girişi yokken: Kristal, kodlar ve uygulama bağlantıları çalışmaya devam eder. */
function guest(r,msg){
  $('#bal').textContent='';
  const part=r==='discover'?KRUI.shop():r==='mine'?KRUI.codes():r==='history'?KRUI.reqs():r==='systems'?systemsMarkup(false):KRUI.homeCard()+systemsMarkup(true)+KRUI.shop();
  app.innerHTML=`<section class="guest-welcome"><span class="eyebrow">PERSONAL MEMBERSHIP SPACE</span><h1>FOREVYE <em>Pass Studio.</em></h1><p>Uygulamaların, dijital paketlerin ve ayrıcalıkların için merkez.</p></section>`+connectCard(msg)+part;
}
function paintK(){const s=KR.S();$('#kbal').innerHTML='<img class="crystal-inline" src="assets/crystal.svg" alt=""><span>'+(+s.bal||0).toLocaleString('tr-TR')+'</span>'; const offline=KR.offline();const label=$('#crystal-state'),dot=$('#crystal-dot');if(label)label.textContent=offline?'Kristal · çevrimdışı':'Kristal · hazır';if(dot)dot.classList.toggle('is-off',offline)}
function paintSession(){const label=$('#nexus-state'),dot=$('#nexus-dot');if(label)label.textContent=tok?'Nexus · Pass oturumu açık':'Nexus · giriş bekleniyor';if(dot)dot.classList.toggle('is-on',!!tok)}
async function route(){
  await boot;await Promise.race([KR.ready(),new Promise(r=>setTimeout(r,4000))]);
  const [r,a,b]=(location.hash.slice(1)||'home').split('/');$('#modal').hidden=true;
  const active=({p:'discover',k:'discover',ent:'mine',acct:'acct'}[r]||r);
  document.querySelectorAll('.tabs a[data-r],.sidebar a[data-r]').forEach(t=>t.classList.toggle('on',t.dataset.r===active));
  const routeNames={home:'OVERVIEW',mine:'MY MEMBERSHIPS',discover:'DISCOVER',history:'ACTIVITY',systems:'CONNECTED SYSTEMS',acct:'CRYSTAL ACCOUNT',p:'PACKAGE DETAIL',ent:'MEMBERSHIP DETAIL',k:'CRYSTAL PACK'};const routeLabel=$('#route-label');if(routeLabel)routeLabel.textContent=routeNames[r]||'NEXUS PASS';
  paintK();paintSession();
  if(r==='k'){app.innerHTML=KRUI.detail(a,b);window.scrollTo(0,0);return}
  if(r==='acct'){app.innerHTML=KRUI.acct();window.scrollTo(0,0);return}
  if(!tok){if(r==='ent'||r==='p')return connectScreen(bootErr||undefined);return guest(r,bootErr||undefined)}
  try{await (routes[r]||routes.home)(a);window.scrollTo(0,0)}catch(e){if(e.message==='AUTH')guest(r,'Oturum süresi doldu. Nexus’tan Nexus Pass’i yeniden aç.');else if(e.message==='RATE')app.innerHTML='<div class="empty">Çok fazla deneme. Birkaç dakika sonra tekrar dene.</div>';else retry(route)}
}
const net=()=>$('#offline').hidden=navigator.onLine;
addEventListener('online',net);addEventListener('offline',net);addEventListener('hashchange',route);addEventListener('kr:refresh',()=>route());
KR.onChange(()=>{paintK();if(/^#acct/.test(location.hash))route()});KR.start();paintSession();
net();route();
