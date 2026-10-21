/* Küp Adası — service worker
   - Uygulama kabuğu (index, manifest, ikonlar) ve three.js önbelleğe alınır -> çevrimdışı çalışır.
   - index.html: önce ağ, olmazsa önbellek (güncellemeler hemen gelir).
   - three.js / ikonlar: önce önbellek.
   Yeni sürüm yayınlarken yalnızca VERSION'u değiştirmen yeterli. */
const VERSION='kup-v2';
const THREE_URL='https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
const SHELL=['./','./index.html','./manifest.webmanifest','./icons/icon.svg','./icons/icon-192.png','./icons/icon-512.png','./icons/maskable-512.png','./icons/apple-touch-icon.png','./icons/favicon-48.png'];

self.addEventListener('install',e=>{
  e.waitUntil((async()=>{
    const c=await caches.open(VERSION);
    await Promise.allSettled(SHELL.map(u=>c.add(u)));
    try{await c.put(THREE_URL,await fetch(THREE_URL,{mode:'no-cors'}));}catch(err){}
    self.skipWaiting();
  })());
});
self.addEventListener('activate',e=>{
  e.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k!==VERSION).map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  const isThree=req.url===THREE_URL;
  if(url.origin!==location.origin&&!isThree)return;
  if(req.mode==='navigate'||url.pathname.endsWith('/index.html')||url.pathname.endsWith('/')){
    e.respondWith((async()=>{
      try{
        const net=await fetch(req);
        const c=await caches.open(VERSION);c.put('./index.html',net.clone());
        return net;
      }catch(err){
        return (await caches.match('./index.html'))||(await caches.match('./'))||Response.error();
      }
    })());
    return;
  }
  e.respondWith((async()=>{
    const hit=await caches.match(req);
    if(hit)return hit;
    try{
      const net=await fetch(isThree?new Request(req.url,{mode:'no-cors'}):req);
      if(net&&(net.ok||net.type==='opaque')){const c=await caches.open(VERSION);c.put(req,net.clone());}
      return net;
    }catch(err){return Response.error();}
  })());
});
