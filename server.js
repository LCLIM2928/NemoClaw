const express = require('express');
const app = express();
app.use(express.json());

// Helper to safely call an LLM and parse JSON response
async function safeLLMCall(url, headers, body) {
  try {
    const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
    const text = await res.text();
    console.log(`Response from ${url}: ${text.slice(0, 200)}`);
    try {
      return JSON.parse(text);
    } catch (e) {
      console.error('JSON parse error:', e.message);
      return null;
    }
  } catch (e) {
    console.error('Fetch error:', e.message);
    return null;
  }
}

app.post('/api/chat', async (req, res) => {
  const { messages } = req.body;
  if (!messages || !messages.length) {
    return res.status(400).json({ error: 'No messages' });
  }
  const lastMsg = messages[messages.length-1].content;

  let reply = null;
  // 1. NVIDIA Nemotron
  if (process.env.NVIDIA_KEY) {
    const data = await safeLLMCall(
      'https://api.nvidia.com/v1/chat/completions',
      { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.NVIDIA_KEY}` },
      { model: 'nemotron-3-super-120b', messages }
    );
    reply = data?.choices?.[0]?.message?.content;
    if (reply) console.log('Used NVIDIA');
  }

  // 2. Groq
  if (!reply && process.env.GROQ_KEY) {
    const data = await safeLLMCall(
      'https://api.groq.com/openai/v1/chat/completions',
      { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.GROQ_KEY}` },
      { model: 'llama-3.3-70b-versatile', messages }
    );
    reply = data?.choices?.[0]?.message?.content;
    if (reply) console.log('Used Groq');
  }

  // 3. Gemini
  if (!reply && process.env.GEMINI_KEY) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_KEY}`;
    const data = await safeLLMCall(
      url,
      { 'Content-Type': 'application/json' },
      { contents: [{ role: 'user', parts: [{ text: lastMsg }] }] }
    );
    reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (reply) console.log('Used Gemini');
  }

  if (!reply) reply = 'All LLMs failed. Check logs.';
  res.json({ reply });
});

app.get('/health', (req, res) => res.send('ok'));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Listening on ${PORT}`));