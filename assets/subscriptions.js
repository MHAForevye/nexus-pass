/* FOREVYE KRS abonelik mağazası — satın alma ve yenileme sunucuda doğrulanır. */
(function(){
'use strict';
const C=window.NEXUS_PASS_CONFIG||{}, API=String(C.KRISTAL_API_BASE||'').replace(/\/+$/,'');
const $=s=>document.querySelector(s), esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>Number(n||0).toLocaleString('tr-TR')+' KRS';
const duration=s=>s%86400===0?(s/86400)+' gün':Math.round(s/3600)+' saat';
const token=()=>{try{const x=window.KR?.creds?.();return x&&x.id&&x.token?x.id+'.'+x.token:null}catch(_){return null}};
async function api(path,body){
 const t=token(); if(!t) throw Error('Kristal hesabın yüklenmemiş. Önce Kristal hesabına bağlan.');
 const r=await fetch(API+path,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+t},body:JSON.stringify(body||{}),cache:'no-store'});
 const j=await r.json().catch(()=>({}));
 if(!r.ok)throw Error(j.err||j.message||'Sunucu hatası ('+r.status+')');
 return j;
}
let modal=null, products=[], state=null, qty={};
function ensure(){
 if($('#krs-sub-btn'))return;
 const b=document.createElement('button');b.id='krs-sub-btn';b.type='button';b.textContent='◆ Abonelikler';b.style.cssText='position:fixed;right:16px;bottom:18px;z-index:9998;border:0;border-radius:999px;padding:13px 18px;background:#201b35;color:#fff;font-weight:800;box-shadow:0 8px 30px #0005';
 b.onclick=open;b.addEventListener('keydown',e=>e.stopPropagation());document.body.appendChild(b);
 modal=document.createElement('div');modal.id='krs-sub-modal';modal.hidden=true;modal.style.cssText='position:fixed;inset:0;z-index:9999;background:#090812cc;overflow:auto;padding:18px;box-sizing:border-box';
 modal.innerHTML='<div style="max-width:760px;margin:4vh auto;background:#171525;color:#fff;border:1px solid #ffffff22;border-radius:22px;padding:20px;box-shadow:0 25px 90px #0009"><div style="display:flex;align-items:center;gap:12px"><h2 style="margin:0;flex:1">FOREVYE Abonelikleri</h2><button id="krs-sub-close" style="padding:9px 13px">Kapat ✕</button></div><p id="krs-sub-balance" style="color:#f3d78d"></p><div id="krs-link-apps" style="padding:10px;background:#ffffff0b;border-radius:12px;margin:12px 0"></div><div id="krs-sub-list"></div><h3>Aktif üyeliklerim</h3><div id="krs-sub-owned"></div><p style="font-size:12px;color:#bdb8ce">Üyelikler Kristal Borsası hesabına kaydedilir. Yeni dönem mevcut bitiş tarihine eklenir. Otomatik yenileme, süre dolduğunda sunucuda çalışır.</p></div>';
 document.body.appendChild(modal);$('#krs-sub-close').onclick=()=>modal.hidden=true;
 modal.addEventListener('click',e=>{if(e.target===modal)modal.hidden=true});
}
async function open(){
 ensure();modal.hidden=false;$('#krs-sub-list').innerHTML='Yükleniyor…';$('#krs-sub-owned').innerHTML='';
 try{
  const [c,s]=await Promise.all([api('/api/subscriptions/catalog'),api('/api/subscriptions/state')]);
  products=c.products||[];state=s;render();
 }catch(e){$('#krs-sub-list').innerHTML='<p style="color:#ff9b9b">'+esc(e.message)+'</p>'}
}
function render(){
 const pair=window.KR?.creds?.();
 const targets=[['Mantar Pano',C.MANTAR_URL],['Zamanlayıcı',C.ZAMAN_URL],['Retro Camera',C.RETRO_URL]];
 $('#krs-link-apps').innerHTML=pair?'<b>Hesabını uygulamalara bağla</b><div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px">'+targets.filter(x=>x[1]).map(x=>`<a style="padding:8px 10px;border-radius:8px;background:#2c2940;color:#fff;text-decoration:none" href="${esc(x[1])}#hesap=${encodeURIComponent(pair.id+'.'+pair.token)}" target="_blank" rel="noopener">${esc(x[0])}’ya bağla ↗</a>`).join('')+'</div><small style="display:block;color:#bdb8ce;margin-top:6px">Bu bağlantı hesabına erişim sağlar. Yalnızca kendi cihazında aç; başkalarıyla paylaşma.</small>':'<span style="color:#bdb8ce">Önce Kristal hesabını yükle.</span>';
 $('#krs-sub-balance').textContent='Mevcut bakiye: '+money(state.balance);
 $('#krs-sub-list').innerHTML=products.map(p=>{
  const n=Math.max(1,Math.min(99,qty[p.id]||1));
  return `<article style="display:grid;grid-template-columns:112px 1fr;gap:14px;padding:14px 0;border-bottom:1px solid #ffffff22">
  <img src="${API+esc(p.image)}" alt="" style="width:112px;height:112px;object-fit:cover;border-radius:14px">
  <div><b>${esc(p.name)}</b><div style="font-size:13px;color:#bdb8ce;margin:5px 0">${esc(p.description||'')}</div><div>${money(p.price)} · ${esc(p.durationLabel||duration(p.durationSec))}</div>
  <div style="display:flex;align-items:center;gap:9px;margin-top:9px"><button data-minus="${esc(p.id)}">−</button><b>${n} dönem</b><button data-plus="${esc(p.id)}">+</button><b style="margin-left:auto;color:#f3d78d">${money(p.price*n)}</b></div>
  <button data-buy="${esc(p.id)}" style="margin-top:9px;padding:9px 14px;border:0;border-radius:9px;background:#d9b86c;color:#211b12;font-weight:800">Kristal ile satın al</button></div></article>`;
 }).join('');
 const owned=(state.subscriptions||[]).filter(x=>x.active||x.status==='payment_failed');
 $('#krs-sub-owned').innerHTML=owned.length?owned.map(x=>`<div style="padding:12px 0;border-bottom:1px solid #ffffff22"><b>${esc(x.name)}</b><div style="font-size:13px;color:${x.status==='payment_failed'?'#ff9b9b':'#bdb8ce'}">${x.status==='payment_failed'?'Otomatik yenileme başarısız: bakiye yetersiz. KRS yükleyip yeniden deneyebilirsin.':'Bitiş: '+new Date(x.expires_at*1000).toLocaleString('tr-TR')} · ${x.purchased_periods||1} dönem alındı · ${x.autoRenew?'Otomatik yenileme açık':'Otomatik yenileme kapalı'}</div><button data-renew="${esc(x.product_id)}" data-enabled="${x.autoRenew?'0':'1'}">${x.autoRenew?'Otomatik yenilemeyi kapat':(x.status==='payment_failed'?'Bakiyeyi yükledim, yenilemeyi tekrar aç':'Otomatik yenilemeyi aç')}</button></div>`).join(''):'<p style="color:#bdb8ce">Henüz aktif üyeliğin yok.</p>';
 modal.querySelectorAll('[data-plus]').forEach(b=>b.onclick=()=>{qty[b.dataset.plus]=Math.min(99,(qty[b.dataset.plus]||1)+1);render()});
 modal.querySelectorAll('[data-minus]').forEach(b=>b.onclick=()=>{qty[b.dataset.minus]=Math.max(1,(qty[b.dataset.minus]||1)-1);render()});
 modal.querySelectorAll('[data-buy]').forEach(b=>b.onclick=async()=>{const p=products.find(x=>x.id===b.dataset.buy),n=qty[p.id]||1;if(!confirm(`${p.name}\n${n} dönem · ${money(p.price*n)}\nSatın alınsın mı?`))return;b.disabled=true;b.textContent='İşleniyor…';try{await api('/api/subscriptions/purchase',{product_id:p.id,periods:n,idem:'sub_'+crypto.randomUUID().replace(/-/g,'')});qty[p.id]=1;await open()}catch(e){alert(e.message);b.disabled=false;b.textContent='Kristal ile satın al'}});
 modal.querySelectorAll('[data-renew]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{await api('/api/subscriptions/auto-renew',{product_id:b.dataset.renew,enabled:b.dataset.enabled==='1'});await open()}catch(e){alert(e.message);b.disabled=false}});
}
function init(){ensure();if(window.MKKristal?.onChange)window.MKKristal.onChange(()=>{});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
