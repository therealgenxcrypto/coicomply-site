(() => {
  const supabase = window.coiSupabase;
  const dropzone = document.getElementById('uploadDropzone');
  const status = document.getElementById('uploadStatus');
  const toast = document.getElementById('toast');
  const logout = document.getElementById('logoutButton');
  const intakeBatchCount = document.getElementById('trialRemainingCount');
  const intakeUsageText = document.getElementById('trialUsageText');

  const BATCH_LIMIT = 10;
  let currentUser = null;
  let uploadCount = 0;

  const showToast = (message) => {
    toast.textContent = message;
    toast.hidden = false;
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => { toast.hidden = true; }, 5200);
  };

  if (!supabase) {
    status.textContent = 'Account service is not configured.';
    return;
  }

  const renderIntakeState = () => {
    intakeBatchCount.textContent = `Up to ${BATCH_LIMIT} files per upload`;
    intakeUsageText.textContent = `${uploadCount} file${uploadCount === 1 ? '' : 's'} currently linked to your account.`;
    dropzone.classList.remove('is-disabled');
    status.textContent = 'Ready for your next document batch.';
  };

  const refreshUploadCount = async () => {
    if (!currentUser) return;
    const { count, error } = await supabase
      .from('document_uploads')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', currentUser.id);

    if (error) {
      status.textContent = 'Could not load your document intake status.';
      return;
    }

    uploadCount = count || 0;
    renderIntakeState();
  };

  const getUploadAuthorization = async () => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error('Authentication required.');

    const response = await fetch('/api/upload/signature', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error || 'Secure upload is not available.');
    }
    return response.json();
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

    dropzone.classList.add('is-disabled');
    status.textContent = 'Authorizing secure upload...';

    let authorization;
    try {
      authorization = await getUploadAuthorization();
    } catch (error) {
      dropzone.classList.remove('is-disabled');
      status.textContent = error.message;
      return;
    }

    const dialog = window.uploadcare.openDialog(null, {
      publicKey: authorization.publicKey,
      secureSignature: authorization.secureSignature,
      secureExpire: authorization.secureExpire,
      multiple: true,
      multipleMax: BATCH_LIMIT,
      imagesOnly: false,
      tabs: 'file gdrive dropbox',
    });

    status.textContent = 'Waiting for files...';

    dialog.done((fileGroup) => {
      fileGroup.promise().done(async (groupInfo) => {
        const files = (groupInfo.files || []).map((file) => ({
          uploadcare_uuid: file.uuid || null,
          filename: file.name || null,
          mime_type: file.mimeType || null,
          size_bytes: file.size || null,
        })).filter((file) => file.uploadcare_uuid);

        if (!files.length) {
          dropzone.classList.remove('is-disabled');
          status.textContent = 'No files were received.';
          return;
        }

        const payload = files.map((file) => ({
          user_id: currentUser.id,
          uploadcare_uuid: file.uploadcare_uuid,
          uploadcare_cdn_url: null,
          filename: file.filename,
          mime_type: file.mime_type,
          size_bytes: file.size_bytes,
          source: 'signed_uploadcare',
          status: 'received',
        }));

        const { error } = await supabase.from('document_uploads').insert(payload);
        if (error) {
          dropzone.classList.remove('is-disabled');
          status.textContent = 'Files reached secure intake, but account registration needs attention. Please contact COIComply.';
          return;
        }

        uploadCount += files.length;
        window.localStorage.setItem('coi_last_upload_confirmation', JSON.stringify({
          count: files.length,
          files: files.map((file) => ({
            filename: file.filename,
            size_bytes: file.size_bytes,
          })),
          created_at: new Date().toISOString(),
        }));

        status.innerHTML = `<strong>${files.length} file${files.length === 1 ? '' : 's'} linked to your account.</strong><br>Opening your confirmation receipt...`;
        showToast('Files uploaded and linked to your account.');
        window.location.href = `confirmation.html?files=${files.length}`;
      });
    });

    dialog.fail(() => {
      dropzone.classList.remove('is-disabled');
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
