import {
  getAllStories,
  getStoryDetail,
  addStory,
  addStoryGuest,
} from "../data/api.js";

import {
  saveStories,
  getStories,
  addStoryOffline,
  deleteStoryOffline,
} from "../data/database.js";

export class StoryModel {
  constructor(authModel) {
    this.authModel = authModel;
  }

  async getAllStories(page = 1, size = 10, withLocation = false) {
    try {
      const token = this.authModel.getToken();
      const response = await getAllStories(token, page, size, withLocation);

      if (!response.error) {
        await saveStories(response.listStory);
        return { success: true, stories: response.listStory };
      }

      const offlineStories = await getStories();
      return {
        success: true,
        stories: offlineStories,
        isOffline: true,
      };
    } catch (error) {
      const offlineStories = await getStories();
      return {
        success: !!offlineStories.length,
        stories: offlineStories || [],
        isOffline: true,
      };
    }
  }

  async getStoryDetail(id) {
    try {
      const token = this.authModel.getToken();
      if (!token) return { success: false, message: "Authentication required" };

      const response = await getStoryDetail(id, token);
      if (!response.error) return { success: true, story: response.story };

      return {
        success: false,
        message: response.message || "Failed to fetch story",
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || "Network error while fetching story",
      };
    }
  }

  async addStory(data) {
    try {
      const token = this.authModel.getToken();
      if (!data?.description || !data?.photo) {
        return { success: false, message: "Description and photo are required" };
      }

      const response = token 
        ? await addStory(data, token) 
        : await addStoryGuest(data);

      if (!response.error) {
        return {
          success: true,
          message: "Story added successfully",
          data: response,
        };
      }

      return {
        success: false,
        message: response.message || "Failed to add story",
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || "Network error while adding story",
      };
    }
  }

  async addStoryOffline(data) {
    try {
      const storyId = `offline_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      let photoUrl = '';
      let photoBase64 = '';
      
      if (data.photo instanceof Blob || data.photo instanceof File) {
        photoBase64 = await this.readFileAsBase64(data.photo);
        photoUrl = URL.createObjectURL(data.photo);
      }

      const story = {
        id: storyId,
        name: "You (Offline)",
        description: data.description,
        photoUrl: photoUrl || '/assets/images/placeholder-offline.jpg',
        photoBase64,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isOffline: true,
        lat: data.lat,
        lon: data.lon,
        originalPhoto: data.photo
      };

      await addStoryOffline(story);
      return { success: true, story };
    } catch (error) {
      console.error("Failed to save offline story:", error);
      return { success: false, error };
    }
  }

  readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async syncOfflineStories(syncQueue) {
    try {
      const offlineStories = await this.getOfflineStories();
      const token = this.authModel.getToken();
      
      if (!token) {
        console.log('No auth token - skipping sync');
        return { success: false, error: 'Authentication required' };
      }

      // Filter stories that are both offline and in the sync queue
      const toSync = offlineStories
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
        .filter(story => syncQueue.has(story.id));

      if (toSync.length === 0) {
        console.log('No stories to sync');
        return { success: true, syncedIds: [] };
      }

      const syncedIds = [];
      
      for (const story of toSync) {
        try {
          console.log('Syncing story:', story.id);
          
          const photoBlob = story.photoBase64 
            ? await this.base64ToBlob(story.photoBase64)
            : story.originalPhoto;

          const response = await addStory({
            description: story.description,
            photo: photoBlob,
            lat: story.lat,
            lon: story.lon
          }, token);

          if (!response.error) {
            await deleteStoryOffline(story.id);
            syncedIds.push(story.id);
          }
        } catch (error) {
          console.error(`Failed to sync ${story.id}:`, error);
        }
      }

      return {
        success: syncedIds.length > 0,
        syncedIds
      };
    } catch (error) {
      console.error('Sync error:', error);
      return { success: false, error };
    }
  }

  async base64ToBlob(base64) {
    const response = await fetch(base64);
    return await response.blob();
  }

  async getOfflineStories() {
    const allStories = await getStories();
    return allStories.filter(story => story.isOffline);
  }

  async deleteStoryOffline(id) {
    return await deleteStoryOffline(id);
  }
}