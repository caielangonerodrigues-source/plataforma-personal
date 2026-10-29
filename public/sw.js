// Service worker simples: abre o app mesmo com internet ruim.
// Páginas e arquivos do site: rede primeiro, cache como reserva. Dados do Supabase nunca são guardados.
const CACHE = 'personal-v2'

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['/', '/manifest.webmanifest', '/icon-192.png'])))
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))))
  self.clients.claim()
})

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return
  e.respondWith(
    fetch(e.request)
      .then((r) => {
        if (r.ok) { const copia = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copia)) }
        return r
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match('/'))),
  )
})

// Notificações no celular (enviadas pela função "notificacoes" do Supabase).
self.addEventListener('push', (e) => {
  let d = {}
  try { d = e.data ? e.data.json() : {} } catch { d = { body: e.data?.text() } }
  e.waitUntil(self.registration.showNotification(d.title || 'Corpo Atlético', {
    body: d.body || '', icon: '/icon-192.png', badge: '/icon-192.png', data: { url: d.url || '/' },
  }))
})

self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  const url = new URL(e.notification.data?.url || '/', self.location.origin).href
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((abas) => {
    const aba = abas.find((c) => c.url.startsWith(self.location.origin))
    return aba ? aba.focus().then((c) => c.navigate?.(url)) : self.clients.openWindow(url)
  }))
})
