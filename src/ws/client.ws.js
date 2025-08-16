import { WebSocketServer } from 'ws';
import { getGeminiSession } from '../services/gemini.service.js';

export function initClientWSS(server) {
  const clientWss = new WebSocketServer({ server, path: '/ws/client' });

  clientWss.on('connection', (client, req) => {
    const sid = new URLSearchParams(req.url.split('?')[1]).get('sid');
    const geminiSession = getGeminiSession(sid);

    if (!geminiSession) {
      client.send(JSON.stringify({ error: 'Invalid session ID' }));
      return client.close();
    }
    console.log(`[WS] Client connected with SID: ${sid}`);

    // 🔗 Attach Gemini → Client forwarding
    geminiSession.ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());

        // Forward everything so client can handle transcripts / events
        client.send(JSON.stringify({ from: 'gemini', payload: msg }));

        // If Gemini sends audio back
        if (msg.modelOutput?.[0]?.audio?.data) {
          const audioBase64 = msg.modelOutput[0].audio.data;

          client.send(JSON.stringify({
            from: 'gemini',
            type: 'audio-chunk',
            audio: audioBase64 // base64 PCM16 chunk
          }));
        }

      } catch (err) {
        console.error('[WS] Error parsing Gemini message:', err);
      }
    });


    geminiSession.ws.on('close', () => {
      client.send(JSON.stringify({ from: 'gemini', event: 'session_closed' }));
      client.close();
    });

    geminiSession.ws.on('error', (err) => {
      client.send(JSON.stringify({ from: 'gemini', error: err.message }));
    });


    // Client → Server → Gemini
    client.on('message', (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw.toString());
      } catch (err) {
        console.error('[WS] Invalid JSON message:', raw.toString());
        return;
      }

      if (msg.type === 'audio-chunk') {
        // msg.audio should already be base64 encoded
        geminiSession.ws.send(JSON.stringify({
          realtimeInput: {
            audio: {
              data: msg.audio, // base64 PCM16 chunk
              mimeType: "audio/pcm;rate=16000"
            }
          }
        }));
        console.log('[WS] Audio chunk sent to Gemini, length:', msg.audio.length);
      }

      if (msg.type === 'end-audio') {
        geminiSession.ws.send(JSON.stringify({
          realtimeInput: {
            audioStreamEnd: true
          }
        }));
        console.log('[WS] End of audio sent to Gemini');
      }
    });


    client.on('close', () => {
      console.log('[WS] Client disconnected');
    });

    client.on('error', (err) => {
      console.error('[WS] Client error:', err);
    });
  });

  clientWss.on('error', (err) => {
    console.error('[WS] Server error:', err);
  });

}
