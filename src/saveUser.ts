import { promises as fs } from "node:fs";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

const UserSchema = z.object({
  name: z.string().trim().min(1),
  email: z.email(),
});

type User = { id: string; name: string; email: string };

type SaveUserResult =
  | { success: true; user: User }
  | { success: false; errors: unknown[] };

function getFilePath(): string {
  return process.env.USERS_FILE ?? "./users.json";
}

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

async function persistUsers(users: User[]): Promise<void> {
  await fs.writeFile(getFilePath(), JSON.stringify(users, null, 2), "utf-8");
}

let writeLock = Promise.resolve();

export async function saveUser(input: unknown): Promise<SaveUserResult> {
  const result = UserSchema.safeParse(input);

  if (!result.success) {
    return { success: false, errors: result.error.issues };
  }

  const user: User = { id: uuidv4(), ...result.data };

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
