import { z } from 'zod';

export const BookmarkSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1, "Title is required"),
  url: z.string().url("Must be a valid URL"),
  description: z.string().optional(),
  // Added tags array with a default empty list
  tags: z.array(z.string()).default([]), 
});

export type Bookmark = z.infer<typeof BookmarkSchema>;