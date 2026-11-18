(function (global) {
  'use strict';

  const S = global.DSBState;
  const UI_SETTINGS_KEY = 'doujin_schedule_ui_settings_v1';
  const SCROLL_SETTINGS_KEY = 'doujin_schedule_scroll_v1';

  const DEFAULT_UI_SETTINGS = {
    cudMode: false,
    fontSizeScale: 'normal', // 'small' | 'normal' | 'large'
    showTopInfoBar: true,
    urgentDays: 7,
    soonDays: 30,
    blinkNearDeadline: false,
    blinkFewDays: false,
    blinkHalfSec: 1.0, // 1秒点灯 / 1秒消灯 = 2.0秒周期
    ledBg: '#080a0c',
    ledParticipateText: '#ffffff',
    ledGreenText: '#3eff84',
    ledDeadlineText: '#3eff84',
    ledAmberText: '#ffb326',
    ledUrgentBg: '#ff9f1a',
    plannerText: '#1c2430',
    primaryColor: '#1d5bd6',
    unappliedAccent: '#22c55e',
    topBarBg: '#1c232d',
    topTodayBarColor: '#38bdf8',
    topMonthBarColor: '#3eff84',
    topDeadlineBarColor: '#ff9f1a',
    topMeterValColor: '#ffb326'
  };

  const CUD_PRESET_COLORS = {
    ledBg: '#080a0c',
    ledParticipateText: '#ffffff',
    ledGreenText: '#4dc4ff',
    ledDeadlineText: '#ff4b00',
    ledAmberText: '#f6aa00',
    ledUrgentBg: '#f6aa00',
    plannerText: '#111827',
    primaryColor: '#005aff',
    unappliedAccent: '#fff100',
    topBarBg: '#1c232d',
    topTodayBarColor: '#4dc4ff',
    topMonthBarColor: '#03af7a',
    topDeadlineBarColor: '#ff4b00',
    topMeterValColor: '#f6aa00'
  };

  const COLOR_SETTING_KEYS = Object.keys(CUD_PRESET_COLORS);

  const DEFAULT_SCROLL_SETTINGS = {
    enabled: false,
    text: '',
    speedSec: 16,
    color: '#ffb326'
  };

  let currentSettings = { ...DEFAULT_UI_SETTINGS };
  let scrollSettings = { ...DEFAULT_SCROLL_SETTINGS };

  function normalizeDaysSettings(settings) {
    const uRaw = parseInt(settings.urgentDays, 10);
    const u = Number.isNaN(uRaw) ? DEFAULT_UI_SETTINGS.urgentDays : Math.max(0, Math.min(365, uRaw));
    const sRaw = parseInt(settings.soonDays, 10);
    const s = Number.isNaN(sRaw) ? Math.max(u, DEFAULT_UI_SETTINGS.soonDays) : Math.max(u, Math.min(365, sRaw));
    settings.urgentDays = u;
    settings.soonDays = s;
  }

  function loadUiSettings() {
    try {
      const raw = localStorage.getItem(UI_SETTINGS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          currentSettings = { ...DEFAULT_UI_SETTINGS, ...parsed };
        }
      }
    } catch (e) {
      console.error('Failed to load UI settings:', e);
    }
    normalizeDaysSettings(currentSettings);
    applyUiSettings();
  }

  function saveUiSettings() {
    try {
      localStorage.setItem(UI_SETTINGS_KEY, JSON.stringify(currentSettings));
    } catch (e) {
      console.error('Failed to save UI settings:', e);
    }
  }

  function applyUiSettings() {
    const root = document.documentElement;
    const body = document.body;

    body.classList.toggle('cud-mode', Boolean(currentSettings.cudMode));
    body.classList.toggle('hide-top-info-bar', !currentSettings.showTopInfoBar);
    body.classList.toggle('blink-near-deadline', Boolean(currentSettings.blinkNearDeadline));
    body.classList.toggle('blink-few-days', Boolean(currentSettings.blinkFewDays));
    body.dataset.fontScale = currentSettings.fontSizeScale || 'normal';

    const halfSec = Math.min(3.0, Math.max(0.3, Number(currentSettings.blinkHalfSec) || 1.0));
    root.style.setProperty('--blink-cycle', `${(halfSec * 2).toFixed(2)}s`);
    root.style.setProperty('--custom-led-bg', currentSettings.ledBg);
    root.style.setProperty('--custom-led-participate', currentSettings.ledParticipateText);
    root.style.setProperty('--custom-led-green', currentSettings.ledGreenText);
    root.style.setProperty('--custom-led-deadline', currentSettings.ledDeadlineText);
    root.style.setProperty('--custom-led-amber', currentSettings.ledAmberText);
    root.style.setProperty('--custom-led-urgent-bg', currentSettings.ledUrgentBg);
    root.style.setProperty('--custom-planner-text', currentSettings.plannerText);
    root.style.setProperty('--custom-primary', currentSettings.primaryColor);
    root.style.setProperty('--custom-unapplied', currentSettings.unappliedAccent);
    root.style.setProperty('--custom-top-meter-bg', currentSettings.topBarBg);
    root.style.setProperty('--custom-fill-today', currentSettings.topTodayBarColor);
    root.style.setProperty('--custom-fill-month', currentSettings.topMonthBarColor);
    root.style.setProperty('--custom-fill-deadline', currentSettings.topDeadlineBarColor);
    root.style.setProperty('--custom-top-meter-val', currentSettings.topMeterValColor);
  }

  function syncSettingsForm() {
    const cudCheck = document.getElementById('ui-cud-mode');
    if (!cudCheck) return;

    cudCheck.checked = Boolean(currentSettings.cudMode);
    document.getElementById('ui-show-top-info-bar').checked = currentSettings.showTopInfoBar !== false;
    document.getElementById('ui-font-scale').value = currentSettings.fontSizeScale || 'normal';
    const urgentDays = Math.max(0, Number(currentSettings.urgentDays ?? 7));
    const soonDays = Math.max(urgentDays, Number(currentSettings.soonDays ?? 30));
    document.getElementById('ui-urgent-days').value = String(urgentDays);
    const soonEl = document.getElementById('ui-soon-days');
    soonEl.min = String(urgentDays);
    soonEl.value = String(soonDays);
    document.getElementById('ui-blink-deadline').checked = Boolean(currentSettings.blinkNearDeadline);
    document.getElementById('ui-blink-few-days').checked = Boolean(currentSettings.blinkFewDays);
    const halfSec = Math.min(3.0, Math.max(0.3, Number(currentSettings.blinkHalfSec) || 1.0));
    document.getElementById('ui-blink-speed').value = String(halfSec);
    document.getElementById('ui-blink-speed-label').textContent = `${halfSec.toFixed(1)}秒 / ${halfSec.toFixed(1)}秒`;
    document.getElementById('ui-led-bg').value = currentSettings.ledBg;
    document.getElementById('ui-led-participate').value = currentSettings.ledParticipateText;
    document.getElementById('ui-led-green').value = currentSettings.ledGreenText;
    document.getElementById('ui-led-deadline').value = currentSettings.ledDeadlineText;
    document.getElementById('ui-led-amber').value = currentSettings.ledAmberText;
    document.getElementById('ui-led-urgent-bg').value = currentSettings.ledUrgentBg;
    document.getElementById('ui-planner-text').value = currentSettings.plannerText;
    document.getElementById('ui-primary-color').value = currentSettings.primaryColor;
    document.getElementById('ui-unapplied-accent').value = currentSettings.unappliedAccent;
    document.getElementById('ui-top-meter-bg').value = currentSettings.topBarBg;
    document.getElementById('ui-fill-today').value = currentSettings.topTodayBarColor;
    document.getElementById('ui-fill-month').value = currentSettings.topMonthBarColor;
    document.getElementById('ui-fill-deadline').value = currentSettings.topDeadlineBarColor;
    document.getElementById('ui-top-meter-val').value = currentSettings.topMeterValColor;
  }

  function openUiSettingsModal() {
    syncSettingsForm();
    S.openDialog('modal-ui-settings');
  }

  function applyDefaultColorPalette() {
    COLOR_SETTING_KEYS.forEach((key) => {
      currentSettings[key] = DEFAULT_UI_SETTINGS[key];
    });
  }

  function resetUiSettings() {
    currentSettings.cudMode = false;
    applyDefaultColorPalette();
    saveUiSettings();
    applyUiSettings();
    syncSettingsForm();
    S.showToast('色調設定を初期値に戻しました');
  }

  function toggleCudMode(enabled) {
    currentSettings.cudMode = Boolean(enabled);
    if (enabled) {
      Object.assign(currentSettings, CUD_PRESET_COLORS);
    } else {
      applyDefaultColorPalette();
    }
    saveUiSettings();
    applyUiSettings();
    syncSettingsForm();
    S.showToast(enabled ? 'カラーユニバーサルデザイン（CUD）配色を適用しました' : '標準配色に切り替えました');
  }

  function updateSetting(key, value) {
    currentSettings[key] = value;
    saveUiSettings();
    applyUiSettings();
  }

  function getSettings() {
    return currentSettings;
  }

  function loadScrollSettings() {
    try {
      const raw = localStorage.getItem(SCROLL_SETTINGS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          scrollSettings = { ...DEFAULT_SCROLL_SETTINGS, ...parsed };
        }
      }
    } catch (e) {
      console.error('Failed to load scroll settings:', e);
    }
    applyScrollSettings();
  }

  function saveScrollSettings(nextSettings) {
    scrollSettings = { ...DEFAULT_SCROLL_SETTINGS, ...scrollSettings, ...nextSettings };
    try {
      localStorage.setItem(SCROLL_SETTINGS_KEY, JSON.stringify(scrollSettings));
    } catch (e) {
      console.error('Failed to save scroll settings:', e);
    }
    applyScrollSettings();
  }

  function applyScrollSettings() {
    const bar = document.getElementById('led-marquee-bar');
    const track = document.getElementById('led-marquee-track');
    const textEl = document.getElementById('led-marquee-text');
    if (!bar || !track || !textEl) return;

    const msg = String(scrollSettings.text || '').trim();
    const shouldShow = Boolean(scrollSettings.enabled) && msg.length > 0;
    bar.classList.toggle('hidden', !shouldShow);

    if (shouldShow) {
      const sec = Math.min(40, Math.max(6, Number(scrollSettings.speedSec) || 16));
      bar.style.setProperty('--marquee-duration', `${sec}s`);
      textEl.style.color = scrollSettings.color || '#ffb326';
      textEl.textContent = msg;
      // Restart animation cleanly when text/speed updates
      track.style.animation = 'none';
      void track.offsetWidth;
      track.style.animation = '';
    }
  }

  function openScrollSettingsModal() {
    document.getElementById('scroll-enabled').checked = Boolean(scrollSettings.enabled);
    document.getElementById('scroll-text').value = scrollSettings.text || '';
    const sec = Math.min(40, Math.max(6, Number(scrollSettings.speedSec) || 16));
    document.getElementById('scroll-speed').value = String(sec);
    document.getElementById('scroll-speed-label').textContent = `${sec}秒`;
    document.getElementById('scroll-color').value = scrollSettings.color || '#ffb326';
    S.openDialog('modal-scroll-settings');
  }

  global.DSBSettings = {
    DEFAULT_UI_SETTINGS,
    getSettings,
    loadUiSettings,
    applyUiSettings,
    openUiSettingsModal,
    resetUiSettings,
    toggleCudMode,
    updateSetting,
    loadScrollSettings,
    saveScrollSettings,
    applyScrollSettings,
    openScrollSettingsModal
  };
})(window);
