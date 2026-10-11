/**
 * notifications.js - Lightweight notification system
 */
const Notifications = (() => {
  let container = null;

  function init() {
    container = document.getElementById('notifications');
    if (!container) {
      container = document.createElement('div');
      container.id = 'notifications';
      container.className = 'notifications';
      container.setAttribute('aria-live', 'polite');
      document.body.appendChild(container);
    }
  }

  const ICONS = {
    success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
    error: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
    warning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    info: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`
  };

  function show(type, title, message, duration = 4000) {
    if (!container) init();

    const el = document.createElement('div');
    el.className = `notification notification--${type}`;
    el.innerHTML = `
      <div class="notification__icon">${ICONS[type] || ICONS.info}</div>
      <div class="notification__content">
        <div class="notification__title"></div>
        ${message ? '<div class="notification__message"></div>' : ''}
      </div>
      <button class="notification__close" aria-label="Dismiss notification">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    `;
    el.querySelector('.notification__title').textContent = title;
    if (message) el.querySelector('.notification__message').textContent = message;

    const closeBtn = el.querySelector('.notification__close');
    closeBtn.addEventListener('click', () => dismiss(el));

    container.appendChild(el);

    if (duration > 0) {
      setTimeout(() => dismiss(el), duration);
    }

    return el;
  }

  function dismiss(el) {
    if (!el || !el.parentNode) return;
    el.classList.add('notification--exit');
    setTimeout(() => el.remove(), 200);
  }

  return {
    init,
    success: (title, msg, dur) => show('success', title, msg, dur),
    error:   (title, msg, dur) => show('error', title, msg, dur || 6000),
    warning: (title, msg, dur) => show('warning', title, msg, dur || 5000),
    info:    (title, msg, dur) => show('info', title, msg, dur),
  };
})();
