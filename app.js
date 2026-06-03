(() => {
  const supabase = window.coiSupabase;
  const auditForm = document.getElementById('auditForm');
  const formSuccess = document.getElementById('formSuccess');
  const formLive = document.getElementById('formLive');
  const navUploadButton = document.getElementById('navUploadButton');
  const formUploadButton = document.getElementById('formUploadButton');
  const modal = document.getElementById('uploadModal');
  const dropzone = document.getElementById('uploadDropzone');
  const uploadStatus = document.getElementById('uploadStatus');
  const uploadedFileUrls = document.getElementById('uploadedFileUrls');
  const toast = document.getElementById('toast');

  let auditRequested = false;
  let lastFocus = null;
  let activeUserId = null;

  const showToast = (message) => {
    toast.textContent = message;
    toast.hidden = false;
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => { toast.hidden = true; }, 5200);
  };

  const enableUpload = () => {
    auditRequested = true;
    navUploadButton.hidden = false;
    navUploadButton.classList.add('is-live');
    formSuccess.hidden = false;
  };

  const openUploadModal = () => {
    if (!activeUserId) {
      window.location.href = 'auth.html?mode=signin&next=index.html';
      return;
    }
    if (!auditRequested) {
      document.getElementById('free-audit').scrollIntoView({ behavior: 'smooth', block: 'start' });
      showToast('Start with the audit request. Then upload your COIs.');
      return;
    }
    lastFocus = document.activeElement;
    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    window.setTimeout(() => dropzone.focus?.(), 0);
  };

  const closeUploadModal = () => {
    modal.hidden = true;
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
  };

  const openUploadcareDialog = () => {
    if (!window.uploadcare) {
      uploadStatus.textContent = 'Upload service is still loading. Try again in a moment.';
      return;
    }

    const dialog = window.uploadcare.openDialog(null, {
      multiple: true,
      multipleMax: 10,
      imagesOnly: false,
      tabs: 'file gdrive dropbox',
    });

    uploadStatus.textContent = 'Waiting for files…';

    dialog.done((fileGroup) => {
      fileGroup.promise().done(async (groupInfo) => {
        const urls = (groupInfo.files || []).map((file) => file.cdnUrl).filter(Boolean);
        if (supabase && activeUserId && urls.length) {
          const payload = (groupInfo.files || []).filter((file) => file.cdnUrl).map((file) => ({
            user_id: activeUserId,
            uploadcare_cdn_url: file.cdnUrl,
            filename: file.name || null,
            size_bytes: file.size || null,
            source: 'homepage_flow',
          }));
          const { error } = await supabase.from('document_uploads').insert(payload);
          if (error) {
            uploadStatus.textContent = `Upload provider succeeded but account association failed: ${error.message}`;
            return;
          }
        }
        uploadedFileUrls.value = urls.join('\n');
        uploadStatus.innerHTML = `<strong>${urls.length} file${urls.length === 1 ? '' : 's'} received.</strong><br>We’ll review your documents and email your sample report back.`;
        showToast('Files received. Confirmation email setup will be connected before launch.');
        closeUploadModal();
      });
    });

    dialog.fail(() => {
      uploadStatus.textContent = 'Upload cancelled. No files were sent.';
    });
  };

  auditForm?.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!auditForm.checkValidity()) {
      auditForm.reportValidity();
      return;
    }

    const formData = new FormData(auditForm);
    if (activeUserId) formData.set('supabase_user_id', activeUserId);
    const isConfigured = auditForm.action && !auditForm.action.includes('FORM_ID');

    formLive.textContent = 'Submitting audit request…';

    if (isConfigured) {
      try {
        const response = await fetch(auditForm.action, {
          method: 'POST',
          body: formData,
          headers: { Accept: 'application/json' },
        });
        if (!response.ok) throw new Error('Form submission failed');
      } catch (error) {
        formLive.textContent = 'Something went wrong. Please try again or email hello@coicomply.com.';
        showToast('Submission failed. Check the form endpoint before launch.');
        return;
      }
    }

    formLive.textContent = 'Audit request received. Upload is now available.';
    enableUpload();
    showToast('Audit request received. You can upload your COIs now.');
    openUploadModal();
  });

  navUploadButton?.addEventListener('click', openUploadModal);
  formUploadButton?.addEventListener('click', openUploadModal);
  dropzone?.addEventListener('click', openUploadcareDialog);
  dropzone?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openUploadcareDialog();
    }
  });
  dropzone?.setAttribute('tabindex', '0');

  document.querySelectorAll('[data-close-upload]').forEach((el) => el.addEventListener('click', closeUploadModal));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !modal.hidden) closeUploadModal();
  });

  if (supabase) {
    supabase.auth.getUser().then(({ data }) => {
      activeUserId = data.user?.id || null;
      if (!activeUserId) return;
      navUploadButton.hidden = false;
    });
    supabase.auth.onAuthStateChange((_event, session) => {
      activeUserId = session?.user?.id || null;
      if (!activeUserId) {
        navUploadButton.hidden = true;
        return;
      }
      navUploadButton.hidden = false;
    });
  }
})();
