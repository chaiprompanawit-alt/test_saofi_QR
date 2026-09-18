// โค้ดใช้ร่วมหน้าช่าง/แอดมิน: ล็อกอิน, เรียก API, แผนที่ Leaflet, รายการงาน (markup เป็น Tailwind)
var STATUS = ['แจ้งใหม่','รับเรื่องแล้ว','กำลังดำเนินการ','เสร็จสิ้น','ปิดงาน/ไม่พบปัญหา','แจ้งเท็จ'];
var OPEN_STATUS = STATUS.slice(0,3);
var CLS = { 'แจ้งใหม่':['s-new','p-new','#c62828'], 'รับเรื่องแล้ว':['s-recv','p-recv','#ef6c00'],
  'กำลังดำเนินการ':['s-prog','p-prog','#1565c0'], 'เสร็จสิ้น':['s-done','p-done','#2e7d32'],
  'ปิดงาน/ไม่พบปัญหา':['s-close','p-close','#607d8b'], 'แจ้งเท็จ':['s-fake','p-fake','#424242'] };
var MAP_CENTER = (window.ORG && ORG.mapCenter) || [18.582125, 98.952782];

// ชุด class Tailwind ที่ใช้บ่อย
var T = {
  input: 'w-full px-3 py-2.5 rounded-lg border border-line bg-white text-base focus:outline-none focus:ring-2 focus:ring-brand/40',
  btn: 'inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-brand text-white font-bold text-base hover:bg-brand-dark disabled:opacity-60 cursor-pointer no-underline',
  btnSm: 'inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-sm font-semibold cursor-pointer no-underline',
  pill: 'inline-block text-xs text-white px-2.5 py-0.5 rounded-full font-semibold whitespace-nowrap',
  card: 'bg-white border border-line rounded-2xl p-4',
  stat: 'bg-white border border-line rounded-lg px-3 py-1.5 text-sm cursor-pointer select-none hover:bg-paper'
};

function esc(s){ return String(s==null?'':s).replace(/[<>&"]/g,function(c){return {'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c];}); }
function mooOf(id){ var m=String(id||'').split('/'); return m.length>1?m[0]:''; }
function fmtDT(iso){ if(!iso) return ''; return new Date(iso).toLocaleString('th-TH',{timeZone:'Asia/Bangkok',day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'}); }
function fmtD(iso){ if(!iso) return ''; return new Date(iso).toLocaleDateString('th-TH',{timeZone:'Asia/Bangkok',day:'numeric',month:'short',year:'numeric'}); }
function gmaps(lat,lng){ return 'https://www.google.com/maps/dir/?api=1&destination='+lat+','+lng; }   // เปิดโหมดนำทางทันที
function ago(iso){ var h=(Date.now()-new Date(iso))/36e5; if(h<1) return Math.round(h*60)+' นาที'; if(h<48) return Math.round(h)+' ชม.'; return Math.round(h/24)+' วัน'; }

/* ---------- session ---------- */
var Auth = {
  get: function(){ try { return JSON.parse(localStorage.getItem('saofi_session')||'null'); } catch(e){ return null; } },
  set: function(s){ localStorage.setItem('saofi_session', JSON.stringify(s)); },
  clear: function(){ localStorage.removeItem('saofi_session'); location.reload(); }
};
async function api(path, opts){
  opts = opts||{}; var s = Auth.get();
  var headers = Object.assign({'Content-Type':'application/json'}, s ? {'Authorization':'Bearer '+s.token} : {});
  var r = await fetch(path, { method: opts.method||'GET', headers: headers, body: opts.body ? JSON.stringify(opts.body) : undefined });
  if (r.status === 401 && s) { Auth.clear(); return; }
  var j = await r.json().catch(function(){ return {}; });
  if (!r.ok) throw new Error(j.error || ('ผิดพลาด '+r.status));
  return j;
}

/* ---------- หน้าล็อกอิน (ใช้ทั้งช่างและแอดมิน) ---------- */
function renderGate(rootId, title, onOk){
  document.getElementById(rootId).innerHTML =
    '<div class="max-w-sm mx-auto mt-14 '+T.card+' p-7 shadow-sm">'+
    '<div class="text-center mb-4"><div class="text-4xl">🔒</div><h2 class="text-xl font-bold mt-1">'+esc(title)+'</h2><p class="text-sm text-stone-500">'+esc(ORG.short)+' · สำหรับเจ้าหน้าที่</p></div>'+
    '<label class="block font-bold mb-1">ชื่อผู้ใช้</label><input id="lg_u" class="'+T.input+'" autocomplete="username" autocapitalize="off">'+
    '<label class="block font-bold mt-4 mb-1">รหัสผ่าน</label><input id="lg_p" type="password" class="'+T.input+'" autocomplete="current-password">'+
    '<div class="text-red-700 text-sm mt-2 min-h-5" id="lg_e"></div>'+
    '<button class="'+T.btn+' w-full mt-2" id="lg_b">เข้าสู่ระบบ</button></div>';
  var go = async function(){
    var b=document.getElementById('lg_b'); b.disabled=true;
    try {
      var j = await api('/api/login',{method:'POST',body:{username:document.getElementById('lg_u').value,password:document.getElementById('lg_p').value}});
      Auth.set(j); onOk(j);
    } catch(e){ document.getElementById('lg_e').textContent=e.message; b.disabled=false; }
  };
  document.getElementById('lg_b').onclick=go;
  document.getElementById('lg_p').onkeydown=function(e){ if(e.key==='Enter') go(); };
}
/** แถบบนสุด: ชื่อระบบ + ผู้ใช้ + ออกจากระบบ */
function topbarHtml(title, extra){
  var me=Auth.get()||{};
  return '<header class="noprint sticky top-0 z-[1000] bg-brand text-white px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">'+
    '<h1 class="text-base font-bold m-0">'+title+'</h1>'+
    '<div class="flex items-center gap-2 text-sm flex-wrap">'+(extra||'')+
    '<span class="opacity-90">👤 '+esc(me.name||'')+' <span class="opacity-70">('+(me.role==='admin'?'แอดมิน':'ช่าง')+')</span></span>'+
    '<button onclick="Auth.clear()" class="bg-white/20 hover:bg-white/30 rounded-lg px-2.5 py-1 cursor-pointer">ออกจากระบบ</button></div></header>';
}

/* ---------- แดชบอร์ดงาน (แผนที่ + รายการ) ---------- */
var Board = { data:[], map:null, markers:null, filter:{status:'',moo:'',q:'',mine:false}, onBlock:null };

Board.initMap = function(){
  Board.map = L.map('map').setView(MAP_CENTER, 15);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(Board.map);
  Board.markers = L.layerGroup().addTo(Board.map);
  // Tailwind (CDN) ใส่สไตล์หลัง Leaflet วัดขนาดกล่องไปแล้ว → วัดใหม่อีกรอบ ไม่งั้นแผนที่/หมุดเพี้ยน
  [300, 1000, 2500].forEach(function(ms){ setTimeout(function(){ Board.map.invalidateSize(); if(Board._pts&&Board._pts.length) Board.map.fitBounds(Board._pts,{padding:[30,30],maxZoom:17}); }, ms); });
  window.addEventListener('resize', function(){ Board.map.invalidateSize(); });
};
Board.load = async function(){
  Board.data = await api('/api/reports') || [];
  var sel=document.getElementById('f_moo'), cur=sel.value, moos={};
  Board.data.forEach(function(r){ var m=mooOf(r.pole_id); if(m) moos[m]=1; });
  sel.innerHTML='<option value="">ทุกหมู่</option>'+Object.keys(moos).sort(function(a,b){return a-b;}).map(function(m){return '<option value="'+m+'"'+(m===cur?' selected':'')+'>หมู่ '+m+'</option>';}).join('');
  Board.render();
};
Board.render = function(){
  var f=Board.filter, me=Auth.get()||{};
  f.status=document.getElementById('f_status').value; f.moo=document.getElementById('f_moo').value; f.q=document.getElementById('f_q').value.trim().toLowerCase();
  var rows = Board.data.filter(function(r){
    if(f.status==='__open' ? OPEN_STATUS.indexOf(r.status)<0 : (f.status && r.status!==f.status)) return false;
    if(f.moo && mooOf(r.pole_id)!==f.moo) return false;
    if(f.mine && r.assigned_to!==me.name) return false;
    if(f.q && (r.pole_id+' '+r.reporter_name+' '+r.reporter_phone+' '+r.detail+' '+r.report_id).toLowerCase().indexOf(f.q)<0) return false;
    return true;
  });
  document.getElementById('f_count').textContent='แสดง '+rows.length+' รายการ';

  var cnt={}, open=0; Board.data.forEach(function(r){ cnt[r.status]=(cnt[r.status]||0)+1; if(OPEN_STATUS.indexOf(r.status)>=0) open++; });
  var on=function(v){ return f.status===v?' ring-2 ring-brand':''; };
  document.getElementById('stats').innerHTML =
    '<span class="'+T.stat+on('')+'" onclick="Board.setStatus(\'\')">ทั้งหมด <b class="text-lg ml-1">'+Board.data.length+'</b></span>'+
    '<span class="'+T.stat+on('__open')+' border-red-300" onclick="Board.setStatus(\'__open\')">งานค้าง <b class="text-lg ml-1 text-red-700">'+open+'</b></span>'+
    STATUS.map(function(k){ return cnt[k]?'<span class="'+T.stat+on(k)+'" onclick="Board.setStatus(\''+k+'\')">'+k+' <b class="text-lg ml-1">'+cnt[k]+'</b></span>':''; }).join('');

  Board.markers.clearLayers(); var pts=[];
  rows.forEach(function(r){
    if(r.lat&&r.lng){
      var c=(CLS[r.status]||['','','#888'])[2];
      var m=L.circleMarker([+r.lat,+r.lng],{radius:10,color:'#fff',weight:2,fillColor:c,fillOpacity:.95});
      m.bindPopup('<b>เสา '+esc(r.pole_id)+'</b> <span class="'+T.pill+' '+(CLS[r.status]||[])[1]+'">'+esc(r.status)+'</span><br>'+esc(r.detail)+
        '<br><a class="'+T.btnSm+' bg-blue-600 text-white mt-1.5" style="color:#fff" href="'+gmaps(r.lat,r.lng)+'" target="_blank" rel="noopener">🧭 นำทาง Google Maps</a>');
      Board.markers.addLayer(m); pts.push([+r.lat,+r.lng]);
    }
  });
  Board._pts = pts;
  if(pts.length) Board.map.fitBounds(pts,{padding:[30,30],maxZoom:17}); else Board.map.setView(MAP_CENTER,15);

  document.getElementById('list').innerHTML = rows.map(function(r){
    var c=CLS[r.status]||['','',''], id=r.report_id.replace(/[^A-Za-z0-9]/g,'');
    var nav=(r.lat&&r.lng)?'<a class="'+T.btnSm+' bg-blue-600 text-white hover:bg-blue-700" href="'+gmaps(r.lat,r.lng)+'" target="_blank" rel="noopener">🧭 นำทาง</a>':'<span class="text-sm text-stone-500">ไม่มีพิกัด</span>';
    var opts=STATUS.map(function(s){return '<option'+(s===r.status?' selected':'')+'>'+s+'</option>';}).join('');
    var fake = r.fake_count>0 ? ' <span class="'+T.pill+' p-fake" title="เบอร์นี้เคยถูกตีเป็นแจ้งเท็จ">⚠ แจ้งเท็จ '+r.fake_count+' ครั้ง</span>' : '';
    var blk = (Board.onBlock && r.fake_count>0) ? ' <a href="#" onclick="Board.onBlock(\''+esc(r.reporter_phone)+'\');return false" class="text-red-700 underline">บล็อกเบอร์</a>' : '';
    return '<div class="bg-white border border-line border-l-[5px] rounded-xl p-3 mb-2.5 '+c[0]+'" id="it_'+id+'">'+
      '<h3 class="m-0 mb-1 text-base font-bold flex justify-between items-center gap-2"><span>เสา '+esc(r.pole_id)+(mooOf(r.pole_id)?' <span class="text-stone-500 font-normal text-sm">หมู่ '+esc(mooOf(r.pole_id))+'</span>':'')+'</span><span class="'+T.pill+' '+c[1]+'">'+esc(r.status)+'</span></h3>'+
      '<div class="text-sm text-stone-600 leading-relaxed">📅 '+fmtDT(r.created_at)+' <span class="text-stone-400">('+ago(r.created_at)+'ที่แล้ว)</span> · <span class="font-mono bg-indigo-50 px-1.5 rounded">'+esc(r.report_id)+'</span><br>'+
      '🔧 '+esc(r.detail)+'<br>'+
      '👤 '+esc(r.reporter_name)+' · 📞 <a class="text-blue-700" href="tel:'+esc(r.reporter_phone)+'">'+esc(r.reporter_phone)+'</a>'+fake+blk+
      (r.assigned_to?'<br>👷 '+esc(r.assigned_to):'')+'</div>'+
      '<div class="flex flex-wrap gap-1.5 mt-2">'+nav+
        (r.lat&&r.lng?'<a class="'+T.btnSm+' border border-brand text-brand bg-white hover:bg-paper" href="https://www.google.com/maps?q='+r.lat+','+r.lng+'" target="_blank" rel="noopener">🗺️ ดูแผนที่</a>':'')+
        '<a class="'+T.btnSm+' border border-brand text-brand bg-white hover:bg-paper" href="tel:'+esc(r.reporter_phone)+'">📞 โทรผู้แจ้ง</a></div>'+
      '<div class="flex flex-wrap gap-1.5 mt-2"><select class="'+T.input+' flex-1 min-w-[140px] py-2 text-sm" id="st_'+id+'">'+opts+'</select><input class="'+T.input+' flex-1 min-w-[140px] py-2 text-sm" id="as_'+id+'" placeholder="ผู้รับผิดชอบ" value="'+esc(r.assigned_to)+'"></div>'+
      '<div class="flex flex-wrap gap-1.5 mt-1.5"><input class="'+T.input+' flex-1 min-w-[160px] py-2 text-sm" id="nt_'+id+'" placeholder="บันทึกช่าง (สาเหตุ/อะไหล่ที่เปลี่ยน)" value="'+esc(r.staff_note)+'">'+
        '<button class="'+T.btnSm+' bg-brand text-white hover:bg-brand-dark px-4" onclick="Board.save(\''+esc(r.report_id)+'\',\''+id+'\')">💾 บันทึก</button></div>'+
    '</div>';
  }).join('') || '<p class="text-center text-stone-500 py-8">ไม่มีรายการ</p>';
};
Board.setStatus=function(v){ document.getElementById('f_status').value=v; Board.render(); };
Board.save = async function(rid,id){
  try {
    await api('/api/update',{method:'POST',body:{report_id:rid,status:document.getElementById('st_'+id).value,
      assigned_to:document.getElementById('as_'+id).value,staff_note:document.getElementById('nt_'+id).value}});
    await Board.load();
  } catch(e){ alert('บันทึกไม่สำเร็จ: '+e.message); }
};
/** HTML ส่วนสถิติ+ฟิลเตอร์+แผนที่+รายการ (ใช้ซ้ำทั้งสองหน้า) */
Board.html = function(){
  var sel=T.input+' w-auto flex-1 min-w-[120px] py-2 text-sm';
  return '<div class="flex flex-wrap gap-2 px-3 pt-3" id="stats"></div>'+
    '<div class="flex flex-wrap items-center gap-2 px-3 py-2.5 noprint"><select id="f_status" class="'+sel+'" onchange="Board.render()"><option value="">ทุกสถานะ</option><option value="__open">งานค้างทั้งหมด</option>'+
      STATUS.map(function(s){return '<option>'+s+'</option>';}).join('')+'</select>'+
    '<select id="f_moo" class="'+sel+'" onchange="Board.render()"><option value="">ทุกหมู่</option></select>'+
    '<input id="f_q" class="'+sel+' min-w-[180px]" placeholder="🔍 ค้นเลขเสา/ชื่อ/เบอร์/เลขที่" oninput="Board.render()">'+
    '<label class="text-sm text-stone-600 flex items-center gap-1.5 cursor-pointer"><input type="checkbox" class="size-4 accent-brand" onchange="Board.filter.mine=this.checked;Board.render()"> งานของฉัน</label>'+
    '<button class="'+T.btnSm+' border border-brand text-brand bg-white hover:bg-paper" onclick="Board.load()">🔄 รีเฟรช</button><span class="text-sm text-stone-500" id="f_count"></span></div>'+
    '<div class="flex flex-wrap gap-3 px-3 pb-3"><div id="map" class="flex-[1_1_380px] h-[40vh] min-h-[260px] lg:h-[65vh] lg:min-h-[380px] rounded-xl border border-line"></div><div class="flex-[1_1_420px] lg:max-h-[65vh] lg:overflow-auto" id="list"></div></div>';
};
