/**
 * auth-gate.js — Client-side authentication gate
 * SHA-256 hash comparison + sessionStorage session
 * Defence-in-depth: UI gate (this) + Gateway bearer token (real API protection)
 *
 * To change credentials:
 *   1. echo -n "username:password" | shasum -a 256
 *   2. Replace CREDENTIAL_HASH below
 */
const AuthGate = {
  // SHA-256 of "username:password" — default: admin:hdsmarter2026!
  CREDENTIAL_HASH: '2474ff7aa409927fdf3b02548969b81ab3d212ea9c0f0efd546159177b67bbf6',
  SESSION_KEY: 'hdsmarter-auth-session',
  IDLE_TIMEOUT_MS: 30 * 60 * 1000, // 30 minutes

  _overlay: null,
  _idleTimer: null,

  isAuthenticated() {
    const session = sessionStorage.getItem(this.SESSION_KEY);
    if (!session) return false;
    try {
      const { hash, ts } = JSON.parse(session);
      if (hash !== this.CREDENTIAL_HASH) return false;
      if (Date.now() - ts > this.IDLE_TIMEOUT_MS) {
        sessionStorage.removeItem(this.SESSION_KEY);
        return false;
      }
      return true;
    } catch {
      return false;
    }
  },

  _refreshSession() {
    const session = sessionStorage.getItem(this.SESSION_KEY);
    if (session) {
      try {
        const data = JSON.parse(session);
        data.ts = Date.now();
        sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(data));
      } catch { /* ignore */ }
    }
  },

  _startIdleWatch() {
    const reset = () => {
      this._refreshSession();
      clearTimeout(this._idleTimer);
      this._idleTimer = setTimeout(() => this.logout(), this.IDLE_TIMEOUT_MS);
    };
    for (const evt of ['mousedown', 'keydown', 'touchstart', 'scroll']) {
      document.addEventListener(evt, reset, { passive: true });
    }
    reset();
  },

  async _sha256(text) {
    const data = new TextEncoder().encode(text);
    const buf = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  },

  _build() {
    const T = {
      title: I18n.t('auth.title'),
      userLabel: I18n.t('auth.userLabel'),
      passLabel: I18n.t('auth.passLabel'),
      loginBtn: I18n.t('auth.loginBtn'),
      error: I18n.t('auth.error'),
    };

    this._overlay = document.createElement('div');
    this._overlay.className = 'auth-overlay';
    this._overlay.setAttribute('role', 'dialog');
    this._overlay.setAttribute('aria-label', T.title);

    const box = document.createElement('div');
    box.className = 'auth-box';

    const logo = document.createElement('div');
    logo.className = 'auth-logo';
    logo.textContent = '\u26A1 HD Smarter \u5929\u4F7F';

    const titleEl = document.createElement('div');
    titleEl.className = 'auth-title';
    titleEl.textContent = T.title;

    const form = document.createElement('form');
    form.className = 'auth-form';
    form.addEventListener('submit', (e) => { e.preventDefault(); this._handleLogin(); });

    const userGroup = document.createElement('div');
    userGroup.className = 'auth-field';
    const userLabel = document.createElement('label');
    userLabel.textContent = T.userLabel;
    this._userInput = document.createElement('input');
    this._userInput.type = 'text';
    this._userInput.className = 'auth-input';
    this._userInput.autocomplete = 'username';
    this._userInput.setAttribute('aria-label', T.userLabel);
    userGroup.appendChild(userLabel);
    userGroup.appendChild(this._userInput);

    const passGroup = document.createElement('div');
    passGroup.className = 'auth-field';
    const passLabel = document.createElement('label');
    passLabel.textContent = T.passLabel;
    this._passInput = document.createElement('input');
    this._passInput.type = 'password';
    this._passInput.className = 'auth-input';
    this._passInput.autocomplete = 'current-password';
    this._passInput.setAttribute('aria-label', T.passLabel);
    passGroup.appendChild(passLabel);
    passGroup.appendChild(this._passInput);

    this._errorEl = document.createElement('div');
    this._errorEl.className = 'auth-error';
    this._errorEl.textContent = T.error;

    this._loginBtn = document.createElement('button');
    this._loginBtn.type = 'submit';
    this._loginBtn.className = 'auth-btn';
    this._loginBtn.textContent = T.loginBtn;

    form.appendChild(userGroup);
    form.appendChild(passGroup);
    form.appendChild(this._errorEl);
    form.appendChild(this._loginBtn);

    box.appendChild(logo);
    box.appendChild(titleEl);
    box.appendChild(form);
    this._overlay.appendChild(box);
    document.body.appendChild(this._overlay);

    // Focus username input
    setTimeout(() => this._userInput.focus(), 100);
  },

  async _handleLogin() {
    const user = this._userInput.value.trim();
    const pass = this._passInput.value;
    if (!user || !pass) return;

    this._loginBtn.disabled = true;
    this._loginBtn.textContent = '...';
    this._errorEl.classList.remove('visible');

    const hash = await this._sha256(user + ':' + pass);

    if (hash === this.CREDENTIAL_HASH) {
      sessionStorage.setItem(this.SESSION_KEY, JSON.stringify({ hash, ts: Date.now() }));
      this._overlay.classList.add('auth-fade-out');
      setTimeout(() => {
        this._overlay.remove();
        this._onSuccess();
      }, 300);
    } else {
      this._errorEl.classList.add('visible');
      this._loginBtn.disabled = false;
      this._loginBtn.textContent = I18n.t('auth.loginBtn');
      this._passInput.value = '';
      this._passInput.focus();
    }
  },

  logout() {
    sessionStorage.removeItem(this.SESSION_KEY);
    location.reload();
  },

  /**
   * Main entry — call with a callback that initializes the app.
   * If already authenticated, calls it immediately; otherwise shows login.
   */
  guard(onSuccess) {
    this._onSuccess = onSuccess;
    if (this.isAuthenticated()) {
      this._refreshSession();
      this._startIdleWatch();
      onSuccess();
    } else {
      this._build();
      this._onSuccess = () => {
        this._startIdleWatch();
        onSuccess();
      };
    }
  },
};
