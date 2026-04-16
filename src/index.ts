import express from 'express';
import { config } from './config.js';

const app = express();
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(config.PORT, () => {
    console.log(`Server ready at http://localhost:${config.PORT}`);
  });
}

export default app;