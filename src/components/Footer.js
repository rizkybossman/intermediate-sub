export const Footer = () => {
  const footer = document.createElement("footer");

  footer.innerHTML = `
      <p>&copy; ${new Date().getFullYear()} Story App. All rights reserved.</p>
    `;

  return footer;
};
