import { updateAuthUI } from "../components/Header.js";
import { 
  subscribeUser, 
  unsubscribeUser,
  requestNotificationPermission 
} from "../utils/notification.js";

export class AuthPresenter {
  constructor(authModel, authView, router) {
    this.authModel = authModel;
    this.authView = authView;
    this.router = router;

    // Initialize UI state
    updateAuthUI(this.authModel.isAuthenticated());

    if (authView.bindLogin) {
      authView.bindLogin(this.handleLogin.bind(this));
    }

    if (authView.bindRegister) {
      authView.bindRegister(this.handleRegister.bind(this));
    }
  }

  async handleLogin(email, password) {
  try {
    const result = await this.authModel.login(email, password);

    if (result.success) {
      updateAuthUI(true); // Update UI state immediately
      
      // Start both operations but don't await notification setup
      const notificationPromise = (async () => {
        try {
          const permissionGranted = await requestNotificationPermission();
          if (permissionGranted) await subscribeUser(result.token);
        } catch (error) {
          console.error("Notification error:", error);
        }
      })();

      // Navigate immediately without waiting for notifications
      this.router.navigateTo("/stories");
      
      // Let notifications complete in background
      await notificationPromise;
    } else {
      this.authView.showError?.(result.message);
    }
  } catch (error) {
    this.authView.showError?.(error.message);
  }
}

  async handleLogout() {
    try {
      // Unsubscribe from notifications before logout
      const token = this.authModel.getToken();
      if (token) {
        await unsubscribeUser(token);
      }
    } catch (error) {
      console.error("Error unsubscribing:", error);
    } finally {
      this.authModel.logout();
      updateAuthUI(false);
      this.router.navigateTo("/login");
    }
  }

  async handleRegister(name, email, password) {
    try {
      const result = await this.authModel.register(name, email, password);

      if (result.success) {
        this.authView.showSuccess?.("Registration successful. Please login.");
        this.router.navigateTo("/login");
      } else {
        this.authView.showError?.(result.message);
      }
    } catch (error) {
      this.authView.showError?.(error.message);
    }
  }
}