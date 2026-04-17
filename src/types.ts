import { z } from 'zod';

export const BookmarkSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1, "Title is required"),
  url: z.string().url("Must be a valid URL"),
  description: z.string().optional(),
});

export type Bookmark = z.infer<typeof BookmarkSchema>;