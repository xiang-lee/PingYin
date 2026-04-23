const STORAGE_KEY = "pinpin-progress-v4";
const QUESTIONS_PER_ROUND = 3;
const SUCCESS_NEXT_DELAY_MS = 1050;

function createQuestion(id, emoji, hanzi, pinyin) {
  return {
    id,
    cue: { hanzi: "读", pinyin: "dú" },
    prompt: { hanzi: "看 · 听 · 读", pinyin: "kàn · tīng · dú" },
    target: { emoji, hanzi, pinyin },
    speechText: hanzi,
  };
}

const LEVELS = [
  {
    id: "forest-gate",
    icon: "🌳",
    title: { hanzi: "妈妈", pinyin: "mā ma" },
    subtitle: { hanzi: "米", pinyin: "mǐ" },
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
    title: { hanzi: "牛奶", pinyin: "niú nǎi" },
    subtitle: { hanzi: "太阳", pinyin: "tài yáng" },
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
    title: { hanzi: "苹果", pinyin: "píng guǒ" },
    subtitle: { hanzi: "宝箱", pinyin: "bǎo xiāng" },
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
  voiceButton: document.getElementById("voice-button"),
  feedbackBox: document.getElementById("feedback-box"),
  voiceLog: document.getElementById("voice-log"),
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

const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition || null;

const speechMode = {
  available: Boolean(SpeechRecognitionCtor),
  RecognitionCtor: SpeechRecognitionCtor,
  recognition: null,
  listening: false,
  permissionDenied: false,
  lastTranscript: "",
};

let state = {
  levelIndex: 0,
  questionIndex: 0,
  activeQuestions: [],
  levelRewards: 0,
  heartsLeft: 3,
  questionResolved: false,
  questionLocked: false,
  nextQuestionTimer: null,
  sceneAnimation: null,
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

function currentQuestion() {
  return state.activeQuestions[state.questionIndex] || null;
}

function updateVoiceStrip() {
  const audioLabel = audioMode.available ? "🔊 听标准音" : "🔇 无播音";
  const speechLabel = !speechMode.available
    ? "🎤 Chrome 自动判题"
    : speechMode.permissionDenied
      ? "🎤 打开麦克风"
      : "🎤 读对自动过";

  ui.voiceStrip.textContent = `${audioLabel} · ${speechLabel}`;
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
        <h3>${renderBilingualMarkup(level.title.hanzi, level.title.pinyin, "level-title-stack")}</h3>
        <p>${renderBilingualMarkup(level.subtitle.hanzi, level.subtitle.pinyin, "level-subtitle-stack")}</p>
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
  clearQuestionEffects();
  state.levelIndex = levelIndex;
  state.questionIndex = 0;
  state.activeQuestions = pickRandomQuestions(LEVELS[levelIndex].questionPool, QUESTIONS_PER_ROUND);
  state.levelRewards = 0;
  state.heartsLeft = 3;
  state.questionResolved = false;
  state.questionLocked = false;
  state.progress.lastLevel = levelIndex;
  saveProgress();
  showScreen(ui.gamePanel);
  renderQuestion();
}

function renderQuestion() {
  const question = currentQuestion();

  clearQuestionEffects();
  state.questionResolved = false;
  state.questionLocked = false;
  speechMode.lastTranscript = "";
  ui.questionTypeChip.innerHTML = renderBilingualMarkup(question.cue.hanzi, question.cue.pinyin, "chip-stack compact");
  ui.promptCopy.innerHTML = renderBilingualMarkup(question.prompt.hanzi, question.prompt.pinyin, "prompt-stack");
  ui.targetCard.innerHTML = renderTargetMarkup(question.target);
  setFeedback(speechMode.available ? "点麦克风，读给我听" : "请用 Chrome 开启自动判题");
  setVoiceLog(
    speechMode.available
      ? `读对 ${question.target.hanzi} 就会进洞`
      : "当前浏览器不支持语音识别，推荐桌面 Chrome",
  );

  updateProgressDots(state.activeQuestions.length, state.questionIndex);
  updateRewardChip();
  updateHeartChip();
  updateVoiceButton();
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
    </div>
    <div class="target-scene" data-target-scene aria-hidden="true">
      <div class="scene-lane" data-scene-lane>
        <div class="scene-runner" data-scene-runner>
          <span class="scene-runner-chip">${target.pinyin}</span>
        </div>
        <div class="scene-hole" data-scene-hole></div>
      </div>
    </div>
  `;
}

function renderBilingualMarkup(hanzi, pinyin, className = "") {
  const normalized = className ? ` ${className}` : "";

  return `
    <span class="bilingual-stack${normalized}">
      <span class="bilingual-pinyin">${pinyin}</span>
      <span class="bilingual-hanzi">${hanzi}</span>
    </span>
  `;
}

function setFeedback(text, tone = "") {
  ui.feedbackBox.className = tone ? `feedback-box ${tone}` : "feedback-box";
  ui.feedbackBox.textContent = text;
}

function setVoiceLog(text, tone = "") {
  ui.voiceLog.className = tone ? `voice-log ${tone}` : "voice-log";
  ui.voiceLog.textContent = text;
}

function updateVoiceButton() {
  ui.voiceButton.classList.toggle("is-listening", speechMode.listening);
  ui.playAudioButton.disabled = speechMode.listening || state.questionLocked || state.questionResolved;

  if (!speechMode.available) {
    ui.voiceButton.textContent = "🎤 用 Chrome";
    ui.voiceButton.disabled = true;
    return;
  }

  if (speechMode.listening) {
    ui.voiceButton.textContent = "🎤 正在听";
    ui.voiceButton.disabled = true;
    return;
  }

  if (state.questionLocked || state.questionResolved) {
    ui.voiceButton.textContent = "🎤 等一下";
    ui.voiceButton.disabled = true;
    return;
  }

  ui.voiceButton.textContent = speechMode.permissionDenied ? "🎤 打开麦克风" : "🎤 开始读";
  ui.voiceButton.disabled = false;
}

function normalizeSpeechText(text) {
  return (text || "")
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[\s,.!?;:，。！？；：、"'“”‘’`~·-]/g, "");
}

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchesSpokenAnswer(transcript, expected) {
  const normalizedTranscript = normalizeSpeechText(transcript);
  const normalizedExpected = normalizeSpeechText(expected);

  if (!normalizedTranscript || !normalizedExpected) {
    return false;
  }

  if (normalizedTranscript === normalizedExpected) {
    return true;
  }

  const repeatedExpected = new RegExp(`^(?:${escapeRegex(normalizedExpected)})+$`);
  return repeatedExpected.test(normalizedTranscript);
}

function collectRecognitionCandidates(event) {
  const result = event.results[event.resultIndex] || event.results[event.results.length - 1];
  if (!result) {
    return [];
  }

  const transcripts = [];
  for (let index = 0; index < result.length; index += 1) {
    const transcript = result[index].transcript?.trim();
    if (transcript && !transcripts.includes(transcript)) {
      transcripts.push(transcript);
    }
  }

  return transcripts;
}

function answerQuestion(correct) {
  if (state.questionResolved || state.questionLocked) return;
  state.questionLocked = true;
  updateVoiceButton();

  if (correct) {
    state.questionResolved = true;
    state.levelRewards += 1;
    setFeedback("读对了，进洞啦", "good");
    updateRewardChip();
    playSuccessScene();
    scheduleNextQuestion();
    return;
  }

  state.heartsLeft = Math.max(0, state.heartsLeft - 1);
  setFeedback(state.heartsLeft > 0 ? "再试一次" : "继续试试", "bad");
  updateHeartChip();
  playRetryScene(() => {
    state.questionLocked = false;
    setFeedback(state.heartsLeft > 0 ? "再读一次" : "继续读，我再听一次");
    updateVoiceButton();
  });
}

function moveToNextQuestion() {
  clearQuestionEffects();
  const isLastQuestion = state.questionIndex === state.activeQuestions.length - 1;
  if (!isLastQuestion) {
    state.questionIndex += 1;
    renderQuestion();
    return;
  }
  finishLevel();
}

function finishLevel() {
  clearQuestionEffects();
  const level = LEVELS[state.levelIndex];
  const rewards = state.levelRewards;
  state.progress.starsByLevel[level.id] = Math.max(state.progress.starsByLevel[level.id] || 0, rewards);
  state.progress.unlocked = Math.max(state.progress.unlocked, Math.min(LEVELS.length, state.levelIndex + 2));
  saveProgress();
  renderMap();

  ui.resultBadge.textContent = renderRewardText(rewards);
  ui.resultTitle.innerHTML = `${level.icon} ${renderBilingualMarkup("好", "hǎo", "compact result-stack")} ${rewards} ⭐`;
  ui.resultCopy.innerHTML = state.heartsLeft >= 2
    ? renderBilingualMarkup("很好", "hěn hǎo", "compact result-copy-stack")
    : renderBilingualMarkup("再来", "zài lái", "compact result-copy-stack");

  const hasNext = state.levelIndex < LEVELS.length - 1;
  ui.nextLevelButton.innerHTML = hasNext
    ? `<span class="button-bilingual">${renderBilingualMarkup("下一关", "xià yī guān", "compact")}<span class="button-tail">→</span></span>`
    : `<span class="button-bilingual">${renderBilingualMarkup("再来一次", "zài lái yí cì", "compact")}<span class="button-tail">→</span></span>`;
  ui.nextLevelButton.onclick = () => startLevel(hasNext ? state.levelIndex + 1 : 0);

  showScreen(ui.resultPanel);
}

function renderRewardText(count) {
  return `${"⭐".repeat(count)}${"☆".repeat(3 - count)}`;
}

function speakCurrentQuestion() {
  const question = currentQuestion();
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
      setFeedback("🔇", "bad");
    }
  }, audioMode.primed ? 40 : 140);
}

function cleanupSpeechRecognition() {
  if (!speechMode.recognition) {
    speechMode.listening = false;
    updateVoiceButton();
    return;
  }

  const activeRecognition = speechMode.recognition;
  speechMode.recognition = null;
  speechMode.listening = false;

  try {
    activeRecognition.onstart = null;
    activeRecognition.onresult = null;
    activeRecognition.onerror = null;
    activeRecognition.onend = null;
    activeRecognition.abort();
  } catch {
    // Ignore abort errors from browsers that already ended the session.
  }

  updateVoiceButton();
}

function startSpeechCheck() {
  const question = currentQuestion();
  if (!question || state.questionLocked || state.questionResolved || speechMode.listening) {
    return;
  }

  if (!speechMode.available) {
    setFeedback("请用 Chrome", "bad");
    setVoiceLog("这个浏览器不支持自动判题", "bad");
    updateVoiceButton();
    return;
  }

  cleanupSpeechRecognition();

  const recognition = new speechMode.RecognitionCtor();
  speechMode.recognition = recognition;
  speechMode.listening = true;
  speechMode.lastTranscript = "";
  updateVoiceButton();
  setFeedback("我在听");
  setVoiceLog(`请读：${question.speechText}`, "listening");

  recognition.lang = "zh-CN";
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.maxAlternatives = 5;

  recognition.onstart = () => {
    if (speechMode.recognition !== recognition) {
      return;
    }

    speechMode.permissionDenied = false;
    updateVoiceStrip();
    updateVoiceButton();
  };

  recognition.onresult = (event) => {
    if (speechMode.recognition !== recognition || currentQuestion()?.id !== question.id) {
      return;
    }

    const candidates = collectRecognitionCandidates(event);
    const heard = candidates[0] || "";

    if (!heard) {
      setFeedback("没听清", "bad");
      setVoiceLog("再靠近一点，慢慢读", "bad");
      return;
    }

    speechMode.lastTranscript = heard;

    const matched = candidates.some((candidate) => matchesSpokenAnswer(candidate, question.speechText));
    setVoiceLog(`我听到：${heard}`, matched ? "good" : "bad");
    answerQuestion(matched);
  };

  recognition.onerror = (event) => {
    if (speechMode.recognition !== recognition) {
      return;
    }

    speechMode.listening = false;
    speechMode.recognition = null;

    if (event.error === "not-allowed" || event.error === "service-not-allowed") {
      speechMode.permissionDenied = true;
      updateVoiceStrip();
      setFeedback("麦克风没开", "bad");
      setVoiceLog("请允许浏览器使用麦克风", "bad");
    } else if (event.error === "no-speech") {
      setFeedback("没听清", "bad");
      setVoiceLog("再试一次，靠近一点慢慢读", "bad");
    } else if (event.error === "audio-capture") {
      setFeedback("没找到麦克风", "bad");
      setVoiceLog("检查电脑麦克风后再试", "bad");
    } else if (event.error !== "aborted") {
      setFeedback("识别失败", "bad");
      setVoiceLog("浏览器这次没听清，再点一次麦克风", "bad");
    }

    updateVoiceButton();
  };

  recognition.onend = () => {
    if (speechMode.recognition !== recognition) {
      return;
    }

    speechMode.listening = false;
    speechMode.recognition = null;
    updateVoiceButton();
  };

  try {
    recognition.start();
  } catch {
    speechMode.listening = false;
    speechMode.recognition = null;
    setFeedback("麦克风没启动", "bad");
    setVoiceLog("浏览器没有成功开始录音，再点一次试试", "bad");
    updateVoiceButton();
  }
}

function scheduleNextQuestion() {
  if (state.nextQuestionTimer) {
    window.clearTimeout(state.nextQuestionTimer);
  }

  state.nextQuestionTimer = window.setTimeout(() => {
    state.nextQuestionTimer = null;
    moveToNextQuestion();
  }, SUCCESS_NEXT_DELAY_MS);
}

function getSceneParts() {
  const scene = ui.targetCard.querySelector("[data-target-scene]");
  if (!scene) return {};

  return {
    scene,
    lane: scene.querySelector("[data-scene-lane]"),
    runner: scene.querySelector("[data-scene-runner]"),
    hole: scene.querySelector("[data-scene-hole]"),
  };
}

function clearQuestionEffects() {
  cleanupSpeechRecognition();

  if (state.nextQuestionTimer) {
    window.clearTimeout(state.nextQuestionTimer);
    state.nextQuestionTimer = null;
  }

  if (state.sceneAnimation) {
    state.sceneAnimation.onfinish = null;
    state.sceneAnimation.oncancel = null;
    state.sceneAnimation.cancel();
    state.sceneAnimation = null;
  }

  const { scene, runner } = getSceneParts();
  if (scene) {
    scene.classList.remove("is-success", "is-bump");
  }

  if (runner) {
    runner.classList.remove("scene-runner-static");
    runner.style.removeProperty("left");
    runner.style.removeProperty("transform");
    runner.style.removeProperty("opacity");
  }
}

function freezeRunner() {
  const parts = getSceneParts();
  if (!parts.scene || !parts.lane || !parts.runner) return null;

  const laneRect = parts.lane.getBoundingClientRect();
  const runnerRect = parts.runner.getBoundingClientRect();
  const currentLeft = Math.max(0, runnerRect.left - laneRect.left);

  parts.runner.classList.add("scene-runner-static");
  parts.runner.style.left = `${currentLeft}px`;
  parts.runner.style.transform = "translateY(-50%)";
  parts.runner.style.opacity = "1";

  return {
    ...parts,
    currentLeft,
    laneRect,
    runnerRect,
  };
}

function resetRunner(parts) {
  if (!parts?.runner) return;

  parts.scene?.classList.remove("is-success", "is-bump");
  parts.runner.classList.remove("scene-runner-static");
  parts.runner.style.removeProperty("left");
  parts.runner.style.removeProperty("transform");
  parts.runner.style.removeProperty("opacity");
}

function playSuccessScene() {
  const frozen = freezeRunner();
  if (!frozen?.runner?.animate || !frozen.hole) {
    resetRunner(frozen);
    return;
  }

  const holeRect = frozen.hole.getBoundingClientRect();
  const holeCenterLeft = holeRect.left - frozen.laneRect.left + (holeRect.width - frozen.runnerRect.width) / 2;
  const settleLeft = Math.max(frozen.currentLeft, holeCenterLeft - 28);

  frozen.scene.classList.add("is-success");
  state.sceneAnimation = frozen.runner.animate([
    {
      left: `${frozen.currentLeft}px`,
      transform: "translateY(-50%) scale(1)",
      opacity: 1,
    },
    {
      left: `${settleLeft}px`,
      transform: "translateY(-50%) scale(0.96)",
      opacity: 1,
      offset: 0.68,
    },
    {
      left: `${holeCenterLeft}px`,
      transform: "translateY(calc(-50% + 22px)) scale(0.14)",
      opacity: 0.06,
    },
  ], {
    duration: SUCCESS_NEXT_DELAY_MS - 120,
    easing: "cubic-bezier(0.24, 0.86, 0.34, 1)",
    fill: "forwards",
  });

  state.sceneAnimation.onfinish = () => {
    state.sceneAnimation = null;
  };

  state.sceneAnimation.oncancel = () => {
    state.sceneAnimation = null;
  };
}

function playRetryScene(onDone) {
  const frozen = freezeRunner();
  if (!frozen?.runner?.animate) {
    resetRunner(frozen);
    onDone?.();
    return;
  }

  const laneWidth = frozen.lane.clientWidth;
  const runnerWidth = frozen.runnerRect.width;
  const nudgeRight = Math.min(frozen.currentLeft + 18, Math.max(4, laneWidth - runnerWidth - 6));
  const bounceLeft = Math.max(frozen.currentLeft - 24, 4);

  frozen.scene.classList.add("is-bump");
  state.sceneAnimation = frozen.runner.animate([
    {
      left: `${frozen.currentLeft}px`,
      transform: "translateY(-50%) scale(1)",
      opacity: 1,
    },
    {
      left: `${nudgeRight}px`,
      transform: "translateY(-50%) rotate(4deg) scale(1.02)",
      opacity: 1,
      offset: 0.36,
    },
    {
      left: `${bounceLeft}px`,
      transform: "translateY(-50%) rotate(-5deg) scale(0.98)",
      opacity: 1,
    },
  ], {
    duration: 420,
    easing: "ease-out",
    fill: "forwards",
  });

  const finish = () => {
    state.sceneAnimation = null;
    resetRunner(frozen);
    onDone?.();
  };

  state.sceneAnimation.onfinish = finish;
  state.sceneAnimation.oncancel = finish;
}

function resetProgress() {
  clearQuestionEffects();
  state.progress = {
    unlocked: 1,
    starsByLevel: {},
    lastLevel: 0,
  };
  saveProgress();
  renderMap();
  startLevel(0);
}

function showMap() {
  clearQuestionEffects();
  showScreen(ui.mapPanel);
}

ui.startButton.addEventListener("click", () => startLevel(currentPlayableLevel()));
ui.resetProgressButton.addEventListener("click", resetProgress);
ui.backToMapButton.addEventListener("click", showMap);
ui.resultMapButton.addEventListener("click", showMap);
ui.playAudioButton.addEventListener("click", speakCurrentQuestion);
ui.voiceButton.addEventListener("click", startSpeechCheck);

installSpeechSetup();
updateVoiceStrip();
renderMap();
startLevel(currentPlayableLevel());
