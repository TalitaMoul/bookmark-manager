# Guardrails Configuration

## .claude/settings.json — Permission Rules

```json
{
  "permissions": {
    "allow": [
      "Bash(npm test)",
      "Bash(npm test *)"
    ],
    "deny": [
      "Bash(rm * .git*)",
      "Bash(rm .git*)",
      "Bash(rmdir * .git*)",
      "Bash(del * .git*)",
      "Bash(git update-index *)",
      "Edit(package-lock.json)",
      "Write(package-lock.json)"
    ]
  }
}
```

### Rule Reasoning

**Allow: `Bash(npm test)` and `Bash(npm test *)`**

Running the test suite is the most frequent safe action in this project. Requiring a confirmation prompt every time Claude runs tests slows down the review-fix-verify loop without adding any safety benefit — tests are read-only with respect to production data (the test fixture is isolated via `BOOKMARKS_FILE=./bookmarks.test.json`). The wildcard variant covers common flags like `--watch` or `--testPathPattern`.

**Deny: `Bash(rm * .git*)`, `Bash(rm .git*)`, `Bash(rmdir * .git*)`, `Bash(del * .git*)`**

The `.git` directory contains the entire version history of the project. Deleting files inside it — even accidentally, e.g., trying to clean up a lock file — can corrupt or destroy the repository in ways that are difficult or impossible to reverse without a remote backup. No legitimate development task requires directly deleting `.git` contents; git itself manages that directory.

**Deny: `Bash(git update-index *)`**

`git update-index` is a low-level plumbing command that directly modifies the git index (staging area) and can be used to mark files as unchanged (`--assume-unchanged`, `--skip-worktree`), hiding real modifications from future commits. This is a footgun that can silently cause production code to diverge from what is committed.

**Deny: `Edit(package-lock.json)`, `Write(package-lock.json)`**

`package-lock.json` is generated deterministically by `npm install` and encodes the exact resolved dependency tree. Hand-editing it corrupts the lockfile integrity (`npm ci` will fail) and can introduce inconsistencies between what the lockfile declares and what is actually installed. Any dependency change must go through `npm install`/`npm update` so the lockfile is regenerated correctly.

---

## CLAUDE.md — Guardrails Section

```markdown
## Guardrails

- **Do not modify already executed database migrations.** Altering old migrations
  breaks the production database history and causes data loss.

- **Always validate inputs with Zod before processing.** Prevents injection attacks
  and ensures data integrity before it reaches the service layer.
```

### Rule Reasoning

**Do not modify already executed database migrations**

Migration files represent a linear history of schema changes applied to the production database. Once a migration has been run, the database is in the state it describes. Editing that file does not change the database — it only makes the code lie about what happened. The next time the migration runner checks state it may skip the change (treating it as already applied), apply a broken version, or cause a checksum mismatch error. In all cases, the production database history is corrupted and recovery requires manual intervention.

**Always validate inputs with Zod before processing**

This project uses Zod throughout (request bodies in `index.ts`, environment variables in `config.ts`). Skipping validation and passing raw user input directly to service functions or storage opens the door to unexpected types crashing the service, malformed data being persisted to `bookmarks.json` or `users.json`, and data that bypasses business rules (e.g., empty titles, malformed URLs). Validation at the boundary — before any processing — means every downstream function can trust the shape and content of its inputs.
