(function (global) {
  'use strict';

  const S = global.DSBState;
  const P = global.DSBPresets;

  function countOverlapCandidates(events) {
    return events.filter((e) => e.status !== 'absent').length;
  }

  function renderYearSelector() {
    const sel = document.getElementById('year-select');
    const years = S.getAvailableYears();
    sel.innerHTML = years
      .map((y) => `<option value="${y}" ${y === S.store.ui.year ? 'selected' : ''}>${y}年</option>`)
      .join('');
  }

  function renderYearStats() {
    const ui = S.store.ui;
    const yearEvents = S.store.data.events.filter((e) => Number(e.date.slice(0, 4)) === ui.year);
    const yearDeadlines = S.store.data.deadlines.filter((d) => Number(d.date.slice(0, 4)) === ui.year);

    const cntPart = yearEvents.filter((e) => e.status === 'participate').length;
    const cntUnapplied = yearEvents.filter((e) => e.status === 'unapplied').length;
    const cntCons = yearEvents.filter((e) => e.status === 'considering').length;
    const cntAbs = yearEvents.filter((e) => e.status === 'absent').length;
    const cntGen = yearEvents.filter((e) => e.status === 'general').length;
    const cntStaff = yearEvents.filter((e) => e.status === 'staff').length;

    const eventsByDate = S.getEventsByDateMap(ui.year);
    let conflictDays = 0;
    eventsByDate.forEach((list) => {
      if (countOverlapCandidates(list) >= 2) conflictDays++;
    });

    const bar = document.getElementById('year-stats-bar');
    bar.innerHTML = `
      <span class="stat-pill stat-participate">参加 ${cntPart}</span>
      <span class="stat-pill stat-unapplied">未申込 ${cntUnapplied}</span>
      <span class="stat-pill stat-considering">検討 ${cntCons}</span>
      <span class="stat-pill stat-absent">不参加 ${cntAbs}</span>
      <span class="stat-pill stat-general">一般 ${cntGen}</span>
      <span class="stat-pill stat-staff">売り子 ${cntStaff}</span>
      <span class="stat-pill stat-deadline">原稿締切 ${yearDeadlines.length}</span>
      ${conflictDays > 0
        ? `<button type="button" id="btn-jump-conflicts" class="stat-pill stat-conflict" title="クリックで重複日程の一覧を表示">⚠ 同日被り ${conflictDays}日</button>`
        : `<span class="stat-pill" style="background:#f1f5f9;color:#64748b;">同日被り 0日</span>`
      }
    `;

    const jumpBtn = document.getElementById('btn-jump-conflicts');
    if (jumpBtn) {
      jumpBtn.addEventListener('click', () => {
        ui.month = 'all';
        ui.viewMode = 'list';
        ui.listOnlyConflicts = true;
        ui.listKind = 'all';
        ui.listSearch = '';
        document.getElementById('list-only-conflicts').checked = true;
        document.getElementById('list-kind-select').value = 'all';
        document.getElementById('list-search-input').value = '';
        renderPlanner();
      });
    }
  }

  function renderMonthTabs() {
    const ui = S.store.ui;
    const eventsByDate = S.getEventsByDateMap(ui.year);
    const deadlinesByDate = S.getDeadlinesByDateMap(ui.year);

    const monthCounts = Array(13).fill(0);
    const monthHasConflict = Array(13).fill(false);

    eventsByDate.forEach((list, ymd) => {
      const m = Number(ymd.slice(5, 7));
      monthCounts[m] += list.length;
      if (countOverlapCandidates(list) >= 2) monthHasConflict[m] = true;
    });
    deadlinesByDate.forEach((list, ymd) => {
      const m = Number(ymd.slice(5, 7));
      monthCounts[m] += list.length;
    });

    const container = document.getElementById('month-tabs');
    let html = '';
    for (let m = 1; m <= 12; m++) {
      const active = ui.month === m ? 'active' : '';
      html += `
        <button class="month-tab ${active}" data-month="${m}" type="button" role="tab" aria-selected="${ui.month === m}">
          <span>${m}月</span>
          ${monthCounts[m] > 0 ? `<span class="m-count">(${monthCounts[m]})</span>` : ''}
          ${monthHasConflict[m] ? `<span class="m-conflict-dot" title="同日イベント重複あり"></span>` : ''}
        </button>
      `;
    }
    html += `
      <button class="month-tab ${ui.month === 'all' ? 'active' : ''}" data-month="all" type="button" role="tab" aria-selected="${ui.month === 'all'}">
        <span>年間</span>
      </button>
      <button class="month-tab ${ui.month === 'next12' ? 'active' : ''}" data-month="next12" type="button" role="tab" aria-selected="${ui.month === 'next12'}">
        <span>向こう一年</span>
      </button>
    `;
    container.innerHTML = html;
  }

  function renderEventCardHtml(evt) {
    return `
      <article class="schedule-card st-${evt.status}">
        <div class="card-top-row">
          <span class="card-kind-tag tag-event">イベント</span>
          <span style="font-size:11px;color:#64748b;">${evt.time ? S.escapeHtml(evt.time) : ''}</span>
        </div>
        <h4 class="card-title">${S.escapeHtml(evt.name)}</h4>
        <div class="card-meta">
          ${evt.genre ? `<span>🎨 ジャンル：${S.escapeHtml(evt.genre)}</span>` : ''}
          <span>📍 場所：${evt.venue ? S.escapeHtml(evt.venue) : '<span style="color:#9aa5b4;">未入力</span>'}</span>
          ${evt.space ? `<span>🪑 配置：${S.escapeHtml(evt.space)}</span>` : ''}
        </div>
        ${evt.memo ? `<div class="card-memo">${S.escapeHtml(evt.memo)}</div>` : ''}
        <div class="card-status-switcher" role="group" aria-label="参加状況の切替">
          <button type="button" class="status-switch-btn ${evt.status === 'participate' ? 'active' : ''}" data-evt-id="${evt.id}" data-status="participate">参加</button>
          <button type="button" class="status-switch-btn ${evt.status === 'unapplied' ? 'active' : ''}" data-evt-id="${evt.id}" data-status="unapplied">参加(未申込)</button>
          <button type="button" class="status-switch-btn ${evt.status === 'considering' ? 'active' : ''}" data-evt-id="${evt.id}" data-status="considering">検討</button>
          <button type="button" class="status-switch-btn ${evt.status === 'absent' ? 'active' : ''}" data-evt-id="${evt.id}" data-status="absent">不参加</button>
          <button type="button" class="status-switch-btn ${evt.status === 'general' ? 'active' : ''}" data-evt-id="${evt.id}" data-status="general">一般参加</button>
          <button type="button" class="status-switch-btn ${evt.status === 'staff' ? 'active' : ''}" data-evt-id="${evt.id}" data-status="staff">売り子</button>
        </div>
        <div class="card-footer-actions">
          <button type="button" class="btn btn-ghost btn-xs" data-dup-event="${evt.id}" title="同じ内容で複製">複製</button>
          <button type="button" class="btn btn-secondary btn-xs" data-edit-event="${evt.id}">編集</button>
        </div>
      </article>
    `;
  }

  function renderDeadlineCardHtml(dl) {
    return `
      <article class="schedule-card kind-deadline ${dl.completed ? 'is-done' : ''}">
        <div class="card-top-row">
          <span class="card-kind-tag tag-deadline">原稿締切</span>
          <span style="font-size:11px;color:#64748b;">${dl.time ? '⏰ ' + S.escapeHtml(dl.time) : ''}</span>
        </div>
        <h4 class="card-title">${S.escapeHtml(dl.name)}</h4>
        <div class="card-meta">
          ${dl.related ? `<span>🔗 関連：${S.escapeHtml(dl.related)}</span>` : ''}
          <span>状態：<strong>${dl.completed ? '完了（入稿済）' : '未完了'}</strong></span>
        </div>
        ${dl.memo ? `<div class="card-memo">${S.escapeHtml(dl.memo)}</div>` : ''}
        <div class="card-footer-actions">
          <button type="button" class="btn btn-ghost btn-xs" data-toggle-dl="${dl.id}">
            ${dl.completed ? '↩ 未完了に戻す' : '✓ 完了にする'}
          </button>
          <button type="button" class="btn btn-secondary btn-xs" data-edit-deadline="${dl.id}">編集</button>
        </div>
      </article>
    `;
  }

  function renderCalendarGrid() {
    const ui = S.store.ui;
    const year = ui.year;
    const month = typeof ui.month === 'number' ? ui.month : 1;

    const firstDay = new Date(year, month - 1, 1);
    const startWeekday = firstDay.getDay();
    const daysInMonth = new Date(year, month, 0).getDate();
    const totalCells = startWeekday + daysInMonth > 35 ? 42 : 35;

    const allEventsMap = S.getEventsByDateMap();
    const allDeadlinesMap = S.getDeadlinesByDateMap();

    const grid = document.getElementById('calendar-grid');
    let html = '';

    for (let i = 0; i < totalCells; i++) {
      const cellDate = new Date(year, month - 1, 1 - startWeekday + i);
      const ymd = S.formatYMD(cellDate);
      const isCurrentMonth = cellDate.getMonth() === month - 1 && cellDate.getFullYear() === year;
      const dow = cellDate.getDay();

      const evts = allEventsMap.get(ymd) || [];
      const dls = allDeadlinesMap.get(ymd) || [];
      const overlapCount = countOverlapCandidates(evts);
      const hasOverlap = overlapCount >= 2;

      const classes = ['cal-cell'];
      if (!isCurrentMonth) classes.push('is-other-month');
      if (ymd === S.todayYMD) classes.push('is-today');
      if (ymd === ui.selectedDate) classes.push('is-selected');
      if (hasOverlap) classes.push('has-overlap');
      if (dow === 0) classes.push('is-sun');
      if (dow === 6) classes.push('is-sat');

      const pillsHtml = [
        ...evts.map((e) => {
          const prefix = S.statusShortChar(e.status);
          return `<div class="cal-pill st-${e.status}" title="${S.escapeHtml(e.name)} (${S.statusLabel(e.status)})">[${prefix}] ${S.escapeHtml(e.name)}</div>`;
        }),
        ...dls.map((d) => {
          return `<div class="cal-pill kind-deadline ${d.completed ? 'is-done' : ''}" title="締切: ${S.escapeHtml(d.name)}">[締] ${S.escapeHtml(d.name)}</div>`;
        })
      ].join('');

      html += `
        <div class="${classes.join(' ')}" data-date="${ymd}">
          <div class="cal-cell-top">
            <span class="cal-day-num">${cellDate.getDate()}</span>
            ${hasOverlap ? `<span class="cal-overlap-badge">被り${overlapCount}</span>` : ''}
            <button class="cal-quick-add" type="button" data-add-date="${ymd}" title="この日にイベントを追加">＋</button>
          </div>
          <div class="cal-items">${pillsHtml}</div>
        </div>
      `;
    }

    grid.innerHTML = html;
  }

  function renderSelectedDayPanel() {
    const ymd = S.store.ui.selectedDate;
    const evts = S.store.data.events.filter((e) => e.date === ymd);
    const dls = S.store.data.deadlines.filter((d) => d.date === ymd);
    const panel = document.getElementById('selected-day-panel');

    const overlapCount = countOverlapCandidates(evts);
    const overlapBanner = overlapCount >= 2
      ? `<div class="overlap-alert-banner">⚠ この日は参加・検討中のイベントが <strong>${overlapCount}件</strong> 重なっています。下のカードで場所・メモを比較し、参加状況を切り替えられます。</div>`
      : '';

    const cardsHtml = [
      ...evts.map((evt) => renderEventCardHtml(evt)),
      ...dls.map((dl) => renderDeadlineCardHtml(dl))
    ].join('');

    panel.innerHTML = `
      <div class="day-panel-header">
        <h3 class="day-panel-title">
          <span>📆 ${S.formatJapaneseDate(ymd)}</span>
          ${ymd === S.todayYMD ? `<span class="stat-pill stat-participate" style="font-size:11px;">今日</span>` : ''}
        </h3>
        <div class="day-panel-actions">
          <button class="btn btn-primary btn-xs" type="button" data-open-event-date="${ymd}">＋ この日にイベント</button>
          <button class="btn btn-accent-red btn-xs" type="button" data-open-deadline-date="${ymd}">＋ この日に締切</button>
        </div>
      </div>
      ${overlapBanner}
      ${cardsHtml
        ? `<div class="cards-compare-grid">${cardsHtml}</div>`
        : `<div class="day-empty-box">この日の予定はまだ登録されていません。右上のボタンから追加できます。</div>`
      }
    `;
  }

  function renderDayListView() {
    const ui = S.store.ui;
    const container = document.getElementById('day-list-content');
    const isNext12 = ui.month === 'next12';
    const oneYearLaterYMD = S.getOneYearLaterYMD();
    const yearPrefix = `${ui.year}-`;
    const monthPrefix = typeof ui.month === 'number' ? `${ui.year}-${S.pad2(ui.month)}-` : yearPrefix;
    const query = ui.listSearch.trim().toLowerCase();

    const dateMatch = (ymd) => {
      if (isNext12) return ymd >= S.todayYMD && ymd <= oneYearLaterYMD;
      return ymd.startsWith(monthPrefix);
    };

    const dateSet = new Set();
    S.store.data.events.forEach((e) => {
      if (dateMatch(e.date)) dateSet.add(e.date);
    });
    S.store.data.deadlines.forEach((d) => {
      if (dateMatch(d.date)) dateSet.add(d.date);
    });

    const sortedDates = Array.from(dateSet).sort();
    const blocksHtml = [];

    sortedDates.forEach((ymd) => {
      let evts = S.store.data.events.filter((e) => e.date === ymd);
      let dls = S.store.data.deadlines.filter((d) => d.date === ymd);

      if (ui.listKind === 'events') dls = [];
      if (ui.listKind === 'deadlines') evts = [];

      if (query) {
        evts = evts.filter((e) =>
          `${e.name} ${e.genre} ${e.venue} ${e.space} ${e.memo}`.toLowerCase().includes(query)
        );
        dls = dls.filter((d) =>
          `${d.name} ${d.related} ${d.memo}`.toLowerCase().includes(query)
        );
      }

      const overlapCount = countOverlapCandidates(evts);
      const isOverlapDay = overlapCount >= 2;
      if (ui.listOnlyConflicts && !isOverlapDay) return;

      if (evts.length === 0 && dls.length === 0) return;

      const cardsHtml = [
        ...evts.map((e) => renderEventCardHtml(e)),
        ...dls.map((d) => renderDeadlineCardHtml(d))
      ].join('');

      blocksHtml.push(`
        <section class="day-group-block ${isOverlapDay ? 'has-overlap' : ''}">
          <div class="day-group-head">
            <div class="day-group-date">
              <span>${S.formatJapaneseDate(ymd)}</span>
              ${isOverlapDay ? `<span class="cal-overlap-badge">⚠ 同日被り ${overlapCount}件</span>` : ''}
            </div>
            <div class="day-panel-actions">
              <button class="btn btn-primary btn-xs" type="button" data-open-event-date="${ymd}">＋ イベント</button>
              <button class="btn btn-accent-red btn-xs" type="button" data-open-deadline-date="${ymd}">＋ 締切</button>
            </div>
          </div>
          <div class="day-group-body">
            <div class="cards-compare-grid">${cardsHtml}</div>
          </div>
        </section>
      `);
    });

    if (blocksHtml.length === 0) {
      container.innerHTML = `
        <div class="day-empty-box" style="background:#fff;border:1px solid var(--border-light);border-radius:9px;padding:30px;">
          該当するスケジュールがありません。
        </div>
      `;
    } else {
      container.innerHTML = blocksHtml.join('');
    }
  }

  function renderPlanner() {
    const ui = S.store.ui;
    renderYearSelector();
    renderYearStats();
    renderMonthTabs();

    if (ui.viewMode === 'calendar' && ui.month !== 'all' && ui.month !== 'next12') {
      document.getElementById('calendar-view-container').classList.remove('hidden');
      document.getElementById('list-view-container').classList.add('hidden');
      document.getElementById('btn-view-calendar').classList.add('active');
      document.getElementById('btn-view-list').classList.remove('active');
      renderCalendarGrid();
      renderSelectedDayPanel();
    } else {
      document.getElementById('calendar-view-container').classList.add('hidden');
      document.getElementById('list-view-container').classList.remove('hidden');
      document.getElementById('btn-view-calendar').classList.remove('active');
      document.getElementById('btn-view-list').classList.add('active');
      renderDayListView();
    }
  }

  function switchScheduleModalMode(mode, { preserveInput = true } = {}) {
    const tabEvent = document.getElementById('tab-modal-event');
    const tabDeadline = document.getElementById('tab-modal-deadline');
    const formEvent = document.getElementById('form-event');
    const formDeadline = document.getElementById('form-deadline');
    const titleEl = document.getElementById('modal-event-title');

    if (mode === 'deadline') {
      if (preserveInput) {
        const evtDate = document.getElementById('evt-date').value;
        const evtName = document.getElementById('evt-name').value.trim();
        const dlDateEl = document.getElementById('dl-date');
        const isNewDeadline = !document.getElementById('dl-id').value;
        if (isNewDeadline && evtDate && dlDateEl.dataset.userModified !== 'true') {
          dlDateEl.value = evtDate;
        }
        if (evtName && !document.getElementById('dl-related').value.trim()) {
          document.getElementById('dl-related').value = evtName;
        }
      }
      tabEvent.classList.remove('active');
      tabEvent.setAttribute('aria-selected', 'false');
      tabDeadline.classList.add('active');
      tabDeadline.setAttribute('aria-selected', 'true');
      formEvent.classList.add('hidden');
      formDeadline.classList.remove('hidden');
      titleEl.textContent = document.getElementById('dl-id').value
        ? 'イベントスケジュール管理（締切編集）'
        : 'イベントスケジュール管理（締切設定）';
      setTimeout(() => document.getElementById('dl-name').focus(), 20);
    } else {
      if (preserveInput) {
        const dlDate = document.getElementById('dl-date').value;
        const dlRelated = document.getElementById('dl-related').value.trim();
        const evtDateEl = document.getElementById('evt-date');
        const isNewEvent = !document.getElementById('evt-id').value;
        if (isNewEvent && dlDate && evtDateEl.dataset.userModified !== 'true') {
          evtDateEl.value = dlDate;
        }
        if (dlRelated && !document.getElementById('evt-name').value.trim()) {
          document.getElementById('evt-name').value = dlRelated;
        }
      }
      tabDeadline.classList.remove('active');
      tabDeadline.setAttribute('aria-selected', 'false');
      tabEvent.classList.add('active');
      tabEvent.setAttribute('aria-selected', 'true');
      formDeadline.classList.add('hidden');
      formEvent.classList.remove('hidden');
      titleEl.textContent = document.getElementById('evt-id').value
        ? 'イベントスケジュール管理（編集）'
        : 'イベントスケジュール管理';
      setTimeout(() => document.getElementById('evt-name').focus(), 20);
    }
  }

  function openEventModal({ eventId = null, defaultDate = null, duplicateFrom = null } = {}) {
    P.renderPresetOptions();
    const formEvent = document.getElementById('form-event');
    const formDeadline = document.getElementById('form-deadline');
    formEvent.reset();
    formDeadline.reset();
    delete document.getElementById('evt-venue').dataset.autoFilledVenue;
    document.getElementById('dl-id').value = '';
    document.getElementById('btn-delete-deadline').classList.add('hidden');

    const delBtn = document.getElementById('btn-delete-event');
    const targetDate = defaultDate || S.store.ui.selectedDate || S.todayYMD;
    const evtDateEl = document.getElementById('evt-date');
    const dlDateEl = document.getElementById('dl-date');
    dlDateEl.value = targetDate;
    evtDateEl.dataset.userModified = 'true';
    dlDateEl.dataset.userModified = '';

    if (eventId) {
      const evt = S.store.data.events.find((e) => e.id === eventId);
      if (!evt) return;
      document.getElementById('evt-id').value = evt.id;
      document.getElementById('evt-date').value = evt.date;
      document.getElementById('dl-date').value = evt.date;
      document.getElementById('evt-name').value = evt.name;
      document.getElementById('evt-genre').value = evt.genre || '';
      document.getElementById('evt-venue').value = evt.venue;
      document.getElementById('evt-time').value = evt.time;
      document.getElementById('evt-space').value = evt.space;
      document.getElementById('evt-memo').value = evt.memo;
      document.getElementById('evt-status').value = evt.status;
      delBtn.classList.remove('hidden');
    } else if (duplicateFrom) {
      const evt = S.store.data.events.find((e) => e.id === duplicateFrom);
      const dupDate = evt ? evt.date : targetDate;
      document.getElementById('evt-id').value = '';
      document.getElementById('evt-date').value = dupDate;
      document.getElementById('dl-date').value = dupDate;
      if (evt) {
        document.getElementById('evt-name').value = evt.name;
        document.getElementById('evt-genre').value = evt.genre || '';
        document.getElementById('evt-venue').value = evt.venue;
        document.getElementById('evt-time').value = evt.time;
        document.getElementById('evt-space').value = evt.space;
        document.getElementById('evt-memo').value = evt.memo;
      }
      document.getElementById('evt-status').value = 'considering';
      delBtn.classList.add('hidden');
    } else {
      document.getElementById('evt-id').value = '';
      document.getElementById('evt-date').value = targetDate;
      document.getElementById('evt-status').value = 'participate';
      delBtn.classList.add('hidden');
    }

    switchScheduleModalMode('event', { preserveInput: false });
    S.openDialog('modal-event');
  }

  function openDeadlineModal({ deadlineId = null, defaultDate = null } = {}) {
    P.renderPresetOptions();
    const formEvent = document.getElementById('form-event');
    const formDeadline = document.getElementById('form-deadline');
    formEvent.reset();
    formDeadline.reset();
    delete document.getElementById('evt-venue').dataset.autoFilledVenue;
    document.getElementById('evt-id').value = '';
    document.getElementById('btn-delete-event').classList.add('hidden');

    const delBtn = document.getElementById('btn-delete-deadline');
    const targetDate = defaultDate || S.store.ui.selectedDate || S.todayYMD;
    const evtDateEl = document.getElementById('evt-date');
    const dlDateEl = document.getElementById('dl-date');
    evtDateEl.value = targetDate;
    dlDateEl.dataset.userModified = 'true';
    evtDateEl.dataset.userModified = '';

    if (deadlineId) {
      const dl = S.store.data.deadlines.find((d) => d.id === deadlineId);
      if (!dl) return;
      document.getElementById('dl-id').value = dl.id;
      document.getElementById('dl-date').value = dl.date;
      document.getElementById('evt-date').value = dl.date;
      document.getElementById('dl-time').value = dl.time;
      document.getElementById('dl-name').value = dl.name;
      document.getElementById('dl-related').value = dl.related;
      document.getElementById('dl-completed').checked = dl.completed;
      document.getElementById('dl-memo').value = dl.memo;
      delBtn.classList.remove('hidden');
    } else {
      document.getElementById('dl-id').value = '';
      document.getElementById('dl-date').value = targetDate;
      document.getElementById('dl-completed').checked = false;
      delBtn.classList.add('hidden');
    }

    switchScheduleModalMode('deadline', { preserveInput: false });
    S.openDialog('modal-event');
  }

  global.DSBPlanner = {
    renderPlanner,
    renderDayListView,
    switchScheduleModalMode,
    openEventModal,
    openDeadlineModal
  };
})(window);
