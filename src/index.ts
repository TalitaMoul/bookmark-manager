import express from "express";
import { v4 as uuidv4 } from "uuid"; // 
import { config } from "./config.js";
import { BookmarkSchema, Bookmark } from "./types.js"; // New

const app = express();
app.use(express.json());


const bookmarks: Bookmark[] = [];

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post("/bookmarks", (req, res) => {
  const result = BookmarkSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({ errors: result.error.issues });
  }

  const newBookmark: Bookmark = {
    ...result.data,
    id: uuidv4(),
  };

  bookmarks.push(newBookmark);
  res.status(201).json(newBookmark);
});

app.get('/bookmarks/:id', (req, res) => {
  const bookmark = bookmarks.find((b) => b.id === req.params.id);
  if (!bookmark) {
    return res.status(404).json({ error: 'Bookmark not found' });
  }
  res.json(bookmark);
});

if (process.env.NODE_ENV !== "test") {
  app.listen(config.PORT, () => {
    console.log(`🚀 Server ready at http://localhost:${config.PORT}`);
  });
}

export default app;
