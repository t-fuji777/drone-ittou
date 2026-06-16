// 一等学科試験 暗記マスター - Service Worker
// 更新が即反映されるよう、HTMLはネット優先（network-first）。
const CACHE = 'ittou-gakka-v32';

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png',
  './icon-180.png'
];

// インストール時にアプリ本体をキャッシュし、すぐ新版を有効化
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

// 古い版数キャッシュを削除し、即座に制御を奪う
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k.startsWith('ittou-gakka-') && k !== CACHE)
            .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// 取得戦略:
//  ・HTML/ページ遷移 → network-first（最新を取得、失敗時のみキャッシュ）
//  ・その他(画像/manifest) → cache-first（速度重視、裏で更新）
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;

  const req = e.request;
  const isHTML = req.mode === 'navigate' ||
                 (req.headers.get('accept') || '').includes('text/html');

  if (isHTML) {
    // network-first: 常に最新のindex.htmlを優先
    e.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      }).catch(() =>
        caches.match(req).then((c) => c || caches.match('./index.html'))
      )
    );
    return;
  }

  // それ以外: cache-first + 裏で更新
  e.respondWith(
    caches.match(req).then((cached) => {
      const fetched = fetch(req).then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() => cached);
      return cached || fetched;
    })
  );
});
