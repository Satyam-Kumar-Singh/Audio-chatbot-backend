import WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/index.js';

const sessions = new Map(); // sid -> { ws }

export async function initGeminiSession() {
  const sid = uuidv4();

  // Correct Live API WS endpoint
  const GEMINI_WS_URL = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${config.gemini.apiKey}`;

  const geminiWS = new WebSocket(GEMINI_WS_URL);

  geminiWS.on('open', () => {
    console.log(`Gemini session connected for SID: ${sid}`);

    // Minimal setup — no invalid gender field
    const setupMsg = {
      setup: {
        model: `models/${config.gemini.model}`,
        generationConfig: {
          temperature: 0.9,
          candidateCount: 1,
          responseModalities: ["AUDIO"], // Expect audio output
          speechConfig: {} // Keep empty unless docs specify supported fields
        },
        systemInstruction: {
          role: "SYSTEM",
          parts: [
            {
              text:
                "You are Rev, a voice assistant for Revolt Motors. " +
                "Answer only about Revolt bikes, booking, service, charging, specifications, dealerships, and support. " +
                "If asked unrelated questions, politely steer back to Revolt."
            }
          ]
        },
        realtimeInputConfig: {
          automaticActivityDetection: {
            disabled: false
          }
        },
        inputAudioTranscription: {},   // enable transcription of incoming audio
        outputAudioTranscription: {}   // enable transcription of AI's audio output
      }
    };

    geminiWS.send(JSON.stringify(setupMsg));
  });

  geminiWS.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      console.log(`📥 Gemini -> ${sid}:`, msg);
      // You can forward this to the client here if needed
    } catch (err) {
      console.error(`Error parsing Gemini message for SID ${sid}:`, err);
    }
  });

  geminiWS.on('close', (code, reason) => {
    console.log(`Gemini session closed for SID: ${sid}. Code: ${code}, Reason: ${reason || 'No reason provided'}`);
    sessions.delete(sid);
  });

  geminiWS.on('error', (err) => {
    console.error(`Gemini WS error for SID ${sid}:`, err);
  });

  sessions.set(sid, { ws: geminiWS });
  return sid;
}

export function getGeminiSession(sid) {
  return sessions.get(sid);
}
