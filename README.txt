Scammantha v8

This build fixes the empty-reply problem.

What changed:
- The server now extracts text from multiple response shapes instead of assuming only one exact JSON field.
- If the first chat request returns success but empty text, the server retries once on the fallback model.
- Default model remains llama-3.1-8b-instant for lower rate-limit pressure and faster replies.
- Trainer error text is clearer when the model still fails.

Setup:
1. Copy .env.example to .env
2. Put your real key in .env:
   GROQ_API_KEY=gsk_...
3. Install:
   npm install
4. Start:
   npm run dev
5. Open:
   http://localhost:3000

If you already had the old server running:
- stop it
- replace the folder with this one
- run npm run dev again

If you still get empty replies after this:
- keep the model set to llama-3.1-8b-instant
- refresh the page once after the server starts
