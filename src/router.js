import { startViewTransition } from "./utils/view-transition.js";
import { Header } from "./components/Header.js";
import { Footer } from "./components/Footer.js";
import { ErrorView } from "./views/ErrorView.js";

export class Router {
  constructor(routes) {
    this.routes = routes;
    this.rootElem = document.getElementById("app");
    this.currentPresenter = null;
    this.init();
  }

  init() {
    window.addEventListener("hashchange", () => this.handleRouting());
    window.addEventListener("load", () => this.handleRouting());
  }

  async handleRouting() {
    const url = window.location.hash.slice(1) || "/";
    let params = {};
    const route = this.findMatchingRoute(url, params) || 
                 this.routes.find((r) => r.path === "*");

    // Clean up previous view
    if (this.currentPresenter?.cleanup) {
      this.currentPresenter.cleanup();
    }

    await startViewTransition(async () => {
      try {
        this.rootElem.innerHTML = "";

        // Add header if authenticated
        if (!["/login", "/register"].includes(url)) {
          const header = Header();
          const headerElement = header.getView?.() || header;
          if (headerElement instanceof Node) {
            this.rootElem.appendChild(headerElement);
          }
        }

        // Load view
        const view = await route.view(params);
        const viewElement = view.getView?.() || view;

        if (!(viewElement instanceof Node)) {
          throw new Error("View is not a valid DOM node");
        }

        // Ensure main content exists
        const mainContent = viewElement.querySelector('main') || viewElement;
        if (!mainContent.id) {
          mainContent.id = "main-content";
        }

        this.rootElem.appendChild(viewElement);

        // Add footer
        const footer = Footer();
        const footerElement = footer.getView?.() || footer;
        if (footerElement instanceof Node) {
          this.rootElem.appendChild(footerElement);
        }

        // Set focus to first focusable element
        setTimeout(() => {
          const firstFocusable = this.rootElem.querySelector(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          firstFocusable?.focus();
        }, 100);

        // Store presenter
        if (route.presenter) {
          this.currentPresenter = route.presenter;
          this.currentPresenter.afterRender?.();
        }

      } catch (error) {
        console.error("Routing error:", error);
        const errorView = ErrorView();
        this.rootElem.innerHTML = "";
        this.rootElem.appendChild(errorView.getView());
      }
    });
  }

  findMatchingRoute(url, params) {
    return this.routes.find((route) => {
      const routeParts = route.path.split("/");
      const urlParts = url.split("/");

      if (routeParts.length !== urlParts.length) return false;

      for (let i = 0; i < routeParts.length; i++) {
        const routePart = routeParts[i];
        const urlPart = urlParts[i];

        if (routePart.startsWith(":")) {
          const paramName = routePart.slice(1);
          params[paramName] = urlPart;
        } else if (routePart !== urlPart) {
          return false;
        }
      }

      return true;
    });
  }

  navigateTo(path) {
    const currentPath = window.location.hash.slice(1) || "/";

    if (currentPath === "/add-story" && this.currentPresenter) {
      this.currentPresenter.cleanup();
    }

    window.location.hash = path;
  }
}