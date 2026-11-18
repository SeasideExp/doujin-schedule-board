(function (global) {
  'use strict';

  const S = global.DSBState;
  const P = global.DSBPresets;

  function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function getPdfLogItems(targetYear, filterMode) {
    const allItems = S.getCombinedChronologicalItems();
    if (filterMode === 'board') {
      return S.filterItems(allItems, {
        year: targetYear,
        scope: 'year',
        typeFilter: S.store.ui.boardType,
        hidePast: false,
        hideAbsent: S.store.ui.boardHideAbsent,
        hideStaff: S.store.ui.boardHideStaff,
        hideGeneral: S.store.ui.boardHideGeneral
      });
    }
    return S.filterItems(allItems, {
      year: targetYear,
      scope: 'year',
      typeFilter: filterMode,
      hidePast: false
    });
  }

  function buildPdfTableHtml(targetYear, filterMode) {
    const items = getPdfLogItems(targetYear, filterMode);
    const now = new Date();
    const nowStr = `${S.formatDisplayDate(S.todayYMD)} ${S.pad2(now.getHours())}:${S.pad2(now.getMinutes())}`;

    const evtPart = items.filter((i) => i.kind === 'event' && i.status === 'participate').length;
    const evtUnapplied = items.filter((i) => i.kind === 'event' && i.status === 'unapplied').length;
    const evtCons = items.filter((i) => i.kind === 'event' && i.status === 'considering').length;
    const evtAbs = items.filter((i) => i.kind === 'event' && i.status === 'absent').length;
    const evtGen = items.filter((i) => i.kind === 'event' && i.status === 'general').length;
    const evtStaff = items.filter((i) => i.kind === 'event' && i.status === 'staff').length;
    const dlCnt = items.filter((i) => i.kind === 'deadline').length;

    const filterLabelMap = {
      board: '発車標の種別・状況フィルタに準拠（対象年全体）',
      confirmed: '参加系イベント＋原稿締切',
      active: '参加系・検討イベント＋原稿締切',
      all: '全記録（不参加含む）',
      events_only: 'イベントのみ',
      deadlines_only: '原稿締切のみ'
    };

    const rowsHtml = items.length === 0
      ? `<tr><td colspan="7" style="text-align:center;padding:24px;color:#666;">${targetYear}年の該当ログはありません。</td></tr>`
      : items.map((item, idx) => {
          const kindText = item.kind === 'event' ? 'イベント' : '締切';
          const statusText = item.kind === 'event'
            ? S.statusLabel(item.status)
            : (item.completed ? '完了(入稿済)' : '未完了');
          const detailParts = [];
          if (item.genre) detailParts.push(`ジャンル: ${item.genre}`);
          if (item.time) detailParts.push(`時間: ${item.time}`);
          if (item.space) detailParts.push(`配置: ${item.space}`);
          if (item.memo) detailParts.push(item.memo);

          return `
            <tr>
              <td class="col-num">${idx + 1}</td>
              <td>${kindText}</td>
              <td style="white-space:nowrap;">${S.formatDisplayDate(item.date)} (${S.getWeekdayJa(item.date)})</td>
              <td><strong>${S.escapeHtml(item.name)}</strong></td>
              <td>${S.escapeHtml(item.subLocation || '—')}</td>
              <td style="white-space:nowrap;">${statusText}</td>
              <td>${S.escapeHtml(detailParts.join(' / ') || '—')}</td>
            </tr>
          `;
        }).join('');

    return `
      <div class="pdf-doc-header">
        <div>
          <h2 class="pdf-doc-title">${targetYear}年 イベント参加・原稿締切ログ</h2>
          <div style="font-size:11.5px;color:#555;margin-top:3px;">抽出条件：${filterLabelMap[filterMode] || ''}</div>
        </div>
        <div class="pdf-doc-meta">
          出力日時：${nowStr}<br />
          対象件数：${items.length}件（${S.APP_VERSION}）
        </div>
      </div>

      <div class="pdf-summary-line">
        集計：イベント［参加 ${evtPart}件 ／ 参加(未申込) ${evtUnapplied}件 ／ 検討 ${evtCons}件 ／ 不参加 ${evtAbs}件 ／ 一般参加 ${evtGen}件 ／ 売り子参加 ${evtStaff}件］　｜　原稿締切［${dlCnt}件］
      </div>

      <table class="pdf-log-table">
        <thead>
          <tr>
            <th class="col-num">No.</th>
            <th>種別</th>
            <th>年月日</th>
            <th>イベント名 / 締切名</th>
            <th>会場 / 関連イベント</th>
            <th>状況</th>
            <th>ジャンル・時間・配置・メモ</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    `;
  }

  function renderPdfModal() {
    const yearSel = document.getElementById('pdf-year-select');
    const targetYear = Number(yearSel.value) || S.store.ui.year;
    const filterMode = document.getElementById('pdf-filter-select').value;
    const html = buildPdfTableHtml(targetYear, filterMode);

    document.getElementById('pdf-preview-wrapper').innerHTML = html;
    document.getElementById('print-area').innerHTML = html;
  }

  function syncPrintArea() {
    const pdfDlg = document.getElementById('modal-pdf');
    const yearSel = document.getElementById('pdf-year-select');
    const filterSel = document.getElementById('pdf-filter-select');
    const targetYear = (pdfDlg && pdfDlg.open && yearSel && Number(yearSel.value))
      ? Number(yearSel.value)
      : S.store.ui.year;
    const filterMode = filterSel ? filterSel.value : 'board';
    const printArea = document.getElementById('print-area');
    if (printArea) {
      printArea.innerHTML = buildPdfTableHtml(targetYear, filterMode);
    }
  }

  function exportCsvLog() {
    const targetYear = Number(document.getElementById('pdf-year-select').value);
    const filterMode = document.getElementById('pdf-filter-select').value;
    const items = getPdfLogItems(targetYear, filterMode);

    const csvCell = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`;
    const header = ['No', '種別', '年月日', '曜日', 'イベント名_締切名', 'ジャンル', '会場_関連イベント', '状況', '時間', '配置', 'メモ'];
    const lines = [header.map(csvCell).join(',')];

    items.forEach((item, idx) => {
      const kindText = item.kind === 'event' ? 'イベント' : '締切';
      const statusText = item.kind === 'event'
        ? S.statusLabel(item.status)
        : (item.completed ? '完了' : '未完了');
      lines.push([
        idx + 1,
        kindText,
        item.date,
        S.getWeekdayJa(item.date),
        item.name,
        item.genre,
        item.subLocation,
        statusText,
        item.time,
        item.space,
        item.memo
      ].map(csvCell).join(','));
    });

    const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    triggerDownload(blob, `doujin-log-${targetYear}.csv`);
    S.showToast(`${targetYear}年のログをCSV出力しました`);
  }

  function exportJsonData() {
    S.store.data.appVersion = S.APP_VERSION;
    S.store.data.updatedAt = new Date().toISOString();
    const blob = new Blob([JSON.stringify(S.store.data, null, 2)], { type: 'application/json' });
    triggerDownload(blob, `doujin-schedule-${S.todayYMD}.json`);
    S.showToast('スケジュールデータをJSONで保存しました');
  }

  function handleJsonFileSelected(file) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const rawObj = JSON.parse(ev.target.result);
        const normalized = S.normalizeData(rawObj);
        if (!normalized) {
          alert('読み込めないJSON形式です。');
          return;
        }
        S.store.pendingImportData = normalized;
        document.getElementById('import-summary-box').innerHTML = `
          <div><strong>ファイル名：</strong>${S.escapeHtml(file.name)}</div>
          <div><strong>イベントデータ：</strong>${normalized.events.length}件</div>
          <div><strong>原稿締切データ：</strong>${normalized.deadlines.length}件</div>
          <div><strong>登録済みイベント名候補：</strong>${normalized.presets.events.length}件</div>
          <div><strong>登録済み場所候補：</strong>${normalized.presets.venues.length}件</div>
          <div><strong>登録済みジャンル候補：</strong>${normalized.presets.genres.length}件</div>
        `;
        S.openDialog('modal-import');
      } catch (err) {
        console.error(err);
        alert('JSONファイルの解析に失敗しました。ファイル形式を確認してください。');
      }
    };
    reader.readAsText(file, 'utf-8');
  }

  function applyImport(mode, onComplete) {
    const pending = S.store.pendingImportData;
    if (!pending) return;
    if (mode === 'replace') {
      S.store.data = pending;
    } else {
      const existingEventIds = new Set(S.store.data.events.map((e) => e.id));
      pending.events.forEach((e) => {
        const id = existingEventIds.has(e.id) ? S.genId('evt') : e.id;
        existingEventIds.add(id);
        S.store.data.events.push({ ...e, id });
      });

      const existingDlIds = new Set(S.store.data.deadlines.map((d) => d.id));
      pending.deadlines.forEach((d) => {
        const id = existingDlIds.has(d.id) ? S.genId('dl') : d.id;
        existingDlIds.add(id);
        S.store.data.deadlines.push({ ...d, id });
      });

      pending.presets.events.forEach((p) => P.addEventPreset(p.name, p.defaultVenue));
      pending.presets.venues.forEach((v) => P.addVenuePreset(v.name));
      if (Array.isArray(pending.presets.genres)) {
        pending.presets.genres.forEach((g) => P.addGenrePreset(g.name));
      }
    }
    S.store.pendingImportData = null;
    S.saveState();
    if (typeof onComplete === 'function') onComplete();
    S.closeDialog('modal-import');
    S.showToast(mode === 'replace' ? 'データを上書き読み込みしました' : 'データを追加・統合しました');
  }

  function loadSampleData(onComplete) {
    if ((S.store.data.events.length > 0 || S.store.data.deadlines.length > 0 ||
         S.store.data.presets.events.length > 0 || S.store.data.presets.venues.length > 0 ||
         S.store.data.presets.genres.length > 0) &&
        !confirm('現在の入力内容（イベント・締切・候補）をすべて初期化してサンプルデータを読み込みますか？')) {
      return;
    }

    S.store.data = {
      version: 1,
      appVersion: S.APP_VERSION,
      updatedAt: new Date().toISOString(),
      events: [],
      deadlines: [],
      presets: { events: [], venues: [], genres: [] }
    };

    const y = S.store.ui.year;
    const sampleEvents = [
      { id: S.genId('evt'), date: `${y}-11-23`, name: '◯◯ティアXX', genre: '一次創作', venue: '◯◯ビッグサイト', status: 'participate', time: '11:00-16:00', space: '東X X-99a', memo: '新刊2種＋既刊持込予定' },
      { id: S.genId('evt'), date: `${y}-11-23`, name: '✕✕創作フェス秋', genre: 'イラスト本', venue: '✕✕テックス大阪', status: 'absent', time: '11:00-15:00', space: '', memo: '日程重複のため不参加' },
      { id: S.genId('evt'), date: `${y}-11-23`, name: '△△ミニオンリー', genre: '〇〇ジャンル', venue: '△△産業プラザ', status: 'considering', time: '12:00-16:00', space: '', memo: '委託参加を検討中（同日開催）' },
      { id: S.genId('evt'), date: `${y}-12-06`, name: '冬の一次創作マーケット', genre: '一次創作', venue: '□□産業貿易センター', status: 'unapplied', time: '11:30-15:30', space: '', memo: '参加予定だが申込手続き未完了' },
      { id: S.genId('evt'), date: `${y}-12-30`, name: '◯◯マーケットXX (1日目)', genre: '〇〇ジャンル', venue: '◯◯ビッグサイト', status: 'participate', time: '10:30-16:00', space: '西X X-00b', memo: '冬新刊メイン頒布' },
      { id: S.genId('evt'), date: `${y + 1}-01-17`, name: '新春✕✕祭', genre: '〇〇ジャンル', venue: '✕✕テックス大阪', status: 'general', time: '10:30-15:00', space: '', memo: '買い物メインで一般参加予定' }
    ];

    const sampleDeadlines = [
      { id: S.genId('dl'), date: `${y}-11-16`, time: '23:59', name: '秋新刊 本文・表紙 早割入稿', related: '◯◯ティアXX', completed: false, memo: '〇〇印刷所 B5 28P' },
      { id: S.genId('dl'), date: `${y}-12-18`, time: '12:00', name: '冬新刊 表紙先入れ締切', related: '◯◯マーケットXX (1日目)', completed: false, memo: '△△プリント 箔押し加工' },
      { id: S.genId('dl'), date: `${y}-12-22`, time: '23:59', name: '冬新刊 本文最終入稿', related: '◯◯マーケットXX (1日目)', completed: false, memo: '△△プリント 通常締切' }
    ];

    S.store.data.events.push(...sampleEvents);
    S.store.data.deadlines.push(...sampleDeadlines);

    P.addEventPreset('◯◯ティア', '◯◯ビッグサイト');
    P.addEventPreset('◯◯マーケット', '◯◯ビッグサイト');
    P.addEventPreset('✕✕創作フェス', '✕✕テックス大阪');
    P.addVenuePreset('◯◯ビッグサイト');
    P.addVenuePreset('✕✕テックス大阪');
    P.addVenuePreset('△△産業プラザ');
    P.addVenuePreset('□□産業貿易センター');
    P.addGenrePreset('一次創作');
    P.addGenrePreset('〇〇ジャンル');
    P.addGenrePreset('イラスト本');

    S.store.ui.selectedDate = `${y}-11-23`;
    S.store.ui.month = 11;
    S.saveState();
    if (typeof onComplete === 'function') onComplete();
    S.showToast('初期化してサンプルデータを読み込みました（11/23の重複例も確認できます）');
  }

  global.DSBOutputs = {
    renderPdfModal,
    syncPrintArea,
    exportCsvLog,
    exportJsonData,
    handleJsonFileSelected,
    applyImport,
    loadSampleData
  };
})(window);
