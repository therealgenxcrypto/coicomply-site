(() => {
  const supabase = window.coiSupabase;
  const logoutButton = document.getElementById('navLogoutButton');
  const accountLink = document.querySelector('.nav-account-link');
  const authLinks = document.querySelectorAll('.nav-auth-link');

  const setAuthNav = (isAuthed) => {
    authLinks.forEach((el) => { el.hidden = isAuthed; });
    if (accountLink) accountLink.hidden = !isAuthed;
    if (logoutButton) logoutButton.hidden = !isAuthed;
  };

  if (!supabase) {
    setAuthNav(false);
    return;
  }

  supabase.auth.getSession().then(({ data }) => {
    setAuthNav(Boolean(data.session));
  });

  supabase.auth.onAuthStateChange((_event, session) => {
    setAuthNav(Boolean(session));
  });

  logoutButton?.addEventListener('click', async () => {
    await supabase.auth.signOut({ scope: 'local' });
    window.location.href = 'index.html';
  });
})();
