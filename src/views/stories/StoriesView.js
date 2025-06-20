export const StoriesView = () => {
  const view = document.createElement("main");
  view.id = "main-content";
  view.setAttribute("role", "main");
  view.setAttribute("aria-label", "Stories list");


  view.innerHTML = `
    <div class="stories-header">
      <h1 id="stories-heading">Stories</h1>
      <div class="stories-controls">
        <button class="bookmark-filter-btn" aria-label="Show bookmarked stories" aria-pressed="false">
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/>
          </svg>
          <span>Bookmarks</span>
        </button>
      </div>
    </div>
    <div class="stories-grid" id="stories-container" role="list" aria-labelledby="stories-heading"></div>
    <div id="error-message" class="error-message" style="display: none;"></div>
    <div id="loading-indicator" style="display: none;">
      <div class="spinner"></div>
      <span>Loading stories...</span>
    </div>
    <div id="empty-state" class="empty-state" style="display: none;">
      <svg class="empty-icon" viewBox="0 0 24 24">
        <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2zm0 15l-5-2.18L7 18V5h10v13z"/>
      </svg>
      <p class="empty-message">No stories found</p>
    </div>
  `;

  const displayStories = (stories) => {
    const container = view.querySelector("#stories-container");
    const loading = view.querySelector("#loading-indicator");
    const emptyState = view.querySelector("#empty-state");

    loading.style.display = "none";
    container.innerHTML = "";

    if (!stories || stories.length === 0) {
      emptyState.style.display = "flex";
      container.style.display = "none";
      return;
    }

    emptyState.style.display = "none";
    container.style.display = "grid";

    stories.forEach((story) => {
      const safeStory = {
        id: story.id || `missing-id-${Math.random().toString(36).substr(2, 9)}`,
        name: story.name || "Unknown Author",
        description: story.description || "",
        photoUrl: story.photoUrl || "/assets/images/placeholder-offline.jpg",
        createdAt: story.createdAt || new Date().toISOString(),
        lat: story.lat,
        lon: story.lon
      };

      const storyElement = document.createElement("article");
      storyElement.className = "story-card";
      storyElement.setAttribute("data-story-id", safeStory.id);
      storyElement.setAttribute("tabindex", "0");

      const formattedDate = new Date(safeStory.createdAt).toLocaleDateString("id-ID", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });

      const maxLength = 100;
      let shortDescription = safeStory.description;
      if (shortDescription.length > maxLength) {
        shortDescription = shortDescription.substring(0, maxLength).replace(/\s+\S*$/, '') + '...';
      }

      storyElement.innerHTML = `
        <div class="story-image-container">
          <img src="${safeStory.photoUrl}" 
               alt="Story image by ${safeStory.name}" 
               class="story-image"
               loading="lazy">
          <button class="bookmark-button" aria-label="Bookmark this story">
            <svg class="bookmark-icon" viewBox="0 0 24 24" width="24" height="24">
              <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/>
            </svg>
          </button>
        </div>
        <div class="story-content">
          <h3 class="story-title">${safeStory.name}</h3>
          <p class="story-description">${shortDescription}</p>
          <time datetime="${new Date(safeStory.createdAt).toISOString()}" 
                class="story-date">
            ${formattedDate}
          </time>
          <a href="#/stories/${safeStory.id}" 
             class="read-more" 
             aria-label="Read more about ${safeStory.name}"
             tabindex="0">
            Read more
          </a>
        </div>
      `;

      storyElement.addEventListener("click", (e) => {
        if (!e.target.closest(".bookmark-button")) {
          window.location.hash = `#/stories/${safeStory.id}`;
        }
      });

      storyElement.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && e.target === storyElement) {
          window.location.hash = `#/stories/${safeStory.id}`;
        }
      });

      container.appendChild(storyElement);
    });
  };

  const showError = (message) => {
    const errorEl = view.querySelector("#error-message");
    errorEl.textContent = message;
    errorEl.style.display = "block";
    view.querySelector("#loading-indicator").style.display = "none";
    view.querySelector("#empty-state").style.display = "none";
  };

  const showLoading = () => {
    view.querySelector("#loading-indicator").style.display = "flex";
    view.querySelector("#error-message").style.display = "none";
    view.querySelector("#empty-state").style.display = "none";
  };

  const showOfflineWarning = () => {
    const container = view.querySelector("#stories-container");
    const existingWarning = view.querySelector(".offline-warning");

    if (!existingWarning) {
      const warning = document.createElement("div");
      warning.className = "offline-warning";
      warning.innerHTML = `
        <i class="fas fa-wifi-slash"></i>
        <span>Showing offline data. Some stories may not be up-to-date.</span>
      `;
      container.prepend(warning);
    }
  };

  const updateBookmarkFilterState = (isActive) => {
    const filterBtn = view.querySelector(".bookmark-filter-btn");
    if (filterBtn) {
      filterBtn.classList.toggle("active", isActive);
      filterBtn.setAttribute("aria-pressed", isActive);
      const textSpan = filterBtn.querySelector("span");
      if (textSpan) {
        textSpan.textContent = isActive ? "All Stories" : "Bookmarks";
      }
    }
  };

  const bindToggleBookmarkFilter = (handler) => {
    const btn = view.querySelector(".bookmark-filter-btn");
    btn?.addEventListener("click", handler);
  };

  const bindBookmarkAction = (handler) => {
    view.addEventListener("click", (e) => {
      const bookmarkBtn = e.target.closest(".bookmark-button");
      if (bookmarkBtn) {
        const storyCard = bookmarkBtn.closest(".story-card");
        const storyId = storyCard?.dataset.storyId;
        if (storyId) {
          e.preventDefault();
          e.stopPropagation();
          handler(storyId);
        }
      }
    });
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
    showLoading,
    showOfflineWarning,
    bindLoadStories,
    updateBookmarkFilterState,
    bindToggleBookmarkFilter,
    bindBookmarkAction
  };
};
