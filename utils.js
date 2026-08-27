// utils.js - Shared utilities and Variable Resolution Engine for FlexPaste-Solo

export const DEFAULT_DATA = {
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

export function padZero(num) {
  return String(num).padStart(2, '0');
}

export function formatDateWithDay(date) {
  const weekdaysJa = ['日', '月', '火', '水', '木', '金', '土'];
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const w = weekdaysJa[date.getDay()];
  return `${y}年${m}月${d}日(${w})`;
}

export function formatDate(date) {
  const y = date.getFullYear();
  const m = padZero(date.getMonth() + 1);
  const d = padZero(date.getDate());
  return `${y}/${m}/${d}`;
}

export function formatTime(date) {
  const h = padZero(date.getHours());
  const m = padZero(date.getMinutes());
  return `${h}:${m}`;
}

export function formatTimeWithSec(date) {
  const h = padZero(date.getHours());
  const m = padZero(date.getMinutes());
  const s = padZero(date.getSeconds());
  return `${h}:${m}:${s}`;
}

export function calculateMonthLastWorkday(now, workdays) {
  let activeWorkdays = Array.isArray(workdays) && workdays.length > 0
    ? workdays.filter(d => typeof d === 'number' && d >= 1 && d <= 7)
    : [1, 2, 3, 4, 5];

  if (activeWorkdays.length === 0) {
    activeWorkdays = [1, 2, 3, 4, 5];
  }

  // Last day of current month
  let d = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const daysInMonth = d.getDate();

  for (let i = 0; i < daysInMonth; i++) {
    const day = d.getDay();
    const isoDay = day === 0 ? 7 : day;
    if (activeWorkdays.includes(isoDay)) {
      return formatDate(d);
    }
    d.setDate(d.getDate() - 1);
  }

  return formatDate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
}

export function resolveVariables(templateContent, contextData = {}, now = new Date()) {
  const workdays = contextData.workdays || [1, 2, 3, 4, 5];
  const selection = contextData.selection ?? '';
  const pageTitle = contextData.page_title ?? '';
  const pageUrl = contextData.page_url ?? '';

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
