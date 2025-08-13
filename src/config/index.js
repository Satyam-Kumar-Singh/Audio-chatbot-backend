import dotenv from 'dotenv';
dotenv.config({ debug: false });

export const config = {
  port: process.env.PORT || 5000,
  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
    model: process.env.GEMINI_MODEL
  }
};
