(() => {
  const supabase = window.coiSupabase;
  const summary = document.getElementById('confirmationSummary');
  const filesContainer = document.getElementById('confirmationFiles');
  const emailStatus = document.getElementById('emailStatus');

  let confirmation = null;
  try {
    const stored = window.localStorage.getItem('coi_last_upload_confirmation');
    confirmation = stored ? JSON.parse(stored) : null;
  } catch {
    confirmation = null;
  } finally {
    window.localStorage.removeItem('coi_last_upload_confirmation');
  }

  const renderFiles = (files) => {
    filesContainer.replaceChildren();
    if (!files?.length) {
      const note = document.createElement('p');
      note.className = 'form-note';
      note.textContent = 'No file details were available for this receipt.';
      filesContainer.append(note);
      return;
    }

    files.forEach((file) => {
      const item = document.createElement('div');
      item.className = 'confirmation-file';

      const name = document.createElement('strong');
      name.textContent = file.filename || 'Uploaded document';

      const size = document.createElement('span');
      size.textContent = file.size_bytes
        ? `${Math.ceil(Number(file.size_bytes) / 1024)} KB`
        : 'Size unavailable';

      item.append(name, size);
      filesContainer.append(item);
    });
  };

  if (!supabase) {
    summary.textContent = 'Account service is not configured.';
    emailStatus.textContent = 'Confirmation email is unavailable.';
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

    if (!window.COI_CONFIRMATION_EMAIL_ENABLED || !Number.isInteger(count) || count < 1) {
      emailStatus.textContent = 'Your on-screen receipt is ready.';
      return;
    }

    emailStatus.textContent = 'Sending confirmation email...';
    const { error: emailError } = await supabase.functions.invoke('send-upload-confirmation', {
      body: { count },
    });

    emailStatus.textContent = emailError
      ? 'Your receipt is ready, but the confirmation email could not be sent.'
      : `A confirmation email was sent to ${email}.`;
  });
})();
