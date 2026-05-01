# Bookmark Manager

REST API for managing bookmarks, built with Express + TypeScript + Zod.

## Commands

```bash
npm run dev      # run with tsx (hot-reload, no build needed)
npm test         # Jest with --experimental-vm-modules (ESM)
npm run start    # run compiled dist/index.js
```

## Project Structure

```
src/
  index.ts     # Express app + all route handlers; exports default app
  storage.ts   # loadBookmarks / persistBookmarks (JSON file I/O)
  types.ts     # Zod schema (CreateBookmarkSchema) + Bookmark type
  config.ts    # Env vars parsed via Zod: PORT, BOOKMARKS_FILE
  app.test.ts  # Integration tests using supertest against the live app
bookmarks.json        # Production data file (do not commit changes)
bookmarks.test.json   # Fixture used by tests; controlled by BOOKMARKS_FILE env var
```

## Code Style

- Validate all request bodies with `CreateBookmarkSchema.safeParse()`; return `400` with `result.error.issues` on failure — never throw.
- Import Node built-ins as `node:fs/promises`, not `fs/promises`.
- All source imports must use the `.js` extension (e.g., `./storage.js`) — TypeScript resolves them at compile time but Node ESM requires them at runtime.

## Guardrails

- **Do not modify already executed database migrations.** Altering old migrations breaks the production database history and causes data loss.
- **Always validate inputs with Zod before processing.** Prevents injection attacks and ensures data integrity before it reaches the service layer.

## Gotcha

Tests set `BOOKMARKS_FILE=./bookmarks.test.json` via `jest.config.cjs` (line 1). If a test mutates data and the env var is wrong, it will corrupt `bookmarks.json`. Always confirm `process.env.BOOKMARKS_FILE` points to the test fixture before adding tests that write data.
