import { login, register } from "../services/authApi";

export class AuthModel {
  constructor() {
    this.token = localStorage.getItem("token") || null;
    this.user = JSON.parse(localStorage.getItem("user")) || null;
  }

  async login(email, password) {
    try {
      const response = await login(email, password);

      if (!response.error) {
        this.token = response.loginResult.token;
        this.user = {
          userId: response.loginResult.userId,
          name: response.loginResult.name,
        };

        localStorage.setItem("token", this.token);
        localStorage.setItem("user", JSON.stringify(this.user));

        return { success: true, user: this.user };
      }

      return { success: false, message: response.message };
    } catch (error) {
      console.error("Login error:", error);
      return { success: false, message: "Login failed. Please try again." };
    }
  }

  async register(name, email, password) {
    try {
      const response = await register(name, email, password);

      if (!response.error) {
        return { success: true };
      }

      return { success: false, message: response.message };
    } catch (error) {
      console.error("Registration error:", error);
      return {
        success: false,
        message: "Registration failed. Please try again.",
      };
    }
  }

  logout() {
    this.token = null;
    this.user = null;
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  }

  isAuthenticated() {
    return !!this.token;
  }

  getUser() {
    return this.user;
  }

  getToken() {
    // console.log("AuthModel.getToken called");
    // console.log("AuthModel type:", typeof AuthModel);
    // console.log("AuthModel:", AuthModel);
    return this.token;
  }
}
