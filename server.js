const express = require('express');
const app = express();
app.use(express.json());

const TUNNEL_URL = process.env.NEMOCLAW_URL || 'https://give-consequence-rich-bless.trycloudflare.com';

app.post('/api/chat', async (req, res) => {
  try {
    const response = await fetch(`${TUNNEL_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/health', (req, res) => res.send('ok'));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
