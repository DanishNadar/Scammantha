import express from 'express';
import multer from 'multer';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

app.use(express.json({ limit: '1mb' }));

const GROQ_BASE = 'https://api.groq.com/openai/v1';
const CHAT_MODEL_DEFAULT = process.env.GROQ_CHAT_MODEL || 'llama-3.1-8b-instant';
const CHAT_FALLBACK_MODEL = process.env.GROQ_CHAT_FALLBACK_MODEL || 'llama-3.1-8b-instant';
const STT_MODEL_DEFAULT = process.env.GROQ_STT_MODEL || 'whisper-large-v3-turbo';

function hasKey() {
  return !!process.env.GROQ_API_KEY;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function extractText(data) {
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content === 'string' && content.trim()) return content.trim();

  if (Array.isArray(content)) {
    const joined = content.map(part => {
      if (typeof part === 'string') return part;
      if (typeof part?.text === 'string') return part.text;
      if (typeof part?.content === 'string') return part.content;
      return '';
    }).join(' ').trim();
    if (joined) return joined;
  }

  if (typeof data?.output_text === 'string' && data.output_text.trim()) {
    return data.output_text.trim();
  }

  if (Array.isArray(data?.output)) {
    const joined = data.output.flatMap(item => {
      if (typeof item?.content === 'string') return [item.content];
      if (Array.isArray(item?.content)) {
        return item.content.map(part => part?.text || part?.content || '').filter(Boolean);
      }
      return [];
    }).join(' ').trim();
    if (joined) return joined;
  }

  return '';
}

async function requestChat(model, messages) {
  const payload = {
    model,
    messages,
    temperature: 0.9,
    max_tokens: 80
  };

  let response = await fetch(`${GROQ_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
    },
    body: JSON.stringify(payload)
  });

  if (response.status === 429) {
    await sleep(6500);
    response = await fetch(`${GROQ_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify(payload)
    });
  }

  const rawText = await response.text();
  let data;
  try {
    data = JSON.parse(rawText);
  } catch {
    data = { raw: rawText };
  }

  return { response, data };
}

app.get('/api/health', (req, res) => {
  if (!hasKey()) {
    return res.status(500).json({ ok: false, error: 'Missing GROQ_API_KEY in environment' });
  }

  res.json({
    ok: true,
    chatModel: CHAT_MODEL_DEFAULT,
    fallbackModel: CHAT_FALLBACK_MODEL,
    sttModel: STT_MODEL_DEFAULT
  });
});

app.post('/api/chat', async (req, res) => {
  try {
    if (!hasKey()) {
      return res.status(500).json({ error: 'Missing GROQ_API_KEY in environment' });
    }

    const { messages, model } = req.body || {};
    if (!Array.isArray(messages) || !messages.length) {
      return res.status(400).json({ error: 'messages array is required' });
    }

    const requestedModel = model || CHAT_MODEL_DEFAULT;

    let { response, data } = await requestChat(requestedModel, messages);

    if (!response.ok) {
      const msg = data?.error?.message || data?.error || `Groq chat failed with ${response.status}`;
      return res.status(response.status).json({ error: msg, details: data });
    }

    let output = extractText(data);

    if (!output) {
      ({ response, data } = await requestChat(CHAT_FALLBACK_MODEL, messages));
      if (response.ok) output = extractText(data);
    }

    if (!output) {
      return res.status(502).json({
        error: 'Model returned an empty reply',
        details: data
      });
    }

    res.json({ output, raw: data });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Server error in /api/chat' });
  }
});

app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
  try {
    if (!hasKey()) {
      return res.status(500).json({ error: 'Missing GROQ_API_KEY in environment' });
    }

    if (!req.file?.buffer) {
      return res.status(400).json({ error: 'audio file is required' });
    }

    const form = new FormData();
    const blob = new Blob([req.file.buffer], { type: req.file.mimetype || 'audio/webm' });

    form.append('file', blob, req.file.originalname || 'speech.webm');
    form.append('model', STT_MODEL_DEFAULT);
    form.append('language', 'en');
    form.append('response_format', 'json');
    form.append('temperature', '0');

    const response = await fetch(`${GROQ_BASE}/audio/transcriptions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: form
    });

    const rawText = await response.text();
    let data;
    try {
      data = JSON.parse(rawText);
    } catch {
      data = { raw: rawText };
    }

    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.error?.message || data?.error || `Groq transcription failed with ${response.status}`,
        details: data
      });
    }

    res.json({ text: data?.text || '' });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Server error in /api/transcribe' });
  }
});

export default app;