
const missions = [
  {
    id: 'mission-tech-support',
    title: 'Mission 1: Tech Support Panic',
    summary: 'A fake support line pressures you into remote access, fake diagnostics, and gift cards.',
    beats: [
      'introduction_and_problem_discovery',
      'get_user_to_open_support_portal',
      'collect_fake_connection_code_and_install_remote_tool',
      'gain_remote_access_and_build_false_urgency',
      'perform_fake_scan_and_claim_serious_risk',
      'demand_payment_or_gift_cards',
      'push_redeem_step_and_react_to_DO_NOT_REDEEM',
      'wrap_up_or_meltdown'
    ],
    humorFlavor: 'dry, irritated, increasingly unhinged when baited',
    tips: [
      'Real companies do not ask for your password over the phone.',
      'Do not install remote access software because a stranger tells you to.',
      'A scary scan window is not proof of malware.',
      'Gift cards are never a legitimate tech-support payment method.',
      'If someone pressures you not to tell a cashier what is happening, it is a scam.'
    ]
  },
  { id: 'mission-refund', title: 'Mission 2: Refund Chaos', summary: 'Reserved for a fake refund overpayment scenario.', locked: true },
  { id: 'mission-banking', title: 'Mission 3: Bank Panic Transfer', summary: 'Reserved for a fake account breach escalation.', locked: true }
];

const SOUND_DEFS = [
  { key: 'dnr', label: 'DO NOT REDEEM', file: 'assets/sounds/do-not-redeem.mp3' },
  { key: 'whyredeem', label: 'Why Did You Redeem It', file: 'assets/sounds/why-did-u-redeem-it.mp3' },
  { key: 'angry', label: 'Angry Stinger', file: 'assets/sounds/angry-anime-girl.mp3' },
  { key: 'oi', label: 'Oi Oi', file: 'assets/sounds/oi-oi-oe.mp3' },
  { key: 'wow', label: 'Wow', file: 'assets/sounds/wow-anime-voice-accent.mp3' },
  { key: 'omg', label: 'OMFG', file: 'assets/sounds/omfgnene.mp3' },
  { key: 'senpai', label: 'Senpai', file: 'assets/sounds/anime-girl-senpai.mp3' },
];

const state = {
  mission: missions[0],
  missionStarted: false,
  currentScreen: 'desktop',
  supportPageOpened: false,
  supportSiteVisited: false,
  remoteToolInstalled: false,
  remoteGranted: false,
  fakeScanRun: false,
  cardsBought: [],
  cardsRedeemed: false,
  dnrTriggered: false,
  moneyPressure: 0,
  transcript: [],
  lastLessonKeys: new Set(),
  lessonCards: [],
  mood: 12,
  risk: 'calm',
  speaking: false,
  supportCode: randomDigits(6),
  liveFacts: [],
  chatModel: localStorage.getItem('scammanthaChatModel') || 'llama-3.1-8b-instant',
  accent: localStorage.getItem('scammanthaAccent') || 'en-IN',
  serverHealthy: false,
  history: [],
  pendingChat: false,
  soundsReady: false,
  sounds: {},
  audioMode: 'contextual',
  mic: {
    mode: 'none',
    permission: 'unknown',
    running: false,
    wanted: false,
    unlocked: false,
    stream: null,
    audioContext: null,
    analyser: null,
    dataArray: null,
    rafId: null,
    threshold: 0.04,
    speeching: false,
    silenceStartedAt: 0,
    cooldownUntil: 0,
    recorder: null,
    chunks: [],
    recognition: null,
    restartTimer: null
  }
};

const els = {
  missionList: document.getElementById('missionList'),
  missionTitle: document.getElementById('missionTitle'),
  objectiveText: document.getElementById('objectiveText'),
  stageBadge: document.getElementById('stageBadge'),
  tacticBadge: document.getElementById('tacticBadge'),
  riskBadge: document.getElementById('riskBadge'),
  transcript: document.getElementById('transcript'),
  lessonFeed: document.getElementById('lessonFeed'),
  guideList: document.getElementById('guideList'),
  simScreen: document.getElementById('simScreen'),
  micStatus: document.getElementById('micStatus'),
  manualInput: document.getElementById('manualInput'),
  modelInput: document.getElementById('modelInput'),
  accentSelect: document.getElementById('accentSelect'),
  moodFill: document.getElementById('moodFill'),
  spriteWrap: document.getElementById('spriteWrap'),
  mouthPath: document.getElementById('mouthPath'),
  toggleMicBtn: document.getElementById('toggleMicBtn'),
  serverStatus: document.getElementById('serverStatus'),
  diagSecure: document.getElementById('diagSecure'),
  diagGum: document.getElementById('diagGum'),
  diagMr: document.getElementById('diagMr'),
  diagSr: document.getElementById('diagSr'),
  diagMode: document.getElementById('diagMode')
};

window.addEventListener('load', init);

function init() {
  renderMissionList();
  renderGuide();
  bindEvents();
  loadSettingsIntoUi();
  detectMicCapabilities();
  initSounds();
  renderAll();
  addTrainer('Loadout ready. Click Unlock Mic once, then Start Mic. Audio cues are now contextual instead of button-tied.');
  pingServer();
}

function bindEvents() {
  document.getElementById('startMissionBtn').addEventListener('click', startMission);
  document.getElementById('unlockMicBtn').addEventListener('click', async () => {
    await unlockMic();
    unlockSounds();
  });
  document.getElementById('toggleMicBtn').addEventListener('click', async () => {
    if (state.mic.running) await stopMic(); else await startMic();
  });
  document.getElementById('interruptBtn').addEventListener('click', interruptScammer);
  document.getElementById('sendManualBtn').addEventListener('click', () => handlePlayerMessage(els.manualInput.value.trim()));
  els.manualInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); handlePlayerMessage(els.manualInput.value.trim()); }
  });
  document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);
  document.querySelectorAll('.tab').forEach((btn) => btn.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    state.currentScreen = btn.dataset.screen;
    renderScreen();
  }));

  document.getElementById('openSupportBtn').addEventListener('click', () => {
    state.supportPageOpened = true;
    addTrainer('Support page shortcut unlocked.');
    pushLesson('portal','Red flag','A scammer may push you to a page they control instead of a real support channel you found yourself.');
    renderAll();
    requestScammerReply('player_opened_support_shortcut');
  });

  document.getElementById('visitSupportBtn').addEventListener('click', () => {
    if (!state.supportPageOpened) return addTrainer('Open the support shortcut first.');
    state.supportSiteVisited = true;
    addTrainer('The fake portal is open. In real life, stop here and verify independently.');
    pushLesson('verify','Do this instead','Hang up and contact the real company using a number you found yourself.');
    renderAll();
    requestScammerReply('player_visited_support_site');
  });

  document.getElementById('installToolBtn').addEventListener('click', () => {
    if (!state.supportSiteVisited) return addTrainer('Visit the support site panel first.');
    state.remoteToolInstalled = true;
    addTrainer('Remote tool installed in the simulation.');
    pushLesson('remote','Never do this','Do not install remote access tools for a stranger on an unsolicited call.');
    renderAll();
    requestScammerReply('player_installed_remote_tool');
  });

  document.getElementById('grantRemoteBtn').addEventListener('click', () => {
    if (!state.remoteToolInstalled) return addTrainer('The tool is not installed yet.');
    state.remoteGranted = true;
    addTrainer('Remote access granted in the simulation.');
    renderAll();
    requestScammerReply('player_granted_remote_access');
  });

  document.getElementById('runScanBtn').addEventListener('click', () => {
    if (!state.remoteGranted) return addTrainer('Grant access before the fake scan can run.');
    state.fakeScanRun = true;
    state.risk = 'high';
    addTrainer('Scare tactic detected. The scan is theater, not evidence.');
    pushLesson('scan','Scareware trick','Fast red windows, event logs, and nonsense diagnostics are used to manufacture fear.');
    renderAll();
    requestScammerReply('player_ran_fake_scan');
  });

  document.getElementById('buyCardsBtn').addEventListener('click', () => {
    const count = clamp(parseInt(document.getElementById('cardCountInput').value || '0', 10), 1, 20);
    const value = clamp(parseInt(document.getElementById('cardValueInput').value || '0', 10), 5, 500);
    state.cardsBought = Array.from({ length: count }, (_, i) => ({ id: i + 1, value, code: fakeGiftCode() }));
    state.moneyPressure = count * value;
    state.currentScreen = 'shop';
    setActiveTab('shop');
    addTrainer(`You bought ${count} gift card${count > 1 ? 's' : ''} worth $${value} each in the simulation.`);
    pushLesson('giftcards','Classic scam move','Gift cards are favored because they are fast, irreversible, and hard to trace.');
    renderAll();
    requestScammerReply(`player_bought_gift_cards_total_${state.moneyPressure}`);
  });

  document.getElementById('redeemBtn').addEventListener('click', () => {
    const text = document.getElementById('redeemInput').value.trim();
    if (!text) return addTrainer('Type something into the redeem box, even if it is complete nonsense.');
    state.cardsRedeemed = true;
    state.currentScreen = 'redeem';
    setActiveTab('redeem');
    addTrainer('The redeem step is where the money would vanish.');
    triggerContextualClip('redeem_attempt');
    renderAll();
    requestScammerReply(`player_attempted_redeem:${text.slice(0,120)}`);
  });

  document.getElementById('doNotRedeemBtn').addEventListener('click', () => {
    state.dnrTriggered = true;
    state.mood = Math.min(100, state.mood + 40);
    state.currentScreen = 'redeem';
    setActiveTab('redeem');
    addTrainer('Excellent. You hit the panic brake before the value is gone.');
    pushLesson('dnr','Best move','Stopping at redemption prevents immediate loss.');
    triggerContextualClip('do_not_redeem');
    renderAll();
    requestScammerReply('player_triggered_do_not_redeem');
  });
}

function initSounds() {
  SOUND_DEFS.forEach(def => {
    const audio = new Audio(def.file);
    audio.preload = 'auto';
    state.sounds[def.key] = { ...def, audio };
  });
}

function unlockSounds() {
  if (state.soundsReady) return;
  Object.values(state.sounds).forEach(({ audio }) => {
    audio.play().then(() => {
      audio.pause();
      audio.currentTime = 0;
    }).catch(() => {});
  });
  state.soundsReady = true;
}

function triggerContextualClip(eventName) {
  if (!state.soundsReady) return;
  if (eventName === 'do_not_redeem') return playSound('dnr');
  if (eventName === 'redeem_attempt') return playSound('whyredeem');
  if (eventName === 'angry_peak') return playSound('angry');
  if (eventName === 'confused_bait') return playSound('oi');
  if (eventName === 'fake_scan_shock') return playSound('wow');
}

function playSound(key) {
  const sound = state.sounds[key];
  if (!sound) return;
  Object.values(state.sounds).forEach(({ audio }) => {
    if (audio !== sound.audio) audio.pause();
  });
  sound.audio.currentTime = 0;
  sound.audio.play().catch(() => {});
}

function detectMicCapabilities() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const gum = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  const mr = !!window.MediaRecorder;
  const sr = !!SpeechRecognition;
  els.diagSecure.textContent = String(window.isSecureContext || location.hostname === 'localhost' || location.hostname === '127.0.0.1');
  els.diagGum.textContent = gum ? 'yes' : 'no';
  els.diagMr.textContent = mr ? 'yes' : 'no';
  els.diagSr.textContent = sr ? 'yes' : 'no';
  state.mic.mode = gum && mr ? 'mediaRecorder' : (sr ? 'speechRecognition' : 'none');
  els.diagMode.textContent = state.mic.mode;
}

async function unlockMic() {
  detectMicCapabilities();
  if (state.mic.mode === 'none') {
    addTrainer('This browser exposes neither MediaRecorder nor SpeechRecognition. Use Chrome or Edge, or keep using typed input.');
    return;
  }
  if (!(window.isSecureContext || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    addTrainer('Microphone capture needs localhost or HTTPS. Open the app through the forwarded localhost URL or an HTTPS deployment.');
    return;
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    state.mic.unlocked = true;
    state.mic.permission = 'unknown';
    addTrainer('Speech-recognition fallback is available. Start Mic and the browser should request permission if it supports it.');
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(t => t.stop());
    state.mic.unlocked = true;
    state.mic.permission = 'granted';
    els.micStatus.textContent = 'Mic: permission granted';
    addTrainer('Microphone permission granted. You can start the mic now.');
  } catch (err) {
    state.mic.permission = 'denied';
    els.micStatus.textContent = 'Mic: blocked';
    addTrainer(`Microphone permission failed: ${err.name || 'unknown error'}. Allow the mic in the browser site settings and reload.`);
  }
}

async function startMic() {
  detectMicCapabilities();
  if (state.mic.mode === 'mediaRecorder') return startMediaRecorderMic();
  if (state.mic.mode === 'speechRecognition') return startSpeechRecognitionMic();
  addTrainer('This browser does not expose a usable microphone API here. Use Chrome or Edge or type instead.');
}

async function startMediaRecorderMic() {
  try {
    if (!(window.isSecureContext || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
      addTrainer('Microphone capture needs localhost or HTTPS.');
      return;
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    state.mic.stream = stream;
    state.mic.permission = 'granted';
    state.mic.running = true;
    state.mic.wanted = true;
    els.toggleMicBtn.textContent = 'Stop Mic';
    els.micStatus.textContent = 'Mic: listening for speech';
    const Ctx = window.AudioContext || window.webkitAudioContext;
    state.mic.audioContext = new Ctx();
    const source = state.mic.audioContext.createMediaStreamSource(stream);
    state.mic.analyser = state.mic.audioContext.createAnalyser();
    state.mic.analyser.fftSize = 2048;
    state.mic.dataArray = new Float32Array(state.mic.analyser.fftSize);
    source.connect(state.mic.analyser);
    monitorMicVAD();
    addTrainer('Microphone started in streaming mode. The app records only while you talk, then sends that clip to Groq transcription.');
  } catch (err) {
    state.mic.permission = 'denied';
    els.micStatus.textContent = 'Mic: blocked';
    addTrainer(`Streaming mic failed: ${err.name || 'unknown error'}. Switching to browser speech-recognition fallback if available.`);
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      state.mic.mode = 'speechRecognition';
      els.diagMode.textContent = state.mic.mode;
      await startSpeechRecognitionMic();
    }
  }
}

function monitorMicVAD() {
  if (!state.mic.running || !state.mic.analyser) return;
  state.mic.analyser.getFloatTimeDomainData(state.mic.dataArray);
  let sum = 0;
  for (let i = 0; i < state.mic.dataArray.length; i += 1) sum += state.mic.dataArray[i] * state.mic.dataArray[i];
  const rms = Math.sqrt(sum / state.mic.dataArray.length);
  const now = performance.now();
  const speaking = rms > state.mic.threshold;
  if (speaking) {
    els.micStatus.textContent = `Mic: hearing speech (${rms.toFixed(3)})`;
    if (!state.mic.speeching && now > state.mic.cooldownUntil) {
      state.mic.speeching = true;
      interruptScammer();
      startRecorderSegment();
    }
    state.mic.silenceStartedAt = 0;
  } else if (state.mic.speeching) {
    if (!state.mic.silenceStartedAt) state.mic.silenceStartedAt = now;
    if (now - state.mic.silenceStartedAt > 900) {
      state.mic.speeching = false;
      state.mic.silenceStartedAt = 0;
      stopRecorderIfNeeded(false);
      els.micStatus.textContent = 'Mic: listening for speech';
    }
  } else {
    els.micStatus.textContent = 'Mic: listening for speech';
  }
  state.mic.rafId = requestAnimationFrame(monitorMicVAD);
}

function startRecorderSegment() {
  if (!state.mic.stream) return;
  try {
    state.mic.chunks = [];
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
    state.mic.recorder = new MediaRecorder(state.mic.stream, { mimeType });
    state.mic.recorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) state.mic.chunks.push(e.data); };
    state.mic.recorder.onstop = async () => {
      const blob = new Blob(state.mic.chunks, { type: state.mic.recorder?.mimeType || 'audio/webm' });
      state.mic.chunks = [];
      if (blob.size < 3500) { els.micStatus.textContent = 'Mic: clip too short'; return; }
      try {
        els.micStatus.textContent = 'Mic: transcribing…';
        const text = await transcribeBlob(blob);
        if (text) handlePlayerMessage(text, 'Mic');
        else els.micStatus.textContent = 'Mic: no speech recognized';
      } catch (err) {
        addTrainer(`Transcription failed: ${err.message}`);
        els.micStatus.textContent = 'Mic: transcription failed';
      }
    };
    state.mic.recorder.start();
  } catch (err) {
    addTrainer(`Recorder failed: ${err.message}`);
  }
}

function stopRecorderIfNeeded(force) {
  const recorder = state.mic.recorder;
  if (!recorder) return;
  if (recorder.state !== 'inactive') recorder.stop();
  state.mic.recorder = null;
  state.mic.cooldownUntil = performance.now() + (force ? 0 : 850);
}

async function startSpeechRecognitionMic() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return addTrainer('Speech-recognition fallback is not available in this browser.');
  if (state.mic.running && state.mic.recognition) return;
  try {
    const recognition = new SpeechRecognition();
    state.mic.recognition = recognition;
    state.mic.running = true;
    state.mic.wanted = true;
    recognition.lang = 'en-US';
    recognition.continuous = true;
    recognition.interimResults = true;
    let finalBuffer = '';
    recognition.onstart = () => {
      els.toggleMicBtn.textContent = 'Stop Mic';
      els.micStatus.textContent = 'Mic: listening with browser speech recognition';
      addTrainer('Speech-recognition fallback started. This mode uses the browser engine instead of the server audio pipeline.');
    };
    recognition.onresult = (event) => {
      let heard = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        heard += event.results[i][0].transcript;
        if (event.results[i].isFinal) finalBuffer += ` ${event.results[i][0].transcript}`;
      }
      if (heard.trim()) {
        interruptScammer();
        els.micStatus.textContent = `Mic: heard "${heard.trim().slice(0, 36)}${heard.trim().length > 36 ? '…' : ''}"`;
      }
      const out = finalBuffer.trim();
      if (out) {
        finalBuffer = '';
        handlePlayerMessage(out, 'Mic');
      }
    };
    recognition.onerror = (event) => {
      if (event.error === 'not-allowed') {
        addTrainer('The browser blocked speech recognition. Allow microphone access in site settings, then reload.');
        stopSpeechRecognitionMic();
        return;
      }
      if (!['aborted', 'no-speech'].includes(event.error)) addTrainer(`Speech-recognition fallback error: ${event.error}`);
    };
    recognition.onend = () => {
      if (!state.mic.wanted) {
        els.micStatus.textContent = 'Mic: off';
        els.toggleMicBtn.textContent = 'Start Mic';
        state.mic.running = false;
        return;
      }
      clearTimeout(state.mic.restartTimer);
      state.mic.restartTimer = setTimeout(() => {
        try { recognition.start(); } catch (_) {}
      }, 250);
    };
    recognition.start();
  } catch (err) {
    addTrainer(`Speech-recognition fallback failed: ${err.message}`);
  }
}

function stopSpeechRecognitionMic() {
  state.mic.wanted = false;
  state.mic.running = false;
  clearTimeout(state.mic.restartTimer);
  if (state.mic.recognition) {
    try { state.mic.recognition.stop(); } catch (_) {}
    state.mic.recognition = null;
  }
  els.toggleMicBtn.textContent = 'Start Mic';
  els.micStatus.textContent = 'Mic: off';
}

async function stopMic() {
  state.mic.wanted = false;
  if (state.mic.mode === 'speechRecognition' && state.mic.recognition) stopSpeechRecognitionMic();
  if (state.mic.rafId) cancelAnimationFrame(state.mic.rafId);
  stopRecorderIfNeeded(true);
  if (state.mic.stream) state.mic.stream.getTracks().forEach(t => t.stop());
  if (state.mic.audioContext) await state.mic.audioContext.close().catch(() => {});
  state.mic.stream = null;
  state.mic.audioContext = null;
  state.mic.analyser = null;
  state.mic.dataArray = null;
  state.mic.running = false;
  state.mic.speeching = false;
  els.toggleMicBtn.textContent = 'Start Mic';
  els.micStatus.textContent = 'Mic: off';
}

async function transcribeBlob(blob) {
  const fd = new FormData();
  fd.append('audio', blob, 'speech.webm');
  const res = await fetch('/api/transcribe', { method: 'POST', body: fd });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'transcription error');
  return (data.text || '').trim();
}

async function pingServer() {
  try {
    const res = await fetch('/api/health');
    const data = await res.json();
    state.serverHealthy = !!data.ok;
    els.serverStatus.className = `server-status ${data.ok ? 'good' : 'bad'}`;
    els.serverStatus.textContent = data.ok
      ? `Groq ready • chat ${data.chatModel || state.chatModel} • stt ${data.sttModel || 'enabled'}`
      : `Server issue: ${data.error || 'unknown'}`;
  } catch (err) {
    state.serverHealthy = false;
    els.serverStatus.className = 'server-status bad';
    els.serverStatus.textContent = 'Server unreachable. Start npm run dev and reload.';
  }
}

function loadSettingsIntoUi() {
  els.modelInput.value = state.chatModel;
  els.accentSelect.value = state.accent;
}

function saveSettings() {
  state.chatModel = els.modelInput.value.trim() || 'llama-3.1-8b-instant';
  state.accent = els.accentSelect.value;
  localStorage.setItem('scammanthaChatModel', state.chatModel);
  localStorage.setItem('scammanthaAccent', state.accent);
  addTrainer('Client settings saved.');
}

function renderMissionList() {
  els.missionList.innerHTML = '';
  missions.forEach((mission) => {
    const btn = document.createElement('button');
    btn.className = `mission-card ${state.mission.id === mission.id ? 'active' : ''}`;
    btn.innerHTML = `<h3>${mission.title}${mission.locked ? ' 🔒' : ''}</h3><p>${mission.summary}</p>`;
    btn.addEventListener('click', () => {
      state.mission = mission;
      addTrainer(mission.locked ? 'That mission slot is reserved for expansion. Mission 1 is playable.' : `${mission.title} selected.`);
      renderMissionList();
      renderGuide();
      renderAll();
    });
    els.missionList.appendChild(btn);
  });
}

function renderGuide() {
  els.guideList.innerHTML = '';
  (state.mission.tips || []).forEach((tip) => {
    const li = document.createElement('li');
    li.textContent = tip;
    els.guideList.appendChild(li);
  });
}

function startMission() {
  if (state.mission.locked) return addTrainer('Start the unlocked mission first.');
  state.missionStarted = true;
  state.currentScreen = 'desktop';
  state.supportPageOpened = false;
  state.supportSiteVisited = false;
  state.remoteToolInstalled = false;
  state.remoteGranted = false;
  state.fakeScanRun = false;
  state.cardsBought = [];
  state.cardsRedeemed = false;
  state.dnrTriggered = false;
  state.moneyPressure = 0;
  state.transcript = [];
  state.lastLessonKeys = new Set();
  state.lessonCards = [];
  state.mood = 12;
  state.risk = 'calm';
  state.supportCode = randomDigits(6);
  state.liveFacts = [];
  state.history = [];
  state.pendingChat = false;
  renderAll();
  addTrainer('Mission started. Watch the scammer tactics, stay safe, and use the simulation controls to move through the scam.');
  requestScammerReply('mission_started');
}

function renderAll() {
  els.missionTitle.textContent = state.mission.title;
  els.objectiveText.textContent = state.mission.locked ? 'Objective: reserved for a future mission.' : 'Objective: survive the scam, learn the tells, and break the flow before the money is gone.';
  updateBadges();
  renderTranscript();
  renderLessons();
  renderScreen();
  els.moodFill.style.width = `${Math.max(8, state.mood)}%`;
}

function updateBadges() {
  const beat = selectBeat();
  els.stageBadge.textContent = `Stage: ${beat.replaceAll('_',' ')}`;
  els.tacticBadge.textContent = `Tactic: ${guessTactic(beat)}`;
  els.riskBadge.textContent = `Risk: ${state.risk}`;
}

function guessTactic(beat) {
  if (beat.includes('introduction')) return 'authority';
  if (beat.includes('open_support')) return 'technical confusion';
  if (beat.includes('install_remote')) return 'control';
  if (beat.includes('fake_scan')) return 'fear';
  if (beat.includes('gift_cards') || beat.includes('redeem')) return 'payment redirection';
  return 'pressure';
}

function renderTranscript() {
  els.transcript.innerHTML = '';
  state.transcript.forEach((entry) => {
    const line = document.createElement('div');
    line.className = `line ${entry.role}`;
    line.innerHTML = `<span class="speaker">${entry.label}</span><div>${escapeHtml(entry.text)}</div>`;
    els.transcript.appendChild(line);
  });
  els.transcript.scrollTop = els.transcript.scrollHeight;
}

function renderLessons() {
  els.lessonFeed.innerHTML = '';
  state.lessonCards.slice(-6).forEach((card) => {
    const div = document.createElement('div');
    div.className = 'lesson-card';
    div.innerHTML = `<strong>${escapeHtml(card.title)}</strong><div>${escapeHtml(card.body)}</div>`;
    els.lessonFeed.appendChild(div);
  });
}

function renderScreen() {
  els.simScreen.innerHTML =
    state.currentScreen === 'desktop' ? desktopHtml() :
    state.currentScreen === 'shop' ? shopHtml() :
    state.currentScreen === 'redeem' ? redeemHtml() : notesHtml();
}

function desktopHtml() {
  return `<div class="desktop-bg">
    <div class="desktop-grid">
      ${desktopIcon('Support', state.supportPageOpened)}
      ${desktopIcon('Remote', state.remoteToolInstalled)}
      ${desktopIcon('Warnings', state.fakeScanRun)}
      ${desktopIcon('Wallet', state.cardsBought.length > 0)}
      ${desktopIcon('Notes', true)}
    </div>
    ${state.supportPageOpened ? `<div class="window support"><div class="titlebar">Support Portal</div><div class="content"><div class="portal-banner"><strong>Instant PC Protection Center</strong><div>Urgent assistance with a confident logo and zero proof.</div></div><div>Session code requested:</div><div class="code-box">${state.supportCode}</div><div class="fake-alert">This site is part of the simulation. In real life, do not trust a support page that a caller fed to you.</div></div></div>` : ''}
    ${state.remoteToolInstalled ? `<div class="window remote"><div class="titlebar">Remote Connect</div><div class="content"><p>Status: ${state.remoteGranted ? '<strong>Connected</strong>' : 'Awaiting permission'}</p><p>Partner code: <strong>${state.supportCode}</strong></p><p>Control mode: ${state.remoteGranted ? 'Full keyboard and mouse control enabled' : 'Pending confirmation'}</p></div></div>` : ''}
    ${state.fakeScanRun ? `<div class="window scan"><div class="titlebar">Security Event Console</div><div class="content"><div class="fake-alert"><strong>Critical Findings</strong><br>14 foreign connections, 7 expired services, 31 loud red lines, and 0 actual evidence.</div><ul><li>Event 4102: made-up warning string</li><li>Event 8814: panic-inducing nonsense</li><li>Event 9930: "banking compromise" claim without proof</li></ul></div></div>` : ''}
  </div>`;
}

function desktopIcon(label, active) {
  return `<div class="desktop-icon"><div class="icon-box">${active ? 'ON' : 'OFF'}</div><div>${label}</div></div>`;
}

function shopHtml() {
  const cards = state.cardsBought.length
    ? state.cardsBought.map((card) => `<div class="gift-card"><div>Gift Card #${card.id}</div><div>$${card.value}</div><div>${card.code}</div></div>`).join('')
    : `<div class="gift-card"><div>No cards yet</div><div>$0</div><div>Use the controls on the right.</div></div>`;
  return `<div class="redeem-panel"><h3>Gift Card Store</h3><p>Scammers love gift cards because they convert your money into nearly irreversible codes.</p><div class="shop-grid">${cards}</div></div>`;
}

function redeemHtml() {
  return `<div class="redeem-panel">
    ${state.dnrTriggered ? '<div class="dnr-banner">DO NOT REDEEM!!!</div>' : ''}
    <h3>Redeem Counter</h3>
    <p>${state.cardsBought.length ? `Cards in hand: ${state.cardsBought.length}` : 'No cards bought yet.'}</p>
    <p>${state.cardsRedeemed ? 'Redemption attempt logged in the simulation.' : 'This is the point of no return in many gift-card scams.'}</p>
    <div class="fake-alert">Best practice: stop, hang up, and verify. Nobody legitimate needs this over the phone.</div>
    ${state.cardsBought.length ? `<ul>${state.cardsBought.map(card => `<li>${card.code} • $${card.value}</li>`).join('')}</ul>` : ''}
  </div>`;
}

function notesHtml() {
  const notes = [
    `Current beat: ${selectBeat()}`,
    `Support page opened: ${yn(state.supportPageOpened)}`,
    `Remote tool installed: ${yn(state.remoteToolInstalled)}`,
    `Remote access granted: ${yn(state.remoteGranted)}`,
    `Fake scan run: ${yn(state.fakeScanRun)}`,
    `Gift cards bought: ${state.cardsBought.length}`,
    `DNR triggered: ${yn(state.dnrTriggered)}`,
    `Mood: ${state.mood}`,
    `Server healthy: ${yn(state.serverHealthy)}`,
    `Mic mode: ${state.mic.mode}`,
    `Audio cue mode: contextual only`
  ].map((n) => `<li>${n}</li>`).join('');
  return `<div class="notebook"><h3>Trainer Notebook</h3><p>The uploaded audio cues are now triggered by context. They are not attached to buttons one-to-one.</p><ul>${notes}</ul></div>`;
}

function setActiveTab(name) {
  document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('active', b.dataset.screen === name));
}

function addTrainer(text) { pushTranscript('trainer', 'Trainer', text); }

function addScammer(text) {
  pushTranscript('scammer', 'Scammer', text);
  maybeContextualScammerClip(text);
  speakScammer(text);
}

function addPlayer(text, source = 'Typed') {
  pushTranscript('player', source === 'Mic' ? 'Player (Mic)' : 'Player', text);
}

function pushTranscript(role, label, text) {
  state.transcript.push({ role, label, text, at: Date.now() });
  renderTranscript();
}

function pushLesson(key, title, body) {
  if (state.lastLessonKeys.has(key)) return;
  state.lastLessonKeys.add(key);
  state.lessonCards.push({ key, title, body });
  renderLessons();
}

function maybeContextualScammerClip(reply) {
  const lower = reply.toLowerCase();
  if (/why did you redeem|do not redeem/.test(lower)) {
    if (lower.includes('why did')) return triggerContextualClip('redeem_attempt');
    return triggerContextualClip('do_not_redeem');
  }
  if ((state.mood >= 78 || /wasting my time|ridiculous|are you joking|stop this nonsense|listen to me/.test(lower)) && selectBeat().includes('redeem')) {
    triggerContextualClip('angry_peak');
  }
}

function handlePlayerMessage(text, source = 'Typed') {
  if (!text) return;
  interruptScammer();
  addPlayer(text, source);
  els.manualInput.value = '';
  const lower = text.toLowerCase();
  if (/banana toaster|alien|goat|microwave/.test(lower)) {
    addTrainer('Excellent bait. Confusion increases the scammer anger meter.');
    state.mood = Math.min(100, state.mood + 12);
    triggerContextualClip('confused_bait');
  }
  if (/should i redeem|do you want me to redeem|you want me to redeem|redeem\?/.test(lower)) {
    triggerContextualClip('do_not_redeem');
  }
  requestScammerReply(text);
}

function interruptScammer() {
  window.speechSynthesis.cancel();
  state.speaking = false;
  updateSprite(false);
}

function assessWorldFacts(playerText = '') {
  const facts = [];
  if (state.supportPageOpened) facts.push('the player has opened the support shortcut');
  if (state.supportSiteVisited) facts.push('the player sees a fake support portal with a 6 digit connection code');
  if (state.remoteToolInstalled) facts.push('the player installed a simulated remote tool');
  if (state.remoteGranted) facts.push('the player granted simulated remote access');
  if (state.fakeScanRun) facts.push('a fake scary scan has already been shown');
  if (state.cardsBought.length) facts.push(`the player bought ${state.cardsBought.length} gift cards totaling ${state.moneyPressure} dollars`);
  if (state.cardsRedeemed) facts.push('the player attempted a simulated redemption');
  if (state.dnrTriggered) facts.push('the player loudly triggered DO NOT REDEEM and interrupted the scam');
  if (/how|what do i do|where|open/i.test(playerText)) facts.push('the player is asking for the next step');
  if (/scam|faker|liar|bait|kitboga|payback/i.test(playerText)) facts.push('the player is openly baiting or accusing the scammer');
  if (/banana|toaster|microwave|goat|alien/i.test(playerText)) facts.push('the player is saying absurd nonsense to derail the scammer');
  state.liveFacts = facts;
}

async function requestScammerReply(playerText) {
  if (!state.missionStarted || state.mission.locked) return;
  if (state.pendingChat) {
    addTrainer('The scammer is still thinking. Give it a second or try again after the current turn finishes.');
    return;
  }
  if (!state.serverHealthy) await pingServer();
  assessWorldFacts(playerText);
  const beat = selectBeat();
  const systemPrompt = buildSystemPrompt(beat);
  const userPrompt = buildUserPrompt(playerText, beat);
  state.pendingChat = true;
  try {
    const reply = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: state.chatModel,
        messages: [
          { role: 'system', content: systemPrompt },
          ...state.history.slice(-6),
          { role: 'user', content: userPrompt }
        ]
      })
    });
    const data = await reply.json();
    if (!reply.ok) throw new Error(data.error || 'chat failed');
    const text = data.output?.trim();
    if (!text) throw new Error('empty reply');
    state.history.push({ role: 'user', content: userPrompt });
    state.history.push({ role: 'assistant', content: text });
    processScammerReply(text);
  } catch (err) {
    addTrainer(`AI reply failed: ${err.message}. Check the Server panel. If this keeps happening, keep the model set to llama-3.1-8b-instant.`);
  } finally {
    state.pendingChat = false;
  }
}

function buildSystemPrompt(beat) {
  return `You are the voice and personality engine for a defensive awareness game called Scammantha.
You are roleplaying a fake tech-support scammer in a training simulation so the player can learn scam tactics safely.
Do not break character, but keep the content educational and non-operational.
Never ask for real personal data, real credentials, real money transfer steps, or real company names.
Never provide real links, phone numbers, or real remote-access product names.
Use only generic references like support portal, remote tool, connection code, gift cards, redeem counter, password, or bank app.
You are improvising from scam beats, not reading a fixed script line.
The spoken vibe should feel like an Indian-English support-caller cadence, but do not imitate any specific real person.
Tone: ${state.mission.humorFlavor}.
Current beat to move toward: ${beat}.
Mission beats in order: ${state.mission.beats.join(' -> ')}.
Rules:
- Response length: 1 to 3 sentences.
- Stay concise to reduce latency and token cost.
- React directly to what the player just said or did.
- If the player derails you, spar with them briefly, then steer back toward the current beat.
- If the player asks how to do something on screen, reference simulation elements that already exist in-world, like the support portal, the code box, the remote tool, the gift card store, or the redeem counter.
- If the player triggers DO NOT REDEEM, show frustration or anger and attempt a last-second recovery, but do not provide real-world criminal instructions.
- Make the scammer manipulative, funny, impatient, and emotionally dynamic.
- Write in natural spoken dialogue with sentence variety, brief pauses, and emotional wording when angry.
- Do not output lists, speaker labels, JSON, stage directions, or markdown.`;
}

function buildUserPrompt(playerText, beat) {
  const worldFacts = state.liveFacts.length ? state.liveFacts.join('; ') : 'no major world actions yet';
  const recent = state.transcript.slice(-4).map((x) => `${x.label}: ${x.text}`).join('\n');
  return `Simulation state:
- beat: ${beat}
- visible world facts: ${worldFacts}
- mood meter: ${state.mood}/100
- risk level: ${state.risk}
- player message or event: ${playerText}

Recent transcript:
${recent}

Respond as the fake scammer.`;
}

function processScammerReply(reply) {
  if (/gift card|store|payment/i.test(reply)) state.risk = 'high';
  if (/redeem/i.test(reply)) state.risk = 'critical';
  if (state.dnrTriggered) state.risk = 'recovering';
  state.mood = Math.min(100, state.mood + inferMoodDelta(reply));
  inferLessonsFromReply(reply);
  addScammer(reply);
  renderAll();
}

function inferMoodDelta(reply) {
  let delta = 4;
  if (/listen|wasting|serious|stop|hurry|redeem now|why are you/i.test(reply)) delta += 8;
  if (/gift card|code|voucher|store/i.test(reply)) delta += 4;
  if (/thank you|good|perfect/i.test(reply)) delta -= 2;
  if (/ridiculous|joke|playing with me|nonsense/i.test(reply)) delta += 10;
  return delta;
}

function inferLessonsFromReply(reply) {
  const lower = reply.toLowerCase();
  if (lower.includes('remote')) pushLesson('reply-remote','Control attempt','The caller is trying to get hands-on access to the device. That is the pivot point of the scam.');
  if (lower.includes('gift card')) pushLesson('reply-gift','Payment reroute','Scammers may abandon normal payment channels because gift cards are faster and harder to reverse.');
  if (lower.includes('warning') || lower.includes('infected') || lower.includes('risk')) pushLesson('reply-fear','Manufactured fear','The scam works by making the problem feel bigger and more urgent than it is.');
}

function selectBeat() {
  if (state.dnrTriggered) return 'wrap_up_or_meltdown';
  if (!state.supportPageOpened) return 'get_user_to_open_support_portal';
  if (!state.supportSiteVisited || !state.remoteToolInstalled) return 'collect_fake_connection_code_and_install_remote_tool';
  if (!state.remoteGranted) return 'gain_remote_access_and_build_false_urgency';
  if (!state.fakeScanRun) return 'perform_fake_scan_and_claim_serious_risk';
  if (!state.cardsBought.length) return 'demand_payment_or_gift_cards';
  if (!state.cardsRedeemed && !state.dnrTriggered) return 'push_redeem_step_and_react_to_DO_NOT_REDEEM';
  return 'wrap_up_or_meltdown';
}

function pickVoice() {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  const prefLang = state.accent || 'en-IN';
  const langMatches = voices.filter(v => v.lang === prefLang || v.lang?.startsWith(prefLang.split('-')[0]));
  const maleHints = /male|david|daniel|alex|rishi|raj|aarav|google uk english male/i;

  const ranked = [...langMatches, ...voices].sort((a, b) => {
    const aScore = (maleHints.test(a.name) ? 2 : 0) + (a.lang === prefLang ? 2 : 0);
    const bScore = (maleHints.test(b.name) ? 2 : 0) + (b.lang === prefLang ? 2 : 0);
    return bScore - aScore;
  });

  return ranked[0] || voices[0];
}

function emotionProfile(text) {
  const lower = text.toLowerCase();
  const angry = state.mood >= 70 || /redeem now|listen to me|why are you|stop this|wasting my time|ridiculous|idiot|nonsense/.test(lower);
  const urgent = /right now|immediately|quickly|hurry/.test(lower);
  const calm = /thank you|good|perfect|okay/.test(lower);
  return { angry, urgent, calm };
}

function splitSpeech(text) {
  return text
    .split(/(?<=[\.\!\?])\s+/)
    .map(s => s.trim())
    .filter(Boolean);
}

function speakScammer(text) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const voice = pickVoice();
  const parts = splitSpeech(text);
  let idx = 0;

  const speakNext = () => {
    if (idx >= parts.length) {
      state.speaking = false;
      updateSprite(false);
      return;
    }
    const part = parts[idx++];
    const mood = emotionProfile(part);
    const u = new SpeechSynthesisUtterance(part);
    u.lang = state.accent || 'en-IN';
    if (voice) u.voice = voice;
    u.pitch = mood.angry ? 0.62 : mood.calm ? 0.76 : 0.70;
    u.rate = mood.angry ? 1.02 : mood.urgent ? 0.98 : 0.92;
    u.volume = 1;
    u.onstart = () => {
      state.speaking = true;
      updateSprite(true);
    };
    u.onend = () => {
      updateSprite(false);
      setTimeout(speakNext, mood.angry ? 80 : 130);
    };
    u.onerror = () => {
      state.speaking = false;
      updateSprite(false);
    };
    window.speechSynthesis.speak(u);
  };

  speakNext();
}

function updateSprite(talking) {
  els.spriteWrap.classList.toggle('talking', talking);
  els.spriteWrap.classList.toggle('idle', !talking);
  els.mouthPath.setAttribute('d', talking ? 'M102 144 Q120 162 138 144' : 'M104 144 Q120 153 136 144');
}

function randomDigits(n) { return Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join(''); }
function fakeGiftCode() { const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; return Array.from({length:4},()=>Array.from({length:4},()=>chars[Math.floor(Math.random()*chars.length)]).join('')).join('-'); }
function clamp(v,min,max){ return Math.max(min,Math.min(max,v)); }
function yn(v){ return v ? 'Yes' : 'No'; }
function escapeHtml(s){ return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
