// utils.js - Shared utilities and Variable Resolution Engine for FlexPaste-Solo

export function getUILanguage() {
  if (typeof chrome !== 'undefined' && chrome.i18n && typeof chrome.i18n.getUILanguage === 'function') {
    return chrome.i18n.getUILanguage();
  }
  if (typeof navigator !== 'undefined' && navigator.language) {
    return navigator.language;
  }
  return 'en';
}

export function isJapaneseLocale() {
  const lang = getUILanguage().toLowerCase();
  return lang.startsWith('ja');
}

export function getMessage(key, substitute = null) {
  if (typeof chrome !== 'undefined' && chrome.i18n && typeof chrome.i18n.getMessage === 'function') {
    const msg = substitute !== null ? chrome.i18n.getMessage(key, [substitute]) : chrome.i18n.getMessage(key);
    if (msg) return msg;
  }
  return key;
}

const DEFAULT_DATA_JA = {
  settings: {
    workdays: [1, 2, 3, 4, 5] // 1: Mon, 5: Fri, 7: Sun
  },
  categories: [
    {
      id: "cat_1",
      title: "業務連絡",
      time_adj_interval: 0,
      use_paste: false,
      def_1: "",
      def_2: "",
      def_3: "",
      templates: [
        {
          id: "tpl_1",
          title: "日報フォーマット",
          content: "【日報】{{date_with_day}}\n\n■ 本日の業務内容\n- {{def_1}}\n\n■ 明日の予定\n- \n\n退勤時刻: {{time}}"
        },
        {
          id: "tpl_2",
          title: "業務終了報告",
          content: "本日の業務を終了します。\n稼働時間: 9:00-{{time}}\n連絡先: {{def_2}}"
        }
      ]
    },
    {
      id: "cat_2",
      title: "日程調整",
      time_adj_interval: 0,
      use_paste: false,
      def_1: "",
      def_2: "",
      def_3: "",
      templates: [
        {
          id: "tpl_3",
          title: "会議開催案内",
          content: "お世話になっております。\n以下の件について会議を設定させていただきます。\n\n件名: {{def_1}}\n参考: {{def_2}}\n候補日時: {{tomorrow_with_day}} 10:00〜\n\nご確認のほどよろしくお願いいたします。"
        }
      ]
    }
  ]
};

const DEFAULT_DATA_EN = {
  settings: {
    workdays: [1, 2, 3, 4, 5]
  },
  categories: [
    {
      id: "cat_1",
      title: "Work Updates",
      time_adj_interval: 0,
      use_paste: false,
      def_1: "",
      def_2: "",
      def_3: "",
      templates: [
        {
          id: "tpl_1",
          title: "Daily Report Format",
          content: "[Daily Report] {{date_with_day}}\n\n■ Today's Tasks\n- {{def_1}}\n\n■ Tomorrow's Plan\n- \n\nClock-out Time: {{time}}"
        },
        {
          id: "tpl_2",
          title: "End of Day Report",
          content: "Finished work for today.\nWorking Hours: 9:00-{{time}}\nContact: {{def_2}}"
        }
      ]
    },
    {
      id: "cat_2",
      title: "Scheduling",
      time_adj_interval: 0,
      use_paste: false,
      def_1: "",
      def_2: "",
      def_3: "",
      templates: [
        {
          id: "tpl_3",
          title: "Meeting Invitation",
          content: "Hello,\nI would like to schedule a meeting regarding the following:\n\nSubject: {{def_1}}\nNote: {{def_2}}\nProposed Time: {{tomorrow_with_day}} 10:00~\n\nPlease let me know if this works for you."
        }
      ]
    }
  ]
};

export const DEFAULT_DATA = isJapaneseLocale() ? DEFAULT_DATA_JA : DEFAULT_DATA_EN;

export const DEFAULT_SETTINGS = {
  workdays: [1, 2, 3, 4, 5],
  syncEnabled: false
};

/**
 * 文字列の UTF-8 バイト長を取得する。
 *
 * @param {string} str 対象の文字列。
 * @returns {number} UTF-8 バイト長。
 */
export function getByteLength(str) {
  if (typeof str !== 'string') return 0;
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(str).length;
  }
  return unescape(encodeURIComponent(str)).length;
}

/**
 * UTF-8 バイト境界を維持して文字列を指定バイト数以下ごとに分割する。
 *
 * @param {string} str 分割対象の文字列。
 * @param {number} [maxBytes=3500] 1 チャンクあたりの最大バイト数（デフォルト: 3500 バイト）。
 * @returns {Array<string>} 分割された文字列チャンクの配列。
 */
export function splitStringToByteChunks(str, maxBytes = 3500) {
  if (typeof str !== 'string' || !str) return [];
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);
  const totalBytes = bytes.length;
  if (totalBytes <= maxBytes) {
    return [str];
  }

  const decoder = new TextDecoder();
  const chunks = [];
  let start = 0;

  while (start < totalBytes) {
    let end = start + maxBytes;
    if (end >= totalBytes) {
      end = totalBytes;
    } else {
      while (end > start && (bytes[end] & 0xc0) === 0x80) {
        end--;
      }
    }
    const chunkBytes = bytes.subarray(start, end);
    chunks.push(decoder.decode(chunkBytes));
    start = end;
  }

  return chunks;
}

/**
 * インポートまたは同期された設定とカテゴリを安全な値へ正規化する。
 *
 * @param {Object} data 正規化対象のデータ。処理結果はこのオブジェクトへ反映される。
 * @returns {void}
 */
export function validateImportData(data) {
  if (!data || typeof data !== 'object') return;

  const MAX_CATEGORIES = 100;
  const MAX_TEMPLATES = 100;
  const MAX_TITLE_LEN = 200;
  const MAX_CONTENT_LEN = 10000;

  /**
   * 制御文字を除去し、指定された長さに切り詰める。
   *
   * @param {*} str 正規化する値。
   * @param {number} maxLen 最大文字数。
   * @returns {string} 正規化された文字列。
   */
  const sanitizeStr = (str, maxLen) => {
    if (typeof str !== 'string') return '';
    return str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').slice(0, maxLen);
  };

  if (data.settings && typeof data.settings === 'object') {
    if (Array.isArray(data.settings.workdays)) {
      const workdays = data.settings.workdays
        .map(d => Number(d))
        .filter(d => Number.isInteger(d) && d >= 1 && d <= 7);
      data.settings.workdays = workdays.length > 0 ? Array.from(new Set(workdays)) : [1, 2, 3, 4, 5];
    } else {
      data.settings.workdays = [1, 2, 3, 4, 5];
    }
    if ('syncEnabled' in data.settings) {
      data.settings.syncEnabled = Boolean(data.settings.syncEnabled);
    }
  }

  if (Array.isArray(data.categories)) {
    const seenCatIds = new Set();
    const seenTplIds = new Set();
    const createUniqueId = (prefix, seenIds) => {
      let id;
      do {
        id = `${prefix}_${crypto.randomUUID()}`;
      } while (seenIds.has(id));
      return id;
    };

    data.categories = data.categories.slice(0, MAX_CATEGORIES).map((cat, catIdx) => {
      let catId = typeof cat?.id === 'string' && cat.id ? sanitizeStr(cat.id, 100) : '';
      if (!catId || seenCatIds.has(catId)) {
        catId = createUniqueId('cat', seenCatIds);
      }
      seenCatIds.add(catId);

      const catTitle = typeof cat?.title === 'string' ? sanitizeStr(cat.title, MAX_TITLE_LEN) : `Category ${catIdx + 1}`;
      const timeAdjInterval = [0, 5, 10, 15, 30].includes(Number(cat?.time_adj_interval)) ? Number(cat.time_adj_interval) : 0;
      const usePaste = typeof cat?.use_paste === 'boolean' ? cat.use_paste : cat?.use_paste === 'true';
      const def1 = typeof cat?.def_1 === 'string' ? sanitizeStr(cat.def_1, MAX_TITLE_LEN) : '';
      const def2 = typeof cat?.def_2 === 'string' ? sanitizeStr(cat.def_2, MAX_TITLE_LEN) : '';
      const def3 = typeof cat?.def_3 === 'string' ? sanitizeStr(cat.def_3, MAX_TITLE_LEN) : '';

      const templates = Array.isArray(cat?.templates) ? cat.templates.slice(0, MAX_TEMPLATES).map((tpl, tplIdx) => {
        let tplId = typeof tpl?.id === 'string' && tpl.id ? sanitizeStr(tpl.id, 100) : '';
        if (!tplId || seenTplIds.has(tplId)) {
          tplId = createUniqueId('tpl', seenTplIds);
        }
        seenTplIds.add(tplId);

        return {
          id: tplId,
          title: typeof tpl?.title === 'string' ? sanitizeStr(tpl.title, MAX_TITLE_LEN) : `Template ${tplIdx + 1}`,
          content: typeof tpl?.content === 'string' ? sanitizeStr(tpl.content, MAX_CONTENT_LEN) : ''
        };
      }) : [];

      return {
        id: catId,
        title: catTitle,
        time_adj_interval: timeAdjInterval,
        use_paste: usePaste,
        def_1: def1,
        def_2: def2,
        def_3: def3,
        templates
      };
    });
  }
}

/**
 * 同期ストレージからカテゴリを復元する。
 * チャンク形式を優先し、復元できない場合のみ旧形式へフォールバックする。
 *
 * @param {Object} allSync 同期ストレージの全データ。
 * @param {string} [parseErrorMessage] JSON 解析失敗時の警告文。
 * @returns {Array<Object>|null} 復元したカテゴリ。利用可能なデータがなければ null。
 */
export function restoreCategoriesFromSync(allSync, parseErrorMessage = 'Failed to parse chunked categories:') {
  const count = allSync?.categories_chunk_count;
  if (allSync && Number.isInteger(count) && count > 0 && count <= 100) {
    const chunks = [];
    let hasAllChunks = true;

    for (let i = 0; i < count; i++) {
      const chunk = allSync[`categories_chunk_${i}`];
      if (typeof chunk !== 'string') {
        hasAllChunks = false;
        break;
      }
      chunks.push(chunk);
    }

    if (hasAllChunks) {
      try {
        const parsed = JSON.parse(chunks.join(''));
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch (e) {
        console.warn(parseErrorMessage, e);
      }
    }
  }

  return Array.isArray(allSync?.categories) ? allSync.categories : null;
}

let localSyncMutex = Promise.resolve();

/**
 * ローカルストレージ保存・同期タスクを直列化キューで実行する。
 *
 * @param {Function} task 実行する非同期タスク。
 * @returns {Promise<*>} タスクの実行結果を表す Promise。
 */
export function runInLocalSyncMutex(task) {
  const next = localSyncMutex.then(() => task(), () => task());
  localSyncMutex = next.catch(() => {});
  return next;
}

let syncSaveQueue = Promise.resolve();

/**
 * 同期が有効な場合にカテゴリを分割して同期ストレージへ保存する。
 * 各保存処理をシリアライズし、順次実行を保証する。
 *
 * @param {Array<Object>} categories 保存対象のカテゴリ。
 * @param {boolean} [force=false] 強制保存を行うかどうか。
 * @returns {Promise<void>}
 */
export function saveCategoriesToSync(categories, force = false) {
  if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.sync) {
    return Promise.resolve();
  }

  const runSave = async () => {
    const serialized = JSON.stringify(categories);
    // Strictly enforce safe byte chunks (3500 UTF-8 bytes max per chunk) to stay well under Chrome's 8192 byte QUOTA_BYTES_PER_ITEM limit
    const chunks = splitStringToByteChunks(serialized, 3500);
    const numChunks = chunks.length;

    const syncItems = {
      categories_chunk_count: numChunks
    };

    for (let i = 0; i < numChunks; i++) {
      syncItems[`categories_chunk_${i}`] = chunks[i];
    }

    // Set new chunked keys (excluding unchunked single categories item to strictly obey 8KB per-item quota)
    await chrome.storage.sync.set(syncItems);

    // Remove deprecated unchunked categories key if present
    await chrome.storage.sync.remove('categories');

    // Clean up any extra trailing chunk keys from previous larger saves
    const allSyncKeys = await chrome.storage.sync.get(null);
    const keysToRemove = Object.keys(allSyncKeys).filter(k => {
      if (!k.startsWith('categories_chunk_')) return false;
      const idx = parseInt(k.replace('categories_chunk_', ''), 10);
      return !isNaN(idx) && idx >= numChunks;
    });

    if (keysToRemove.length > 0) {
      await chrome.storage.sync.remove(keysToRemove);
    }
  };

  const nextPromise = syncSaveQueue.then(runSave, runSave);
  syncSaveQueue = nextPromise.catch(() => {});
  return nextPromise;
}

/**
 * 端末で同期が有効な場合に同期ストレージのデータをローカルへ反映する。
 *
 * @returns {Promise<void>} 同期処理の完了を表す Promise。
 */
export function syncFromCloudIfNeeded() {
  if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local || !chrome.storage.sync) {
    return Promise.resolve();
  }

  return runInLocalSyncMutex(async () => {
    try {
      const local = await chrome.storage.local.get(['settings', 'categories', 'local_sync_pending']);
      const isSyncEnabled = local.settings?.syncEnabled ?? false;
      if (!isSyncEnabled) return;

      if (local.local_sync_pending) {
        // Pending local updates exist (e.g. previous save/transmission interrupted or failed).
        // Attempt to push local changes to cloud instead of overwriting local data with stale cloud data.
        try {
          if (local.settings) {
            const { syncEnabled, ...syncableSettings } = local.settings;
            await chrome.storage.sync.set({ settings: syncableSettings });
          }
          if (Array.isArray(local.categories)) {
            await saveCategoriesToSync(local.categories, true);
          }
          await chrome.storage.local.set({ local_sync_pending: false });
          return;
        } catch (err) {
          console.warn('Failed to push pending local changes to cloud during sync recovery:', err);
          return;
        }
      }

      const allSync = await chrome.storage.sync.get(null);
      if (!allSync || Object.keys(allSync).length === 0) return;

      const categoriesFromSync = restoreCategoriesFromSync(allSync);

      const updates = {};
      const dataToValidate = {};
      // Clean up orphaned chunk keys in cloud if chunk count is valid
      const count = allSync.categories_chunk_count;
      if (Number.isInteger(count) && count > 0 && count <= 100) {
        const orphanKeys = Object.keys(allSync).filter(k => {
          if (!k.startsWith('categories_chunk_')) return false;
          const idx = parseInt(k.replace('categories_chunk_', ''), 10);
          return !isNaN(idx) && idx >= count;
        });
        if (orphanKeys.length > 0) {
          await chrome.storage.sync.remove(orphanKeys);
        }
      }

      if (categoriesFromSync) {
        dataToValidate.categories = categoriesFromSync;
      }

      if (allSync.settings && typeof allSync.settings === 'object') {
        dataToValidate.settings = { ...allSync.settings };
      }

      validateImportData(dataToValidate);

      if (dataToValidate.categories) {
        updates.categories = dataToValidate.categories;
      }

      if (dataToValidate.settings) {
        const currentLocalSettings = local.settings || {};
        updates.settings = {
          ...DEFAULT_SETTINGS,
          ...dataToValidate.settings,
          syncEnabled: currentLocalSettings.syncEnabled ?? true
        };
      }

      if (Object.keys(updates).length > 0) {
        await chrome.storage.local.set(updates);
      }
    } catch (e) {
      console.warn('Failed to sync from cloud:', e);
    }
  });
}

export function padZero(num) {
  return String(num).padStart(2, '0');
}

export function formatDateWithDay(date) {
  if (isJapaneseLocale()) {
    const weekdaysJa = ['日', '月', '火', '水', '木', '金', '土'];
    const y = date.getFullYear();
    const m = date.getMonth() + 1;
    const d = date.getDate();
    const w = weekdaysJa[date.getDay()];
    return `${y}年${m}月${d}日(${w})`;
  } else {
    const weekdaysEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthsEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const w = weekdaysEn[date.getDay()];
    const m = monthsEn[date.getMonth()];
    const d = date.getDate();
    const y = date.getFullYear();
    return `${w}, ${m} ${d}, ${y}`;
  }
}

export function formatDateShortWithDay(date) {
  if (isJapaneseLocale()) {
    const weekdaysJa = ['日', '月', '火', '水', '木', '金', '土'];
    const m = date.getMonth() + 1;
    const d = date.getDate();
    const w = weekdaysJa[date.getDay()];
    return `${m}/${d}(${w})`;
  } else {
    const weekdaysEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthsEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const w = weekdaysEn[date.getDay()];
    const m = monthsEn[date.getMonth()];
    const d = date.getDate();
    return `${w}, ${m} ${d}`;
  }
}

export function formatDate(date) {
  const y = date.getFullYear();
  const m = padZero(date.getMonth() + 1);
  const d = padZero(date.getDate());
  return `${y}/${m}/${d}`;
}

export function formatDateShort(date) {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return `${m}/${d}`;
}

export function formatTime(date) {
  const h = padZero(date.getHours());
  const m = padZero(date.getMinutes());
  return `${h}:${m}`;
}

export function adjustTime(date, intervalMinutes = 0, mode = 'prev') {
  const interval = Number(intervalMinutes) || 0;
  if (interval <= 0 || !Number.isFinite(interval)) {
    return formatTime(date);
  }
  const totalMinutes = date.getHours() * 60 + date.getMinutes();
  let adjMinutes;
  if (mode === 'prev') {
    adjMinutes = Math.floor(totalMinutes / interval) * interval;
  } else if (mode === 'next') {
    adjMinutes = Math.ceil(totalMinutes / interval) * interval;
  } else {
    adjMinutes = Math.round(totalMinutes / interval) * interval;
  }
  const h = padZero(Math.floor(adjMinutes / 60) % 24);
  const m = padZero(adjMinutes % 60);
  return `${h}:${m}`;
}

export function calculateNextWorkday(now, workdays) {
  let activeWorkdays = Array.isArray(workdays)
    ? workdays
        .filter(d => (typeof d === 'number' || (typeof d === 'string' && d.trim() !== '')) && !Array.isArray(d))
        .map(d => Number(d))
        .filter(d => Number.isInteger(d) && d >= 1 && d <= 7)
    : [1, 2, 3, 4, 5];

  if (activeWorkdays.length === 0) {
    activeWorkdays = [1, 2, 3, 4, 5];
  }

  let d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, now.getHours(), now.getMinutes(), now.getSeconds());
  for (let i = 0; i < 366; i++) {
    const day = d.getDay();
    const isoDay = day === 0 ? 7 : day;
    if (activeWorkdays.includes(isoDay)) {
      return d;
    }
    d.setDate(d.getDate() + 1);
  }
  return d;
}

export function getNextWeekDays(now) {
  const day = now.getDay();
  const isoDay = day === 0 ? 7 : day;
  const daysUntilNextMonday = 8 - isoDay;

  const result = {};
  const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  for (let i = 0; i < 7; i++) {
    const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntilNextMonday + i, now.getHours(), now.getMinutes(), now.getSeconds());
    result[`next_week_${dayNames[i]}_with_day`] = formatDateWithDay(targetDate);
    result[`next_week_${dayNames[i]}_short_with_day`] = formatDateShortWithDay(targetDate);
  }

  return result;
}

export function calculateMonthLastWorkdayDate(now, workdays) {
  let activeWorkdays = Array.isArray(workdays)
    ? workdays
        .filter(d => (typeof d === 'number' || (typeof d === 'string' && d.trim() !== '')) && !Array.isArray(d))
        .map(d => Number(d))
        .filter(d => Number.isInteger(d) && d >= 1 && d <= 7)
    : [1, 2, 3, 4, 5];

  if (activeWorkdays.length === 0) {
    activeWorkdays = [1, 2, 3, 4, 5];
  }

  // Last day of current month
  let d = new Date(now.getFullYear(), now.getMonth() + 1, 0, now.getHours(), now.getMinutes(), now.getSeconds());
  const daysInMonth = d.getDate();

  for (let i = 0; i < daysInMonth; i++) {
    const day = d.getDay();
    const isoDay = day === 0 ? 7 : day;
    if (activeWorkdays.includes(isoDay)) {
      return d;
    }
    d.setDate(d.getDate() - 1);
  }

  return new Date(now.getFullYear(), now.getMonth() + 1, 0, now.getHours(), now.getMinutes(), now.getSeconds());
}

export function calculateMonthLastWorkday(now, workdays) {
  return formatDate(calculateMonthLastWorkdayDate(now, workdays));
}

// ⚡ Bolt Optimization: Early return and lazy variable computation.
// Pre-computing 30+ Date objects, workday calculations, and formatting for every call
// causes ~10x performance overhead. Early return skips parsing entirely when no Mustache tags exist,
// and lazy evaluation computes variables on demand and caches results per call.
export function resolveVariables(templateContent, contextData = {}, now = new Date()) {
  if (!templateContent || typeof templateContent !== 'string') return '';
  if (!templateContent.includes('{{')) return templateContent;

  const workdays = contextData.workdays || [1, 2, 3, 4, 5];
  const timeAdjInterval = Number(contextData.time_adj_interval) || 0;

  const cache = new Map();

  // Lazy base date and object helpers to avoid redundant Date instantiations across variables
  let inOneHour, yesterday, tomorrow, nextWeek, nextWorkdayDate, monthEndDate, monthLastWorkdayDate, nextWeekDays;

  function getInOneHour() {
    if (!inOneHour) inOneHour = new Date(now.getTime() + 60 * 60 * 1000);
    return inOneHour;
  }
  function getYesterday() {
    if (!yesterday) yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, now.getHours(), now.getMinutes(), now.getSeconds());
    return yesterday;
  }
  function getTomorrow() {
    if (!tomorrow) tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, now.getHours(), now.getMinutes(), now.getSeconds());
    return tomorrow;
  }
  function getNextWeek() {
    if (!nextWeek) nextWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7, now.getHours(), now.getMinutes(), now.getSeconds());
    return nextWeek;
  }
  function getNextWorkdayDate() {
    if (!nextWorkdayDate) nextWorkdayDate = calculateNextWorkday(now, workdays);
    return nextWorkdayDate;
  }
  function getMonthEndDate() {
    if (!monthEndDate) monthEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, now.getHours(), now.getMinutes(), now.getSeconds());
    return monthEndDate;
  }
  function getMonthLastWorkdayDate() {
    if (!monthLastWorkdayDate) monthLastWorkdayDate = calculateMonthLastWorkdayDate(now, workdays);
    return monthLastWorkdayDate;
  }
  function getNextWeekDaysObj() {
    if (!nextWeekDays) nextWeekDays = getNextWeekDays(now);
    return nextWeekDays;
  }

  function getValue(varName) {
    if (cache.has(varName)) return cache.get(varName);

    let val;
    switch (varName) {
      case 'def_1':
        val = contextData.def_1 ?? '';
        break;
      case 'def_2':
        val = contextData.def_2 ?? '';
        break;
      case 'def_3':
        val = contextData.def_3 ?? '';
        break;
      case 'date_with_day':
        val = formatDateWithDay(now);
        break;
      case 'date':
        val = formatDate(now);
        break;
      case 'date_short':
        val = formatDateShort(now);
        break;
      case 'date_short_with_day':
        val = formatDateShortWithDay(now);
        break;
      case 'time':
        val = formatTime(now);
        break;
      case 'time_adj':
        val = adjustTime(now, timeAdjInterval, 'round');
        break;
      case 'time_prev_adj':
        val = adjustTime(now, timeAdjInterval, 'prev');
        break;
      case 'time_next_adj':
        val = adjustTime(now, timeAdjInterval, 'next');
        break;
      case 'in_one_hour':
        val = formatTime(getInOneHour());
        break;
      case 'in_one_hour_adj':
        val = adjustTime(getInOneHour(), timeAdjInterval, 'round');
        break;
      case 'in_one_hour_prev_adj':
        val = adjustTime(getInOneHour(), timeAdjInterval, 'prev');
        break;
      case 'in_one_hour_next_adj':
        val = adjustTime(getInOneHour(), timeAdjInterval, 'next');
        break;
      case 'yesterday_with_day':
        val = formatDateWithDay(getYesterday());
        break;
      case 'yesterday':
        val = formatDate(getYesterday());
        break;
      case 'yesterday_short':
        val = formatDateShort(getYesterday());
        break;
      case 'yesterday_short_with_day':
        val = formatDateShortWithDay(getYesterday());
        break;
      case 'tomorrow_with_day':
        val = formatDateWithDay(getTomorrow());
        break;
      case 'tomorrow':
        val = formatDate(getTomorrow());
        break;
      case 'tomorrow_short':
        val = formatDateShort(getTomorrow());
        break;
      case 'tomorrow_short_with_day':
        val = formatDateShortWithDay(getTomorrow());
        break;
      case 'next_workday_with_day':
        val = formatDateWithDay(getNextWorkdayDate());
        break;
      case 'next_workday':
        val = formatDate(getNextWorkdayDate());
        break;
      case 'next_workday_short':
        val = formatDateShort(getNextWorkdayDate());
        break;
      case 'next_workday_short_with_day':
        val = formatDateShortWithDay(getNextWorkdayDate());
        break;
      case 'next_week_with_day':
        val = formatDateWithDay(getNextWeek());
        break;
      case 'next_week':
        val = formatDate(getNextWeek());
        break;
      case 'next_week_short':
        val = formatDateShort(getNextWeek());
        break;
      case 'next_week_short_with_day':
        val = formatDateShortWithDay(getNextWeek());
        break;
      case 'month_end':
        val = formatDate(getMonthEndDate());
        break;
      case 'month_end_short':
        val = formatDateShort(getMonthEndDate());
        break;
      case 'month_end_with_day':
        val = formatDateWithDay(getMonthEndDate());
        break;
      case 'month_end_short_with_day':
        val = formatDateShortWithDay(getMonthEndDate());
        break;
      case 'month_last_workday':
        val = formatDate(getMonthLastWorkdayDate());
        break;
      case 'month_last_workday_short':
        val = formatDateShort(getMonthLastWorkdayDate());
        break;
      case 'month_last_workday_with_day':
        val = formatDateWithDay(getMonthLastWorkdayDate());
        break;
      case 'month_last_workday_short_with_day':
        val = formatDateShortWithDay(getMonthLastWorkdayDate());
        break;
      default: {
        if (varName.startsWith('next_week_')) {
          const daysObj = getNextWeekDaysObj();
          // Security: Use hasOwnProperty to prevent prototype property resolution (e.g. constructor)
          val = Object.prototype.hasOwnProperty.call(daysObj, varName) ? daysObj[varName] : undefined;
        } else {
          val = undefined;
        }
        break;
      }
    }

    cache.set(varName, val);
    return val;
  }

  return templateContent.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, varName) => {
    const val = getValue(varName);
    return val !== undefined ? val : match;
  });
}
