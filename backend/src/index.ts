import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import healthRouter from './routes/health';
import formRouter from './routes/form';

const app = express();
const PORT = parseInt(process.env.API_PORT || '8080', 10);

app.use(cors());
app.use(express.json());

app.use('/', healthRouter);
app.use('/', formRouter);

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});

export default app;
