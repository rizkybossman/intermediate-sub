import { startViewTransition } from '../../utils/view-transition.js';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import 'leaflet.markercluster/dist/leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

// Fix for default marker icons in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png'
});

export const DetailStoryView = () => {
  const view = document.createElement('main');
  view.id = 'main-content';
  
  view.innerHTML = `
    <div class="detail-story">
      <div class="story-image-container">
        <img id="story-image" class="detail-story-image" alt="Story image">
        <div class="story-meta">
          <div class="author-info">
            <i class="fas fa-user-circle"></i>
            <span id="story-author"></span>
          </div>
          <div class="date-info">
            <i class="far fa-calendar-alt"></i>
            <span id="story-date"></span>
          </div>
        </div>
      </div>
      
      <div class="story-content">
        <h1 id="story-title" class="story-title"></h1>
        <p id="story-description" class="story-description"></p>
        
        <div class="location-section">
          <h3><i class="fas fa-map-marker-alt"></i> Lokasi</h3>
          <div id="story-map-container" class="detail-map-container">
            <div id="story-map" class="detail-map"></div>
            <div class="map-controls">
              <button id="satellite-view" class="map-control-btn">
                <i class="fas fa-satellite"></i>
              </button>
              <button id="street-view" class="map-control-btn">
                <i class="fas fa-road"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div id="error-message" class="error-message">
      <i class="fas fa-exclamation-circle"></i>
      <span class="error-text"></span>
    </div>
  `;

  let mapInstance = null;
  let markerCluster = null;
  let baseLayers = {};
  let currentLayer = null;

  const prepareMapContainer = () => {
    const container = view.querySelector('#story-map-container');
    const mapDiv = view.querySelector('#story-map');
    
    // Completely recreate the map container
    if (mapDiv) {
      const newMapDiv = document.createElement('div');
      newMapDiv.id = 'story-map';
      newMapDiv.className = 'detail-map';
      container.replaceChild(newMapDiv, mapDiv);
    }
    
    // Clean up existing map instances
    if (mapInstance) {
      mapInstance.remove();
      mapInstance = null;
    }
    
    if (markerCluster) {
      markerCluster.clearLayers();
      markerCluster = null;
    }
  };

  const initMap = (lat, lng) => {
    try {
      // Check if map container exists and isn't already initialized
      const mapElement = view.querySelector('#story-map');
      if (!mapElement || mapElement._leaflet_id) {
        return null;
      }

      // Create new map instance
      mapInstance = L.map(mapElement, {
        zoomControl: false,
        preferCanvas: true
      }).setView([lat, lng], 13);

      // Add zoom control
      L.control.zoom({
        position: 'bottomright'
      }).addTo(mapInstance);

      // Define base layers
      baseLayers = {
        "Street View": L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19
        }),
        "Satellite View": L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
          attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
          maxZoom: 19
        })
      };

      // Add default layer
      baseLayers["Street View"].addTo(mapInstance);
      currentLayer = "Street View";

      // Add layer control
      L.control.layers(baseLayers, null, {
        position: 'topright',
        collapsed: false
      }).addTo(mapInstance);

      // Initialize marker cluster
      markerCluster = L.markerClusterGroup({
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        maxClusterRadius: 40
      });

      // Add custom control button events
      document.getElementById('satellite-view')?.addEventListener('click', () => {
        switchLayer("Satellite View");
      });

      document.getElementById('street-view')?.addEventListener('click', () => {
        switchLayer("Street View");
      });

      return mapInstance;
    } catch (error) {
      console.error('Map initialization error:', error);
      return null;
    }
  };

  const switchLayer = (layerName) => {
    if (mapInstance && currentLayer !== layerName) {
      mapInstance.removeLayer(baseLayers[currentLayer]);
      baseLayers[layerName].addTo(mapInstance);
      currentLayer = layerName;
      
      // Update active button state
      document.querySelectorAll('.map-control-btn').forEach(btn => {
        btn.classList.remove('active');
      });
      const activeBtn = document.getElementById(`${layerName.toLowerCase().replace(' ', '-')}-view`);
      if (activeBtn) activeBtn.classList.add('active');
    }
  };

  const displayStoryDetail = async (story) => {
    await startViewTransition(async () => {
      // Prepare the view first
      const imageElement = view.querySelector('#story-image');
      imageElement.src = story.photoUrl;
      imageElement.alt = `Story by ${story.name}`;
      view.querySelector('#story-title').textContent = story.name;
      view.querySelector('#story-author').textContent = story.name;
      view.querySelector('#story-description').textContent = story.description;
      view.querySelector('#story-date').textContent = new Date(story.createdAt).toLocaleString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      // Handle map display
      const mapContainer = view.querySelector('#story-map-container');
      if (story.lat && story.lon) {
        mapContainer.style.display = 'block';
        
        // Prepare the map container
        prepareMapContainer();
        
        // Wait for DOM to be ready
        await new Promise(resolve => requestAnimationFrame(resolve));
        
        // Initialize map
        const map = initMap(story.lat, story.lon);
        
        if (map) {
          // Add marker to the cluster
          const marker = L.marker([story.lat, story.lon])
            .bindPopup(`
              <div class="map-popup">
                <h4>${story.name}</h4>
                <p>${story.description.substring(0, 100)}...</p>
                <small>${new Date(story.createdAt).toLocaleDateString()}</small>
              </div>
            `);
          
          markerCluster.addLayer(marker);
          map.addLayer(markerCluster);
          marker.openPopup();
        }
      } else {
        mapContainer.style.display = 'none';
      }
    });
  };

  const showError = (message) => {
    const errorElement = view.querySelector('#error-message');
    const errorText = errorElement.querySelector('.error-text');
    errorText.textContent = message;
    errorElement.style.display = 'flex';
    
    // Animation for error message
    errorElement.animate([
      { opacity: 0, transform: 'translateY(-10px)' },
      { opacity: 1, transform: 'translateY(0)' }
    ], {
      duration: 300,
      easing: 'ease-out'
    });
  };

  const cleanup = () => {
    if (mapInstance) {
      mapInstance.remove();
      mapInstance = null;
    }
    if (markerCluster) {
      markerCluster.clearLayers();
      markerCluster = null;
    }
  };

  return {
    getView: () => view,
    displayStoryDetail,
    showError,
    cleanup,
    prepareMapContainer
  };
};