import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

async function run() {
  try {
    console.log("Calling Gemini 2.5 Flash without tools...");
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: 'Hello, respond with "Gemini is working!"'
    });
    console.log("Response:", response.text);
  } catch (err) {
    console.error("Error:", err.message || err);
  }
}

run();
