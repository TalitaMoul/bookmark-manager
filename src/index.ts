import express from "express";
import { v4 as uuidv4 } from "uuid";
import { config } from "./config.js";
import { BookmarkSchema, Bookmark } from "./types.js";
import { saveBookmarks, loadBookmarks } from "./storage.js";

const app = express();
app.use(express.json());

// Carregar dados ao iniciar
let bookmarks: Bookmark[] = await loadBookmarks();

app.get("/health", (req, res) => res.json({ status: "ok" }));

// POST - Criar (Atualizado com save)
app.post("/bookmarks", async (req, res) => {
  const result = BookmarkSchema.safeParse(req.body);
  if (!result.success)
    return res.status(400).json({ errors: result.error.errors });

  const newBookmark = { ...result.data, id: uuidv4() };
  bookmarks.push(newBookmark);
  await saveBookmarks(bookmarks); // Salva no arquivo
  res.status(201).json(newBookmark);
});

// GET - Listar todos
app.get("/bookmarks", (req, res) => {
  res.json(bookmarks);
});

// GET - Buscar por ID
app.get("/bookmarks/:id", (req, res) => {
  const bookmark = bookmarks.find((b) => b.id === req.params.id);
  if (!bookmark) {
    return res.status(404).json({ error: "Bookmark não encontrado" });
  }
  res.json(bookmark);
});

if (process.env.NODE_ENV !== "test") {
  app.listen(config.PORT, () => console.log(`🚀 Porta: ${config.PORT}`));
}

export default app;
