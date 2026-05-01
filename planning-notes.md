# Planning Notes — Bookmark Manager API

## Task List (ordered by dependency)

1. **Scaffold** — create project structure, install dependencies, configure TypeScript and Express entry point
2. **Data model** — define Bookmark type and Zod validation schema
3. **Storage layer** — implement JSON file persistence (loadBookmarks / saveBookmarks)
4. **POST /bookmarks** — create endpoint with input validation and error handling
5. **GET /bookmarks and GET /bookmarks/:id** — list and retrieve endpoints with tag filtering
6. **PUT /bookmarks/:id and DELETE /bookmarks/:id** — update and delete endpoints
7. **Health check + production touches** — GET /health, environment-based config (.env / config.ts), .env.example
8. **Quality review** — fix type safety, test isolation, remove dead code, ensure all endpoints have error-case tests

## Definition of Done per Chunk

| Chunk | Done when |
|---|---|
| Scaffold | `npm install` succeeds, `npx tsc --noEmit` passes, server starts without crashing |
| Data model | Type can be imported and a bookmark object can be created and validated without errors |
| Storage layer | `loadBookmarks()` returns an empty array on first run; `saveBookmarks()` writes to file and data persists across calls |
| POST /bookmarks | `curl` with valid data returns 201 + JSON with `id`; invalid URL returns 400 |
| GET endpoints | List returns array; get by ID returns correct bookmark; unknown ID returns 404; tag filter returns only matching bookmarks |
| PUT + DELETE | Update changes only the targeted bookmark and returns it; delete removes it and returns 204; both return 404 for unknown IDs |
| Production touches | `/health` returns `{ status: "ok" }`; server starts on custom PORT env var; `.env.example` documents all variables |
| Quality review | All 11 tests pass; no duplicate routes; `Bookmark` type has required `id`; tests use isolated file, not production data |

## Three Production Standards

1. **Input validation on every endpoint** — use Zod to reject malformed URLs, empty titles, and invalid bodies with a 400 and a descriptive error message before any data is written.

2. **Proper HTTP status codes and error handling** — 201 for creation, 204 for deletion, 404 when a resource is not found, 400 for bad input. No endpoint crashes the server on bad data.

3. **Tests covering both happy path and error cases for every endpoint** — each route must have at least one test that verifies the expected success response and one that verifies the error response (wrong ID, missing field, invalid URL).
