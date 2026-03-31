
const GROQ_BASE = 'https://api.groq.com/openai/v1';
const CHAT_MODEL_DEFAULT = process.env.GROQ_CHAT_MODEL || 'llama-3.1-8b-instant';
const CHAT_FALLBACK_MODEL = process.env.GROQ_CHAT_FALLBACK_MODEL || 'llama-3.1-8b-instant';


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
  if (typeof data?.output_text === 'string' && data.output_text.trim()) return data.output_text.trim();
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



function offlineScammerReply(messages = []) {
  const joined = messages.map(m => `${m.role}: ${m.content || ''}`).join('\n').toLowerCase();
  if (joined.includes('mission_started')) return 'Hello maam, your computer security is in very dangerous condition. Please stay on the line and follow my steps very carefully.';
  if (joined.includes('player_opened_support_shortcut')) return 'Yes yes, that is the correct support page. Now do not close it, just continue exactly as I am telling you.';
  if (joined.includes('player_visited_support_site')) return 'Very good. You can see this is the secure portal, so now we must connect your device before the infection spreads more.';
  if (joined.includes('player_ran_fake_scan')) return 'Can you see all these warnings? This is exactly why I told you the matter is urgent and cannot be delayed.';
  if (joined.includes('player_bought_gift_cards_total_')) return 'Good. Keep the cards ready, because once the balance is confirmed we have to move to the redemption portal immediately.';
  if (joined.includes('player_attempted_redeem')) return 'Why did you redeem it so fast? Read every code properly and do not make mistakes on this secure transfer step.';
  if (joined.includes('gift card') || joined.includes('code')) return 'Read me the card details carefully. The faster you do it, the faster I can secure your funds.';
  return 'Maam, just stay calm and continue with me step by step so I can finish this security process for you.';
}
async function requestChat(model, messages, apiKey) {
  const payload = { model, messages, temperature: 0.9, max_tokens: 80 };
  let response = await fetch(`${GROQ_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload)
  });
  if (response.status === 429) {
    await sleep(6500);
    response = await fetch(`${GROQ_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });
  }
  const rawText = await response.text();
  let data;
  try { data = JSON.parse(rawText); } catch { data = { raw: rawText }; }
  return { response, data };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!process.env.GROQ_API_KEY) return res.status(200).json({ output: offlineScammerReply(req.body?.messages || []), offline: true });
  try {
    const { messages, model } = req.body || {};
    if (!Array.isArray(messages) || !messages.length) return res.status(400).json({ error: 'messages array is required' });
    let { response, data } = await requestChat(model || CHAT_MODEL_DEFAULT, messages, process.env.GROQ_API_KEY);
    if (!response.ok) {
      const msg = data?.error?.message || data?.error || `Groq chat failed with ${response.status}`;
      return res.status(200).json({ output: offlineScammerReply(messages), offline: true, fallbackReason: msg });
    }
    let output = extractText(data);
    if (!output) {
      ({ response, data } = await requestChat(CHAT_FALLBACK_MODEL, messages, process.env.GROQ_API_KEY));
      if (response.ok) output = extractText(data);
    }
    if (!output) return res.status(200).json({ output: offlineScammerReply(messages), offline: true, fallbackReason: 'Model returned an empty reply' });
    return res.status(200).json({ output, raw: data });
  } catch (err) {
    return res.status(200).json({ output: offlineScammerReply(req.body?.messages || []), offline: true, fallbackReason: err.message || 'Server error in /api/chat' });
  }
}
