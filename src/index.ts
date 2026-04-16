import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { config } from './config.js';
import { BookmarkSchema, Bookmark } from './types.js';

const app = express();
app.use(express.json());

const bookmarks: Bookmark[] = [];

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Endpoint de Criação
app.post('/bookmarks', (req, res) => {
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

if (process.env.NODE_ENV !== 'test') {
  app.listen(config.PORT, () => {
    console.log(`🚀 Server ready at http://localhost:${config.PORT}`);
  });
}

export default app;