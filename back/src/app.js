import express from 'express';
import cors from 'cors';
import categoriesRouter from './routes/categories.js';
import imagesRouter from './routes/images.js';

const app = express();

app.use(cors({ origin: [process.env.CORS_ORIGIN || 'http://localhost:3000'] }));
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/categories', categoriesRouter);
app.use('/api/images', imagesRouter);

// Express identifies error handlers by their 4 parameters, so `next` must stay.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

export default app;
