// background.js - FlexPaste-Solo Service Worker
import { DEFAULT_DATA, resolveVariables } from './utils.js';

// Build Context Menus from Storage
function rebuildContextMenus() {
  chrome.contextMenus.removeAll(() => {
    chrome.storage.local.get(['categories'], (result) => {
      const categories = result.categories || DEFAULT_DATA.categories;

      // Parent menu [FlexPaste]
      chrome.contextMenus.create({
        id: 'flexpaste_root',
        title: 'FlexPaste',
        contexts: ['all']
      });

      // Categories and Templates
      categories.forEach((cat) => {
        const catMenuId = `cat_${cat.id}`;
        chrome.contextMenus.create({
          id: catMenuId,
          parentId: 'flexpaste_root',
          title: cat.title,
          contexts: ['all']
        });

        if (Array.isArray(cat.templates)) {
          cat.templates.forEach((tpl) => {
            const tplMenuId = `tpl_${cat.id}_${tpl.id}`;
            chrome.contextMenus.create({
              id: tplMenuId,
              parentId: catMenuId,
              title: tpl.title,
              contexts: ['all']
            });
          });
        }
      });

      // Separator and Options
      chrome.contextMenus.create({
        id: 'flexpaste_sep',
        parentId: 'flexpaste_root',
        type: 'separator',
        contexts: ['all']
      });

      chrome.contextMenus.create({
        id: 'flexpaste_options',
        parentId: 'flexpaste_root',
        title: '⚙ 設定',
        contexts: ['all']
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
      chrome.storage.local.set(dataToSet, () => {
        rebuildContextMenus();
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

// Rebuild context menus when storage changes
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && (changes.categories || changes.settings)) {
    rebuildContextMenus();
  }
});

// Injection script function executed in target page context
function injectTextToElement(textToInject) {
  const activeEl = document.activeElement;
  if (!activeEl) return;

  function triggerEvents(el) {
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  if (activeEl.isContentEditable) {
    activeEl.focus();
    let success = false;
    try {
      success = document.execCommand('insertText', false, textToInject);
    } catch (e) {
      success = false;
    }
    if (!success) {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        range.deleteContents();
        const textNode = document.createTextNode(textToInject);
        range.insertNode(textNode);
        range.setStartAfter(textNode);
        range.setEndAfter(textNode);
        sel.removeAllRanges();
        sel.addRange(range);
      } else {
        activeEl.textContent += textToInject;
      }
    }
    triggerEvents(activeEl);
  } else if (
    activeEl.tagName === 'INPUT' ||
    activeEl.tagName === 'TEXTAREA'
  ) {
    activeEl.focus();
    const start = activeEl.selectionStart ?? activeEl.value.length;
    const end = activeEl.selectionEnd ?? activeEl.value.length;

    let success = false;
    try {
      success = document.execCommand('insertText', false, textToInject);
    } catch (e) {
      success = false;
    }

    if (!success) {
      const val = activeEl.value;
      activeEl.value = val.substring(0, start) + textToInject + val.substring(end);
      const newCursorPos = start + textToInject.length;
      activeEl.setSelectionRange(newCursorPos, newCursorPos);
    }
    triggerEvents(activeEl);
  }
}

// Handle context menu item clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'flexpaste_options') {
    chrome.runtime.openOptionsPage();
    return;
  }

  if (typeof info.menuItemId === 'string' && info.menuItemId.startsWith('tpl_')) {
    chrome.storage.local.get(['categories', 'settings'], (result) => {
      const categories = result.categories || DEFAULT_DATA.categories;
      const settings = result.settings || DEFAULT_DATA.settings;

      // Find template by menu item ID matching tpl_{catId}_{tplId}
      let foundTemplate = null;
      for (const cat of categories) {
        if (Array.isArray(cat.templates)) {
          for (const tpl of cat.templates) {
            if (`tpl_${cat.id}_${tpl.id}` === info.menuItemId) {
              foundTemplate = tpl;
              break;
            }
          }
        }
        if (foundTemplate) break;
      }

      if (!foundTemplate) return;

      const contextData = {
        workdays: settings.workdays || [1, 2, 3, 4, 5],
        selection: info.selectionText || '',
        page_title: tab?.title || '',
        page_url: tab?.url || ''
      };

      const resolvedText = resolveVariables(foundTemplate.content, contextData);

      if (tab?.id) {
        const targetConfig = { tabId: tab.id };
        if (typeof info.frameId === 'number') {
          targetConfig.frameIds = [info.frameId];
        }

        chrome.scripting.executeScript({
          target: targetConfig,
          func: injectTextToElement,
          args: [resolvedText]
        }).catch((err) => {
          console.error('Failed to inject text:', err);
        });
      }
    });
  }
});
