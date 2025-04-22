import type { MichiProcessType } from "@michijs/dev-server";
import { MESSAGE_TYPES, USER_CACHE_NAME } from "./constants";

const sw = self as ServiceWorkerGlobalScope & typeof globalThis;

declare const michiProcess: MichiProcessType;

const buildFiles = michiProcess.env.BUILD_FILES;
const michiCacheName = michiProcess.env.CACHE_NAME;

const expectedCaches = [michiCacheName, USER_CACHE_NAME];

const urlsToRequests = (urls: string[]): Request[] =>
  urls.map((url) => new Request(url, { cache: "no-cache" }));

async function storeFilesIntoCache(cacheName: string, urls: string[]){
  const cache = await caches.open(cacheName);
  return await cache.addAll(urlsToRequests(urls));
};
const storeUserFilesIntoCache = async (urls: string[]) =>
  await storeFilesIntoCache(USER_CACHE_NAME, urls);
const storeBuildFilesIntoCache = async () =>
  await storeFilesIntoCache(michiCacheName, buildFiles);

async function controlPageAndClean () {
  const cacheNames = await caches.keys();
  return await Promise.all(
    cacheNames.map((x) =>
      expectedCaches.includes(x) ? undefined : caches.delete(x),
    ),
  );
};

async function getFromCacheOrFetch(e: FetchEvent) {
  if (e.request.method !== "GET") {
    return fetch(e.request);
  }
  const response = await caches.match(e.request);
  return response || fetch(e.request);
};

async function installPromise() {
  await storeBuildFilesIntoCache()
  await sw.skipWaiting();
}

async function activatePromise() {
  await controlPageAndClean();
  await sw.clients.claim();
}

// Cache, falling back to network strategy
sw.addEventListener("install", (e) => 
  e.waitUntil(installPromise())
);

sw.addEventListener("activate", (e) => 
  e.waitUntil(activatePromise())
);

sw.addEventListener("fetch", (e) => 
  e.respondWith(getFromCacheOrFetch(e))
);

sw.addEventListener("message", (event) => {
  switch (event.data?.type) {
    case MESSAGE_TYPES.SKIP_WAITING:
      sw.skipWaiting();
      break;
    case MESSAGE_TYPES.ADD_TO_CACHE:
      event.waitUntil(storeUserFilesIntoCache(event.data.urls));
      break;
  }
});
