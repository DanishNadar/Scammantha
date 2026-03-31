Scammantha Interactive Giftcards Build

Updates in this revision:
- fixed the tab bar dots so they sit to the left and no longer overlap the Desktop tab
- fixed TTS playback logic so the scammer voice can speak again when browser speech synthesis is available
- added offline fallback scammer dialogue so text generation still works even without a Groq API key
- made the Gift Card Store cards clickable and tied them to the purchase controls
- removed the redundant redeem section from the right sidebar
- rebuilt the Redemption Portal into a dedicated, more realistic payout / redemption simulation page
- replaced the old red DO NOT REDEEM block with a Redeem Everything button on the portal itself
- locked Redeem Everything until gift cards are actually purchased

Run locally:
1. unzip
2. cd Scammantha
3. npm install
4. optional: cp .env.example .env and add your Groq key for AI chat + transcription
5. npm run dev
6. open http://localhost:3000

Notes:
- Without a Groq key, the project now still runs in offline fallback mode for scammer text.
- Browser TTS depends on speechSynthesis support and available installed voices in the browser/OS.
- Microphone transcription still needs the API path if you want server-side transcription.

- The mission now auto-starts on the first typed or spoken message, so Groq chat and TTS are not blocked if the user forgets to press Start Mission.
