import { initGeminiSession } from '../services/gemini.service.js';

export async function createLiveSession(req, res) {
  try {
    const sid = await initGeminiSession();
    res.json({ sessionId: sid });
  } catch (err) {
    console.error('Error creating Gemini session:', err);
    res.status(500).json({ error: 'Failed to create Gemini session' });
  }
}
