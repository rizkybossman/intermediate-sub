export const ErrorView = () => {
  const view = document.createElement('main');
  view.id = 'main-content';
  
  view.innerHTML = `
    <div class="error-message">
      <h1>404 Not Found</h1>
      <p>The page you're looking for doesn't exist.</p>
      <a href="#/">Go to Home</a>
    </div>
  `;
  
  return {
    getView: () => view
  };
};