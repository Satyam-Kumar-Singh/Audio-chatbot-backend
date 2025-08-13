import WebSocket from 'ws';

const API_KEY = 'AIzaSyCu5Pl9kfn4LJp_09X8IihZmAOsVCtCcCk';
const MODEL = 'models/gemini-2.0-flash-live-001';
const GEMINI_WS_URL = `wss://generativelanguage.googleapis.com/v1beta2/live:connect?key=${API_KEY}`;

const ws = new WebSocket(GEMINI_WS_URL);

ws.on('open', () => {
  console.log('✅ Connected to Gemini Live API');

  ws.send(JSON.stringify({
    setup: {
      model: MODEL,
      instructions: "Say: Hello from Gemini Live!"
    }
  }));

  ws.send(JSON.stringify({
    response: { instructions: "Hello from Gemini Live!" }
  }));
});

ws.on('message', (msg) => {
  console.log('📥', msg.toString());
});

ws.on('error', (err) => {
  console.error('❌ Error:', err.message);
});

ws.on('close', (code, reason) => {
  console.log(`⚠️ Closed: ${code} ${reason}`);
});
