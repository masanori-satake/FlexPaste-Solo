// options.js - Options Page Script for FlexPaste-Solo
import { DEFAULT_DATA, getMessage, resolveVariables } from './utils.js';

function getVariableMap() {
  return {
    '{{date}}': { label: getMessage('chipTag_date'), icon: 'calendar_today' },
    '{{date_short}}': { label: getMessage('chipTag_date_short'), icon: 'calendar_today' },
    '{{date_with_day}}': { label: getMessage('chipTag_date_with_day'), icon: 'calendar_today' },
    '{{tomorrow}}': { label: getMessage('chipTag_tomorrow'), icon: 'arrow_forward' },
    '{{tomorrow_short}}': { label: getMessage('chipTag_tomorrow_short'), icon: 'arrow_forward' },
    '{{tomorrow_with_day}}': { label: getMessage('chipTag_tomorrow_with_day'), icon: 'arrow_forward' },
    '{{next_workday}}': { label: getMessage('chipTag_next_workday'), icon: 'work' },
    '{{next_workday_with_day}}': { label: getMessage('chipTag_next_workday_with_day'), icon: 'work' },
    '{{next_week}}': { label: getMessage('chipTag_next_week'), icon: 'fast_forward' },
    '{{next_week_with_day}}': { label: getMessage('chipTag_next_week_with_day'), icon: 'fast_forward' },
    '{{yesterday}}': { label: getMessage('chipTag_yesterday'), icon: 'arrow_back' },
    '{{yesterday_with_day}}': { label: getMessage('chipTag_yesterday_with_day'), icon: 'arrow_back' },
    '{{next_week_monday_with_day}}': { label: getMessage('chipTag_next_week_monday_with_day'), icon: 'event' },
    '{{next_week_tuesday_with_day}}': { label: getMessage('chipTag_next_week_tuesday_with_day'), icon: 'event' },
    '{{next_week_wednesday_with_day}}': { label: getMessage('chipTag_next_week_wednesday_with_day'), icon: 'event' },
    '{{next_week_thursday_with_day}}': { label: getMessage('chipTag_next_week_thursday_with_day'), icon: 'event' },
    '{{next_week_friday_with_day}}': { label: getMessage('chipTag_next_week_friday_with_day'), icon: 'event' },
    '{{next_week_saturday_with_day}}': { label: getMessage('chipTag_next_week_saturday_with_day'), icon: 'event' },
    '{{next_week_sunday_with_day}}': { label: getMessage('chipTag_next_week_sunday_with_day'), icon: 'event' },
    '{{month_end}}': { label: getMessage('chipTag_month_end'), icon: 'calendar_month' },
    '{{month_last_workday}}': { label: getMessage('chipTag_month_last_workday'), icon: 'domain' },
    '{{selection}}': { label: getMessage('chipTag_selection'), icon: 'content_cut' },
    '{{page_title}}': { label: getMessage('chipTag_page_title'), icon: 'description' },
    '{{page_url}}': { label: getMessage('chipTag_page_url'), icon: 'link' },
    '{{time}}': { label: getMessage('chipTag_time'), icon: 'schedule' },
    '{{time_prev_adj}}': { label: getMessage('chipTag_time_prev_adj'), icon: 'schedule' },
    '{{time_next_adj}}': { label: getMessage('chipTag_time_next_adj'), icon: 'schedule' },
    '{{in_one_hour}}': { label: getMessage('chipTag_in_one_hour'), icon: 'schedule' },
    '{{in_one_hour_prev_adj}}': { label: getMessage('chipTag_in_one_hour_prev_adj'), icon: 'schedule' },
    '{{in_one_hour_next_adj}}': { label: getMessage('chipTag_in_one_hour_next_adj'), icon: 'schedule' }
  };
}

let appState = {
  settings: { workdays: [1, 2, 3, 4, 5] },
  categories: [],
  selectedCategoryId: null
};

let lastFocusedEditor = null;

// Helper: Create inline variable chip element
function createChipNode(tag) {
  const varMap = getVariableMap();
  const meta = varMap[tag] || { label: tag.replace(/[\{\}]/g, ''), icon: 'code' };
  const span = document.createElement('span');
  span.className = 'tpl-chip';
  span.contentEditable = 'false';
  span.dataset.tag = tag;

  span.innerHTML = `
    <span class="material-symbols-outlined tpl-chip-icon">${meta.icon}</span>
    <span class="tpl-chip-label">${escapeHtml(meta.label)}</span>
    <button type="button" class="tpl-chip-remove" title="×" aria-label="Remove ${escapeHtml(meta.label)}">×</button>
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
      if (showNotification) showToast(getMessage('toastSaved'));
    });
  } else if (showNotification) {
    showToast(getMessage('toastSaved'));
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

// Helper to update all previews without re-rendering template cards
function updateAllPreviews() {
  const currentCat = appState.categories.find(c => c.id === appState.selectedCategoryId);
  if (!currentCat || !currentCat.templates) return;

  const cards = document.querySelectorAll('#templates-container .template-card');
  cards.forEach(card => {
    const tplId = card.dataset.id;
    const tpl = currentCat.templates.find(t => t.id === tplId);
    if (!tpl) return;
    const previewEl = card.querySelector('.preview-content');
    if (previewEl) {
      previewEl.textContent = resolveVariables(tpl.content || '', {
        workdays: appState.settings.workdays,
        time_adj_interval: currentCat.time_adj_interval || 0,
        selection: getMessage('sampleSelection'),
        page_title: getMessage('samplePageTitle'),
        page_url: getMessage('samplePageUrl')
      });
    }
  });
}

function localizeStaticUI() {
  const elemSubtitle = document.getElementById('i18n-header-subtitle');
  if (elemSubtitle) elemSubtitle.textContent = getMessage('headerSubtitle');

  const elemWorkdays = document.getElementById('i18n-workdays-label');
  if (elemWorkdays) elemWorkdays.textContent = getMessage('workdaysLabel');

  const daysMap = {
    'pill-sun': 'sun', 'pill-mon': 'mon', 'pill-tue': 'tue',
    'pill-wed': 'wed', 'pill-thu': 'thu', 'pill-fri': 'fri', 'pill-sat': 'sat'
  };
  Object.keys(daysMap).forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.textContent = getMessage(daysMap[id]);
      btn.title = getMessage(daysMap[id]);
    }
  });

  const btnExport = document.getElementById('btn-export');
  if (btnExport) {
    btnExport.title = getMessage('exportBtn');
    btnExport.setAttribute('aria-label', getMessage('exportBtn'));
  }

  const btnImport = document.getElementById('btn-import');
  if (btnImport) {
    btnImport.title = getMessage('importBtn');
    btnImport.setAttribute('aria-label', getMessage('importBtn'));
  }

  const btnReset = document.getElementById('btn-reset');
  if (btnReset) {
    btnReset.title = getMessage('resetBtn');
    btnReset.setAttribute('aria-label', getMessage('resetBtn'));
  }

  const elemCatHeader = document.getElementById('i18n-categories-header');
  if (elemCatHeader) elemCatHeader.textContent = getMessage('categoriesHeader');

  const btnAddCat = document.getElementById('btn-add-category');
  if (btnAddCat) btnAddCat.title = getMessage('addCategoryBtn');

  const elemCatNameLabel = document.getElementById('i18n-cat-name-label');
  if (elemCatNameLabel) elemCatNameLabel.textContent = getMessage('categoryNameLabel');

  const inputCatTitle = document.getElementById('current-cat-title');
  if (inputCatTitle) inputCatTitle.placeholder = getMessage('categoryNamePlaceholder');

  const elemTimeAdjLabel = document.getElementById('i18n-time-adj-label');
  if (elemTimeAdjLabel) elemTimeAdjLabel.textContent = getMessage('timeAdjIntervalLabel');

  const opt0 = document.getElementById('opt-adj-0');
  if (opt0) opt0.textContent = getMessage('adjNone');

  [5, 10, 15, 30].forEach(m => {
    const opt = document.getElementById(`opt-adj-${m}`);
    if (opt) opt.textContent = getMessage('adjMin', String(m));
  });

  const btnDelCat = document.getElementById('btn-delete-category');
  if (btnDelCat) {
    btnDelCat.title = getMessage('deleteCategoryBtn');
    btnDelCat.setAttribute('aria-label', getMessage('deleteCategoryBtn'));
  }

  const elemChipsTitle = document.getElementById('i18n-chips-title');
  if (elemChipsTitle) elemChipsTitle.textContent = getMessage('chipsToggleTitle');

  const elemChipsStatus = document.getElementById('i18n-chips-toggle-status');
  if (elemChipsStatus) elemChipsStatus.textContent = getMessage('clickToClose');

  const btnAddTpl = document.getElementById('btn-add-template');
  if (btnAddTpl) {
    btnAddTpl.title = getMessage('addTemplateBtn');
    btnAddTpl.setAttribute('aria-label', getMessage('addTemplateBtn'));
  }

  // Localize chips text
  const varMap = getVariableMap();
  document.querySelectorAll('.chips-container .chip').forEach(chip => {
    const tag = chip.dataset.tag;
    if (tag && varMap[tag]) {
      const iconEl = chip.querySelector('.chip-icon');
      chip.innerHTML = '';
      if (iconEl) chip.appendChild(iconEl);
      chip.appendChild(document.createTextNode(varMap[tag].label));
    }
  });
}

// Render Functions
function renderWorkdays() {
  const pills = document.querySelectorAll('.workday-pill');
  const activeDays = appState.settings.workdays || [1, 2, 3, 4, 5];
  pills.forEach(pill => {
    const val = parseInt(pill.dataset.value, 10);
    const isActive = activeDays.includes(val);
    if (isActive) {
      pill.classList.add('active');
      pill.setAttribute('aria-pressed', 'true');
    } else {
      pill.classList.remove('active');
      pill.setAttribute('aria-pressed', 'false');
    }
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
        <span class="category-title">${escapeHtml(cat.title || getMessage('untitledCategory'))}</span>
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

  editorArea.style.display = 'flex';

  // Category Title
  const titleInput = document.getElementById('current-cat-title');
  titleInput.value = currentCat.title || '';

  // Category Time Adjustment Interval
  const timeAdjSelect = document.getElementById('current-cat-time-adj');
  if (timeAdjSelect) {
    timeAdjSelect.value = String(currentCat.time_adj_interval || 0);
  }

  // Render Templates
  const templatesContainer = document.getElementById('templates-container');
  templatesContainer.innerHTML = '';

  if (!currentCat.templates || currentCat.templates.length === 0) {
    templatesContainer.innerHTML = `<p class="setting-desc">${escapeHtml(getMessage('noTemplatesDesc'))}</p>`;
    return;
  }

  currentCat.templates.forEach((tpl, tplIndex) => {
    const card = document.createElement('div');
    card.className = 'template-card';
    card.dataset.id = tpl.id;
    card.dataset.index = tplIndex;

    const previewResolved = resolveVariables(tpl.content || '', {
      workdays: appState.settings.workdays,
      time_adj_interval: currentCat.time_adj_interval || 0,
      selection: getMessage('sampleSelection'),
      page_title: getMessage('samplePageTitle'),
      page_url: getMessage('samplePageUrl')
    });

    card.innerHTML = `
      <div class="template-card-header">
        <span class="material-symbols-outlined tpl-drag-handle" draggable="true" title="Drag to reorder">drag_indicator</span>
        <div class="input-field template-title-input">
          <input type="text" class="tpl-title-val" value="${escapeHtml(tpl.title || '')}" placeholder="${escapeHtml(getMessage('templateTitlePlaceholder'))}">
        </div>
        <button class="btn btn-outlined text-danger icon-btn btn-delete-tpl" title="${escapeHtml(getMessage('deleteTemplateBtn'))}" aria-label="${escapeHtml(getMessage('deleteTemplateBtn'))}">
          <span class="material-symbols-outlined">delete</span>
        </button>
      </div>
      <div class="input-field template-content-field">
        <label>${escapeHtml(getMessage('templateContentLabel'))}</label>
        <div class="tpl-content-editor" contenteditable="true" role="textbox" aria-multiline="true" aria-label="${escapeHtml(getMessage('templateContentLabel'))}" aria-placeholder="${escapeHtml(getMessage('templateContentPlaceholder'))}"></div>
      </div>
      <div class="template-preview-field">
        <button type="button" class="preview-toggle-btn" aria-expanded="false" title="${escapeHtml(getMessage('previewToggleTitle'))}">
          <span class="material-symbols-outlined toggle-icon">chevron_right</span>
          <span class="preview-field-label">${escapeHtml(getMessage('previewLabel'))}</span>
          <span class="toggle-status">${escapeHtml(getMessage('clickToOpen'))}</span>
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
        toggleStatus.textContent = getMessage('clickToClose');
      } else {
        previewBox.classList.add('hidden');
        previewToggleBtn.setAttribute('aria-expanded', 'false');
        toggleIcon.textContent = 'chevron_right';
        toggleStatus.textContent = getMessage('clickToOpen');
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

    // Track focused content editor
    const trackFocus = () => {
      lastFocusedEditor = contentEl;
    };
    contentEl.addEventListener('focus', trackFocus);
    contentEl.addEventListener('click', trackFocus);
    contentEl.addEventListener('keyup', trackFocus);

    // Update model and preview from contenteditable editor
    const updateContent = () => {
      tpl.content = getEditorContentString(contentEl);
      previewEl.textContent = resolveVariables(tpl.content, {
        workdays: appState.settings.workdays,
        time_adj_interval: currentCat.time_adj_interval || 0,
        selection: getMessage('sampleSelection'),
        page_title: getMessage('samplePageTitle'),
        page_url: getMessage('samplePageUrl')
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
      const prompt = getMessage('confirmDeleteTemplate', tpl.title || getMessage('untitledTemplate'));
      if (confirm(prompt)) {
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

      const catTitle = typeof cat?.title === 'string' ? cat.title : `Category ${catIdx + 1}`;
      const timeAdjInterval = [0, 5, 10, 15, 30].includes(Number(cat?.time_adj_interval)) ? Number(cat.time_adj_interval) : 0;
      const templates = Array.isArray(cat?.templates) ? cat.templates.map((tpl, tplIdx) => ({
        id: typeof tpl?.id === 'string' && tpl.id ? tpl.id : generateId('tpl'),
        title: typeof tpl?.title === 'string' ? tpl.title : `Template ${tplIdx + 1}`,
        content: typeof tpl?.content === 'string' ? tpl.content : ''
      })) : [];

      return {
        id: catId,
        title: catTitle,
        time_adj_interval: timeAdjInterval,
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

  // Category Time Adjustment Interval Change
  document.getElementById('current-cat-time-adj').addEventListener('change', (e) => {
    const currentCat = appState.categories.find(c => c.id === appState.selectedCategoryId);
    if (currentCat) {
      currentCat.time_adj_interval = Number(e.target.value) || 0;
      saveStorage(true);
      updateAllPreviews();
    }
  });

  // Add Category
  document.getElementById('btn-add-category').addEventListener('click', () => {
    if (!Array.isArray(appState.categories)) {
      appState.categories = [];
    }
    const newCat = {
      id: generateId('cat'),
      title: getMessage('newCategoryTitle'),
      time_adj_interval: 0,
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

    const prompt = getMessage('confirmDeleteCategory', currentCat.title || getMessage('untitledCategory'));
    if (confirm(prompt)) {
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
      title: getMessage('newTemplateTitle'),
      content: ''
    };
    currentCat.templates.push(newTpl);
    saveStorage(true);
    renderCategoryEditor();

    // Scroll to newly created template card
    setTimeout(() => {
      const lastCard = document.querySelector(`.template-card[data-id="${newTpl.id}"]`);
      if (lastCard) {
        lastCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else {
        const scrollArea = document.querySelector('.templates-scroll-area');
        if (scrollArea) {
          scrollArea.scrollTo({
            top: scrollArea.scrollHeight,
            behavior: 'smooth'
          });
        }
      }
    }, 0);
  });

  // Workday Pills
  document.querySelectorAll('.workday-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const val = parseInt(pill.dataset.value, 10);
      let activeDays = [...(appState.settings.workdays || [1, 2, 3, 4, 5])];
      if (activeDays.includes(val)) {
        activeDays = activeDays.filter(d => d !== val);
      } else {
        activeDays.push(val);
      }
      appState.settings.workdays = activeDays;
      saveStorage(true);
      renderWorkdays();
      updateAllPreviews();
    });
  });

  // Variable Toolbar Toggle
  const btnToggleChips = document.getElementById('btn-toggle-chips');
  const chipsContainer = document.getElementById('chips-container');
  if (btnToggleChips && chipsContainer) {
    btnToggleChips.addEventListener('click', () => {
      const isHidden = chipsContainer.classList.contains('hidden');
      const toggleIcon = btnToggleChips.querySelector('.toggle-icon');
      const toggleStatus = btnToggleChips.querySelector('.toggle-status');

      if (isHidden) {
        chipsContainer.classList.remove('hidden');
        btnToggleChips.setAttribute('aria-expanded', 'true');
        if (toggleIcon) toggleIcon.textContent = 'expand_more';
        if (toggleStatus) toggleStatus.textContent = getMessage('clickToClose');
      } else {
        chipsContainer.classList.add('hidden');
        btnToggleChips.setAttribute('aria-expanded', 'false');
        if (toggleIcon) toggleIcon.textContent = 'chevron_right';
        if (toggleStatus) toggleStatus.textContent = getMessage('clickToOpen');
      }
    });
  }

  // Variable Chips (Click & Drag)
  document.querySelectorAll('.chip').forEach(chip => {
    const tag = chip.dataset.tag;

    chip.addEventListener('click', () => {
      const activeEl = document.activeElement;
      let targetEditor = null;

      if (activeEl && activeEl.classList && activeEl.classList.contains('tpl-content-editor')) {
        targetEditor = activeEl;
      } else if (lastFocusedEditor && document.body.contains(lastFocusedEditor)) {
        targetEditor = lastFocusedEditor;
      } else {
        targetEditor = document.querySelector('.tpl-content-editor');
      }

      if (targetEditor) {
        insertTagAtCursor(targetEditor, tag);
      } else {
        showToast(getMessage('toastCursorFocusPrompt'));
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
    showToast(getMessage('toastExported'));
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
          showToast(getMessage('toastRestored'));
        } else {
          alert(getMessage('alertInvalidImport'));
        }
      } catch (err) {
        alert(getMessage('alertImportFailed', err.message));
      }
    };
    reader.readAsText(file);
    fileInput.value = '';
  });

  // Reset to Defaults
  document.getElementById('btn-reset').addEventListener('click', () => {
    if (confirm(getMessage('confirmReset'))) {
      appState.settings = JSON.parse(JSON.stringify(DEFAULT_DATA.settings));
      appState.categories = JSON.parse(JSON.stringify(DEFAULT_DATA.categories));
      appState.selectedCategoryId = appState.categories[0].id;
      saveStorage(true);
      renderWorkdays();
      renderCategoryList();
      renderCategoryEditor();
      showToast(getMessage('toastReset'));
    }
  });
}

// Initialization
document.addEventListener('DOMContentLoaded', () => {
  localizeStaticUI();
  loadStorage(() => {
    renderWorkdays();
    renderCategoryList();
    renderCategoryEditor();
    setupEventHandlers();
  });
});
