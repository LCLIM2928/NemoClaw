const express = require('express');
const app = express();
app.use(express.json());

async function callLLM(messages, apiKey, url, bodyBuilder) {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify(bodyBuilder(messages))
    });
    const text = await res.text();
    try {
      const data = JSON.parse(text);
      return data.choices?.[0]?.message?.content || data.content || data.candidates?.[0]?.content?.parts?.[0]?.text;
    } catch (e) {
      console.error('JSON parse error for', url, text.slice(0,200));
      return null;
    }
  } catch (e) {
    console.error('Fetch error', e.message);
    return null;
  }
}

app.post('/api/chat', async (req, res) => {
  const { messages } = req.body;
  if (!messages || !messages.length) return res.status(400).json({ error: 'No messages' });

  let reply = null;
  // NVIDIA Nemotron
  reply = await callLLM(messages, process.env.NVIDIA_KEY, 'https://api.nvidia.com/v1/chat/completions',
    (msgs) => ({ model: 'nemotron-3-super-120b', messages: msgs }));
  if (!reply) {
    // Groq
    reply = await callLLM(messages, process.env.GROQ_KEY, 'https://api.groq.com/openai/v1/chat/completions',
      (msgs) => ({ model: 'llama-3.3-70b-versatile', messages: msgs }));
  }
  if (!reply) {
    // Gemini (flash)
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_KEY}`;
    reply = await callLLM(messages, process.env.GEMINI_KEY, geminiUrl,
      (msgs) => ({ contents: [{ role: 'user', parts: [{ text: msgs[msgs.length-1].content }] }] }));
  }

  if (!reply) reply = 'All LLMs failed.';
  res.json({ reply });
});

app.get('/health', (req, res) => res.send('ok'));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Listening on ${PORT}`));