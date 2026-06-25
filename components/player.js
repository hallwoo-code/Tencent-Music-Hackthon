(() => {
  if (window.__resonanceCleanup) window.__resonanceCleanup();

  const data = window.RESONANCE_DATA || {};
  const song = data.lyrics?.song || {};
  let lyrics = [];
  const points = data.interactionPoints || [];
  const comments = data.comments || { defaultComments: [], highlightedLyrics: [] };
  const finalScores = data.scores || {};

  const app = document.querySelector(".resonance-app");
  const audio = document.querySelector("#audio");
  const canvas = document.querySelector("#fxCanvas");
  const ctx = canvas.getContext("2d");
  const fragmentLayer = document.querySelector("#fragmentLayer");
  const lyricStack = document.querySelector("#lyricStack");
  const progress = document.querySelector("#progress");
  const progressWrap = document.querySelector(".progress-wrap");
  const pointTrack = document.querySelector("#pointTrack");
  const playButton = document.querySelector("#playButton");
  const aiPrompt = document.querySelector("#aiPrompt");
  const energyHint = document.querySelector("#energyHint");
  const currentTimeLabel = document.querySelector("#currentTime");
  const durationTimeLabel = document.querySelector("#durationTime");
  const currentComments = document.querySelector("#currentComments");
  const currentWave = document.querySelector("#currentWave");
  const tapHint = document.querySelector("#tapHint");
  const posterBg = document.querySelector("#posterBg");
  const lyricCloud = document.querySelector("#lyricCloud");
  const commentDetail = document.querySelector("#commentDetail");
  const detailComments = document.querySelector("#detailComments");
  const electricWave = document.querySelector("#electricWave");
  const chargeButton = document.querySelector("#chargeButton");
  const chargeNote = document.querySelector("#chargeNote");
  const lyricsImport = document.querySelector("#lyricsImport");
  const lyricsInput = document.querySelector("#lyricsInput");
  const lyricsToggleButton = document.querySelector("#lyricsToggleButton");
  const applyLyricsButton = document.querySelector("#applyLyricsButton");
  const lyricLaterButton = document.querySelector("#lyricLaterButton");
  const lyricEarlierButton = document.querySelector("#lyricEarlierButton");
  const lyricResetButton = document.querySelector("#lyricResetButton");
  const motionToggle = document.querySelector("#motionToggle");
  const soundToggle = document.querySelector("#soundToggle");

  const cleanupCallbacks = [];
  const activeTimeouts = new Set();

  const state = {
    audioContext: null,
    analyser: null,
    source: null,
    frequencyData: null,
    currentIndex: -1,
    selectedPoint: points[0],
    currentFieldLyric: null,
    energy: 0,
    bass: 0,
    heat: 0,
    lastFrame: performance.now(),
    raf: null,
    particles: [],
    burstRings: [],
    chargeLocked: false,
    settlementDone: false,
    hidden: false,
    lastLyricSignature: "",
    burstUntil: 0,
    lyricOffset: 0,
    damageStates: new Map(),
    lastPointPrompted: {},
    isInitialized: false,
  };

  const highIntensityTypes = new Set(["dense-beat", "chorus", "rhythm-change", "emotion-peak", "high-note"]);
  const creditPattern = /^(deadman\s*-|lyrics\s+by|composed\s+by|produced\s+by)/i;

  function addListener(target, type, handler, options) {
    target.addEventListener(type, handler, options);
    cleanupCallbacks.push(() => target.removeEventListener(type, handler, options));
  }

  function delay(callback, ms) {
    const id = window.setTimeout(() => {
      activeTimeouts.delete(id);
      callback();
    }, ms);
    activeTimeouts.add(id);
    return id;
  }

  function clearDelay(id) {
    if (id) {
      window.clearTimeout(id);
      activeTimeouts.delete(id);
    }
  }

  function formatTime(value) {
    const safe = Number.isFinite(value) ? Math.max(0, value) : 0;
    const minutes = Math.floor(safe / 60);
    const seconds = Math.floor(safe % 60);
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  function getDuration() {
    return audio.duration || song.duration || lyrics.at(-1)?.endTime || lyrics.at(-1)?.startTime + 5 || 180;
  }

  function getCurrentTime() {
    return audio.currentTime || 0;
  }

  function getLyricTime(now = getCurrentTime()) {
    return Math.max(0, now + state.lyricOffset);
  }

  function setView(view) {
    app.dataset.view = view;
  }

  function setHeat(value, smooth = true) {
    const next = Math.max(0, Math.min(100, value));
    state.heat = smooth ? state.heat * 0.86 + next * 0.14 : next;
    app.style.setProperty("--heat", state.heat.toFixed(2));
  }

  function setTemplate(template) {
    app.dataset.template = template || "step";
  }

  function hasCjk(text) {
    return /[\u3400-\u9fff]/.test(text);
  }

  function isTranslationLine(text) {
    return hasCjk(text) && !/[A-Za-z]{2,}/.test(text);
  }

  function parseTimestamp(minutes, seconds, fraction = "") {
    const padded = fraction.padEnd(3, "0").slice(0, 3);
    return Number(minutes) * 60 + Number(seconds) + Number(padded || 0) / 1000;
  }

  function assignEndTimes(lines, duration = song.duration) {
    return lines.map((line, index) => ({
      ...line,
      id: line.id || `line-${index + 1}`,
      index,
      time: line.startTime,
      endTime: lines[index + 1]?.startTime || duration || line.startTime + 5,
    }));
  }

  function parseLrc(raw) {
    const entries = [];
    const sourceLines = String(raw || "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    for (const sourceLine of sourceLines) {
      const matches = [...sourceLine.matchAll(/\[(\d{1,2}):(\d{1,2})(?:[.:](\d{1,3}))?]/g)];
      if (!matches.length) continue;
      const text = sourceLine.replace(/\[[^\]]+]/g, "").trim();
      if (!text || creditPattern.test(text)) continue;

      for (const match of matches) {
        const startTime = parseTimestamp(match[1], match[2], match[3] || "");
        const previous = entries.at(-1);

        if (isTranslationLine(text) && previous) {
          previous.text = `${previous.text} / ${text}`;
          continue;
        }

        entries.push({
          id: `line-${entries.length + 1}`,
          startTime,
          text,
          template: entries.length % 3 === 0 ? "flow" : entries.length % 3 === 1 ? "step" : "melt",
          emotion: "custom",
        });
      }
    }

    const sorted = entries
      .sort((a, b) => a.startTime - b.startTime)
      .filter((line, index, list) => index === 0 || line.startTime !== list[index - 1].startTime || line.text !== list[index - 1].text);

    return assignEndTimes(sorted);
  }

  function normalizeJsonLyrics(rawLines = []) {
    const normalized = rawLines
      .filter((line) => line && line.text)
      .map((line, index) => ({
        id: line.id || `line-${index + 1}`,
        startTime: Number(line.startTime ?? line.time ?? 0),
        text: line.text,
        template: line.template || (index % 3 === 0 ? "flow" : index % 3 === 1 ? "step" : "melt"),
        emotion: line.emotion || "custom",
      }))
      .sort((a, b) => a.startTime - b.startTime);
    return assignEndTimes(normalized);
  }

  function toLrc(lines) {
    return lines.map((line) => `[${formatTime(line.startTime)}]${line.text}`).join("\n");
  }

  function currentLyricIndex(lyricTime = getLyricTime()) {
    return lyrics.findIndex((line) => lyricTime >= line.startTime && lyricTime < line.endTime);
  }

  function lineByIndex(index) {
    return lyrics.find((line) => line.index === index) || lyrics[0];
  }

  function pointForLyric(index) {
    return points.find((point) => point.lyricIndex === index);
  }

  function pointById(id) {
    return points.find((point) => point.id === id);
  }

  function activePoint(now = getCurrentTime()) {
    const lyricTime = getLyricTime(now);
    return points.find((point) => lyricTime >= point.timestamp && lyricTime <= (point.endTimestamp || point.timestamp + 5));
  }

  function isPointActiveForLine(point, now = getCurrentTime()) {
    if (!point) return false;
    const lyricTime = getLyricTime(now);
    return lyricTime >= point.timestamp && lyricTime <= (point.endTimestamp || point.timestamp + 5);
  }

  function commentsForPoint(point) {
    const highlighted = comments.highlightedLyrics?.find((item) => item.lyricIndex === point?.lyricIndex);
    return highlighted?.comments || comments.defaultComments || [];
  }

  function average(dataArray, start, end) {
    if (!dataArray) return 0;
    let sum = 0;
    let count = 0;
    for (let index = start; index < Math.min(end, dataArray.length); index += 1) {
      sum += dataArray[index];
      count += 1;
    }
    return count ? sum / count : 0;
  }

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const scale = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(rect.width * scale));
    canvas.height = Math.max(1, Math.floor(rect.height * scale));
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
  }

  function createParticles(count = 86) {
    const capped = Math.min(count, app.dataset.motion === "reduced" ? 24 : 110);
    state.particles = Array.from({ length: capped }, () => ({
      x: Math.random(),
      y: Math.random(),
      z: Math.random(),
      vx: (Math.random() - 0.5) * 0.002,
      vy: (Math.random() - 0.5) * 0.002,
      size: 1.8 + Math.random() * 5.5,
      color: Math.random() > 0.5 ? "#e5bd5c" : "#79f4e0",
      life: 0.3 + Math.random() * 0.7,
    }));
  }

  function draw() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    ctx.clearRect(0, 0, width, height);

    if (!state.isInitialized || state.hidden || app.dataset.motion === "reduced") return;

    const pulse = Math.min(1, state.energy / 100);
    const gradient = ctx.createRadialGradient(width * 0.5, height * 0.48, 20, width * 0.5, height * 0.48, width * 0.78);
    gradient.addColorStop(0, `rgba(229, 189, 92, ${0.08 + pulse * 0.12})`);
    gradient.addColorStop(0.55, `rgba(98, 216, 137, ${0.05 + pulse * 0.1})`);
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    for (const particle of state.particles) {
      particle.x += particle.vx * (1 + state.bass / 42);
      particle.y += particle.vy * (1 + state.energy / 60);
      particle.vx *= 0.992;
      particle.vy *= 0.992;
      particle.life = Math.max(0.14, particle.life * 0.997);
      particle.z = (particle.z + 0.0015 + state.energy / 90000) % 1;

      if (particle.x < -0.06) particle.x = 1.06;
      if (particle.x > 1.06) particle.x = -0.06;
      if (particle.y < -0.08) particle.y = 1.08;
      if (particle.y > 1.08) particle.y = -0.08;

      const x = particle.x * width;
      const y = particle.y * height;
      const size = particle.size * (0.6 + particle.z * 1.4) * (1 + pulse * 0.6);
      ctx.globalAlpha = 0.18 + particle.life * 0.52;
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.ellipse(x, y, size * 1.45, size * 0.58, particle.z * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }

    state.burstRings = state.burstRings.filter((ring) => ring.life > 0);
    for (const ring of state.burstRings) {
      ring.life -= 0.018;
      const radius = ring.radius + (1 - ring.life) * ring.speed;
      ctx.save();
      ctx.globalAlpha = Math.max(0, ring.life) * 0.58;
      ctx.strokeStyle = ring.color;
      ctx.lineWidth = 2 + ring.life * 4;
      ctx.beginPath();
      ctx.arc(ring.x * width, ring.y * height, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    if (performance.now() < state.burstUntil) {
      ctx.save();
      const power = (state.burstUntil - performance.now()) / 1600;
      ctx.globalAlpha = Math.max(0, power) * 0.26;
      ctx.strokeStyle = "#ffe39a";
      ctx.lineWidth = 2;
      ctx.strokeRect(14 + power * 8, 14 + power * 8, width - 28 - power * 16, height - 28 - power * 16);
      ctx.restore();
    }

    ctx.globalAlpha = 1;
  }

  function damageForLine(line) {
    if (!line) return null;
    return state.damageStates.get(line.id) || null;
  }

  function clearLineDamage(line, render = false) {
    const damage = damageForLine(line);
    if (damage?.resetTimer) clearDelay(damage.resetTimer);
    if (line) state.damageStates.delete(line.id);
    if (render) {
      state.lastLyricSignature = "";
      renderLyricStack(getCurrentTime(), true);
    }
  }

  function clearInactiveDamage(currentIndex) {
    for (const [id, damage] of state.damageStates.entries()) {
      const line = lyrics.find((item) => item.id === id);
      if (!line || line.index === currentIndex || damage.isShattered) continue;
      state.damageStates.delete(id);
    }
  }

  function damageLabel(level) {
    if (level >= 5) return "释放 5/5";
    if (level === 4) return "临界 4/5";
    return `共振 ${level}/5`;
  }

  function renderLyricStack(now = getCurrentTime(), force = false) {
    const lyricTime = getLyricTime(now);
    const index = currentLyricIndex(lyricTime);
    const currentLine = index >= 0 ? lyrics[index] : null;
    const nearbyPoint = activePoint(now);

    if (state.currentIndex !== index) {
      state.currentIndex = index;
      clearInactiveDamage(index);
    }

    setTemplate(currentLine?.template || song.defaultTemplate || "step");

    if (nearbyPoint && currentLine?.index === nearbyPoint.lyricIndex) {
      const damage = damageForLine(currentLine);
      tapHint.textContent = damage ? `点击高亮歌词积累共振 ${Math.min(damage.hitCount, 5)}/5` : "点击高亮歌词积累共振 0/5";
      tapHint.classList.add("show");
      aiPrompt.textContent = `AI 检测到「${nearbyPoint.label}」，点击当前歌词累积裂纹。`;
    } else {
      tapHint.classList.remove("show");
      if (!nearbyPoint) aiPrompt.textContent = "AI 正在监听歌曲结构，接近高能段落会标记歌词。";
    }

    const signature = [
      index,
      nearbyPoint?.id || "none",
      currentLine?.template || "step",
      lyrics.length,
      [...state.damageStates.values()].map((item) => `${item.lyricId}:${item.damageLevel}:${item.isShattered}`).join("|"),
    ].join(":");
    if (!force && signature === state.lastLyricSignature) return;
    state.lastLyricSignature = signature;

    lyricStack.innerHTML = lyrics
      .map((line, itemIndex) => {
        const centeredIndex = index >= 0 ? index : 0;
        const offset = itemIndex - centeredIndex;
        if (index < 0 && itemIndex > 3) return "";
        if (index >= 0 && Math.abs(offset) > 3) return "";

        const point = pointForLyric(line.index);
        const isCurrent = itemIndex === index;
        const isNear = isCurrent && point && isPointActiveForLine(point, now);
        const damage = damageForLine(line);
        const y = index < 0 ? itemIndex * 66 - 72 : offset * 66;
        const abs = Math.abs(offset);
        const scale = isCurrent ? 1 : 0.92 - abs * 0.09;
        const opacity = isCurrent ? 1 : Math.max(0.24, 0.62 - abs * 0.13);
        const z = isCurrent ? 90 : -abs * 34;
        const flowX = app.dataset.template === "flow" && !audio.paused ? Math.sin((now + itemIndex) * 0.5) * (isCurrent ? 18 : 8) : 0;
        const damageClass = damage ? ` cracked damage-${damage.damageLevel}${damage.isShattered ? " shattered" : ""}` : "";
        const meter = damage?.hitCount ? `<span class="damage-meter">${damageLabel(damage.damageLevel)}</span>` : "";
        return `
          <button class="lyric-line${isCurrent ? " current" : ""}${isNear ? " near-point" : ""}${damageClass}" data-index="${itemIndex}" style="opacity:${opacity};--flow-x:${flowX}px;--line-y:${y}px;--scale:${scale};--z:${z}px;--crack-level:${damage?.damageLevel || 1};">
            <span class="time">${formatTime(line.startTime)}</span>
            <span class="text">${line.text}</span>
            ${point ? `<span class="point-label">${point.label}</span>` : ""}
            ${meter}
          </button>
        `;
      })
      .join("");

  }

  function renderProgressPoints() {
    const duration = getDuration();
    pointTrack.innerHTML = points
      .map((point) => {
        const left = Math.max(0.5, Math.min(99.5, (point.timestamp / duration) * 100));
        return `<button class="progress-point" data-point="${point.id}" style="left:${left}%" title="${point.label}"></button>`;
      })
      .join("");

  }

  function renderCurrentComments(point) {
    const list = commentsForPoint(point).slice(0, 3);
    currentComments.innerHTML = list.map((text, index) => `<span class="comment-pill" style="animation-delay:${index * 0.08}s">${text}</span>`).join("");
    currentWave.classList.remove("active");
    void currentWave.offsetWidth;
    currentWave.classList.add("active");
  }

  function createShardsForLine(line, highEnergy) {
    fragmentLayer.innerHTML = "";
    const chars = Array.from(line.text).filter((char) => char.trim());
    const max = highEnergy ? 62 : 30;
    const visibleChars = chars.slice(0, max);

    visibleChars.forEach((char, index) => {
      const angle = (index / Math.max(1, visibleChars.length)) * Math.PI * 2 + (Math.random() - 0.5) * 0.8;
      const group = index % 5;
      const edgeForce = highEnergy ? 360 + Math.random() * 210 : 190 + Math.random() * 120;
      const dx = group === 0 ? (Math.random() > 0.5 ? 250 : -250) : Math.cos(angle) * edgeForce;
      const dy =
        group === 1
          ? 330 + Math.random() * 80
          : group === 2
            ? 230 + Math.random() * 120
            : Math.sin(angle) * (highEnergy ? 280 : 170);
      const fragment = document.createElement("span");
      fragment.className = `fragment ${group === 1 ? "progress-hit" : group === 2 ? "drop" : group === 0 ? "border-stick" : ""}`;
      fragment.textContent = char;
      fragment.style.setProperty("--dx", `${dx}px`);
      fragment.style.setProperty("--dy", `${dy}px`);
      fragment.style.setProperty("--depth", `${group === 3 ? 220 + Math.random() * 180 : -120 + Math.random() * 260}px`);
      fragment.style.setProperty("--rz", `${(Math.random() * 540 - 270).toFixed(1)}deg`);
      fragment.style.setProperty("--fragment-size", `${highEnergy ? 28 + Math.random() * 24 : 20 + Math.random() * 14}px`);
      fragment.style.setProperty("--fragment-color", Math.random() > 0.5 ? "#ffe39a" : Math.random() > 0.5 ? "#79f4e0" : "#f6fff4");
      fragment.style.setProperty("--fragment-duration", `${highEnergy ? 1.3 + Math.random() * 0.45 : 1.05 + Math.random() * 0.35}s`);
      fragment.style.setProperty("--fragment-delay", `${Math.random() * 90}ms`);
      fragment.style.setProperty("--end-scale", `${0.36 + Math.random() * 0.5}`);
      fragmentLayer.appendChild(fragment);
    });

    state.burstRings = Array.from({ length: highEnergy ? 5 : 3 }, (_, index) => ({
      x: 0.5 + (Math.random() - 0.5) * 0.08,
      y: 0.46 + (Math.random() - 0.5) * 0.08,
      radius: 22 + index * 16,
      speed: highEnergy ? 180 + index * 42 : 100 + index * 28,
      life: 1,
      color: index % 2 ? "#79f4e0" : "#ffe39a",
    }));

    progressWrap.style.setProperty("--impact-x", `${42 + Math.random() * 28}%`);
    progressWrap.classList.remove("impacting");
    void progressWrap.offsetWidth;
    progressWrap.classList.add("impacting");
    delay(() => {
      progressWrap.classList.remove("impacting");
      fragmentLayer.innerHTML = "";
    }, 1800);
  }

  function playInteractionSound(kind) {
    if (app.dataset.sound !== "on") return;
    try {
      const context = state.audioContext || new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const frequencies = { tap: 280, release: 82, score: 520, charge: 740 };
      oscillator.type = kind === "release" ? "sawtooth" : "sine";
      oscillator.frequency.value = frequencies[kind] || 320;
      gain.gain.value = kind === "release" ? 0.045 : 0.028;
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + (kind === "release" ? 0.28 : 0.14));
      oscillator.stop(context.currentTime + (kind === "release" ? 0.3 : 0.16));
    } catch {
      // Optional interaction sound should never block the demo.
    }
  }

  function triggerResonance(point, button) {
    const line = lineByIndex(point.lyricIndex);
    if (!line) return;

    const now = performance.now();
    const highEnergy = highIntensityTypes.has(point.type);
    const existing = damageForLine(line) || {
      lyricId: line.id,
      hitCount: 0,
      damageLevel: 0,
      isShattered: false,
      lastHitAt: 0,
      burstActive: false,
      resetTimer: null,
    };

    if (now - existing.lastHitAt < 180 || existing.burstActive) return;

    existing.lastHitAt = now;
    existing.hitCount = Math.min(5, existing.hitCount + 1);
    existing.damageLevel = Math.min(5, existing.hitCount);
    existing.isShattered = existing.damageLevel >= 5;
    state.damageStates.set(line.id, existing);
    state.selectedPoint = point;

    playInteractionSound(existing.isShattered ? "release" : "tap");
    state.burstUntil = existing.isShattered ? performance.now() + 1700 : performance.now() + 420;
    setHeat(existing.isShattered ? (highEnergy ? 76 : 48) : 32 + existing.damageLevel * 9, false);

    if (button) {
      button.classList.add("pressed", "crack-hit");
      button.style.setProperty("--crack-level", existing.damageLevel);
      delay(() => button.classList.remove("pressed", "crack-hit"), 260);
    }

    app.classList.add("charging");
    renderCurrentComments(point);

    if (existing.damageLevel === 1) {
      aiPrompt.textContent = "共振 1/5：细微裂纹出现，歌词保持完整。";
    } else if (existing.damageLevel === 2) {
      aiPrompt.textContent = "共振 2/5：裂纹扩展，文字边缘开始松动。";
    } else if (existing.damageLevel === 3) {
      aiPrompt.textContent = "共振 3/5：结构松动，进度条收到粒子冲击。";
      progressWrap.classList.remove("impacting");
      void progressWrap.offsetWidth;
      progressWrap.classList.add("impacting");
      delay(() => progressWrap.classList.remove("impacting"), 620);
    } else if (existing.damageLevel === 4) {
      aiPrompt.textContent = "共振已达临界点，再次点击释放音浪。";
    } else {
      existing.burstActive = true;
      app.classList.add("bursting");
      createShardsForLine(line, highEnergy);
      document.querySelectorAll(".progress-point").forEach((marker) => {
        marker.classList.toggle("hit", marker.dataset.point === point.id);
      });
      aiPrompt.textContent = "释放 5/5：歌词主体保留，独立碎片层正在向边框和进度条飞散。";
      existing.resetTimer = delay(() => {
        clearLineDamage(line, true);
        app.classList.remove("bursting");
        aiPrompt.textContent = "共振余波已回收，歌词恢复为可读状态。";
        maybeStopLoop();
      }, 1900);
    }

    state.lastLyricSignature = "";
    renderLyricStack(getCurrentTime(), true);
    startLoop();

    delay(() => {
      app.classList.remove("charging");
      if (!existing.isShattered) {
        aiPrompt.textContent = `裂纹已留在歌词上，还需要 ${5 - existing.damageLevel} 次点击触发爆裂。`;
      }
    }, existing.isShattered ? 1200 : 760);
  }

  async function setupAudio() {
    if (state.audioContext) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    state.audioContext = new AudioContextClass();
    state.analyser = state.audioContext.createAnalyser();
    state.analyser.fftSize = 512;
    state.frequencyData = new Uint8Array(state.analyser.frequencyBinCount);
    state.source = state.audioContext.createMediaElementSource(audio);
    state.source.connect(state.analyser);
    state.analyser.connect(state.audioContext.destination);
  }

  async function togglePlay() {
    await setupAudio();
    if (state.audioContext?.state === "suspended") await state.audioContext.resume();
    if (app.dataset.view === "settlement") resetPlayback();

    if (audio.paused) {
      await audio.play();
      playButton.textContent = "Ⅱ";
      playButton.setAttribute("aria-label", "暂停");
      startLoop();
    } else {
      audio.pause();
      playButton.textContent = "▶";
      playButton.setAttribute("aria-label", "播放");
      syncFromAudio();
      maybeStopLoop();
    }
  }

  function seek(time) {
    const duration = getDuration();
    const next = Math.max(0, Math.min(duration - 0.1, time));
    audio.currentTime = next;
    syncFromAudio(true);
  }

  function resetDamageStates() {
    for (const damage of state.damageStates.values()) {
      clearDelay(damage.resetTimer);
    }
    state.damageStates.clear();
    fragmentLayer.innerHTML = "";
    app.classList.remove("charging", "bursting");
  }

  function resetPlayback() {
    state.settlementDone = false;
    setView("player");
    resetDamageStates();
    seek(0);
    audio.pause();
    playButton.textContent = "▶";
    playButton.setAttribute("aria-label", "播放");
    setHeat(0, false);
    state.lastLyricSignature = "";
    renderLyricStack(0, true);
  }

  function updateMetrics() {
    const point = activePoint();
    if (state.analyser && state.frequencyData && !audio.paused) {
      state.analyser.getByteFrequencyData(state.frequencyData);
      state.bass = Math.round(average(state.frequencyData, 0, 22) / 2.55);
      const mids = average(state.frequencyData, 22, 92) / 2.55;
      const highs = average(state.frequencyData, 92, state.frequencyData.length) / 2.55;
      state.energy = Math.round(state.bass * 0.46 + mids * 0.38 + highs * 0.16);
    } else {
      state.bass = point ? Math.round(point.intensity * 0.42) : 0;
      state.energy = point ? Math.round(point.intensity * 0.48) : 0;
    }
    energyHint.textContent = `当前能量 ${Math.max(0, state.energy)}`;
    setHeat(point && !audio.paused ? point.intensity : Math.max(0, state.energy * 0.18));
  }

  function updateProgress(now = getCurrentTime()) {
    const duration = getDuration();
    progress.value = Math.round((now / duration) * 1000) || 0;
    currentTimeLabel.textContent = formatTime(now);
    durationTimeLabel.textContent = formatTime(duration);
  }

  function syncFromAudio(force = false) {
    const now = getCurrentTime();
    updateProgress(now);
    renderLyricStack(now, force);
  }

  function tick() {
    const nowFrame = performance.now();
    state.lastFrame = nowFrame;

    if (audio.ended) showSettlement();
    updateMetrics();
    syncFromAudio();
    draw();

    const point = activePoint();
    if (point && !state.lastPointPrompted[point.id]) {
      state.lastPointPrompted[point.id] = true;
      tapHint.classList.add("show");
    }

    if (!audio.paused || performance.now() < state.burstUntil || state.burstRings.length) {
      state.raf = requestAnimationFrame(tick);
    } else {
      state.raf = null;
    }
  }

  function startLoop() {
    if (!state.raf) {
      state.lastFrame = performance.now();
      state.raf = requestAnimationFrame(tick);
    }
  }

  function stopLoop() {
    if (state.raf) {
      cancelAnimationFrame(state.raf);
      state.raf = null;
    }
  }

  function maybeStopLoop() {
    if (audio.paused && performance.now() >= state.burstUntil && !state.burstRings.length) stopLoop();
  }

  function showSettlement() {
    if (state.settlementDone) return;
    state.settlementDone = true;
    audio.pause();
    playButton.textContent = "▶";
    playButton.setAttribute("aria-label", "播放");
    setView("settlement");
    setHeat(12, false);
    animateScores();
    maybeStopLoop();
  }

  function animateScores() {
    const scoreNodes = document.querySelectorAll("[data-score]");
    const duration = 1900;
    const start = performance.now();
    playInteractionSound("score");

    function easeOutCubic(value) {
      return 1 - Math.pow(1 - value, 3);
    }

    function frame(now) {
      const progressValue = Math.min(1, (now - start) / duration);
      const eased = easeOutCubic(progressValue);
      scoreNodes.forEach((node) => {
        const key = node.dataset.score;
        const finalValue = Number(finalScores[key] || 0);
        const current = Math.round(finalValue * eased + Math.random() * (1 - eased) * 900);
        node.textContent = key === "emotionPeak" ? `${Math.min(finalValue, current)}%` : current.toLocaleString("zh-CN");
      });
      if (progressValue < 1) {
        requestAnimationFrame(frame);
      } else {
        playInteractionSound("release");
        setHeat(88, false);
        scoreNodes.forEach((node) => node.classList.add("locked"));
      }
    }

    requestAnimationFrame(frame);
  }

  function renderField(selectedId) {
    const items = comments.highlightedLyrics || [];
    const maxHeat = Math.max(...items.map((item) => item.heat), 1);
    const positions = [
      [50, 43], [28, 28], [72, 26], [38, 64], [68, 68], [48, 78], [18, 52], [82, 50],
    ];

    lyricCloud.innerHTML = items
      .map((item, index) => {
        const heat = item.heat / maxHeat;
        const [x, y] = positions[index % positions.length];
        const color = index % 3 === 0 ? "#ff79b6" : index % 3 === 1 ? "#79f4e0" : "#8aa7ff";
        const size = 18 + heat * 18;
        const opacity = 0.46 + heat * 0.5;
        const glow = 12 + heat * 26;
        const depth = `${Math.round(heat * 90)}px`;
        const selected = selectedId === item.id;
        const dim = selectedId && !selected;
        return `
          <button class="cloud-lyric${selected ? " selected" : ""}${dim ? " dim" : ""}" data-id="${item.id}" style="left:${x}%;top:${y}%;font-size:${size}px;opacity:${opacity};--cloud-color:${color};--glow:${glow}px;--depth:${depth};--speed:${4.5 - heat * 1.8}s">
            ${item.text}
            <small>${item.charges} 次充能 / ${item.heat.toLocaleString("zh-CN")} 热度</small>
          </button>
        `;
      })
      .join("");

    if (!state.currentFieldLyric && items[0]) selectFieldLyric(items[0]);
  }

  function selectFieldLyric(item) {
    state.currentFieldLyric = item;
    commentDetail.querySelector("h3").textContent = item.text;
    detailComments.innerHTML = item.comments
      .map((text, index) => `<div class="detail-comment" style="animation-delay:${index * 0.08}s">${text}</div>`)
      .join("");
    chargeButton.textContent = `为这句歌词充能 / ${item.charges}`;
    chargeNote.textContent = "充能会提升该句成为后续高亮推荐候选的概率。";
    electricWave.classList.remove("active");
    void electricWave.offsetWidth;
    electricWave.classList.add("active");
    renderField(item.id);
  }

  function chargeCurrentLyric() {
    if (state.chargeLocked || !state.currentFieldLyric) return;
    state.chargeLocked = true;
    const item = state.currentFieldLyric;
    item.charges += 1;
    item.heat += 88;
    playInteractionSound("charge");
    chargeNote.textContent = "已记录：热度达到阈值后，该句会进入后续听众的热门共振点候选。";
    chargeNote.classList.add("flash");
    selectFieldLyric(item);
    delay(() => {
      state.chargeLocked = false;
      chargeNote.classList.remove("flash");
    }, 720);
  }

  function applyAudioFile(file) {
    if (!file) return;
    audio.src = URL.createObjectURL(file);
    document.querySelector("#songTitle").textContent = file.name.replace(/\.[^.]+$/, "");
    document.querySelector("#artistName").textContent = "本地导入音频";
    state.settlementDone = false;
    resetPlayback();
  }

  function applyCustomLyrics() {
    const nextLyrics = parseLrc(lyricsInput.value);
    if (!nextLyrics.length) return;
    lyrics = nextLyrics;
    resetDamageStates();
    state.currentIndex = -1;
    state.lastLyricSignature = "";
    state.lastPointPrompted = {};
    lyricsImport.classList.remove("open");
    seek(0);
    renderProgressPoints();
    aiPrompt.textContent = "已应用 LRC 歌词；同步继续读取音频 currentTime。";
  }

  function adjustLyricOffset(delta) {
    state.lyricOffset = Math.max(-20, Math.min(30, state.lyricOffset + delta));
    state.lastLyricSignature = "";
    renderLyricStack(getCurrentTime(), true);
    const direction = state.lyricOffset >= 0 ? "提前" : "延后";
    aiPrompt.textContent = `歌词同步偏移：${direction} ${Math.abs(state.lyricOffset).toFixed(1)} 秒。`;
  }

  function resetLyricOffset() {
    state.lyricOffset = 0;
    state.lastLyricSignature = "";
    renderLyricStack(getCurrentTime(), true);
    aiPrompt.textContent = "歌词同步偏移已重置为 0 秒。";
  }

  function applyPosterFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      posterBg.style.backgroundImage = `linear-gradient(180deg, rgba(0,0,0,0.04), rgba(0,0,0,0.82)), url("${reader.result}")`;
    };
    reader.readAsDataURL(file);
  }

  function initializeLyrics() {
    const parsedLrc = parseLrc(data.defaultLrc);
    lyrics = parsedLrc.length ? parsedLrc : normalizeJsonLyrics(data.lyrics?.lines || []);
    lyricsInput.value = data.defaultLrc || toLrc(lyrics);
  }

  function waitForAudioReady() {
    if (!audio.src) return Promise.resolve();
    if (Number.isFinite(audio.duration) && audio.duration > 0) return Promise.resolve();
    return new Promise((resolve) => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        audio.removeEventListener("loadedmetadata", finish);
        audio.removeEventListener("canplay", finish);
        resolve();
      };
      audio.addEventListener("loadedmetadata", finish, { once: true });
      audio.addEventListener("canplay", finish, { once: true });
      delay(finish, 1400);
    });
  }

  async function init() {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      app.dataset.motion = "reduced";
      motionToggle.checked = false;
    }

    initializeLyrics();
    if (data.defaultAudio) audio.src = data.defaultAudio;
    if (data.defaultPoster) {
      posterBg.style.backgroundImage = `linear-gradient(180deg, rgba(0,0,0,0.04), rgba(0,0,0,0.82)), url("${data.defaultPoster}")`;
    }

    document.querySelector("#songTitle").textContent = song.title || "Deadman";
    document.querySelector("#artistName").textContent = `${song.artist || "蔡徐坤"} / Demo Track`;
    createParticles();
    resizeCanvas();
    renderField();
    await waitForAudioReady();
    renderProgressPoints();
    syncFromAudio(true);
    updateMetrics();
    draw();
    state.isInitialized = true;
    app.dataset.ready = "true";
  }

  addListener(playButton, "click", togglePlay);
  addListener(document.querySelector("#demoEndButton"), "click", showSettlement);
  addListener(lyricsToggleButton, "click", () => lyricsImport.classList.toggle("open"));
  addListener(applyLyricsButton, "click", applyCustomLyrics);
  addListener(lyricEarlierButton, "click", () => adjustLyricOffset(0.5));
  addListener(lyricLaterButton, "click", () => adjustLyricOffset(-0.5));
  addListener(lyricResetButton, "click", resetLyricOffset);
  addListener(document.querySelector("#fieldButton"), "click", () => {
    setView("field");
    renderField(state.currentFieldLyric?.id);
  });
  addListener(document.querySelector("#backButton"), "click", () => setView("player"));
  addListener(chargeButton, "click", chargeCurrentLyric);
  addListener(document.querySelector("#audioInput"), "change", (event) => applyAudioFile(event.target.files[0]));
  addListener(document.querySelector("#posterInput"), "change", (event) => applyPosterFile(event.target.files[0]));
  addListener(motionToggle, "change", (event) => {
    app.dataset.motion = event.target.checked ? "full" : "reduced";
  });
  addListener(soundToggle, "change", (event) => {
    app.dataset.sound = event.target.checked ? "on" : "off";
  });
  addListener(lyricStack, "click", (event) => {
    const button = event.target.closest(".lyric-line");
    if (!button || !lyricStack.contains(button)) return;
    const line = lyrics[Number(button.dataset.index)];
    const point = pointForLyric(line?.index);
    if (!line || !point || line.index !== state.currentIndex || !isPointActiveForLine(point)) return;
    triggerResonance(point, button);
  });
  addListener(pointTrack, "click", (event) => {
    const button = event.target.closest(".progress-point");
    if (!button || !pointTrack.contains(button)) return;
    const point = pointById(button.dataset.point);
    if (!point) return;
    seek(point.timestamp);
  });
  addListener(lyricCloud, "click", (event) => {
    const button = event.target.closest(".cloud-lyric");
    if (!button || !lyricCloud.contains(button)) return;
    const item = (comments.highlightedLyrics || []).find((entry) => entry.id === button.dataset.id);
    if (item) selectFieldLyric(item);
  });
  addListener(progress, "input", () => {
    seek((Number(progress.value) / 1000) * getDuration());
  });
  addListener(audio, "loadedmetadata", () => {
    lyrics = assignEndTimes(lyrics, getDuration());
    updateProgress(0);
    renderProgressPoints();
    renderLyricStack(getCurrentTime(), true);
  });
  addListener(audio, "timeupdate", () => syncFromAudio());
  addListener(audio, "seeked", () => syncFromAudio(true));
  addListener(audio, "play", startLoop);
  addListener(audio, "pause", () => {
    syncFromAudio(true);
    maybeStopLoop();
  });
  addListener(audio, "ended", showSettlement);
  addListener(window, "resize", () => {
    resizeCanvas();
    draw();
  });
  addListener(document, "visibilitychange", () => {
    state.hidden = document.hidden;
    if (!state.hidden) {
      syncFromAudio(true);
      if (!audio.paused) startLoop();
    }
  });
  addListener(window, "beforeunload", () => window.__resonanceCleanup?.());

  window.__resonanceCleanup = () => {
    stopLoop();
    activeTimeouts.forEach((id) => window.clearTimeout(id));
    activeTimeouts.clear();
    cleanupCallbacks.splice(0).forEach((callback) => callback());
    if (state.audioContext?.state !== "closed") state.audioContext?.close?.();
    window.__resonanceCleanup = null;
  };

  init();
})();
