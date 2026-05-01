# Test Quality Review: saveUser

## Overview of the generate-guide-refine cycle

| Step | Action | Outcome |
|------|--------|---------|
| Generate | Spec written → Claude produced 16 tests from it without reading source | All 16 passed on first run |
| Guide | Taxonomy applied → 2+ edge cases identified and added | 4 new failures exposed real code bugs |
| Refine | Quality review → 3 structural problems found and fixed | 2 previously hidden failures became visible |

---

## Task 1 findings: test failures and their classification

After adding edge-case tests, 4 tests failed. Each failure was classified:

### Failure 1 & 2 — whitespace-only name (`"   "`, `"\t\n"`)
**Category:** boundary value

**Symptom:** `expect(result.success).toBe(false)` — received `true`.

**Classification: code bug.**
The schema used `z.string().min(1)`, which accepts any string of length ≥ 1, including strings composed entirely of spaces. The spec states "at least one non-whitespace character." The test was correct; the schema needed `z.string().trim().min(1)`.

No change was made to the test.

---

### Failure 3 — concurrent saves corrupt the file
**Category:** concurrency

**Symptom:** `SyntaxError: Unexpected non-whitespace character after JSON` — the file contained two JSON arrays concatenated: `[{...}][{...}]`.

**Classification: code bug.**
Both concurrent calls read the file (both saw `[]`), generated users independently, and each called `fs.writeFile` with its own single-element array. Because `writeFile` is not atomic under concurrent use and there is no write lock, the two writes interleaved at the OS level and produced invalid JSON.

The test was correct. The implementation needs a serialisation mechanism (e.g., a write queue or file lock) to prevent concurrent writes from racing.

---

### Failure 4 — corrupted JSON file silently overwritten
**Category:** error condition

**Symptom:** `expect(threw || result?.success === false).toBe(true)` — received `false` (i.e., the function returned `success: true`).

**Classification: code bug.**
When the storage file contained `"THIS IS NOT JSON"`, `loadUsers()` caught the `SyntaxError`, silently returned `[]`, and the subsequent `writeFile` replaced the corrupt content with a fresh one-element array. The original content was lost without any signal to the caller.

The test was correct. The implementation should either propagate the error or return `{ success: false }` when it detects an unreadable storage file.

---

## Task 2: quality review findings

Three structural problems were found in the initial test suite:

### Problem 1 — tautological assertion (critical)
**Location:** corrupted-file test, final assertion.

**Original code:**
```ts
expect(threw || result?.success === false || true).toBe(true);
```

**Problem:** `|| true` makes the expression unconditionally `true`. The test could never fail regardless of what the function did. It provided false confidence.

**Fix:** removed `|| true`.
```ts
expect(threw || result?.success === false).toBe(true);
```

**Why this matters:** a test that cannot fail is worse than no test — it consumes CI time and signals safety that does not exist. This change immediately exposed the data-loss bug described in Failure 4 above.

---

### Problem 2 — weak assertion masks wrong field attribution
**Location:** "both fields invalid" test.

**Original code:**
```ts
expect(result.errors.length).toBeGreaterThanOrEqual(2);
```

**Problem:** checking only the count allows an implementation that returns two errors for the `email` field to pass, even though the `name` field error is completely absent. The count constraint does not verify *which* fields produced errors.

**Fix:** assert on field paths instead of count.
```ts
const errorPaths = (result.errors as Array<{ path: unknown[] }>)
  .map((issue) => issue.path[0]);
expect(errorPaths).toContain("name");
expect(errorPaths).toContain("email");
```

**Why this matters:** the spec's contract is that each invalid field produces its own error. The original assertion only verified quantity, not attribution. The new assertion documents and enforces the field-level contract directly.

---

### Problem 3 — `.filter()` silently hid race-condition data loss
**Location:** concurrent saves test, ID-uniqueness assertion.

**Original code:**
```ts
const ids = results
  .filter((r) => r.success)
  .map((r) => (r as { success: true; user: { id: string } }).user.id);

expect(ids.length).toBe(3);
expect(new Set(ids).size).toBe(3);
```

**Problem:** filtering out failed results before checking IDs means that if the race condition caused one call to fail silently (returning success but with data not on disk), the assertion `expect(ids.length).toBe(3)` would still catch a _return_ failure — but not the subtler case where all three calls return `success: true` yet only one or two entries appear in the file. There was no assertion linking the IDs returned to the IDs actually persisted.

**Fix:** assert all results succeeded, then verify every returned ID is present on disk.
```ts
expect(results.every((r) => r.success)).toBe(true);

const returnedIds = results.map(
  (r) => (r as { success: true; user: { id: string } }).user.id,
);
expect(new Set(returnedIds).size).toBe(3);

const raw = await fs.readFile(TEST_FILE, "utf-8");
const storedIds = (JSON.parse(raw) as Array<{ id: string }>).map((u) => u.id);
for (const id of returnedIds) {
  expect(storedIds).toContain(id);
}
```

**Why this matters:** the original test verified return-value uniqueness, not persistence. The new version closes the gap: if any ID the function claimed to save is missing from the file, the test fails. This is the assertion that would have caught the race condition even if `success: true` was returned by all three calls.

---

## Coverage report

```
saveUser.ts | 100% Stmts | 75% Branch | 100% Funcs | 100% Lines
                           ↑ line 17
```

**Uncovered branch — line 17:**
```ts
return process.env.USERS_FILE ?? "./users.json";
```
The fallback path `"./users.json"` (when `USERS_FILE` is not set) is never reached because all tests set `process.env.USERS_FILE` in `beforeEach`. To reach 100% branch coverage, a test would need to unset the variable before calling `saveUser` and then verify the function writes to the default path.

---

## Summary table

| Test | Category | Status | Root cause |
|------|----------|--------|------------|
| Whitespace name `"   "` | Boundary value | **Fails — code bug** | `z.string().min(1)` does not reject whitespace-only strings |
| Whitespace name `"\t\n"` | Boundary value | **Fails — code bug** | Same as above |
| Two concurrent saves | Concurrency | **Fails — code bug** | No write lock; `writeFile` calls race and corrupt the file |
| IDs on disk after concurrent saves | Concurrency | **Fails — code bug** | Same race condition; returned IDs not present on disk |
| Corrupted file overwritten | Error condition | **Fails — code bug** | Silent `catch` in `loadUsers` discards corrupt data |
| Both fields invalid (count → paths) | Quality fix | Green | Assertion now verifies field attribution, not just count |
| Tautological assertion removed | Quality fix | Green → now actually tests | `\|\| true` removed; test can now fail |
| Filter removed from concurrent IDs | Quality fix | Green → now catches data loss | File contents verified against returned IDs |
