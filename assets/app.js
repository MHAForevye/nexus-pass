'use strict';
/* ===== Sahte Pass Service (demo): gerçek sistemde sunucuda çalışır ===== */
const KEY='nexuspass.v1', HOUR=3600e3;
const mem={};
const store={get:k=>{try{return localStorage.getItem(k)}catch(e){return mem[k]||null}},set:(k,v)=>{try{localStorage.setItem(k,v)}catch(e){mem[k]=v}}};
const seed=()=>({balance:1000,products:[
 {id:'p1',app:'FOREVYE Photos',name:'Premium 3 Gün',desc:'Sınırsız yedekleme ve reklamsız kullanım.',features:['Sınırsız yedekleme','Reklamsız kullanım'],dur:72*3600,price:150,status:'on',version:1},
 {id:'p2',app:'FOREVYE Photos',name:'Premium 30 Gün',desc:'Sınırsız yedekleme ve gelişmiş düzenleme.',features:['Sınırsız yedekleme','Gelişmiş düzenleme','Reklamsız kullanım'],dur:30*86400,price:900,status:'on',version:1},
 {id:'p3',app:'FOREVYE Notes',name:'Premium 7 Gün',desc:'Sınırsız not defteri ve etiketler.',features:['Sınırsız not defteri','Etiketler'],dur:168*3600,price:300,status:'on',version:1},
 {id:'p4',app:'FOREVYE Vault',name:'Premium 30 Gün',desc:'Genişletilmiş şifreli depolama.',features:['Genişletilmiş depolama','Şifreli paylaşım'],dur:30*86400,price:1200,status:'on',version:1},
 {id:'p5',app:'FOREVYE Notes',name:'Premium Eski Paket',desc:'Satıştan kaldırıldı.',features:[],dur:86400,price:50,status:'off',version:1}],
 entitlements:[],purchases:[],events:[]});
let db=JSON.parse(store.get(KEY)||'null')||seed();
const save=()=>store.set(KEY,JSON.stringify(db));
const now=()=>Date.now(); // sunucu saati (UTC)
const sync=()=>{db.entitlements.forEach(e=>{if(e.status==='active'&&e.expires<=now()){e.status='expired';db.events.push({t:e.expires,type:'expired',ent:e.id})}})};
const uid=p=>p+Math.random().toString(36).slice(2,9);
const delay=(v,ms=350)=>new Promise(r=>setTimeout(()=>r(JSON.parse(JSON.stringify(v))),ms));
const API={
 products:()=>{sync();return delay(db.products.filter(p=>p.status==='on'))},
 product:id=>delay(db.products.find(p=>p.id===id)||null),
 me:()=>{sync();save();return delay({balance:db.balance,entitlements:db.entitlements.map(e=>({...e,product:db.products.find(p=>p.id===e.pid),snap:db.purchases.find(x=>x.id===e.purchaseId)}))})},
 purchases:(page,size=5)=>{const l=[...db.purchases].reverse();return delay({items:l.slice(page*size,page*size+size),more:l.length>(page+1)*size})},
 purchase(pid,idem){ // idempotent + atomik
  sync();
  const old=db.purchases.find(x=>x.idem===idem);
  if(old)return delay({ok:true,purchase:old,repeat:true});
  const p=db.products.find(x=>x.id===pid);
  const fail=(code,extra={})=>{db.purchases.push({id:uid('tx_'),pid,app:p?p.app:'-',name:p?p.name:'-',price:p?p.price:0,status:'failed',idem,at:now()});save();return delay({ok:false,code,...extra})};
  if(!p||p.status!=='on')return fail('unavailable');
  if(db.entitlements.some(e=>e.pid===pid&&e.status==='active'))return fail('already_active');
  if(db.balance<p.price)return fail('insufficient',{missing:p.price-db.balance,balance:db.balance});
  const t=now(),pur={id:uid('tx_'),pid,app:p.app,name:p.name,price:p.price,dur:p.dur,status:'success',idem,at:t,ledger:uid('ldg_')};
  const ent={id:uid('ent_'),pid,status:'active',starts:t,expires:t+p.dur*1000,purchaseId:pur.id};
  db.balance-=p.price;db.purchases.push(pur);db.entitlements.push(ent);db.events.push({t,type:'purchased',ent:ent.id});save();
  return delay({ok:true,purchase:pur,entitlement:ent});
 },
 reset(){db=seed();save()}
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

async function refreshBal(){try{const m=await API.me();$('#bal').textContent='◆ '+m.balance;return m}catch(e){}}

const routes={
 async home(){skel();const m=await refreshBal(),act=m.entitlements.filter(e=>e.status==='active').sort((a,b)=>a.expires-b.expires),h=await API.purchases(0,3);
  app.innerHTML=`<h1>NEXUS PASS</h1><p class="sub">FOREVYE üyeliklerin tek yerde.</p>
  <div class="card"><div class="row"><div><b>${act.length}</b> aktif üyelik</div><div class="mut">${act.length?'En yakın bitiş: '+fmt(act[0].expires):''}</div></div>${act.length?'':'<p class="mut">Henüz aktif bir üyeliğin yok.</p>'}<a class="btn primary" href="#discover">Üyelikleri Keşfet</a></div>
  <h2>Son hareketler</h2>${h.items.length?h.items.map(histRow).join('')+'<a class="btn" href="#history">Tüm geçmiş</a>':'<div class="empty">Henüz hareket yok.</div>'}
  <p style="text-align:center"><button class="link" id="rs">Demo verisini sıfırla</button></p>`;
  $('#rs').onclick=()=>{API.reset();route()}},
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

async function route(){
  const [r,a]=(location.hash.slice(1)||'home').split('/');$('#modal').hidden=true;
  document.querySelectorAll('.tabs a').forEach(t=>t.classList.toggle('on',t.dataset.r===(r==='p'?'discover':r==='ent'?'mine':r)));
  try{await (routes[r]||routes.home)(a);window.scrollTo(0,0)}catch(e){retry(route)}
}
const net=()=>$('#offline').hidden=navigator.onLine;
addEventListener('online',net);addEventListener('offline',net);addEventListener('hashchange',route);net();route();
