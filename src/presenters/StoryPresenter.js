import { showNotification, showNotificationPrompt } from "../utils/notification.js";

export class StoryPresenter {
  constructor(storyModel, storyView, router) {
    this.storyModel = storyModel;
    this.storyView = storyView;
    this.router = router;
    this.currentStoryId = null;
    this.isLoading = false;
    this.showBookmarksOnly = false;


    this.isSyncing = false;
    this.syncQueue = new Set();



    this.initializeEventBindings();
    this.initializeSyncHandlers();
    this.loadOfflineStoriesIntoQueue?.();
  }

  initializeEventBindings() {
    if (this.storyView.bindLoadStories) {
      this.storyView.bindLoadStories(this.handleLoadStories.bind(this));
    }

    if (this.storyView.bindAddStory) {
      this.storyView.bindAddStory(this.handleAddStory.bind(this));
    }

    if (this.storyView.bindLoadStoryDetail) {
      this.storyView.bindLoadStoryDetail(this.handleLoadStoryDetail.bind(this));
    }

    if (this.storyView.bindToggleBookmarkFilter) {
      this.storyView.bindToggleBookmarkFilter(this.toggleBookmarkFilter.bind(this));
    }

    if (this.storyView.bindBookmarkAction) {
      this.storyView.bindBookmarkAction(this.handleBookmarkAction.bind(this));
    }
  }

  initializeSyncHandlers() {
    window.addEventListener("online", () => this.handleOnline());
    window.addEventListener("focus", () => {
      if (navigator.onLine) {
        this.handleOnline();
      }
    });
  }

  loadOfflineStoriesIntoQueue() {

    console.log("Offline sync queue loaded (stub)");
  }

  async toggleBookmarkFilter() {
    this.showBookmarksOnly = !this.showBookmarksOnly;

    try {
      const result = this.showBookmarksOnly
        ? await this.storyModel.getBookmarkedStories()
        : await this.storyModel.getAllStories();

      if (result.success) {
        this.storyView.displayStories(result.stories);

        if (typeof this.storyView.updateBookmarkFilterState === "function") {
          this.storyView.updateBookmarkFilterState(this.showBookmarksOnly);
        }

        showNotification(
          this.showBookmarksOnly
            ? "Showing bookmarked stories"
            : "Showing all stories",
          { type: "info", autoClose: 2000 }
        );
      } else {
        showNotification(result.message || "Failed to load stories", {
          type: "error",
        });
      }
    } catch (error) {
      console.error("Bookmark filter error:", error);
      showNotification("Failed to toggle bookmark filter", { type: "error" });
    }
  }

  async handleBookmarkAction(storyId) {
    try {
      const { success, message } = await this.storyModel.toggleBookmark(storyId);

      if (success) {
        if (this.showBookmarksOnly) {
          const { success, stories } = await this.storyModel.getBookmarkedStories();
          if (success) {
            this.storyView.displayStories(stories);
          }
        }

        showNotification(message, { type: "success", autoClose: 2000 });
      } else {
        showNotification(message || "Failed to update bookmark", { type: "error" });
      }
    } catch (error) {
      console.error("Bookmark action error:", error);
      showNotification("Failed to update bookmark", { type: "error" });
    }
  }

  async handleLoadStories(page = 1, size = 10) {
    try {
      const result = this.showBookmarksOnly
        ? await this.storyModel.getBookmarkedStories()
        : await this.storyModel.getAllStories(page, size);

      if (result.isOffline) {
        this.storyView.showOfflineWarning?.();
      }

      if (result.success) {
        this.storyView.displayStories(result.stories || []);
      } else {
        this.storyView.showError?.(result.message || "Failed to load stories");
      }
    } catch (error) {
      console.error("Load stories error:", error);
      this.storyView.showError?.("Failed to load stories. Please try again.");
    }
  }

  async handleLoadStoryDetail(id) {
    try {
      if (this.isLoading || this.currentStoryId === id) return;

      this.isLoading = true;
      this.currentStoryId = id;

      this.storyView.prepareMapContainer?.();
      const result = await this.storyModel.getStoryDetail(id);

      if (result.success) {
        await new Promise((resolve) => requestAnimationFrame(resolve));
        this.storyView.displayStoryDetail?.(result.story);
      } else {
        this.storyView.showError?.(result.message || "Story not found");
        this.router.navigateTo("/stories");
      }
    } catch (error) {
      console.error("Load story detail error:", error);
      this.storyView.showError?.("Failed to load story details");
      this.router.navigateTo("/stories");
    } finally {
      this.isLoading = false;
    }
  }

  async handleAddStory(data) {
    try {
      const result = await this.storyModel.addStory(data);

      if (result.success) {
        this.storyView.showSuccess?.("Story added successfully!");

        await showNotificationPrompt((granted) => {
          if (granted) {

          }
        });

        this.cleanup();
        setTimeout(() => {
          this.handleLoadStories();
          this.router.navigateTo("/stories");
        }, 1500);
      } else if (!result.success && !navigator.onLine) {
        await this.handleOfflineAdd(data);
      } else {
        this.storyView.showError?.(result.message || "Failed to add story");
      }
    } catch (error) {
      this.handleAddError(error);
    }
  }

  async handleOfflineAdd(data) {
    try {
      const offlineResult = await this.storyModel.addStoryOffline(data);
      this.syncQueue.add(offlineResult.story.id);

      await showNotificationPrompt((granted) => {
        if (granted) {

        }
      });

      this.storyView.showSuccess?.("Story saved offline. Will sync when online!");

      setTimeout(() => {
        this.handleLoadStories();
        this.router.navigateTo("/stories");
      }, 1500);
    } catch (offlineError) {
      console.error("Offline save failed:", offlineError);
      this.storyView.showError?.("Failed to save story offline.");
    }
  }

  handleAddError(error) {
    console.error("Add story error:", error);
    if (!navigator.onLine) {
      this.storyView.showError?.("You're offline. Please connect to submit stories.");
    } else {
      this.storyView.showError?.("Failed to add story. Please try again.");
    }
  }

  async handleOnline() {
    if (this.isSyncing || this.syncQueue.size === 0) return;

    this.isSyncing = true;

    try {
      const syncResult = await this.storyModel.syncOfflineStories(this.syncQueue);

      if (syncResult.success && syncResult.syncedIds.length > 0) {
        syncResult.syncedIds.forEach((id) => {
          this.syncQueue.delete(id);
        });

        this.storyView.showSuccess?.(`Synced ${syncResult.syncedIds.length} stories!`);
        this.handleLoadStories();
      }
    } catch (error) {
      console.error("Sync failed:", error);
    } finally {
      this.isSyncing = false;

      if (this.syncQueue.size > 0) {
        setTimeout(() => this.handleOnline(), 5000);
      }
    }
  }

  cleanup() {
    this.storyView.cleanup?.();
    this.currentStoryId = null;
    this.isLoading = false;
    this.showBookmarksOnly = false;
  }
}
