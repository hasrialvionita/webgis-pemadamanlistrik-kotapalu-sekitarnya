const cvar=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const T={"st":["Cocok tepat","Cocok fuzzy","Kandidat (cek manual)","Ambigu","Tidak ditemukan"],"tp":["DESA","DUSUN","JALAN","KECAMATAN","KELURAHAN","LANDMARK/FASILITAS","LORONG","NAMA TANPA PENANDA","PERUMAHAN/KOMPLEKS"],"ul":["Palu Kota","Kamonji","Tawaeli"],"ulfull":["Gabungan Kamonji + Donggala","Gabungan Palu Kota + Donggala","Gabungan Palu Kota + Kamonji","Gabungan Tawaeli + Tambu","ULP Kamonji","ULP Palu Kota","ULP Tawaeli"],"ck":[]};

(async () => {
  const load = async (url) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(url + ': HTTP ' + res.status);
    return res.json();
  };
  let R, DESA, JALAN;
  try {
    [R, DESA, JALAN] = await Promise.all([
      load('data/pemadaman.json'),
      load('data/desa.json'),
      load('data/jalan.json'),
    ]);
  } catch (err) {
    console.error('Gagal memuat data:', err);
    document.getElementById('st').innerHTML = 'Data gagal dimuat. Jalankan aplikasi melalui server lokal (lihat petunjuk), bukan dengan membuka file langsung.';
    return;
  }

const ST=T.st,TP=T.tp,UL=T.ul,CK=T.ck;
const E=(x)=>x==null?'':String(x).replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
const norm=s=>(s||'').toLowerCase().replace(/\b(jalan|jl|jln|desa|kel|kelurahan|kec|kecamatan|btn|perum)\b\.?/g,' ').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
function conf(r){const s=ST[r[5]];if(r[7]==null)return 'x';if(s==='Cocok tepat')return r[9]==='sebagian'?'m':'p';if(s==='Cocok fuzzy')return 'm';return 't'}
const LAB={p:'pasti',m:'kemungkinan',t:'tidak pasti'};
const palette={today:cvar('--today')||'#C2410C',tomorrow:cvar('--tomorrow')||'#1F4E4A',other:cvar('--other')||'#A99F8E'};
const map=L.map('map',{preferCanvas:true,zoomControl:true,attributionControl:false}).setView([-0.89,119.87],12);
const cv=L.canvas({padding:0.3});
const pk={};
L.geoJSON(DESA,{renderer:cv,style:{color:cvar('--polyb')||'#D9D9D9',weight:.9,fillColor:cvar('--poly')||'#FFFFFF',fillOpacity:1},onEachFeature:(f,l)=>{pk[f.properties.n+'|'+f.properties.c]=l;l.bindTooltip(E(f.properties.n)+' ('+E(f.properties.c)+', '+E(f.properties.k)+')',{sticky:true})}}).addTo(map);
const rd=cvar('--road')||'#E5E5E5';
JALAN.forEach(j=>L.polyline(j[1].map(p=>[p[1],p[0]]),{renderer:cv,color:rd,weight:.8,opacity:.8}).bindTooltip(E(j[0]),{sticky:true}).addTo(map));
const lay=L.layerGroup().addTo(map);let hl=[];
const dates=[...new Set(R.map(r=>r[0]))].sort();
const dayMs=86400000;
const toDay=d=>{const p=d.split('-').map(Number);return Date.UTC(p[0],p[1]-1,p[2])/dayMs};
const now=new Date();
const todayDay=Date.UTC(now.getFullYear(),now.getMonth(),now.getDate())/dayMs;
const minDay=toDay(dates[0]),maxDay=toDay(dates[dates.length-1]);
const refDay=todayDay<minDay?minDay:todayDay>maxDay?maxDay:todayDay;
const dateColor=d=>{const n=toDay(d)-refDay;return n===0?palette.today:n===1?palette.tomorrow:palette.other};
document.getElementById('lastUpdate').textContent=new Date(dates[dates.length-1]+'T00:00:00').toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'});
const $=id=>document.getElementById(id);
$('d').innerHTML=dates.map(d=>'<option>'+d+'</option>').join('');$('d').value=dates[dates.length-1];
$('u').innerHTML=UL.map((u,i)=>'<label><input type="checkbox" data-u="'+u+'" checked> '+u+'</label>').join('');
$('c').innerHTML=Object.keys(LAB).map(k=>'<label><input type="checkbox" data-c="'+k+'" checked> '+LAB[k]+'</label>').join('');
function opts(){const d=$('d').value;const sl=[...new Set(R.filter(r=>r[0]===d).map(r=>r[1]))].sort();$('s').innerHTML='<option value="">Semua jam</option>'+sl.map(s=>'<option>'+s+'</option>').join('')}
const ulOk=r=>{const on=[...document.querySelectorAll('[data-u]')].filter(x=>x.checked).map(x=>x.dataset.u);const lab=r[2]>=0?T.ulfull[r[2]]:'';return on.some(u=>lab.includes(u))};
const cOk=r=>{const k=conf(r);return k==='x'||document.querySelector('[data-c="'+k+'"]').checked};
function pop(r){const k=conf(r);return '<b>'+E(r[3])+'</b><br>Di peta: '+E(r[6]||'-')+'<br>'+E(r[0])+' pukul '+E(r[1])+' WITA<br>'+E(T.ulfull[r[2]])+'<br>Kepercayaan: '+(LAB[k]||'belum terpetakan')+(r[9]==='sebagian'?' (cakupan sebagian)':'')}
function render(){
 lay.clearLayers();hl.forEach(l=>l.setStyle({fillColor:cvar('--poly'),fillOpacity:1}));hl=[];
 const d=$('d').value,s=$('s').value;
 const rows=R.filter(r=>r[0]===d&&(!s||r[1]===s)&&ulOk(r)&&cOk(r));
 const un=[],seen=new Set();let n=0;
 rows.forEach(r=>{const k=conf(r);if(k==='x'){if(!seen.has(r[3])){seen.add(r[3]);un.push(r[3])}return}
  n++;
  if(r[10]&&pk[r[10]]){pk[r[10]].setStyle({fillColor:dateColor(r[0]),fillOpacity:.3});hl.push(pk[r[10]])}});
 $('cnt').innerHTML='<b>'+n+'</b> lokasi terpetakan, <b>'+un.length+'</b> nama belum terpetakan';
 $('unh').textContent='Belum terpetakan ('+un.length+')';$('un').innerHTML=un.map(x=>'<li>'+E(x)+'</li>').join('');
 search()}
function search(){
 const q=norm($('q').value);const ul=$('res'),st=$('st');ul.innerHTML='';
 if(q.length<3){st.innerHTML='';return}
 const hit=R.filter(r=>norm(r[3]).includes(q)||norm(r[6]).includes(q));
 if(!hit.length){st.innerHTML='Nama itu <b>tidak ditemukan</b> pada pengumuman 19 Okt sampai 8 Nov 2026 (bisa juga ditulis dengan ejaan lain).';return}
 const d=$('d').value,today=hit.filter(r=>r[0]===d);
 st.innerHTML=today.length?'Tercantum pada pengumuman <b>'+d+'</b> ('+[...new Set(today.map(r=>r[1]))].join(', ')+' WITA).':'<b>Tidak tercantum</b> pada pengumuman tanggal '+d+'. Pernah tercantum pada '+[...new Set(hit.map(r=>r[0]))].length+' tanggal lain.';
 const uniq=[];const sk=new Set();hit.sort((a,b)=>b[0].localeCompare(a[0])).forEach(r=>{const k=r[0]+r[1]+r[3];if(!sk.has(k)){sk.add(k);uniq.push(r)}});
 uniq.slice(0,60).forEach(r=>{const li=document.createElement('li');li.innerHTML=E(r[3])+'<small>'+E(r[0])+', '+E(r[1])+' WITA, '+E(T.ulfull[r[2]])+'</small>';
  li.onclick=()=>{if(r[7]!=null){map.flyTo([r[7],r[8]],16);L.popup().setLatLng([r[7],r[8]]).setContent(pop(r)).openOn(map);closeMobilePanel()}};ul.appendChild(li)})}
['d','s'].forEach(i=>$(i).addEventListener('change',()=>{if(i==='d')opts();render()}));
document.querySelectorAll('[data-u],[data-c]').forEach(x=>x.addEventListener('change',render));
$('q').addEventListener('input',search);
const side=$('side'),panelToggle=$('panelToggle');
function closeMobilePanel(){if(window.matchMedia('(max-width:800px)').matches){side.classList.remove('open');panelToggle.setAttribute('aria-expanded','false')}}
panelToggle.addEventListener('click',()=>{const open=side.classList.toggle('open');panelToggle.setAttribute('aria-expanded',String(open))});
const legend=$('legend'),legendToggle=$('legendToggle');
legendToggle.addEventListener('click',()=>{const collapsed=legend.classList.toggle('collapsed');legendToggle.setAttribute('aria-expanded',String(!collapsed))});
opts();render();

})();
