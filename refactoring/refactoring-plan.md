# Refactoring Plan — Bookmark Manager

## File Selected

**`src/index.ts`**

This file mixes Express app setup, business logic (filtering, sorting, pagination), and mutable global state into a single module. It was chosen as the best candidate for refactoring because it concentrates the most responsibilities and contains the most identifiable code defects.

---

## Code Problems Identified

### 1. Dead validation for `page=0` (lines 75, 81–83)
`parseInt(page as string) || 1` converts `0` and `NaN` to `1` before the `if (pageNum < 1)` guard is reached. The guard never fires for `page=0` or non-numeric input — both are silently coerced to page 1. The validation is partially dead code.

### 2. `order` parameter not validated (line 61)
Any value other than `"desc"` silently defaults to ascending order. Inputs like `order=asc`, `order=ascending`, or `order=typo` produce no error and no warning. The `sort` field has explicit 400 validation; `order` has none.

### 3. TOCTOU race condition in `withPersist` (lines 18–20)
The in-memory state is mutated before `await persistBookmarks()` completes. Concurrent `GET` requests can read the new state during the async write window. If the write fails and rolls back, those requests already returned data that was never persisted.

### 4. Inconsistent error response shape (lines 101, 109, 124, 130, 146)
Validation errors (400) return `{ "errors": [...] }` (plural, array). All other errors (404, 500) return `{ "error": "..." }` (singular, string). A client cannot write a single error handler — it must inspect the body to know which key to use.

### 5. `parseInt` without radix (lines 75, 77)
`parseInt` without a second argument parses `0x`-prefixed strings as hexadecimal. `page=0x10` is silently parsed as 16, bypassing any intent to reject non-decimal input. The correct form is `parseInt(x, 10)`.

### 6. Shared mutable state across test runs (line 10)
`bookmarks` is a module-level variable initialized via top-level `await` at import time. State mutations from one test can leak into subsequent tests within the same suite if not explicitly reset. The `withPersist` rollback also reassigns this external variable from inside a helper, hiding the side effect from the function's type signature.

---

## Problem Selected

**Problem 1 — Dead validation for `page=0` (lines 75, 81–83)**

---

## Step-by-Step Refactoring Plan

### Step 1 — Isolate the parse without applying a default
Replace:
```ts
const pageNum = parseInt(page as string) || 1;
```
With a raw parsed value:
```ts
const parsedPage = page !== undefined ? parseInt(page as string, 10) : undefined;
```
This also adds the missing radix `10`, fixing Problem 5 as a side effect.

### Step 2 — Validate before applying the default
With the raw value available, check for invalid input before any fallback:
```ts
if (parsedPage !== undefined && (Number.isNaN(parsedPage) || parsedPage < 1)) {
  return res.status(400).json({ error: "page must be >= 1" });
}
const pageNum = parsedPage ?? 1;
```
The guard now covers all invalid cases: `page=0`, `page=abc`, `page=-1`. The `?? 1` default applies only when `page` is absent, never to explicit invalid input.

### Step 3 — Remove the now-dead guard
The old `if (pageNum < 1)` block is entirely replaced by the new guard above and must be deleted.

### Step 4 — Write failing tests before changing the code
Add tests expressing the desired behavior before touching the implementation:
- `page=0&limit=5` → expects 400
- `page=abc&limit=5` → expects 400

These tests fail with the current code, proving the bug. Commit them separately.

### Step 5 — Confirm all tests pass after the fix
Run `npm test` and verify that all 67 tests pass, including the two new ones.

---

## Why I Chose This Problem

I selected Problem 1 because it is the clearest example of a logic error with a provable, observable consequence. The bug is not theoretical — it can be demonstrated with a single HTTP request (`GET /bookmarks?page=0&limit=5`) that returns 200 instead of 400. That made it straightforward to write a failing test before touching any code, which is the practice I wanted to follow: test first, then fix, then commit each step separately.

The other problems are real, but they are either harder to isolate (the race condition requires concurrent requests to reproduce), or they involve design decisions that go beyond a single targeted change (the inconsistent error shape would require touching every route handler). Problem 1 had a narrow, well-defined scope: three lines to replace, two tests to add, zero risk of breaking unrelated behavior. It was the right size for a single, clean refactoring commit.
