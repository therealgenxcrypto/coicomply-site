(() => {
  const toggle = document.getElementById('mobileMenuToggle');
  const menu = document.getElementById('mobileMenu');
  const setMenu = (open) => {
    if (!menu || !toggle) return;
    menu.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('mobile-menu-open', open);
  };
  toggle?.addEventListener('click', () => setMenu(menu?.hidden));
  menu?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', event => { if (event.key === 'Escape') setMenu(false); });
})();
