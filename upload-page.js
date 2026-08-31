(() => {
  const supabase = window.coiSupabase;
  const dropzone = document.getElementById('uploadDropzone');
  const status = document.getElementById('uploadStatus');
  const toast = document.getElementById('toast');
  const logout = document.getElementById('logoutButton');
  const trialRemainingCount = document.getElementById('trialRemainingCount');
  const trialUsageText = document.getElementById('trialUsageText');

  const TRIAL_LIMIT = 10;
  let currentUser = null;
  let uploadCount = 0;

  const showToast = (message) => {
    toast.textContent = message;
    toast.hidden = false;
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => { toast.hidden = true; }, 5200);
  };

  if (!supabase) {
    status.textContent = 'Supabase is not configured.';
    return;
  }

  const renderTrialState = () => {
    const remaining = Math.max(TRIAL_LIMIT - uploadCount, 0);
    trialRemainingCount.textContent = `${remaining} upload${remaining === 1 ? '' : 's'} remaining`;
    trialUsageText.textContent = `${Math.min(uploadCount, TRIAL_LIMIT)} of ${TRIAL_LIMIT} initial uploads used.`;
    if (remaining === 0) {
      dropzone.classList.add('is-disabled');
      status.textContent = 'Your initial upload limit has been reached. We will review the documents already received and confirm the next intake step.';
      return;
    }
    dropzone.classList.remove('is-disabled');
    status.textContent = `Ready for up to ${remaining} more file${remaining === 1 ? '' : 's'}.`;
  };

  const refreshUploadCount = async () => {
    if (!currentUser) return;
    const { count, error } = await supabase
      .from('document_uploads')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', currentUser.id);

    if (error) {
      status.textContent = `Could not load upload allowance: ${error.message}`;
      return;
    }

    uploadCount = count || 0;
    renderTrialState();
  };

  logout?.addEventListener('click', async () => {
    await supabase.auth.signOut({ scope: 'local' });
    window.location.href = 'index.html';
  });

  const openUploadcareDialog = async () => {
    if (!window.uploadcare) {
      status.textContent = 'Upload service is still loading. Try again in a moment.';
      return;
    }
    if (!currentUser) {
      window.location.href = 'auth.html?mode=signin&next=upload.html';
      return;
    }
    const remaining = Math.max(TRIAL_LIMIT - uploadCount, 0);
    if (remaining === 0) {
      renderTrialState();
      showToast('Your initial upload limit has already been reached.');
      return;
    }

    const dialog = window.uploadcare.openDialog(null, {
      multiple: true,
      multipleMax: remaining,
      imagesOnly: false,
      tabs: 'file gdrive dropbox',
    });

    status.textContent = 'Waiting for files...';

    dialog.done((fileGroup) => {
      fileGroup.promise().done(async (groupInfo) => {
        const files = (groupInfo.files || []).map((file) => ({
          cdn_url: file.cdnUrl,
          original_filename: file.name || null,
          size_bytes: file.size || null,
          uploaded_at: new Date().toISOString(),
        })).filter((file) => file.cdn_url);

        if (!files.length) {
          status.textContent = 'No files were received.';
          return;
        }

        if (files.length > remaining) {
          status.textContent = `Please upload no more than ${remaining} file${remaining === 1 ? '' : 's'} for the remaining initial upload allowance.`;
          return;
        }

        const payload = files.map((f) => ({
          user_id: currentUser.id,
          uploadcare_cdn_url: f.cdn_url,
          filename: f.original_filename,
          size_bytes: f.size_bytes,
          source: 'uploadcare',
        }));

        const { error } = await supabase.from('document_uploads').insert(payload);
        if (error) {
          const limitMessage = error.message.toLowerCase().includes('free trial upload limit')
            ? 'Your initial upload limit has been reached. We will review the documents already received and confirm the next intake step.'
            : `Upload saved by provider, but account link failed: ${error.message}`;
          status.textContent = limitMessage;
          return;
        }

        uploadCount += files.length;
        renderTrialState();
        window.localStorage.setItem('coi_last_upload_confirmation', JSON.stringify({
          count: files.length,
          files: payload,
          created_at: new Date().toISOString(),
        }));
        status.innerHTML = `<strong>${files.length} file${files.length === 1 ? '' : 's'} linked to your account.</strong><br>Opening your confirmation receipt...`;
        showToast('Files uploaded and linked to your account.');
        window.location.href = `confirmation.html?files=${files.length}`;
      });
    });

    dialog.fail(() => {
      status.textContent = 'Upload cancelled. No files were sent.';
    });
  };

  dropzone?.addEventListener('click', openUploadcareDialog);
  dropzone?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openUploadcareDialog();
    }
  });
  dropzone?.setAttribute('tabindex', '0');

  supabase.auth.getUser().then(async ({ data, error }) => {
    if (error || !data.user) {
      window.location.href = 'auth.html?mode=signin&next=upload.html';
      return;
    }
    currentUser = data.user;
    await refreshUploadCount();
  });
})();
