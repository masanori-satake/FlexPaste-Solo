// background.js - FlexPaste-Solo Service Worker

const DEFAULT_DATA = {
  settings: {
    workdays: [1, 2, 3, 4, 5] // 1: Mon, 5: Fri, 7: Sun
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

// Variable Resolution Engine
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
  // Last day of current month
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
  const selection = contextData.selection || '';
  const pageTitle = contextData.page_title || '';
  const pageUrl = contextData.page_url || '';

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

// Initialize on extension installation
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['categories', 'settings'], (result) => {
    if (!result.categories || !result.settings) {
      chrome.storage.local.set(DEFAULT_DATA, () => {
        rebuildContextMenus();
      });
    } else {
      rebuildContextMenus();
    }
  });
});

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
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: injectTextToElement,
          args: [resolvedText]
        }).catch((err) => {
          console.error('Failed to inject text:', err);
        });
      }
    });
  }
});
