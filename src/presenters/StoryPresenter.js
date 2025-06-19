import { showNotificationPrompt } from "../utils/notification.js";

export class StoryPresenter {
  constructor(storyModel, storyView, router) {
    this.storyModel = storyModel;
    this.storyView = storyView;
    this.router = router;
    this.currentStoryId = null;
    this.isLoading = false;
    this.mapInitialized = false;

    // Sync management
    this.isSyncing = false;
    this.pendingSyncIds = new Set();
    this.syncQueue = new Set();

    this.initializeEventBindings();
    this.initializeSyncHandlers();
    this.startSyncMonitor();
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
  }

  initializeSyncHandlers() {
    // Load existing offline stories into queue
    this.loadOfflineStoriesIntoQueue();

    // Set up event listeners
    window.addEventListener('online', this.handleConnectionChange.bind(this));
    window.addEventListener('focus', this.handleFocus.bind(this));
  }

  async loadOfflineStoriesIntoQueue() {
    try {
      const offlineStories = await this.storyModel.getOfflineStories();
      offlineStories.forEach(story => this.syncQueue.add(story.id));
      console.log('Initial sync queue:', Array.from(this.syncQueue));
      
      // Trigger sync if we're already online
      if (navigator.onLine) {
        this.handleOnline();
      }
    } catch (error) {
      console.error('Failed to load offline stories:', error);
    }
  }

  handleConnectionChange() {
    if (navigator.onLine) {
      console.log('Connection restored - triggering sync');
      setTimeout(() => this.handleOnline(), 1000);
    }
  }

  handleFocus() {
    if (navigator.onLine && this.syncQueue.size > 0) {
      console.log('Window focused - checking sync');
      this.handleOnline();
    }
  }

  startSyncMonitor() {
    setInterval(() => {
      console.log('Sync Monitor:', {
        isSyncing: this.isSyncing,
        queueSize: this.syncQueue.size,
        queueContents: Array.from(this.syncQueue),
        pendingSyncs: Array.from(this.pendingSyncIds)
      });
    }, 10000);
  }

  async handleLoadStories(page = 1, size = 10) {
    try {
      const result = await this.storyModel.getAllStories(page, size);

      if (result.isOffline) {
        this.storyView.showOfflineWarning?.();
      }

      if (result.success) {
        this.storyView.displayStories?.(result.stories || []);
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
        this.handleAddSuccess(data);
      } else if (!result.success && !navigator.onLine) {
        await this.handleOfflineAdd(data);
      } else {
        this.storyView.showError?.(result.message || "Failed to add story");
      }
    } catch (error) {
      this.handleAddError(error);
    }
  }

  async handleAddSuccess(data) {
    this.storyView.showSuccess?.("Story added successfully!");
    
    await showNotificationPrompt(async (granted) => {
      if (granted) {
        // new Notification("Story created (Local)", {
        //   body: `New story: ${data.description.substring(0, 50)}...`,
        //   icon: "/assets/images/icon-192x192.png",
        // });
      }
    });

    this.cleanup();
    setTimeout(() => {
      this.handleLoadStories();
      this.router.navigateTo("/stories");
    }, 1500);
  }

  async handleOfflineAdd(data) {
    try {
      const offlineResult = await this.storyModel.addStoryOffline(data);
      this.syncQueue.add(offlineResult.story.id);

      await showNotificationPrompt(async (granted) => {
        if (granted) {
          // new Notification("Story Saved Offline (Local)", {
          //   body: "Will upload when you're back online",
          //   icon: "/assets/images/icon-192x192.png"
          // });
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

    console.log('Starting sync with queue:', Array.from(this.syncQueue));
    this.isSyncing = true;

    try {
      const syncResult = await this.storyModel.syncOfflineStories(this.syncQueue);
      console.log('Sync completed:', syncResult);

      if (syncResult.success && syncResult.syncedIds.length > 0) {
        syncResult.syncedIds.forEach(id => {
          this.syncQueue.delete(id);
          this.pendingSyncIds.delete(id);
        });

        this.storyView.showSuccess?.(`Synced ${syncResult.syncedIds.length} stories!`);
        this.handleLoadStories();
      }
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      this.isSyncing = false;
      
      // Retry if there are remaining stories
      if (this.syncQueue.size > 0) {
        setTimeout(() => this.handleOnline(), 5000);
      }
    }
  }

  cleanup() {
    if (typeof this.storyView.cleanup === "function") {
      this.storyView.cleanup();
    }

    this.currentStoryId = null;
    this.isLoading = false;
  }
}