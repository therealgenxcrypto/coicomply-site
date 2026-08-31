(() => {
  const supabase = window.coiSupabase;
  const logout = document.getElementById('logoutButton');
  const accountEmail = document.getElementById('accountEmail');
  const membershipStatus = document.getElementById('membershipStatus');
  const vendorLimit = document.getElementById('vendorLimit');
  const filesUploaded = document.getElementById('filesUploaded');
  const accountNextStep = document.getElementById('accountNextStep');

  if (!supabase) {
    accountEmail.textContent = 'Account service is not configured.';
    return;
  }

  const setNextStep = (message, linkText, linkHref) => {
    accountNextStep.replaceChildren(document.createTextNode(message));
    if (!linkText || !linkHref) return;
    accountNextStep.append(document.createTextNode(' '));
    const link = document.createElement('a');
    link.href = linkHref;
    link.textContent = linkText;
    accountNextStep.append(link);
  };

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

    const [{ data: accounts, error: accountError }, { count: uploadsCount, error: uploadError }] = await Promise.all([
      supabase
        .from('customer_accounts')
        .select('membership_status,upload_enabled,vendor_limit,founding_price_locked')
        .eq('user_id', user.id)
        .limit(1),
      supabase
        .from('document_uploads')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id),
    ]);

    if (accountError) {
      membershipStatus.textContent = 'Unavailable';
      vendorLimit.textContent = 'Unavailable';
      setNextStep('We could not load your membership status. Contact', 'hello@coicomply.com.', 'mailto:hello@coicomply.com');
    } else {
      const account = accounts?.[0];
      const state = account?.membership_status || 'pending';
      membershipStatus.textContent = state.charAt(0).toUpperCase() + state.slice(1);
      vendorLimit.textContent = account?.vendor_limit ? `Up to ${account.vendor_limit} active vendors` : 'Pending confirmation';

      if (state === 'active' && account?.upload_enabled) {
        setNextStep('Your intake is open.', 'Upload COIs.', 'upload.html');
      } else {
        setNextStep('We will enable document intake after confirming your founding membership. Contact', 'hello@coicomply.com.', 'mailto:hello@coicomply.com');
      }
    }

    filesUploaded.textContent = uploadError ? 'Unavailable' : String(uploadsCount || 0);
  });
})();
