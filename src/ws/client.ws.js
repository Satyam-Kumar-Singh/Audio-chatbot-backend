import { WebSocketServer } from 'ws';
import { getGeminiSession } from '../services/gemini.service.js';

export function initClientWSS(server) {
  const wss = new WebSocketServer({ server, path: '/ws/client' });

  wss.on('connection', (ws, req) => {
    const sid = new URLSearchParams(req.url.split('?')[1]).get('sid');
    const geminiSession = getGeminiSession(sid);

    if (!geminiSession) {
      ws.send(JSON.stringify({ error: 'Invalid session ID' }));
      return ws.close();
    }

    // Client → Gemini
    ws.on('message', (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.type === 'audio-chunk') {
        geminiSession.ws.send(JSON.stringify({
          realtimeInput: { audio: msg.audio } // base64 PCM chunk
        }));
      }
      if (msg.type === 'end-audio') {
        // optionally tell Gemini no more audio if needed
        geminiSession.ws.send(JSON.stringify({
          realtimeInput: { audioStreamEnd: true }
        }));
      }
    });

    // Gemini → Client
    geminiSession.ws.on('message', (data) => {
      try {
        const gmsg = JSON.parse(data.toString());

        // Forward audio chunks
        if (gmsg.serverContent?.modelTurn?.parts) {
          gmsg.serverContent.modelTurn.parts.forEach(part => {
            if (part.inlineData?.mimeType?.startsWith('audio/')) {
              ws.send(JSON.stringify({
                type: 'audio-out',
                mimeType: part.inlineData.mimeType,
                audio: part.inlineData.data
              }));
            }
          });
        }

        // Forward transcriptions
        if (gmsg.outputTranscription?.text) {
          ws.send(JSON.stringify({
            type: 'transcription',
            text: gmsg.outputTranscription.text
          }));
        }

      } catch (err) {
        console.error('Error parsing Gemini message:', err);
      }
    });
  });
}
