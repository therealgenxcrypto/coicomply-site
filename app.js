(() => {
  const supabase = window.coiSupabase;
  const navUploadButton = document.getElementById('navUploadButton');
  const modal = document.getElementById('uploadModal');
  const dropzone = document.getElementById('uploadDropzone');
  const uploadStatus = document.getElementById('uploadStatus');
  const toast = document.getElementById('toast');
  const mobileMenuToggle = document.getElementById('mobileMenuToggle');
  const mobileMenu = document.getElementById('mobileMenu');

  let auditRequested = true;
  let lastFocus = null;
  let activeUserId = null;
  let uploadCount = 0;

  const TRIAL_LIMIT = 10;
  const remainingUploads = () => Math.max(TRIAL_LIMIT - uploadCount, 0);

  const showToast = (message) => {
    toast.textContent = message;
    toast.hidden = false;
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => { toast.hidden = true; }, 5200);
  };

  const setMobileMenu = (isOpen) => {
    if (!mobileMenu || !mobileMenuToggle) return;
    mobileMenu.hidden = !isOpen;
    mobileMenuToggle.setAttribute('aria-expanded', String(isOpen));
    document.body.classList.toggle('mobile-menu-open', isOpen);
  };

  const openUploadModal = () => {
    if (!activeUserId) {
      window.location.href = 'auth.html?mode=signin&next=index.html';
      return;
    }
    if (remainingUploads() === 0) {
      uploadStatus.textContent = 'Your initial upload limit has been reached. We will review the documents already received and confirm the next intake step.';
      showToast('Your initial upload limit has already been reached.');
      return;
    }
    if (!auditRequested) {
      document.getElementById('pricing').scrollIntoView({ behavior: 'smooth', block: 'start' });
      showToast('Sign in to your client account to upload COIs.');
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
    const remaining = remainingUploads();
    if (remaining === 0) {
      uploadStatus.textContent = 'Your initial upload limit has been reached. We will review the documents already received and confirm the next intake step.';
      return;
    }

    const dialog = window.uploadcare.openDialog(null, {
      multiple: true,
      multipleMax: remaining,
      imagesOnly: false,
      tabs: 'file gdrive dropbox',
    });

    uploadStatus.textContent = 'Waiting for files…';

    dialog.done((fileGroup) => {
      fileGroup.promise().done(async (groupInfo) => {
        const urls = (groupInfo.files || []).map((file) => file.cdnUrl).filter(Boolean);
        if (urls.length > remaining) {
          uploadStatus.textContent = `Please upload no more than ${remaining} file${remaining === 1 ? '' : 's'} for the remaining initial upload allowance.`;
          return;
        }
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
            uploadStatus.textContent = error.message.toLowerCase().includes('free trial upload limit')
              ? 'Your initial upload limit has been reached. We will review the documents already received and confirm the next intake step.'
              : `Upload provider succeeded but account association failed: ${error.message}`;
            return;
          }
          uploadCount += urls.length;
          window.localStorage.setItem('coi_last_upload_confirmation', JSON.stringify({
            count: urls.length,
            files: payload,
            created_at: new Date().toISOString(),
          }));
        }
        uploadStatus.innerHTML = `<strong>${urls.length} file${urls.length === 1 ? '' : 's'} received.</strong><br>Opening your confirmation receipt...`;
        showToast('Files received. Confirmation email setup will be connected before launch.');
        closeUploadModal();
        window.location.href = `confirmation.html?files=${urls.length}`;
      });
    });

    dialog.fail(() => {
      uploadStatus.textContent = 'Upload cancelled. No files were sent.';
    });
  };

  navUploadButton?.addEventListener('click', openUploadModal);
  mobileMenuToggle?.addEventListener('click', () => {
    setMobileMenu(mobileMenu?.hidden);
  });
  mobileMenu?.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => setMobileMenu(false));
  });
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
    if (event.key === 'Escape') setMobileMenu(false);
  });

  if (supabase) {
    const refreshUploadCount = async () => {
      if (!activeUserId) return;
      const { count } = await supabase
        .from('document_uploads')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', activeUserId);
      uploadCount = count || 0;
    };

    supabase.auth.getUser().then(async ({ data }) => {
      activeUserId = data.user?.id || null;
      if (!activeUserId) return;
      await refreshUploadCount();
      navUploadButton.hidden = false;
    });
    supabase.auth.onAuthStateChange(async (_event, session) => {
      activeUserId = session?.user?.id || null;
      if (!activeUserId) {
        uploadCount = 0;
        navUploadButton.hidden = true;
        return;
      }
      await refreshUploadCount();
      navUploadButton.hidden = false;
    });
  }
})();
