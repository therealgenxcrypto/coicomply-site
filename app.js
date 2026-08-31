(() => {
  const supabase = window.coiSupabase;
  const navUploadButton = document.getElementById('navUploadButton');
  const dropzone = document.getElementById('uploadDropzone');
  const mobileMenuToggle = document.getElementById('mobileMenuToggle');
  const mobileMenu = document.getElementById('mobileMenu');

  let activeUserId = null;

  const setMobileMenu = (isOpen) => {
    if (!mobileMenu || !mobileMenuToggle) return;
    mobileMenu.hidden = !isOpen;
    mobileMenuToggle.setAttribute('aria-expanded', String(isOpen));
    document.body.classList.toggle('mobile-menu-open', isOpen);
  };

  const goToUploadPage = () => {
    window.location.href = activeUserId
      ? 'upload.html'
      : 'auth.html?mode=signin&next=upload.html';
  };

  navUploadButton?.addEventListener('click', goToUploadPage);
  dropzone?.addEventListener('click', goToUploadPage);
  dropzone?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      goToUploadPage();
    }
  });
  dropzone?.setAttribute('tabindex', '0');

  mobileMenuToggle?.addEventListener('click', () => {
    setMobileMenu(mobileMenu?.hidden);
  });
  mobileMenu?.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => setMobileMenu(false));
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setMobileMenu(false);
  });

  if (supabase) {
    supabase.auth.getUser().then(({ data }) => {
      activeUserId = data.user?.id || null;
      if (navUploadButton) navUploadButton.hidden = !activeUserId;
    });
    supabase.auth.onAuthStateChange((_event, session) => {
      activeUserId = session?.user?.id || null;
      if (navUploadButton) navUploadButton.hidden = !activeUserId;
    });
  }
})();
