// navbar.js - navigation behavior
export function initNavbar() {
  const buttons = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('.page-section');

  const activateSection = (targetId) => {
    if (!targetId) return;
    const targetSection = document.getElementById(targetId);
    if (!targetSection) return;

    buttons.forEach((btn) => btn.classList.toggle('active', btn.dataset.target === targetId));
    sections.forEach((section) => section.classList.toggle('active', section.id === targetId));
  };

  const handleHash = () => {
    const hash = window.location.hash.replace('#', '');
    activateSection(hash || 'home');
  };

  buttons.forEach((button) => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      const targetId = button.dataset.target;
      if (!targetId) return;
      window.history.pushState(null, '', `#${targetId}`);
      activateSection(targetId);
    });
  });

  window.addEventListener('hashchange', handleHash);
  handleHash();
}
