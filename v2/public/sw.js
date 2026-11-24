const CACHE_PREFIX = 'garasjegym-app-shell-'
// A fresh cache also discards older shell assets and cached partial media responses.
const CACHE_NAME = CACHE_PREFIX + 'v13-gazelle-safehouse'
const APP_SCOPE = '/Garasjegym/'
const SHELL_FILES = [
  APP_SCOPE,
  APP_SCOPE + 'manifest.webmanifest',
  APP_SCOPE + 'garasjegym-49-192.png',
  APP_SCOPE + 'garasjegym-49-512.png',
  APP_SCOPE + 'garasjegym-49-maskable-512.png',
  APP_SCOPE + 'garasjegym-49-favicon-48.png',
  APP_SCOPE + 'garasjegym-49-apple-180.png',
]

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME)
    await cache.addAll(SHELL_FILES)
    await self.skipWaiting()
  })())
})

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys()
    await Promise.all(keys
      .filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
      .map(key => caches.delete(key)))
    await self.clients.claim()
  })())
})

self.addEventListener('fetch', event => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin || !url.pathname.startsWith(APP_SCOPE)) return

  // Let the browser request byte ranges directly. Cached 206 responses can
  // break HTML5 video seeking/playback (especially on Android Chrome).
  if (request.headers.has('range') ||
      request.destination === 'video' || request.destination === 'audio' ||
      /\.(mp4|m4v|webm|mp3|m4a|wav|ogg)$/i.test(url.pathname)) return

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request)
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME)
          await cache.put(APP_SCOPE, response.clone())
        }
        return response
      } catch {
        return (await caches.match(request))
          || (await caches.match(APP_SCOPE))
          || Response.error()
      }
    })())
    return
  }

  event.respondWith((async () => {
    const cached = await caches.match(request)
    if (cached) return cached

    try {
      const response = await fetch(request)
      if (response.ok) {
        const cache = await caches.open(CACHE_NAME)
        await cache.put(request, response.clone())
      }
      return response
    } catch {
      return Response.error()
    }
  })())
})
