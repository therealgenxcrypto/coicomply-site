(() => {
  const supabase = window.coiSupabase;
  const summary = document.getElementById('confirmationSummary');
  const filesContainer = document.getElementById('confirmationFiles');
  const emailStatus = document.getElementById('emailStatus');

  const stored = window.localStorage.getItem('coi_last_upload_confirmation');
  const confirmation = stored ? JSON.parse(stored) : null;

  const renderFiles = (files) => {
    if (!files?.length) {
      filesContainer.innerHTML = '<p class="form-note">No file details were available for this receipt.</p>';
      return;
    }
    filesContainer.innerHTML = files.map((file) => {
      const name = file.filename || 'Uploaded document';
      const size = file.size_bytes ? `${Math.ceil(file.size_bytes / 1024)} KB` : 'Size unavailable';
      return `<div class="confirmation-file"><strong>${name}</strong><span>${size}</span></div>`;
    }).join('');
  };

  if (!supabase) {
    summary.textContent = 'Supabase is not configured.';
    emailStatus.textContent = 'Confirmation email cannot be sent until Supabase is configured.';
    return;
  }

  supabase.auth.getUser().then(async ({ data, error }) => {
    if (error || !data.user) {
      window.location.href = 'auth.html?mode=signin&next=confirmation.html';
      return;
    }

    const files = confirmation?.files || [];
    const count = Number(confirmation?.count || files.length || 0);
    const email = data.user.email || 'your account email';

    summary.textContent = `${count || 'Your'} file${count === 1 ? '' : 's'} were received and linked to ${email}.`;
    renderFiles(files);

    if (!window.COI_CONFIRMATION_EMAIL_ENABLED) {
      emailStatus.textContent = 'Your on-screen receipt is ready. Confirmation email setup is waiting on the email provider connection.';
      return;
    }

    emailStatus.textContent = 'Sending confirmation email...';
    const { error: emailError } = await supabase.functions.invoke('send-upload-confirmation', {
      body: { count, files },
    });

    emailStatus.textContent = emailError
      ? `Your receipt is ready, but the confirmation email could not be sent: ${emailError.message}`
      : `A confirmation email was sent to ${email}.`;
  });
})();
