/* Forevye KRS abonelikleri: satın alma ve yenileme sunucuda doğrulanır. */
(function(){
'use strict';
const C=window.NEXUS_PASS_CONFIG||{}, API=String(C.KRISTAL_API_BASE||'').replace(/\/+$/,'');
const $=s=>document.querySelector(s), esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>Number(n||0).toLocaleString('tr-TR')+' KRS';
const duration=s=>s%86400===0?(s/86400)+' gün':Math.round(s/3600)+' saat';
const token=()=>{try{const x=window.KR?.creds?.();return x&&x.id&&x.token?x.id+'.'+x.token:null}catch(_){return null}};
const say=m=>window.KR&&KR.toast?KR.toast(m):alert(m);
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
 const b=document.createElement('button');b.id='krs-sub-btn';b.type='button';b.className='sf-fab';b.innerHTML=IC.layers+'<span>Abonelikler</span>';
 b.onclick=open;b.addEventListener('keydown',e=>e.stopPropagation());document.body.appendChild(b);
 modal=document.createElement('div');modal.id='krs-sub-modal';modal.className='overlay sf-overlay';modal.hidden=true;
 modal.innerHTML='<div class="sheet sf-sheet" role="dialog" aria-modal="true" aria-labelledby="sfT"><div class="sf-head"><h2 id="sfT">Abonelikler</h2><button class="icon-btn" id="krs-sub-close" type="button" aria-label="Kapat">'+IC.x+'</button></div><p id="krs-sub-balance" class="sf-bal"></p><div id="krs-link-apps" class="sf-link"></div><div id="krs-sub-list"></div><h3 class="grp">Aktif üyeliklerim</h3><div id="krs-sub-owned"></div><p class="mut sf-note">Üyelikler Kristal Borsası hesabına kaydedilir. Yeni dönem mevcut bitiş tarihine eklenir. Otomatik yenileme, süre dolduğunda sunucuda çalışır.</p></div>';
 document.body.appendChild(modal);$('#krs-sub-close').onclick=()=>modal.hidden=true;
 modal.addEventListener('click',e=>{if(e.target===modal)modal.hidden=true});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!modal.hidden)modal.hidden=true});
}
async function open(){
 ensure();modal.hidden=false;$('#krs-sub-list').innerHTML='<div class="skel"></div>';$('#krs-sub-owned').innerHTML='';
 try{
  const [c,s]=await Promise.all([api('/api/subscriptions/catalog'),api('/api/subscriptions/state')]);
  products=c.products||[];state=s;render();
 }catch(e){$('#krs-sub-list').innerHTML='<p class="err">'+esc(e.message)+'</p>'}
}
function render(){
 const pair=window.KR?.creds?.();
 const targets=[['Mantar Pano',C.MANTAR_URL],['Zamanlayıcı',C.ZAMAN_URL],['Retro Camera',C.RETRO_URL]];
 $('#krs-link-apps').innerHTML=pair?'<b>Hesabını uygulamalara bağla</b><div class="sf-chips">'+targets.filter(x=>x[1]).map(x=>`<a class="btn sm" href="${esc(x[1])}#hesap=${encodeURIComponent(pair.id+'.'+pair.token)}" target="_blank" rel="noopener">${esc(x[0])}’ya bağla${IC.ext}</a>`).join('')+'</div><p class="mut">Bu bağlantı hesabına erişim sağlar. Yalnızca kendi cihazında aç, başkalarıyla paylaşma.</p>':'<span class="mut">Önce Kristal hesabını yükle.</span>';
 $('#krs-sub-balance').textContent='Mevcut bakiye: '+money(state.balance);
 $('#krs-sub-list').innerHTML=products.map(p=>{
  const n=Math.max(1,Math.min(99,qty[p.id]||1));
  return `<article class="sf-prod">
  <img src="${API+esc(p.image)}" alt="" loading="lazy">
  <div><b>${esc(p.name)}</b><div class="mut">${esc(p.description||'')}</div><div class="sf-meta">${money(p.price)} · ${esc(p.durationLabel||duration(p.durationSec))}</div>
  <div class="sf-qty"><button class="icon-btn" data-minus="${esc(p.id)}" type="button" aria-label="Dönemi azalt">${IC.minus}</button><b>${n} dönem</b><button class="icon-btn" data-plus="${esc(p.id)}" type="button" aria-label="Dönemi artır">${IC.plus}</button><b class="sf-total">${money(p.price*n)}</b></div>
  <button class="btn primary" data-buy="${esc(p.id)}" type="button">Kristal ile satın al</button></div></article>`;
 }).join('')||'<div class="empty">Şu anda satışta abonelik yok.</div>';
 const owned=(state.subscriptions||[]).filter(x=>x.active||x.status==='payment_failed');
 $('#krs-sub-owned').innerHTML=owned.length?owned.map(x=>`<div class="card"><b>${esc(x.name)}</b><div class="${x.status==='payment_failed'?'err':'mut'}">${x.status==='payment_failed'?'Otomatik yenileme başarısız: bakiye yetersiz. KRS yükleyip yeniden deneyebilirsin.':'Bitiş: '+new Date(x.expires_at*1000).toLocaleString('tr-TR')} · ${x.purchased_periods||1} dönem alındı · ${x.autoRenew?'Otomatik yenileme açık':'Otomatik yenileme kapalı'}</div><button class="btn sm" data-renew="${esc(x.product_id)}" data-enabled="${x.autoRenew?'0':'1'}" type="button">${x.autoRenew?'Otomatik yenilemeyi kapat':(x.status==='payment_failed'?'Bakiyeyi yükledim, yenilemeyi tekrar aç':'Otomatik yenilemeyi aç')}</button></div>`).join(''):'<div class="empty">Henüz aktif üyeliğin yok.</div>';
 modal.querySelectorAll('[data-plus]').forEach(b=>b.onclick=()=>{qty[b.dataset.plus]=Math.min(99,(qty[b.dataset.plus]||1)+1);render()});
 modal.querySelectorAll('[data-minus]').forEach(b=>b.onclick=()=>{qty[b.dataset.minus]=Math.max(1,(qty[b.dataset.minus]||1)-1);render()});
 modal.querySelectorAll('[data-buy]').forEach(b=>b.onclick=async()=>{const p=products.find(x=>x.id===b.dataset.buy),n=qty[p.id]||1;
  const yes=await UI.confirm({title:'Satın alma onayı',body:`${p.name} · ${n} dönem · ${money(p.price*n)} harcanacak.`,ok:'Satın al'});if(!yes)return;
  b.disabled=true;b.textContent='İşleniyor…';
  try{await api('/api/subscriptions/purchase',{product_id:p.id,periods:n,idem:'sub_'+crypto.randomUUID().replace(/-/g,'')});qty[p.id]=1;await open()}catch(e){say(e.message);b.disabled=false;b.textContent='Kristal ile satın al'}});
 modal.querySelectorAll('[data-renew]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{await api('/api/subscriptions/auto-renew',{product_id:b.dataset.renew,enabled:b.dataset.enabled==='1'});await open()}catch(e){say(e.message);b.disabled=false}});
}
function init(){ensure();if(window.MKKristal?.onChange)window.MKKristal.onChange(()=>{});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
