(function (global) {
  'use strict';

  const S = global.DSBState;

  function addEventPreset(name, defaultVenue = '') {
    const trimmed = name.trim();
    if (!trimmed) return false;
    const venueTrimmed = defaultVenue.trim();
    const existing = S.store.data.presets.events.find((p) => p.name === trimmed);
    if (existing) {
      if (venueTrimmed && !existing.defaultVenue) {
        existing.defaultVenue = venueTrimmed;
        S.saveState();
        renderPresetOptions();
        return true;
      }
      return false;
    }
    S.store.data.presets.events.push({
      id: S.genId('pe'),
      name: trimmed,
      defaultVenue: venueTrimmed
    });
    S.saveState();
    renderPresetOptions();
    return true;
  }

  function addVenuePreset(name) {
    const trimmed = name.trim();
    if (!trimmed) return false;
    if (S.store.data.presets.venues.some((v) => v.name === trimmed)) return false;
    S.store.data.presets.venues.push({
      id: S.genId('pv'),
      name: trimmed
    });
    S.saveState();
    renderPresetOptions();
    return true;
  }

  function addGenrePreset(name) {
    const trimmed = name.trim();
    if (!trimmed) return false;
    if (S.store.data.presets.genres.some((g) => g.name === trimmed)) return false;
    S.store.data.presets.genres.push({
      id: S.genId('pg'),
      name: trimmed
    });
    S.saveState();
    renderPresetOptions();
    return true;
  }

  function renderPresetOptions() {
    const evtDatalist = document.getElementById('datalist-event-presets');
    evtDatalist.innerHTML = S.store.data.presets.events
      .map((p) => `<option value="${S.escapeHtml(p.name)}"></option>`)
      .join('');

    const venueDatalist = document.getElementById('datalist-venue-presets');
    venueDatalist.innerHTML = S.store.data.presets.venues
      .map((v) => `<option value="${S.escapeHtml(v.name)}"></option>`)
      .join('');

    const genreDatalist = document.getElementById('datalist-genre-presets');
    genreDatalist.innerHTML = S.store.data.presets.genres
      .map((g) => `<option value="${S.escapeHtml(g.name)}"></option>`)
      .join('');

    const evtChips = document.getElementById('evt-preset-chips');
    if (S.store.data.presets.events.length === 0) {
      evtChips.innerHTML = `<span class="preset-empty-hint">※ よく参加するイベント名を入力して右上の「★ 候補に保存」を押すとここに並びます</span>`;
    } else {
      evtChips.innerHTML = S.store.data.presets.events.map((p) => `
        <button type="button" class="chip-btn" data-pick-evt-preset="${S.escapeHtml(p.name)}" data-pick-evt-venue="${S.escapeHtml(p.defaultVenue)}">
          ${S.escapeHtml(p.name)}${p.defaultVenue ? ` <span style="opacity:0.65;">(${S.escapeHtml(p.defaultVenue)})</span>` : ''}
        </button>
      `).join('');
    }

    const venueChips = document.getElementById('venue-preset-chips');
    if (S.store.data.presets.venues.length === 0) {
      venueChips.innerHTML = `<span class="preset-empty-hint">※ よく使う場所を入力して「★ 候補に保存」を押すとここに並びます</span>`;
    } else {
      venueChips.innerHTML = S.store.data.presets.venues.map((v) => `
        <button type="button" class="chip-btn" data-pick-venue-preset="${S.escapeHtml(v.name)}">
          📍 ${S.escapeHtml(v.name)}
        </button>
      `).join('');
    }

    const genreChips = document.getElementById('genre-preset-chips');
    if (S.store.data.presets.genres.length === 0) {
      genreChips.innerHTML = `<span class="preset-empty-hint">※ よく使うジャンル名を入力して「★ 候補に保存」を押すとここに並びます</span>`;
    } else {
      genreChips.innerHTML = S.store.data.presets.genres.map((g) => `
        <button type="button" class="chip-btn" data-pick-genre-preset="${S.escapeHtml(g.name)}">
          🎨 ${S.escapeHtml(g.name)}
        </button>
      `).join('');
    }

    const relDatalist = document.getElementById('datalist-related-events');
    const uniqueEventNames = new Set([
      ...S.store.data.events.map((e) => e.name),
      ...S.store.data.presets.events.map((p) => p.name)
    ]);
    relDatalist.innerHTML = Array.from(uniqueEventNames)
      .map((name) => `<option value="${S.escapeHtml(name)}"></option>`)
      .join('');
  }

  function renderPresetManagerLists() {
    const evtList = document.getElementById('preset-event-list');
    if (S.store.data.presets.events.length === 0) {
      evtList.innerHTML = `<li class="preset-empty-hint">まだ登録されていません</li>`;
    } else {
      evtList.innerHTML = S.store.data.presets.events.map((p) => `
        <li class="preset-manage-item">
          <div>
            <strong>${S.escapeHtml(p.name)}</strong>
            ${p.defaultVenue ? `<span class="preset-item-sub">既定の場所：${S.escapeHtml(p.defaultVenue)}</span>` : ''}
          </div>
          <button type="button" class="btn btn-danger-ghost btn-xs" data-del-evt-preset="${p.id}">削除</button>
        </li>
      `).join('');
    }

    const venueList = document.getElementById('preset-venue-list');
    if (S.store.data.presets.venues.length === 0) {
      venueList.innerHTML = `<li class="preset-empty-hint">まだ登録されていません</li>`;
    } else {
      venueList.innerHTML = S.store.data.presets.venues.map((v) => `
        <li class="preset-manage-item">
          <span>📍 <strong>${S.escapeHtml(v.name)}</strong></span>
          <button type="button" class="btn btn-danger-ghost btn-xs" data-del-venue-preset="${v.id}">削除</button>
        </li>
      `).join('');
    }

    const genreList = document.getElementById('preset-genre-list');
    if (S.store.data.presets.genres.length === 0) {
      genreList.innerHTML = `<li class="preset-empty-hint">まだ登録されていません</li>`;
    } else {
      genreList.innerHTML = S.store.data.presets.genres.map((g) => `
        <li class="preset-manage-item">
          <span>🎨 <strong>${S.escapeHtml(g.name)}</strong></span>
          <button type="button" class="btn btn-danger-ghost btn-xs" data-del-genre-preset="${g.id}">削除</button>
        </li>
      `).join('');
    }
  }

  global.DSBPresets = {
    addEventPreset,
    addVenuePreset,
    addGenrePreset,
    renderPresetOptions,
    renderPresetManagerLists
  };
})(window);
