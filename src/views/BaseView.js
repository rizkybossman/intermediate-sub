import { resetSkipToContent } from '../utils/SkipToContent';

export const BaseView = (htmlContent) => {
  const view = document.createElement('div');
  view.className = 'auth-form';
  view.innerHTML = htmlContent;

  // Create a MutationObserver to detect when the view is removed
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (Array.from(mutation.removedNodes).includes(view)) {
        cleanup();
      }
    });
  });

  const cleanup = () => {
    resetSkipToContent();
    observer.disconnect(); // Stop observing when cleaning up
  };

  // Start observing the view's parent for removal
  if (view.parentNode) {
    observer.observe(view.parentNode, { childList: true });
  }

  const getView = () => {
    // When view is retrieved, ensure we observe its eventual parent
    setTimeout(() => {
      if (view.parentNode && !observer._isObserving) {
        observer.observe(view.parentNode, { childList: true });
        observer._isObserving = true;
      }
    }, 0);
    return view;
  };

  const showError = (message) => {
    const errorElement = view.querySelector('#error-message') || 
                        view.querySelector('.error-message');
    if (errorElement) {
      errorElement.textContent = message;
      errorElement.style.display = message ? 'block' : 'none';
    }
  };

  const showSuccess = (message) => {
    const successElement = view.querySelector('#success-message') || 
                          view.querySelector('.success-message');
    if (successElement) {
      successElement.textContent = message;
      successElement.style.display = message ? 'block' : 'none';
    }
  };

  return {
    getView,
    showError,
    showSuccess,
    cleanup
  };
};