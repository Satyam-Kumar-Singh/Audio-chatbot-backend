import express from 'express';
import cors from 'cors';
import liveSessionRoutes from './routes/liveSession.route.js';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/live', liveSessionRoutes);

export default app;
