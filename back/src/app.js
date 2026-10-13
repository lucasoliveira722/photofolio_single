import express from 'express';
import cors from 'cors';
import categoriesRouter from './routes/categories.js';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/categories', categoriesRouter);

export default app;
