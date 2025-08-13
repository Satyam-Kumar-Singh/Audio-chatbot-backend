import express from 'express';
import { createLiveSession } from '../controllers/liveSession.controller.js';

const router = express.Router();

router.post('/session', createLiveSession);

export default router;
