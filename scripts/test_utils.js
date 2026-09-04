// scripts/test_utils.js - Unit tests for FlexPaste-Solo utils.js
import assert from 'node:assert';
import { adjustTime, resolveVariables } from '../projects/app/utils.js';

console.log('Running unit tests for utils.js...');

// 1. Test adjustTime - round mode
{
  // 30 min interval
  const d910 = new Date(2025, 0, 1, 9, 10, 0);
  assert.strictEqual(adjustTime(d910, 30, 'round'), '09:00', '9:10 rounded to 30 min should be 09:00');
  assert.strictEqual(adjustTime(d910, 30, 'prev'), '09:00', '9:10 prev 30 min should be 09:00');
  assert.strictEqual(adjustTime(d910, 30, 'next'), '09:30', '9:10 next 30 min should be 09:30');

  const d915 = new Date(2025, 0, 1, 9, 15, 0);
  assert.strictEqual(adjustTime(d915, 30, 'round'), '09:30', '9:15 rounded to 30 min should be 09:30');

  const d925 = new Date(2025, 0, 1, 9, 25, 0);
  assert.strictEqual(adjustTime(d925, 30, 'round'), '09:30', '9:25 rounded to 30 min should be 09:30');
  assert.strictEqual(adjustTime(d925, 30, 'prev'), '09:00', '9:25 prev 30 min should be 09:00');
  assert.strictEqual(adjustTime(d925, 30, 'next'), '09:30', '9:25 next 30 min should be 09:30');

  // 10 min interval
  const d904 = new Date(2025, 0, 1, 9, 4, 0);
  assert.strictEqual(adjustTime(d904, 10, 'round'), '09:00', '9:04 rounded to 10 min should be 09:00');

  const d905 = new Date(2025, 0, 1, 9, 5, 0);
  assert.strictEqual(adjustTime(d905, 10, 'round'), '09:10', '9:05 rounded to 10 min should be 09:10');

  // 0 min interval (no adjustment)
  assert.strictEqual(adjustTime(d910, 0, 'round'), '09:10', '9:10 with 0 min interval should be 09:10');
}

// 2. Test resolveVariables with {{time_adj}} and {{in_one_hour_adj}}
{
  const now = new Date(2025, 0, 1, 9, 10, 0);
  const contextData = { time_adj_interval: 30 };

  const template = 'Now: {{time}}, Adj: {{time_adj}}, Prev: {{time_prev_adj}}, Next: {{time_next_adj}} | 1h: {{in_one_hour}}, 1hAdj: {{in_one_hour_adj}}, 1hPrev: {{in_one_hour_prev_adj}}, 1hNext: {{in_one_hour_next_adj}}';

  const resolved = resolveVariables(template, contextData, now);
  const expected = 'Now: 09:10, Adj: 09:00, Prev: 09:00, Next: 09:30 | 1h: 10:10, 1hAdj: 10:00, 1hPrev: 10:00, 1hNext: 10:30';

  assert.strictEqual(resolved, expected, `Resolved template mismatch.\nGot:      ${resolved}\nExpected: ${expected}`);
}

{
  const now = new Date(2025, 0, 1, 9, 25, 0);
  const contextData = { time_adj_interval: 30 };

  const template = '{{time_adj}} / {{in_one_hour_adj}}';
  const resolved = resolveVariables(template, contextData, now);
  const expected = '09:30 / 10:30';

  assert.strictEqual(resolved, expected, `Resolved template mismatch.\nGot:      ${resolved}\nExpected: ${expected}`);
}

console.log('All unit tests passed successfully!');
