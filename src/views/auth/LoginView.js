import { BaseView } from '../BaseView.js';

export const LoginView = () => {
  document.querySelector('header')?.remove();

  const base = BaseView(`
    <h2>Login</h2>
    <form id="login-form">
      <div class="form-group">
        <label for="email">Email</label>
        <input type="email" id="email" name="email" required>
      </div>
      <div class="form-group">
        <label for="password">Password</label>
        <input type="password" id="password" name="password" required minlength="8">
      </div>
      <button type="submit">Login</button>
    </form>
    <p>Don't have an account? <a href="#/register">Register here</a></p>
    <div id="error-message" class="error-message" style="display: none;"></div>
  `);

  const bindLogin = (handler) => {
    const form = base.getView().querySelector('#login-form');
    const errorMessage = base.getView().querySelector('#error-message');
    
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = form.email.value;
      const password = form.password.value;
      
      errorMessage.style.display = 'none';
      await handler(email, password);
    });
  };

  return {
    getView: base.getView,  // Explicitly expose getView
    showError: base.showError,
    showSuccess: base.showSuccess,
    bindLogin
  };
};