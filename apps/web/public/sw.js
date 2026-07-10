self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {}
  const title = data.title || 'GymApp'
  const options = {
    body: data.body || '',
    icon: '/icon-192.png',
    data: { url: data.url_estudo || null },
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url
  if (url) {
    event.waitUntil(clients.openWindow(url))
  } else {
    event.waitUntil(clients.openWindow('/'))
  }
})
