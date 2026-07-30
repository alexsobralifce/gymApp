const SW_VERSION = 'endorfinapp-v5-theme-day-white'
const GIF_CACHE_NAME = 'gymapp-workout-gifs-v1'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys()
      await Promise.all(
        cacheNames
          .filter((name) => name !== GIF_CACHE_NAME)
          .map((name) => caches.delete(name))
      )
      await self.clients.claim()
    })(),
  )
})

// Interceptador Cache-First para GIFs e imagens de treino
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  const isImageOrGif =
    event.request.destination === 'image' ||
    /\.(gif|png|jpg|jpeg|webp)$/i.test(url.pathname) ||
    url.pathname.includes('/uploads/')

  if (isImageOrGif && event.request.method === 'GET') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(GIF_CACHE_NAME)
        const cachedResponse = await cache.match(event.request)
        if (cachedResponse) {
          return cachedResponse
        }

        try {
          const networkResponse = await fetch(event.request)
          if (networkResponse && networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone())
          }
          return networkResponse
        } catch {
          return new Response('', { status: 408, statusText: 'Offline GIF Unavailable' })
        }
      })(),
    )
  }
})

self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {}
  const title = data.title || 'ENDORFINAPP'
  const url = data.url || data.url_estudo || '/'
  const options = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200, 100, 400],
    tag: data.tag || 'endorfinapp-treino',
    renotify: true,
    data: { url },
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const raw = event.notification.data?.url || '/'
  const targetUrl = raw.startsWith('http') ? raw : new URL(raw, self.location.origin).href

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ('focus' in client) {
          client.navigate(targetUrl)
          return client.focus()
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl)
      }
    }),
  )
})
