// background.js - FlexPaste-Solo Service Worker
import { DEFAULT_DATA, getMessage, resolveVariables } from './utils.js';

let isRebuilding = false;
let pendingRebuild = false;

// Build Context Menus from Storage
function rebuildContextMenus() {
  if (isRebuilding) {
    pendingRebuild = true;
    return;
  }
  isRebuilding = true;

  const checkRebuildComplete = (itemsToCreate, trackingState) => {
    if (trackingState.completedCount >= itemsToCreate.length) {
      isRebuilding = false;
      if (pendingRebuild) {
        pendingRebuild = false;
        rebuildContextMenus();
      }
    }
  };

  chrome.contextMenus.removeAll(() => {
    if (chrome.runtime.lastError) {
      isRebuilding = false;
      if (pendingRebuild) {
        pendingRebuild = false;
        rebuildContextMenus();
      }
      return;
    }

    chrome.storage.local.get(['categories'], (result) => {
      const categories = result.categories || DEFAULT_DATA.categories;

      const itemsToCreate = [
        {
          id: 'flexpaste_root',
          title: 'FlexPaste',
          contexts: ['all']
        }
      ];

      const createdIds = new Set(['flexpaste_root']);

      categories.forEach((cat) => {
        const catMenuId = `cat_${cat.id}`;
        if (!createdIds.has(catMenuId)) {
          createdIds.add(catMenuId);
          itemsToCreate.push({
            id: catMenuId,
            parentId: 'flexpaste_root',
            title: cat.title || getMessage('untitledCategory'),
            contexts: ['all']
          });

          if (Array.isArray(cat.templates)) {
            cat.templates.forEach((tpl) => {
              const tplMenuId = `tpl_${cat.id}_${tpl.id}`;
              if (!createdIds.has(tplMenuId)) {
                createdIds.add(tplMenuId);
                itemsToCreate.push({
                  id: tplMenuId,
                  parentId: catMenuId,
                  title: tpl.title || getMessage('untitledTemplate'),
                  contexts: ['all']
                });
              }
            });
          }
        }
      });

      itemsToCreate.push({
        id: 'flexpaste_sep',
        parentId: 'flexpaste_root',
        type: 'separator',
        contexts: ['all']
      });

      itemsToCreate.push({
        id: 'flexpaste_options',
        parentId: 'flexpaste_root',
        title: getMessage('settingsMenuItem'),
        contexts: ['all']
      });

      const trackingState = { completedCount: 0, hasErrors: false };

      itemsToCreate.forEach((itemOptions) => {
        chrome.contextMenus.create(itemOptions, () => {
          if (chrome.runtime.lastError) {
            trackingState.hasErrors = true;
          }
          trackingState.completedCount++;
          checkRebuildComplete(itemsToCreate, trackingState);
        });
      });
    });
  });
}

// Initialize on extension installation (detect missing categories/settings independently)
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['categories', 'settings'], (result) => {
    const dataToSet = {};
    if (!result.categories) {
      dataToSet.categories = DEFAULT_DATA.categories;
    }
    if (!result.settings) {
      dataToSet.settings = DEFAULT_DATA.settings;
    }

    if (Object.keys(dataToSet).length > 0) {
      // Storage change will trigger chrome.storage.onChanged listener automatically on success.
      // If saving fails, fallback to rebuilding context menus manually.
      chrome.storage.local.set(dataToSet, () => {
        if (chrome.runtime.lastError) {
          rebuildContextMenus();
        }
      });
    } else {
      rebuildContextMenus();
    }
  });
});

// Action click handler to open options page
if (chrome.action && chrome.action.onClicked) {
  chrome.action.onClicked.addListener(() => {
    chrome.runtime.openOptionsPage();
  });
}

// Rebuild context menus and sync from cloud when storage changes
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && (changes.categories || changes.settings)) {
    rebuildContextMenus();
  } else if (areaName === 'sync') {
    chrome.storage.local.get(['settings'], (result) => {
      if (result.settings?.syncEnabled) {
        import('./utils.js').then(({ syncFromCloudIfNeeded }) => {
          syncFromCloudIfNeeded();
        }).catch(err => console.warn('Failed to sync from cloud on storage change:', err));
      }
    });
  }
});

// Injection script function executed in target page context
function injectTextToElement(textToInject, usePaste) {
  const activeEl = document.activeElement;
  if (!activeEl) return;

  function triggerEvents(el) {
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function insertDirectly(el, text) {
    if (el.isContentEditable) {
      el.focus();
      let success = false;
      try {
        success = document.execCommand('insertText', false, text);
      } catch (e) {
        success = false;
      }
      if (!success) {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          const range = sel.getRangeAt(0);
          range.deleteContents();
          const textNode = document.createTextNode(text);
          range.insertNode(textNode);
          range.setStartAfter(textNode);
          range.setEndAfter(textNode);
          sel.removeAllRanges();
          sel.addRange(range);
        } else {
          el.textContent += text;
        }
      }
    } else if (
      el.tagName === 'INPUT' ||
      el.tagName === 'TEXTAREA'
    ) {
      el.focus();
      const start = el.selectionStart ?? el.value.length;
      const end = el.selectionEnd ?? el.value.length;

      let success = false;
      try {
        success = document.execCommand('insertText', false, text);
      } catch (e) {
        success = false;
      }

      if (!success) {
        const val = el.value;
        el.value = val.substring(0, start) + text + val.substring(end);
        const newCursorPos = start + text.length;
        el.setSelectionRange(newCursorPos, newCursorPos);
      }
    }
  }

  if (usePaste) {
    activeEl.focus();

    const fallbackCopy = (text) => {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      let ok = false;
      try {
        ok = document.execCommand('copy');
      } catch (e) {
        ok = false;
      }
      document.body.removeChild(textarea);
      return ok;
    };

    const doPaste = () => {
      activeEl.focus();
      let success = false;
      try {
        success = document.execCommand('paste');
      } catch (e) {
        success = false;
      }

      if (!success) {
        let defaultPrevented = false;
        try {
          const dataTransfer = new DataTransfer();
          dataTransfer.setData('text/plain', textToInject);
          const pasteEvent = new ClipboardEvent('paste', {
            bubbles: true,
            cancelable: true,
            clipboardData: dataTransfer
          });
          activeEl.dispatchEvent(pasteEvent);
          defaultPrevented = pasteEvent.defaultPrevented;
        } catch (e) {
          // ignore fallback error
        }

        if (!defaultPrevented) {
          insertDirectly(activeEl, textToInject);
        }
      }
      triggerEvents(activeEl);
    };

    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      navigator.clipboard.writeText(textToInject)
        .then(doPaste)
        .catch(() => {
          fallbackCopy(textToInject);
          doPaste();
        });
    } else {
      fallbackCopy(textToInject);
      doPaste();
    }
    return;
  }

  insertDirectly(activeEl, textToInject);
  triggerEvents(activeEl);
}

/**
 * 対象ページでクリップボードを読み取り、必要に応じて入力ダイアログを表示する。
 * 読み取りに失敗した場合は空文字を使い、キャンセル時は入力値を返さない。
 *
 * @param {string[]} promptTagSpecs テンプレート内の出現順に並べたプロンプトタグ名。
 * @param {boolean} hasClipboardTags クリップボードの読み取りが必要かどうか。
 * @param {Object<string, string>} i18nStrings ダイアログに表示する翻訳済み文字列。
 * @returns {Promise<{cancelled: boolean, clipboardText?: string, promptValues?: string[]}>} 入力結果またはキャンセル結果。
 */
async function promptAndReadClipboardInPage(promptTagSpecs, hasClipboardTags, i18nStrings) {
  const originalActiveElement = document.activeElement;
  let clipboardText = '';

  // 1. Read clipboard if template has clipboard tags
  if (hasClipboardTags) {
    try {
      if (navigator.clipboard && typeof navigator.clipboard.readText === 'function') {
        clipboardText = await navigator.clipboard.readText();
      }
    } catch (e) {
      // Fallback: create temporary textarea to trigger paste
      let textarea;
      try {
        textarea = document.createElement('textarea');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        document.execCommand('paste');
        clipboardText = textarea.value;
      } catch (err) {
        clipboardText = '';
      } finally {
        textarea?.remove();
        originalActiveElement?.focus();
      }
    }
  }

  // 2. If no prompt tags, return clipboard text immediately
  if (!promptTagSpecs || promptTagSpecs.length === 0) {
    return { cancelled: false, clipboardText, promptValues: [] };
  }

  // 3. Show Interactive Prompt Dialog in Shadow DOM
  return new Promise((resolve) => {
    // Helper to format ISO date strings for default picker values
    const now = new Date();
    /**
     * 日時の各要素をゼロ埋めして2桁以上の文字列にする。
     * @param {number} n 日時の数値要素。
     * @returns {string} ゼロ埋めした文字列。
     */
    const pad = (n) => String(n).padStart(2, '0');
    const defaultDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const defaultTime = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const defaultDatetime = `${defaultDate}T${defaultTime}`;

    // Host element and Shadow DOM
    const host = document.createElement('div');
    host.id = 'flexpaste-prompt-modal-host';
    const shadow = host.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = `
      :host {
        all: initial !important;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
      }
      .fp-scrim {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        background-color: rgba(0, 0, 0, 0.4) !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        z-index: 2147483647 !important;
        backdrop-filter: blur(2px) !important;
      }
      .fp-modal {
        background: #ffffff !important;
        color: #1f1f1f !important;
        border-radius: 16px !important;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.24) !important;
        width: 440px !important;
        max-width: calc(100vw - 32px) !important;
        max-height: calc(100vh - 64px) !important;
        display: flex !important;
        flex-direction: column !important;
        overflow: hidden !important;
        box-sizing: border-box !important;
      }
      @media (prefers-color-scheme: dark) {
        .fp-modal {
          background: #2b2b2c !important;
          color: #e3e3e3 !important;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5) !important;
        }
      }
      .fp-header {
        padding: 20px 24px 12px !important;
        font-size: 18px !important;
        font-weight: 600 !important;
        border-bottom: 1px solid rgba(0, 0, 0, 0.08) !important;
      }
      @media (prefers-color-scheme: dark) {
        .fp-header {
          border-bottom-color: rgba(255, 255, 255, 0.1) !important;
        }
      }
      .fp-body {
        padding: 16px 24px !important;
        overflow-y: auto !important;
        display: flex !important;
        flex-direction: column !important;
        gap: 16px !important;
      }
      .fp-field {
        display: flex !important;
        flex-direction: column !important;
        gap: 6px !important;
      }
      .fp-label {
        font-size: 13px !important;
        font-weight: 500 !important;
        color: #444746 !important;
      }
      @media (prefers-color-scheme: dark) {
        .fp-label {
          color: #c4c7c5 !important;
        }
      }
      .fp-input {
        width: 100% !important;
        box-sizing: border-box !important;
        padding: 10px 12px !important;
        font-size: 14px !important;
        border: 1px solid #79747e !important;
        border-radius: 8px !important;
        background: transparent !important;
        color: inherit !important;
        outline: none !important;
        transition: border-color 0.2s !important;
      }
      .fp-input:focus {
        border-color: #006a6a !important;
        border-width: 2px !important;
        padding: 9px 11px !important;
      }
      .fp-textarea {
        resize: vertical !important;
        min-height: 72px !important;
        font-family: inherit !important;
      }
      .fp-footer {
        padding: 12px 24px 20px !important;
        display: flex !important;
        justify-content: flex-end !important;
        gap: 12px !important;
      }
      .fp-btn {
        padding: 8px 20px !important;
        border-radius: 20px !important;
        font-size: 14px !important;
        font-weight: 500 !important;
        cursor: pointer !important;
        border: none !important;
        outline: none !important;
      }
      .fp-btn-secondary {
        background: transparent !important;
        color: #006a6a !important;
      }
      .fp-btn-secondary:hover {
        background: rgba(0, 106, 106, 0.08) !important;
      }
      .fp-btn-primary {
        background: #006a6a !important;
        color: #ffffff !important;
      }
      .fp-btn-primary:hover {
        background: #005050 !important;
      }
      @media (prefers-color-scheme: dark) {
        .fp-btn-secondary {
          color: #4cd6d3 !important;
        }
        .fp-btn-secondary:hover {
          background: rgba(76, 214, 211, 0.12) !important;
        }
        .fp-btn-primary {
          background: #4cd6d3 !important;
          color: #003737 !important;
        }
        .fp-btn-primary:hover {
          background: #3cb8b5 !important;
        }
      }
    `;

    const scrim = document.createElement('div');
    scrim.className = 'fp-scrim';

    const modal = document.createElement('div');
    modal.className = 'fp-modal';

    const header = document.createElement('div');
    header.className = 'fp-header';
    header.textContent = i18nStrings.title || 'FlexPaste Input Prompt';

    const body = document.createElement('div');
    body.className = 'fp-body';

    const fieldInputs = [];

    promptTagSpecs.forEach((spec, idx) => {
      const field = document.createElement('div');
      field.className = 'fp-field';

      const label = document.createElement('label');
      label.className = 'fp-label';
      const typeLabel = i18nStrings[spec] || spec;
      label.textContent = `${i18nStrings.promptItem || 'Input'} ${idx + 1} (${typeLabel})`;

      let input;
      if (spec === 'prompt_multiline') {
        input = document.createElement('textarea');
        input.className = 'fp-input fp-textarea';
        input.rows = 3;
      } else if (spec === 'prompt_date') {
        input = document.createElement('input');
        input.type = 'date';
        input.className = 'fp-input';
        input.value = defaultDate;
      } else if (spec === 'prompt_time') {
        input = document.createElement('input');
        input.type = 'time';
        input.className = 'fp-input';
        input.value = defaultTime;
      } else if (spec === 'prompt_datetime') {
        input = document.createElement('input');
        input.type = 'datetime-local';
        input.className = 'fp-input';
        input.value = defaultDatetime;
      } else {
        input = document.createElement('input');
        input.type = 'text';
        input.className = 'fp-input';
      }

      field.appendChild(label);
      field.appendChild(input);
      body.appendChild(field);
      fieldInputs.push({ spec, input });
    });

    const footer = document.createElement('div');
    footer.className = 'fp-footer';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'fp-btn fp-btn-secondary';
    cancelBtn.textContent = i18nStrings.cancel || 'Cancel';

    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'fp-btn fp-btn-primary';
    confirmBtn.textContent = i18nStrings.confirm || 'OK';

    footer.appendChild(cancelBtn);
    footer.appendChild(confirmBtn);

    modal.appendChild(header);
    modal.appendChild(body);
    modal.appendChild(footer);
    scrim.appendChild(modal);

    shadow.appendChild(style);
    shadow.appendChild(scrim);
    document.body.appendChild(host);

    /**
     * ダイアログのホスト要素をページから取り除き、元のフォーカスを復元する。
     * @returns {void}
     */
    const cleanup = () => {
      if (host.parentNode) {
        host.parentNode.removeChild(host);
      }
      originalActiveElement?.focus();
    };

    /**
     * 入力値を出現順に収集し、日時の区切りを空白に変換してダイアログを閉じる。
     * 待機中の Promise をクリップボード文字列と入力値で解決する。
     * @returns {void}
     */
    const submitForm = () => {
      const promptValues = fieldInputs.map(({ spec, input }) => {
        let val = input.value || '';
        if (spec === 'prompt_datetime') {
          val = val.replace('T', ' ');
        }
        return val;
      });
      cleanup();
      resolve({ cancelled: false, clipboardText, promptValues });
    };

    /**
     * ダイアログを閉じ、待機中の Promise をキャンセル結果で解決する。
     * @returns {void}
     */
    const cancelForm = () => {
      cleanup();
      resolve({ cancelled: true });
    };

    confirmBtn.addEventListener('click', submitForm);
    cancelBtn.addEventListener('click', cancelForm);
    scrim.addEventListener('click', (e) => {
      if (e.target === scrim) cancelForm();
    });

    // Keyboard shortcuts (Enter in single-line inputs to submit, Escape to cancel)
    modal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        cancelForm();
      } else if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'BUTTON') {
        e.preventDefault();
        submitForm();
      }
    });

    // Auto-focus first input element
    if (fieldInputs.length > 0) {
      setTimeout(() => fieldInputs[0].input.focus(), 50);
    }
  });
}

// Handle context menu item clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'flexpaste_options') {
    chrome.runtime.openOptionsPage();
    return;
  }

  if (typeof info.menuItemId === 'string' && info.menuItemId.startsWith('tpl_')) {
    chrome.storage.local.get(['categories', 'settings'], async (result) => {
      const categories = result.categories || DEFAULT_DATA.categories;
      const settings = result.settings || DEFAULT_DATA.settings;

      // Find template by menu item ID matching tpl_{catId}_{tplId}
      let foundTemplate = null;
      let foundCategory = null;
      for (const cat of categories) {
        if (Array.isArray(cat.templates)) {
          for (const tpl of cat.templates) {
            if (`tpl_${cat.id}_${tpl.id}` === info.menuItemId) {
              foundTemplate = tpl;
              foundCategory = cat;
              break;
            }
          }
        }
        if (foundTemplate) break;
      }

      if (!foundTemplate) return;

      const content = foundTemplate.content || '';
      const hasClipboardTags = /\{\{\s*clipboard(_numbered|_quote|_trim|_single_line|_codeblock)?\s*\}\}/.test(content);

      const promptTagMatches = Array.from(content.matchAll(/\{\{\s*(prompt|prompt_multiline|prompt_date|prompt_time|prompt_datetime)\s*\}\}/g));
      const promptTagSpecs = promptTagMatches.map(m => m[1]);

      const usePaste = Boolean(foundCategory?.use_paste);
      const targetConfig = { tabId: tab.id };
      if (typeof info.frameId === 'number') {
        targetConfig.frameIds = [info.frameId];
      }

      const contextData = {
        workdays: settings.workdays || [1, 2, 3, 4, 5],
        time_adj_interval: foundCategory?.time_adj_interval || 0,
        def_1: foundCategory?.def_1 || '',
        def_2: foundCategory?.def_2 || '',
        def_3: foundCategory?.def_3 || ''
      };

      // If template contains clipboard tags or prompt tags, run interactive page workflow first
      if (hasClipboardTags || promptTagSpecs.length > 0) {
        const i18nStrings = {
          title: getMessage('promptModalTitle'),
          promptItem: getMessage('promptModalItemLabel'),
          cancel: getMessage('cancel'),
          confirm: getMessage('confirm'),
          prompt: getMessage('chipTag_prompt'),
          prompt_multiline: getMessage('chipTag_prompt_multiline'),
          prompt_date: getMessage('chipTag_prompt_date'),
          prompt_time: getMessage('chipTag_prompt_time'),
          prompt_datetime: getMessage('chipTag_prompt_datetime')
        };

        try {
          const results = await chrome.scripting.executeScript({
            target: targetConfig,
            func: promptAndReadClipboardInPage,
            args: [promptTagSpecs, hasClipboardTags, i18nStrings]
          });

          const pageRes = results?.[0]?.result;
          if (!pageRes || pageRes.cancelled) {
            return; // User cancelled or modal failed
          }

          contextData.clipboard = pageRes.clipboardText || '';
          contextData.promptsArray = pageRes.promptValues || [];
        } catch (err) {
          console.error('Failed to prompt / read clipboard:', err);
          return;
        }
      }

      const resolvedText = resolveVariables(content, contextData);

      chrome.scripting.executeScript({
        target: targetConfig,
        func: injectTextToElement,
        args: [resolvedText, usePaste]
      }).catch((err) => {
        console.error('Failed to inject text:', err);
      });
    });
  }
});
