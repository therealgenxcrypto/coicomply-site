(() => {
  const supabase = window.coiSupabase;
  const requiresAuth = document.body.dataset.protected === 'true';
  const authOnly = document.body.dataset.authOnly === 'true';
  const next = encodeURIComponent(window.location.pathname.split('/').pop() || 'account.html');

  if (!supabase) return;

  supabase.auth.getSession().then(({ data }) => {
    const isAuthed = Boolean(data.session);
    if (requiresAuth && !isAuthed) {
      window.location.href = `auth.html?mode=signin&next=${next}`;
      return;
    }
    if (authOnly && isAuthed) {
      window.location.href = 'account.html';
      return;
    }
    document.body.dataset.authReady = 'true';
  });
})();
