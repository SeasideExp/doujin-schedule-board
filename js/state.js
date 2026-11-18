(function (global) {
  'use strict';

  const APP_VERSION = 'Ver.0.19c';
  const APP_UPDATED_AT = '2026-11-17';
  const STORAGE_KEY = 'doujin_schedule_board_v1';
  const PREF_PANE_WIDTH_KEY = 'doujin_schedule_pane_left_pct';
  const PREF_CAL_SPLIT_KEY = 'doujin_schedule_cal_split_pct';
  const PREF_DRAWER_OPEN_KEY = 'doujin_schedule_drawer_open';
  const EVENT_STATUSES = ['participate', 'unapplied', 'considering', 'absent', 'general', 'staff'];

  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  function formatYMD(date) {
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
  }

  function getTodayYMD() {
    return formatYMD(new Date());
  }

  function getCurrentYear() {
    return new Date().getFullYear();
  }

  function getOneYearLaterYMD(baseYmd = getTodayYMD()) {
    const base = parseLocalDate(baseYmd);
    return formatYMD(new Date(base.getFullYear() + 1, base.getMonth(), base.getDate()));
  }

  function isValidYMD(ymd) {
    if (typeof ymd !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return false;
    const [y, m, d] = ymd.split('-').map(Number);
    if (y < 1000 || y > 9999 || m < 1 || m > 12 || d < 1 || d > 31) return false;
    const dt = new Date(y, m - 1, d);
    return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
  }

  function parseTimeMinutes(timeStr) {
    if (!timeStr) return null;
    const str = String(timeStr).trim();
    if (!str) return null;

    const hmMatch = str.match(/(午前|午後)?\s*(\d{1,2})\s*[:：]\s*(\d{2})/);
    if (hmMatch) {
      let h = Number(hmMatch[2]);
      const m = Number(hmMatch[3]);
      if (hmMatch[1] === '午後' && h < 12) h += 12;
      if (hmMatch[1] === '午前' && h === 12) h = 0;
      if (h >= 0 && h <= 47 && m >= 0 && m <= 59) {
        return h * 60 + m;
      }
    }

    if (str.includes('正午')) {
      return 12 * 60;
    }

    const jaMatch = str.match(/(午前|午後)?\s*(\d{1,2})\s*時(?:\s*(半)|(\d{1,2})\s*分)?/);
    if (jaMatch) {
      let h = Number(jaMatch[2]);
      const m = jaMatch[3] ? 30 : (jaMatch[4] ? Number(jaMatch[4]) : 0);
      if (jaMatch[1] === '午後' && h < 12) h += 12;
      if (jaMatch[1] === '午前' && h === 12) h = 0;
      if (h >= 0 && h <= 47 && m >= 0 && m <= 59) {
        return h * 60 + m;
      }
    }

    return null;
  }

  function parseLocalDate(ymd) {
    const [y, m, d] = ymd.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  function getWeekdayJa(ymd) {
    const names = ['日', '月', '火', '水', '木', '金', '土'];
    return names[parseLocalDate(ymd).getDay()];
  }

  function formatDisplayDate(ymd) {
    const [y, m, d] = ymd.split('-');
    return `${y}/${m}/${d}`;
  }

  function formatJapaneseDate(ymd) {
    const [y, m, d] = ymd.split('-').map(Number);
    return `${y}年${m}月${d}日 (${getWeekdayJa(ymd)})`;
  }

  function diffDaysFromToday(ymd) {
    const current = new Date();
    const todayMidnight = new Date(current.getFullYear(), current.getMonth(), current.getDate());
    const target = parseLocalDate(ymd);
    return Math.round((target.getTime() - todayMidnight.getTime()) / 86400000);
  }

  function genId(prefix) {
    if (global.crypto && typeof global.crypto.randomUUID === 'function') {
      return `${prefix}_${global.crypto.randomUUID().slice(0, 8)}`;
    }
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  }

  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function statusLabel(status) {
    if (status === 'participate') return '参加';
    if (status === 'unapplied') return '参加（未申込）';
    if (status === 'considering') return '検討';
    if (status === 'absent') return '不参加';
    if (status === 'general') return '一般参加';
    if (status === 'staff') return '売り子参加';
    return '不参加';
  }

  function statusShortChar(status) {
    if (status === 'participate') return '参';
    if (status === 'unapplied') return '未';
    if (status === 'considering') return '検';
    if (status === 'absent') return '不';
    if (status === 'general') return '般';
    if (status === 'staff') return '売';
    return '不';
  }

  function isAttendingStatus(status) {
    return status === 'participate' || status === 'unapplied' || status === 'general' || status === 'staff';
  }

  let toastTimer = null;
  function showToast(msg) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
    if (typeof el.showPopover === 'function') {
      try {
        if (el.matches(':popover-open')) {
          el.hidePopover();
        }
        el.showPopover();
      } catch (e) {
        // Fallback to standard fixed positioning when popover API is unavailable
      }
    }
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      if (typeof el.hidePopover === 'function') {
        try {
          if (el.matches(':popover-open')) {
            el.hidePopover();
          }
        } catch (e) {
          // ignore
        }
      }
      el.classList.add('hidden');
    }, 2600);
  }

  const initNow = new Date();
  const initTodayYMD = formatYMD(initNow);
  const initCurrentYear = initNow.getFullYear();

  const store = {
    data: {
      version: 1,
      appVersion: APP_VERSION,
      updatedAt: new Date().toISOString(),
      events: [],
      deadlines: [],
      presets: {
        events: [],
        venues: [],
        genres: []
      }
    },
    ui: {
      year: initCurrentYear,
      month: initNow.getMonth() + 1, // 1..12 or 'all'
      selectedDate: initTodayYMD,
      viewMode: 'calendar', // 'calendar' | 'list'
      boardScope: 'upcoming', // 'upcoming' | 'year' | 'all'
      boardType: 'all', // 'all' | 'events' | 'deadlines'
      boardHidePast: false,
      boardHideAbsent: false,
      boardHideStaff: false,
      boardHideGeneral: false,
      listOnlyConflicts: false,
      listKind: 'all',
      listSearch: ''
    },
    pendingImportData: null
  };

  function normalizeData(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
    if (data.events !== undefined && !Array.isArray(data.events)) return null;
    if (data.deadlines !== undefined && !Array.isArray(data.deadlines)) return null;
    if (data.presets !== undefined && (!data.presets || typeof data.presets !== 'object' || Array.isArray(data.presets))) return null;

    const hasEvents = Array.isArray(data.events);
    const hasDeadlines = Array.isArray(data.deadlines);
    const presets = data.presets && typeof data.presets === 'object' ? data.presets : {};
    const hasPresets = data.presets !== undefined && (
      Array.isArray(presets.events) ||
      Array.isArray(presets.venues) ||
      Array.isArray(presets.genres)
    );
    if (!hasEvents && !hasDeadlines && !hasPresets) return null;

    const events = hasEvents ? data.events : [];
    const deadlines = hasDeadlines ? data.deadlines : [];
    const presetEvents = Array.isArray(presets.events) ? presets.events : [];
    const presetVenues = Array.isArray(presets.venues) ? presets.venues : [];
    const presetGenres = Array.isArray(presets.genres) ? presets.genres : [];

    return {
      version: 1,
      appVersion: APP_VERSION,
      updatedAt: data.updatedAt || new Date().toISOString(),
      events: events
        .filter((e) => e && isValidYMD(e.date) && String(e.name || '').trim())
        .map((e) => ({
          id: String(e.id || genId('evt')),
          date: String(e.date),
          name: String(e.name).trim(),
          genre: String(e.genre || '').trim(),
          venue: String(e.venue || '').trim(),
          status: EVENT_STATUSES.includes(e.status) ? e.status : 'considering',
          time: String(e.time || '').trim(),
          space: String(e.space || '').trim(),
          memo: String(e.memo || '').trim()
        })),
      deadlines: deadlines
        .filter((d) => d && isValidYMD(d.date) && String(d.name || '').trim())
        .map((d) => ({
          id: String(d.id || genId('dl')),
          date: String(d.date),
          time: String(d.time || '').trim(),
          name: String(d.name).trim(),
          related: String(d.related || '').trim(),
          completed: Boolean(d.completed),
          memo: String(d.memo || '').trim()
        })),
      presets: {
        events: presetEvents
          .filter((p) => p && String(p.name || '').trim())
          .map((p) => ({
            id: String(p.id || genId('pe')),
            name: String(p.name).trim(),
            defaultVenue: String(p.defaultVenue || '').trim()
          })),
        venues: presetVenues
          .filter((v) => v && String(v.name || '').trim())
          .map((v) => ({
            id: String(v.id || genId('pv')),
            name: String(v.name).trim()
          })),
        genres: presetGenres
          .filter((g) => g && String(g.name || '').trim())
          .map((g) => ({
            id: String(g.id || genId('pg')),
            name: String(g.name).trim()
          }))
      }
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = normalizeData(JSON.parse(raw));
        if (parsed) {
          store.data = parsed;
        }
      }
    } catch (e) {
      console.error('Failed to load state:', e);
    }
  }

  function saveState() {
    store.data.appVersion = APP_VERSION;
    store.data.updatedAt = new Date().toISOString();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store.data));
    } catch (e) {
      console.error('Failed to save state:', e);
      showToast('ブラウザへの保存に失敗しました');
    }
  }

  function getAvailableYears() {
    const curYear = getCurrentYear();
    const years = new Set([curYear - 1, curYear, curYear + 1, curYear + 2, store.ui.year]);
    store.data.events.forEach((e) => years.add(Number(e.date.slice(0, 4))));
    store.data.deadlines.forEach((d) => years.add(Number(d.date.slice(0, 4))));
    return Array.from(years).sort((a, b) => a - b);
  }

  function getEventsByDateMap(yearFilter = null) {
    const map = new Map();
    store.data.events.forEach((evt) => {
      if (yearFilter !== null && Number(evt.date.slice(0, 4)) !== yearFilter) return;
      if (!map.has(evt.date)) map.set(evt.date, []);
      map.get(evt.date).push(evt);
    });
    return map;
  }

  function getDeadlinesByDateMap(yearFilter = null) {
    const map = new Map();
    store.data.deadlines.forEach((dl) => {
      if (yearFilter !== null && Number(dl.date.slice(0, 4)) !== yearFilter) return;
      if (!map.has(dl.date)) map.set(dl.date, []);
      map.get(dl.date).push(dl);
    });
    return map;
  }

  function getCombinedChronologicalItems() {
    const items = [];
    store.data.events.forEach((evt) => {
      items.push({
        kind: 'event',
        id: evt.id,
        date: evt.date,
        time: evt.time,
        name: evt.name,
        genre: evt.genre || '',
        subLocation: evt.venue,
        space: evt.space,
        status: evt.status,
        completed: false,
        memo: evt.memo,
        raw: evt
      });
    });
    store.data.deadlines.forEach((dl) => {
      items.push({
        kind: 'deadline',
        id: dl.id,
        date: dl.date,
        time: dl.time,
        name: dl.name,
        genre: '',
        subLocation: dl.related,
        space: '',
        status: dl.completed ? 'done' : 'deadline',
        completed: dl.completed,
        memo: dl.memo,
        raw: dl
      });
    });

    items.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      if (a.time !== b.time) {
        if (!a.time) return 1;
        if (!b.time) return -1;
        const minA = parseTimeMinutes(a.time);
        const minB = parseTimeMinutes(b.time);
        if (minA !== null && minB !== null) {
          if (minA !== minB) return minA - minB;
        } else if (minA !== null) {
          return -1;
        } else if (minB !== null) {
          return 1;
        }
        return a.time.localeCompare(b.time, 'ja');
      }
      if (a.kind !== b.kind) return a.kind === 'deadline' ? -1 : 1;
      return a.name.localeCompare(b.name, 'ja');
    });
    return items;
  }

  function filterItems(items, {
    year = null,
    scope = 'all',
    typeFilter = 'all',
    hidePast = false,
    hideAbsent = false,
    hideStaff = false,
    hideGeneral = false
  }) {
    return items.filter((item) => {
      if (scope === 'year' && year !== null) {
        if (Number(item.date.slice(0, 4)) !== year) return false;
      } else if (scope === 'upcoming') {
        if (diffDaysFromToday(item.date) < 0) return false;
      }

      if (hidePast) {
        if (diffDaysFromToday(item.date) < 0) return false;
        if (item.kind === 'deadline' && item.completed) return false;
      }

      if (item.kind === 'event') {
        if (hideAbsent && item.status === 'absent') return false;
        if (hideStaff && item.status === 'staff') return false;
        if (hideGeneral && item.status === 'general') return false;
      }

      if (typeFilter === 'active') {
        if (item.kind === 'event' && item.status === 'absent') return false;
      } else if (typeFilter === 'confirmed') {
        if (item.kind === 'event' && !isAttendingStatus(item.status)) return false;
      } else if (typeFilter === 'events' || typeFilter === 'events_only') {
        if (item.kind !== 'event') return false;
      } else if (typeFilter === 'deadlines' || typeFilter === 'deadlines_only') {
        if (item.kind !== 'deadline') return false;
      }

      return true;
    });
  }

  function openDialog(id) {
    const dlg = document.getElementById(id);
    if (dlg && typeof dlg.showModal === 'function' && !dlg.open) {
      dlg.showModal();
    }
  }

  function closeDialog(id) {
    const dlg = document.getElementById(id);
    if (dlg && typeof dlg.close === 'function' && dlg.open) {
      dlg.close();
    }
  }

  global.DSBState = {
    APP_VERSION,
    APP_UPDATED_AT,
    STORAGE_KEY,
    PREF_PANE_WIDTH_KEY,
    PREF_CAL_SPLIT_KEY,
    PREF_DRAWER_OPEN_KEY,
    EVENT_STATUSES,
    get todayYMD() {
      return getTodayYMD();
    },
    get currentYear() {
      return getCurrentYear();
    },
    store,
    pad2,
    formatYMD,
    getOneYearLaterYMD,
    isValidYMD,
    parseTimeMinutes,
    parseLocalDate,
    getWeekdayJa,
    formatDisplayDate,
    formatJapaneseDate,
    diffDaysFromToday,
    genId,
    escapeHtml,
    statusLabel,
    statusShortChar,
    isAttendingStatus,
    showToast,
    normalizeData,
    loadState,
    saveState,
    getAvailableYears,
    getEventsByDateMap,
    getDeadlinesByDateMap,
    getCombinedChronologicalItems,
    filterItems,
    openDialog,
    closeDialog
  };
})(window);
