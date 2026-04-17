import express from "express";
import { v4 as uuidv4 } from "uuid";
import { config } from "./config.js";
import { BookmarkSchema, Bookmark } from "./types.js";
import { saveBookmarks, loadBookmarks } from "./storage.js";

const app = express();
app.use(express.json());

let bookmarks: Bookmark[] = await loadBookmarks();

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/bookmarks", (req, res) => {
  const { tag } = req.query;
  if (tag) {
    const filtered = bookmarks.filter((b) =>
      b.tags?.some((t) => t.toLowerCase() === (tag as string).toLowerCase()),
    );
    return res.json(filtered);
  }
  res.json(bookmarks);
});

app.get("/bookmarks/:id", (req, res) => {
  const bookmark = bookmarks.find((b) => b.id === req.params.id);
  if (!bookmark) {
    return res.status(404).json({ error: "Bookmark not found" });
  }
  res.json(bookmark);
});

app.post("/bookmarks", async (req, res) => {
  const result = BookmarkSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ errors: result.error.errors });
  }

  const newBookmark: Bookmark = { ...result.data, id: uuidv4() };
  bookmarks.push(newBookmark);
  await saveBookmarks(bookmarks);
  res.status(201).json(newBookmark);
});

// PUT - Update an existing bookmark by ID
app.put("/bookmarks/:id", async (req, res) => {
  const { id } = req.params;
  const index = bookmarks.findIndex((b) => b.id === id);

  if (index === -1) {
    return res.status(404).json({ error: "Bookmark not found" });
  }

  // Validate the update data using the same schema
  const result = BookmarkSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ errors: result.error.errors });
  }

  // Keep the original ID, update the rest
  bookmarks[index] = { ...result.data, id };
  await saveBookmarks(bookmarks);

  res.json(bookmarks[index]);
});

// DELETE - Remove a bookmark by ID
app.delete("/bookmarks/:id", async (req, res) => {
  const { id } = req.params;
  const initialLength = bookmarks.length;

  // Filter out the bookmark with the given ID
  bookmarks = bookmarks.filter((b) => b.id !== id);

  if (bookmarks.length === initialLength) {
    return res.status(404).json({ error: "Bookmark not found" });
  }

  await saveBookmarks(bookmarks);
  res.status(204).send(); // 204 No Content is standard for successful deletion
});

// PUT - Update an existing bookmark by ID
app.put("/bookmarks/:id", async (req, res) => {
  const { id } = req.params;
  const index = bookmarks.findIndex((b) => b.id === id);

  if (index === -1) {
    return res.status(404).json({ error: "Bookmark not found" });
  }

  // Validate the update data
  const result = BookmarkSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ errors: result.error.errors });
  }

  // Update the bookmark while keeping the same ID
  bookmarks[index] = { ...result.data, id };
  await saveBookmarks(bookmarks);

  res.json(bookmarks[index]);
});

// DELETE - Remove a bookmark by ID
app.delete("/bookmarks/:id", async (req, res) => {
  const { id } = req.params;
  const initialLength = bookmarks.length;

  bookmarks = bookmarks.filter((b) => b.id !== id);

  if (bookmarks.length === initialLength) {
    return res.status(404).json({ error: "Bookmark not found" });
  }

  await saveBookmarks(bookmarks);
  res.status(204).send(); // Success, no content to return
});

if (process.env.NODE_ENV !== "test") {
  app.listen(config.PORT, () => {
    console.log(`🚀 Server ready at http://localhost:${config.PORT}`);
  });
}

export default app;
