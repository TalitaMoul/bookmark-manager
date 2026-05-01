import { z } from "zod";
import fs from "node:fs/promises";

export const CreateUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Must be a valid email"),
});

export type User = z.infer<typeof CreateUserSchema> & { id: string };

const USERS_FILE = process.env.USERS_FILE ?? "./users.json";

async function loadUsers(): Promise<User[]> {
  try {
    const data = await fs.readFile(USERS_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function persistUsers(users: User[]): Promise<void> {
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
}

type SaveUserResult =
  | { success: true; user: User }
  | { success: false; errors: z.ZodIssue[] };

export async function saveUser(input: unknown): Promise<SaveUserResult> {
  const result = CreateUserSchema.safeParse(input);
  if (!result.success) {
    return { success: false, errors: result.error.issues };
  }

  const { randomUUID } = await import("node:crypto");
  const user: User = { ...result.data, id: randomUUID() };

  const users = await loadUsers();
  users.push(user);
  await persistUsers(users);

  return { success: true, user };
}
