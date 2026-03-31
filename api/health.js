export default function handler(req, res) {
  return res.status(200).json({
    ok: true,
    chatModel: process.env.GROQ_CHAT_MODEL || 'llama-3.1-8b-instant',
    fallbackModel: process.env.GROQ_CHAT_FALLBACK_MODEL || 'llama-3.1-8b-instant',
    sttModel: process.env.GROQ_STT_MODEL || 'whisper-large-v3-turbo',
    mode: process.env.GROQ_API_KEY ? 'groq' : 'offline'
  });
}
