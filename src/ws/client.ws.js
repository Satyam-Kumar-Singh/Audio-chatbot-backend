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

    console.log(`[WS] Client connected with SID: ${sid}`);

    // Client → Gemini
    ws.on('message', (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw.toString());
        // console.log('[WS] Message received from client:', msg);
      } catch (err) {
        console.error('[WS] Invalid JSON message:', raw.toString());
        return;
      }

      if (msg.type === 'audio-chunk') {
        // ✅ Send in Gemini-compatible format
        geminiSession.ws.send(JSON.stringify({
          realtimeInput: {
            audio: msg.audio
          }
        }));
        console.log('[WS] Audio chunk sent to Gemini, length:', msg.audio.length);
      }

      if (msg.type === 'end-audio') {
        geminiSession.ws.send(JSON.stringify({
          realtimeInput: { audioStreamEnd: true }
        }));
        console.log('[WS] End of audio sent to Gemini');
      }
    });

    // Gemini → Client
    geminiSession.ws.on('message', (data) => {
      try {
        const gmsg = JSON.parse(data.toString());
        console.log('[WS] Message received from Gemini');

        // Forward audio chunks
        if (gmsg.serverContent?.modelTurn?.parts) {
          gmsg.serverContent.modelTurn.parts.forEach(part => {
            if (part.inlineData?.mimeType?.startsWith('audio/')) {
              ws.send(JSON.stringify({
                type: 'audio-out',
                mimeType: part.inlineData.mimeType,
                audio: part.inlineData.data
              }));
              console.log('[WS] Audio chunk sent to client:', part.inlineData.mimeType);
            }
          });
        }

        // Forward transcriptions
        if (gmsg.outputTranscription?.text) {
          ws.send(JSON.stringify({
            type: 'transcription',
            text: gmsg.outputTranscription.text
          }));
          console.log('[WS] Transcription sent to client:', gmsg.outputTranscription.text);
        }

      } catch (err) {
        console.error('[WS] Error parsing Gemini message:', err);
      }
    });

    ws.on('close', () => {
      console.log('[WS] Client disconnected');
    });

    ws.on('error', (err) => {
      console.error('[WS] Client error:', err);
    });
  });

  wss.on('error', (err) => {
    console.error('[WS] Server error:', err);
  });

}
