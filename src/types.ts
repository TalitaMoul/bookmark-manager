import { z } from 'zod';

export const CreateBookmarkSchema = z.object({
  title: z.string().min(1, "Title is required"),
  url: z.string().url("Must be a valid URL"),
  description: z.string().optional(),
  tags: z.array(z.string()).default([]),
});

export type Bookmark = z.infer<typeof CreateBookmarkSchema> & { id: string };