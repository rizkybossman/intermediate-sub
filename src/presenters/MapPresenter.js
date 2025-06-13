export class MapPresenter {
  constructor(mapView) {
    this.view = mapView;
    this.currentPosition = null;
  }

  async initializeMap(containerId, options = {}) {
    try {
      const { lat = 0, lng = 0, zoom = 10 } = options;
      await this.view.initMap(containerId, lat, lng, zoom);
      return true;
    } catch (error) {
      console.error('Map initialization failed:', error);
      return false;
    }
  }

  async getCurrentLocation(options = {}) {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported by your browser"));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.currentPosition = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy
          };
          resolve(this.currentPosition);
        },
        (error) => {
          reject(error);
        },
        options
      );
    });
  }

  async centerToCurrentLocation(zoom = 15) {
    try {
      if (!this.currentPosition) {
        await this.getCurrentLocation();
      }
      this.view.setView(this.currentPosition.lat, this.currentPosition.lng, zoom);
      return this.currentPosition;
    } catch (error) {
      console.error('Failed to center to current location:', error);
      throw error;
    }
  }

  addMarker(lat, lng, popupContent = "", options = {}) {
    return this.view.addMarker(lat, lng, popupContent, options);
  }

  addCurrentLocationMarker(popupContent = "") {
    if (!this.currentPosition) {
      throw new Error('Current location not available');
    }
    return this.addMarker(
      this.currentPosition.lat,
      this.currentPosition.lng,
      popupContent,
      { title: 'Your Location' }
    );
  }

  clearMarkers() {
    this.view.clearMarkers();
  }

  setOnMapClickHandler(handler) {
    this.view.onMapClick((e) => {
      handler(e.latlng.lat, e.latlng.lng);
    });
  }

  cleanup() {
    this.view.remove();
  }

  handleLocationSelection(lat, lng) {
  this.clearMarkers(); // Clear existing markers
  this.addMarker(lat, lng, "Selected Location", {
    draggable: true,
    color: 'red'
  });
  this.view.setView(lat, lng, 15);
}
}