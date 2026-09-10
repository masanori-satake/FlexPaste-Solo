# Sentinel Security Journal

## 2025-05-18 - Input Validation and DoS Prevention in Local Backup File Import
**Vulnerability:** Importing backup JSON files in client-side Chrome Extensions without upper bound validation on file size, item counts, or string lengths can lead to local storage exhaustion or tab freeze (DoS).
**Learning:** Client-side parsing of user-supplied JSON files (via FileReader and JSON.parse) bypasses server-side request size checks, making browser memory and local storage quotas vulnerable to crafted large files.
**Prevention:** Enforce strict file size limits (e.g. 5MB) before reading files, and apply strict item count and string length caps during data normalization.

## 2026-03-31 - Prototype Inheritance Leakage in Dynamic Template Tag Resolution
**Vulnerability:** Dynamic variable resolution using prefix matching (e.g. `varName.startsWith('next_week_')`) with property lookup on standard objects (`obj[varName]`) can resolve prototype-polluted or same-name inherited properties, replacing tags such as `{{next_week_constructor}}` with unintended inherited values.
**Learning:** `{{next_week_constructor}}` is distinct from the built-in `constructor` property; the risk arises only when a same-name `next_week_constructor` property is inherited through the prototype chain.
**Prevention:** Always use `Object.prototype.hasOwnProperty.call(obj, key)` or `Object.hasOwn(obj, key)` when accessing dynamic property keys on objects.

## 2026-04-18 - Sanitization of ASCII Control Characters in Local Data Import
**Vulnerability:** User-supplied backup JSON files containing non-printable ASCII control characters (such as NULL bytes `\x00` or bell `\x07`) can lead to string corruption, unexpected UI behavior, or breakdown when injected into extension storage and DOM nodes.
**Learning:** Standard JSON parsing accepts control characters within strings, but raw control characters in Chrome Extensions storage or DOM contenteditable elements can create subtle rendering/parsing issues.
**Prevention:** Strip ASCII control characters `[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]` during import normalization while explicitly preserving valid multi-line formatting whitespace (`\t`, `\n`, `\r`).
