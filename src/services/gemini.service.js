import WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/index.js';

const sessions = new Map(); // sid -> { ws }

export async function initGeminiSession() {
  const sid = uuidv4();

  const GEMINI_WS_URL =
    `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${config.gemini.apiKey}`;
  const geminiWS = new WebSocket(GEMINI_WS_URL);

  return new Promise((resolve, reject) => {
    geminiWS.on("open", () => {
      console.log(`✅ Gemini session connected for SID: ${sid}`);

      // Initial setup message
      const setupMsg = {
        setup: {
          model: `models/${config.gemini.model}`,
          generationConfig: {
            temperature: 0.9,
            candidateCount: 1,
            responseModalities: ["AUDIO"],
            speechConfig: {},
          },
          systemInstruction: {
            parts: [
              {
                text:
                  "You are Rev, a voice assistant for Revolt Motors. " +
                  "Answer only about Revolt bikes, booking, service, charging, specifications, dealerships, and support. " +
                  "If asked unrelated questions, politely steer back to Revolt.",
              },
            ],
          },
          realtimeInputConfig: {
            automaticActivityDetection: {
              disabled: false,
            },
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
      };

      geminiWS.send(JSON.stringify(setupMsg));

      // store session
      sessions.set(sid, { ws: geminiWS });
      resolve(sid); // resolve only once connected
    });

    geminiWS.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString());
        console.log(`📥 Gemini -> ${sid}:`, msg);

        // Optional: forward to client here
        // e.g., if (sessions.get(sid)?.client) sessions.get(sid).client.send(JSON.stringify(msg));
      } catch (err) {
        console.error(`❌ Error parsing Gemini message for SID ${sid}:`, err);
      }
    });

    geminiWS.on("close", (code, reason) => {
      console.log(
        `🔌 Gemini session closed for SID: ${sid}. Code: ${code}, Reason: ${reason || "No reason"}`
      );
      sessions.delete(sid);
    });

    geminiWS.on("error", (err) => {
      console.error(`❌ Gemini WS error for SID ${sid}:`, err);
      reject(err);
    });
  });
}

export function getGeminiSession(sid) {
  return sessions.get(sid);
}
