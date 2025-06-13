import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute, NavigationRoute, setCatchHandler } from 'workbox-routing';

precacheAndRoute(self.__WB_MANIFEST);

const CACHE_NAME = "story-app-cache-v1";
const API_URL = "https://story-api.dicoding.dev";


const navigationHandler = async () => {
  return await caches.match('/index.html');
};

const navigationRoute = new NavigationRoute(navigationHandler);
registerRoute(navigationRoute);

// Catch any failed navigation requests and serve index.html
setCatchHandler(async ({ event }) => {
  if (event.request.mode === 'navigate') {
    return caches.match('/index.html');
  }
  return Response.error();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (url.origin === location.origin &&
      (request.destination === 'image' || request.destination === 'style' || request.destination === 'script')) {
    event.respondWith(
      caches.match(request).then((cached) =>
        cached ||
        fetch(request).then((response) => {
          return caches.open('runtime-cache').then((cache) => {
            cache.put(request, response.clone());
            return response;
          });
        })
      )
    );
  }
});

// Push notification
self.addEventListener("push", (event) => {
  if (!event.data) return;

  const payload = event.data.json();
  const title = payload.title || "New Story Notification";
  const options = {
    body: payload.options?.body || "You have a new story notification",
    icon: "/assets/images/icon-192x192.png",
    badge: "/assets/images/icon-192x192.png",
    data: {
      url: "/stories",
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click handler
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: "window" }).then((windowClients) => {
      const matchingClient = windowClients.find(
        (client) => client.url === "/" && "focus" in client
      );

      if (matchingClient) {
        return matchingClient.focus();
      } else {
        return clients.openWindow(event.notification.data?.url || "/");
      }
    })
  );
});

// Background sync trigger
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-stories") {
    event.waitUntil(
      (async () => {
        const clients = await self.clients.matchAll({ includeUncontrolled: true });
        clients.forEach((client) => {
          client.postMessage({
            type: "TRIGGER_SYNC",
            message: "Attempting to sync offline stories",
          });
        });
      })()
    );
  }
});
