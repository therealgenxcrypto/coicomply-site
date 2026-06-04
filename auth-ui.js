(() => {
  const supabase = window.coiSupabase;
  const logoutButtons = document.querySelectorAll('.nav-logout');
  const accountLinks = document.querySelectorAll('.nav-account-link');
  const authLinks = document.querySelectorAll('.nav-auth-link');

  const setAuthNav = (isAuthed) => {
    authLinks.forEach((el) => { el.hidden = isAuthed; });
    accountLinks.forEach((el) => { el.hidden = !isAuthed; });
    logoutButtons.forEach((el) => { el.hidden = !isAuthed; });
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

  logoutButtons.forEach((button) => button.addEventListener('click', async () => {
    await supabase.auth.signOut({ scope: 'local' });
    window.location.href = 'index.html';
  }));
})();
