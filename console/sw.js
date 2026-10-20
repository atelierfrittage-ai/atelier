// Console de l'atelier — application installable (2026-10-17). Service worker PROPRE à /console/ (portée /console/),
// distinct de celui du pack (qui ignore /console/). Il ne garde QUE la page et ses fichiers statiques (manifeste,
// icônes) pour que l'application s'ouvre vite ; JAMAIS un appel au script Google, jamais une donnée.
// Page : réseau d'abord (toujours la version publiée), copie gardée seulement si le réseau manque.
// VERSION est posée à la construction (empreinte de la page) : chaque publication = nouveau service worker = bandeau
// « Nouvelle version disponible » dans la page ; il ne prend la main que quand la personne recharge.
var VERSION="2f326fdea045";
var CACHE='console-atelier-'+VERSION;
var STATIQUES=['./manifest.webmanifest','./icone-192.png','./icone-512.png'];
var HORS_LIGNE='<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
  '<title>Console de l’atelier</title><body style="font:17px system-ui,sans-serif;background:#f3f6f7;color:#15242b;display:grid;place-items:center;min-height:100vh;margin:0;padding:16px">'+
  '<div style="background:#fff;border:1px solid #d9e1e5;border-radius:16px;padding:28px;max-width:440px"><h1 style="font-size:22px;margin:0 0 10px">Pas de connexion</h1>'+
  '<p style="margin:0 0 14px">La console de l’atelier a besoin d’internet. Vérifiez le Wi-Fi ou le câble, puis réessayez.</p>'+
  '<button onclick="location.reload()" style="font:inherit;font-weight:600;min-height:44px;padding:8px 16px;border-radius:10px;border:0;background:#065E66;color:#fff">Réessayer</button></div></body></html>';

self.addEventListener('install',function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){
    return Promise.all(['./'].concat(STATIQUES).map(function(f){
      return fetch(new Request(f,{cache:'reload'})).then(function(r){if(r.ok)return c.put(f,r)}).catch(function(){});
    }));
  }));
  // Pas de skipWaiting ici : la nouvelle version attend que la personne choisisse « Recharger » (message « activer »).
});
self.addEventListener('activate',function(e){
  // Seulement les anciennes copies de la console (jamais celles du pack).
  e.waitUntil(caches.keys().then(function(l){return Promise.all(l.filter(function(k){return k.indexOf('console-atelier-')===0&&k!==CACHE}).map(function(k){return caches.delete(k)}))}).then(function(){return self.clients.claim()}));
});
self.addEventListener('message',function(e){if(e.data&&e.data.type==='activer')self.skipWaiting()});

self.addEventListener('fetch',function(e){
  var req=e.request,url=new URL(req.url);
  // Google (autre origine), envois, et tout ce qui n'est pas la console : jamais touchés, jamais gardés.
  if(req.method!=='GET'||url.origin!==location.origin)return;
  var base=new URL('./',self.registration.scope).pathname;
  if(url.pathname.indexOf(base)!==0)return;
  var nom=url.pathname.slice(base.length);
  if(req.mode==='navigate'||nom===''||nom==='index.html'){
    e.respondWith(fetch(req,{cache:'no-store'}).then(function(r){
      if(r.ok){var c=r.clone();caches.open(CACHE).then(function(k){k.put('./',c)})}
      return r;
    }).catch(function(){
      return caches.match('./').then(function(r){return r||new Response(HORS_LIGNE,{status:503,headers:{'Content-Type':'text/html; charset=utf-8'}})});
    }));
    return;
  }
  if(STATIQUES.indexOf('./'+nom)>=0){
    e.respondWith(caches.match('./'+nom).then(function(r){return r||fetch(req)}));
  }
  // Tout le reste (sw.js, version, …) : le réseau, sans copie.
});
