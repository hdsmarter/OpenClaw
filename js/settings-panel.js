/**
 * settings-panel.js — Settings modal (SRP)
 * Language selector, quad-mode chat (Telegram/Gateway/OpenRouter/Gateway API), connection settings
 * All strings via I18n.t() — zero hardcoded text
 */
class SettingsPanel {
  static get UI_TEXT() {
    return {
      title:             I18n.t('settings.title'),
      langLabel:         I18n.t('settings.langLabel'),
      chatModeLabel:     I18n.t('settings.chatModeLabel'),
      chatModeTg:        I18n.t('settings.chatModeTg'),
      chatModeGw:        I18n.t('settings.chatModeGw'),
      chatModeOr:        I18n.t('settings.chatModeOr'),
      chatModeGwApi:     I18n.t('settings.chatModeGwApi'),
      gwApiUrlLabel:     I18n.t('settings.gwApiUrlLabel'),
      gwApiUrlPlaceholder: I18n.t('settings.gwApiUrlPlaceholder'),
      gwApiTokenLabel:   I18n.t('settings.gwApiTokenLabel'),
      gwApiModelLabel:   I18n.t('settings.gwApiModelLabel'),
      urlLabel:          I18n.t('settings.urlLabel'),
      urlPlaceholder:    I18n.t('settings.urlPlaceholder'),
      tokenLabel:        I18n.t('settings.tokenLabel'),
      tokenPlaceholder:  I18n.t('settings.tokenPlaceholder'),
      tgTokenLabel:      I18n.t('settings.tgTokenLabel'),
      tgChatIdLabel:     I18n.t('settings.tgChatIdLabel'),
      orApiKeyLabel:     I18n.t('settings.orApiKeyLabel'),
      orModelLabel:      I18n.t('settings.orModelLabel'),
      orApiKeyPlaceholder: I18n.t('settings.orApiKeyPlaceholder'),
      testBtn:           I18n.t('settings.testBtn'),
      saveBtn:           I18n.t('settings.saveBtn'),
      cancelBtn:         I18n.t('settings.cancelBtn'),
      testing:           I18n.t('settings.testing'),
      testOk:            I18n.t('settings.testOk'),
      testFail:          I18n.t('settings.testFail'),
      statusConnected:   I18n.t('settings.statusConnected'),
      statusConnecting:  I18n.t('settings.statusConnecting'),
      statusDisconnected: I18n.t('settings.statusDisconnected'),
    };
  }

  constructor(chatClient) {
    this.cc = chatClient;
    this.isOpen = false;
    this._build();

    I18n.onChange(() => this._updateTexts());
  }

  _build() {
    const T = SettingsPanel.UI_TEXT;

    // Overlay
    this.overlay = document.createElement('div');
    this.overlay.className = 'settings-overlay';
    this.overlay.addEventListener('click', () => this.close());

    // Modal
    this.modal = document.createElement('div');
    this.modal.className = 'settings-modal';
    this.modal.setAttribute('role', 'dialog');
    this.modal.setAttribute('aria-label', T.title);

    // Title
    this.titleEl = document.createElement('h2');
    this.titleEl.className = 'settings-title';
    this.titleEl.textContent = T.title;
    this.modal.appendChild(this.titleEl);

    // ── Language selector ────────────────────────
    this.langGroup = document.createElement('div');
    this.langGroup.className = 'settings-field';
    this.langLabel = document.createElement('label');
    this.langLabel.textContent = T.langLabel;
    this.langSelect = document.createElement('select');
    this.langSelect.className = 'settings-input settings-select';
    this.langSelect.setAttribute('aria-label', T.langLabel);
    const langOptions = [
      { value: 'zh-TW', label: '\u7E41\u9AD4\u4E2D\u6587' },
      { value: 'zh-CN', label: '\u7B80\u4F53\u4E2D\u6587' },
      { value: 'en',    label: 'English' },
    ];
    for (const opt of langOptions) {
      const o = document.createElement('option');
      o.value = opt.value;
      o.textContent = opt.label;
      this.langSelect.appendChild(o);
    }
    this.langSelect.value = I18n.lang;
    this.langGroup.appendChild(this.langLabel);
    this.langGroup.appendChild(this.langSelect);
    this.modal.appendChild(this.langGroup);

    // ── Chat mode selector ──────────────────────
    this.modeGroup = document.createElement('div');
    this.modeGroup.className = 'settings-field';
    this.modeLabel = document.createElement('label');
    this.modeLabel.textContent = T.chatModeLabel;
    this.modeSelect = document.createElement('select');
    this.modeSelect.className = 'settings-input settings-select';
    this.modeSelect.setAttribute('aria-label', T.chatModeLabel);
    this._tgOption = document.createElement('option');
    this._tgOption.value = 'telegram';
    this._tgOption.textContent = T.chatModeTg;
    this._gwOption = document.createElement('option');
    this._gwOption.value = 'gateway';
    this._gwOption.textContent = T.chatModeGw;
    this._orOption = document.createElement('option');
    this._orOption.value = 'openrouter';
    this._orOption.textContent = T.chatModeOr;
    this._gwApiOption = document.createElement('option');
    this._gwApiOption.value = 'gateway-api';
    this._gwApiOption.textContent = T.chatModeGwApi;
    this.modeSelect.appendChild(this._tgOption);
    this.modeSelect.appendChild(this._gwOption);
    this.modeSelect.appendChild(this._orOption);
    this.modeSelect.appendChild(this._gwApiOption);
    this.modeSelect.value = this.cc.mode;
    this.modeSelect.addEventListener('change', () => this._toggleModeFields());
    this.modeGroup.appendChild(this.modeLabel);
    this.modeGroup.appendChild(this.modeSelect);
    this.modal.appendChild(this.modeGroup);

    // ── Telegram fields ─────────────────────────
    this.tgFieldsContainer = document.createElement('div');
    this.tgFieldsContainer.className = 'settings-mode-fields';

    this._addFieldTo(this.tgFieldsContainer, T.tgTokenLabel, 'tg-token');
    this.tgTokenInput = this.tgFieldsContainer.querySelector('.settings-input-tg-token');
    this.tgTokenInput.value = this.cc.tgToken;

    this._addFieldTo(this.tgFieldsContainer, T.tgChatIdLabel, 'tg-chat-id');
    this.tgChatIdInput = this.tgFieldsContainer.querySelector('.settings-input-tg-chat-id');
    this.tgChatIdInput.value = this.cc.tgChatId;

    this.modal.appendChild(this.tgFieldsContainer);

    // ── Gateway fields ──────────────────────────
    this.gwFieldsContainer = document.createElement('div');
    this.gwFieldsContainer.className = 'settings-mode-fields';

    this._addFieldTo(this.gwFieldsContainer, T.urlLabel, 'url');
    this.urlInput = this.gwFieldsContainer.querySelector('.settings-input-url');
    this.urlInput.placeholder = T.urlPlaceholder;
    this.urlInput.value = this.cc.url;

    this._addFieldTo(this.gwFieldsContainer, T.tokenLabel, 'token');
    this.tokenInput = this.gwFieldsContainer.querySelector('.settings-input-token');
    this.tokenInput.placeholder = T.tokenPlaceholder;
    this.tokenInput.type = 'password';
    this.tokenInput.value = this.cc.token;

    this.modal.appendChild(this.gwFieldsContainer);

    // ── OpenRouter fields ───────────────────────
    this.orFieldsContainer = document.createElement('div');
    this.orFieldsContainer.className = 'settings-mode-fields';

    this._addFieldTo(this.orFieldsContainer, T.orApiKeyLabel, 'or-api-key');
    this.orApiKeyInput = this.orFieldsContainer.querySelector('.settings-input-or-api-key');
    this.orApiKeyInput.placeholder = T.orApiKeyPlaceholder;
    this.orApiKeyInput.type = 'password';
    this.orApiKeyInput.value = this.cc.orApiKey;
    this.orApiKeyInput.autocomplete = 'off';

    this._addFieldTo(this.orFieldsContainer, T.orModelLabel, 'or-model');
    this.orModelInput = this.orFieldsContainer.querySelector('.settings-input-or-model');
    this.orModelInput.value = this.cc.orModel;
    this.orModelInput.placeholder = ChatClient.DEFAULTS.openRouterModel;

    this.modal.appendChild(this.orFieldsContainer);

    // ── Gateway API fields ───────────────────────
    this.gwApiFieldsContainer = document.createElement('div');
    this.gwApiFieldsContainer.className = 'settings-mode-fields';

    this._addFieldTo(this.gwApiFieldsContainer, T.gwApiUrlLabel, 'gw-api-url');
    this.gwApiUrlInput = this.gwApiFieldsContainer.querySelector('.settings-input-gw-api-url');
    this.gwApiUrlInput.placeholder = T.gwApiUrlPlaceholder;
    this.gwApiUrlInput.value = this.cc.gwApiUrl;

    this._addFieldTo(this.gwApiFieldsContainer, T.gwApiTokenLabel, 'gw-api-token');
    this.gwApiTokenInput = this.gwApiFieldsContainer.querySelector('.settings-input-gw-api-token');
    this.gwApiTokenInput.type = 'password';
    this.gwApiTokenInput.value = this.cc.gwApiToken;

    this._addFieldTo(this.gwApiFieldsContainer, T.gwApiModelLabel, 'gw-api-model');
    this.gwApiModelInput = this.gwApiFieldsContainer.querySelector('.settings-input-gw-api-model');
    this.gwApiModelInput.value = this.cc.gwApiModel;
    this.gwApiModelInput.placeholder = ChatClient.DEFAULTS.gwApiModel;

    this.modal.appendChild(this.gwApiFieldsContainer);

    // Status indicator
    this.statusEl = document.createElement('div');
    this.statusEl.className = 'settings-status';
    this.statusEl.setAttribute('aria-live', 'polite');
    this.modal.appendChild(this.statusEl);

    // Buttons row
    const btnRow = document.createElement('div');
    btnRow.className = 'settings-buttons';

    this.testBtn = document.createElement('button');
    this.testBtn.className = 'settings-btn settings-btn-test';
    this.testBtn.textContent = T.testBtn;
    this.testBtn.addEventListener('click', () => this._testConnection());

    this.saveBtn = document.createElement('button');
    this.saveBtn.className = 'settings-btn settings-btn-save';
    this.saveBtn.textContent = T.saveBtn;
    this.saveBtn.addEventListener('click', () => this._save());

    this.cancelBtn = document.createElement('button');
    this.cancelBtn.className = 'settings-btn settings-btn-cancel';
    this.cancelBtn.textContent = T.cancelBtn;
    this.cancelBtn.addEventListener('click', () => this.close());

    this.logoutBtn = document.createElement('button');
    this.logoutBtn.className = 'settings-btn-logout';
    this.logoutBtn.textContent = I18n.t('auth.logoutBtn');
    this.logoutBtn.addEventListener('click', () => AuthGate.logout());

    btnRow.appendChild(this.logoutBtn);
    btnRow.appendChild(this.testBtn);
    btnRow.appendChild(this.cancelBtn);
    btnRow.appendChild(this.saveBtn);
    this.modal.appendChild(btnRow);

    document.body.appendChild(this.overlay);
    document.body.appendChild(this.modal);

    this._toggleModeFields();
  }

  _addFieldTo(container, label, name) {
    const group = document.createElement('div');
    group.className = 'settings-field';
    const lbl = document.createElement('label');
    lbl.textContent = label;
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'settings-input settings-input-' + name;
    input.setAttribute('aria-label', label);
    group.appendChild(lbl);
    group.appendChild(input);
    container.appendChild(group);
  }

  _toggleModeFields() {
    const mode = this.modeSelect.value;
    this.tgFieldsContainer.style.display = mode === 'telegram' ? 'block' : 'none';
    this.gwFieldsContainer.style.display = mode === 'gateway' ? 'block' : 'none';
    this.orFieldsContainer.style.display = mode === 'openrouter' ? 'block' : 'none';
    this.gwApiFieldsContainer.style.display = mode === 'gateway-api' ? 'block' : 'none';
  }

  _updateTexts() {
    const T = SettingsPanel.UI_TEXT;
    this.titleEl.textContent = T.title;
    this.modal.setAttribute('aria-label', T.title);
    this.langLabel.textContent = T.langLabel;
    this.modeLabel.textContent = T.chatModeLabel;
    this._tgOption.textContent = T.chatModeTg;
    this._gwOption.textContent = T.chatModeGw;
    this._orOption.textContent = T.chatModeOr;
    this._gwApiOption.textContent = T.chatModeGwApi;
    this.testBtn.textContent = T.testBtn;
    this.saveBtn.textContent = T.saveBtn;
    this.cancelBtn.textContent = T.cancelBtn;
    this.logoutBtn.textContent = I18n.t('auth.logoutBtn');
    this._updateStatus();
  }

  open() {
    this.isOpen = true;
    this.langSelect.value = I18n.lang;
    this.modeSelect.value = this.cc.mode;
    this.urlInput.value = this.cc.url;
    this.tokenInput.value = this.cc.token;
    this.tgTokenInput.value = this.cc.tgToken;
    this.tgChatIdInput.value = this.cc.tgChatId;
    this.orApiKeyInput.value = this.cc.orApiKey;
    this.orModelInput.value = this.cc.orModel;
    this.gwApiUrlInput.value = this.cc.gwApiUrl;
    this.gwApiTokenInput.value = this.cc.gwApiToken;
    this.gwApiModelInput.value = this.cc.gwApiModel;
    this._toggleModeFields();
    this._updateStatus();
    this.overlay.classList.add('open');
    this.modal.classList.add('open');
  }

  close() {
    this.isOpen = false;
    this.overlay.classList.remove('open');
    this.modal.classList.remove('open');
  }

  _updateStatus() {
    const T = SettingsPanel.UI_TEXT;
    const map = {
      connected: T.statusConnected,
      connecting: T.statusConnecting,
      disconnected: T.statusDisconnected,
    };
    this.statusEl.textContent = map[this.cc.state] || T.statusDisconnected;
    this.statusEl.className = 'settings-status settings-status-' + this.cc.state;
  }

  async _testConnection() {
    const T = SettingsPanel.UI_TEXT;
    this.testBtn.textContent = T.testing;
    this.testBtn.disabled = true;

    let ok;
    const mode = this.modeSelect.value;
    if (mode === 'telegram') {
      ok = await this.cc.testConnection({ mode: 'telegram', tgToken: this.tgTokenInput.value });
    } else if (mode === 'openrouter') {
      ok = await this.cc.testConnection({
        mode: 'openrouter',
        orApiKey: this.orApiKeyInput.value,
        orModel: this.orModelInput.value || ChatClient.DEFAULTS.openRouterModel,
      });
    } else if (mode === 'gateway-api') {
      ok = await this.cc.testConnection({
        mode: 'gateway-api',
        gwApiUrl: this.gwApiUrlInput.value,
        gwApiToken: this.gwApiTokenInput.value,
        gwApiModel: this.gwApiModelInput.value || ChatClient.DEFAULTS.gwApiModel,
      });
    } else {
      ok = await this.cc.testConnection({ mode: 'gateway', url: this.urlInput.value, token: this.tokenInput.value });
    }

    this.testBtn.textContent = ok ? T.testOk : T.testFail;
    this.testBtn.disabled = false;
    setTimeout(() => { this.testBtn.textContent = SettingsPanel.UI_TEXT.testBtn; }, 2000);
  }

  _save() {
    I18n.setLang(this.langSelect.value);

    this.cc.disconnect();
    this.cc.saveSettings({
      mode: this.modeSelect.value,
      url: this.urlInput.value,
      token: this.tokenInput.value,
      tgToken: this.tgTokenInput.value,
      tgChatId: this.tgChatIdInput.value,
      orApiKey: this.orApiKeyInput.value,
      orModel: this.orModelInput.value || ChatClient.DEFAULTS.openRouterModel,
      gwApiUrl: this.gwApiUrlInput.value,
      gwApiToken: this.gwApiTokenInput.value,
      gwApiModel: this.gwApiModelInput.value || ChatClient.DEFAULTS.gwApiModel,
    });
    this.cc.connect();
    this.close();
  }
}
