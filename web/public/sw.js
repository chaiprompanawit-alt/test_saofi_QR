// Service Worker: ให้ติดตั้งเป็นแอปได้ (PWA) + เปิดหน้าได้แม้เน็ตสะดุด
// - /api/* ไม่แคชเลย (ข้อมูลงานต้องสดเสมอ)
// - ไฟล์หน้า/สคริปต์/ไอคอน: network-first แล้วเก็บสำเนา ถ้าออฟไลน์ใช้สำเนาแทน
// - แผนที่ OSM / CDN: cache-first (ไม่ค่อยเปลี่ยน)
var VERSION = 'saofi-v1';
var SHELL = ['/', '/tech', '/admin', '/assets/app.css', '/assets/common.js', '/assets/config.js', '/manifest.webmanifest', '/icons/icon-192.png'];

self.addEventListener('install', function(e){
  e.waitUntil(caches.open(VERSION).then(function(c){ return c.addAll(SHELL); }).catch(function(){}));
  self.skipWaiting();
});
self.addEventListener('activate', function(e){
  e.waitUntil(caches.keys().then(function(keys){ return Promise.all(keys.filter(function(k){ return k!==VERSION; }).map(function(k){ return caches.delete(k); })); }));
  self.clients.claim();
});
self.addEventListener('fetch', function(e){
  var req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.pathname.indexOf('/api/') === 0) return;   // API ผ่านตรงเสมอ

  var thirdParty = url.origin !== location.origin;
  if (thirdParty) {   // แผนที่ / Tailwind / Leaflet / ฟอนต์
    e.respondWith(caches.match(req).then(function(hit){
      return hit || fetch(req).then(function(res){ if(res.ok||res.type==='opaque'){ var cp=res.clone(); caches.open(VERSION).then(function(c){ c.put(req, cp); }); } return res; });
    }));
    return;
  }
  e.respondWith(fetch(req).then(function(res){
    if (res.ok) { var cp=res.clone(); caches.open(VERSION).then(function(c){ c.put(req, cp); }); }
    return res;
  }).catch(function(){ return caches.match(req).then(function(hit){ return hit || caches.match(req.mode==='navigate' ? '/tech' : req); }); }));
});
