const SW_VERSION = 'endorfinapp-v7-twa-offline'
const SHELL_CACHE_NAME = `endorfinapp-shell-${SW_VERSION}`
const GIF_CACHE_NAME = 'gymapp-workout-gifs-v1'

const PRECACHE_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/favicon.svg',
  '/icon.svg',
  '/icon-180.png',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-512.png',
]

// ─── Instalação: Precache do shell e ativação imediata ─────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE_NAME).then(async (cache) => {
      try {
        await cache.addAll(PRECACHE_ASSETS)
      } catch (err) {
        console.warn('[SW] Aviso no precache:', err)
      }
      return self.skipWaiting()
    }),
  )
})

// ─── Ativação: Limpeza de caches obsoletos ─────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys()
      await Promise.all(
        cacheNames
          .filter((name) => name !== GIF_CACHE_NAME && name !== SHELL_CACHE_NAME)
          .map((name) => caches.delete(name)),
      )
      await self.clients.claim()
    })(),
  )
})

// ─── Interceptação de Requisições ──────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Ignorar requisições que não sejam GET ou sejam para extensões do browser
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return
  }

  // Ignorar desenvolvimento local e rotas internas do Vite (evita cache de módulos em localhost)
  if (
    url.hostname === 'localhost' ||
    url.hostname === '127.0.0.1' ||
    url.pathname.startsWith('/@') ||
    url.pathname.includes('/src/')
  ) {
    return
  }

  // 1. Imagens e GIFs de treino: Cache-First
  const isImageOrGif =
    request.destination === 'image' ||
    /\.(gif|png|jpg|jpeg|webp|svg)$/i.test(url.pathname) ||
    url.pathname.includes('/uploads/')

  if (isImageOrGif) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(GIF_CACHE_NAME)
        const cachedResponse = await cache.match(request)
        if (cachedResponse) {
          return cachedResponse
        }

        try {
          const networkResponse = await fetch(request)
          if (networkResponse && networkResponse.status === 200) {
            cache.put(request, networkResponse.clone())
          }
          return networkResponse
        } catch {
          // Se for imagem offline sem cache, tenta ícone padrão ou status 408
          return cachedResponse || new Response('', { status: 408, statusText: 'Offline Asset Unavailable' })
        }
      })(),
    )
    return
  }

  // 2. Requisições de navegação HTML (páginas): Network-First com fallback para cache e offline.html
  if (request.mode === 'navigate' || (request.headers.get('accept') && request.headers.get('accept').includes('text/html'))) {
    event.respondWith(
      (async () => {
        try {
          const networkResponse = await fetch(request)
          if (networkResponse && networkResponse.status === 200) {
            const cache = await caches.open(SHELL_CACHE_NAME)
            cache.put(request, networkResponse.clone())
          }
          return networkResponse
        } catch {
          // Sem rede: tenta cache da página solicitada ou index precacheado
          const cache = await caches.open(SHELL_CACHE_NAME)
          const cachedPage = (await cache.match(request)) || (await cache.match('/'))
          if (cachedPage) {
            return cachedPage
          }
          // Fallback final: página estilizada offline.html
          const offlinePage = await cache.match('/offline.html')
          return offlinePage || new Response('<h1>Você está offline</h1>', {
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
          })
        }
      })(),
    )
    return
  }

  // 3. Scripts JS, estilos CSS e fontes: Stale-While-Revalidate
  const isStaticAsset =
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'font' ||
    /\.(js|css|woff2?|ttf|eot)$/i.test(url.pathname)

  if (isStaticAsset && url.origin === self.location.origin) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(SHELL_CACHE_NAME)
        const cachedResponse = await cache.match(request)

        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(request, networkResponse.clone())
            }
            return networkResponse
          })
          .catch(() => null)

        return cachedResponse || fetchPromise
      })(),
    )
    return
  }
})

// ─── Notificações Push ────────────────────────────────────────────────────────
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

// ─── Clique na Notificação ───────────────────────────────────────────────────
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
