(function () {
  const url = window.COI_SUPABASE_URL;
  const key = window.COI_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key || url.includes('YOUR_PROJECT_REF') || key.includes('YOUR_SUPABASE_PUBLISHABLE_KEY')) {
    console.warn('Supabase is not configured. Update supabase-config.js');
    window.coiSupabase = null;
    return;
  }

  window.coiSupabase = window.supabase.createClient(url, key, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });
})();
