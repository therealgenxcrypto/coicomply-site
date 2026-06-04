(() => {
  const supabase = window.coiSupabase;
  const form = document.getElementById('authForm');
  const live = document.getElementById('authLive');
  const title = document.getElementById('authTitle');
  const heading = document.getElementById('authFormHeading');
  const submit = document.getElementById('authSubmit');
  const switchText = document.getElementById('authSwitchText');
  const switchLink = document.getElementById('authSwitchLink');
  const verificationPanel = document.getElementById('verificationPanel');
  const verificationCopy = document.getElementById('verificationCopy');
  const resendVerificationButton = document.getElementById('resendVerificationButton');
  let signupEmail = '';

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
    signupEmail = email;

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
      live.textContent = '';
      verificationCopy.textContent = `We sent a verification link to ${email}. Open that link to finish creating your COIComply account, then sign in.`;
      verificationPanel.hidden = false;
      submit.disabled = true;
      submit.textContent = 'Verification email sent';
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      live.textContent = error.message;
      return;
    }
    window.location.href = next;
  });

  resendVerificationButton?.addEventListener('click', async () => {
    if (!signupEmail) {
      live.textContent = 'Enter your email and create the account first, then resend the verification email if needed.';
      return;
    }

    resendVerificationButton.disabled = true;
    resendVerificationButton.textContent = 'Sending...';

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: signupEmail,
      options: { emailRedirectTo: `${window.location.origin}${window.location.pathname.replace('auth.html', 'account.html')}` },
    });

    if (error) {
      live.textContent = error.message;
      resendVerificationButton.disabled = false;
      resendVerificationButton.textContent = 'Resend verification email';
      return;
    }

    live.textContent = `Verification email resent to ${signupEmail}.`;
    resendVerificationButton.textContent = 'Verification email resent';
    window.setTimeout(() => {
      resendVerificationButton.disabled = false;
      resendVerificationButton.textContent = 'Resend verification email';
    }, 30000);
  });
})();
