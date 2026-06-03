(() => {
  const supabase = window.coiSupabase;
  const form = document.getElementById('authForm');
  const live = document.getElementById('authLive');
  const title = document.getElementById('authTitle');
  const heading = document.getElementById('authFormHeading');
  const submit = document.getElementById('authSubmit');
  const switchText = document.getElementById('authSwitchText');
  const switchLink = document.getElementById('authSwitchLink');

  if (!supabase) {
    live.textContent = 'Supabase is not configured. Update supabase-config.js.';
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const mode = params.get('mode') === 'signup' ? 'signup' : 'signin';
  const next = params.get('next') || 'account.html';

  if (mode === 'signup') {
    title.textContent = 'Create account';
    heading.textContent = 'Create your COIComply account';
    submit.textContent = 'Create account';
    switchText.innerHTML = 'Already have an account? <a href="?mode=signin" id="authSwitchLink">Sign in</a>.';
  } else {
    switchLink.href = '?mode=signup';
  }

  supabase.auth.getSession().then(({ data }) => {
    if (data.session) window.location.href = next;
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const email = String(formData.get('email') || '').trim();
    const password = String(formData.get('password') || '');

    live.textContent = mode === 'signup' ? 'Creating account...' : 'Signing in...';

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}${window.location.pathname.replace('auth.html', 'account.html')}` },
      });
      if (error) {
        live.textContent = error.message;
        return;
      }
      live.textContent = 'Account created. If email confirmation is enabled, check your inbox, then sign in.';
      window.location.href = `auth.html?mode=signin&next=${encodeURIComponent(next)}`;
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      live.textContent = error.message;
      return;
    }
    window.location.href = next;
  });
})();
