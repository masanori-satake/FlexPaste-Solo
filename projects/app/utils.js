// utils.js - Shared utilities and Variable Resolution Engine for FlexPaste-Solo

export const DEFAULT_DATA = {
  settings: {
    workdays: [1, 2, 3, 4, 5] // 1: Mon, 5: Fri, 7: Sun
  },
  categories: [
    {
      id: "cat_1",
      title: "業務連絡",
      time_adj_interval: 0,
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
      time_adj_interval: 0,
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

export function adjustTime(date, intervalMinutes = 0, mode = 'prev') {
  const interval = Number(intervalMinutes) || 0;
  if (interval === 0) {
    return formatTime(date);
  }
  const totalMinutes = date.getHours() * 60 + date.getMinutes();
  let adjMinutes;
  if (mode === 'prev') {
    adjMinutes = Math.floor(totalMinutes / interval) * interval;
  } else {
    adjMinutes = Math.ceil(totalMinutes / interval) * interval;
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
  }

  return result;
}

export function calculateMonthLastWorkday(now, workdays) {
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
  const timeAdjInterval = Number(contextData.time_adj_interval) || 0;

  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, now.getHours(), now.getMinutes(), now.getSeconds());
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, now.getHours(), now.getMinutes(), now.getSeconds());
  const nextWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7, now.getHours(), now.getMinutes(), now.getSeconds());
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const inOneHour = new Date(now.getTime() + 60 * 60 * 1000);

  const nextWorkdayDate = calculateNextWorkday(now, workdays);
  const nextWeekDays = getNextWeekDays(now);

  const replacements = {
    'date_with_day': formatDateWithDay(now),
    'date': formatDate(now),
    'time': formatTime(now),
    'time_with_sec': formatTimeWithSec(now),
    'time_prev_adj': adjustTime(now, timeAdjInterval, 'prev'),
    'time_next_adj': adjustTime(now, timeAdjInterval, 'next'),
    'in_one_hour': formatTime(inOneHour),
    'in_one_hour_prev_adj': adjustTime(inOneHour, timeAdjInterval, 'prev'),
    'in_one_hour_next_adj': adjustTime(inOneHour, timeAdjInterval, 'next'),
    'yesterday_with_day': formatDateWithDay(yesterday),
    'yesterday': formatDate(yesterday),
    'tomorrow_with_day': formatDateWithDay(tomorrow),
    'tomorrow': formatDate(tomorrow),
    'next_workday_with_day': formatDateWithDay(nextWorkdayDate),
    'next_workday': formatDate(nextWorkdayDate),
    'next_week_with_day': formatDateWithDay(nextWeek),
    'next_week': formatDate(nextWeek),
    ...nextWeekDays,
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
