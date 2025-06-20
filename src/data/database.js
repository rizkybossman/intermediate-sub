export const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("StoryAppDB", 2);

    request.onerror = (event) => {
      console.error("Database error:", event.target.error);
      reject("Database error");
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      const oldVersion = event.oldVersion;
      const newVersion = event.newVersion;

      console.log(`Upgrading DB from v${oldVersion} to v${newVersion}`);


      if (!db.objectStoreNames.contains("stories")) {
        const storiesStore = db.createObjectStore("stories", { keyPath: "id" });
        storiesStore.createIndex("createdAt", "createdAt", { unique: false });
      }


      if (!db.objectStoreNames.contains("user")) {
        db.createObjectStore("user", { keyPath: "id" });
      }


      if (!db.objectStoreNames.contains("bookmarks")) {
        const bookmarksStore = db.createObjectStore("bookmarks", { keyPath: "id" });
        bookmarksStore.createIndex("storyId", "storyId", { unique: true });
        bookmarksStore.createIndex("createdAt", "createdAt", { unique: false });
      }
    };

    request.onsuccess = (event) => {
      console.log("Database opened successfully");
      resolve(event.target.result);
    };
  });
};


export const saveStories = async (stories) => {
  try {
    const db = await initDB();
    const transaction = db.transaction("stories", "readwrite");
    const store = transaction.objectStore("stories");

    stories.forEach((story) => {
      store.put(story);
    });

    return new Promise((resolve) => {
      transaction.oncomplete = () => {
        resolve(true);
      };
    });
  } catch (error) {
    console.error("Failed to save stories:", error);
    return false;
  }
};

export const getStories = async () => {
  try {
    const db = await initDB();
    const transaction = db.transaction("stories", "readonly");
    const store = transaction.objectStore("stories");
    const request = store.getAll();

    return new Promise((resolve) => {
      request.onsuccess = () => {
        resolve(request.result || []);
      };
    });
  } catch (error) {
    console.error("Failed to get stories:", error);
    return [];
  }
};


export const saveUserData = async (userData) => {
  try {
    const db = await initDB();
    const transaction = db.transaction("user", "readwrite");
    const store = transaction.objectStore("user");

    store.put({ id: "currentUser", ...userData });

    return new Promise((resolve) => {
      transaction.oncomplete = () => {
        resolve(true);
      };
    });
  } catch (error) {
    console.error("Failed to save user data:", error);
    return false;
  }
};

export const getUserData = async () => {
  try {
    const db = await initDB();
    const transaction = db.transaction("user", "readonly");
    const store = transaction.objectStore("user");
    const request = store.get("currentUser");

    return new Promise((resolve) => {
      request.onsuccess = () => {
        resolve(request.result || null);
      };
    });
  } catch (error) {
    console.error("Failed to get user data:", error);
    return null;
  }
};

let isWriting = false;

export const addStoryOffline = async (story) => {
  if (isWriting) {
    await new Promise(resolve => setTimeout(resolve, 100));
    return addStoryOffline(story); 
  }

  isWriting = true;
  try {
    const db = await initDB();
    const tx = db.transaction("stories", "readwrite");
    const store = tx.objectStore("stories");
    store.put(story);

    return new Promise((resolve) => {
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => {
        console.error("Transaction failed:", tx.error);
        resolve(false);
      };
    });
  } catch (error) {
    console.error("Failed to save story offline:", error);
    return false;
  } finally {
    isWriting = false;
  }
};

export const deleteStoryOffline = async (id) => {
  try {
    const db = await initDB();
    const tx = db.transaction("stories", "readwrite");
    const store = tx.objectStore("stories");
    store.delete(id);
    return new Promise((resolve) => {
      tx.oncomplete = () => resolve(true);
    });
  } catch (error) {
    console.error("Failed to delete story:", error);
    return false;
  }
};

export const getOfflineStories = async () => {
  const db = await initDB();
  const tx = db.transaction("stories", "readonly");
  const store = tx.objectStore("stories");
  const request = store.getAll();
  
  return new Promise((resolve) => {
    request.onsuccess = () => {
      resolve(request.result.filter(story => story.isOffline));
    };
  });
};



export const addBookmark = async (storyId) => {
  try {
    const db = await initDB();
    const tx = db.transaction("bookmarks", "readwrite");
    const store = tx.objectStore("bookmarks");
    
    const bookmark = {
      id: `bookmark_${Date.now()}`,
      storyId,
      createdAt: new Date().toISOString()
    };
    
    store.put(bookmark);

    return new Promise((resolve) => {
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => {
        console.error("Bookmark transaction failed:", tx.error);
        resolve(false);
      };
    });
  } catch (error) {
    console.error("Failed to add bookmark:", error);
    return false;
  }
};

export const removeBookmark = async (storyId) => {
  try {
    const db = await initDB();
    const tx = db.transaction("bookmarks", "readwrite");
    const store = tx.objectStore("bookmarks");
    const index = store.index("storyId");
    
    const request = index.get(storyId);
    
    return new Promise((resolve) => {
      request.onsuccess = () => {
        if (request.result) {
          store.delete(request.result.id);
        }
        resolve(true);
      };
      request.onerror = () => {
        console.error("Error finding bookmark:", request.error);
        resolve(false);
      };
    });
  } catch (error) {
    console.error("Failed to remove bookmark:", error);
    return false;
  }
};

export const getBookmarks = async () => {
  try {
    const db = await initDB();
    const tx = db.transaction("bookmarks", "readonly");
    const store = tx.objectStore("bookmarks");
    const request = store.getAll();

    return new Promise((resolve) => {
      request.onsuccess = () => {
        resolve(request.result || []);
      };
      request.onerror = () => {
        console.error("Error getting bookmarks:", request.error);
        resolve([]);
      };
    });
  } catch (error) {
    console.error("Failed to get bookmarks:", error);
    return [];
  }
};

export const getBookmarkedStories = async () => {
  try {
    const db = await initDB();
    const bookmarks = await getBookmarks();
    const storyIds = bookmarks.map(b => b.storyId);

    if (storyIds.length === 0) return [];

    const tx = db.transaction("stories", "readonly");
    const store = tx.objectStore("stories");
    
    const stories = await Promise.all(
      storyIds.map(id => {
        return new Promise(resolve => {
          const request = store.get(id);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => resolve(null);
        });
      })
    );

    return stories.filter(story => story !== null);
  } catch (error) {
    console.error("Failed to get bookmarked stories:", error);
    return [];
  }
};

export const isBookmarked = async (storyId) => {
  try {
    const db = await initDB();
    const tx = db.transaction("bookmarks", "readonly");
    const store = tx.objectStore("bookmarks");
    const index = store.index("storyId");
    const request = index.get(storyId);

    return new Promise((resolve) => {
      request.onsuccess = () => {
        resolve(!!request.result);
      };
      request.onerror = () => {
        console.error("Error checking bookmark:", request.error);
        resolve(false);
      };
    });
  } catch (error) {
    console.error("Failed to check bookmark:", error);
    return false;
  }
};

export const clearAllBookmarks = async () => {
  try {
    const db = await initDB();
    const tx = db.transaction("bookmarks", "readwrite");
    const store = tx.objectStore("bookmarks");
    const request = store.clear();

    return new Promise((resolve) => {
      request.onsuccess = () => resolve(true);
      request.onerror = () => {
        console.error("Error clearing bookmarks:", request.error);
        resolve(false);
      };
    });
  } catch (error) {
    console.error("Failed to clear bookmarks:", error);
    return false;
  }
};