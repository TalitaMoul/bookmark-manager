import express from "express";
import { v4 as uuidv4 } from "uuid";
import { config } from "./config.js";
import { CreateBookmarkSchema, Bookmark } from "./types.js";
import { persistBookmarks, loadBookmarks } from "./storage.js";

const app = express();
app.use(express.json());

let bookmarks: Bookmark[] = await loadBookmarks();

async function withPersist(
  res: express.Response,
  mutate: () => void,
  respond: () => void,
): Promise<void> {
  const snapshot = [...bookmarks];
  mutate();
  try {
    await persistBookmarks(bookmarks);
    respond();
  } catch {
    bookmarks = snapshot;
    res.status(500).json({ error: "Failed to persist bookmarks" });
  }
}

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

const SORTABLE_FIELDS = new Set<string>(["title", "url", "description"]);
const MAX_PAGE_SIZE = 100;

app.get("/bookmarks", (req, res) => {
  const { tag, q, page, limit, sort, order } = req.query;
  let result = bookmarks;

  if (tag) {
    result = result.filter((b) =>
      b.tags?.some((t) => t.toLowerCase() === (tag as string).toLowerCase()),
    );
  }

  if (q) {
    const term = (q as string).toLowerCase();
    result = result.filter(
      (b) =>
        b.title.toLowerCase().includes(term) ||
        b.url.toLowerCase().includes(term),
    );
  }

  if (sort) {
    const field = sort as string;
    if (!SORTABLE_FIELDS.has(field)) {
      return res
        .status(400)
        .json({ error: `Invalid sort field. Allowed: ${[...SORTABLE_FIELDS].join(", ")}` });
    }
    const dir = order === "desc" ? -1 : 1;
    result = [...result].sort((a, b) => {
      const av = ((a[field as keyof Bookmark] ?? "") as string).toLowerCase();
      const bv = ((b[field as keyof Bookmark] ?? "") as string).toLowerCase();
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }

  if (!page && !limit) {
    return res.json(result);
  }

  const pageNum = parseInt(page as string) || 1;
  const pageSize = Math.min(
    Math.max(parseInt(limit as string) || 10, 1),
    MAX_PAGE_SIZE,
  );

  if (pageNum < 1) {
    return res.status(400).json({ error: "page must be >= 1" });
  }

  const total = result.length;
  const totalPages = Math.ceil(total / pageSize);
  const start = (pageNum - 1) * pageSize;

  res.json({
    data: result.slice(start, start + pageSize),
    page: pageNum,
    limit: pageSize,
    total,
    totalPages,
  });
});

app.get("/bookmarks/:id", (req, res) => {
  const bookmark = bookmarks.find((b) => b.id === req.params.id);
  if (!bookmark) {
    return res.status(404).json({ error: "Bookmark not found" });
  }
  res.json(bookmark);
});

app.post("/bookmarks", async (req, res) => {
  const result = CreateBookmarkSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ errors: result.error.issues });
  }

  const newBookmark: Bookmark = { ...result.data, id: uuidv4() };
  await withPersist(
    res,
    () => bookmarks.push(newBookmark),
    () => res.status(201).json(newBookmark),
  );
});

app.put("/bookmarks/:id", async (req, res) => {
  const { id } = req.params;
  const index = bookmarks.findIndex((b) => b.id === id);

  if (index === -1) {
    return res.status(404).json({ error: "Bookmark not found" });
  }

  const result = CreateBookmarkSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ errors: result.error.issues });
  }

  const updated: Bookmark = { ...result.data, id };
  await withPersist(
    res,
    () => { bookmarks[index] = updated; },
    () => res.json(updated),
  );
});

app.delete("/bookmarks/:id", async (req, res) => {
  const { id } = req.params;
  const filtered = bookmarks.filter((b) => b.id !== id);

  if (filtered.length === bookmarks.length) {
    return res.status(404).json({ error: "Bookmark not found" });
  }

  await withPersist(
    res,
    () => { bookmarks = filtered; },
    () => res.status(204).send(),
  );
});

if (process.env.NODE_ENV !== "test") {
  app.listen(config.PORT, () => {
    console.log(`🚀 Server ready at http://localhost:${config.PORT}`);
  });
}

export default app;
