// options.js - Options Page Script for FlexPaste-Solo
import { DEFAULT_DATA, resolveVariables } from './utils.js';

const VARIABLE_MAP = {
  '{{date}}': { label: '今日', icon: 'calendar_today' },
  '{{date_with_day}}': { label: '今日(曜日有)', icon: 'calendar_today' },
  '{{tomorrow}}': { label: '明日', icon: 'arrow_forward' },
  '{{tomorrow_with_day}}': { label: '明日(曜日有)', icon: 'arrow_forward' },
  '{{next_workday}}': { label: '次稼働日', icon: 'work' },
  '{{next_workday_with_day}}': { label: '次稼働日(曜日有)', icon: 'work' },
  '{{next_week}}': { label: '一週間後', icon: 'fast_forward' },
  '{{next_week_with_day}}': { label: '一週間後(曜日有)', icon: 'fast_forward' },
  '{{yesterday}}': { label: '昨日', icon: 'arrow_back' },
  '{{yesterday_with_day}}': { label: '昨日(曜日有)', icon: 'arrow_back' },
  '{{next_week_monday_with_day}}': { label: '次月曜日', icon: 'event' },
  '{{next_week_tuesday_with_day}}': { label: '次火曜日', icon: 'event' },
  '{{next_week_wednesday_with_day}}': { label: '次水曜日', icon: 'event' },
  '{{next_week_thursday_with_day}}': { label: '次木曜日', icon: 'event' },
  '{{next_week_friday_with_day}}': { label: '次金曜日', icon: 'event' },
  '{{next_week_saturday_with_day}}': { label: '次土曜日', icon: 'event' },
  '{{next_week_sunday_with_day}}': { label: '次日曜日', icon: 'event' },
  '{{month_end}}': { label: '月末', icon: 'calendar_month' },
  '{{month_last_workday}}': { label: '月末最終稼働日', icon: 'domain' },
  '{{selection}}': { label: '選択テキスト', icon: 'content_cut' },
  '{{page_title}}': { label: 'ページタイトル', icon: 'description' },
  '{{page_url}}': { label: 'ページURL', icon: 'link' },
  '{{time}}': { label: '時刻', icon: 'schedule' },
  '{{time_with_sec}}': { label: '時刻(秒有)', icon: 'schedule' }
};

let appState = {
  settings: { workdays: [1, 2, 3, 4, 5] },
  categories: [],
  selectedCategoryId: null
};

// Helper: Create inline variable chip element
function createChipNode(tag) {
  const meta = VARIABLE_MAP[tag] || { label: tag.replace(/[\{\}]/g, ''), icon: 'code' };
  const span = document.createElement('span');
  span.className = 'tpl-chip';
  span.contentEditable = 'false';
  span.dataset.tag = tag;

  span.innerHTML = `
    <span class="material-symbols-outlined tpl-chip-icon">${meta.icon}</span>
    <span class="tpl-chip-label">${escapeHtml(meta.label)}</span>
    <button type="button" class="tpl-chip-remove" title="削除" aria-label="${escapeHtml(meta.label)}チップを削除">×</button>
  `;

  return span;
}

// Helper: Convert raw template content text (containing {{variable}}) into DOM nodes with inline chips
function populateEditorFromText(container, text) {
  container.innerHTML = '';
  if (!text) return;

  const regex = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const textNode = document.createTextNode(text.substring(lastIndex, match.index));
      container.appendChild(textNode);
    }
    const fullTag = `{{${match[1]}}}`;
    const chipNode = createChipNode(fullTag);
    container.appendChild(chipNode);
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    const textNode = document.createTextNode(text.substring(lastIndex));
    container.appendChild(textNode);
  }
}

// Helper: Convert contenteditable element's DOM back to raw template text string (with {{variable}})
function getEditorContentString(container) {
  let result = '';

  function processNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      result += node.nodeValue;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      if (node.classList && node.classList.contains('tpl-chip')) {
        result += node.dataset.tag || '';
      } else if (node.tagName === 'BR') {
        result += '\n';
      } else if (node.tagName === 'DIV' || node.tagName === 'P') {
        if (result.length > 0 && !result.endsWith('\n')) {
          result += '\n';
        }
        // If the block contains only a single BR, ensure a newline is added even if result is empty or ends with a newline
        const children = Array.from(node.childNodes);
        if (children.length === 1 && children[0].tagName === 'BR') {
          if (!result.endsWith('\n')) {
            result += '\n';
          }
        } else {
          for (const child of children) {
            processNode(child);
          }
        }
      } else {
        for (const child of node.childNodes) {
          processNode(child);
        }
      }
    }
  }

  for (const child of container.childNodes) {
    processNode(child);
  }

  return result;
}

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
        <span class="material-symbols-outlined drag-handle">drag_indicator</span>
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

    const previewResolved = resolveVariables(tpl.content || '', {
      workdays: appState.settings.workdays,
      selection: '（サンプル選択テキスト）',
      page_title: 'サンプルページタイトル',
      page_url: 'https://example.com/sample'
    });

    card.innerHTML = `
      <div class="template-card-header">
        <span class="material-symbols-outlined tpl-drag-handle" draggable="true" title="ドラッグして順序変更">drag_indicator</span>
        <div class="input-field template-title-input">
          <input type="text" class="tpl-title-val" value="${escapeHtml(tpl.title || '')}" placeholder="テンプレート名...">
        </div>
        <button class="btn btn-outlined text-danger icon-btn btn-delete-tpl" title="テンプレート削除" aria-label="テンプレート削除">
          <span class="material-symbols-outlined">delete</span>
        </button>
      </div>
      <div class="input-field template-content-field">
        <label>テンプレート本文</label>
        <div class="tpl-content-editor" contenteditable="true" role="textbox" aria-multiline="true" aria-label="テンプレート本文" aria-placeholder="本文を入力... チップを配置できます"></div>
      </div>
      <div class="template-preview-field">
        <button type="button" class="preview-toggle-btn" aria-expanded="false" title="リアルタイムプレビューを切り替え">
          <span class="material-symbols-outlined toggle-icon">chevron_right</span>
          <span class="preview-field-label">リアルタイムプレビュー</span>
          <span class="toggle-status">(クリックして開く)</span>
        </button>
        <div class="preview-box hidden">
          <div class="preview-content">${escapeHtml(previewResolved)}</div>
        </div>
      </div>
    `;

    const previewToggleBtn = card.querySelector('.preview-toggle-btn');
    const previewBox = card.querySelector('.preview-box');
    const toggleIcon = card.querySelector('.toggle-icon');
    const toggleStatus = card.querySelector('.toggle-status');

    previewToggleBtn.addEventListener('click', () => {
      const isHidden = previewBox.classList.contains('hidden');
      if (isHidden) {
        previewBox.classList.remove('hidden');
        previewToggleBtn.setAttribute('aria-expanded', 'true');
        toggleIcon.textContent = 'expand_more';
        toggleStatus.textContent = '(クリックして閉じる)';
      } else {
        previewBox.classList.add('hidden');
        previewToggleBtn.setAttribute('aria-expanded', 'false');
        toggleIcon.textContent = 'chevron_right';
        toggleStatus.textContent = '(クリックして開く)';
      }
    });

    const handleEl = card.querySelector('.tpl-drag-handle');
    const titleEl = card.querySelector('.tpl-title-val');
    const contentEl = card.querySelector('.tpl-content-editor');
    const previewEl = card.querySelector('.preview-content');
    const deleteBtn = card.querySelector('.btn-delete-tpl');

    // Populate contenteditable editor with text and chips
    populateEditorFromText(contentEl, tpl.content || '');

    // Title edit with debounced save
    titleEl.addEventListener('input', (e) => {
      tpl.title = e.target.value;
      debouncedSaveStorage();
    });

    // Update model and preview from contenteditable editor
    const updateContent = () => {
      tpl.content = getEditorContentString(contentEl);
      previewEl.textContent = resolveVariables(tpl.content, {
        workdays: appState.settings.workdays,
        selection: '（サンプル選択テキスト）',
        page_title: 'サンプルページタイトル',
        page_url: 'https://example.com/sample'
      });
      debouncedSaveStorage();
    };

    contentEl.addEventListener('input', updateContent);

    // Handle click on chip 'x' remove button
    contentEl.addEventListener('click', (e) => {
      const removeBtn = e.target.closest('.tpl-chip-remove');
      if (removeBtn) {
        const chip = removeBtn.closest('.tpl-chip');
        if (chip) {
          chip.remove();
          updateContent();
        }
      }
    });

    // Handle keydown for explicit Backspace/Delete removal of adjacent chips
    contentEl.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' || e.key === 'Delete') {
        const sel = window.getSelection();
        if (!sel || !sel.rangeCount) return;
        const range = sel.getRangeAt(0);

        if (range.collapsed) {
          const container = range.startContainer;
          const offset = range.startOffset;

          if (e.key === 'Backspace') {
            if (container.nodeType === Node.ELEMENT_NODE) {
              const prevChild = container.childNodes[offset - 1];
              if (prevChild && prevChild.nodeType === Node.ELEMENT_NODE && prevChild.classList.contains('tpl-chip')) {
                e.preventDefault();
                prevChild.remove();
                updateContent();
              }
            } else if (container.nodeType === Node.TEXT_NODE && offset === 0) {
              let prevNode = container.previousSibling;
              if (prevNode && prevNode.nodeType === Node.ELEMENT_NODE && prevNode.classList.contains('tpl-chip')) {
                e.preventDefault();
                prevNode.remove();
                updateContent();
              }
            }
          } else if (e.key === 'Delete') {
            if (container.nodeType === Node.ELEMENT_NODE) {
              const nextChild = container.childNodes[offset];
              if (nextChild && nextChild.nodeType === Node.ELEMENT_NODE && nextChild.classList.contains('tpl-chip')) {
                e.preventDefault();
                nextChild.remove();
                updateContent();
              }
            } else if (container.nodeType === Node.TEXT_NODE && offset === container.nodeValue.length) {
              let nextNode = container.nextSibling;
              if (nextNode && nextNode.nodeType === Node.ELEMENT_NODE && nextNode.classList.contains('tpl-chip')) {
                e.preventDefault();
                nextNode.remove();
                updateContent();
              }
            }
          }
        }
      }
    });

    // Handle paste event in contenteditable: convert plain text Mustache tags to chips automatically
    contentEl.addEventListener('paste', (e) => {
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData).getData('text/plain');
      if (!text) return;

      const sel = window.getSelection();
      if (!sel.rangeCount) return;
      sel.deleteFromDocument();
      const range = sel.getRangeAt(0);

      const tempDiv = document.createElement('div');
      populateEditorFromText(tempDiv, text);

      const frag = document.createDocumentFragment();
      let lastNode = null;
      while (tempDiv.firstChild) {
        lastNode = tempDiv.firstChild;
        frag.appendChild(lastNode);
      }

      range.insertNode(frag);
      if (lastNode) {
        range.setStartAfter(lastNode);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
      }
      updateContent();
    });

    // Allow drop on contenteditable editor for variable chips
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
          updateContent();
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

    // Template Drag & Drop Reordering (Initiated strictly from the handle)
    handleEl.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'template', index: tplIndex }));
      card.classList.add('dragging');
    });

    handleEl.addEventListener('dragend', () => {
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

// Cursor Insertion Helper for contenteditable editor
function insertTagAtCursor(editor, tag) {
  editor.focus();
  const chipNode = createChipNode(tag);
  const sel = window.getSelection();

  if (sel && sel.rangeCount > 0 && editor.contains(sel.getRangeAt(0).commonAncestorContainer)) {
    const range = sel.getRangeAt(0);
    range.deleteContents();
    range.insertNode(chipNode);
    range.setStartAfter(chipNode);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  } else {
    editor.appendChild(chipNode);
    const range = document.createRange();
    range.setStartAfter(chipNode);
    range.collapse(true);
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }

  editor.dispatchEvent(new Event('input', { bubbles: true }));
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
    const seenCatIds = new Set();
    validData.categories = data.categories.map((cat, catIdx) => {
      let catId = typeof cat?.id === 'string' && cat.id ? cat.id : generateId('cat');
      if (seenCatIds.has(catId)) {
        catId = generateId('cat');
      }
      seenCatIds.add(catId);

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

    // Smooth scroll to the newly created template card or bottom of templates scroll area
    setTimeout(() => {
      const scrollArea = document.querySelector('.templates-scroll-area');
      if (scrollArea) {
        scrollArea.scrollTo({
          top: scrollArea.scrollHeight,
          behavior: 'smooth'
        });
      }
    }, 0);
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
      let targetEditor = null;

      if (activeEl && activeEl.classList && activeEl.classList.contains('tpl-content-editor')) {
        targetEditor = activeEl;
      } else {
        targetEditor = document.querySelector('.tpl-content-editor');
      }

      if (targetEditor) {
        insertTagAtCursor(targetEditor, tag);
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
