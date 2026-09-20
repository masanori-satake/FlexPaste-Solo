// scripts/test_utils.js - Unit tests for FlexPaste-Solo utils.js
import assert from 'node:assert';
import { adjustTime, getByteLength, resolveVariables, restoreCategoriesFromSync, splitStringToByteChunks, syncFromCloudIfNeeded, validateImportData } from '../projects/app/utils.js';
import { getEditorContentString, populateEditorFromText, validateAndNormalizeBackup } from '../projects/app/options.js';

console.log('Running unit tests for utils.js & options.js...');

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

  // Negative, NaN, or non-finite intervals (defensive check)
  assert.strictEqual(adjustTime(d910, -15, 'round'), '09:10', '9:10 with -15 min interval should return unadjusted time');
  assert.strictEqual(adjustTime(d910, NaN, 'round'), '09:10', '9:10 with NaN interval should return unadjusted time');
  assert.strictEqual(adjustTime(d910, Infinity, 'round'), '09:10', '9:10 with Infinity interval should return unadjusted time');
  assert.strictEqual(adjustTime(d910, 'invalid', 'round'), '09:10', '9:10 with invalid string interval should return unadjusted time');
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

// 3. Test resolveVariables defensive handling for non-string input
{
  assert.strictEqual(resolveVariables(null), '', 'resolveVariables(null) should return empty string');
  assert.strictEqual(resolveVariables(undefined), '', 'resolveVariables(undefined) should return empty string');
  assert.strictEqual(resolveVariables(12345), '', 'resolveVariables(number) should return empty string');
  assert.strictEqual(resolveVariables({ key: 'value' }), '', 'resolveVariables(object) should return empty string');
}

// 4. Test resolveVariables protection against prototype property leakage
{
  const now = new Date(2025, 0, 1, 9, 0, 0);
  const protoTemplate = '{{next_week_constructor}} {{next_week_toString}} {{next_week_valueOf}}';
  Object.assign(Object.prototype, {
    next_week_constructor: 'polluted constructor',
    next_week_toString: 'polluted toString',
    next_week_valueOf: 'polluted valueOf'
  });

  try {
    const resolved = resolveVariables(protoTemplate, {}, now);
    assert.strictEqual(resolved, protoTemplate, 'Inherited Object prototype properties should not be resolved');
  } finally {
    delete Object.prototype.next_week_constructor;
    delete Object.prototype.next_week_toString;
    delete Object.prototype.next_week_valueOf;
  }
}

// 5. Test validateAndNormalizeBackup control character stripping and input sanitization
{
  const maliciousInput = {
    settings: { workdays: [1, 2, 3] },
    categories: [
      {
        id: 'cat_\x01_test\x00',
        title: 'Title\x07With\x1FControl\x7FChars',
        time_adj_interval: 15,
        def_1: 'Def1\x00Value',
        templates: [
          {
            id: 'tpl_\x001',
            title: 'Tpl\x02Title',
            content: 'Hello\x00World\nLine2'
          }
        ]
      }
    ]
  };

  const normalized = validateAndNormalizeBackup(maliciousInput);
  assert.notStrictEqual(normalized, null, 'Normalized result should not be null');
  assert.strictEqual(normalized.categories[0].title, 'TitleWithControlChars', 'Control characters should be stripped from title');
  assert.strictEqual(normalized.categories[0].def_1, 'Def1Value', 'Control characters should be stripped from def_1');
  assert.strictEqual(normalized.categories[0].templates[0].title, 'TplTitle', 'Control characters should be stripped from template title');
  assert.strictEqual(normalized.categories[0].templates[0].content, 'HelloWorld\nLine2', 'Control characters should be stripped from content while preserving newlines');
}

// 6. Test validateImportData for device sync data
{
  const testData = {
    settings: {
      workdays: [1, 2, '3', 8, 0],
      syncEnabled: true
    },
    categories: [
      {
        id: 'cat_sync_1',
        title: 'Sync Category',
        time_adj_interval: 15,
        use_paste: true,
        def_1: 'Def 1',
        templates: [
          {
            id: 'tpl_sync_1',
            title: 'Sync Template',
            content: 'Hello {{date}}'
          }
        ]
      }
    ]
  };

  validateImportData(testData);
  assert.deepStrictEqual(testData.settings.workdays, [1, 2, 3], 'Workdays should be normalized and filtered to 1-7');
  assert.strictEqual(testData.settings.syncEnabled, true, 'syncEnabled should be boolean true');
  assert.strictEqual(testData.categories.length, 1, 'Categories length should be 1');
  assert.strictEqual(testData.categories[0].id, 'cat_sync_1', 'Category ID should be preserved');
  assert.strictEqual(testData.categories[0].templates[0].id, 'tpl_sync_1', 'Template ID should be preserved');
}

// 7. Test validateImportData duplicate ID handling
{
  const duplicateIdData = {
    settings: { workdays: [1, 2, 3, 4, 5] },
    categories: [
      {
        id: 'cat_dup',
        title: 'Category 1',
        templates: [
          { id: 'tpl_dup', title: 'Tpl 1', content: 'A' },
          { id: 'tpl_dup', title: 'Tpl 2', content: 'B' }
        ]
      },
      {
        id: 'cat_dup',
        title: 'Category 2',
        templates: [
          { id: 'tpl_3', title: 'Tpl 3', content: 'C' }
        ]
      }
    ]
  };

  validateImportData(duplicateIdData);
  assert.strictEqual(duplicateIdData.categories.length, 2, 'Should keep both categories');
  assert.notStrictEqual(duplicateIdData.categories[0].id, duplicateIdData.categories[1].id, 'Duplicate category IDs must be unique');
  assert.strictEqual(duplicateIdData.categories[0].id, 'cat_dup', 'First category ID should be preserved');
  assert.notStrictEqual(duplicateIdData.categories[0].templates[0].id, duplicateIdData.categories[0].templates[1].id, 'Duplicate template IDs must be unique');
  assert.strictEqual(duplicateIdData.categories[0].templates[0].id, 'tpl_dup', 'First template ID should be preserved');
}

// 8. Test generated IDs are retried when they collide with retained IDs
{
  const originalRandomUUID = crypto.randomUUID;
  const generatedIds = [
    'category-collision',
    'category-unique',
    'template-collision',
    'template-unique'
  ];
  crypto.randomUUID = () => generatedIds.shift();

  try {
    const generatedIdCollisionData = {
      categories: [
        {
          id: 'cat_category-collision',
          templates: [{ id: 'tpl_template-collision', title: 'First', content: 'A' }]
        },
        {
          id: '',
          templates: [
            { id: 'tpl_dup', title: 'Second', content: 'B' },
            { id: 'tpl_dup', title: 'Third', content: 'C' }
          ]
        }
      ]
    };

    validateImportData(generatedIdCollisionData);
    assert.strictEqual(generatedIdCollisionData.categories[1].id, 'cat_category-unique', 'Empty category IDs must retry generated collisions');
    assert.strictEqual(generatedIdCollisionData.categories[1].templates[1].id, 'tpl_template-unique', 'Duplicate template IDs must retry generated collisions');
  } finally {
    crypto.randomUUID = originalRandomUUID;
  }
}

// 9. Test syncFromCloudIfNeeded with mock chrome.storage
{
  const mockLocalStorage = {
    settings: { workdays: [1, 2, 3, 4, 5], syncEnabled: true },
    categories: []
  };

  const sampleCategories = [
    {
      id: 'cat_cloud_1',
      title: 'Cloud Category',
      time_adj_interval: 10,
      use_paste: false,
      def_1: '',
      def_2: '',
      def_3: '',
      templates: [{ id: 'tpl_cloud_1', title: 'Cloud Tpl', content: 'Sync Content' }]
    }
  ];

  const serializedCats = JSON.stringify(sampleCategories);
  const legacyCategories = [{ id: 'cat_legacy', title: 'Legacy Category', templates: [] }];
  const mockSyncStorage = {
    settings: { workdays: [1, 2, 3, 4, 5, 6] },
    categories: legacyCategories,
    categories_chunk_count: 1,
    categories_chunk_0: serializedCats
  };

  let localSavedData = null;

  globalThis.chrome = {
    storage: {
      local: {
        get: async (keys) => {
          const res = {};
          if (Array.isArray(keys)) {
            keys.forEach(k => { res[k] = mockLocalStorage[k]; });
          }
          return res;
        },
        set: async (updates) => {
          localSavedData = updates;
        }
      },
      sync: {
        get: async (keys) => {
          if (keys === null) {
            return { ...mockSyncStorage };
          }
          const res = {};
          if (Array.isArray(keys)) {
            keys.forEach(k => { res[k] = mockSyncStorage[k]; });
          }
          return res;
        }
      }
    }
  };

  await syncFromCloudIfNeeded();

  assert.notStrictEqual(localSavedData, null, 'Local storage should be updated by syncFromCloudIfNeeded');
  assert.deepStrictEqual(localSavedData.settings.workdays, [1, 2, 3, 4, 5, 6], 'Cloud settings workdays should be applied');
  assert.strictEqual(localSavedData.settings.syncEnabled, true, 'syncEnabled should remain true in local settings');
  assert.strictEqual(localSavedData.categories.length, 1, 'Chunked categories from cloud should be reconstructed and saved');
  assert.strictEqual(localSavedData.categories[0].id, 'cat_cloud_1', 'Valid chunked categories should take precedence over legacy categories');

  delete globalThis.chrome;
}

// 10. Test chunk restoration falls back to legacy categories only when chunks fail
{
  const legacyCategories = [{ id: 'cat_legacy', title: 'Legacy Category', templates: [] }];
  const incompleteChunks = {
    categories: legacyCategories,
    categories_chunk_count: 2,
    categories_chunk_0: '[{"id":"cat_chunked"}]'
  };

  assert.strictEqual(
    restoreCategoriesFromSync(incompleteChunks),
    legacyCategories,
    'Missing chunks should fall back to legacy categories'
  );

  // Test invalid / malicious categories_chunk_count bounds
  assert.strictEqual(
    restoreCategoriesFromSync({ categories: legacyCategories, categories_chunk_count: 1.5 }),
    legacyCategories,
    'Non-integer categories_chunk_count should fall back to legacy categories'
  );
  assert.strictEqual(
    restoreCategoriesFromSync({ categories: legacyCategories, categories_chunk_count: -1 }),
    legacyCategories,
    'Negative categories_chunk_count should fall back to legacy categories'
  );
  assert.strictEqual(
    restoreCategoriesFromSync({ categories: legacyCategories, categories_chunk_count: 1000 }),
    legacyCategories,
    'Excessive categories_chunk_count (>100) should fall back to legacy categories'
  );
  assert.strictEqual(
    restoreCategoriesFromSync({ categories: legacyCategories, categories_chunk_count: Infinity }),
    legacyCategories,
    'Infinity categories_chunk_count should fall back to legacy categories'
  );

  const originalWarn = console.warn;
  console.warn = () => {};
  try {
    assert.strictEqual(
      restoreCategoriesFromSync({
        categories: legacyCategories,
        categories_chunk_count: 1,
        categories_chunk_0: '{invalid json'
      }),
      legacyCategories,
      'Malformed chunk data should fall back to legacy categories'
    );
  } finally {
    console.warn = originalWarn;
  }
}

// 11. Test populateEditorFromText and getEditorContentString for newline and trailing blank line preservation
{
  // Simple Mock DOM Node for Node.js unit testing
  class MockNode {
    constructor(nodeType, nodeValue = '', tagName = '') {
      this.nodeType = nodeType;
      this.nodeValue = nodeValue;
      this.tagName = tagName;
      this.childNodes = [];
      this.nextSibling = null;
      this.classList = {
        contains: (cls) => this._cls === cls
      };
      this.dataset = {};
    }
    appendChild(child) {
      if (this.childNodes.length > 0) {
        this.childNodes[this.childNodes.length - 1].nextSibling = child;
      }
      this.childNodes.push(child);
      return child;
    }
  }

  const mockDocument = {
    createElement: (tag) => new MockNode(1, '', tag.toUpperCase()),
    createTextNode: (text) => new MockNode(3, text)
  };

  const originalDocument = globalThis.document;
  globalThis.document = mockDocument;

  try {
    // Case A: Normal 2-line text
    {
      const container = new MockNode(1, '', 'DIV');
      populateEditorFromText(container, 'Hello\nWorld');
      const textResult = getEditorContentString(container);
      assert.strictEqual(textResult, 'Hello\nWorld', 'Should preserve 2-line text without trailing blank line');
    }

    // Case B: Trailing blank line (1 trailing newline)
    {
      const container = new MockNode(1, '', 'DIV');
      populateEditorFromText(container, 'Hello\n');
      const textResult = getEditorContentString(container);
      assert.strictEqual(textResult, 'Hello\n', 'Should accurately preserve single trailing blank line');
    }

    // Case C: Multiple trailing blank lines (2 trailing newlines)
    {
      const container = new MockNode(1, '', 'DIV');
      populateEditorFromText(container, 'Hello\n\n');
      const textResult = getEditorContentString(container);
      assert.strictEqual(textResult, 'Hello\n\n', 'Should accurately preserve multiple trailing blank lines');
    }

    // Case D: Chrome contenteditable DIV structure: <div>Hello</div><div><br></div>
    {
      const container = new MockNode(1, '', 'DIV');

      const div1 = new MockNode(1, '', 'DIV');
      div1.appendChild(new MockNode(3, 'Hello'));
      container.appendChild(div1);

      const div2 = new MockNode(1, '', 'DIV');
      div2.appendChild(new MockNode(1, '', 'BR'));
      container.appendChild(div2);

      const textResult = getEditorContentString(container);
      assert.strictEqual(textResult, 'Hello\n', 'Chrome contenteditable <div>Hello</div><div><br></div> should return "Hello\\n"');
    }

    // Case E: Chrome contenteditable DIV structure with 2 empty lines: <div>Hello</div><div><br></div><div><br></div>
    {
      const container = new MockNode(1, '', 'DIV');

      const div1 = new MockNode(1, '', 'DIV');
      div1.appendChild(new MockNode(3, 'Hello'));
      container.appendChild(div1);

      const div2 = new MockNode(1, '', 'DIV');
      div2.appendChild(new MockNode(1, '', 'BR'));
      container.appendChild(div2);

      const div3 = new MockNode(1, '', 'DIV');
      div3.appendChild(new MockNode(1, '', 'BR'));
      container.appendChild(div3);

      const textResult = getEditorContentString(container);
      assert.strictEqual(textResult, 'Hello\n\n', 'Chrome contenteditable with 2 trailing empty divs should return "Hello\\n\\n"');
    }

    // Case F: Intermediate empty block between text blocks: <div>Hello</div><div><br></div><div>World</div>
    {
      const container = new MockNode(1, '', 'DIV');

      const div1 = new MockNode(1, '', 'DIV');
      div1.appendChild(new MockNode(3, 'Hello'));
      container.appendChild(div1);

      const div2 = new MockNode(1, '', 'DIV');
      div2.appendChild(new MockNode(1, '', 'BR'));
      container.appendChild(div2);

      const div3 = new MockNode(1, '', 'DIV');
      div3.appendChild(new MockNode(3, 'World'));
      container.appendChild(div3);

      const textResult = getEditorContentString(container);
      assert.strictEqual(textResult, 'Hello\n\nWorld', 'Chrome contenteditable with intermediate empty div should return "Hello\\n\\nWorld"');
    }
  } finally {
    globalThis.document = originalDocument;
  }
}

// 12. Test splitStringToByteChunks & getByteLength with multibyte Japanese text
{
  const jaText = 'あ'.repeat(1200); // 1200 Japanese chars = 3600 UTF-8 bytes
  assert.strictEqual(getByteLength(jaText), 3600, '1200 Japanese characters should equal 3600 UTF-8 bytes');

  const chunks = splitStringToByteChunks(jaText, 3500);
  assert.strictEqual(chunks.length, 2, '3600 UTF-8 bytes should be split into 2 chunks with maxBytes=3500');

  // Verify reconstructed text matches original exactly
  assert.strictEqual(chunks.join(''), jaText, 'Reconstructed text from byte chunks must match original text');

  // Verify each chunk is strictly under maxBytes (3500 UTF-8 bytes)
  for (let i = 0; i < chunks.length; i++) {
    const chunkByteLen = getByteLength(chunks[i]);
    assert.ok(chunkByteLen <= 3500, `Chunk ${i} byte length (${chunkByteLen}) must be <= 3500 bytes`);
  }

  for (const invalidMaxBytes of [0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '3500']) {
    assert.throws(
      () => splitStringToByteChunks('test', invalidMaxBytes),
      RangeError,
      `maxBytes=${String(invalidMaxBytes)} must be rejected`
    );
  }

  assert.throws(
    () => splitStringToByteChunks('あ', 1),
    RangeError,
    'A byte limit smaller than the next UTF-8 character must be rejected'
  );

  // Test restoration of multi-chunk Japanese text via restoreCategoriesFromSync
  const testCategories = [
    {
      id: 'cat_ja_1',
      title: '日本語カテゴリ',
      templates: [
        {
          id: 'tpl_ja_1',
          title: '長いテンプレート',
          content: 'テスト文字列：' + 'こんにちは！FlexPaste-Soloです。'.repeat(200)
        }
      ]
    }
  ];

  const serializedJaCats = JSON.stringify(testCategories);
  const jaChunks = splitStringToByteChunks(serializedJaCats, 3500);
  const syncPayload = {
    categories_chunk_count: jaChunks.length
  };
  jaChunks.forEach((c, idx) => {
    syncPayload[`categories_chunk_${idx}`] = c;
  });

  const restoredCats = restoreCategoriesFromSync(syncPayload);
  assert.deepStrictEqual(restoredCats, testCategories, 'Restored categories from byte-split sync payload must match original categories');
}

console.log('All unit tests passed successfully!');
