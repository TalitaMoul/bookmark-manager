import { z } from "zod";

export const BookmarkSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1, "O título é obrigatório"),
  url: z.string().url("A URL deve ser válida"),
  description: z.string().optional(),
});

export type Bookmark = z.infer<typeof BookmarkSchema>;
