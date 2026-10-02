// Service worker do Fio Certo: o cálculo é todo no navegador, então com os arquivos em cache o site
// funciona sem internet. Páginas: rede primeiro (pega versão nova quando há conexão), cache se
// offline. Demais arquivos do próprio site: cache primeiro — os de /assets têm hash no nome, então
// uma versão nova nunca reaproveita um arquivo velho.
const CACHE = 'fio-certo-v1'
const ESSENCIAIS = ['./', './index.html', './manifest.webmanifest', './favicon.svg']

self.addEventListener('install', (evento) => {
  evento.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ESSENCIAIS)))
  self.skipWaiting()
})

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((chaves) => Promise.all(chaves.filter((chave) => chave !== CACHE).map((chave) => caches.delete(chave))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (evento) => {
  const pedido = evento.request
  if (pedido.method !== 'GET' || new URL(pedido.url).origin !== self.location.origin) return

  if (pedido.mode === 'navigate') {
    evento.respondWith(
      fetch(pedido)
        .then((resposta) => {
          const copia = resposta.clone()
          caches.open(CACHE).then((cache) => cache.put('./index.html', copia))
          return resposta
        })
        .catch(() => caches.match('./index.html')),
    )
    return
  }

  evento.respondWith(
    caches.match(pedido).then(
      (emCache) =>
        emCache ??
        fetch(pedido).then((resposta) => {
          if (resposta.ok) {
            const copia = resposta.clone()
            caches.open(CACHE).then((cache) => cache.put(pedido, copia))
          }
          return resposta
        }),
    ),
  )
})
