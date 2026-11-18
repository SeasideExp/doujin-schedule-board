(function (global) {
  'use strict';

  const S = global.DSBState;
  const P = global.DSBPresets;
  const B = global.DSBBoard;
  const Pl = global.DSBPlanner;
  const O = global.DSBOutputs;
  const St = global.DSBSettings;

  function renderAll() {
    B.renderDepartureBoard();
    Pl.renderPlanner();
  }

  function jumpToDate(ymd) {
    const [y, m] = ymd.split('-').map(Number);
    S.store.ui.year = y;
    S.store.ui.month = m;
    S.store.ui.selectedDate = ymd;
    S.store.ui.viewMode = 'calendar';
    renderAll();
  }

  function syncVersionBadge() {
    const badge = document.getElementById('app-version-badge');
    if (badge) badge.textContent = S.APP_VERSION;
    const aboutVer = document.getElementById('about-version');
    if (aboutVer) aboutVer.textContent = S.APP_VERSION;
    const aboutDate = document.getElementById('about-updated-at');
    if (aboutDate) aboutDate.textContent = S.APP_UPDATED_AT;
  }

  function bindEvents() {
    let lastTickYMD = S.todayYMD;
    B.updateClock();
    setInterval(() => {
      B.updateClock();
      const currentYMD = S.todayYMD;
      if (currentYMD !== lastTickYMD) {
        lastTickYMD = currentYMD;
        renderAll();
      }
    }, 1000);

    // Topbar & Drawer file/settings actions
    document.getElementById('btn-open-about').addEventListener('click', () => {
      syncVersionBadge();
      S.openDialog('modal-about');
    });
    document.getElementById('btn-open-help').addEventListener('click', () => {
      const helpBody = document.getElementById('help-modal-body');
      if (helpBody) helpBody.scrollTop = 0;
      S.openDialog('modal-help');
    });
    document.querySelectorAll('.help-toc-btn[data-help-target]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = document.getElementById(btn.dataset.helpTarget);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
    document.getElementById('btn-load-sample').addEventListener('click', () => {
      O.loadSampleData(renderAll);
    });
    document.getElementById('btn-export-json').addEventListener('click', O.exportJsonData);
    document.getElementById('btn-export-json-panel').addEventListener('click', O.exportJsonData);
    document.getElementById('btn-import-json').addEventListener('click', () => {
      document.getElementById('file-import-input').click();
    });
    document.getElementById('file-import-input').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) O.handleJsonFileSelected(file);
      e.target.value = '';
    });
    document.getElementById('btn-import-replace').addEventListener('click', () => {
      O.applyImport('replace', renderAll);
    });
    document.getElementById('btn-import-merge').addEventListener('click', () => {
      O.applyImport('merge', renderAll);
    });

    document.getElementById('btn-open-presets').addEventListener('click', () => {
      P.renderPresetManagerLists();
      S.openDialog('modal-presets');
    });

    document.getElementById('btn-open-ui-settings').addEventListener('click', () => {
      St.openUiSettingsModal();
    });

    // UI Settings Dialog controls
    document.getElementById('ui-cud-mode').addEventListener('change', (e) => {
      St.toggleCudMode(e.target.checked);
    });
    document.getElementById('ui-show-top-info-bar').addEventListener('change', (e) => {
      St.updateSetting('showTopInfoBar', e.target.checked);
    });
    document.getElementById('ui-font-scale').addEventListener('change', (e) => {
      St.updateSetting('fontSizeScale', e.target.value);
    });
    const urgentInput = document.getElementById('ui-urgent-days');
    const soonInput = document.getElementById('ui-soon-days');
    const clampInt = (val, min, max) => {
      const n = parseInt(val, 10);
      if (Number.isNaN(n)) return null;
      return Math.max(min, Math.min(max, n));
    };

    urgentInput.addEventListener('input', (e) => {
      const u = clampInt(e.target.value, 0, 365);
      if (u === null) return;
      St.updateSetting('urgentDays', u);
      soonInput.min = String(u);
      B.renderDepartureBoard();
    });
    urgentInput.addEventListener('change', (e) => {
      const fallback = Number(St.getSettings().urgentDays ?? 7);
      const parsed = clampInt(e.target.value, 0, 365);
      const u = parsed === null ? fallback : parsed;
      e.target.value = String(u);
      St.updateSetting('urgentDays', u);
      soonInput.min = String(u);
      const curSoon = clampInt(soonInput.value, u, 365);
      if (curSoon === null || curSoon < u) {
        soonInput.value = String(u);
        St.updateSetting('soonDays', u);
      }
      B.renderDepartureBoard();
    });

    soonInput.addEventListener('input', (e) => {
      const u = Math.max(0, Number(St.getSettings().urgentDays ?? 7));
      const parsed = parseInt(e.target.value, 10);
      if (Number.isNaN(parsed) || parsed < u) return;
      const s = Math.min(365, parsed);
      St.updateSetting('soonDays', s);
      B.renderDepartureBoard();
    });
    soonInput.addEventListener('change', (e) => {
      const u = Math.max(0, Number(St.getSettings().urgentDays ?? 7));
      const fallback = Math.max(u, Number(St.getSettings().soonDays ?? 30));
      const parsed = clampInt(e.target.value, u, 365);
      const s = parsed === null ? fallback : parsed;
      e.target.value = String(s);
      St.updateSetting('soonDays', s);
      B.renderDepartureBoard();
    });
    document.getElementById('ui-blink-deadline').addEventListener('change', (e) => {
      St.updateSetting('blinkNearDeadline', e.target.checked);
    });
    document.getElementById('ui-blink-few-days').addEventListener('change', (e) => {
      St.updateSetting('blinkFewDays', e.target.checked);
    });
    document.getElementById('ui-blink-speed').addEventListener('input', (e) => {
      const val = parseFloat(e.target.value) || 1.0;
      document.getElementById('ui-blink-speed-label').textContent = `${val.toFixed(1)}秒 / ${val.toFixed(1)}秒`;
      St.updateSetting('blinkHalfSec', val);
    });
    const colorBindings = [
      ['ui-led-bg', 'ledBg'],
      ['ui-led-participate', 'ledParticipateText'],
      ['ui-led-green', 'ledGreenText'],
      ['ui-led-deadline', 'ledDeadlineText'],
      ['ui-led-amber', 'ledAmberText'],
      ['ui-led-urgent-bg', 'ledUrgentBg'],
      ['ui-planner-text', 'plannerText'],
      ['ui-primary-color', 'primaryColor'],
      ['ui-unapplied-accent', 'unappliedAccent'],
      ['ui-top-meter-bg', 'topBarBg'],
      ['ui-fill-today', 'topTodayBarColor'],
      ['ui-fill-month', 'topMonthBarColor'],
      ['ui-fill-deadline', 'topDeadlineBarColor'],
      ['ui-top-meter-val', 'topMeterValColor']
    ];
    colorBindings.forEach(([elId, key]) => {
      document.getElementById(elId).addEventListener('input', (e) => {
        St.updateSetting(key, e.target.value);
      });
    });
    document.getElementById('btn-reset-ui-settings').addEventListener('click', () => {
      St.resetUiSettings();
      B.renderDepartureBoard();
    });

    // Topbar Deadline Countdown Picker Dialog
    document.getElementById('btn-top-deadline').addEventListener('click', () => {
      const presetSel = document.getElementById('top-dl-preset-select');
      const nowMs = Date.now();
      const resolveDeadlinePreset = (d) => {
        const parsedMin = S.parseTimeMinutes(d.time);
        const validMin = parsedMin !== null && parsedMin >= 0 && parsedMin <= 2879 ? parsedMin : (23 * 60 + 59);
        const [y, m, day] = d.date.split('-').map(Number);
        const targetDate = new Date(y, m - 1, day, 0, validMin, 0, 0);
        const targetMs = targetDate.getTime();
        const dispYMD = S.formatYMD(targetDate);
        const hm = `${S.pad2(targetDate.getHours())}:${S.pad2(targetDate.getMinutes())}`;
        return { dispYMD, hm, dtStr: `${dispYMD}T${hm}`, targetMs };
      };

      const upcomingDls = S.store.data.deadlines
        .filter((d) => !d.completed)
        .map((d) => ({ dl: d, ...resolveDeadlinePreset(d) }))
        .filter((entry) => entry.targetMs > nowMs)
        .sort((a, b) => a.targetMs - b.targetMs || a.dl.name.localeCompare(b.dl.name, 'ja'));

      presetSel.innerHTML = `<option value="">-- 登録済み締切から選択 --</option>` +
        upcomingDls.map(({ dl, dispYMD, hm, dtStr }) =>
          `<option value="${dl.id}" data-dt="${dtStr}" data-name="${S.escapeHtml(dl.name)}">${S.formatDisplayDate(dispYMD)} ${hm}｜${S.escapeHtml(dl.name)}</option>`
        ).join('');

      const cur = B.getTopDeadline();
      if (cur && cur.targetAt > nowMs) {
        const dt = new Date(cur.targetAt);
        document.getElementById('top-dl-label').value = cur.label;
        document.getElementById('top-dl-datetime').value =
          `${dt.getFullYear()}-${S.pad2(dt.getMonth() + 1)}-${S.pad2(dt.getDate())}T${S.pad2(dt.getHours())}:${S.pad2(dt.getMinutes())}`;
        document.getElementById('btn-clear-top-deadline').classList.remove('hidden');
      } else {
        document.getElementById('top-dl-label').value = '';
        const def = new Date(nowMs + 86400000);
        document.getElementById('top-dl-datetime').value =
          `${def.getFullYear()}-${S.pad2(def.getMonth() + 1)}-${S.pad2(def.getDate())}T23:59`;
        document.getElementById('btn-clear-top-deadline').classList.add('hidden');
      }

      S.openDialog('modal-top-deadline');
    });

    document.getElementById('top-dl-preset-select').addEventListener('change', (e) => {
      const opt = e.target.selectedOptions[0];
      if (!opt || !opt.value) return;
      document.getElementById('top-dl-label').value = opt.dataset.name || '';
      document.getElementById('top-dl-datetime').value = opt.dataset.dt || '';
    });

    document.getElementById('form-top-deadline').addEventListener('submit', (e) => {
      e.preventDefault();
      const label = document.getElementById('top-dl-label').value.trim() || '締切';
      const dtVal = document.getElementById('top-dl-datetime').value;
      if (!dtVal) return;
      const targetMs = new Date(dtVal).getTime();
      if (Number.isNaN(targetMs) || targetMs <= Date.now()) {
        alert('現在時刻より未来の日時を指定してください。');
        return;
      }
      B.setTopDeadline(label, targetMs);
      S.closeDialog('modal-top-deadline');
      S.showToast(`上部締切バーを「${label}」に設定しました`);
    });

    document.getElementById('btn-clear-top-deadline').addEventListener('click', () => {
      B.clearTopDeadline();
      S.closeDialog('modal-top-deadline');
      S.showToast('上部締切バーを解除しました');
    });

    document.getElementById('btn-clear-all').addEventListener('click', () => {
      if (!confirm('すべてのイベント予定・原稿締切・登録済み候補を削除して初期化しますか？')) return;
      S.store.data = {
        version: 1,
        appVersion: S.APP_VERSION,
        updatedAt: new Date().toISOString(),
        events: [],
        deadlines: [],
        presets: { events: [], venues: [], genres: [] }
      };
      S.saveState();
      renderAll();
      S.showToast('データを初期化しました');
    });

    // Left pane controls
    document.getElementById('board-scope-select').addEventListener('change', (e) => {
      S.store.ui.boardScope = e.target.value;
      B.renderDepartureBoard();
    });
    document.getElementById('board-type-select').addEventListener('change', (e) => {
      S.store.ui.boardType = e.target.value;
      B.renderDepartureBoard();
    });
    document.getElementById('board-hide-past').addEventListener('change', (e) => {
      S.store.ui.boardHidePast = e.target.checked;
      B.renderDepartureBoard();
    });
    document.getElementById('board-hide-absent').addEventListener('change', (e) => {
      S.store.ui.boardHideAbsent = e.target.checked;
      B.renderDepartureBoard();
    });
    document.getElementById('board-hide-staff').addEventListener('change', (e) => {
      S.store.ui.boardHideStaff = e.target.checked;
      B.renderDepartureBoard();
    });
    document.getElementById('board-hide-general').addEventListener('change', (e) => {
      S.store.ui.boardHideGeneral = e.target.checked;
      B.renderDepartureBoard();
    });

    document.getElementById('led-board-body').addEventListener('click', (e) => {
      const editBtn = e.target.closest('[data-board-edit-id]');
      if (editBtn) {
        e.stopPropagation();
        const kind = editBtn.dataset.boardEditKind;
        const id = editBtn.dataset.boardEditId;
        if (kind === 'event') {
          Pl.openEventModal({ eventId: id });
        } else {
          Pl.openDeadlineModal({ deadlineId: id });
        }
        return;
      }
      const row = e.target.closest('.led-row[data-jump-date]');
      if (!row) return;
      jumpToDate(row.dataset.jumpDate);
    });

    // PDF Dialog (both from board and from settings drawer)
    const openPdfHandler = () => {
      const yearSel = document.getElementById('pdf-year-select');
      const years = S.getAvailableYears();
      yearSel.innerHTML = years
        .map((y) => `<option value="${y}" ${y === S.store.ui.year ? 'selected' : ''}>${y}年</option>`)
        .join('');
      O.renderPdfModal();
      S.openDialog('modal-pdf');
    };
    document.getElementById('btn-open-pdf-modal-side').addEventListener('click', openPdfHandler);
    document.getElementById('btn-open-scroll-settings').addEventListener('click', () => {
      St.openScrollSettingsModal();
    });
    document.getElementById('scroll-speed').addEventListener('input', (e) => {
      document.getElementById('scroll-speed-label').textContent = `${e.target.value}秒`;
    });
    document.getElementById('form-scroll-settings').addEventListener('submit', (e) => {
      e.preventDefault();
      St.saveScrollSettings({
        enabled: document.getElementById('scroll-enabled').checked,
        text: document.getElementById('scroll-text').value.trim(),
        speedSec: parseInt(document.getElementById('scroll-speed').value, 10) || 16,
        color: document.getElementById('scroll-color').value
      });
      S.closeDialog('modal-scroll-settings');
      S.showToast('スクロール表示設定を保存しました');
    });
    document.getElementById('pdf-year-select').addEventListener('change', O.renderPdfModal);
    document.getElementById('pdf-filter-select').addEventListener('change', O.renderPdfModal);
    let printingFromModal = false;
    document.getElementById('btn-print-pdf').addEventListener('click', () => {
      printingFromModal = true;
      O.renderPdfModal();
      S.closeDialog('modal-pdf');
      global.print();
      setTimeout(() => {
        printingFromModal = false;
      }, 0);
    });
    global.addEventListener('beforeprint', () => {
      if (!printingFromModal) {
        O.syncPrintArea();
      }
    });
    global.addEventListener('afterprint', () => {
      printingFromModal = false;
    });
    document.getElementById('btn-export-csv').addEventListener('click', O.exportCsvLog);

    // Right pane Year & Month navigation
    const applyYearChange = (nextYear) => {
      S.store.ui.year = nextYear;
      if (S.store.ui.month === 'next12') {
        S.store.ui.month = 'all';
      }
      const m = typeof S.store.ui.month === 'number' ? S.store.ui.month : 1;
      S.store.ui.selectedDate = `${S.store.ui.year}-${S.pad2(m)}-01`;
      renderAll();
    };
    document.getElementById('btn-prev-year').addEventListener('click', () => {
      applyYearChange(S.store.ui.year - 1);
    });
    document.getElementById('btn-next-year').addEventListener('click', () => {
      applyYearChange(S.store.ui.year + 1);
    });
    document.getElementById('year-select').addEventListener('change', (e) => {
      applyYearChange(Number(e.target.value));
    });
    document.getElementById('btn-jump-today').addEventListener('click', () => {
      jumpToDate(S.todayYMD);
    });

    document.getElementById('month-tabs').addEventListener('click', (e) => {
      const tab = e.target.closest('.month-tab');
      if (!tab) return;
      const val = tab.dataset.month;
      if (val === 'all' || val === 'next12') {
        S.store.ui.month = val;
        S.store.ui.viewMode = 'list';
      } else {
        S.store.ui.month = Number(val);
        S.store.ui.selectedDate = `${S.store.ui.year}-${S.pad2(S.store.ui.month)}-01`;
      }
      Pl.renderPlanner();
    });

    document.getElementById('btn-view-calendar').addEventListener('click', () => {
      S.store.ui.viewMode = 'calendar';
      if (S.store.ui.month === 'all' || S.store.ui.month === 'next12') {
        S.store.ui.month = Number(S.store.ui.selectedDate.slice(5, 7)) || 1;
      }
      Pl.renderPlanner();
    });
    document.getElementById('btn-view-list').addEventListener('click', () => {
      S.store.ui.viewMode = 'list';
      Pl.renderPlanner();
    });

    // List filters
    document.getElementById('list-only-conflicts').addEventListener('change', (e) => {
      S.store.ui.listOnlyConflicts = e.target.checked;
      Pl.renderDayListView();
    });
    document.getElementById('list-kind-select').addEventListener('change', (e) => {
      S.store.ui.listKind = e.target.value;
      Pl.renderDayListView();
    });
    document.getElementById('list-search-input').addEventListener('input', (e) => {
      S.store.ui.listSearch = e.target.value;
      Pl.renderDayListView();
    });

    // Add buttons
    document.getElementById('btn-add-event').addEventListener('click', () => {
      Pl.openEventModal({ defaultDate: S.store.ui.selectedDate });
    });
    document.getElementById('btn-add-deadline').addEventListener('click', () => {
      Pl.openDeadlineModal({ defaultDate: S.store.ui.selectedDate });
    });

    // Calendar grid clicks
    document.getElementById('calendar-grid').addEventListener('click', (e) => {
      const quickBtn = e.target.closest('[data-add-date]');
      if (quickBtn) {
        e.stopPropagation();
        Pl.openEventModal({ defaultDate: quickBtn.dataset.addDate });
        return;
      }
      const cell = e.target.closest('.cal-cell[data-date]');
      if (!cell) return;
      const ymd = cell.dataset.date;
      const [y, m] = ymd.split('-').map(Number);
      const yearChanged = S.store.ui.year !== y;
      S.store.ui.year = y;
      S.store.ui.month = m;
      S.store.ui.selectedDate = ymd;
      if (yearChanged) {
        renderAll();
      } else {
        Pl.renderPlanner();
      }
    });

    // Delegated card actions
    const handleCardAreaClick = (e) => {
      const openEvtDate = e.target.closest('[data-open-event-date]');
      if (openEvtDate) {
        Pl.openEventModal({ defaultDate: openEvtDate.dataset.openEventDate });
        return;
      }
      const openDlDate = e.target.closest('[data-open-deadline-date]');
      if (openDlDate) {
        Pl.openDeadlineModal({ defaultDate: openDlDate.dataset.openDeadlineDate });
        return;
      }
      const statusBtn = e.target.closest('.status-switch-btn[data-evt-id]');
      if (statusBtn) {
        const evt = S.store.data.events.find((item) => item.id === statusBtn.dataset.evtId);
        if (evt) {
          evt.status = statusBtn.dataset.status;
          S.saveState();
          renderAll();
          S.showToast(`「${evt.name}」を【${S.statusLabel(evt.status)}】に変更しました`);
        }
        return;
      }
      const editEvt = e.target.closest('[data-edit-event]');
      if (editEvt) {
        Pl.openEventModal({ eventId: editEvt.dataset.editEvent });
        return;
      }
      const dupEvt = e.target.closest('[data-dup-event]');
      if (dupEvt) {
        Pl.openEventModal({ duplicateFrom: dupEvt.dataset.dupEvent });
        return;
      }
      const toggleDl = e.target.closest('[data-toggle-dl]');
      if (toggleDl) {
        const dl = S.store.data.deadlines.find((item) => item.id === toggleDl.dataset.toggleDl);
        if (dl) {
          dl.completed = !dl.completed;
          S.saveState();
          renderAll();
          S.showToast(dl.completed ? `「${dl.name}」を完了にしました` : `「${dl.name}」を未完了に戻しました`);
        }
        return;
      }
      const editDl = e.target.closest('[data-edit-deadline]');
      if (editDl) {
        Pl.openDeadlineModal({ deadlineId: editDl.dataset.editDeadline });
      }
    };

    document.getElementById('selected-day-panel').addEventListener('click', handleCardAreaClick);
    document.getElementById('day-list-content').addEventListener('click', handleCardAreaClick);

    const syncUiAfterSave = (date) => {
      S.store.ui.year = Number(date.slice(0, 4));
      if (S.store.ui.month === 'next12') {
        if (date < S.todayYMD || date > S.getOneYearLaterYMD()) {
          S.store.ui.month = 'all';
        }
      } else if (S.store.ui.month !== 'all') {
        S.store.ui.month = Number(date.slice(5, 7));
      }
      S.store.ui.selectedDate = date;
    };

    // Event Form Save & Delete
    document.getElementById('form-event').addEventListener('submit', (e) => {
      e.preventDefault();
      const id = document.getElementById('evt-id').value;
      const date = document.getElementById('evt-date').value;
      const name = document.getElementById('evt-name').value.trim();
      const genre = document.getElementById('evt-genre').value.trim();
      const venue = document.getElementById('evt-venue').value.trim();
      const time = document.getElementById('evt-time').value.trim();
      const space = document.getElementById('evt-space').value.trim();
      const memo = document.getElementById('evt-memo').value.trim();
      const status = document.getElementById('evt-status').value;

      if (!date) return;
      if (!name) {
        alert('イベント名を入力してください。');
        document.getElementById('evt-name').focus();
        return;
      }
      if (!S.isValidYMD(date)) {
        alert('開催日は西暦4桁（例：2026-11-17）の有効な日付を入力してください。');
        return;
      }

      if (id) {
        const idx = S.store.data.events.findIndex((item) => item.id === id);
        if (idx !== -1) {
          S.store.data.events[idx] = { id, date, name, genre, venue, status, time, space, memo };
        }
      } else {
        S.store.data.events.push({ id: S.genId('evt'), date, name, genre, venue, status, time, space, memo });
      }

      syncUiAfterSave(date);

      S.saveState();
      S.closeDialog('modal-event');
      renderAll();
      S.showToast('イベントスケジュールを保存しました');
    });

    document.getElementById('btn-delete-event').addEventListener('click', () => {
      const id = document.getElementById('evt-id').value;
      if (!id || !confirm('このイベント予定を削除しますか？')) return;
      S.store.data.events = S.store.data.events.filter((e) => e.id !== id);
      S.saveState();
      S.closeDialog('modal-event');
      renderAll();
      S.showToast('イベント予定を削除しました');
    });

    // Unified Schedule Modal mode switch (Event <-> Deadline)
    ['evt-date', 'dl-date'].forEach((id) => {
      const el = document.getElementById(id);
      const markModified = () => { el.dataset.userModified = 'true'; };
      el.addEventListener('input', markModified);
      el.addEventListener('change', markModified);
    });
    document.getElementById('tab-modal-event').addEventListener('click', () => {
      Pl.switchScheduleModalMode('event');
    });
    document.getElementById('tab-modal-deadline').addEventListener('click', () => {
      Pl.switchScheduleModalMode('deadline');
    });

    // Save Presets directly from Event Form
    document.getElementById('btn-save-event-preset').addEventListener('click', () => {
      const name = document.getElementById('evt-name').value.trim();
      const venue = document.getElementById('evt-venue').value.trim();
      if (!name) {
        S.showToast('イベント名を入力してから保存してください');
        return;
      }
      const added = P.addEventPreset(name, venue);
      S.showToast(added ? `「${name}」をイベント名候補に保存しました` : `「${name}」は既に登録済みです`);
    });

    document.getElementById('btn-save-venue-preset').addEventListener('click', () => {
      const venue = document.getElementById('evt-venue').value.trim();
      if (!venue) {
        S.showToast('場所を入力してから保存してください');
        return;
      }
      const added = P.addVenuePreset(venue);
      S.showToast(added ? `「${venue}」を場所候補に保存しました` : `「${venue}」は既に登録済みです`);
    });

    document.getElementById('btn-save-genre-preset').addEventListener('click', () => {
      const genre = document.getElementById('evt-genre').value.trim();
      if (!genre) {
        S.showToast('ジャンル名を入力してから保存してください');
        return;
      }
      const added = P.addGenrePreset(genre);
      S.showToast(added ? `「${genre}」をジャンル候補に保存しました` : `「${genre}」は既に登録済みです`);
    });

    const applyDefaultVenueFromPreset = (defVenue) => {
      const venueInput = document.getElementById('evt-venue');
      const current = venueInput.value.trim();
      const autoFilled = venueInput.dataset.autoFilledVenue || '';
      if (!current || (autoFilled && current === autoFilled)) {
        venueInput.value = defVenue || '';
        if (defVenue) {
          venueInput.dataset.autoFilledVenue = defVenue;
        } else {
          delete venueInput.dataset.autoFilledVenue;
        }
      }
    };

    document.getElementById('evt-venue').addEventListener('input', (e) => {
      delete e.target.dataset.autoFilledVenue;
    });

    document.getElementById('evt-preset-chips').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-pick-evt-preset]');
      if (!btn) return;
      document.getElementById('evt-name').value = btn.dataset.pickEvtPreset;
      applyDefaultVenueFromPreset(btn.dataset.pickEvtVenue || '');
    });

    document.getElementById('venue-preset-chips').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-pick-venue-preset]');
      if (!btn) return;
      const venueInput = document.getElementById('evt-venue');
      delete venueInput.dataset.autoFilledVenue;
      venueInput.value = btn.dataset.pickVenuePreset;
    });

    document.getElementById('genre-preset-chips').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-pick-genre-preset]');
      if (!btn) return;
      document.getElementById('evt-genre').value = btn.dataset.pickGenrePreset;
    });

    const syncDefaultVenueByEventName = (rawName) => {
      const matched = S.store.data.presets.events.find((p) => p.name === rawName.trim());
      if (matched) {
        applyDefaultVenueFromPreset(matched.defaultVenue || '');
      }
    };
    document.getElementById('evt-name').addEventListener('input', (e) => {
      syncDefaultVenueByEventName(e.target.value);
    });
    document.getElementById('evt-name').addEventListener('change', (e) => {
      syncDefaultVenueByEventName(e.target.value);
    });

    // Deadline Form Save & Delete
    document.getElementById('form-deadline').addEventListener('submit', (e) => {
      e.preventDefault();
      const id = document.getElementById('dl-id').value;
      const date = document.getElementById('dl-date').value;
      const time = document.getElementById('dl-time').value.trim();
      const name = document.getElementById('dl-name').value.trim();
      const related = document.getElementById('dl-related').value.trim();
      const completed = document.getElementById('dl-completed').checked;
      const memo = document.getElementById('dl-memo').value.trim();

      if (!date) return;
      if (!name) {
        alert('締切名を入力してください。');
        document.getElementById('dl-name').focus();
        return;
      }
      if (!S.isValidYMD(date)) {
        alert('締切日は西暦4桁（例：2026-11-17）の有効な日付を入力してください。');
        return;
      }

      if (id) {
        const idx = S.store.data.deadlines.findIndex((item) => item.id === id);
        if (idx !== -1) {
          S.store.data.deadlines[idx] = { id, date, time, name, related, completed, memo };
        }
      } else {
        S.store.data.deadlines.push({ id: S.genId('dl'), date, time, name, related, completed, memo });
      }

      syncUiAfterSave(date);

      S.saveState();
      S.closeDialog('modal-event');
      renderAll();
      S.showToast('原稿締切を保存しました');
    });

    document.getElementById('btn-delete-deadline').addEventListener('click', () => {
      const id = document.getElementById('dl-id').value;
      if (!id || !confirm('この原稿締切を削除しますか？')) return;
      S.store.data.deadlines = S.store.data.deadlines.filter((d) => d.id !== id);
      S.saveState();
      S.closeDialog('modal-event');
      renderAll();
      S.showToast('原稿締切を削除しました');
    });

    document.querySelectorAll('.dl-quick-chip').forEach((btn) => {
      btn.addEventListener('click', () => {
        const input = document.getElementById('dl-name');
        const txt = btn.dataset.dlText;
        input.value = input.value.trim() ? `${input.value.trim()} ${txt}` : txt;
        input.focus();
      });
    });

    // Preset Manager Modal
    document.getElementById('btn-add-event-preset').addEventListener('click', () => {
      const nameInput = document.getElementById('preset-new-event-name');
      const venueInput = document.getElementById('preset-new-event-venue');
      if (!nameInput.value.trim()) return;
      P.addEventPreset(nameInput.value, venueInput.value);
      if (venueInput.value.trim()) P.addVenuePreset(venueInput.value);
      nameInput.value = '';
      venueInput.value = '';
      P.renderPresetManagerLists();
    });

    document.getElementById('btn-add-venue-preset').addEventListener('click', () => {
      const venueInput = document.getElementById('preset-new-venue-name');
      if (!venueInput.value.trim()) return;
      P.addVenuePreset(venueInput.value);
      venueInput.value = '';
      P.renderPresetManagerLists();
    });

    document.getElementById('btn-add-genre-preset').addEventListener('click', () => {
      const genreInput = document.getElementById('preset-new-genre-name');
      if (!genreInput.value.trim()) return;
      P.addGenrePreset(genreInput.value);
      genreInput.value = '';
      P.renderPresetManagerLists();
    });

    document.getElementById('preset-event-list').addEventListener('click', (e) => {
      const del = e.target.closest('[data-del-evt-preset]');
      if (!del) return;
      S.store.data.presets.events = S.store.data.presets.events.filter((p) => p.id !== del.dataset.delEvtPreset);
      S.saveState();
      P.renderPresetOptions();
      P.renderPresetManagerLists();
    });

    document.getElementById('preset-venue-list').addEventListener('click', (e) => {
      const del = e.target.closest('[data-del-venue-preset]');
      if (!del) return;
      S.store.data.presets.venues = S.store.data.presets.venues.filter((v) => v.id !== del.dataset.delVenuePreset);
      S.saveState();
      P.renderPresetOptions();
      P.renderPresetManagerLists();
    });

    document.getElementById('preset-genre-list').addEventListener('click', (e) => {
      const del = e.target.closest('[data-del-genre-preset]');
      if (!del) return;
      S.store.data.presets.genres = S.store.data.presets.genres.filter((g) => g.id !== del.dataset.delGenrePreset);
      S.saveState();
      P.renderPresetOptions();
      P.renderPresetManagerLists();
    });

    // Native <dialog> close buttons & backdrop click
    document.querySelectorAll('[data-close-modal]').forEach((btn) => {
      btn.addEventListener('click', () => S.closeDialog(btn.dataset.closeModal));
    });

    document.querySelectorAll('dialog.modal-dialog').forEach((dlg) => {
      let pointerDownOnBackdrop = false;
      dlg.addEventListener('pointerdown', (e) => {
        pointerDownOnBackdrop = (e.target === dlg);
      });
      dlg.addEventListener('click', (e) => {
        if (e.target === dlg && pointerDownOnBackdrop) {
          dlg.close();
        }
        pointerDownOnBackdrop = false;
      });
    });
  }

  function initPaneResizer() {
    const workspace = document.getElementById('workspace');
    const resizer = document.getElementById('pane-resizer');
    if (!workspace || !resizer) return;

    const DEFAULT_PCT = 46;
    const MIN_PCT = 28;
    const MAX_PCT = 72;

    const applyPct = (pct, persist = false) => {
      const clamped = Math.min(MAX_PCT, Math.max(MIN_PCT, pct));
      workspace.style.setProperty('--left-pane-pct', `${clamped.toFixed(2)}%`);
      resizer.setAttribute('aria-valuenow', String(Math.round(clamped)));
      if (persist) {
        try {
          localStorage.setItem(S.PREF_PANE_WIDTH_KEY, clamped.toFixed(2));
        } catch (e) {
          // ignore storage quota errors
        }
      }
      return clamped;
    };

    const saved = parseFloat(localStorage.getItem(S.PREF_PANE_WIDTH_KEY));
    if (!Number.isNaN(saved)) {
      applyPct(saved, false);
    }

    let dragging = false;
    let dragStartPct = DEFAULT_PCT;

    resizer.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      dragging = true;
      dragStartPct = parseFloat(workspace.style.getPropertyValue('--left-pane-pct')) || DEFAULT_PCT;
      resizer.classList.add('is-dragging');
      document.body.classList.add('is-resizing-panes');
      resizer.setPointerCapture(e.pointerId);
      e.preventDefault();
    });

    resizer.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const rect = workspace.getBoundingClientRect();
      if (rect.width <= 0) return;
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      applyPct(pct, false);
    });

    const endDrag = (e) => {
      if (!dragging) return;
      dragging = false;
      resizer.classList.remove('is-dragging');
      document.body.classList.remove('is-resizing-panes');
      const rect = workspace.getBoundingClientRect();
      if (rect.width > 0 && typeof e.clientX === 'number') {
        const pct = ((e.clientX - rect.left) / rect.width) * 100;
        applyPct(pct, true);
      }
    };

    const cancelDrag = () => {
      if (!dragging) return;
      dragging = false;
      resizer.classList.remove('is-dragging');
      document.body.classList.remove('is-resizing-panes');
      applyPct(dragStartPct, false);
    };

    resizer.addEventListener('pointerup', endDrag);
    resizer.addEventListener('pointercancel', cancelDrag);

    resizer.addEventListener('dblclick', () => {
      applyPct(DEFAULT_PCT, true);
    });

    resizer.addEventListener('keydown', (e) => {
      const current = parseFloat(workspace.style.getPropertyValue('--left-pane-pct')) || DEFAULT_PCT;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        applyPct(current - 2, true);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        applyPct(current + 2, true);
      } else if (e.key === 'Home') {
        e.preventDefault();
        applyPct(DEFAULT_PCT, true);
      }
    });
  }

  function initSettingsDrawer() {
    const drawer = document.getElementById('settings-drawer');
    const toggleBtn = document.getElementById('btn-toggle-drawer');
    const tabFile = document.getElementById('tab-drawer-file');
    const tabSettings = document.getElementById('tab-drawer-settings');
    const panelFile = document.getElementById('drawer-panel-file');
    const panelSettings = document.getElementById('drawer-panel-settings');
    if (!drawer || !toggleBtn) return;

    const setDrawerOpen = (isOpen, persist = false) => {
      drawer.classList.toggle('is-collapsed', !isOpen);
      toggleBtn.setAttribute('aria-expanded', String(isOpen));
      toggleBtn.textContent = isOpen ? '▶' : '◀';
      toggleBtn.title = isOpen ? '設定パネルを折りたたむ' : '設定パネルを開く';
      if (persist) {
        try {
          localStorage.setItem(S.PREF_DRAWER_OPEN_KEY, String(isOpen));
        } catch (e) {
          // ignore
        }
      }
    };

    const savedOpen = localStorage.getItem(S.PREF_DRAWER_OPEN_KEY);
    // Default open on first visit so user can immediately see tabs
    setDrawerOpen(savedOpen === null ? true : savedOpen === 'true', false);

    toggleBtn.addEventListener('click', () => {
      const willOpen = drawer.classList.contains('is-collapsed');
      setDrawerOpen(willOpen, true);
    });

    const switchDrawerTab = (tabName) => {
      const isFile = tabName === 'file';
      tabFile.classList.toggle('active', isFile);
      tabFile.setAttribute('aria-selected', String(isFile));
      tabSettings.classList.toggle('active', !isFile);
      tabSettings.setAttribute('aria-selected', String(!isFile));
      panelFile.classList.toggle('hidden', !isFile);
      panelSettings.classList.toggle('hidden', isFile);
      if (drawer.classList.contains('is-collapsed')) {
        setDrawerOpen(true, true);
      }
    };

    tabFile.addEventListener('click', () => switchDrawerTab('file'));
    tabSettings.addEventListener('click', () => switchDrawerTab('settings'));

    // Also allow clicking mini rail icons when collapsed
    document.querySelectorAll('[data-drawer-quick-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        switchDrawerTab(btn.dataset.drawerQuickTab);
      });
    });
  }

  function initCalendarResizer() {
    const container = document.getElementById('calendar-view-container');
    const resizer = document.getElementById('calendar-resizer');
    if (!container || !resizer) return;

    const DEFAULT_PCT = 58;
    const MIN_PCT = 25;
    const MAX_PCT = 78;

    const applyPct = (pct, persist = false) => {
      const clamped = Math.min(MAX_PCT, Math.max(MIN_PCT, pct));
      container.style.setProperty('--cal-top-pct', `${clamped.toFixed(2)}%`);
      resizer.setAttribute('aria-valuenow', String(Math.round(clamped)));
      if (persist) {
        try {
          localStorage.setItem(S.PREF_CAL_SPLIT_KEY, clamped.toFixed(2));
        } catch (e) {
          // ignore
        }
      }
    };

    const saved = parseFloat(localStorage.getItem(S.PREF_CAL_SPLIT_KEY));
    if (!Number.isNaN(saved)) {
      applyPct(saved, false);
    }

    let dragging = false;
    let dragStartPct = DEFAULT_PCT;

    resizer.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      dragging = true;
      dragStartPct = parseFloat(container.style.getPropertyValue('--cal-top-pct')) || DEFAULT_PCT;
      resizer.classList.add('is-dragging');
      document.body.classList.add('is-resizing-cal');
      resizer.setPointerCapture(e.pointerId);
      e.preventDefault();
    });

    resizer.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const rect = container.getBoundingClientRect();
      if (rect.height <= 0) return;
      const pct = ((e.clientY - rect.top) / rect.height) * 100;
      applyPct(pct, false);
    });

    const endDrag = (e) => {
      if (!dragging) return;
      dragging = false;
      resizer.classList.remove('is-dragging');
      document.body.classList.remove('is-resizing-cal');
      const rect = container.getBoundingClientRect();
      if (rect.height > 0 && typeof e.clientY === 'number') {
        const pct = ((e.clientY - rect.top) / rect.height) * 100;
        applyPct(pct, true);
      }
    };

    const cancelDrag = () => {
      if (!dragging) return;
      dragging = false;
      resizer.classList.remove('is-dragging');
      document.body.classList.remove('is-resizing-cal');
      applyPct(dragStartPct, false);
    };

    resizer.addEventListener('pointerup', endDrag);
    resizer.addEventListener('pointercancel', cancelDrag);

    resizer.addEventListener('dblclick', () => {
      applyPct(DEFAULT_PCT, true);
    });

    resizer.addEventListener('keydown', (e) => {
      const current = parseFloat(container.style.getPropertyValue('--cal-top-pct')) || DEFAULT_PCT;
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        applyPct(current - 3, true);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        applyPct(current + 3, true);
      } else if (e.key === 'Home') {
        e.preventDefault();
        applyPct(DEFAULT_PCT, true);
      }
    });
  }

  function syncUiControlsFromStore() {
    const ui = S.store.ui;
    document.getElementById('board-scope-select').value = ui.boardScope;
    document.getElementById('board-type-select').value = ui.boardType;
    document.getElementById('board-hide-past').checked = ui.boardHidePast;
    document.getElementById('board-hide-absent').checked = ui.boardHideAbsent;
    document.getElementById('board-hide-staff').checked = ui.boardHideStaff;
    document.getElementById('board-hide-general').checked = ui.boardHideGeneral;
    document.getElementById('list-only-conflicts').checked = ui.listOnlyConflicts;
    document.getElementById('list-kind-select').value = ui.listKind;
    document.getElementById('list-search-input').value = ui.listSearch;
  }

  function init() {
    S.loadState();
    St.loadUiSettings();
    St.loadScrollSettings();
    syncVersionBadge();
    syncUiControlsFromStore();
    initSettingsDrawer();
    initPaneResizer();
    initCalendarResizer();
    bindEvents();
    renderAll();
  }

  global.DSBMain = {
    renderAll,
    jumpToDate,
    init
  };

  init();
})(window);
