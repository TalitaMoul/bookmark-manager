import { z } from "zod";
import fs from "node:fs/promises";
import { randomUUID } from "node:crypto";

export const CreateUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Must be a valid email"),
});

export type User = z.infer<typeof CreateUserSchema> & { id: string };

function getFilePath(): string {
  return process.env.USERS_FILE ?? "./users.json";
}

async function loadUsers(): Promise<User[]> {
  try {
    const data = await fs.readFile(getFilePath(), "utf-8");
    return JSON.parse(data) as User[];
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw err;
  }
}

async function persistUsers(users: User[]): Promise<void> {
  await fs.writeFile(getFilePath(), JSON.stringify(users, null, 2));
}

type SaveUserResult =
  | { success: true; user: User }
  | { success: false; errors: z.ZodIssue[] };

let writeLock = Promise.resolve();

export async function saveUser(input: unknown): Promise<SaveUserResult> {
  const result = CreateUserSchema.safeParse(input);
  if (!result.success) {
    return { success: false, errors: result.error.issues };
  }

  const user: User = { ...result.data, id: randomUUID() };

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
