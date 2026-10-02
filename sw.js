// Pack en ligne — copie du pack gardée sur la tablette (service worker).
// La page est servie depuis cette copie : le pack s'ouvre aussi sans internet. Elle n'est remplacée que
// lorsque la page le décide (en-ligne.js : version choisie pour cette tablette, quand personne n'est connecté).
var CACHE='pack-tablettes-v1';
var FICHIERS=['./','./index.html','./manifest.webmanifest','./icone-192.png','./icone-512.png'];

// Installation : ne remplit que ce qui manque. Une copie déjà gardée (version en test, tablette bloquée) n'est
// jamais remplacée ici.
self.addEventListener('install',function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){
    return Promise.all(FICHIERS.map(function(f){
      return c.match(f).then(function(deja){
        if(deja)return;
        return fetch(new Request(f,{cache:'reload'})).then(function(r){if(r.ok)return c.put(f,r)}).catch(function(){});
      });
    }));
  }).then(function(){return self.skipWaiting()}));
});
self.addEventListener('activate',function(e){
  e.waitUntil(caches.keys().then(function(l){return Promise.all(l.filter(function(k){return k!==CACHE}).map(function(k){return caches.delete(k)}))}).then(function(){return self.clients.claim()}));
});

function estPage(req,url){return req.mode==='navigate'||/\/(index\.html)?$/.test(url.pathname)}
self.addEventListener('fetch',function(e){
  var req=e.request,url=new URL(req.url);
  if(req.method!=='GET'||url.origin!==location.origin)return; // Google, etc. : jamais touchés
  if(/version\.json$/.test(url.pathname)||/sw\.js$/.test(url.pathname))return; // toujours le site
  // Téléchargement d'une nouvelle version par la page (en-ligne.js) : toujours le site, rien n'est gardé ici.
  if(url.searchParams.has('maj')||/\/versions\//.test(url.pathname))return;
  if(estPage(req,url)){
    // La copie gardée d'abord ; le site seulement si la tablette n'en a pas encore.
    e.respondWith(caches.match('./index.html').then(function(r){
      return r||fetch(req).then(function(n){if(n.ok){var c=n.clone();caches.open(CACHE).then(function(k){k.put('./index.html',c)})}return n});
    }));
    return;
  }
  e.respondWith(caches.match(req).then(function(r){
    return r||fetch(req).then(function(n){if(n.ok){var c=n.clone();caches.open(CACHE).then(function(k){k.put(req,c)})}return n});
  }));
});

// Anciennes pages (avant la diffusion par tablette) : la version diffusée remplace la copie gardée.
self.addEventListener('message',function(e){
  if(!e.data||e.data.type!=='maj')return;
  var port=e.ports&&e.ports[0],repondre=function(ok){if(port)port.postMessage({ok:ok})};
  e.waitUntil(caches.open(CACHE).then(function(c){
    return Promise.all(FICHIERS.map(function(f){
      return fetch(new Request(f+(f.indexOf('?')<0?'?':'&')+'maj='+Date.now(),{cache:'reload'})).then(function(r){if(r.ok)return c.put(f,r)});
    }));
  }).then(function(){repondre(true)},function(){repondre(false)}));
});
