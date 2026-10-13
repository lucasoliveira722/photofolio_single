import express from 'express';
import cors from 'cors';
import categoriesRouter from './routes/categories.js';
import imagesRouter from './routes/images.js';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/categories', categoriesRouter);
app.use('/api/images', imagesRouter);

export default app;
