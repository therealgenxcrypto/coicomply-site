(() => {
  const supabase = window.coiSupabase;
  const logout = document.getElementById('logoutButton');
  const accountEmail = document.getElementById('accountEmail');
  const trialUsed = document.getElementById('trialUsed');
  const trialRemaining = document.getElementById('trialRemaining');
  const filesUploaded = document.getElementById('filesUploaded');

  if (!supabase) {
    accountEmail.textContent = 'Supabase is not configured.';
    return;
  }

  const TRIAL_LIMIT = 10;

  logout?.addEventListener('click', async () => {
    await supabase.auth.signOut({ scope: 'local' });
    window.location.href = 'index.html';
  });

  supabase.auth.getUser().then(async ({ data, error }) => {
    if (error || !data.user) {
      window.location.href = 'auth.html?mode=signin&next=account.html';
      return;
    }

    const user = data.user;
    accountEmail.textContent = `Signed in as ${user.email || 'unknown user'}`;

    const { count: uploadsCount } = await supabase
      .from('document_uploads')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    const used = Math.min(uploadsCount || 0, TRIAL_LIMIT);
    trialUsed.textContent = String(used);
    trialRemaining.textContent = String(Math.max(TRIAL_LIMIT - used, 0));
    filesUploaded.textContent = String(uploadsCount || 0);
  });
})();
