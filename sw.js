const C='adc-v3';const CORE=['./','index.html','style.css','app.js','engine.js','ai.js','rules.js','kb.js','hf.js','cases.js','icon.svg','manifest.json','vendor/mammoth.browser.min.js','vendor/pdf.min.mjs','vendor/pdf.worker.min.mjs','vendor/tesseract.min.js','vendor/worker.min.js','vendor/jspdf.umd.min.js','vendor/html2canvas.min.js'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==location.origin)return;
 e.respondWith(fetch(e.request).then(r=>{if(r.ok){const cp=r.clone();caches.open(C).then(c=>c.put(e.request,cp))}return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match('index.html'))))});
