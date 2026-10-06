import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

// 非公開の状態とイベントを隔離して、権限コールバックの完了順序を制御する。
const source = readFileSync(new URL('../projects/app/options.js', import.meta.url), 'utf8')
  .replace(/^import .*;$/m, '')
  .replace(/^export /gm, '');

function createHarness(usePaste = true) {
  const elements = new Map();
  const contains = [];
  const requests = [];
  const saves = [];
  const removals = [];
  const chrome = {
    runtime: {},
    permissions: {
      contains: (_permissions, callback) => contains.push(callback),
      request: (_permissions, callback) => requests.push(callback),
      remove: (permissions, callback) => { removals.push(permissions); callback(); }
    }
  };
  const document = {
    addEventListener() {},
    querySelector: () => null,
    querySelectorAll: () => [],
    getElementById(id) {
      if (!elements.has(id)) {
        elements.set(id, {
          checked: false,
          listeners: {},
          addEventListener(type, callback) { this.listeners[type] = callback; }
        });
      }
      return elements.get(id);
    }
  };
  const context = { document, chrome, window: { addEventListener() {} }, saves, getMessage: key => key };
  runInNewContext(`${source}
    saveStorage = notification => saves.push(notification);
    showToast = () => {};
    setupEventHandlers();
    globalThis.state = appState;
    globalThis.sync = syncClipboardPermissions;
  `, context);
  const category = { id: 'a', use_paste: usePaste };
  context.state.categories = [category];
  context.state.selectedCategoryId = category.id;
  const checkbox = document.getElementById('current-cat-use-paste');
  checkbox.checked = usePaste;
  return {
    state: context.state, sync: context.sync, category, checkbox,
    contains, requests, saves, removals, chrome,
    change(checked) {
      checkbox.checked = checked;
      checkbox.listeners.change({ target: checkbox });
    }
  };
}

// 有効な拒否結果は設定を無効化して保存する。
{
  const h = createHarness();
  h.sync();
  h.contains.shift()(false);
  assert.equal(h.category.use_paste, false);
  assert.equal(h.checkbox.checked, false);
  assert.deepEqual(h.saves, [false]);
}

// 新しい確認結果の後に届いた古い拒否結果は保存しない。
{
  const h = createHarness();
  h.sync();
  h.sync();
  h.contains[1](true);
  h.contains[0](false);
  assert.equal(h.category.use_paste, true);
  assert.deepEqual(h.saves, []);
}

// リクエスト開始前と実行中の確認結果は、許可完了後の設定を上書きしない。
{
  const h = createHarness();
  h.sync();
  h.change(true);
  h.contains.shift()(false);
  assert.equal(h.category.use_paste, true);
  assert.deepEqual(h.saves, []);
  h.sync();
  h.requests.shift()(true);
  h.contains.shift()(false);
  assert.equal(h.category.use_paste, true);
  assert.deepEqual(h.saves, [true]);
}

// 古い権限削除用の確認結果も、新しい有効化操作の後は無視する。
{
  const h = createHarness(false);
  h.sync();
  h.change(true);
  h.requests.shift()(true);
  h.contains.shift()(true);
  assert.deepEqual(h.removals, []);
}

// 許可・拒否・APIエラーを、同じIDを持つ現在のカテゴリに適用する。
for (const result of ['granted', 'denied', 'error']) {
  const granted = result === 'granted';
  const h = createHarness(!granted);
  h.change(true);
  const replacement = { id: 'a', use_paste: !granted };
  const selected = { id: 'b', use_paste: true };
  h.state.categories = [replacement, selected];
  h.state.selectedCategoryId = selected.id;
  if (result === 'error') h.chrome.runtime.lastError = { message: '失敗' };
  h.requests.shift()(result !== 'denied');
  assert.equal(replacement.use_paste, granted);
  assert.equal(h.category.use_paste, !granted);
  assert.equal(selected.use_paste, true);
  assert.equal(h.checkbox.checked, true);
  assert.deepEqual(h.saves, [granted]);
}

// リクエスト中に削除されたカテゴリには結果を反映せず、保存もしない。
for (const granted of [true, false]) {
  const h = createHarness(!granted);
  h.change(true);
  h.state.categories = [];
  h.requests.shift()(granted);
  assert.equal(h.category.use_paste, !granted);
  assert.deepEqual(h.saves, []);
}

console.log('クリップボード権限の回帰テストに成功しました。');
