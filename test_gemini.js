import dotenv from 'dotenv';
dotenv.config();

const key = process.env.GEMINI_API_KEY;
console.log('Testing Gemini with key:', key ? key.substring(0, 10) + '...' : 'none');

const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;

async function run() {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: 'Ola Gemini! Diga em JSON: {"status": "ok"}' }] }],
      generationConfig: { responseMimeType: 'application/json' }
    })
  });

  const json = await res.json();
  console.log('Gemini response:', JSON.stringify(json, null, 2));
}

run().catch(console.error);
