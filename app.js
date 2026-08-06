(() => {
  const root = document.documentElement;
  const languageButton = document.querySelector('[data-language-toggle]');
  const header = document.querySelector('[data-header]');
  const lightbox = document.querySelector('[data-lightbox]');
  const lightboxImage = document.querySelector('[data-lightbox-image]');
  const lightboxTitle = document.querySelector('[data-lightbox-title]');
  const lightboxDescription = document.querySelector('[data-lightbox-description]');

  setLanguage('en');

  languageButton?.addEventListener('click', () => {
    setLanguage(root.dataset.language === 'zh' ? 'en' : 'zh');
  });

  window.addEventListener('scroll', () => {
    header?.classList.toggle('is-scrolled', window.scrollY > 12);
  }, { passive: true });

  document.querySelectorAll('[data-gallery-item]').forEach((item) => {
    item.addEventListener('click', () => {
      const language = root.dataset.language === 'en' ? 'en' : 'zh';
      const title = item.dataset[language === 'en' ? 'titleEn' : 'titleZh'];
      const description = item.dataset[language === 'en' ? 'descEn' : 'descZh'];

      lightboxImage.src = item.dataset.image;
      lightboxImage.alt = title;
      lightboxTitle.textContent = title;
      lightboxDescription.textContent = description;

      if (typeof lightbox.showModal === 'function') {
        lightbox.showModal();
      } else {
        lightbox.setAttribute('open', '');
      }
    });
  });

  document.querySelector('[data-lightbox-close]')?.addEventListener('click', closeLightbox);
  lightbox?.addEventListener('click', (event) => {
    if (event.target === lightbox) closeLightbox();
  });

  function setLanguage(language) {
    root.dataset.language = language;
    root.lang = language === 'en' ? 'en' : 'zh-CN';
    languageButton?.setAttribute('aria-label', language === 'en' ? '切换到简体中文' : 'Switch to English');
  }

  function closeLightbox() {
    if (typeof lightbox.close === 'function') {
      lightbox.close();
    } else {
      lightbox.removeAttribute('open');
    }
  }
})();
