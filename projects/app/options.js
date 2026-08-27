// options.js - Options Page Script for FlexPaste-Solo
import { DEFAULT_DATA, resolveVariables } from './utils.js';

let appState = {
  settings: { workdays: [1, 2, 3, 4, 5] },
  categories: [],
  selectedCategoryId: null
};

let saveDebounceTimer = null;

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
      appState.settings = result.settings || JSON.parse(JSON.stringify(DEFAULT_DATA.settings));
      appState.categories = Array.isArray(result.categories)
        ? result.categories
        : JSON.parse(JSON.stringify(DEFAULT_DATA.categories));
      if (!appState.selectedCategoryId && appState.categories.length > 0) {
        appState.selectedCategoryId = appState.categories[0].id;
      }
      if (callback) callback();
    });
  } else {
    // Fallback for standalone/local testing
    appState.settings = JSON.parse(JSON.stringify(DEFAULT_DATA.settings));
    appState.categories = JSON.parse(JSON.stringify(DEFAULT_DATA.categories));
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

function debouncedSaveStorage(delay = 300) {
  if (saveDebounceTimer) {
    clearTimeout(saveDebounceTimer);
  }
  saveDebounceTimer = setTimeout(() => {
    saveStorage(false);
  }, delay);
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

  if (!Array.isArray(appState.categories)) {
    appState.categories = [];
  }

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
  if (!Array.isArray(appState.categories)) {
    appState.categories = [];
  }

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

    const previewResolved = resolveVariables(tpl.content || '', {
      workdays: appState.settings.workdays,
      selection: '（サンプル選択テキスト）',
      page_title: 'サンプルページタイトル',
      page_url: 'https://example.com/sample'
    });

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

    // Title edit with debounced save
    titleEl.addEventListener('input', (e) => {
      tpl.title = e.target.value;
      debouncedSaveStorage();
    });

    // Content edit with immediate live preview update and debounced save
    contentEl.addEventListener('input', (e) => {
      tpl.content = e.target.value;
      previewEl.textContent = resolveVariables(tpl.content, {
        workdays: appState.settings.workdays,
        selection: '（サンプル選択テキスト）',
        page_title: 'サンプルページタイトル',
        page_url: 'https://example.com/sample'
      });
      debouncedSaveStorage();
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
          previewEl.textContent = resolveVariables(tpl.content, {
            workdays: appState.settings.workdays,
            selection: '（サンプル選択テキスト）',
            page_title: 'サンプルページタイトル',
            page_url: 'https://example.com/sample'
          });
          debouncedSaveStorage();
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

// Normalize and validate imported data
function validateAndNormalizeBackup(data) {
  if (!data || typeof data !== 'object') return null;

  const validData = {
    settings: { workdays: [1, 2, 3, 4, 5] },
    categories: []
  };

  // Validate workdays
  if (data.settings && Array.isArray(data.settings.workdays)) {
    const workdays = data.settings.workdays
      .map(d => Number(d))
      .filter(d => Number.isInteger(d) && d >= 1 && d <= 7);
    validData.settings.workdays = workdays.length > 0 ? Array.from(new Set(workdays)) : [1, 2, 3, 4, 5];
  } else if (appState.settings && Array.isArray(appState.settings.workdays)) {
    validData.settings.workdays = [...appState.settings.workdays];
  }

  // Validate categories
  if (Array.isArray(data.categories)) {
    validData.categories = data.categories.map((cat, catIdx) => {
      const catId = typeof cat?.id === 'string' && cat.id ? cat.id : generateId('cat');
      const catTitle = typeof cat?.title === 'string' ? cat.title : `カテゴリ ${catIdx + 1}`;
      const templates = Array.isArray(cat?.templates) ? cat.templates.map((tpl, tplIdx) => ({
        id: typeof tpl?.id === 'string' && tpl.id ? tpl.id : generateId('tpl'),
        title: typeof tpl?.title === 'string' ? tpl.title : `定型文 ${tplIdx + 1}`,
        content: typeof tpl?.content === 'string' ? tpl.content : ''
      })) : [];

      return {
        id: catId,
        title: catTitle,
        templates
      };
    });
  } else {
    return null;
  }

  return validData;
}

// Setup Event Handlers
function setupEventHandlers() {
  // Category Title Change
  document.getElementById('current-cat-title').addEventListener('input', (e) => {
    const currentCat = appState.categories.find(c => c.id === appState.selectedCategoryId);
    if (currentCat) {
      currentCat.title = e.target.value;
      debouncedSaveStorage();
      renderCategoryList();
    }
  });

  // Add Category
  document.getElementById('btn-add-category').addEventListener('click', () => {
    if (!Array.isArray(appState.categories)) {
      appState.categories = [];
    }
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
      renderCategoryEditor();
    });
  });

  // Variable Chips (Click & Drag)
  document.querySelectorAll('.chip').forEach(chip => {
    const tag = chip.dataset.tag;

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
        const rawData = JSON.parse(event.target.result);
        const normalized = validateAndNormalizeBackup(rawData);

        if (normalized) {
          appState.settings = normalized.settings;
          appState.categories = normalized.categories;
          appState.selectedCategoryId = appState.categories.length > 0 ? appState.categories[0].id : null;
          saveStorage(true);
          renderWorkdays();
          renderCategoryList();
          renderCategoryEditor();
          showToast('設定を復元しました');
        } else {
          alert('無効なバックアップファイルフォーマットです。カテゴリが配列構造になっていることを確認してください。');
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
