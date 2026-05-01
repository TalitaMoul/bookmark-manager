# Anti-Patterns in Weak Prompts

---

## Prompt 1: "fix the code"

**Anti-pattern:** Too Vague

**Problem:** The prompt gives Claude no context about which code, what is broken, what the expected behavior is, or how to verify a fix — Claude cannot make a useful decision without any of this information.

**Rewritten prompt:**

> Context: This is a TypeScript Express API in `@src/index.ts`. The `GET /bookmarks` endpoint accepts a `?sort=` query param but does not validate it against the allowed fields before sorting.
>
> Task: Add a guard that checks whether the value of `sort` is one of the allowed fields (`title`, `url`, `description`). If it is not, return `HTTP 400` with `{ "error": "Invalid sort field. Allowed: title, url, description" }`.
>
> Constraints: Follow the same early-return pattern already used in the file for other validations. Do not modify any other endpoint or file.
>
> Verification: `GET /bookmarks?sort=password` returns 400. `GET /bookmarks?sort=title` returns 200 with sorted results.

---

## Prompt 2: "Rewrite the entire authentication system to use OAuth2 with Google, Apple, and GitHub providers, add rate limiting, implement refresh token rotation, add audit logging, and make sure all existing tests still pass"

**Anti-pattern:** Kitchen Sink (Overloaded Prompt)

**Problem:** The prompt bundles five unrelated, large-scope tasks into one request, making it impossible for Claude to maintain focus, follow a single clear constraint set, or produce a reviewable, testable result.

**Rewritten prompt (first step only):**

> Context: This Express API currently has no authentication. We are adding OAuth2 login in stages, starting with Google only. The app entry point is `@src/index.ts`.
>
> Task: Add a `GET /auth/google` route that redirects the user to Google's OAuth2 authorization URL, and a `GET /auth/google/callback` route that exchanges the authorization code for an access token using the `google-auth-library` package (already installed).
>
> Constraints: Store the OAuth client ID and secret in environment variables `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`, read via `@src/config.ts`. Do not add rate limiting, refresh token rotation, or audit logging in this step.
>
> Verification: Visiting `GET /auth/google` redirects to a Google login page. After login, `GET /auth/google/callback?code=...` exchanges the code without a 500 error. Existing tests in `@src/app.test.ts` still pass.

---

## Prompt 3: "I was looking at the code and I think maybe there might be some issues with how we handle errors in some places, could you take a look and perhaps suggest improvements if you think that would be helpful?"

**Anti-pattern:** Hedge-Filled / Indirect

**Problem:** The excessive hedging ("maybe", "perhaps", "if you think") signals no clear requirement, leaving Claude to guess both what the problem is and whether action is even expected — the result will be a generic, non-committal answer.

**Rewritten prompt:**

> Context: The storage module `@src/storage.ts` has a `loadBookmarks` function that catches all errors and silently returns an empty array, including errors caused by a malformed JSON file.
>
> Task: Update `loadBookmarks` so that it only silently returns `[]` when the file does not exist (i.e., `error.code === 'ENOENT'`). For any other error (such as a JSON parse failure), re-throw the error so the caller is aware that something unexpected happened.
>
> Constraints: Keep the function signature and return type unchanged. Do not modify any other file.
>
> Verification: If `bookmarks.json` is absent, the server starts normally with zero bookmarks. If `bookmarks.json` contains invalid JSON, the server throws an unhandled error on startup instead of silently starting with no data.
