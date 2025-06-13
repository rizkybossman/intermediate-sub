import { showNotificationPrompt } from "../../utils/notification.js";

export const AddStoryView = () => {
  const view = document.createElement("main");
  view.id = "main-content";
  view.setAttribute("role", "main");
  view.setAttribute("aria-label", "Add new story form");

  view.innerHTML = `

    <div class="add-story-form">
    <h2>Add New Story</h2> 
    <div class="notification-permission-info" style="display: none;">
      <p>We'd like to show notifications when you add stories. This helps you keep track of your contributions.</p>
      <button type="button" id="enable-notifications" class="btn">Enable Notifications</button>
    </div>
      <form id="story-form">
        <div class="form-group">
          <label for="description">Description</label>
          <textarea id="description" name="description" rows="4" required></textarea>
        </div>
        
        <div class="form-group camera-container">
          <label>Photo</label>
          <div class="preview-container">
            <video id="camera-preview" class="media-preview" autoplay playsinline></video>
            <img id="photo-preview" class="media-preview" style="display:none; object-fit:contain;" alt="Captured photo">
          </div>
          <div class="camera-controls">
            <button type="button" id="start-camera" class="btn camera-btn">Start Camera</button>
            <select id="camera-select" class="camera-select" style="display:none;"></select>
            <button type="button" id="capture-btn" class="btn capture-btn" style="display:none;">Capture Photo</button>
            <button type="button" id="stop-camera" class="btn stop-btn" style="display:none;">Stop Camera</button>
            <button type="button" id="retake-btn" class="btn retake-btn" style="display:none;">Retake Photo</button>
          </div>
          <canvas id="canvas" style="display:none;"></canvas>
        </div>
        
        <div class="form-group">
          <label>Location</label>
          <div id="map" class="map-container"></div>
          <button type="button" id="get-location" class="btn location-btn">Use Current Location</button>
          <input type="hidden" id="lat" name="lat">
          <input type="hidden" id="lng" name="lng">
          <p id="location-status" class="location-status">No location selected</p>
        </div>
        
        <button type="submit" class="btn submit-btn">Submit Story</button>
      </form>
      <div id="error-message" class="error-message"></div>
      <div id="success-message" class="success-message"></div>
    </div>
  `;

  // State
  let stream = null;
  let photoFile = null;
  let map = null;
  let availableCameras = [];
  let mapMarker = null;
  let isViewActive = true;

  // DOM Elements
  const cameraPreview = view.querySelector("#camera-preview");
  const photoPreview = view.querySelector("#photo-preview");
  const startCameraBtn = view.querySelector("#start-camera");
  const cameraSelect = view.querySelector("#camera-select");
  const captureBtn = view.querySelector("#capture-btn");
  const stopCameraBtn = view.querySelector("#stop-camera");
  const retakeBtn = view.querySelector("#retake-btn");
  const canvas = view.querySelector("#canvas");
  const mapContainer = view.querySelector("#map");
  const locationStatus = view.querySelector("#location-status");

  const checkNotificationPermission = () => {
    const notificationInfo = view.querySelector(
      ".notification-permission-info"
    );
    const enableNotificationsBtn = view.querySelector("#enable-notifications");

    if (Notification.permission === "default") {
      notificationInfo.style.display = "block";

      enableNotificationsBtn.addEventListener("click", async () => {
        try {
          const granted = await showNotificationPrompt();
          notificationInfo.style.display = granted ? "none" : "block";

          if (granted) {
            // Optional: Show a confirmation message
            showSuccess("Notifications enabled!");
          }
        } catch (error) {
          console.error("Error requesting notification permission:", error);
          showError("Failed to enable notifications");
        }
      });
    } else {
      notificationInfo.style.display = "none";
    }
  };

  const initializeMap = () => {
    if (!map && mapContainer) {
      map = L.map(mapContainer).setView([-6.2, 106.8], 13);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);

      map.on("click", (e) => {
        const { lat, lng } = e.latlng;
        updateLocation(lat, lng);
        addMapMarker(lat, lng);
        showSuccess("Location selected on map!");
      });
    }
  };

  // Add marker to map
  const addMapMarker = (lat, lng) => {
    if (mapMarker) {
      map.removeLayer(mapMarker);
    }

    mapMarker = L.marker([lat, lng], {
      draggable: true,
      title: "Story Location",
    })
      .addTo(map)
      .bindPopup("Story location")
      .openPopup();

    mapMarker.on("dragend", (e) => {
      const newPos = e.target.getLatLng();
      updateLocation(newPos.lat, newPos.lng);
    });
  };

  // Update location inputs and status
  const updateLocation = (lat, lng) => {
    view.querySelector("#lat").value = lat;
    view.querySelector("#lng").value = lng;
    locationStatus.textContent = `Location set: ${lat.toFixed(
      4
    )}, ${lng.toFixed(4)}`;
    locationStatus.style.color = "#4CAF50";
  };

  // Message handlers
  const showError = (message) => {
    const errorElement = view.querySelector("#error-message");
    errorElement.textContent = message;
    errorElement.style.display = "block";
    setTimeout(() => (errorElement.style.display = "none"), 5000);
  };

  const showSuccess = (message) => {
    const successElement = view.querySelector("#success-message");
    successElement.textContent = message;
    successElement.style.display = "block";
    setTimeout(() => (successElement.style.display = "none"), 5000);
  };

  // Camera functions
  const getCameraDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter((device) => device.kind === "videoinput");
    } catch (error) {
      showError(`Camera access error: ${error.message}`);
      return [];
    }
  };

  const stopCamera = () => {
    stopCameraBtn.style.display = "none";
    startCameraBtn.style.display = "inline-block";

    if (stream) {
      stream.getTracks().forEach((track) => {
        track.stop();
        track.enabled = false;
      });
      stream = null;
    }

    cameraPreview.style.display = "none";
    cameraPreview.srcObject = null;
    captureBtn.style.display = "none";
    cameraSelect.style.display = "none";
  };

  const startCamera = async (deviceId = null) => {
    if (!isViewActive) return;

    try {
      stopCamera();

      const constraints = {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          ...(deviceId && { deviceId: { exact: deviceId } }),
        },
      };

      stream = await navigator.mediaDevices.getUserMedia(constraints);

      if (availableCameras.length === 0) {
        availableCameras = await getCameraDevices();
        updateCameraSelect();
      }

      cameraPreview.srcObject = stream;
      cameraPreview.style.display = "block";
      photoPreview.style.display = "none";
      captureBtn.style.display = "inline-block";
      stopCameraBtn.style.display = "inline-block";
      startCameraBtn.style.display = "none";
      retakeBtn.style.display = "none";

      if (availableCameras.length > 1) {
        cameraSelect.style.display = "inline-block";
      }
    } catch (error) {
      showError(`Camera error: ${error.message}`);
      if (deviceId) {
        startCamera();
      }
    }
  };

  const updateCameraSelect = () => {
    cameraSelect.innerHTML = "";
    availableCameras.forEach((camera) => {
      const option = document.createElement("option");
      option.value = camera.deviceId;
      option.text = camera.label || `Camera ${cameraSelect.length + 1}`;
      cameraSelect.appendChild(option);
    });

    cameraSelect.addEventListener("change", () => {
      startCamera(cameraSelect.value);
    });
  };

  const capturePhoto = () => {
    try {
      const video = cameraPreview;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      photoPreview.src = canvas.toDataURL("image/jpeg");
      photoPreview.style.display = "block";
      cameraPreview.style.display = "none";

      canvas.toBlob(
        (blob) => {
          photoFile = new File([blob], "story-photo.jpg", {
            type: "image/jpeg",
            lastModified: Date.now(),
          });
        },
        "image/jpeg",
        0.85
      );

      captureBtn.style.display = "none";
      stopCameraBtn.style.display = "none";
      cameraSelect.style.display = "none";
      retakeBtn.style.display = "inline-block";
      stopCamera();
    } catch (error) {
      showError(`Capture failed: ${error.message}`);
    }
  };

  const retakePhoto = () => {
    photoPreview.style.display = "none";
    photoPreview.src = "";
    photoFile = null;
    startCamera(cameraSelect.value || null);
  };

  // Clean up when view is destroyed
  const cleanup = () => {
    isViewActive = false;
    stopCamera();

    if (map) {
      map.remove();
      map = null;
      mapMarker = null;
    }

    // Remove all event listeners
    const safeRemoveListener = (element, event, handler) => {
      if (element && handler) {
        element.removeEventListener(event, handler);
      }
    };

    safeRemoveListener(startCameraBtn, "click", startCamera);
    safeRemoveListener(stopCameraBtn, "click", stopCamera);
    safeRemoveListener(captureBtn, "click", capturePhoto);
    safeRemoveListener(retakeBtn, "click", retakePhoto);
    safeRemoveListener(cameraSelect, "change", startCamera);
  };

  // Initialize map when view is created
  setTimeout(initializeMap, 100);

  // Bind event handlers
  const bindAddStory = (handler) => {
    const form = view.querySelector("#story-form");
    const getLocationBtn = view.querySelector("#get-location");

    const formSubmitHandler = async (e) => {
      e.preventDefault();

      if (!photoFile) {
        showError("Please take a photo first");
        return;
      }

      const description = form.description.value.trim();
      if (!description) {
        showError("Please enter a description");
        return;
      }

      if (!form.lat.value || !form.lng.value) {
        showError("Please select a location");
        return;
      }

      const data = {
        description,
        photo: photoFile,
        lat: parseFloat(form.lat.value),
        lon: parseFloat(form.lng.value),
      };

      try {
        await handler(data);
      } catch (error) {
        showError(`Submission failed: ${error.message}`);
      }
    };

    const getLocationHandler = () => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;

          updateLocation(lat, lng);
          addMapMarker(lat, lng);

          if (map) {
            map.setView([lat, lng], 15);
          }
          showSuccess("Current location obtained!");
        },
        (error) => {
          showError(`Location error: ${error.message}`);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    };

    startCameraBtn.addEventListener("click", startCamera);
    stopCameraBtn.addEventListener("click", stopCamera);
    captureBtn.addEventListener("click", capturePhoto);
    retakeBtn.addEventListener("click", retakePhoto);
    getLocationBtn.addEventListener("click", getLocationHandler);
    form.addEventListener("submit", formSubmitHandler);

    // Add header navigation listener
    window.addEventListener("header-navigation", stopCamera);
  };

  checkNotificationPermission();

  return {
    getView: () => view,
    bindAddStory,
    showError,
    showSuccess,
    getMapContainer: () => mapContainer,
    cleanup,
  };
};
