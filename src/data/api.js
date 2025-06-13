const API_BASE_URL = "https://story-api.dicoding.dev/v1";

export const register = async (name, email, password) => {
  const response = await fetch(`${API_BASE_URL}/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name, email, password }),
  });

  return response.json();
};

export const login = async (email, password) => {
  const response = await fetch(`${API_BASE_URL}/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  return response.json();
};

export const getAllStories = async (token, page, size, withLocation) => {
  try {
    const response = await fetch(`${API_BASE_URL}/stories?page=${page}&size=${size}&location=${withLocation ? 1 : 0}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const data = await response.json();
    console.log('API Response:', data); // Debug log
    
    if (!response.ok) throw new Error(data.message || 'Failed to fetch');
    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

export const getStoryDetail = async (id, token) => {
  const response = await fetch(`${API_BASE_URL}/stories/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.json();
};

export const addStory = async (data, token) => {
  const formData = new FormData();
  formData.append("description", data.description);
  formData.append("photo", data.photo);
  if (data.lat && data.lon) {
    formData.append("lat", data.lat);
    formData.append("lon", data.lon);
  }

  const response = await fetch(`${API_BASE_URL}/stories`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  return response.json();
};

export const addStoryGuest = async (data) => {
  const formData = new FormData();
  formData.append("description", data.description);
  formData.append("photo", data.photo);
  if (data.lat && data.lon) {
    formData.append("lat", data.lat);
    formData.append("lon", data.lon);
  }

  const response = await fetch(`${API_BASE_URL}/stories/guest`, {
    method: "POST",
    body: formData,
  });

  return response.json();
};

export const subscribeToNotifications = async (subscription, token) => {
  const response = await fetch(`${API_BASE_URL}/notifications/subscribe`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(subscription),
  });

  return response.json();
};

export const unsubscribeFromNotifications = async (endpoint, token) => {
  const response = await fetch(`${API_BASE_URL}/notifications/subscribe`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ endpoint }),
  });

  return response.json();
};
