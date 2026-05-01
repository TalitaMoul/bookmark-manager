# Add a Feature to an Existing Project — Deliverables

**Project:** bookmark-manager  
**Feature added:** Text search via `GET /bookmarks?q=`  
**Student:** Marcello Zanandrea
**Date:** 2026-04-18

---

## 1. Assessment Summary

### How the assessment was conducted

The codebase was analyzed by reading all source files: `src/index.ts`, `src/types.ts`, `src/storage.ts`, `src/config.ts`, `src/app.test.ts`, plus configuration files (`tsconfig.json`, `jest.config.cjs`, `package.json`).

### Key patterns found

**File organization**
The project uses a flat structure with purpose-based filenames — no subfolders, no controllers, no separate route files. All routing logic lives in a single `src/index.ts`. Types and Zod schemas are in `src/types.ts`. Persistence is isolated in `src/storage.ts`. Configuration comes from `src/config.ts`.

**Routing pattern**
Routes are registered directly on the Express `app` instance using standard HTTP verbs (`app.get`, `app.post`, `app.put`, `app.delete`). Route parameters are accessed via `req.params.id`. Query parameters are destructured from `req.query` and cast as `as string` when needed — no middleware or separate validation layer for query params.

**Validation pattern**
Every POST and PUT route validates the request body with Zod's `safeParse()`. On failure, the route returns immediately with `res.status(400).json({ errors: result.error.issues })`. Schemas are defined in `types.ts` with PascalCase names suffixed with `Schema` (e.g., `CreateBookmarkSchema`).

**Data layer**
There is no database. The application loads the full dataset from a JSON file into a module-level `let bookmarks: Bookmark[]` array on startup. All reads (`filter`, `find`) run against this in-memory array. All mutations (create, update, delete) modify the array and then call `await saveBookmarks(bookmarks)` to persist the full array back to disk.

**Error response shapes**

- 400 (validation): `{ errors: ZodIssue[] }` — Zod's raw issues array
- 404 (not found): `{ error: "Bookmark not found" }` — plain string message
- Early returns with `return res.status(N).json(...)` prevent further handler execution

**Success response shapes**

- `GET /bookmarks` → array of bookmark objects
- `GET /bookmarks/:id`, `POST`, `PUT` → single bookmark object
- `DELETE` → 204 with no body
- `GET /health` → `{ status: "ok" }`

**Type system**
`Bookmark` is defined as `z.infer<typeof CreateBookmarkSchema> & { id: string }` — Zod schema is the single source of truth for both validation and TypeScript types. IDs are always `string`, generated with `uuidv4()`.

**Test structure**
Tests use Jest + Supertest. They make real HTTP requests to the actual Express app instance — no mocks. Tests are organized in nested `describe()` blocks. Shared setup data is created inside `beforeAll()`. Each test creates its own fixtures inline via `request(app).post(...)`. The test environment uses a separate `bookmarks.test.json` file configured via `BOOKMARKS_FILE` environment variable in `jest.config.cjs`.

**String comparison**
Case-insensitive comparisons use `.toLowerCase()` on both sides (e.g., `t.toLowerCase() === (tag as string).toLowerCase()` in the existing tag filter).

### Corrections to the assessment

The automated analysis was accurate. One nuance worth noting: the test file uses `beforeAll` (not `beforeEach`) for setup, meaning fixtures accumulate across tests in the same `describe` block. This is intentional — tests assert on `length > 0` rather than exact counts, which accommodates the shared state.

---

## 2. Rules List

These are the 8 concrete, project-specific rules identified as relevant to the feature being added:

1. **Routes are defined inline in `src/index.ts`** using `app.METHOD(path, handler)` — no separate route files, controllers, or middleware files.

2. **Query parameters are extracted via `const { paramName } = req.query` and cast as `as string`** — no Zod schema or validation middleware for query params.

3. **All data queries run against the in-memory `bookmarks` array** using `Array.filter()` or `Array.find()` — never read from disk inside a request handler.

4. **404 responses use `return res.status(404).json({ error: "Bookmark not found" })`** — singular `error` key with a plain string; early return stops handler execution.

5. **400 responses use `return res.status(400).json({ errors: result.error.issues })`** — plural `errors` key containing the raw Zod issues array.

6. **String comparisons are case-insensitive using `.toLowerCase()` on both the stored value and the input** — never compare raw strings directly.

7. **Tests use Supertest with real HTTP requests (no mocks)**, nested `describe()` blocks, and `beforeAll()` for creating setup fixtures via `request(app).post(...)`.

8. **GET success responses return the data directly** via `res.json(value)` with no wrapper object — arrays for list endpoints, single objects for item endpoints.

---

## 3. Deviation Log

The feature was implemented after the rules above were written. Each rule was checked against the generated code before finalizing.

| #   | Rule                                          | Code produced                                                                      | Deviation? | Resolution |
| --- | --------------------------------------------- | ---------------------------------------------------------------------------------- | ---------- | ---------- |
| 1   | Routes inline in `index.ts`                   | Extended existing `app.get("/bookmarks", ...)` handler                             | None       | —          |
| 2   | Query params via `req.query` cast `as string` | `const { tag, q } = req.query` + `(q as string).toLowerCase()`                     | None       | —          |
| 3   | Queries against in-memory array only          | `let result = bookmarks` + `result.filter(...)`                                    | None       | —          |
| 4   | 404 shape                                     | No new 404 paths introduced; existing ones unchanged                               | None       | —          |
| 5   | 400 shape                                     | No new validation paths introduced; existing ones unchanged                        | None       | —          |
| 6   | Case-insensitive comparison                   | `(q as string).toLowerCase()` vs `b.title.toLowerCase()` and `b.url.toLowerCase()` | None       | —          |
| 7   | Tests: real HTTP, nested describe, beforeAll  | New `describe("Search Operations")` with inline fixture creation per test          | None       | —          |
| 8   | GET returns data directly                     | `res.json(result)` — no wrapper                                                    | None       | —          |

**Result: zero deviations.** The rules were written before implementation and used as a checklist during coding, which prevented violations from being introduced in the first place.

---

## 4. Final Compliance Review

### Code reviewed

- `src/index.ts` lines 16–35 (modified `GET /bookmarks` handler)
- `src/app.test.ts` lines 74–130 (new `Search Operations` describe block)

### Rule-by-rule compliance check

**Rule 1 — Routes inline in `index.ts`**
✅ Compliant. The search logic was added inside the existing `app.get("/bookmarks", ...)` handler. No new file was created.

**Rule 2 — Query params via `req.query` cast `as string`**
✅ Compliant. `const { tag, q } = req.query` destructures both params at once. `(q as string).toLowerCase()` applies the same cast pattern already used for `tag` on line 20 of the original file.

**Rule 3 — Queries against in-memory array**
✅ Compliant. The handler assigns `let result = bookmarks` and chains two `Array.filter()` calls. No file reads inside the handler.

**Rule 4 — 404 shape**
✅ Compliant. No new 404 paths were introduced. Existing paths are unchanged.

**Rule 5 — 400 shape**
✅ Compliant. No new validation paths were introduced. Existing paths are unchanged.

**Rule 6 — Case-insensitive comparison**
✅ Compliant. Both the search term and the stored values are lowercased before comparison:

```typescript
const term = (q as string).toLowerCase();
result = result.filter(
  (b) =>
    b.title.toLowerCase().includes(term) || b.url.toLowerCase().includes(term),
);
```

**Rule 7 — Tests: real HTTP, nested describe, beforeAll**
✅ Compliant. The new `describe("Search Operations")` block is nested inside `describe("Read Operations")`, at the same hierarchy depth as `describe("Filtering Operations")`. Fixtures are created inline per test using `request(app).post(...)`. No `beforeAll` was needed because each test is self-contained.

**Rule 8 — GET returns data directly**
✅ Compliant. `res.json(result)` returns the filtered array with no wrapper.

### Test results

```
Tests: 17 passed, 17 total
  - 12 pre-existing tests: all still passing
  - 5 new Search Operations tests: all passing
```

### Assessment

All 8 rules are fully satisfied. The new code is indistinguishable in style from the surrounding code.

---

## 5. New Pattern Justification

**No new pattern was introduced.**

The text search feature (`?q=`) follows the identical pattern already established by the tag filter (`?tag=`):

- Same extraction method: destructure from `req.query`
- Same type cast: `as string`
- Same normalization: `.toLowerCase()` on both sides
- Same data access: `Array.filter()` on the in-memory array
- Same response: `res.json(result)` with no wrapper

The only structural decision was to replace the early-return `if (tag) return res.json(filtered)` with a `let result = bookmarks` variable that both filters chain onto. This was necessary to allow the two filters to compose, but it introduces no new abstraction — it is the most direct expression of "apply filter A, then apply filter B" in plain JavaScript. Existing patterns were entirely sufficient to cover this feature.

---

---

# Test, Break, and Fix — Deliverables

**Function under test:** `GET /bookmarks` filtering handler — `src/index.ts` lines 16–36  
**Test framework:** Jest + Supertest (real HTTP, no mocks)

---

## 1. Test Suite

### Function analysis
The handler accepts two optional query params: `?tag=` (exact, case-insensitive tag match) and `?q=` (substring search across title and URL, case-insensitive). Filters are composable — both can be applied at once. Returns a JSON array; empty array when nothing matches.

### Edge cases identified
- Tag filter must be **exact match**, not substring (`"alph"` must not match `"alpha"`)
- Tag filter must be **case-insensitive** (`"ALPHA"` must match `"alpha"`)
- Tag filter with no matches must return `[]`, not 404
- Search must match when term appears **only in title** (not in URL)
- Search must match when term appears **only in URL** (not in title)
- Combined `?tag=&q=` must return empty when tag matches but `q` does not
- Combined `?tag=&q=` must return only bookmarks satisfying **both** conditions
- Empty `?q=` must be ignored (falsy string), returning all bookmarks

### Tests written (new `describe("Filtering Edge Cases")` block)

| # | Test | Purpose |
|---|---|---|
| 1 | tag filter is case-insensitive | `?tag=ALPHA` must find bookmarks tagged `"alpha"` |
| 2 | tag filter returns empty array when no match | validates 200 + `[]`, not 404 |
| 3 | tag filter is exact match, not substring | `?tag=alph` must NOT match `"alpha"` |
| 4 | search matches term only in title | validates `\|\|` logic — title-side branch |
| 5 | search matches term only in URL | validates `\|\|` logic — url-side branch |
| 6 | combined tag+q returns empty when q fails | both conditions must be satisfied |
| 7 | combined tag+q returns only double-match | intersection, not union |
| 8 | empty `?q=` is ignored | empty string is falsy, no filter applied |
| + 2 | regression tests (added in Part 3) | see below |

### Changes from initial AI output
The initial test scaffold used `toBeGreaterThan(0)` assertions on array length, which pass even if unexpected bookmarks are included. These were replaced with **id-based assertions** (`ids.toContain(idA)` / `not.toContain(idB)`) using a `beforeAll` that creates controlled fixtures with unique, identifiable titles and URLs. This makes each test check precise membership, not just count.

### Baseline result
```
Tests: 25 passed, 25 total  (17 pre-existing + 8 new edge cases)
```

---

## 2. Bug Description

**What was changed:**

In `src/index.ts` line 30, the logical operator in the search filter was changed from `||` to `&&`:

```typescript
// Before (correct):
b.title.toLowerCase().includes(term) || b.url.toLowerCase().includes(term)

// After (bug):
b.title.toLowerCase().includes(term) && b.url.toLowerCase().includes(term)
```

**Why it is realistic:**
A developer reading a comment or PR description saying "search by title and URL" could naturally write `&&`, interpreting "and" as a conjunction requiring both fields to match. The code compiles cleanly, passes TypeScript checks, and looks plausible at a glance. It only fails for bookmarks where the search term appears in exactly one field — which is the common case in real data.

**Test results with bug active:**
```
Tests: 4 failed, 21 passed
Failing:
  - should search bookmarks by URL
  - search matches a bookmark whose term appears only in the title
  - search matches a bookmark whose term appears only in the URL
  - combined tag+search returns only bookmarks matching both filters
```

---

## 3. AI Diagnosis Evaluation

**Evidence given to AI:** the raw failing test output above, without revealing what was changed.

**AI's diagnosis (round 1):**
> "All 4 failures involve `?q=` returning an empty array when a match should exist. In every case, the search term appears in only one field — either the title or the URL — but the query returns nothing. The only way both single-field cases fail simultaneously is if the filter requires the term in both fields at once. The root cause is almost certainly `&&` where `||` is needed in the search condition in `src/index.ts` around line 30."

**Evaluation:**
- Correct on first round — no follow-up questions needed
- The AI identified the shared failure pattern (single-field matches returning empty) and correctly inferred the logical operator error
- It named the exact file and approximate line number without seeing the code
- Diagnosis was complete and actionable

---

## 4. Regression Tests

Two regression tests were added to `describe("Filtering Edge Cases")`, explicitly targeting the `||` vs `&&` defect:

```typescript
// Regression: search must use || not && — a term in only one field must still match
it("search finds bookmark when term is in title but not in URL", async () => {
  const res = await request(app).get("/bookmarks?q=alphadoc");
  const ids = res.body.map((b: { id: string }) => b.id);
  expect(ids).toContain(idA); // "AlphaDoc Primer" at "https://primer.io"
});

it("search finds bookmark when term is in URL but not in title", async () => {
  const res = await request(app).get("/bookmarks?q=betaref");
  const ids = res.body.map((b: { id: string }) => b.id);
  expect(ids).toContain(idB); // "Manual Guide" at "https://betaref.com/manual"
});
```

**What they target:** Each test uses a fixture where the search term exists in exactly one field. If `&&` were reintroduced, both tests would fail immediately because neither fixture has the term in both fields simultaneously. The comment on the first test names the defect explicitly so future readers understand the protection.

**Final result:**
```
Tests: 27 passed, 27 total
```

---

---

# Review and Fix AI-Generated Code — Deliverables

**Option chosen:** C — Search API with filtering and pagination  
**Function:** `GET /bookmarks` extended with `?page=`, `?limit=`, `?sort=`, `?order=`

---

## 1. Prompt Given to the AI

> "Add pagination support to `GET /bookmarks`. The endpoint already supports `?tag=` and `?q=` filters. Add support for `?page=`, `?limit=`, `?sort=` (field name), and `?order=` (asc or desc). Return the paginated results along with metadata. Make decisions about defaults and validation as you see fit."

---

## 2. Original Generated Code (Baseline)

```typescript
app.get("/bookmarks", (req, res) => {
  const { tag, q, page, limit, sort, order } = req.query;
  let result = bookmarks;

  if (tag) {
    result = result.filter((b) =>
      b.tags?.some((t) => t.toLowerCase() === (tag as string).toLowerCase()),
    );
  }

  if (q) {
    const term = (q as string).toLowerCase();
    result = result.filter(
      (b) =>
        b.title.toLowerCase().includes(term) ||
        b.url.toLowerCase().includes(term),
    );
  }

  if (sort) {
    const field = sort as string;
    const dir = (order as string) === "desc" ? -1 : 1;
    result = [...result].sort((a: any, b: any) => {
      if (a[field] < b[field]) return -1 * dir;
      if (a[field] > b[field]) return 1 * dir;
      return 0;
    });
  }

  const p = parseInt(page as string) || 1;
  const l = parseInt(limit as string) || 10;
  const start = (p - 1) * l;
  const end = start + l;

  res.json({
    data: result.slice(start, end),
    page: p,
    limit: l,
    total: result.length,
  });
});
```

**Test result with original code:** 16 failed, 11 passed.

---

## 3. Review Log

### Lens 1: Comprehension

| # | Location | Issue | Severity |
|---|---|---|---|
| L1-1 | Line 37–38 | Variables `p` and `l` are single-letter — purpose is not self-evident | should fix |
| L1-2 | Line 27 | `(a: any, b: any)` abandons the type system entirely — silently allows accessing undefined fields | should fix |
| L1-3 | Line 30 | `(order as string) === "desc"` — if `order` is `undefined`, the cast is a no-op at runtime; it "works" but conveys false confidence about type safety | should fix |

### Lens 2: Edge Cases

| # | Location | Issue | Severity |
|---|---|---|---|
| L2-1 | Line 37 | `?page=-1`: `parseInt("-1")` = -1; `-1 \|\| 1` = **-1** (negative numbers are truthy). `start = (-2) * l` is negative. `array.slice(-20, -10)` returns elements from the **end** of the array — completely wrong behavior | must fix |
| L2-2 | Line 38 | `?limit=0`: `0 \|\| 10` = 10 — silently ignores user's input and applies a default. Technically safe, but surprising | should fix |
| L2-3 | Line 41 | `?page=999` beyond total: returns `data: []` with no indication the page is out of range. `totalPages` is missing so client cannot know the valid range | should fix |

### Lens 3: Security

| # | Location | Issue | Severity |
|---|---|---|---|
| L3-1 | Lines 26–33 | `sort` field is user-controlled: `a[field]` accesses the bookmark object by any arbitrary key from the query string. User can pass `?sort=__proto__`, `?sort=constructor`, or probe for internal fields. No whitelist applied | must fix |
| L3-2 | Line 38 | `?limit=999999` is accepted without a cap — a single request can dump the entire dataset. DoS risk on large collections | must fix |

### Lens 4: Production-Readiness

| # | Location | Issue | Severity |
|---|---|---|---|
| L4-1 | Entire handler | **Breaking API change**: response shape changed from `Bookmark[]` to `{data, page, limit, total}` without versioning or opt-in. All existing consumers and 16 of 27 tests broke immediately | must fix |
| L4-2 | Lines 37–41 | Pagination applied even when `page` and `limit` are absent — clients that pass neither now silently receive only the first 10 results. This is a silent data truncation for all existing callers | must fix |
| L4-3 | Response shape | `totalPages` absent — client cannot determine valid page range without computing `Math.ceil(total / limit)` themselves | should fix |

---

## 4. Fixed Code

```typescript
const SORTABLE_FIELDS = new Set<string>(["title", "url", "description"]);
const MAX_PAGE_SIZE = 100;

app.get("/bookmarks", (req, res) => {
  const { tag, q, page, limit, sort, order } = req.query;
  let result = bookmarks;

  if (tag) {
    result = result.filter((b) =>
      b.tags?.some((t) => t.toLowerCase() === (tag as string).toLowerCase()),
    );
  }

  if (q) {
    const term = (q as string).toLowerCase();
    result = result.filter(
      (b) =>
        b.title.toLowerCase().includes(term) ||
        b.url.toLowerCase().includes(term),
    );
  }

  if (sort) {
    const field = sort as string;
    // Whitelist prevents arbitrary field access and prototype pollution
    if (!SORTABLE_FIELDS.has(field)) {
      return res.status(400).json({
        error: `Invalid sort field. Allowed: ${[...SORTABLE_FIELDS].join(", ")}`,
      });
    }
    const dir = order === "desc" ? -1 : 1;
    result = [...result].sort((a, b) => {
      const av = ((a[field as keyof Bookmark] ?? "") as string).toLowerCase();
      const bv = ((b[field as keyof Bookmark] ?? "") as string).toLowerCase();
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }

  // Pagination is opt-in: return array when neither page nor limit is given
  // This preserves backward compatibility with all existing consumers
  if (!page && !limit) {
    return res.json(result);
  }

  const pageNum = parseInt(page as string) || 1;
  const pageSize = Math.min(
    Math.max(parseInt(limit as string) || 10, 1),
    MAX_PAGE_SIZE,
  );

  if (pageNum < 1) {
    return res.status(400).json({ error: "page must be >= 1" });
  }

  const total = result.length;
  const totalPages = Math.ceil(total / pageSize);
  const start = (pageNum - 1) * pageSize;

  res.json({
    data: result.slice(start, start + pageSize),
    page: pageNum,
    limit: pageSize,
    total,
    totalPages,
  });
});
```

### Fix verification

| Fix | How verified |
|---|---|
| Backward compatibility (L4-1, L4-2) | All 27 pre-existing tests pass without modification |
| Negative page (L2-1) | New test `returns 400 for page < 1` passes |
| Sort whitelist (L3-1) | New test `returns 400 for invalid sort field` passes — `?sort=__proto__` returns 400 |
| Limit cap (L3-2) | New test `caps limit at MAX_PAGE_SIZE` passes — `?limit=999999` returns `limit: 100` |
| totalPages (L4-3) | New test asserts `res.body.totalPages` is present |
| Variable names (L1-1) | `p`→`pageNum`, `l`→`pageSize` — readable in code review |
| Type safety (L1-2) | Sort uses `field as keyof Bookmark` instead of `any` |

**Final test result:**
```
Tests: 33 passed, 33 total
  - 27 pre-existing: all passing
  - 6 new pagination/sort tests: all passing
```

---

## 5. Reflection

The most common category of issue was **production-readiness failures from missing defaults and constraints** — the AI generated code that worked for the happy path but made no decisions about limits, caps, or backward compatibility. The most confidently wrong issue at first glance was the breaking response shape change: the AI silently converted a list endpoint from returning an array to returning an object, which is a major version change that would require a migration in any real API. Next time reviewing AI-generated endpoint code, the first thing to check is whether the response contract changed — this is the issue most likely to cascade silently through the entire consumer surface before anyone notices.
