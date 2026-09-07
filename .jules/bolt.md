# Bolt's Journal - Critical Learnings

## 2025-05-20 - Lazy evaluation vs Pre-computation in template engines
**Learning:** Pre-building a complete key-value mapping of all possible date/time variables (e.g. 30+ Date object instantiations, formatting functions, and loop iterations for workdays/next-week days) on every template resolution call causes massive overhead when templates only use 1 or 2 tags (or no tags at all).
**Action:** Always check if template content contains variable markers (`{{`) first for early return, and evaluate dynamic variable values lazily on-demand when matched during regex replacement.
