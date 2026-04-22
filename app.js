const STORAGE_KEY = "pinpin-progress-v4";
const QUESTIONS_PER_ROUND = 3;
const AUTO_NEXT_DELAY_MS = 650;

function createQuestion(id, emoji, hanzi, pinyin) {
  return {
    id,
    cue: "dú",
    prompt: "kàn · tīng · dú",
    target: { emoji, hanzi, pinyin },
    speechText: hanzi,
  };
}

const LEVELS = [
  {
    id: "forest-gate",
    icon: "🌳",
    title: "mā ma",
    subtitle: "mǐ",
    questionPool: [
      createQuestion("forest-mama", "👩", "妈妈", "mā ma"),
      createQuestion("forest-baba", "👨", "爸爸", "bà ba"),
      createQuestion("forest-mi", "🍚", "米", "mǐ"),
      createQuestion("forest-mifan", "🍚", "米饭", "mǐ fàn"),
      createQuestion("forest-ma", "🐴", "马", "mǎ"),
      createQuestion("forest-hua", "🌸", "花", "huā"),
      createQuestion("forest-yu", "🐟", "鱼", "yú"),
      createQuestion("forest-shu", "📘", "书", "shū"),
      createQuestion("forest-ya", "🦷", "牙", "yá"),
      createQuestion("forest-yifu", "👕", "衣服", "yī fu"),
    ],
  },
  {
    id: "sun-bridge",
    icon: "🌞",
    title: "niú nǎi",
    subtitle: "tài yáng",
    questionPool: [
      createQuestion("bridge-niunai", "🥛", "牛奶", "niú nǎi"),
      createQuestion("bridge-taiyang", "☀️", "太阳", "tài yáng"),
      createQuestion("bridge-tuzi", "🐰", "兔子", "tù zi"),
      createQuestion("bridge-pingguo", "🍎", "苹果", "píng guǒ"),
      createQuestion("bridge-xiongmao", "🐼", "熊猫", "xióng māo"),
      createQuestion("bridge-xigua", "🍉", "西瓜", "xī guā"),
      createQuestion("bridge-yueliang", "🌙", "月亮", "yuè liang"),
      createQuestion("bridge-zhuozi", "🪑", "桌子", "zhuō zi"),
      createQuestion("bridge-beizi", "🥤", "杯子", "bēi zi"),
      createQuestion("bridge-xiezi", "👟", "鞋子", "xié zi"),
    ],
  },
  {
    id: "treasure-room",
    icon: "🎁",
    title: "píng guǒ",
    subtitle: "bǎo xiāng",
    questionPool: [
      createQuestion("treasure-baoxiang", "🎁", "宝箱", "bǎo xiāng"),
      createQuestion("treasure-caihong", "🌈", "彩虹", "cǎi hóng"),
      createQuestion("treasure-feiji", "✈️", "飞机", "fēi jī"),
      createQuestion("treasure-mianbao", "🍞", "面包", "miàn bāo"),
      createQuestion("treasure-binggan", "🍪", "饼干", "bǐng gān"),
      createQuestion("treasure-zuqiu", "⚽", "足球", "zú qiú"),
      createQuestion("treasure-qiche", "🚗", "汽车", "qì chē"),
      createQuestion("treasure-fangzi", "🏠", "房子", "fáng zi"),
      createQuestion("treasure-xiangjiao", "🍌", "香蕉", "xiāng jiāo"),
      createQuestion("treasure-dangao", "🎂", "蛋糕", "dàn gāo"),
    ],
  },
];

const ui = {
  homePanel: document.getElementById("home-panel"),
  mapPanel: document.getElementById("map-panel"),
  gamePanel: document.getElementById("game-panel"),
  resultPanel: document.getElementById("result-panel"),
  startButton: document.getElementById("start-button"),
  resetProgressButton: document.getElementById("reset-progress-button"),
  voiceStrip: document.getElementById("voice-strip"),
  levelGrid: document.getElementById("level-grid"),
  totalStarsPill: document.getElementById("total-stars-pill"),
  progressDots: document.getElementById("progress-dots"),
  rewardChip: document.getElementById("reward-chip"),
  questionTypeChip: document.getElementById("question-type-chip"),
  mistakeChip: document.getElementById("mistake-chip"),
  targetCard: document.getElementById("target-card"),
  promptCopy: document.getElementById("prompt-copy"),
  playAudioButton: document.getElementById("play-audio-button"),
  feedbackBox: document.getElementById("feedback-box"),
  wrongButton: document.getElementById("wrong-button"),
  correctButton: document.getElementById("correct-button"),
  backToMapButton: document.getElementById("back-to-map-button"),
  resultBadge: document.getElementById("result-badge"),
  resultTitle: document.getElementById("result-title"),
  resultCopy: document.getElementById("result-copy"),
  nextLevelButton: document.getElementById("next-level-button"),
  resultMapButton: document.getElementById("result-map-button"),
};

const audioMode = {
  available: "speechSynthesis" in window,
  lang: "zh-CN",
  synth: "speechSynthesis" in window ? window.speechSynthesis : null,
  voices: [],
  preferredVoice: null,
  primed: false,
  speakTimer: null,
};

let state = {
  levelIndex: 0,
  questionIndex: 0,
  activeQuestions: [],
  levelRewards: 0,
  heartsLeft: 3,
  questionResolved: false,
  progress: loadProgress(),
};

function pickRandomQuestions(questionPool, count) {
  const shuffled = [...questionPool];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const current = shuffled[index];
    shuffled[index] = shuffled[swapIndex];
    shuffled[swapIndex] = current;
  }

  return shuffled.slice(0, Math.min(count, shuffled.length));
}

function loadProgress() {
  const fallback = {
    unlocked: 1,
    starsByLevel: {},
    lastLevel: 0,
  };

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

function saveProgress() {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.progress));
}

function getTotalRewards() {
  return Object.values(state.progress.starsByLevel).reduce((sum, value) => sum + value, 0);
}

function currentPlayableLevel() {
  return Math.max(0, Math.min(state.progress.lastLevel || 0, state.progress.unlocked - 1));
}

function updateVoiceStrip() {
  ui.voiceStrip.textContent = audioMode.available ? "🔊 tap" : "🔇";
}

function matchesChineseVoice(voice) {
  const lang = voice.lang?.toLowerCase() || "";
  const name = voice.name?.toLowerCase() || "";
  return lang.startsWith("zh") || lang.includes("cmn") || name.includes("chinese") || name.includes("mandarin");
}

function pickPreferredVoice(voices) {
  return voices.find((voice) => matchesChineseVoice(voice) && voice.default)
    || voices.find((voice) => matchesChineseVoice(voice))
    || voices.find((voice) => voice.default)
    || null;
}

function refreshVoices() {
  if (!audioMode.available || !audioMode.synth) return;

  const voices = audioMode.synth.getVoices();
  if (!voices.length) return;

  audioMode.voices = voices;
  audioMode.preferredVoice = pickPreferredVoice(voices);
}

function primeSpeech() {
  if (!audioMode.available || !audioMode.synth || audioMode.primed) return;

  audioMode.primed = true;
  refreshVoices();

  try {
    audioMode.synth.resume();

    const unlockUtterance = new SpeechSynthesisUtterance("\u200B");
    unlockUtterance.lang = audioMode.lang;
    unlockUtterance.volume = 0;

    if (audioMode.preferredVoice) {
      unlockUtterance.voice = audioMode.preferredVoice;
    }

    audioMode.synth.speak(unlockUtterance);

    window.setTimeout(() => {
      if (audioMode.synth.speaking || audioMode.synth.pending) {
        audioMode.synth.cancel();
      }
    }, 60);
  } catch {
    audioMode.primed = false;
  }
}

function installSpeechSetup() {
  if (!audioMode.available || !audioMode.synth) return;

  refreshVoices();

  if (typeof audioMode.synth.onvoiceschanged !== "undefined") {
    audioMode.synth.onvoiceschanged = refreshVoices;
  }

  const unlock = () => primeSpeech();
  window.addEventListener("touchstart", unlock, { once: true, passive: true });
  window.addEventListener("pointerdown", unlock, { once: true, passive: true });
  window.addEventListener("keydown", unlock, { once: true });
}

function renderMap() {
  ui.totalStarsPill.textContent = `⭐ ${getTotalRewards()}`;
  ui.levelGrid.innerHTML = "";

  LEVELS.forEach((level, index) => {
    const unlocked = index < state.progress.unlocked;
    const rewards = state.progress.starsByLevel[level.id] || 0;
    const card = document.createElement("article");
    card.className = `level-card${unlocked ? "" : " locked"}`;
    card.innerHTML = `
      <div class="level-card-top">
        <div class="level-badge">${level.icon}</div>
        <div class="level-count">${index + 1}</div>
      </div>
      <div class="level-text">
        <h3>${level.title}</h3>
        <p>${level.subtitle}</p>
      </div>
      <div class="level-mini">${renderRewardText(rewards)}</div>
    `;

    const button = document.createElement("button");
    button.className = unlocked ? "primary-btn level-play" : "ghost-btn level-play";
    button.textContent = unlocked ? "▶︎ go" : "🔒";
    button.disabled = !unlocked;
    button.addEventListener("click", () => startLevel(index));
    card.appendChild(button);
    ui.levelGrid.appendChild(card);
  });
}

function showScreen(section) {
  ui.homePanel.classList.toggle("hidden", section !== ui.mapPanel);
  [ui.mapPanel, ui.gamePanel, ui.resultPanel].forEach((panel) => panel.classList.add("hidden"));
  section.classList.remove("hidden");
}

function startLevel(levelIndex) {
  state.levelIndex = levelIndex;
  state.questionIndex = 0;
  state.activeQuestions = pickRandomQuestions(LEVELS[levelIndex].questionPool, QUESTIONS_PER_ROUND);
  state.levelRewards = 0;
  state.heartsLeft = 3;
  state.questionResolved = false;
  state.progress.lastLevel = levelIndex;
  saveProgress();
  showScreen(ui.gamePanel);
  renderQuestion();
}

function renderQuestion() {
  const question = state.activeQuestions[state.questionIndex];

  state.questionResolved = false;
  ui.questionTypeChip.textContent = question.cue;
  ui.promptCopy.textContent = question.prompt;
  ui.targetCard.innerHTML = renderTargetMarkup(question.target);
  ui.feedbackBox.className = "feedback-box";
  ui.feedbackBox.textContent = "✨";
  ui.correctButton.disabled = false;
  ui.wrongButton.disabled = false;

  updateProgressDots(state.activeQuestions.length, state.questionIndex);
  updateRewardChip();
  updateHeartChip();
}

function updateProgressDots(total, activeIndex) {
  ui.progressDots.innerHTML = "";
  for (let index = 0; index < total; index += 1) {
    const dot = document.createElement("span");
    dot.className = "progress-dot";
    if (index < activeIndex) dot.classList.add("done");
    if (index === activeIndex) dot.classList.add("active");
    ui.progressDots.appendChild(dot);
  }
}

function updateRewardChip() {
  ui.rewardChip.textContent = `⭐ ${state.levelRewards}`;
}

function updateHeartChip() {
  ui.mistakeChip.textContent = `${"🩵".repeat(state.heartsLeft)}${"🤍".repeat(3 - state.heartsLeft)}`;
}

function renderTargetMarkup(target) {
  return `
    <div class="target-stack">
      <div class="target-emoji">${target.emoji}</div>
      <div class="target-hanzi">${target.hanzi}</div>
      <div class="target-pinyin">${target.pinyin}</div>
    </div>
  `;
}

function answerQuestion(correct) {
  if (state.questionResolved) return;
  state.questionResolved = true;
  ui.correctButton.disabled = true;
  ui.wrongButton.disabled = true;

  if (correct) {
    state.levelRewards += 1;
    ui.feedbackBox.className = "feedback-box good";
    ui.feedbackBox.textContent = "⭐ +1";
    updateRewardChip();
  } else {
    state.heartsLeft = Math.max(0, state.heartsLeft - 1);
    ui.feedbackBox.className = "feedback-box bad";
    ui.feedbackBox.textContent = "🩵 -1";
    updateHeartChip();
  }

  window.setTimeout(() => moveToNextQuestion(), AUTO_NEXT_DELAY_MS);
}

function moveToNextQuestion() {
  const isLastQuestion = state.questionIndex === state.activeQuestions.length - 1;
  if (!isLastQuestion) {
    state.questionIndex += 1;
    renderQuestion();
    return;
  }
  finishLevel();
}

function finishLevel() {
  const level = LEVELS[state.levelIndex];
  const rewards = state.levelRewards;
  state.progress.starsByLevel[level.id] = Math.max(state.progress.starsByLevel[level.id] || 0, rewards);
  state.progress.unlocked = Math.max(state.progress.unlocked, Math.min(LEVELS.length, state.levelIndex + 2));
  saveProgress();
  renderMap();

  ui.resultBadge.textContent = renderRewardText(rewards);
  ui.resultTitle.textContent = `${level.icon} ${rewards} ⭐`;
  ui.resultCopy.textContent = state.heartsLeft >= 2 ? "hǎo!" : "zài lái";

  const hasNext = state.levelIndex < LEVELS.length - 1;
  ui.nextLevelButton.textContent = hasNext ? "xià yī guān →" : "zài lái →";
  ui.nextLevelButton.onclick = () => startLevel(hasNext ? state.levelIndex + 1 : 0);

  showScreen(ui.resultPanel);
}

function renderRewardText(count) {
  return `${"⭐".repeat(count)}${"☆".repeat(3 - count)}`;
}

function speakCurrentQuestion() {
  const question = state.activeQuestions[state.questionIndex];
  speakChinese(question.speechText);
}

function speakChinese(text) {
  if (!text || !audioMode.available || !audioMode.synth) return;

  refreshVoices();

  if (!audioMode.primed) {
    primeSpeech();
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = audioMode.lang;
  utterance.rate = 0.78;
  utterance.pitch = 1.03;

  if (audioMode.preferredVoice) {
    utterance.voice = audioMode.preferredVoice;
  }

  if (audioMode.speakTimer) {
    window.clearTimeout(audioMode.speakTimer);
  }

  audioMode.speakTimer = window.setTimeout(() => {
    try {
      audioMode.synth.resume();

      if (audioMode.synth.speaking || audioMode.synth.pending) {
        audioMode.synth.cancel();
      }

      audioMode.synth.speak(utterance);
    } catch {
      ui.feedbackBox.className = "feedback-box bad";
      ui.feedbackBox.textContent = "🔇";
    }
  }, audioMode.primed ? 40 : 140);
}

function resetProgress() {
  state.progress = {
    unlocked: 1,
    starsByLevel: {},
    lastLevel: 0,
  };
  saveProgress();
  renderMap();
  startLevel(0);
}

ui.startButton.addEventListener("click", () => startLevel(currentPlayableLevel()));
ui.resetProgressButton.addEventListener("click", resetProgress);
ui.backToMapButton.addEventListener("click", () => showScreen(ui.mapPanel));
ui.resultMapButton.addEventListener("click", () => showScreen(ui.mapPanel));
ui.playAudioButton.addEventListener("click", speakCurrentQuestion);
ui.correctButton.addEventListener("click", () => answerQuestion(true));
ui.wrongButton.addEventListener("click", () => answerQuestion(false));

installSpeechSetup();
updateVoiceStrip();
renderMap();
startLevel(currentPlayableLevel());
