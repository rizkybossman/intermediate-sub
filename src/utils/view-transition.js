export const startViewTransition = (callback) => {
  if (!document.startViewTransition) {
    callback();
    return;
  }

  document.startViewTransition(() => {
    callback();
  });
};

document.dispatchEvent(new CustomEvent('view-transition-start'));

// Around where your transition completes
document.dispatchEvent(new CustomEvent('view-transition-end'));