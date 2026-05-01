import { promises as fs } from "node:fs";
import path from "node:path";
import { saveUser } from "./saveUser.js";

const TEST_FILE = "./users.test.json";

// Ensure each test group starts with a clean slate
beforeEach(async () => {
  try {
    await fs.unlink(TEST_FILE);
  } catch {
    // file may not exist; that's fine
  }
  process.env.USERS_FILE = TEST_FILE;
});

afterAll(async () => {
  try {
    await fs.unlink(TEST_FILE);
  } catch {
    // ignore
  }
});

// ─── Return shape ──────────────────────────────────────────────────────────────

describe("saveUser — return shape on valid input", () => {
  test("returns success: true and a user object", async () => {
    const result = await saveUser({ name: "Talita", email: "liatest@ghost.com" });

    expect(result.success).toBe(true);
    expect(result).toHaveProperty("user");
  });

  test("returned user contains the original name and email", async () => {
    const result = await saveUser({ name: "Talita", email: "liatest@ghost.com" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.user.name).toBe("Talita");
      expect(result.user.email).toBe("liatest@ghost.com");
    }
  });

  test("returned user has a valid UUID v4 id", async () => {
    const uuidV4Regex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    const result = await saveUser({ name: "Talita", email: "liatest@ghost.com" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.user.id).toMatch(uuidV4Regex);
    }
  });

  test("each save produces a unique id", async () => {
    const first = await saveUser({ name: "Talita", email: "liatest@ghost.com" });
    const second = await saveUser({ name: "Marcello", email: "marcello@test.com" });

    expect(first.success).toBe(true);
    expect(second.success).toBe(true);
    if (first.success && second.success) {
      expect(first.user.id).not.toBe(second.user.id);
    }
  });
});

// ─── Validation errors ─────────────────────────────────────────────────────────

describe("saveUser — validation: empty or missing name", () => {
  test("empty name returns success: false with errors", async () => {
    const result = await saveUser({ name: "", email: "invalid-email" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(Array.isArray(result.errors)).toBe(true);
      expect(result.errors.length).toBeGreaterThan(0);
    }
  });

  test("missing name field returns success: false with errors", async () => {
    const result = await saveUser({ email: "marcello@test.com" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(Array.isArray(result.errors)).toBe(true);
      expect(result.errors.length).toBeGreaterThan(0);
    }
  });
});

describe("saveUser — validation: invalid email", () => {
  test("invalid email format returns success: false with errors", async () => {
    const result = await saveUser({ name: "Talita", email: "invalid-email" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(Array.isArray(result.errors)).toBe(true);
      expect(result.errors.length).toBeGreaterThan(0);
    }
  });

  test("missing email field returns success: false with errors", async () => {
    const result = await saveUser({ name: "Talita" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(Array.isArray(result.errors)).toBe(true);
      expect(result.errors.length).toBeGreaterThan(0);
    }
  });
});

describe("saveUser — validation: both fields invalid", () => {
  test("empty name + invalid email returns one error per field", async () => {
    // Hand-calculated expected value from the spec:
    // Input:  { name: "", email: "invalid-email" }
    // Output: { success: false, errors: [...] } with errors for both
    const result = await saveUser({ name: "", email: "invalid-email" });

    expect(result.success).toBe(false);
    if (!result.success) {
      // Verify each field produced at least one error — not just a total count.
      // This prevents a scenario where 2 email errors mask a missing name error.
      const errorPaths = (result.errors as Array<{ path: unknown[] }>)
        .map((issue) => issue.path[0]);
      expect(errorPaths).toContain("name");
      expect(errorPaths).toContain("email");
    }
  });
});

describe("saveUser — validation: non-object inputs", () => {
  test("null input returns success: false", async () => {
    const result = await saveUser(null);
    expect(result.success).toBe(false);
  });

  test("string input returns success: false", async () => {
    const result = await saveUser("not-an-object");
    expect(result.success).toBe(false);
  });

  test("empty object returns success: false", async () => {
    const result = await saveUser({});
    expect(result.success).toBe(false);
  });
});

// ─── Edge cases: boundary values ──────────────────────────────────────────────

describe("saveUser — edge case: whitespace-only name (boundary value)", () => {
  // "   " has length 3, so z.string().min(1) accepts it — but semantically
  // it is an empty name. The spec says "name is mandatory", which implies
  // a non-blank value is required.
  test("name with only spaces returns success: false", async () => {
    const result = await saveUser({ name: "   ", email: "valid@test.com" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(Array.isArray(result.errors)).toBe(true);
      expect(result.errors.length).toBeGreaterThan(0);
    }
  });

  test("name with only tabs and newlines returns success: false", async () => {
    const result = await saveUser({ name: "\t\n", email: "valid@test.com" });

    expect(result.success).toBe(false);
  });
});

// ─── Edge cases: concurrency ───────────────────────────────────────────────────

describe("saveUser — edge case: concurrent writes (concurrency)", () => {
  // Both calls read the file at the same time (both see []), generate users,
  // then each writes its own single-element array back. Without a write lock
  // the second write silently overwrites the first → only 1 user is persisted.
  test("two simultaneous saves both persist to the file", async () => {
    await Promise.all([
      saveUser({ name: "Alice", email: "alice@concurrent.com" }),
      saveUser({ name: "Bob",   email: "bob@concurrent.com"   }),
    ]);

    const raw = await fs.readFile(TEST_FILE, "utf-8");
    const stored: unknown[] = JSON.parse(raw);

    expect(stored.length).toBe(2);
  });

  test("all ids returned are distinct AND present in the file", async () => {
    // Removing the .filter(r => r.success) — filtering out failed saves would
    // silently hide a race condition where some calls return success:true but
    // the data never actually reaches the file.
    const results = await Promise.all([
      saveUser({ name: "Alice", email: "alice@concurrent.com" }),
      saveUser({ name: "Bob",   email: "bob@concurrent.com"   }),
      saveUser({ name: "Carol", email: "carol@concurrent.com" }),
    ]);

    expect(results.every((r) => r.success)).toBe(true);

    const returnedIds = results.map(
      (r) => (r as { success: true; user: { id: string } }).user.id,
    );
    expect(new Set(returnedIds).size).toBe(3);

    // The critical assertion: every ID the function claimed to save must actually
    // be on disk. A race condition would make some IDs disappear here.
    const raw = await fs.readFile(TEST_FILE, "utf-8");
    const storedIds = (JSON.parse(raw) as Array<{ id: string }>).map((u) => u.id);
    for (const id of returnedIds) {
      expect(storedIds).toContain(id);
    }
  });
});

// ─── Edge cases: error conditions ─────────────────────────────────────────────

describe("saveUser — edge case: corrupted storage file (error condition)", () => {
  // If the file exists but contains invalid JSON the function must not
  // silently discard existing data or throw an unhandled exception.
  // Acceptable behaviors: return success:false OR throw a typed error.
  // Unacceptable: overwrite the file with a fresh list (silent data loss).
  test("does not silently overwrite a corrupted JSON file", async () => {
    await fs.writeFile(TEST_FILE, "THIS IS NOT JSON", "utf-8");

    // The call itself should either fail gracefully or throw — it must NOT
    // return success:true while destroying the previous file contents.
    let result: Awaited<ReturnType<typeof saveUser>> | null = null;
    let threw = false;
    try {
      result = await saveUser({ name: "Talita", email: "liatest@ghost.com" });
    } catch {
      threw = true;
    }

    // Acceptable outcomes: threw an error OR returned success:false.
    // Unacceptable: returned success:true (means corrupted data was silently overwritten).
    expect(threw || result?.success === false).toBe(true);
  });
});

// ─── Edge cases: type coercion ─────────────────────────────────────────────────

describe("saveUser — edge case: wrong field types (type coercion)", () => {
  test("name as number returns success: false", async () => {
    const result = await saveUser({ name: 123, email: "valid@test.com" });
    expect(result.success).toBe(false);
  });

  test("name as boolean returns success: false", async () => {
    const result = await saveUser({ name: true, email: "valid@test.com" });
    expect(result.success).toBe(false);
  });

  test("email as number returns success: false", async () => {
    const result = await saveUser({ name: "Talita", email: 42 });
    expect(result.success).toBe(false);
  });

  test("undefined input returns success: false", async () => {
    const result = await saveUser(undefined);
    expect(result.success).toBe(false);
  });
});

// ─── Persistence ───────────────────────────────────────────────────────────────

describe("saveUser — persistence", () => {
  test("creates the JSON file when it does not exist", async () => {
    await saveUser({ name: "Talita", email: "liatest@ghost.com" });

    const stat = await fs.stat(TEST_FILE);
    expect(stat.isFile()).toBe(true);
  });

  test("saved user appears inside the JSON file", async () => {
    const result = await saveUser({ name: "Talita", email: "liatest@ghost.com" });
    expect(result.success).toBe(true);

    const raw = await fs.readFile(TEST_FILE, "utf-8");
    const stored: unknown[] = JSON.parse(raw);

    expect(Array.isArray(stored)).toBe(true);
    expect(stored.length).toBe(1);

    if (result.success) {
      const saved = stored[0] as Record<string, unknown>;
      expect(saved.id).toBe(result.user.id);
      expect(saved.name).toBe("Talita");
      expect(saved.email).toBe("liatest@ghost.com");
    }
  });

  test("multiple saves accumulate all users in the file", async () => {
    await saveUser({ name: "Talita", email: "liatest@ghost.com" });
    await saveUser({ name: "Marcello", email: "marcello@test.com" });

    const raw = await fs.readFile(TEST_FILE, "utf-8");
    const stored: unknown[] = JSON.parse(raw);

    expect(stored.length).toBe(2);
  });

  test("failed save does not add an entry to the file", async () => {
    await saveUser({ name: "Talita", email: "liatest@ghost.com" }); // valid
    await saveUser({ name: "", email: "invalid" });                 // invalid

    const raw = await fs.readFile(TEST_FILE, "utf-8");
    const stored: unknown[] = JSON.parse(raw);

    expect(stored.length).toBe(1);
  });
});
