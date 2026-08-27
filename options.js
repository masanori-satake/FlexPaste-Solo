// options.js - Options Page Script for FlexPaste-Solo

const DEFAULT_DATA = {
  settings: {
    workdays: [1, 2, 3, 4, 5]
  },
  categories: [
    {
      id: "cat_1",
      title: "業務連絡",
      templates: [
        {
          id: "tpl_1",
          title: "日報フォーマット",
          content: "【日報】{{date_with_day}}\n\n■ 本日の業務内容\n- {{selection}}\n\n■ 明日の予定\n- \n\n退勤時刻: {{time}}"
        },
        {
          id: "tpl_2",
          title: "業務終了報告",
          content: "本日の業務を終了します。\n稼働時間: 9:00-{{time}}\n対象: {{selection}}"
        }
      ]
    },
    {
      id: "cat_2",
      title: "日程調整",
      templates: [
        {
          id: "tpl_3",
          title: "会議開催案内",
          content: "お世話になっております。\n以下の件について会議を設定させていただきます。\n\n件名: {{page_title}}\n参考URL: {{page_url}}\n候補日時: {{tomorrow_with_day}} 10:00〜\n\nご確認のほどよろしくお願いいたします。"
        }
      ]
    }
  ]
};

let appState = {
  settings: { workdays: [1, 2, 3, 4, 5] },
  categories: [],
  selectedCategoryId: null
};

// Variable Resolution Engine (for preview)
function padZero(num) {
  return String(num).padStart(2, '0');
}

function formatDateWithDay(date) {
  const weekdaysJa = ['日', '月', '火', '水', '木', '金', '土'];
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const w = weekdaysJa[date.getDay()];
  return `${y}年${m}月${d}日(${w})`;
}

function formatDate(date) {
  const y = date.getFullYear();
  const m = padZero(date.getMonth() + 1);
  const d = padZero(date.getDate());
  return `${y}/${m}/${d}`;
}

function formatTime(date) {
  const h = padZero(date.getHours());
  const m = padZero(date.getMinutes());
  return `${h}:${m}`;
}

function formatTimeWithSec(date) {
  const h = padZero(date.getHours());
  const m = padZero(date.getMinutes());
  const s = padZero(date.getSeconds());
  return `${h}:${m}:${s}`;
}

function calculateMonthLastWorkday(now, workdays) {
  const activeWorkdays = Array.isArray(workdays) && workdays.length > 0 ? workdays : [1, 2, 3, 4, 5];
  let d = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  while (d.getDate() > 0) {
    const day = d.getDay();
    const isoDay = day === 0 ? 7 : day;
    if (activeWorkdays.includes(isoDay)) {
      return formatDate(d);
    }
    d.setDate(d.getDate() - 1);
  }
  return formatDate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
}

function resolveVariables(templateContent, contextData = {}, now = new Date()) {
  const workdays = contextData.workdays || [1, 2, 3, 4, 5];
  const selection = contextData.selection || '（サンプル選択テキスト）';
  const pageTitle = contextData.page_title || 'サンプルページタイトル';
  const pageUrl = contextData.page_url || 'https://example.com/sample';

  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, now.getHours(), now.getMinutes(), now.getSeconds());
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, now.getHours(), now.getMinutes(), now.getSeconds());
  const nextWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7, now.getHours(), now.getMinutes(), now.getSeconds());
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const replacements = {
    'date_with_day': formatDateWithDay(now),
    'date': formatDate(now),
    'time': formatTime(now),
    'time_with_sec': formatTimeWithSec(now),
    'yesterday_with_day': formatDateWithDay(yesterday),
    'yesterday': formatDate(yesterday),
    'tomorrow_with_day': formatDateWithDay(tomorrow),
    'tomorrow': formatDate(tomorrow),
    'next_week_with_day': formatDateWithDay(nextWeek),
    'next_week': formatDate(nextWeek),
    'month_end': formatDate(monthEnd),
    'month_last_workday': calculateMonthLastWorkday(now, workdays),
    'selection': selection,
    'page_title': pageTitle,
    'page_url': pageUrl
  };

  return templateContent.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, varName) => {
    return Object.prototype.hasOwnProperty.call(replacements, varName) ? replacements[varName] : match;
  });
}

// Toast notification
function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.remove('hidden');
  setTimeout(() => {
    toast.classList.add('hidden');
  }, 2500);
}

// Storage helpers
function loadStorage(callback) {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['categories', 'settings'], (result) => {
      appState.settings = result.settings || DEFAULT_DATA.settings;
      appState.categories = result.categories || DEFAULT_DATA.categories;
      if (!appState.selectedCategoryId && appState.categories.length > 0) {
        appState.selectedCategoryId = appState.categories[0].id;
      }
      if (callback) callback();
    });
  } else {
    // Fallback for standalone/local testing
    appState.settings = DEFAULT_DATA.settings;
    appState.categories = DEFAULT_DATA.categories;
    appState.selectedCategoryId = appState.categories[0].id;
    if (callback) callback();
  }
}

function saveStorage(showNotification = true) {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.set({
      settings: appState.settings,
      categories: appState.categories
    }, () => {
      if (showNotification) showToast('保存しました');
    });
  } else if (showNotification) {
    showToast('保存しました');
  }
}

// Render Functions
function renderWorkdays() {
  const checkboxes = document.querySelectorAll('.workday-cb');
  const activeDays = appState.settings.workdays || [1, 2, 3, 4, 5];
  checkboxes.forEach(cb => {
    cb.checked = activeDays.includes(parseInt(cb.value, 10));
  });
}

function renderCategoryList() {
  const container = document.getElementById('category-list');
  container.innerHTML = '';

  appState.categories.forEach((cat, index) => {
    const item = document.createElement('div');
    item.className = `category-item ${cat.id === appState.selectedCategoryId ? 'active' : ''}`;
    item.dataset.id = cat.id;
    item.dataset.index = index;
    item.draggable = true;

    item.innerHTML = `
      <div class="category-item-content">
        <span class="drag-handle">⋮⋮</span>
        <span class="category-title">${escapeHtml(cat.title || '（無題のカテゴリ）')}</span>
      </div>
    `;

    item.addEventListener('click', () => {
      appState.selectedCategoryId = cat.id;
      renderCategoryList();
      renderCategoryEditor();
    });

    // Category Drag & Drop Reordering
    item.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'category', index }));
      item.classList.add('dragging');
    });

    item.addEventListener('dragend', () => {
      item.classList.remove('dragging');
    });

    item.addEventListener('dragover', (e) => {
      e.preventDefault();
      item.classList.add('drag-over');
    });

    item.addEventListener('dragleave', () => {
      item.classList.remove('drag-over');
    });

    item.addEventListener('drop', (e) => {
      e.preventDefault();
      item.classList.remove('drag-over');
      try {
        const data = JSON.parse(e.dataTransfer.getData('text/plain'));
        if (data.type === 'category' && data.index !== index) {
          const movedCat = appState.categories.splice(data.index, 1)[0];
          appState.categories.splice(index, 0, movedCat);
          saveStorage(false);
          renderCategoryList();
        }
      } catch (err) {
        // Not a category drag
      }
    });

    container.appendChild(item);
  });
}

function renderCategoryEditor() {
  const editorArea = document.getElementById('category-editor');
  const currentCat = appState.categories.find(c => c.id === appState.selectedCategoryId);

  if (!currentCat) {
    editorArea.style.display = 'none';
    return;
  }

  editorArea.style.display = 'block';

  // Category Title
  const titleInput = document.getElementById('current-cat-title');
  titleInput.value = currentCat.title || '';

  // Render Templates
  const templatesContainer = document.getElementById('templates-container');
  templatesContainer.innerHTML = '';

  if (!currentCat.templates || currentCat.templates.length === 0) {
    templatesContainer.innerHTML = '<p class="setting-desc">このカテゴリにはテンプレートがありません。「テンプレート追加」ボタンをクリックして作成してください。</p>';
    return;
  }

  currentCat.templates.forEach((tpl, tplIndex) => {
    const card = document.createElement('div');
    card.className = 'template-card';
    card.dataset.id = tpl.id;
    card.dataset.index = tplIndex;
    card.draggable = true;

    const previewResolved = resolveVariables(tpl.content || '', { workdays: appState.settings.workdays });

    card.innerHTML = `
      <div class="template-card-header">
        <span class="tpl-drag-handle">⋮⋮</span>
        <div class="input-field template-title-input">
          <input type="text" class="tpl-title-val" value="${escapeHtml(tpl.title || '')}" placeholder="テンプレート名...">
        </div>
        <button class="btn btn-outlined text-danger btn-delete-tpl" title="テンプレート削除">削除</button>
      </div>
      <div class="input-field template-content-field">
        <label>テンプレート本文</label>
        <textarea class="tpl-content-val" placeholder="本文を入力... マスタッシュタグ {{variable}} が使えます">${escapeHtml(tpl.content || '')}</textarea>
      </div>
      <div class="preview-box">
        <div class="preview-title">⚡ リアルタイムプレビュー</div>
        <div class="preview-content">${escapeHtml(previewResolved)}</div>
      </div>
    `;

    const titleEl = card.querySelector('.tpl-title-val');
    const contentEl = card.querySelector('.tpl-content-val');
    const previewEl = card.querySelector('.preview-content');
    const deleteBtn = card.querySelector('.btn-delete-tpl');

    // Title edit
    titleEl.addEventListener('input', (e) => {
      tpl.title = e.target.value;
      saveStorage(false);
    });

    // Content edit with live preview update
    contentEl.addEventListener('input', (e) => {
      tpl.content = e.target.value;
      previewEl.textContent = resolveVariables(tpl.content, { workdays: appState.settings.workdays });
      saveStorage(false);
    });

    // Allow drop on textarea for variable chips
    contentEl.addEventListener('dragover', (e) => {
      e.preventDefault();
      contentEl.classList.add('drag-over');
    });

    contentEl.addEventListener('dragleave', () => {
      contentEl.classList.remove('drag-over');
    });

    contentEl.addEventListener('drop', (e) => {
      e.preventDefault();
      contentEl.classList.remove('drag-over');
      try {
        const data = JSON.parse(e.dataTransfer.getData('text/plain'));
        if (data.type === 'chip' && data.tag) {
          insertTagAtCursor(contentEl, data.tag);
          tpl.content = contentEl.value;
          previewEl.textContent = resolveVariables(tpl.content, { workdays: appState.settings.workdays });
          saveStorage(false);
        }
      } catch (err) {
        // Not a chip drag
      }
    });

    // Delete Template
    deleteBtn.addEventListener('click', () => {
      if (confirm(`テンプレート「${tpl.title || '無題'}」を削除してもよろしいですか？`)) {
        currentCat.templates.splice(tplIndex, 1);
        saveStorage(true);
        renderCategoryEditor();
      }
    });

    // Template Drag & Drop Reordering
    card.addEventListener('dragstart', (e) => {
      // Avoid starting template drag when dragging handle or child elements if clicking textareas
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        e.preventDefault();
        return;
      }
      e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'template', index: tplIndex }));
      card.classList.add('dragging');
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
    });

    card.addEventListener('dragover', (e) => {
      e.preventDefault();
      card.classList.add('drag-over');
    });

    card.addEventListener('dragleave', () => {
      card.classList.remove('drag-over');
    });

    card.addEventListener('drop', (e) => {
      e.preventDefault();
      card.classList.remove('drag-over');
      try {
        const data = JSON.parse(e.dataTransfer.getData('text/plain'));
        if (data.type === 'template' && data.index !== tplIndex) {
          const movedTpl = currentCat.templates.splice(data.index, 1)[0];
          currentCat.templates.splice(tplIndex, 0, movedTpl);
          saveStorage(false);
          renderCategoryEditor();
        }
      } catch (err) {
        // Not a template drag
      }
    });

    templatesContainer.appendChild(card);
  });
}

// Cursor Insertion Helper
function insertTagAtCursor(textarea, tag) {
  textarea.focus();
  const start = textarea.selectionStart ?? textarea.value.length;
  const end = textarea.selectionEnd ?? textarea.value.length;
  const val = textarea.value;
  textarea.value = val.substring(0, start) + tag + val.substring(end);
  const newPos = start + tag.length;
  textarea.setSelectionRange(newPos, newPos);
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
}

// Utility
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function generateId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
}

// Setup Event Handlers
function setupEventHandlers() {
  // Category Title Change
  document.getElementById('current-cat-title').addEventListener('input', (e) => {
    const currentCat = appState.categories.find(c => c.id === appState.selectedCategoryId);
    if (currentCat) {
      currentCat.title = e.target.value;
      saveStorage(false);
      renderCategoryList();
    }
  });

  // Add Category
  document.getElementById('btn-add-category').addEventListener('click', () => {
    const newCat = {
      id: generateId('cat'),
      title: '新しいカテゴリ',
      templates: []
    };
    appState.categories.push(newCat);
    appState.selectedCategoryId = newCat.id;
    saveStorage(true);
    renderCategoryList();
    renderCategoryEditor();
  });

  // Delete Category
  document.getElementById('btn-delete-category').addEventListener('click', () => {
    const currentCat = appState.categories.find(c => c.id === appState.selectedCategoryId);
    if (!currentCat) return;

    if (confirm(`カテゴリ「${currentCat.title}」と配下のテンプレートをすべて削除してもよろしいですか？`)) {
      appState.categories = appState.categories.filter(c => c.id !== appState.selectedCategoryId);
      appState.selectedCategoryId = appState.categories.length > 0 ? appState.categories[0].id : null;
      saveStorage(true);
      renderCategoryList();
      renderCategoryEditor();
    }
  });

  // Add Template
  document.getElementById('btn-add-template').addEventListener('click', () => {
    const currentCat = appState.categories.find(c => c.id === appState.selectedCategoryId);
    if (!currentCat) return;

    if (!Array.isArray(currentCat.templates)) {
      currentCat.templates = [];
    }

    const newTpl = {
      id: generateId('tpl'),
      title: '新しい定型文',
      content: ''
    };
    currentCat.templates.push(newTpl);
    saveStorage(true);
    renderCategoryEditor();
  });

  // Workday Checkboxes
  document.querySelectorAll('.workday-cb').forEach(cb => {
    cb.addEventListener('change', () => {
      const selected = Array.from(document.querySelectorAll('.workday-cb:checked'))
        .map(el => parseInt(el.value, 10));
      appState.settings.workdays = selected;
      saveStorage(true);
      // Re-render preview for updated month_last_workday calculation
      renderCategoryEditor();
    });
  });

  // Variable Chips (Click & Drag)
  document.querySelectorAll('.chip').forEach(chip => {
    const tag = chip.dataset.tag;

    // Click insertion target: active text area or last focused text area in templates
    chip.addEventListener('click', () => {
      const activeEl = document.activeElement;
      let targetTextarea = null;

      if (activeEl && activeEl.tagName === 'TEXTAREA') {
        targetTextarea = activeEl;
      } else {
        targetTextarea = document.querySelector('.template-content-field textarea');
      }

      if (targetTextarea) {
        insertTagAtCursor(targetTextarea, tag);
      } else {
        showToast('テンプレート本文に入力カーソルを合わせてからクリックしてください');
      }
    });

    chip.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'chip', tag }));
    });
  });

  // Backup Export
  document.getElementById('btn-export').addEventListener('click', () => {
    const exportData = {
      settings: appState.settings,
      categories: appState.categories
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FlexPaste_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('バックアップをエクスポートしました');
  });

  // Backup Import
  const fileInput = document.getElementById('file-import');
  document.getElementById('btn-import').addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (data && (data.categories || data.settings)) {
          if (data.settings) appState.settings = data.settings;
          if (data.categories) appState.categories = data.categories;
          appState.selectedCategoryId = appState.categories.length > 0 ? appState.categories[0].id : null;
          saveStorage(true);
          renderWorkdays();
          renderCategoryList();
          renderCategoryEditor();
          showToast('設定を復元しました');
        } else {
          alert('無効なバックアップファイルフォーマットです。');
        }
      } catch (err) {
        alert('JSONファイルの読み込みに失敗しました: ' + err.message);
      }
    };
    reader.readAsText(file);
    fileInput.value = '';
  });

  // Reset to Defaults
  document.getElementById('btn-reset').addEventListener('click', () => {
    if (confirm('すべての設定と定型文を初期状態に戻しますか？（現在のデータは消去されます）')) {
      appState.settings = JSON.parse(JSON.stringify(DEFAULT_DATA.settings));
      appState.categories = JSON.parse(JSON.stringify(DEFAULT_DATA.categories));
      appState.selectedCategoryId = appState.categories[0].id;
      saveStorage(true);
      renderWorkdays();
      renderCategoryList();
      renderCategoryEditor();
      showToast('初期状態にリセットしました');
    }
  });
}

// Initialization
document.addEventListener('DOMContentLoaded', () => {
  loadStorage(() => {
    renderWorkdays();
    renderCategoryList();
    renderCategoryEditor();
    setupEventHandlers();
  });
});
