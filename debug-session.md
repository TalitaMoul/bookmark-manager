# Debug Session — saveUser failing tests

---

## Step 1: Symptom-First Bug Report

> The following is the initial prompt given to Claude, describing only symptoms and expected behavior — without revealing the cause or the lines changed.

**What is happening:**

My integration tests are failing. I try to save two users, but the system only keeps the last one.
The terminal output was:

```
FAIL  src/saveUser.test.ts (6.685 s)

  ● saveUser — edge case: whitespace-only name (boundary value) › name with only spaces returns success: false

    expect(received).toBe(expected) // Object.is equality

    Expected: false
    Received: true

      158 |     const result = await saveUser({ name: "   ", email: "valid@test.com" });
      159 |
    > 160 |     expect(result.success).toBe(false);
          |                            ^

  ● saveUser — edge case: whitespace-only name (boundary value) › name with only tabs and newlines returns success: false

    expect(received).toBe(expected) // Object.is equality

    Expected: false
    Received: true

      168 |     const result = await saveUser({ name: "\t\n", email: "valid@test.com" });
      169 |
    > 170 |     expect(result.success).toBe(false);
          |                            ^

  ● saveUser — edge case: concurrent writes (concurrency) › two simultaneous saves both persist to the file

    expect(received).toBe(expected) // Object.is equality

    Expected: 2
    Received: 1

      187 |     const stored: unknown[] = JSON.parse(raw);
      188 |
    > 189 |     expect(stored.length).toBe(2);
          |                           ^

  ● saveUser — edge case: concurrent writes (concurrency) › all ids returned are distinct AND present in the file

    expect(received).toContain(expected) // indexOf

    Expected value: "a57b4fcc-ca6f-465d-b16b-ea6e2d9ca8dd"
    Received array: ["833aec3e-d4ee-43ad-a487-e9c0009e51c4"]

      212 |     const storedIds = (JSON.parse(raw) as Array<{ id: string }>).map((u) => u.id);
      213 |     for (const id of returnedIds) {
    > 214 |       expect(storedIds).toContain(id);
          |                         ^

  ● saveUser — edge case: corrupted storage file (error condition) › does not silently overwrite a corrupted JSON file

    expect(received).toBe(expected) // Object.is equality

    Expected: true
    Received: false

      239 |     expect(threw || result?.success === false).toBe(true);
          |                                                ^

Tests: 5 failed, 54 passed, 59 total
```

**What I expected:**
- A name made of only whitespace should be rejected (`success: false`).
- Saving two users concurrently should persist both to the file.
- Passing a corrupted JSON file should not silently destroy its contents.

**When it started:** after recent changes to `src/saveUser.ts`.

---

## Step 2: Root Cause Explanation (before any fix)

> Claude was required to explain every root cause before touching any code.

Three independent bugs were identified by reading `src/saveUser.ts`:

**Root Cause 1 — Whitespace-only name accepted as valid**

The schema used `z.string().min(1)`. Zod's `.min(1)` measures the raw string length, so `"   "` (three spaces) has length 3 and passes validation. The contract says "name is required", which implies a non-blank value — but the validator never checked for blank.

**Root Cause 2 — Race condition on concurrent writes**

`saveUser` was not atomic. When two calls ran concurrently via `Promise.all`, both executed `loadUsers()` before either executed `persistUsers()`. Because there was no lock, both reads returned the same snapshot (an empty array). Each call then appended its user and wrote back a single-element array. The second write silently overwrote the first — only 1 user survived on disk.

**Root Cause 3 — Corrupted JSON file silently overwritten**

`loadUsers()` caught every error with `catch { return [] }`. When `JSON.parse` threw a `SyntaxError` on a corrupted file, the catch block returned an empty array instead of signalling the problem. The caller then overwrote the corrupted file with a fresh `[newUser]` array, destroying the existing content with no error returned.

---

## Step 3: Fixes Applied

**Fix 1 — `src/saveUser.ts` line 6**
```ts
// before
name: z.string().min(1),

// after
name: z.string().trim().min(1),
```
`.trim()` strips whitespace before the length check, so `"   "` becomes `""` and fails `.min(1)`.

**Fix 2 — `src/saveUser.ts` (module-level mutex)**
```ts
let writeLock = Promise.resolve();

export async function saveUser(input: unknown): Promise<SaveUserResult> {
  // ...validation...

  const acquire = writeLock;
  let release!: () => void;
  writeLock = new Promise<void>((r) => (release = r));

  await acquire;
  try {
    const users = await loadUsers();
    users.push(user);
    await persistUsers(users);
    return { success: true, user };
  } finally {
    release();
  }
}
```
The mutex serializes the read→push→write section. Each call waits for the previous one to finish before touching the file.

**Fix 3 — `src/saveUser.ts` `loadUsers` function**
```ts
async function loadUsers(): Promise<User[]> {
  try {
    const raw = await fs.readFile(getFilePath(), "utf-8");
    return JSON.parse(raw) as User[];
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw err;
  }
}
```
Only `ENOENT` (file does not exist yet) returns `[]`. Any other error — including a `SyntaxError` from corrupted JSON — is re-thrown, which causes `saveUser` to throw and prevents the file from being overwritten.

---

## Step 4: Verification

Command run after all fixes:

```
npm test -- --testPathPatterns="saveUser.test"
```

Output:

```
Tests: 25 passed, 25 total
Time:  1.91 s
```

All 25 tests pass. No regressions.

---

## Summary

| # | Bug | Root cause | Fix |
|---|-----|------------|-----|
| 1 | Whitespace-only name accepted | `min(1)` counts raw length, not trimmed length | `.trim().min(1)` |
| 2 | Race condition on concurrent writes | Read + write section was not atomic | Module-level Promise mutex |
| 3 | Corrupted JSON silently overwritten | Bare `catch { return [] }` swallowed parse errors | Re-throw all errors except `ENOENT` |
