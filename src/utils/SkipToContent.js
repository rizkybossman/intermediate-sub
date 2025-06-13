let currentSkipTarget = null;

export const resetSkipToContent = () => {
  if (currentSkipTarget) {
    currentSkipTarget.classList?.remove('focus-visible');
    currentSkipTarget.removeAttribute('tabindex');
    currentSkipTarget = null;
  }
};

const handleSkipToContent = async () => {
  await new Promise(resolve => requestAnimationFrame(resolve));
  
  const mainContent = document.getElementById('main-content');
  if (!mainContent) return;

  resetSkipToContent();
  
  mainContent.classList.add('focus-visible');
  mainContent.focus({ preventScroll: true });
  
  setTimeout(() => {
    mainContent.classList.remove('focus-visible');
  }, 2000);
};

export const initializeSkipToContent = () => {
  const existingSkipLink = document.querySelector('.skip-link');
  if (existingSkipLink) existingSkipLink.remove();

  const skipLink = document.createElement('a');
  skipLink.href = '#main-content';
  skipLink.className = 'skip-link';
  skipLink.textContent = 'Skip to content';
  
  skipLink.style.cssText = `
    position: fixed;
    top: -40px;
    left: 1rem;
    background: #000;
    color: white;
    padding: 8px 12px;
    border-radius: 0 0 4px 4px;
    z-index: 9999;
    transition: top 0.3s ease;
  `;

  skipLink.addEventListener('focus', () => {
    skipLink.style.top = '0';
  });

  skipLink.addEventListener('blur', () => {
    skipLink.style.top = '-40px';
  });

  skipLink.addEventListener('click', async (e) => {
    e.preventDefault();
    await handleSkipToContent();
  });

  document.body.prepend(skipLink);

  return () => {
    skipLink.remove();
    resetSkipToContent();
  };
};