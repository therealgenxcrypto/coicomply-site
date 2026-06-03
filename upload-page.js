(() => {
  const supabase = window.coiSupabase;
  const dropzone = document.getElementById('uploadDropzone');
  const status = document.getElementById('uploadStatus');
  const toast = document.getElementById('toast');
  const logout = document.getElementById('logoutButton');

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

  logout?.addEventListener('click', async () => {
    await supabase.auth.signOut({ scope: 'local' });
    window.location.href = 'index.html';
  });

  const openUploadcareDialog = async () => {
    if (!window.uploadcare) {
      status.textContent = 'Upload service is still loading. Try again in a moment.';
      return;
    }
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      window.location.href = 'auth.html?mode=signin&next=upload.html';
      return;
    }

    const dialog = window.uploadcare.openDialog(null, {
      multiple: true,
      multipleMax: 10,
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

        const payload = files.map((f) => ({
          user_id: data.user.id,
          uploadcare_cdn_url: f.cdn_url,
          filename: f.original_filename,
          size_bytes: f.size_bytes,
          source: 'uploadcare',
        }));

        const { error } = await supabase.from('document_uploads').insert(payload);
        if (error) {
          status.textContent = `Upload saved by provider, but account link failed: ${error.message}`;
          return;
        }

        status.innerHTML = `<strong>${files.length} file${files.length === 1 ? '' : 's'} linked to your account.</strong><br>We will use these for your compliance review.`;
        showToast('Files uploaded and linked to your account.');
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
})();
