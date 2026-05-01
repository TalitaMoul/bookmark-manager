import { promises as fs } from "node:fs";
import { saveUser } from "./saveUser.js";

const TEST_FILE = "./users.service.test.json";

beforeEach(async () => {
  try {
    await fs.unlink(TEST_FILE);
  } catch {
    // file may not exist yet
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

describe("userService — saving two users", () => {
  test("file contains exactly 2 users after two sequential saves", async () => {
    await saveUser({ name: "Alice", email: "alice@example.com" });
    await saveUser({ name: "Bob", email: "bob@example.com" });

    const raw = await fs.readFile(TEST_FILE, "utf-8");
    const stored: unknown[] = JSON.parse(raw);

    expect(stored.length).toBe(2);
  });
});
