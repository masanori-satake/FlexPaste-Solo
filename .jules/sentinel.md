# Sentinel Security Journal

## 2025-05-18 - Input Validation and DoS Prevention in Local Backup File Import
**Vulnerability:** Importing backup JSON files in client-side Chrome Extensions without upper bound validation on file size, item counts, or string lengths can lead to local storage exhaustion or tab freeze (DoS).
**Learning:** Client-side parsing of user-supplied JSON files (via FileReader and JSON.parse) bypasses server-side request size checks, making browser memory and local storage quotas vulnerable to crafted large files.
**Prevention:** Enforce strict file size limits (e.g. 5MB) before reading files, and apply strict item count and string length caps during data normalization.
