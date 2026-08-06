/* RYOTAMORI service worker: офлайн-оболочка без риска для API.
   Кэшируем только same-origin статику: хэшированные /assets/* (immutable),
   иконки/шрифты/баннер. Навигация — network-first с фолбэком на кэшированный index.
   Всё кросс-доменное (Jikan, AniList, Shikimori, видео-хосты) и .php не трогаем. */
const VER = 'ryotamori-v1'
const SHELL = ['/', '/icon-192.png', '/icon-512.png', '/manifest.webmanifest']

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches
      .open(VER)
      .then((c) => c.addAll(SHELL))
      .catch(() => {})
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VER).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.endsWith('.php')) return

  // Навигация: сеть → кэш (офлайн-запуск установленного PWA)
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone()
          caches.open(VER).then((c) => c.put('/', copy)).catch(() => {})
          return res
        })
        .catch(() => caches.match('/').then((r) => r || Response.error())),
    )
    return
  }

  // Хэшированные бандлы и статика: cache-first
  const isStatic =
    url.pathname.startsWith('/assets/') ||
    /\.(png|svg|webmanifest|woff2?)$/.test(url.pathname)
  if (!isStatic) return
  e.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone()
            caches.open(VER).then((c) => c.put(req, copy)).catch(() => {})
          }
          return res
        }),
    ),
  )
})
