import { BaseView } from '../BaseView.js';

export const RegisterView = () => {
  const base = BaseView(`
    <h2>Register</h2>
    <form id="register-form">
      <div class="form-group">
        <label for="name">Name</label>
        <input type="text" id="name" name="name" required>
      </div>
      <div class="form-group">
        <label for="email">Email</label>
        <input type="email" id="email" name="email" required>
      </div>
      <div class="form-group">
        <label for="password">Password</label>
        <input type="password" id="password" name="password" required minlength="8">
      </div>
      <div class="form-group">
        <label for="confirm-password">Confirm Password</label>
        <input type="password" id="confirm-password" name="confirm-password" required minlength="8">
      </div>
      <button type="submit">Register</button>
    </form>
    <p>Already have an account? <a href="#/login">Login here</a></p>
    <div id="error-message" class="error-message" style="display: none;"></div>
    <div id="success-message" class="success-message" style="display: none;"></div>
  `);

  const bindRegister = (handler) => {
    const form = base.getView().querySelector('#register-form');
    const errorMessage = base.getView().querySelector('#error-message');
    
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = form.name.value;
      const email = form.email.value;
      const password = form.password.value;
      const confirmPassword = form['confirm-password'].value;
      
      errorMessage.style.display = 'none';

      if (password !== confirmPassword) {
        base.showError("Passwords don't match!");
        return;
      }

      await handler(name, email, password);
    });
  };

  return {
    getView: base.getView,
    showError: base.showError,
    showSuccess: base.showSuccess,
    bindRegister
  };
};