
const giftOptions = [
  { brand: 'Steam', value: 25, cls: 'pc-steam', emoji: '🎮', copy: 'Fast digital delivery • scammer favorite', badge: 'Gaming wallet' },
  { brand: 'iTunes', value: 50, cls: 'pc-itunes', emoji: '🎵', copy: 'Looks harmless • transfers value instantly', badge: 'Media code' },
  { brand: 'Target', value: 100, cls: 'pc-target', emoji: '🛒', copy: 'Retail shelf classic • easy to cash out', badge: 'Retail cashout' },
  { brand: 'Razer Gold', value: 200, cls: 'pc-razer', emoji: '⚡', copy: 'Codes over cash • instant panic leverage', badge: 'Digital gold' }
];

const missions = [
  {
    id: 'mission-tech-support',
    title: 'Mission 1: Tech Support Panic',
    summary: 'A fake support line pressures you into remote access, fake diagnostics, and gift cards.',
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

const state = {
  mission: missions[0],
  missionStarted: false,
  currentScreen: 'desktop',
  supportShortcutOpened: false,
  supportSiteVisited: false,
  remoteToolInstalled: false,
  remoteGranted: false,
  fakeScanRun: false,
  cardsBought: [],
  cardsRedeemed: false,
  dnrTriggered: false,
  moneyPressure: 0,
  transcript: [],
  lessonCards: [],
  lessonKeys: new Set(),
  mood: 10,
  risk: 'calm',
  supportCode: randomDigits(6),
  serverHealthy: false,
  history: [],
  pendingChat: false,
  chatModel: 'llama-3.1-8b-instant',
  accent: 'en-IN',
  fakeScanLines: [],
  fakeScanTimer: null,
  soundsReady: false,
  sounds: {},
  ttsReady: 'speechSynthesis' in window,
  selectedGift: { brand: 'Steam', value: 25, cls: 'pc-steam', emoji: '🎮', copy: 'Fast digital delivery • scammer favorite', badge: 'Gaming wallet' },
  sprite: {
    frame: 0,
    timer: null,
    mode: 'calm',
    speaking: false
  },
  mic: {
    mode: 'none',
    running: false,
    wanted: false,
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

const SOUND_FILES = {
  dnr: '/assets/sounds/do-not-redeem.mp3',
  whyredeem: '/assets/sounds/why-did-u-redeem-it.mp3',
  angry: '/assets/sounds/angry-anime-girl.mp3',
  oi: '/assets/sounds/oi-oi-oe.mp3',
  wow: '/assets/sounds/wow-anime-voice-accent.mp3',
  omg: '/assets/sounds/omfgnene.mp3',
  senpai: '/assets/sounds/anime-girl-senpai.mp3'
};

const els = {};
window.addEventListener('load', init);

function init() {
  mapEls();
  initSounds();
  renderMissionList();
  renderGuide();
  bindEvents();
  renderAll();
  addTrainer('Welcome to Scammantha. You can press Start Mission, or just start typing and the sim will auto-start.');
  pingServer();
  detectMicCapabilities();
  initVoices();
}

function mapEls() {
  ['missionList','missionTitle','objectiveText','guideList','lessonFeed','coachCard','serverBadge','simScreen',
   'transcript','manualInput','micStatus','stageBadge','tacticBadge','riskBadge','moodFill','moodLabel']
    .forEach(id => els[id] = document.getElementById(id));
}

function initVoices() {
  if (!('speechSynthesis' in window)) {
    state.ttsReady = false;
    return;
  }
  const loadVoices = () => {
    const voices = window.speechSynthesis.getVoices();
    state.ttsReady = !!window.speechSynthesis && (voices.length > 0 || 'SpeechSynthesisUtterance' in window);
  };
  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
}

function initSounds() {
  Object.entries(SOUND_FILES).forEach(([key, file]) => {
    const audio = new Audio(file);
    audio.preload = 'auto';
    state.sounds[key] = audio;
  });
}

function unlockSounds() {
  if (state.soundsReady) return;
  Object.values(state.sounds).forEach(audio => {
    audio.play().then(() => { audio.pause(); audio.currentTime = 0; }).catch(() => {});
  });
  state.soundsReady = true;
}

function playSound(key) {
  const audio = state.sounds[key];
  if (!audio) return;
  Object.values(state.sounds).forEach(a => { if (a !== audio) a.pause(); });
  audio.currentTime = 0;
  audio.play().catch(() => {});
}

function bindEvents() {
  document.getElementById('startMissionBtn').addEventListener('click', startMission);
  document.getElementById('unlockMicBtn').addEventListener('click', async () => {
    unlockSounds();
    await unlockMic();
  });
  document.getElementById('toggleMicBtn').addEventListener('click', async () => {
    if (state.mic.running) await stopMic(); else await startMic();
  });
  document.getElementById('interruptBtn').addEventListener('click', interruptScammer);
  document.getElementById('sendManualBtn').addEventListener('click', () => handlePlayerMessage(els.manualInput.value.trim()));
  els.manualInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handlePlayerMessage(els.manualInput.value.trim());
    }
  });

  document.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.currentScreen = btn.dataset.screen;
      renderScreen();
    });
  });

  document.getElementById('openSupportBtn').addEventListener('click', () => {
    state.supportShortcutOpened = true;
    addTrainer('Shortcut opened. Notice how the scammer tries to control the next click.');
    pushLesson('shortcut', 'Control the path', 'Scammers do not want you to look up the company independently. They want to keep you inside their script.');
    renderAll();
    requestScammerReply('player_opened_support_shortcut');
  });

  document.getElementById('visitSupportBtn').addEventListener('click', () => {
    if (!state.supportShortcutOpened) return addTrainer('Open the support shortcut first.');
    state.supportSiteVisited = true;
    addTrainer('You visited the fake support site. This is where the caller tries to make the page feel official.');
    renderAll();
    requestScammerReply('player_visited_support_site');
  });

  document.getElementById('installToolBtn').addEventListener('click', () => {
    if (!state.supportSiteVisited) return addTrainer('Visit the support site first.');
    state.remoteToolInstalled = true;
    pushLesson('remote', 'Remote access pivot', 'Once you install a remote tool, the scam shifts from social pressure to direct control.');
    addTrainer('Remote tool installed in the simulation.');
    renderAll();
    requestScammerReply('player_installed_remote_tool');
  });

  document.getElementById('grantRemoteBtn').addEventListener('click', () => {
    if (!state.remoteToolInstalled) return addTrainer('Install the tool first.');
    state.remoteGranted = true;
    addTrainer('Remote access granted in the simulation.');
    renderAll();
    requestScammerReply('player_granted_remote_access');
  });

  document.getElementById('runScanBtn').addEventListener('click', () => {
    if (!state.remoteGranted) return addTrainer('Grant remote access before the fake scan.');
    state.fakeScanRun = true;
    state.risk = 'high';
    state.currentScreen = 'desktop';
    startFakeScanAnimation();
    playSound('wow');
    pushLesson('scan', 'Fear theater', 'The command prompt and red warnings are there to create urgency, not to prove a real diagnosis.');
    addTrainer('Fake scan launched. Watch how visuals are used to manufacture panic.');
    renderAll();
    requestScammerReply('player_ran_fake_scan');
  });

  document.getElementById('buyCardsBtn').addEventListener('click', () => {
    const count = clamp(parseInt(document.getElementById('cardCountInput').value || '0', 10), 1, 20);
    const value = clamp(parseInt(document.getElementById('cardValueInput').value || '0', 10), 5, 500);
    buyGiftCards(count, value, state.selectedGift.brand);
  });
}

function renderMissionList() {
  els.missionList.innerHTML = '';
  missions.forEach(m => {
    const btn = document.createElement('button');
    btn.className = `mission-card ${state.mission.id === m.id ? 'active' : ''}`;
    btn.innerHTML = `<h3>${m.title}${m.locked ? ' 🔒' : ''}</h3><p>${m.summary}</p>`;
    btn.addEventListener('click', () => {
      state.mission = m;
      renderMissionList();
      renderGuide();
      renderAll();
      addTrainer(m.locked ? 'That mission slot is reserved for a future scam.' : `${m.title} selected.`);
    });
    els.missionList.appendChild(btn);
  });
}

function renderGuide() {
  els.guideList.innerHTML = '';
  (state.mission.tips || []).forEach(tip => {
    const li = document.createElement('li');
    li.textContent = tip;
    els.guideList.appendChild(li);
  });
}

function ensureMissionStarted(trigger = 'manual_input') {
  if (state.missionStarted || state.mission.locked) return false;
  state.missionStarted = true;
  state.currentScreen = 'desktop';
  state.risk = 'calm';
  state.supportCode = randomDigits(6);
  addTrainer('Mission auto-started so the scammer can respond immediately.');
  renderAll();
  return true;
}

function startMission() {
  if (state.mission.locked) return addTrainer('Start the unlocked mission first.');
  Object.assign(state, {
    missionStarted: true,
    currentScreen: 'desktop',
    supportShortcutOpened: false,
    supportSiteVisited: false,
    remoteToolInstalled: false,
    remoteGranted: false,
    fakeScanRun: false,
    cardsBought: [],
    cardsRedeemed: false,
    dnrTriggered: false,
    moneyPressure: 0,
    transcript: [],
    lessonCards: [],
    lessonKeys: new Set(),
    mood: 10,
    risk: 'calm',
    supportCode: randomDigits(6),
    history: [],
    fakeScanLines: [],
    selectedGift: giftOptions[0]
  });
  stopFakeScanAnimation();
  stopSpriteAnimation();
  setSpriteMoodClass();
  renderAll();
  addTrainer('Mission started. Waste the scammer’s time, but also learn exactly what they are trying to do to you.');
  requestScammerReply('mission_started');
}

function renderAll() {
  els.missionTitle.textContent = state.mission.title;
  els.objectiveText.textContent = 'Break the script, spot the manipulation, and stop the money from leaving.';
  updateHud();
  renderTranscript();
  renderLessons();
  renderCoachCard();
  renderScreen();
}

function renderCoachCard() {
  const status = state.serverHealthy ? 'Groq brain online.' : 'Backend not ready yet.';
  els.coachCard.innerHTML = `<strong>Mission Control</strong><p>${status} Keep the caller talking, ask annoying questions, and never move real money.</p>`;
  els.serverBadge.textContent = state.serverHealthy ? 'Ready' : 'Offline';
}

function updateHud() {
  const stage = getStageLabel();
  els.stageBadge.textContent = `Stage: ${stage}`;
  els.tacticBadge.textContent = `Tactic: ${getTacticLabel()}`;
  els.riskBadge.textContent = `Risk: ${state.risk}`;
  els.moodFill.style.width = `${Math.max(8, state.mood)}%`;
  const label = state.mood >= 78 ? 'Furious' : state.mood >= 48 ? 'Annoyed' : 'Calm';
  els.moodLabel.textContent = label;
  setSpriteMoodClass();
}

function setSpriteMoodClass() {
  const sprite = document.getElementById('scammerSprite');
  if (!sprite) return;
  sprite.classList.remove('calm','talking','angry');
  if (state.mood >= 78) {
    sprite.classList.add('angry');
    state.sprite.mode = 'angry';
  } else {
    sprite.classList.add(state.sprite.speaking ? 'talking' : 'calm');
    state.sprite.mode = state.sprite.speaking ? 'talking' : 'calm';
  }
}

function renderTranscript() {
  els.transcript.innerHTML = '';
  state.transcript.forEach(entry => {
    const div = document.createElement('div');
    div.className = `line ${entry.role}`;
    div.innerHTML = `<span class="speaker">${entry.label}</span><div>${escapeHtml(entry.text)}</div>`;
    els.transcript.appendChild(div);
  });
  els.transcript.scrollTop = els.transcript.scrollHeight;
}

function renderLessons() {
  els.lessonFeed.innerHTML = '';
  const cards = state.lessonCards.length ? state.lessonCards : [{ title: 'Watch the pattern', body: 'Every step in the script is trying to move you toward speed, isolation, and loss.' }];
  cards.slice(-5).forEach(card => {
    const div = document.createElement('div');
    div.className = 'lesson-card';
    div.innerHTML = `<strong>${escapeHtml(card.title)}</strong><div>${escapeHtml(card.body)}</div>`;
    els.lessonFeed.appendChild(div);
  });
}

function renderScreen() {
  if (state.currentScreen === 'giftstore') { els.simScreen.innerHTML = renderGiftStoreScreen(); attachGiftCardClicks(); return; }
  if (state.currentScreen === 'redeem') {
    els.simScreen.innerHTML = renderRedemptionPortalScreen();
    attachRedeemPortalEvents();
    return;
  }
  if (state.currentScreen === 'notes') return els.simScreen.innerHTML = renderNotesScreen();
  els.simScreen.innerHTML = state.fakeScanRun ? renderCmdScreen() : (state.supportSiteVisited ? renderPortalScreen() : renderDesktopScreen());
}

function renderDesktopScreen() {
  return `
    <div class="desktop-screen">
      <div class="desktop-grid">
        ${desktopIcon('🛡️','Support Hub')}
        ${desktopIcon('🖥️','Remote Tool')}
        ${desktopIcon('💳','Gift Cards')}
        ${desktopIcon('📄','Logs')}
      </div>

      ${state.supportShortcutOpened ? `
      <div class="desktop-window window-support">
        <div class="title">PC Defender Care</div>
        <div class="body">
          <div style="font-size:24px;font-weight:800">Quick Assist Shortcut</div>
          <div style="margin-top:10px;color:#4f2130">This is the sort of polished shortcut page that makes the scam look official.</div>
          <div class="alert-card">Cold callers want speed. Real support starts with you verifying the real company yourself.</div>
        </div>
      </div>` : ''}

      ${state.remoteToolInstalled ? `
      <div class="desktop-window window-remote">
        <div class="title">Remote Session</div>
        <div class="body">
          <div><strong>Partner code:</strong> ${state.supportCode}</div>
          <div style="margin-top:10px"><strong>Status:</strong> ${state.remoteGranted ? 'Connected' : 'Waiting for approval'}</div>
          <div style="margin-top:12px;color:#4f2130">Once the caller gets this far, they often tell you not to touch your own mouse or keyboard.</div>
        </div>
      </div>` : ''}

      <div class="desktop-taskbar">
        <div>Search</div>
        <div>${new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
      </div>
    </div>`;
}

function desktopIcon(icon, label) {
  return `<div class="desktop-icon"><div class="icon-box"><div class="icon-glyph">${icon}</div></div><div>${label}</div></div>`;
}

function renderPortalScreen() {
  return `
    <div class="portal-screen">
      <div class="portal-hero">
        <div style="font-size:14px;opacity:.88">Secure Support Portal</div>
        <div style="font-size:36px;font-weight:900;margin-top:4px">Device Protection & Recovery Center</div>
        <p>This page is designed to feel polished, urgent, and official. That is the point. The scammer wants your trust before your skepticism catches up.</p>
        <div class="portal-nav">
          <span>24/7 Specialist Desk</span>
          <span>Encrypted Session</span>
          <span>Priority Malware Removal</span>
          <span>Refund Escalation Team</span>
        </div>
      </div>

      <div class="portal-grid">
        <div class="portal-card">
          <div style="font-size:26px;font-weight:900">Enter your partner code</div>
          <div class="portal-code">${state.supportCode}</div>
          <div style="color:#5f2330">The scammer wants you to treat this code like proof. It is just a control handoff in a nicer costume.</div>
          <div class="portal-cta">
            <div><strong>1.</strong> Accept the session</div>
            <div><strong>2.</strong> Install the tool</div>
            <div><strong>3.</strong> Let the “scan” begin</div>
          </div>
        </div>
        <div class="portal-card dark">
          <div style="font-size:22px;font-weight:900">Customer Reassurance Center</div>
          <div style="margin-top:10px;color:#ffe8ec">• Certified recovery team</div>
          <div style="margin-top:6px;color:#ffe8ec">• File protection protocol</div>
          <div style="margin-top:6px;color:#ffe8ec">• Secure desktop session</div>
          <div class="portal-warning">Legitimate companies do not rely on fear, countdown energy, and pressure to keep you from verifying them.</div>
        </div>
      </div>
    </div>`;
}

function renderCmdScreen() {
  return `
    <div class="cmd-screen">
      <div class="cmd-head">
        <div>Administrator: Security Event Console</div>
        <div>LIVE SCAN</div>
      </div>
      <div class="cmd-body">${escapeHtml((state.fakeScanLines.length ? state.fakeScanLines.join('\\n') : 'Initializing fake security scan...'))}<span class="cursor"></span></div>
      <div class="cmd-progress-wrap">
        <div style="margin-bottom:8px;color:#cfe3ff">Threat correlation in progress...</div>
        <div class="cmd-progress"><div></div></div>
      </div>
    </div>`;
}

function renderGiftStoreScreen() {
  const cartRows = state.cardsBought.length
    ? state.cardsBought.map(card => `<div class="bundle-row"><span>${card.brand} • ${card.code.slice(0,4)}...</span><strong>$${card.value}</strong></div>`).join('')
    : `<div class="bundle-row"><span>No cards in cart</span><strong>$0</strong></div>`;
  const selectedLabel = `${state.selectedGift.brand} • $${state.selectedGift.value}`;
  const cardsMarkup = giftOptions.map(option => `
    <div class="product-card ${option.cls} ${state.selectedGift.brand === option.brand ? 'selected' : ''}" data-brand="${option.brand}" data-value="${option.value}">
      <div class="product-top"><div class="product-brand">${option.brand}</div><div>${option.emoji}</div></div>
      <div class="product-price">$${option.value}</div>
      <div class="product-copy">${option.copy}</div>
      <div class="product-badge">${option.badge}</div>
    </div>`).join('');

  return `
    <div class="giftstore-screen">
      <div class="store-nav">
        <div class="store-logo">GiftCardHub</div>
        <div class="store-links"><span>Gaming</span><span>Shopping</span><span>Music</span><span>Digital</span></div>
      </div>

      <div class="store-hero">
        <div style="font-size:14px;opacity:.88">SIMULATED RETAIL CHECKOUT</div>
        <h3>Gift Card Store</h3>
        <p>Scammers love gift cards because they convert your money into a fast, nearly irreversible code. In the simulation, you can deliberately underbuy to make them furious.</p>
      </div>

      <div class="store-main">
        <div class="store-cards">${cardsMarkup}</div>

        <div class="store-sidebar">
          <div style="font-size:24px;font-weight:900">Cart Summary</div>
          <div class="sidebar-box">${cartRows}</div>
          <div class="sidebar-box">
            <div style="font-weight:800">Current selection</div>
            <div class="bundle-row"><span>${selectedLabel}</span><strong>Ready</strong></div>
            <div class="bundle-row"><span>Starter panic bundle</span><strong>$50</strong></div>
            <div class="bundle-row"><span>Urgent security bundle</span><strong>$100</strong></div>
          </div>
        </div>
      </div>
    </div>`;
}

function renderRedemptionPortalScreen() {
  const totalValue = state.cardsBought.reduce((sum, card) => sum + card.value, 0);
  const fee = totalValue ? Math.max(0, Math.round(totalValue * 0.04)) : 0;
  const payout = Math.max(0, totalValue - fee);
  const receiptRows = state.cardsBought.length
    ? state.cardsBought.map(card => `
      <div class="receipt-row">
        <div>
          <strong>${card.brand}</strong>
          <div class="receipt-sub">Card ${card.id} • ${card.code}</div>
        </div>
        <strong>$${card.value}</strong>
      </div>`).join('')
    : `<div class="receipt-row"><div><strong>No cards loaded</strong><div class="receipt-sub">Buy cards in the store first.</div></div><strong>$0</strong></div>`;

  const statusCopy = state.cardsRedeemed
    ? 'Transfer complete. In a real scam, the value would already be gone.'
    : state.cardsBought.length
      ? 'Gift cards detected. The scammer would now pressure you to redeem every code.'
      : 'No active inventory. Buy gift cards before this page can be used.';

  return `
    <div class="redeem-page">
      <div class="redeem-sitebar">
        <div class="redeem-brand">
          <div class="redeem-brand-mark">R</div>
          <div>
            <div class="redeem-brand-title">Redemption Center</div>
            <div class="redeem-brand-sub">Secure balance transfer simulation</div>
          </div>
        </div>
        <div class="redeem-site-links">
          <span>Dashboard</span><span>Orders</span><span>Card Vault</span><span>Support Chat</span>
        </div>
      </div>

      <div class="redeem-hero-card">
        <div>
          <div class="redeem-overline">PAYOUT WORKFLOW</div>
          <h3>Gift Card Balance Redemption</h3>
          <p>This page is supposed to feel polished and trustworthy. That is how the scammer keeps you moving instead of stopping to think.</p>
        </div>
        <div class="redeem-hero-metrics">
          <div><span>Total cards</span><strong>${state.cardsBought.length}</strong></div>
          <div><span>Balance loaded</span><strong>$${totalValue}</strong></div>
          <div><span>Status</span><strong>${state.cardsRedeemed ? 'Completed' : (state.cardsBought.length ? 'Ready' : 'Locked')}</strong></div>
        </div>
      </div>

      <div class="redeem-layout">
        <div class="redeem-left-col">
          <div class="redeem-box">
            <div class="redeem-box-head">
              <div>
                <div class="redeem-box-title">Transfer details</div>
                <div class="redeem-box-copy">A realistic-looking payout form that turns codes into loss.</div>
              </div>
              <span class="badge-real">Simulation only</span>
            </div>
            <div class="portal-field"><label>Operator email</label><div class="portal-input">support-session@balance-center.help</div></div>
            <div class="portal-field"><label>Payout destination</label><div class="portal-input">Digital wallet • instant transfer lane</div></div>
            <div class="portal-field"><label>Case reference</label><div class="portal-input">RC-${state.supportCode}-${String(state.cardsBought.length || 0).padStart(2, '0')}</div></div>
            <div class="portal-field"><label>Redemption status</label><div class="portal-input">${statusCopy}</div></div>
          </div>

          <div class="redeem-box">
            <div class="redeem-box-title">Loaded card inventory</div>
            <div class="receipt-list">${receiptRows}</div>
          </div>
        </div>

        <div class="redeem-right-col">
          <div class="redeem-box redeem-action-box">
            <div class="redeem-box-title">Settlement summary</div>
            <div class="summary-grid">
              <div class="summary-row"><span>Submitted balance</span><strong>$${totalValue}</strong></div>
              <div class="summary-row"><span>Processing fee</span><strong>$${fee}</strong></div>
              <div class="summary-row total"><span>Instant payout</span><strong>$${payout}</strong></div>
            </div>
            <button id="redeemEverythingBtn" class="redeem-everything-btn" ${state.cardsBought.length ? '' : 'disabled'}>${state.cardsRedeemed ? 'Redeemed' : 'Redeem Everything'}</button>
            <div class="preview-warning">This is the final pressure point. Once a gift card code is redeemed, the value is usually gone for good.</div>
          </div>

          <div class="redeem-box">
            <div class="redeem-box-title">Red flags</div>
            <ul class="redeem-flag-list">
              <li>Urgency replaces verification.</li>
              <li>Professional design is being used as camouflage.</li>
              <li>The whole flow exists to convert real money into codes.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>`;
}

function attachRedeemPortalEvents() {
  const btn = document.getElementById('redeemEverythingBtn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    if (!state.cardsBought.length || state.cardsRedeemed) return;
    state.cardsRedeemed = true;
    state.risk = 'loss';
    playSound('whyredeem');
    addTrainer('Redemption attempt triggered in the simulation. This is where the money would be lost.');
    renderAll();
    requestScammerReply(`player_attempted_redeem:${state.cardsBought.map(card => card.code).join(', ')}`);
  });
}

function renderNotesScreen() {
  return `
    <div class="notes-screen">
      <div class="notes-grid">
        <div class="note-card">
          <strong>Mission state</strong>
          <div style="margin-top:8px">Support page: ${yesNo(state.supportShortcutOpened)}</div>
          <div style="margin-top:6px">Remote tool: ${yesNo(state.remoteToolInstalled)}</div>
          <div style="margin-top:6px">Remote access: ${yesNo(state.remoteGranted)}</div>
          <div style="margin-top:6px">Fake scan: ${yesNo(state.fakeScanRun)}</div>
        </div>
        <div class="note-card">
          <strong>Money risk</strong>
          <div style="margin-top:8px">Cards bought: ${state.cardsBought.length}</div>
          <div style="margin-top:6px">Total pressure: $${state.moneyPressure}</div>
          <div style="margin-top:6px">Redeem triggered: ${yesNo(state.cardsRedeemed)}</div>
          <div style="margin-top:6px">Do Not Redeem: ${yesNo(state.dnrTriggered)}</div>
        </div>
        <div class="note-card">
          <strong>Scammer energy</strong>
          <div style="margin-top:8px">Mood: ${state.mood}</div>
          <div style="margin-top:6px">Current tactic: ${getTacticLabel()}</div>
          <div style="margin-top:6px">Current stage: ${getStageLabel()}</div>
          <div style="margin-top:6px">Risk level: ${state.risk}</div>
        </div>
      </div>
    </div>`;
}


function attachGiftCardClicks() {
  document.querySelectorAll('.product-card').forEach(card => {
    card.addEventListener('click', () => {
      const brand = card.dataset.brand;
      const value = Number(card.dataset.value);
      state.selectedGift = giftOptions.find(x => x.brand === brand) || giftOptions[0];
      document.getElementById('cardValueInput').value = value;
      document.getElementById('cardCountInput').value = 1;
      addTrainer(`${brand} selected. The purchase controls were updated.`);
      renderAll();
    });
  });
}

function buyGiftCards(count, value, brand) {
  state.cardsBought = Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    value,
    code: fakeGiftCode(),
    brand: brand || state.selectedGift.brand
  }));
  state.moneyPressure = count * value;
  state.currentScreen = 'giftstore';
  setActiveTab('giftstore');
  addTrainer(`Purchased ${count} ${brand || state.selectedGift.brand} card(s) at $${value} each in the simulation.`);
  pushLesson('giftcards', 'Payment reroute', 'Gift cards are fast, hard to reverse, and easy for scammers to liquidate.');
  if (state.moneyPressure < 100) playSound('omg');
  renderAll();
  requestScammerReply(`player_bought_gift_cards_total_${state.moneyPressure}`);
}

function setActiveTab(name) {
  document.querySelectorAll('.tab').forEach(btn => btn.classList.toggle('active', btn.dataset.screen === name));
}

function pushLesson(key, title, body) {
  if (state.lessonKeys.has(key)) return;
  state.lessonKeys.add(key);
  state.lessonCards.push({ title, body });
  renderLessons();
}

function addTrainer(text) { pushTranscript('trainer', 'Trainer', text); }
function addPlayer(text, source = 'Typed') { pushTranscript('player', source === 'Mic' ? 'Player (Mic)' : 'Player', text); }
function addScammer(text) {
  pushTranscript('scammer', 'Scammer', text);
  if (/redeem/i.test(text) && !state.dnrTriggered) state.risk = 'critical';
  speakScammer(text);
}
function pushTranscript(role, label, text) {
  state.transcript.push({ role, label, text });
  renderTranscript();
}

function maybeSoundForContext(playerText = '', scammerReply = '') {
  const text = `${playerText} ${scammerReply}`.toLowerCase();
  if (/do not redeem|should i redeem|want me to redeem/.test(text)) return playSound('dnr');
  if (/why did you redeem|redeem now|read the code/.test(text)) return playSound('whyredeem');
  if (/banana|toaster|alien|microwave|goat/.test(text)) return playSound('oi');
  if (/ridiculous|wasting my time|nonsense|listen to me/.test(text) || state.mood > 78) return playSound('angry');
}

function handlePlayerMessage(text, source = 'Typed') {
  if (!text) return;
  unlockSounds();
  ensureMissionStarted('player_message');
  interruptScammer();
  addPlayer(text, source);
  els.manualInput.value = '';
  if (/banana|toaster|alien|microwave|goat/i.test(text)) {
    addTrainer('That was excellent bait. Confusion usually makes the scammer more emotional.');
    state.mood = Math.min(100, state.mood + 12);
  }
  maybeSoundForContext(text, '');
  requestScammerReply(text);
}

async function requestScammerReply(playerText) {
  if (state.mission.locked) return;
  ensureMissionStarted('chat_request');
  if (state.pendingChat) return addTrainer('Give the scammer a second. The current turn is still being generated.');
  state.pendingChat = true;
  const stage = getStageLabel();
  const systemPrompt = buildSystemPrompt(stage);
  const userPrompt = buildUserPrompt(playerText, stage);

  try {
    const res = await fetch('/api/chat', {
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
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'chat failed');
    const output = (data.output || '').trim() || generateFallbackScammerReply(playerText);
    if (data.offline && data.fallbackReason) addTrainer(`Groq fallback active: ${data.fallbackReason}`);
    state.history.push({ role: 'user', content: userPrompt });
    state.history.push({ role: 'assistant', content: output });
    state.mood = Math.min(100, state.mood + inferMoodDelta(output, playerText));
    maybeSoundForContext(playerText, output);
    inferLessons(output);
    addScammer(output);
    renderAll();
  } catch (err) {
    const fallback = generateFallbackScammerReply(playerText);
    addTrainer(`AI reply failed: ${err.message}. Using offline scammer mode.`);
    state.history.push({ role: 'user', content: userPrompt });
    state.history.push({ role: 'assistant', content: fallback });
    state.mood = Math.min(100, state.mood + inferMoodDelta(fallback, playerText));
    maybeSoundForContext(playerText, fallback);
    inferLessons(fallback);
    addScammer(fallback);
    renderAll();
  } finally {
    state.pendingChat = false;
  }
}

function buildSystemPrompt(stage) {
  return `You are the fake scammer in a defensive training game called Scammantha.
Stay fully in character as a fake tech-support scammer, but keep the content educational and non-operational.
Never provide real phone numbers, real links, real remote-access brand names, real payment instructions, or requests for actual private data.
Use generic phrases like support portal, remote tool, partner code, gift cards, redemption portal, scan, and secure session.
Current stage: ${stage}.
Tone: irritated, manipulative, sometimes funny, increasingly angry when baited.
Rules:
- Reply in 1 to 3 spoken sentences.
- If the player derails you, spar briefly, then steer back to the current stage.
- If the player asks what to click, reference only visible simulation elements.
- If the player approaches redeeming cards, become urgent or angry.
- Sound like an Indian-English support caller in cadence, but do not imitate any specific real person.
- No lists, no markdown, no JSON.`;
}

function buildUserPrompt(playerText, stage) {
  const facts = [
    state.supportShortcutOpened ? 'support shortcut opened' : 'support shortcut not opened',
    state.supportSiteVisited ? 'fake support site visited' : 'support site not visited',
    state.remoteToolInstalled ? 'remote tool installed' : 'remote tool not installed',
    state.remoteGranted ? 'remote access granted' : 'remote access not granted',
    state.fakeScanRun ? 'fake scan already shown' : 'fake scan not shown',
    state.cardsBought.length ? `${state.cardsBought.length} gift cards bought totaling ${state.moneyPressure}` : 'no gift cards bought',
    state.cardsRedeemed ? 'redemption attempted' : 'redemption not attempted',
    state.dnrTriggered ? 'do not redeem triggered' : 'do not redeem not triggered'
  ].join('; ');
  const recent = state.transcript.slice(-4).map(x => `${x.label}: ${x.text}`).join('\n');
  return `Stage: ${stage}
Game state: ${facts}
Player said or did: ${playerText}

Recent transcript:
${recent}

Respond as the fake scammer.`;
}

function generateFallbackScammerReply(playerText) {
  const lower = String(playerText || '').toLowerCase();
  const angry = state.mood >= 78;
  if (lower.includes('mission_started')) return 'Hello maam, your computer security is in very dangerous condition. Please stay on the line and follow my steps very carefully.';
  if (lower.includes('player_opened_support_shortcut')) return 'Yes yes, that is the correct support page. Now do not close it, just continue exactly as I am telling you.';
  if (lower.includes('player_visited_support_site')) return 'Very good. You can see this is the secure portal, so now we must connect your device before the infection spreads more.';
  if (lower.includes('player_installed_remote_tool')) return 'Excellent. I am sending you the partner code now, and after that I will inspect the foreign connections on your system.';
  if (lower.includes('player_granted_remote_access')) return 'Now please do not touch the mouse. Let me run the security session so I can show you the corruption entering your computer.';
  if (lower.includes('player_ran_fake_scan')) return 'Can you see all these warnings? This is exactly why I told you the matter is urgent and cannot be delayed.';
  if (lower.includes('player_bought_gift_cards_total_')) return angry ? 'Why you bought such a small amount? I told you this is the secure payment clearance, so do not waste my time now.' : 'Good. Keep the cards ready, because once the balance is confirmed we have to move to the redemption portal immediately.';
  if (lower.includes('player_attempted_redeem')) return 'Why did you redeem it so fast? Read every code properly and do not make mistakes on this secure transfer step.';
  if (lower.includes('banana') || lower.includes('toaster') || lower.includes('alien') || lower.includes('goat')) return 'Why are you talking nonsense right now? This is a serious security matter, so stop joking and focus on the payment step.';
  if (lower.includes('redeem')) return 'Yes, open the redemption portal and redeem everything one by one so the balance can be secured.';
  if (lower.includes('gift card') || lower.includes('code')) return 'Read me the card details carefully. The faster you do it, the faster I can secure your funds.';
  if (lower.includes('who are you') || lower.includes('real company')) return 'I am calling from the secure support desk and we do not have time for this verification loop because your device is actively compromised.';
  return angry
    ? 'Listen to me carefully now. Stop delaying and follow the secure steps exactly as I am telling you.'
    : 'Maam, just stay calm and continue with me step by step so I can finish this security process for you.';
}

function inferMoodDelta(reply, playerText) {
  let delta = 4;
  const text = `${reply} ${playerText}`.toLowerCase();
  if (/banana|toaster|alien|microwave|goat/.test(text)) delta += 10;
  if (/gift card|redeem|code/.test(text)) delta += 7;
  if (/ridiculous|listen|stop|wasting|serious|why are you/.test(text)) delta += 8;
  return delta;
}

function inferLessons(reply) {
  const lower = reply.toLowerCase();
  if (/remote|session|control/.test(lower)) pushLesson('remote-reply', 'Device takeover', 'The scammer is trying to normalize remote control as “help.”');
  if (/warning|infected|compromised|risk/.test(lower)) pushLesson('fear-reply', 'Escalation script', 'Notice how technical-sounding fear is used to speed you up.');
  if (/gift card|redeem|code/.test(lower)) pushLesson('money-reply', 'Loss extraction', 'The technical script has now turned into a money script.');
}

function speakScammer(text) {
  if (!('speechSynthesis' in window) || !text) return;
  try { window.speechSynthesis.resume(); } catch {}
  window.speechSynthesis.cancel();
  startSpriteAnimation();
  const voice = pickVoice();
  const lines = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  let i = 0;

  const speakNext = () => {
    if (i >= lines.length) {
      stopSpriteAnimation();
      return;
    }
    const utter = new SpeechSynthesisUtterance(lines[i++]);
    const angry = state.mood >= 78 || /redeem|listen|hurry|stop|why are you/i.test(utter.text);
    if (voice) {
      utter.voice = voice;
      utter.lang = voice.lang || state.accent || 'en-US';
    } else {
      utter.lang = 'en-US';
    }
    utter.rate = angry ? 1.02 : 0.93;
    utter.pitch = angry ? 0.62 : 0.72;
    utter.volume = 1;
    utter.onstart = () => {
      state.ttsReady = true;
      state.sprite.speaking = true;
      startSpriteAnimation(angry ? 'angry' : 'talking');
    };
    utter.onend = () => setTimeout(speakNext, angry ? 70 : 120);
    utter.onerror = () => {
      state.ttsReady = false;
      stopSpriteAnimation();
      addTrainer('Browser TTS could not play that line. Check browser audio permissions or try Chrome or Edge.');
    };
    try {
      window.speechSynthesis.speak(utter);
    } catch {
      stopSpriteAnimation();
    }
  };

  setTimeout(speakNext, 30);
}

function pickVoice() {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  return voices.find(v => /india/i.test(`${v.name} ${v.lang}`))
    || voices.find(v => v.lang === 'en-IN')
    || voices.find(v => /english/i.test(v.name) && v.lang.startsWith('en'))
    || voices.find(v => v.lang.startsWith('en'))
    || voices[0];
}

function startSpriteAnimation(forceMode) {
  const sprite = document.getElementById('scammerSprite');
  if (!sprite) return;
  stopSpriteAnimation();
  state.sprite.speaking = true;
  state.sprite.mode = forceMode || (state.mood >= 78 ? 'angry' : 'talking');
  sprite.classList.remove('calm','talking','angry');
  sprite.classList.add(state.sprite.mode);
  state.sprite.frame = 0;
  sprite.classList.remove('frame-0','frame-1','frame-2');
  sprite.classList.add('frame-0');
  const sequence = [0, 1, 2, 1];
  let seqIndex = 0;
  state.sprite.timer = setInterval(() => {
    seqIndex = (seqIndex + 1) % sequence.length;
    state.sprite.frame = sequence[seqIndex];
    sprite.classList.remove('frame-0','frame-1','frame-2');
    sprite.classList.add(`frame-${state.sprite.frame}`);
  }, 170);
}

function stopSpriteAnimation() {
  const sprite = document.getElementById('scammerSprite');
  if (!sprite) return;
  if (state.sprite.timer) {
    clearInterval(state.sprite.timer);
    state.sprite.timer = null;
  }
  state.sprite.speaking = false;
  state.sprite.frame = 0;
  sprite.classList.remove('frame-0','frame-1','frame-2','talking','angry','calm');
  sprite.classList.add(state.mood >= 78 ? 'angry' : 'calm');
  sprite.classList.add('frame-0');
}

function interruptScammer() {
  window.speechSynthesis.cancel();
  stopSpriteAnimation();
}

async function pingServer() {
  try {
    const res = await fetch('/api/health');
    const data = await res.json();
    state.serverHealthy = !!data.ok;
    if (data.chatModel) state.chatModel = data.chatModel;
    renderCoachCard();
  } catch {
    state.serverHealthy = false;
    renderCoachCard();
  }
}

function detectMicCapabilities() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const gum = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  const mr = !!window.MediaRecorder;
  state.mic.mode = gum && mr ? 'mediaRecorder' : (SpeechRecognition ? 'speechRecognition' : 'none');
}

async function unlockMic() {
  detectMicCapabilities();
  if (state.mic.mode === 'none') return addTrainer('This browser does not expose a usable microphone API here. Use Chrome or Edge.');
  try {
    if (navigator.mediaDevices?.getUserMedia) {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
    }
    addTrainer('Microphone permission granted. Start Mic when you are ready.');
    els.micStatus.textContent = 'Mic: ready';
  } catch (err) {
    addTrainer(`Microphone permission failed: ${err.name || 'unknown error'}`);
  }
}

async function startMic() {
  detectMicCapabilities();
  if (state.mic.mode === 'mediaRecorder') return startMediaRecorderMic();
  if (state.mic.mode === 'speechRecognition') return startSpeechRecognitionMic();
  addTrainer('This browser does not support the microphone flow here.');
}

async function startMediaRecorderMic() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    state.mic.stream = stream;
    state.mic.running = true;
    state.mic.wanted = true;
    document.getElementById('toggleMicBtn').textContent = 'Stop Mic';
    els.micStatus.textContent = 'Mic: listening';
    const Ctx = window.AudioContext || window.webkitAudioContext;
    state.mic.audioContext = new Ctx();
    const source = state.mic.audioContext.createMediaStreamSource(stream);
    state.mic.analyser = state.mic.audioContext.createAnalyser();
    state.mic.analyser.fftSize = 2048;
    state.mic.dataArray = new Float32Array(state.mic.analyser.fftSize);
    source.connect(state.mic.analyser);
    monitorMicVAD();
  } catch (err) {
    addTrainer(`Microphone failed: ${err.name || 'unknown error'}`);
  }
}

function monitorMicVAD() {
  if (!state.mic.running || !state.mic.analyser) return;
  state.mic.analyser.getFloatTimeDomainData(state.mic.dataArray);
  let sum = 0;
  for (let i = 0; i < state.mic.dataArray.length; i++) sum += state.mic.dataArray[i] * state.mic.dataArray[i];
  const rms = Math.sqrt(sum / state.mic.dataArray.length);
  const now = performance.now();
  const speaking = rms > state.mic.threshold;
  if (speaking) {
    els.micStatus.textContent = 'Mic: hearing speech';
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
      els.micStatus.textContent = 'Mic: listening';
    }
  }
  state.mic.rafId = requestAnimationFrame(monitorMicVAD);
}

function startRecorderSegment() {
  if (!state.mic.stream) return;
  state.mic.chunks = [];
  const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
  state.mic.recorder = new MediaRecorder(state.mic.stream, { mimeType });
  state.mic.recorder.ondataavailable = e => { if (e.data && e.data.size > 0) state.mic.chunks.push(e.data); };
  state.mic.recorder.onstop = async () => {
    const blob = new Blob(state.mic.chunks, { type: mimeType });
    state.mic.chunks = [];
    if (blob.size < 3500) return;
    try {
      els.micStatus.textContent = 'Mic: transcribing';
      const text = await transcribeBlob(blob);
      if (text) handlePlayerMessage(text, 'Mic');
    } catch (err) {
      addTrainer(`Transcription failed: ${err.message}`);
    }
  };
  state.mic.recorder.start();
}

function stopRecorderIfNeeded(force) {
  const rec = state.mic.recorder;
  if (!rec) return;
  if (rec.state !== 'inactive') rec.stop();
  state.mic.recorder = null;
  state.mic.cooldownUntil = performance.now() + (force ? 0 : 850);
}

async function transcribeBlob(blob) {
  const fd = new FormData();
  fd.append('audio', blob, 'speech.webm');
  const res = await fetch('/api/transcribe', { method: 'POST', body: fd });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'transcription error');
  return (data.text || '').trim();
}

async function startSpeechRecognitionMic() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return addTrainer('Speech recognition is not available in this browser.');
  const rec = new SpeechRecognition();
  state.mic.recognition = rec;
  state.mic.running = true;
  state.mic.wanted = true;
  rec.lang = 'en-US';
  rec.continuous = true;
  rec.interimResults = true;
  let finalBuffer = '';
  rec.onstart = () => {
    document.getElementById('toggleMicBtn').textContent = 'Stop Mic';
    els.micStatus.textContent = 'Mic: listening';
  };
  rec.onresult = event => {
    let heard = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      heard += event.results[i][0].transcript;
      if (event.results[i].isFinal) finalBuffer += ` ${event.results[i][0].transcript}`;
    }
    if (heard.trim()) interruptScammer();
    const out = finalBuffer.trim();
    if (out) {
      finalBuffer = '';
      handlePlayerMessage(out, 'Mic');
    }
  };
  rec.onerror = event => {
    if (event.error === 'not-allowed') {
      addTrainer('The browser blocked speech recognition. Allow microphone access in site settings.');
      stopSpeechRecognitionMic();
    }
  };
  rec.onend = () => {
    if (!state.mic.wanted) {
      state.mic.running = false;
      els.micStatus.textContent = 'Mic: off';
      document.getElementById('toggleMicBtn').textContent = 'Start Mic';
      return;
    }
    clearTimeout(state.mic.restartTimer);
    state.mic.restartTimer = setTimeout(() => { try { rec.start(); } catch {} }, 250);
  };
  rec.start();
}

function stopSpeechRecognitionMic() {
  state.mic.wanted = false;
  state.mic.running = false;
  if (state.mic.recognition) {
    try { state.mic.recognition.stop(); } catch {}
    state.mic.recognition = null;
  }
  document.getElementById('toggleMicBtn').textContent = 'Start Mic';
  els.micStatus.textContent = 'Mic: off';
}

async function stopMic() {
  state.mic.wanted = false;
  if (state.mic.recognition) stopSpeechRecognitionMic();
  if (state.mic.rafId) cancelAnimationFrame(state.mic.rafId);
  stopRecorderIfNeeded(true);
  if (state.mic.stream) state.mic.stream.getTracks().forEach(t => t.stop());
  if (state.mic.audioContext) await state.mic.audioContext.close().catch(() => {});
  state.mic.stream = null;
  state.mic.audioContext = null;
  state.mic.analyser = null;
  state.mic.dataArray = null;
  state.mic.running = false;
  document.getElementById('toggleMicBtn').textContent = 'Start Mic';
  els.micStatus.textContent = 'Mic: off';
}

function startFakeScanAnimation() {
  stopFakeScanAnimation();
  state.fakeScanLines = [];
  const lines = [
    'Microsoft Windows [Version 11.0.22631.XXXXX]',
    '(c) Microsoft Corporation. All rights reserved.',
    '',
    'C:\\Users\\victim> color 0a',
    'C:\\Users\\victim> netstat -ano',
    'TCP    172.16.5.11:49752     185.44.22.90:443       ESTABLISHED     4816',
    'TCP    172.16.5.11:49753     91.222.88.71:8080      ESTABLISHED     4816',
    'C:\\Users\\victim> tasklist /v',
    'svchost.exe                1088 Services                   Running',
    'msedge.exe                 6532 Console                    Running',
    'eventvwr.msc               8476 Console                    Running',
    'C:\\Users\\victim> echo WARNING: unusual foreign sessions detected',
    'WARNING: unusual foreign sessions detected',
    'C:\\Users\\victim> echo checking banking compromise signatures...',
    'checking banking compromise signatures...',
    'C:\\Users\\victim> echo high risk indicators found',
    'high risk indicators found',
    'C:\\Users\\victim> _'
  ];
  let i = 0;
  state.fakeScanTimer = setInterval(() => {
    if (i >= lines.length) return;
    state.fakeScanLines.push(lines[i++]);
    renderScreen();
  }, 240);
}
function stopFakeScanAnimation() {
  if (state.fakeScanTimer) {
    clearInterval(state.fakeScanTimer);
    state.fakeScanTimer = null;
  }
}

function getStageLabel() {
  if (state.dnrTriggered) return 'meltdown';
  if (!state.supportShortcutOpened) return 'hook';
  if (!state.supportSiteVisited) return 'redirect';
  if (!state.remoteToolInstalled) return 'tool install';
  if (!state.remoteGranted) return 'device control';
  if (!state.fakeScanRun) return 'fear screen';
  if (!state.cardsBought.length) return 'payment pivot';
  if (!state.cardsRedeemed) return 'redeem trap';
  return 'loss point';
}
function getTacticLabel() {
  const stage = getStageLabel();
  if (stage === 'hook') return 'authority';
  if (stage === 'redirect') return 'funnel control';
  if (stage === 'tool install' || stage === 'device control') return 'remote access';
  if (stage === 'fear screen') return 'panic theater';
  if (stage === 'payment pivot' || stage === 'redeem trap' || stage === 'loss point') return 'gift card extraction';
  return 'pressure';
}
function randomDigits(n) { return Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join(''); }
function fakeGiftCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 4 }, () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')).join('-');
}
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function yesNo(v) { return v ? 'Yes' : 'No'; }
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;', "'":'&#39;' }[m]));
}
