// Service worker: guarda en caché el "esqueleto" de la app (HTML/CSS/JS/iconos) y el
// banco de preguntas, para que funcione sin internet después de la primera carga.
// Subir el número de CACHE_NOMBRE cuando se quiera forzar a los usuarios a bajar de
// nuevo los archivos (por ejemplo, al reconvertir datos/preguntas.json).

const CACHE_NOMBRE = "app-admision-v1";

const ARCHIVOS_PARA_CACHEAR = [
  "./",
  "index.html",
  "manifest.json",
  "css/estilos.css",
  "js/logica.js",
  "js/almacenamiento.js",
  "js/app.js",
  "datos/preguntas.json",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-192.png",
  "icons/icon-maskable-512.png",
];

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    caches.open(CACHE_NOMBRE).then((cache) => cache.addAll(ARCHIVOS_PARA_CACHEAR))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((nombres) =>
        Promise.all(nombres.filter((nombre) => nombre !== CACHE_NOMBRE).map((nombre) => caches.delete(nombre)))
      )
  );
  self.clients.claim();
});

// Estrategia "cache primero, red como respaldo": una vez guardado, todo se sirve desde
// el dispositivo (sin internet); si algo no estaba en caché, se busca en la red y de
// paso se guarda para la próxima vez.
self.addEventListener("fetch", (evento) => {
  if (evento.request.method !== "GET") return;

  evento.respondWith(
    caches.match(evento.request).then((respuestaCacheada) => {
      if (respuestaCacheada) return respuestaCacheada;

      return fetch(evento.request)
        .then((respuestaRed) => {
          const copia = respuestaRed.clone();
          caches.open(CACHE_NOMBRE).then((cache) => cache.put(evento.request, copia));
          return respuestaRed;
        })
        .catch(() => {
          if (evento.request.mode === "navigate") {
            return caches.match("index.html");
          }
        });
    })
  );
});
