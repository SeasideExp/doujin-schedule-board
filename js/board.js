(function (global) {
  'use strict';

  const S = global.DSBState;
  const TOP_DEADLINE_KEY = 'doujin_schedule_top_deadline_v1';

  function renderDepartureBoard() {
    const scopeSelect = document.getElementById('board-scope-select');
    const yearOption = scopeSelect.querySelector('option[value="year"]');
    if (yearOption) {
      yearOption.textContent = `選択年 (${S.store.ui.year}年)`;
    }

    const allItems = S.getCombinedChronologicalItems();
    const filtered = S.filterItems(allItems, {
      year: S.store.ui.year,
      scope: S.store.ui.boardScope,
      typeFilter: S.store.ui.boardType,
      hidePast: S.store.ui.boardHidePast,
      hideAbsent: S.store.ui.boardHideAbsent,
      hideStaff: S.store.ui.boardHideStaff,
      hideGeneral: S.store.ui.boardHideGeneral
    });

    const body = document.getElementById('led-board-body');

    if (filtered.length === 0) {
      body.innerHTML = `
        <div class="led-empty">
          表示条件に一致する予定がありません。<br />
          右ペインの「＋ イベントを追加」「＋ 原稿締切を追加」から登録するか、<br />
          右端メニューの「📁 ファイル」タブ内にある「🧪 サンプル読込」で動作をお試しいただけます。
        </div>
      `;
    } else {
      const settings = global.DSBSettings ? global.DSBSettings.getSettings() : {};
      const urgentDays = Math.max(0, Number(settings.urgentDays ?? 7));
      const soonDays = Math.max(urgentDays, Number(settings.soonDays ?? 30));

      body.innerHTML = filtered.map((item) => {
        const diff = S.diffDaysFromToday(item.date);
        const isPast = diff < 0;
        const isToday = diff === 0;

        let badgeHtml = '';
        let subStatusHtml = '';
        const rowClasses = ['led-row', `kind-${item.kind}`];

        const isAbsentEvent = item.kind === 'event' && item.status === 'absent';
        const isNearDeadline = item.kind === 'deadline' && !item.completed && diff >= 0 && diff <= urgentDays;
        const isFewDays = diff >= 0 && diff <= urgentDays && !(item.kind === 'deadline' && item.completed) && !isAbsentEvent;

        if (isPast) rowClasses.push('is-past');
        if (isToday) rowClasses.push('is-today');
        if (isNearDeadline) rowClasses.push('is-near-deadline');

        if (item.kind === 'event') {
          rowClasses.push(`st-${item.status}`);
          badgeHtml = `<span class="led-badge led-badge-event">イベント</span>`;
          const boardStatusText = item.status === 'unapplied' ? '未申込' : S.statusLabel(item.status);
          subStatusHtml = `<span class="led-sub-status led-st-${item.status}">[${boardStatusText}]</span>`;
        } else {
          if (item.completed) rowClasses.push('is-done');
          badgeHtml = `<span class="led-badge led-badge-deadline">締　切</span>`;
          subStatusHtml = item.completed
            ? `<span class="led-sub-status led-st-done">[入稿済]</span>`
            : `<span class="led-sub-status led-st-caution">[要注意]</span>`;
        }

        let daysText = '';
        let daysClass = 'days-normal';
        if (item.kind === 'deadline' && item.completed) {
          daysText = '完了済';
          daysClass = 'days-past';
        } else if (diff === 0) {
          daysText = '本日!';
          daysClass = isAbsentEvent ? 'days-past' : 'days-today';
        } else if (diff === 1) {
          daysText = '明日 (1日)';
          daysClass = isAbsentEvent
            ? 'days-past'
            : (urgentDays >= 1 ? 'days-urgent' : (soonDays >= 1 ? 'days-soon' : 'days-normal'));
        } else if (diff > 1 && diff <= urgentDays) {
          daysText = `あと ${diff}日`;
          daysClass = isAbsentEvent ? 'days-past' : 'days-urgent';
        } else if (diff > urgentDays && diff <= soonDays) {
          daysText = `あと ${diff}日`;
          daysClass = isAbsentEvent ? 'days-past' : 'days-soon';
        } else if (diff > soonDays) {
          daysText = `あと ${diff}日`;
          daysClass = isAbsentEvent ? 'days-past' : 'days-normal';
        } else {
          daysText = `${Math.abs(diff)}日前`;
          daysClass = 'days-past';
        }

        const metaParts = [];
        if (item.kind === 'event') {
          if (item.subLocation) metaParts.push(`📍${item.subLocation}`);
          if (item.space) metaParts.push(`配置:${item.space}`);
        } else if (item.subLocation) {
          metaParts.push(`対象:${item.subLocation}`);
        }
        if (item.memo) metaParts.push(item.memo);
        const metaText = metaParts.join(' ／ ');

        const genreHtml = item.kind === 'event' && item.genre
          ? `<span class="led-genre-tag">${S.escapeHtml(item.genre)}</span>`
          : '';

        return `
          <div class="${rowClasses.join(' ')}" role="listitem" data-jump-date="${item.date}" title="行クリックで右ペインの該当日に移動">
            <div class="led-type-col">
              ${badgeHtml}
              ${subStatusHtml}
            </div>
            <div class="led-date-col">
              <time datetime="${item.date}">${S.formatDisplayDate(item.date)}</time>
              <span class="led-date-sub">(${S.getWeekdayJa(item.date)})${item.time ? ' ' + S.escapeHtml(item.time) : ''}</span>
            </div>
            <div class="led-name-col">
              <div class="led-name-row">
                ${genreHtml}
                <button type="button" class="led-main-name" data-board-edit-kind="${item.kind}" data-board-edit-id="${item.id}" title="クリックで編集">${S.escapeHtml(item.name)}</button>
              </div>
              ${metaText ? `<div class="led-meta-line">${S.escapeHtml(metaText)}</div>` : ''}
            </div>
            <div class="led-days-col"><span class="led-days-value ${daysClass}${isFewDays ? ' is-few-days' : ''}">${daysText}</span></div>
          </div>
        `;
      }).join('');
    }

    const evtCount = filtered.filter((i) => i.kind === 'event').length;
    const dlCount = filtered.filter((i) => i.kind === 'deadline').length;
    document.getElementById('led-summary-text').textContent =
      `表示件数 ${filtered.length}件（イベント ${evtCount} ／ 締切 ${dlCount}）`;
  }

  function getTopDeadline() {
    try {
      const raw = localStorage.getItem(TOP_DEADLINE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed.targetAt !== 'number' || typeof parsed.startAt !== 'number') return null;
      return parsed;
    } catch (e) {
      return null;
    }
  }

  function setTopDeadline(label, targetAtMs) {
    const startAt = Date.now();
    if (!targetAtMs || targetAtMs <= startAt) {
      clearTopDeadline();
      return false;
    }
    try {
      localStorage.setItem(TOP_DEADLINE_KEY, JSON.stringify({
        label: String(label || '締切').trim(),
        startAt,
        targetAt: targetAtMs
      }));
      updateTopInfoBar();
      return true;
    } catch (e) {
      return false;
    }
  }

  function clearTopDeadline() {
    try {
      localStorage.removeItem(TOP_DEADLINE_KEY);
    } catch (e) {
      // ignore
    }
    updateTopInfoBar();
  }

  function updateTopInfoBar() {
    const now = new Date();
    const nowMs = now.getTime();

    // Today %
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();
    const todayPct = Math.max(0, Math.min(100, ((nowMs - todayStart) / (tomorrowStart - todayStart)) * 100));

    const todayValEl = document.getElementById('meter-today-val');
    const todayBarEl = document.getElementById('meter-today-bar');
    if (todayValEl && todayBarEl) {
      todayValEl.textContent = `${todayPct.toFixed(1)}%`;
      todayBarEl.style.width = `${todayPct.toFixed(2)}%`;
    }

    // Month %
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime();
    const monthPct = Math.max(0, Math.min(100, ((nowMs - monthStart) / (nextMonthStart - monthStart)) * 100));

    const monthValEl = document.getElementById('meter-month-val');
    const monthBarEl = document.getElementById('meter-month-bar');
    if (monthValEl && monthBarEl) {
      monthValEl.textContent = `${monthPct.toFixed(1)}%`;
      monthBarEl.style.width = `${monthPct.toFixed(2)}%`;
    }

    // Deadline countdown % (100% at set time -> 0% at targetAt; auto-resets when expired)
    const dlLabelEl = document.getElementById('meter-dl-label');
    const dlValEl = document.getElementById('meter-dl-val');
    const dlBarEl = document.getElementById('meter-dl-bar');
    const dlWrapEl = document.getElementById('btn-top-deadline');
    if (!dlLabelEl || !dlValEl || !dlBarEl || !dlWrapEl) return;

    const dl = getTopDeadline();
    if (!dl || nowMs >= dl.targetAt || dl.targetAt <= dl.startAt) {
      if (dl) {
        try { localStorage.removeItem(TOP_DEADLINE_KEY); } catch (e) { /* ignore */ }
      }
      dlLabelEl.textContent = '[締切未設定]';
      dlValEl.textContent = '';
      dlBarEl.style.width = '0%';
      dlWrapEl.classList.remove('has-deadline');
      return;
    }

    const remPct = Math.max(0, Math.min(100, ((dl.targetAt - nowMs) / (dl.targetAt - dl.startAt)) * 100));
    dlLabelEl.textContent = dl.label;
    dlValEl.textContent = `${remPct.toFixed(1)}%`;
    dlBarEl.style.width = `${remPct.toFixed(2)}%`;
    dlWrapEl.classList.add('has-deadline');
  }

  function updateClock() {
    const now = new Date();
    const ymd = S.formatYMD(now);
    const dateEl = document.getElementById('live-date');
    const clockEl = document.getElementById('live-clock');
    if (dateEl) dateEl.textContent = `${S.formatDisplayDate(ymd)} (${S.getWeekdayJa(ymd)})`;
    if (clockEl) clockEl.textContent = `${S.pad2(now.getHours())}:${S.pad2(now.getMinutes())}:${S.pad2(now.getSeconds())}`;
    updateTopInfoBar();
  }

  global.DSBBoard = {
    renderDepartureBoard,
    updateClock,
    updateTopInfoBar,
    getTopDeadline,
    setTopDeadline,
    clearTopDeadline
  };
})(window);
