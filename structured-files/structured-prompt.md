# Structured Prompt — Bookmark Manager Exercise

---

## Part 1: The Four-Part Prompt

### Context

This is a REST API bookmark manager built with Express.js and TypeScript. It uses Zod for input validation (`@src/types.ts`) and persists data to a JSON file via a storage module (`@src/storage.ts`). The main route file (`@src/index.ts`) already handles POST /bookmarks by validating the request body with `CreateBookmarkSchema.safeParse()` and returning structured error objects on failure.

### Task

Add duplicate URL detection to the `POST /bookmarks` endpoint. Before inserting a new bookmark, check whether a bookmark with the same URL already exists in the in-memory `bookmarks` array. If a duplicate is found, respond with HTTP 409 and a JSON body of `{ "error": "A bookmark with this URL already exists" }`. If no duplicate exists, proceed with the current insertion logic unchanged.

### Constraints

- Follow the existing validation pattern in `@src/index.ts`: check the condition, return early with `res.status(...).json(...)`, and only continue if valid.
- Do not modify `@src/types.ts` or `@src/storage.ts` — the change is isolated to the POST handler in `index.ts`.
- Use a case-insensitive URL comparison (normalize both URLs to lowercase before comparing).
- Do not add any new dependencies.

### Verification

The implementation is correct when:
1. `POST /bookmarks` with a URL that already exists returns `HTTP 409` and `{ "error": "A bookmark with this URL already exists" }`.
2. `POST /bookmarks` with a new URL still returns `HTTP 201` and the created bookmark object.
3. The comparison is case-insensitive: posting `https://EXAMPLE.COM` is rejected if `https://example.com` already exists.
4. Running `npm test` passes all existing tests without modification.

---

## Part 2: Summary of Claude's Response

Claude added a single `if` block inside the POST handler, immediately after the Zod validation check and before the bookmark is created. It used `bookmarks.some(b => b.url.toLowerCase() === result.data.url.toLowerCase())` to detect duplicates, then returned `res.status(409).json({ error: "A bookmark with this URL already exists" })`. The insertion logic below remained untouched. The change was confined to four lines inside `index.ts`, exactly as constrained.

---

## Part 3: Iteration Follow-Up Prompt

**Strategy used: Break Down**

The initial response correctly implemented the duplicate check for POST. Now I want to apply the same logic to PUT so that updating a bookmark's URL cannot create a duplicate either:

> The duplicate URL check you added works correctly for POST. Now apply the same logic to `PUT /bookmarks/:id` in `@src/index.ts`. The rule is: after validating the request body with Zod, check whether any *other* bookmark (i.e., one whose `id` is different from `req.params.id`) already has the same URL as `result.data.url` (case-insensitive). If so, return `HTTP 409` with `{ "error": "A bookmark with this URL already exists" }`. If not, proceed with the existing update logic. Do not touch POST, GET, DELETE, or any other file.

This follow-up is specific about: which endpoint to change, what "other bookmark" means (exclude the one being updated), the exact status code and error body, and what must not be touched.
