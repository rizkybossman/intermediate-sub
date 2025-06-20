import { VAPID_PUBLIC_KEY } from "./config.js";
import {
  subscribeToNotifications,
  unsubscribeFromNotifications,
} from "../data/api.js";

export const requestNotificationPermission = async () => {
  if (!("Notification" in window)) {
    console.log("This browser does not support notifications.");
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  const permission = await Notification.requestPermission();
  return permission === "granted";
};

export const subscribeUser = async (token) => {
  if (!("serviceWorker" in navigator)) {
    console.log("Service Worker not supported");
    return null;
  }

  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    try {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });


      const result = await subscribeToNotifications(
        {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: arrayBufferToBase64(subscription.getKey('p256dh')),
            auth: arrayBufferToBase64(subscription.getKey('auth'))
          },
        },
        token
      );

      if (!result.error) {
        console.log("User is subscribed.");
        return subscription;
      } else {
        console.error("Subscription failed:", result.message);
        await subscription.unsubscribe();
        return null;
      }
    } catch (error) {
      console.error("Error subscribing user:", error);
      return null;
    }
  }

  return subscription;
};

export const unsubscribeUser = async (token) => {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();

  if (subscription) {
    try {
      const result = await unsubscribeFromNotifications(
        subscription.endpoint,
        token
      );

      if (!result.error) {
        await subscription.unsubscribe();
        console.log("User is unsubscribed.");
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error unsubscribing user:", error);
      return false;
    }
  }
  return false;
};

export const showNotificationPrompt = async (callback) => {
  if (!("Notification" in window)) {
    console.log("This browser does not support notifications.");
    if (callback) callback(false);
    return false;
  }

  if (Notification.permission === "granted") {
    if (callback) callback(true);
    return true;
  }

  if (Notification.permission === "denied") {
    console.log("Notification permission has been denied.");
    if (callback) callback(false);
    return false;
  }


  if (Notification.permission === "default") {

    const permission = await Notification.requestPermission();
    if (callback) callback(permission === "granted");
    return permission === "granted";
  }
};

export const showNotification = (message, options = {}) => {
  const { type = 'info', autoClose = 3000 } = options;
  

  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  notification.setAttribute('role', 'alert');
  

  document.body.appendChild(notification);
  

  if (autoClose) {
    setTimeout(() => {
      notification.classList.add('fade-out');
      setTimeout(() => notification.remove(), 300);
    }, autoClose);
  }
  
  return notification;
};

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}