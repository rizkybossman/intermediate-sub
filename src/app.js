import { Header, updateAuthUI } from './components/Header.js';
import '../public/assets/styles/main.css'; 
import { Router } from './router.js';
import { AuthModel } from './models/AuthModel.js';
import { StoryModel } from './models/StoryModel.js';
import { AuthPresenter } from './presenters/AuthPresenter.js';
import { StoryPresenter } from './presenters/StoryPresenter.js';
import { MapPresenter } from './presenters/MapPresenter.js';
import { LoginView } from './views/auth/LoginView.js';
import { RegisterView } from './views/auth/RegisterView.js';
import { StoriesView } from './views/stories/StoriesView.js';
import { DetailStoryView } from './views/stories/DetailStoryView.js';
import { AddStoryView } from './views/stories/AddStoryView.js';
import { ErrorView } from './views/ErrorView.js';
import { checkAuth, checkGuest } from './utils/auth.js';
import { requestNotificationPermission, subscribeUser } from './utils/notification.js';
import { initializeSkipToContent } from './utils/SkipToContent.js';

initializeSkipToContent();
const authModel = new AuthModel();
const storyModel = new StoryModel(authModel);

initializeSkipToContent();

const appRoot = document.getElementById("app");
appRoot.appendChild(Header());

let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;

  const installBtn = document.getElementById('install-button');
  if (installBtn) {
    installBtn.style.display = 'inline-block';
    installBtn.addEventListener('click', async () => {
      installBtn.style.display = 'none';
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      deferredPrompt = null;
    });
  }
});

const initMapWithRetry = async (handler, containerId, lat, lng, zoom, attempts = 0) => {
  try {
    const container = document.getElementById(containerId);
    if (!container && attempts < 3) {
      await new Promise(resolve => setTimeout(resolve, 100 * (attempts + 1)));
      return initMapWithRetry(handler, containerId, lat, lng, zoom, attempts + 1);
    }
    return handler(containerId, lat, lng, zoom);
  } catch (error) {
    return null;
  }
};

window.addEventListener('logout', () => {
  authModel.logout();
  updateAuthUI(false);
  router.navigateTo('/login');
});

const routes = [
  {
    path: '/login',
    view: async () => {
      if (!checkGuest(authModel, router)) return ErrorView().getView();
      const view = LoginView();
      new AuthPresenter(authModel, { bindLogin: view.bindLogin, showError: view.showError }, router);
      return view.getView();
    }
  },
  {
    path: '/register',
    view: async () => {
      if (!checkGuest(authModel, router)) return ErrorView().getView();
      const view = RegisterView();
      new AuthPresenter(authModel, { bindRegister: view.bindRegister, showError: view.showError, showSuccess: view.showSuccess }, router);
      return view.getView();
    }
  },
  {
    path: '/',
    view: async () => {
      if (!checkAuth(authModel, router)) return ErrorView().getView();
      const view = StoriesView();
      new StoryPresenter(storyModel, { bindLoadStories: view.bindLoadStories, displayStories: view.displayStories, showError: view.showError }, router);
      return view.getView();
    }
  },
  {
    path: '/stories',
    view: async () => {
      if (!checkAuth(authModel, router)) return ErrorView().getView();
      const view = StoriesView();
      new StoryPresenter(storyModel, { bindLoadStories: view.bindLoadStories, displayStories: view.displayStories, showError: view.showError }, router);
      return view.getView();
    }
  },
  {
    path: '/stories/:id',
    view: async (params) => {
      if (!checkAuth(authModel, router)) return ErrorView();
      const view = DetailStoryView();
      const { id } = params;
      new StoryPresenter(storyModel, {
        bindLoadStoryDetail: (handler) => {
          const mapContainer = view.getView().querySelector('#story-map-container');
          if (mapContainer) {
            mapContainer.innerHTML = '<div id="story-map" class="detail-map"></div>';
          }
          handler(id);
        },
        displayStoryDetail: (story) => {
          view.displayStoryDetail(story);
          if (story.lat && story.lon) {
            setTimeout(() => {
              const mapElement = view.getView().querySelector('#story-map');
              if (!mapElement || !mapElement._leaflet_id) {
                try {
                  const map = L.map(mapElement).setView([story.lat, story.lon], 13);
                  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '&copy; OpenStreetMap contributors'
                  }).addTo(map);
                  L.marker([story.lat, story.lon])
                    .addTo(map)
                    .bindPopup(`<b>${story.name}</b><br>${story.description.substring(0, 50)}...`)
                    .openPopup();
                } catch (error) {}
              }
            }, 50);
          }
        },
        showError: view.showError
      }, router);
      return view.getView();
    }
  },
  {
    path: '/add-story',
    view: async () => {
      const view = AddStoryView();
      const domNode = view.getView();
      try {
        const mapPresenter = new MapPresenter({
          bindInitMap: async (handler) => {
            const result = await initMapWithRetry(handler, 'map', -6.2088, 106.8456, 12);
            if (result?.map) {
              result.map.on('click', (e) => {
                const { lat, lng } = e.latlng;
                domNode.querySelector('#lat').value = lat;
                domNode.querySelector('#lng').value = lng;
                result.addMarker(lat, lng, 'Story location');
              });
            }
            return result?.map;
          },
          bindGetCurrentLocation: (handler) => {
            domNode.querySelector('#get-location')?.addEventListener('click', async () => {
              try {
                const location = await handler();
                domNode.querySelector('#lat').value = location.lat;
                domNode.querySelector('#lng').value = location.lng;
                mapPresenter.addMarker(location.lat, location.lng, 'Current location');
                mapPresenter.map?.setView([location.lat, location.lng], 15);
              } catch (error) {
                view.showError(error.message);
              }
            });
          }
        });

        new StoryPresenter(
          storyModel,
          {
            bindAddStory: view.bindAddStory,
            showError: view.showError,
            showSuccess: view.showSuccess
          },
          router
        );
      } catch (error) {
        view.showError('Failed to initialize form');
      }
      return domNode;
    }
  },
  {
    path: '/logout',
    view: async () => {
      authModel.logout();
      updateAuthUI(false);
      router.navigateTo('/login');
      return {
        getView: () => document.createElement('div')
      }.getView();
    }
  },
  {
    path: '*',
    view: () => ErrorView().getView()
  }
];

const router = new Router(routes);

updateAuthUI(authModel.isAuthenticated());

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(async (registration) => {
        if (authModel.isAuthenticated()) {
          try {
            const permission = await requestNotificationPermission();
            if (permission) await subscribeUser(authModel.getToken());
          } catch (error) {}
        }
      })
      .catch(error => {});
  });

  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'TRIGGER_SYNC') {
      if (window.storyPresenter && typeof window.storyPresenter.handleOnline === 'function') {
        window.storyPresenter.handleOnline();
      }
    }
  });
}
