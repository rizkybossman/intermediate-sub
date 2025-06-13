import L from 'leaflet';

export class MapView {
  constructor() {
    this.map = null;
    this.markers = [];
    this.currentMarker = null;
  }

  initMap(containerId, lat, lng, zoom = 10) {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Map container #${containerId} not found`);
    }

    if (container.offsetParent === null) {
      throw new Error('Map container is not visible');
    }

    this.map = L.map(container).setView([lat, lng], zoom);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);

    return this.map;
  }

  addMarker(lat, lng, popupContent = "", options = {}) {
    const marker = L.marker([lat, lng], options).addTo(this.map);
    
    if (popupContent) {
      marker.bindPopup(popupContent);
    }
    
    this.markers.push(marker);
    this.currentMarker = marker;
    return marker;
  }

  clearMarkers() {
    this.markers.forEach(marker => this.map.removeLayer(marker));
    this.markers = [];
    this.currentMarker = null;
  }

  setView(lat, lng, zoom) {
    this.map.setView([lat, lng], zoom);
  }

  openPopup(content) {
    if (this.currentMarker) {
      this.currentMarker.setPopupContent(content).openPopup();
    }
  }

  onMapClick(handler) {
    this.map.on('click', handler);
  }

  remove() {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }
}