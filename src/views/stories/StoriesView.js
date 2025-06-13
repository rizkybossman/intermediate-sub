export const StoriesView = () => {
  const view = document.createElement("main");
  view.id = "main-content";
  view.setAttribute("role", "main");
  view.setAttribute("aria-label", "Stories list");

  view.innerHTML = `
    <h1 id="stories-heading">Stories</h1>
    <div class="stories-grid" id="stories-container" role="list" aria-labelledby="stories-heading"></div>
    <div id="error-message" class="error-message" style="display: none;"></div>
    <div id="loading-indicator" style="display: none;">Loading stories...</div>
  `;

const displayStories = (stories) => {
  const container = view.querySelector("#stories-container");
  const loading = view.querySelector("#loading-indicator");

  loading.style.display = "none";
  container.innerHTML = "";

  if (!stories || stories.length === 0) {
    container.innerHTML = '<p class="no-stories">No stories found</p>';
    return;
  }

  // Tambahkan fallback photoUrl jika kosong
  stories.forEach((story) => {
    story.photoUrl = story.photoUrl || '/assets/images/placeholder-offline.jpg';

    const storyElement = document.createElement("article");
    storyElement.className = "story-card";

    storyElement.innerHTML = `
      <img src="${story.photoUrl}" alt="${story.name}'s story" class="story-image">
      <div class="story-content">
        <h3>${story.name}</h3>
        <p>${story.description.substring(0, 100)}${story.description.length > 100 ? "..." : ""}</p>
        <p class="story-date">${new Date(story.createdAt).toLocaleDateString()}</p>
        <a href="#/stories/${story.id}" class="read-more">Read more</a>
      </div>
    `;

    // Make entire card clickable
    storyElement.addEventListener("click", () => {
      window.location.hash = `#/stories/${story.id}`;
    });

    // Keyboard navigation
    storyElement.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        window.location.hash = `#/stories/${story.id}`;
      }
    });

    container.appendChild(storyElement);
  });

  // Focus management for the entire container
  container.addEventListener("focusout", (e) => {
    if (!e.relatedTarget || !container.contains(e.relatedTarget)) {
      document.querySelectorAll(".story-card").forEach((card) => {
        card.classList.remove("card-focused");
        card.querySelector(".read-more").tabIndex = -1;
      });
    }
  });
};


  const showError = (message) => {
    const errorEl = view.querySelector("#error-message");
    errorEl.textContent = message;
    errorEl.style.display = "block";
    view.querySelector("#loading-indicator").style.display = "none";
  };

  const showLoading = () => {
    view.querySelector("#loading-indicator").style.display = "block";
    view.querySelector("#error-message").style.display = "none";
  };

  const showOfflineWarning = () => {
  const container = view.querySelector('#stories-container');
  const warning = document.createElement('div');
  warning.className = 'offline-warning';
  warning.innerHTML = `
    <i class="fas fa-wifi-slash"></i>
    <span>Showing offline data. Some stories may not be up-to-date.</span>
  `;
  container.prepend(warning);
};

  const bindLoadStories = (handler) => {
    showLoading();
    handler().catch((error) => {
      showError(error.message || "Failed to load stories");
    });
  };

  return {
    getView: () => view,
    displayStories,
    showError,
    bindLoadStories,
    showLoading,
    showOfflineWarning,
  };
};
