# Sentinel Security Journal

## 2025-05-18 - Input Validation and DoS Prevention in Local Backup File Import
**Vulnerability:** Importing backup JSON files in client-side Chrome Extensions without upper bound validation on file size, item counts, or string lengths can lead to local storage exhaustion or tab freeze (DoS).
**Learning:** Client-side parsing of user-supplied JSON files (via FileReader and JSON.parse) bypasses server-side request size checks, making browser memory and local storage quotas vulnerable to crafted large files.
**Prevention:** Enforce strict file size limits (e.g. 5MB) before reading files, and apply strict item count and string length caps during data normalization.

## 2026-03-31 - Prototype Inheritance Leakage in Dynamic Template Tag Resolution
**Vulnerability:** Dynamic variable resolution using prefix matching (e.g. `varName.startsWith('next_week_')`) with property lookup on standard objects (`obj[varName]`) resolves inherited `Object.prototype` properties (such as `constructor` or `toString`), replacing tags like `{{next_week_constructor}}` with JS engine internals.
**Learning:** Bracket notation access on plain JavaScript objects resolves properties up the prototype chain unless restricted with `Object.prototype.hasOwnProperty.call()` or `Object.hasOwn()`.
**Prevention:** Always use `Object.prototype.hasOwnProperty.call(obj, key)` or `Object.hasOwn(obj, key)` when accessing dynamic property keys on objects.
