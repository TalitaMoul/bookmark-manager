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

// GET - List all bookmarks
app.get("/bookmarks", (req, res) => {
  res.json(bookmarks);
});

// GET - Find a specific bookmark by ID
app.get("/bookmarks/:id", (req, res) => {
  const bookmark = bookmarks.find((b) => b.id === req.params.id);
  if (!bookmark) {
    return res.status(404).json({ error: "Bookmark not found" });
  }
  res.json(bookmark);
});

// POST - Create a bookmark (Now with persistence)
app.post("/bookmarks", async (req, res) => {
  const result = BookmarkSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({ errors: result.error.errors });
  }

  const newBookmark: Bookmark = {
    ...result.data,
    id: uuidv4(),
  };

  bookmarks.push(newBookmark);
  await saveBookmarks(bookmarks);

  res.status(201).json(newBookmark);
});

if (process.env.NODE_ENV !== "test") {
  app.listen(config.PORT, () => {
    console.log(`🚀 Server ready at http://localhost:${config.PORT}`);
  });
}

export default app;
