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

      const contextData = {
        workdays: settings.workdays || [1, 2, 3, 4, 5],
        time_adj_interval: foundCategory?.time_adj_interval || 0,
        def_1: foundCategory?.def_1 || '',
        def_2: foundCategory?.def_2 || '',
        def_3: foundCategory?.def_3 || ''
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
