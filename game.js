// U CANT WIN — v4 GD-style: pause menu, level names, attempts, progress, per-mode soundtracks, GD cube + upward obstacles.
const cv = document.getElementById("game"), ctx = cv.getContext("2d");
const W = cv.width, H = cv.height, GROUND = H - 64, CEIL = 64;
const hudDist = document.getElementById("hudDist"), hudBest = document.getElementById("hudBest"),
  hudDeath = document.getElementById("hudDeath"), hudMode = document.getElementById("hudMode"),
  hudLevel = document.getElementById("hudLevel"), hudDiff = document.getElementById("hudDiff"),
  hudProgPct = document.getElementById("hudProgPct"), progFill = document.getElementById("progFill"),
  hudAttempt = document.getElementById("hudAttempt"),
  loader = document.getElementById("loader"), barFill = document.getElementById("barFill"),
  pauseMenu = document.getElementById("pauseMenu"), pauseLevel = document.getElementById("pauseLevel"),
  pauseDiff = document.getElementById("pauseDiff"), pauseProgFill = document.getElementById("pauseProgFill"),
  pausePct = document.getElementById("pausePct"), pauseAttempt = document.getElementById("pauseAttempt");

let best = +(localStorage.getItem("ucw-best") || 0); hudBest.textContent = best;
const ORDER = ["ship", "balloon", "plane"];
const LEVELS = {
  ship:    { name: "STEREO PULSE",   diff: "NORMAL MODE", tag: "▲ CUBE — GRAVITY FLIP" },
  balloon: { name: "SKYFALL MADNESS", diff: "HARD MODE",  tag: "● BALLOON — SKYFALL" },
  plane:   { name: "SKYLINE DASH",   diff: "HARDER MODE", tag: "✈ PLANE — SKYLINE" }
};
let running = false, dead = false, paused = false, holding = false, flapT = 0;
let dist = 0, deaths = 0, attempts = 1, speed = 5.8, t = 0, shake = 0, invuln = 0;
let mode = "ship", modeT = 0, nextShift = 16 + Math.random() * 10;
let portal = null;
let obstacles = [], meteors = [], particles = [], trail = [], popups = [];
let clouds = [], stars = [], rain = [];
const P = { x: 110, y: GROUND - 30, w: 30, h: 30, vy: 0, flip: 1, grounded: true };
const B = { x: W / 2, y: H / 2, tx: W / 2, ty: H / 2 };
let balloonT = 0, cubeRot = 0;
for (let i = 0; i < 90; i++) stars.push({ x: Math.random() * W, y: Math.random() * (GROUND - 140), s: Math.random() * 2 + .5 });
for (let i = 0; i < 7; i++) clouds.push({ x: Math.random() * W, y: 26 + Math.random() * 140, s: .5 + Math.random() * 1.1, v: .2 + Math.random() * .45, k: Math.floor(Math.random() * 3) });
for (let i = 0; i < 70; i++) rain.push({ x: Math.random() * W, y: Math.random() * H, v: 9 + Math.random() * 6 });
const WEATHERS = ["clear", "rain", "embers"];
let weather = "clear", weatherT = 0;

/* ================= AUDIO — alag soundtrack har map ke liye (WebAudio, no files) ================= */
let AC = null, musicGain = null, sfxGain = null, seqTimer = null, seqStep = 0, muted = false;
let musicVol = +(localStorage.getItem("ucw-music") ?? 70), sfxVol = +(localStorage.getItem("ucw-sfx") ?? 80);
const TRACKS = {
  ship:    { bpm: 150, wave: "square",   bass: [110, 110, 130.81, 98, 110, 110, 146.83, 130.81], lead: [440, 523.25, 659.25, 523.25] },
  balloon: { bpm: 96,  wave: "triangle", bass: [87.31, 103.83, 130.81, 116.54], lead: [220, 261.63, 329.63, 392] },
  plane:   { bpm: 132, wave: "sawtooth", bass: [98, 123.47, 146.83, 123.47], lead: [392, 493.88, 587.33, 783.99, 587.33, 493.88] }
};
function initAudio() {
  if (AC) return;
  try {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    musicGain = AC.createGain(); musicGain.gain.value = musicVol / 100 * 0.5; musicGain.connect(AC.destination);
    sfxGain = AC.createGain(); sfxGain.gain.value = sfxVol / 100 * 0.9; sfxGain.connect(AC.destination);
  } catch (e) { AC = null; }
}
function note(freq, dur, type, vol, when) {
  if (!AC || muted) return;
  try {
    const o = AC.createOscillator(), g = AC.createGain();
    o.type = type || "square"; o.frequency.value = freq;
    const t0 = when || AC.currentTime;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.001, vol || 0.12), t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(musicGain); o.start(t0); o.stop(t0 + dur + 0.02);
  } catch (e) {}
}
function sfx(freq, dur, type, vol) {
  if (!AC || muted) return;
  try {
    const o = AC.createOscillator(), g = AC.createGain();
    o.type = type || "square"; o.frequency.value = freq;
    const t0 = AC.currentTime;
    g.gain.setValueAtTime(vol || 0.2, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(sfxGain); o.start(t0); o.stop(t0 + dur + 0.02);
  } catch (e) {}
}
function startMusic(m) {
  if (!AC) return;
  stopMusic();
  const tr = TRACKS[m] || TRACKS.ship;
  const stepDur = 60 / tr.bpm / 2;
  seqStep = 0;
  seqTimer = setInterval(() => {
    if (paused || !running || muted) return;
    const b = tr.bass[seqStep % tr.bass.length];
    const l = tr.lead[Math.floor(seqStep / 2) % tr.lead.length];
    note(b, stepDur * 1.8, tr.wave, 0.10);
    if (seqStep % 2 === 0) note(l, stepDur * 1.2, "square", 0.045);
    if (seqStep % 4 === 2) note(b * 2, stepDur, "sine", 0.05);
    seqStep++;
  }, (stepDur * 1000));
}
function stopMusic() { if (seqTimer) { clearInterval(seqTimer); seqTimer = null; } }

/* ================= LOADER / COUNTDOWN ================= */
let lp = 0;
const lint = setInterval(() => { lp += 20; barFill.style.width = lp + "%";
  if (lp >= 100) { clearInterval(lint); loader.classList.add("hide"); runCount(); } }, 200);
function runCount() {
  const c = document.getElementById("count"), n = document.getElementById("countNum");
  if (!c) { startRun(); return; }
  c.classList.remove("hide");
  const seq = ["3", "2", "1", "GO!"]; let i = 0; n.textContent = seq[0];
  sfx(440, .12);
  const ci = setInterval(() => { i++;
    if (i >= seq.length) { clearInterval(ci); c.classList.add("hide"); startRun(); try { goFS(true); } catch (e) {} }
    else { n.textContent = seq[i]; sfx(i === 3 ? 880 : 440, .12); }
  }, 700);
}

function flash() { const f = document.getElementById("flash"); f.classList.add("on"); setTimeout(() => f.classList.remove("on"), 130); }
function popup(txt, c) { popups.push({ txt, life: 70, c: c || "#fff" }); }
function puff(x, y, n) { for (let i = 0; i < n; i++) particles.push({ x, y, vx: (Math.random() - .5) * 4, vy: -Math.random() * 3 - 1, life: 26, c: "#fff", s: 3 }); }
function explode(x, y) { for (let i = 0; i < 30; i++) particles.push({ x, y, vx: (Math.random() - .5) * 10, vy: (Math.random() - .5) * 10, life: 40, c: `hsl(${Math.random() * 360},100%,62%)`, s: 4 }); }

function syncHudLevel() {
  const L = LEVELS[mode];
  hudMode.textContent = L.tag;
  hudLevel.textContent = L.name;
  hudDiff.textContent = L.diff;
  hudAttempt.textContent = attempts;
}
function syncPauseUI() {
  const L = LEVELS[mode];
  const pct = Math.min(99, Math.floor(modeT / nextShift * 100));
  pauseLevel.textContent = L.name;
  pauseDiff.textContent = L.diff + " • " + L.tag;
  pauseProgFill.style.width = pct + "%";
  pausePct.textContent = pct + "%  •  " + Math.floor(dist) + "m";
  pauseAttempt.textContent = "ATTEMPT " + attempts;
  progFill.style.width = pct + "%";
  hudProgPct.textContent = pct + "%";
}

function startRun() {
  initAudio(); if (AC && AC.state === "suspended") AC.resume();
  running = true; dead = false; paused = false; pauseMenu.classList.add("hide");
  dist = 0; attempts = 1; mode = "ship"; modeT = 0;
  nextShift = 16 + Math.random() * 10; portal = null; obstacles = []; meteors = []; popups = [];
  P.y = GROUND - P.h; P.vy = 0; P.flip = 1; P.grounded = true; B.x = B.tx = W / 2; B.y = B.ty = H / 2;
  cubeRot = 0; syncHudLevel();
  popup(LEVELS.ship.name + " — " + LEVELS.ship.diff, "#22d3ee");
  startMusic("ship");
}
function restartRun() {
  attempts++;
  mode = "ship"; modeT = 0; nextShift = 16 + Math.random() * 10; portal = null;
  dist = 0; obstacles = []; meteors = []; dead = false; invuln = 1; paused = false;
  pauseMenu.classList.add("hide");
  P.y = GROUND - P.h; P.vy = 0; P.flip = 1; P.grounded = true; cubeRot = 0;
  syncHudLevel(); popup("ATTEMPT " + attempts + " — " + LEVELS.ship.name, "#22d3ee");
  sfx(660, .12); startMusic("ship");
}
function die() {
  if (dead || invuln > 0) return; dead = true; deaths++; hudDeath.textContent = deaths;
  flash(); sfx(160, .3, "sawtooth", .3);
  if (mode === "balloon") explode(B.x, B.y); else explode(P.x + 15, P.y + 15); shake = 10;
  best = Math.max(best, Math.floor(dist)); hudBest.textContent = best; localStorage.setItem("ucw-best", best);
  popup("OUCH. RETRYING…", "#f87171");
  setTimeout(() => {
    mode = "ship"; modeT = 0; nextShift = 16 + Math.random() * 10; portal = null;
    dist = 0; obstacles = []; meteors = []; dead = false; invuln = 1;
    attempts++; syncHudLevel();
    P.y = GROUND - P.h; P.vy = 0; P.flip = 1; P.grounded = true; cubeRot = 0;
    popup("ATTEMPT " + attempts, "#4ade80"); sfx(520, .1);
    startMusic("ship");
  }, 850);
}
function enterPortal() {
  const i = (ORDER.indexOf(mode) + 1) % ORDER.length;
  mode = ORDER[i]; modeT = 0; nextShift = 16 + Math.random() * 10; portal = null; invuln = 1.6;
  obstacles = []; meteors = []; P.vy = 0; sfx(990, .25, "sine", .25);
  if (mode === "ship") { P.y = GROUND - P.h; P.flip = 1; P.grounded = true; popup("▲ " + LEVELS.ship.name + " — HOLD TO FLY", "#22d3ee"); }
  if (mode === "balloon") { B.x = B.tx = W / 2; B.y = B.ty = H / 2; balloonT = 0; popup("● " + LEVELS.balloon.name + " — PROTECT THE BALLOON!", "#4ade80"); }
  if (mode === "plane") { P.y = H / 2; P.vy = 0; flapT = 0; popup("✈ " + LEVELS.plane.name + " — FIND THE RHYTHM", "#f472b6"); }
  syncHudLevel(); startMusic(mode);
}
/* ---- pause ---- */
function setPaused(v) {
  if (!running) return;
  if (dead && v) return;
  paused = v;
  pauseMenu.classList.toggle("hide", !v);
  if (v) { syncPauseUI(); sfx(330, .1); if (AC) AC.suspend(); }
  else { sfx(660, .1); if (AC) AC.resume(); }
}

/* inputs */
function press(e) {
  initAudio(); if (AC && AC.state === "suspended" && !paused) AC.resume();
  if (!running || dead || paused) return;
  if (mode === "plane") { P.vy = -6.4; flapT = 14; sfx(700, .07, "square", .12); }
  else { holding = true; if (mode === "ship") sfx(500, .06, "square", .1); }
  if (e && e.clientX !== undefined) setTarget(e);
}
function release() { holding = false; }
function setTarget(e) {
  const r = cv.getBoundingClientRect();
  B.tx = (e.clientX - r.left) / r.width * W;
  B.ty = (e.clientY - r.top) / r.height * H;
}

/* spawners — GD flavour: blocks, hanging ceiling killers, triple spikes, upward slabs */
function spawnShip() {
  const r = Math.random(), d = dist;
  const slabY = () => CEIL + 70 + Math.random() * (GROUND - CEIL - 180);
  if (r < .20) obstacles.push({ k: "spike", x: W + 20, w: 26, h: 36 + Math.random() * 16, top: false });
  else if (r < .32) obstacles.push({ k: "spike", x: W + 20, w: 26, h: 36 + Math.random() * 16, top: true });
  else if (r < .44) { const y = slabY(); obstacles.push({ k: "slab", x: W + 20, w: 120 + Math.random() * 60, h: 18, y }); }
  else if (r < .54) { // GD block on ground — jump over / land on top
    obstacles.push({ k: "block", x: W + 20, y: GROUND - 42, w: 42, h: 42 });
  }
  else if (r < .64) { // hanging ceiling block + spike tip (upward danger from top)
    obstacles.push({ k: "hang", x: W + 20, w: 46, h: 60 + Math.random() * 70 });
  }
  else if (r < .74) { // spike corridor — fly the middle
    obstacles.push({ k: "spike", x: W + 20, w: 26, h: 52, top: false });
    obstacles.push({ k: "spike", x: W + 20, w: 26, h: 52, top: true });
  }
  else if (r < .83) { // floating slab with spikes on TOP (upward obstacle — don't land!)
    const y = slabY(); obstacles.push({ k: "spikyslab", x: W + 20, w: 130 + Math.random() * 50, h: 18, y });
  }
  else if (r < .90) { // triple ground spikes — GD classic
    obstacles.push({ k: "triple", x: W + 20 });
  }
  else if (r < .95) { // spinning saw, bobbing up-down
    const y0 = CEIL + 80 + Math.random() * (GROUND - CEIL - 180);
    obstacles.push({ k: "saw", x: W + 20, y: y0, y0, amp: 20 + Math.random() * 30, ph: Math.random() * 6, a: 0 });
  }
  else if (d > 350) { obstacles.push({ k: "spike", x: W + 20, w: 26, h: 40, top: false }); obstacles.push({ k: "spike", x: W + 56, w: 26, h: 40, top: false }); }
  else obstacles.push({ k: "spike", x: W + 20, w: 26, h: 40, top: false });
}
function spawnPlane() {
  const gap = dist > 900 ? 158 : 175;
  const gy = CEIL + gap / 2 + 30 + Math.random() * (GROUND - CEIL - gap - 60);
  const o = { k: "pillar", x: W + 20, gy, gap };
  if (dist > 500 && Math.random() < .35) { o.mv = 40 + Math.random() * 30; o.ph = Math.random() * 6; o.gy0 = gy; }
  obstacles.push(o);
}
function spawnMeteor() {
  const fast = Math.random() < .3;
  meteors.push({ x: 60 + Math.random() * (W - 120), y: -30, vy: (fast ? 5.5 : 3.4) + Math.random() * 2 + dist / 1200, vx: (Math.random() - .5) * 1.6, r: fast ? 9 + Math.random() * 6 : 14 + Math.random() * 12 });
}

function drawGDBlock(x, y, w, h, hue) {
  ctx.fillStyle = "#0b0b14"; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "#fff"; ctx.lineWidth = 3; ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
  ctx.strokeStyle = `hsla(${hue},100%,65%,.7)`; ctx.lineWidth = 1.5; ctx.strokeRect(x + 7, y + 7, w - 14, h - 14);
  ctx.fillStyle = "rgba(255,255,255,.85)";
  ctx.fillRect(x + 4, y + 4, 6, 6); ctx.fillRect(x + w - 10, y + 4, 6, 6);
  ctx.fillRect(x + 4, y + h - 10, 6, 6); ctx.fillRect(x + w - 10, y + h - 10, 6, 6);
}

function loop() {
  requestAnimationFrame(loop);
  if (paused) return; // freeze frame behind GD pause menu
  t += 1 / 60; weatherT += 1 / 60;
  if (weatherT > 22) { weatherT = 0; weather = WEATHERS[Math.floor(Math.random() * 3)]; }
  const hue = (t * 40) % 360;
  if (running && !dead) {
    const zone = dist < 500 ? 0 : dist < 1200 ? 1 : 2;
    speed = 5.8 + zone * .6 + Math.min(1.2, dist / 1000);
    const step = speed * .06;
    dist += step; modeT += 1 / 60;
    if (invuln > 0) invuln -= 1 / 60;
    if (!portal && modeT >= nextShift) portal = { x: W + 40 };
    if (portal) { portal.x -= speed; if (portal.x <= P.x + 40 && portal.x >= P.x - 60) enterPortal(); if (portal && portal.x < -120) portal = null; }

    // progress bar (portal = level progress, GD style)
    const pct = Math.min(99, Math.floor(modeT / nextShift * 100));
    progFill.style.width = pct + "%"; hudProgPct.textContent = pct + "%";

    if (mode === "ship") {
      spawnShip._in = (spawnShip._in ?? 260) - speed;
      if (spawnShip._in <= 0 && !portal) { spawnShip(); spawnShip._in = 300 + Math.random() * 140; }
      P.vy += holding ? -1.05 : .75;
      P.vy = Math.max(-8, Math.min(8, P.vy)); P.y += P.vy;
      cubeRot += (P.grounded ? 0.02 : 0.09 + Math.abs(P.vy) * 0.008);
      if (P.y <= CEIL) { P.y = CEIL; die(); }
      if (P.y + P.h >= GROUND) { P.y = GROUND - P.h; if (!P.grounded) puff(P.x + 15, GROUND, 3); P.vy = 0; P.grounded = true; }
      else P.grounded = false;
      for (const o of obstacles) o.x -= speed;
      obstacles = obstacles.filter(o => o.x > -220);
      const px1 = P.x + 7, px2 = P.x + P.w - 7, py1 = P.y + 5, py2 = P.y + P.h - 2;
      for (const o of obstacles) {
        if (o.k === "spike") {
          const top = o.top ? CEIL : GROUND - o.h;
          if (px2 > o.x + 7 && px1 < o.x + o.w - 7 && (o.top ? py1 < top + o.h - 10 : py2 > top + 10)) die();
        } else if (o.k === "triple") {
          for (let s = 0; s < 3; s++) {
            const sx = o.x + s * 26;
            if (px2 > sx + 7 && px1 < sx + 19 && py2 > GROUND - 30) die();
          }
        } else if (o.k === "saw") {
          o.a = (o.a || 0) + .22; o.y = o.y0 + Math.sin(t * 2 + o.ph) * o.amp;
          const dx = (P.x + 15) - (o.x + 20), dy = (P.y + 15) - (o.y + 20);
          if (dx * dx + dy * dy < 25 * 25) die();
        } else if (o.k === "slab") {
          if (px2 > o.x + 2 && px1 < o.x + o.w - 2 && py2 > o.y + 4 && py1 < o.y + o.h - 2) {
            const fromTop = (P.y + P.h) - o.y < (o.y + o.h) - P.y;
            if (fromTop && P.vy >= 0) { P.y = o.y - P.h; P.vy = 0; P.grounded = true; }
            else if (!fromTop && P.vy <= 0) { P.y = o.y + o.h; P.vy = 1; }
          }
        } else if (o.k === "block") {
          if (px2 > o.x + 3 && px1 < o.x + o.w - 3 && py2 > o.y + 5 && py1 < o.y + o.h) {
            const fromTop = (P.y + P.h) - o.y < 22;
            if (fromTop && P.vy >= 0) { P.y = o.y - P.h; P.vy = 0; P.grounded = true; }
            else die();
          }
        } else if (o.k === "hang") {
          const by = CEIL + o.h; // bottom tip
          if (px2 > o.x + 4 && px1 < o.x + o.w - 4 && py1 < by - 4 && py2 > CEIL) die();
        } else if (o.k === "spikyslab") {
          // slab body safe underneath, spikes on TOP kill
          if (px2 > o.x + 2 && px1 < o.x + o.w - 2 && py2 > o.y - 14 && py1 < o.y + o.h) {
            if (py2 > o.y - 14 && py1 < o.y - 2) die(); // touched top spikes
            else if (P.vy <= 0 && py1 < o.y + o.h && py2 > o.y + o.h - 6) { P.y = o.y + o.h; P.vy = 1; }
          }
        }
      }
      if (Math.random() < .1) { trail.push({ x: P.x, y: P.y + 15, life: 15 }); if (trail.length > 22) trail.shift(); }
    }

    if (mode === "balloon") {
      balloonT += 1 / 60;
      spawnMeteor._in = (spawnMeteor._in ?? 10) - 1;
      if (spawnMeteor._in <= 0 && !portal) { spawnMeteor(); if (dist > 600 && Math.random() < .4) spawnMeteor(); spawnMeteor._in = 26 - Math.min(12, dist / 120); }
      const k = keys();
      B.tx = Math.min(W - 40, Math.max(40, B.tx + k.x * 7));
      B.ty = Math.min(GROUND - 30, Math.max(CEIL + 30, B.ty + k.y * 6));
      B.x += (B.tx - B.x) * .12; B.y += (B.ty - B.y) * .12 + Math.sin(t * 3) * .5;
      for (const m of meteors) { m.x += m.vx; m.y += m.vy; }
      meteors = meteors.filter(m => m.y < H + 40);
      for (const m of meteors) {
        const dx = B.x - m.x, dy = B.y - m.y;
        if (dx * dx + dy * dy < (m.r + 16) * (m.r + 16)) die();
        if (!m.c && m.y > B.y && Math.abs(dx) < 30) { m.c = true; popup("CLOSE! +25", "#4ade80"); }
      }
      if (Math.random() < .2) particles.push({ x: B.x + (Math.random() - .5) * 20, y: B.y + 24, vx: 0, vy: 1.5, life: 20, c: "rgba(255,255,255,.7)", s: 2 });
    }

    if (mode === "plane") {
      spawnPlane._in = (spawnPlane._in ?? 200) - speed;
      if (spawnPlane._in <= 0 && !portal) { spawnPlane(); spawnPlane._in = 350 + Math.random() * 110; }
      if (flapT > 0) flapT--;
      P.vy += .5; P.vy = Math.max(-7, Math.min(7, P.vy));
      P.y += P.vy;
      cubeRot += 0.03 + Math.abs(P.vy) * 0.006;
      if (P.y <= CEIL || P.y + P.h >= GROUND) die();
      for (const o of obstacles) { o.x -= speed; if (o.mv) o.gy = o.gy0 + Math.sin(t * 2.2 + o.ph) * o.mv; }
      obstacles = obstacles.filter(o => o.x > -120);
      const px1 = P.x + 7, px2 = P.x + P.w - 7, py1 = P.y + 5, py2 = P.y + P.h - 3;
      for (const o of obstacles) {
        if (px2 > o.x + 6 && px1 < o.x + 54 && (py1 < o.gy - o.gap / 2 + 8 || py2 > o.gy + o.gap / 2 - 8)) die();
        if (!o.c && o.x + 60 < P.x && !dead) { o.c = true; popup("+50", "#4ade80"); }
      }
      if (flapT > 0 && Math.random() < .7) particles.push({ x: P.x - 6, y: P.y + 20, vx: -3, vy: 0, life: 18, c: "#fdba74", s: 4 });
      if (Math.random() < .1) { trail.push({ x: P.x, y: P.y + 15, life: 15 }); if (trail.length > 22) trail.shift(); }
    }
    hudDist.textContent = Math.floor(dist);
    hudMode.textContent = LEVELS[mode].tag; hudMode.style.color = `hsl(${hue},100%,65%)`;
  }
  /* ============ DRAW ============ */
  ctx.save();
  if (shake > 0) { ctx.translate((Math.random() - .5) * shake, (Math.random() - .5) * shake); shake *= .88; if (shake < .5) shake = 0; }
  const g = ctx.createLinearGradient(0, 0, 0, H);
  const wind = mode === "balloon" ? 20 : 0;
  g.addColorStop(0, `hsl(${(hue + wind) % 360},60%,7%)`); g.addColorStop(.7, `hsl(${(hue + 50 + wind) % 360},65%,13%)`); g.addColorStop(1, `hsl(${(hue + 95 + wind) % 360},70%,19%)`);
  ctx.fillStyle = g; ctx.fillRect(-20, -20, W + 40, H + 40);
  ctx.fillStyle = "#fff";
  for (const s of stars) { ctx.globalAlpha = .25 + .65 * Math.abs(Math.sin(t * 2 + s.x)); ctx.fillRect(((s.x - t * 10) % W + W) % W, s.y, s.s, s.s); }
  ctx.globalAlpha = 1;
  ctx.fillStyle = `hsl(${(hue + 180) % 360},90%,66%)`; ctx.beginPath(); ctx.arc(W - 110, 72, 24, 0, 7); ctx.fill();
  for (const c of clouds) {
    c.x -= c.v; if (c.x < -170) { c.x = W + 70; c.y = 26 + Math.random() * 140; c.k = Math.floor(Math.random() * 3); }
    const tint = `hsla(${(hue + 40) % 360},`;
    if (c.k === 0) {
      ctx.fillStyle = tint + `70%,80%,.28)`;
      ctx.beginPath(); ctx.arc(c.x, c.y, 20 * c.s, 0, 7); ctx.arc(c.x + 22 * c.s, c.y - 10 * c.s, 25 * c.s, 0, 7); ctx.arc(c.x + 46 * c.s, c.y - 2 * c.s, 19 * c.s, 0, 7); ctx.arc(c.x + 24 * c.s, c.y + 8 * c.s, 22 * c.s, 0, 7); ctx.fill();
    } else if (c.k === 1) {
      ctx.fillStyle = tint + `60%,72%,.24)`;
      ctx.beginPath(); ctx.ellipse(c.x + 26 * c.s, c.y, 46 * c.s, 15 * c.s, 0, 0, 7); ctx.fill();
      ctx.fillStyle = tint + `55%,60%,.22)`;
      ctx.fillRect(c.x - 20 * c.s, c.y, 92 * c.s, 9 * c.s);
    } else {
      ctx.fillStyle = tint + `80%,85%,.2)`;
      ctx.beginPath(); ctx.ellipse(c.x + 26 * c.s, c.y, 52 * c.s, 7 * c.s, -.06, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.ellipse(c.x + 10 * c.s, c.y + 12 * c.s, 30 * c.s, 5 * c.s, .04, 0, 7); ctx.fill();
    }
  }
  ctx.fillStyle = `hsl(${hue},40%,15%)`; ctx.beginPath(); ctx.moveTo(0, GROUND);
  for (let x = 0; x <= W; x += 80) ctx.lineTo(x, GROUND - 70 - 46 * Math.abs(Math.sin(x * .008 + t * .25)));
  ctx.lineTo(W, GROUND); ctx.closePath(); ctx.fill();
  if (weather === "rain" || (mode === "balloon" && weather !== "embers")) {
    ctx.strokeStyle = "rgba(165,220,255,.4)"; ctx.lineWidth = 1.5; ctx.beginPath();
    for (const r of rain) { r.y += r.v; r.x -= 2; if (r.y > H) { r.y = -10; r.x = Math.random() * W; } ctx.moveTo(r.x, r.y); ctx.lineTo(r.x - 4, r.y + 14); }
    ctx.stroke();
  } else if (weather === "embers") {
    for (let i = 0; i < 3; i++) particles.push({ x: Math.random() * W, y: H, vx: 0, vy: -1 - Math.random() * 2, life: 70, c: `hsl(${(hue + Math.random() * 40) % 360},100%,60%)`, s: 2 });
  }
  ctx.fillStyle = "#04050d"; ctx.fillRect(-20, GROUND, W + 40, H - GROUND + 20);
  // GD-style ground deco spikes (non-colliding silhouette, jaise screenshot me)
  ctx.fillStyle = "rgba(0,0,0,.85)";
  const off = (dist * 4) % 34;
  for (let x = -34; x < W + 34; x += 34) {
    const dx = x - off;
    ctx.beginPath(); ctx.moveTo(dx, GROUND); ctx.lineTo(dx + 9, GROUND - 12); ctx.lineTo(dx + 18, GROUND); ctx.closePath(); ctx.fill();
  }
  ctx.strokeStyle = `hsl(${hue},100%,60%)`; ctx.lineWidth = 3; ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 14;
  ctx.beginPath(); ctx.moveTo(-20, GROUND); ctx.lineTo(W + 20, GROUND); ctx.stroke(); ctx.shadowBlur = 0;
  ctx.strokeStyle = `hsla(${hue},100%,60%,.22)`; ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 44) { const ox = x - (dist * 4 % 44); ctx.beginPath(); ctx.moveTo(ox, GROUND); ctx.lineTo(ox - 18, H); ctx.stroke(); }
  if (mode !== "balloon") { ctx.strokeStyle = `hsla(${hue},100%,65%,.45)`; ctx.setLineDash([10, 10]); ctx.beginPath(); ctx.moveTo(0, CEIL); ctx.lineTo(W, CEIL); ctx.stroke(); ctx.setLineDash([]); }
  if (portal) {
    const px = portal.x;
    const pg = ctx.createLinearGradient(px - 30, 0, px + 30, 0);
    pg.addColorStop(0, "rgba(34,211,238,0)"); pg.addColorStop(.5, `hsl(${hue},100%,60%)`); pg.addColorStop(1, "rgba(34,211,238,0)");
    ctx.fillStyle = pg; ctx.fillRect(px - 30, CEIL, 60, GROUND - CEIL);
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 4; ctx.shadowColor = "#22d3ee"; ctx.shadowBlur = 22;
    ctx.beginPath(); ctx.ellipse(px, H / 2, 22 + 6 * Math.sin(t * 8), 90, 0, 0, 7); ctx.stroke(); ctx.shadowBlur = 0;
    ctx.fillStyle = "#fff"; ctx.font = "bold 13px Orbitron, sans-serif"; ctx.textAlign = "center"; ctx.fillText("PORTAL", px, H / 2 - 100);
  }
  /* obstacles */
  for (const o of obstacles) {
    if (o.k === "spike") {
      const nc = `hsl(${(hue + 150) % 360},95%,58%)`;
      ctx.shadowColor = nc; ctx.shadowBlur = 12; ctx.fillStyle = nc;
      const top = o.top ? CEIL : GROUND - o.h;
      ctx.beginPath(); ctx.moveTo(o.x, o.top ? CEIL : GROUND); ctx.lineTo(o.x + o.w / 2, top); ctx.lineTo(o.x + o.w, o.top ? CEIL : GROUND); ctx.closePath(); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(255,255,255,.85)";
      ctx.beginPath(); ctx.moveTo(o.x + o.w / 2 - 4, o.top ? CEIL + 6 : GROUND - 6); ctx.lineTo(o.x + o.w / 2, o.top ? CEIL + 16 : GROUND - 16); ctx.lineTo(o.x + o.w / 2 + 4, o.top ? CEIL + 6 : GROUND - 6); ctx.closePath(); ctx.fill();
    } else if (o.k === "triple") {
      const nc = `hsl(${(hue + 150) % 360},95%,58%)`;
      ctx.shadowColor = nc; ctx.shadowBlur = 12; ctx.fillStyle = nc;
      for (let s = 0; s < 3; s++) {
        const sx = o.x + s * 26;
        ctx.beginPath(); ctx.moveTo(sx, GROUND); ctx.lineTo(sx + 13, GROUND - 36); ctx.lineTo(sx + 26, GROUND); ctx.closePath(); ctx.fill();
      }
      ctx.shadowBlur = 0;
    } else if (o.k === "slab") {
      ctx.shadowColor = `hsl(${hue},100%,60%)`; ctx.shadowBlur = 8;
      ctx.fillStyle = `hsl(${(hue + 200) % 360},60%,38%)`; ctx.fillRect(o.x, o.y, o.w, o.h);
      ctx.shadowBlur = 0; ctx.fillStyle = `hsl(${hue},100%,65%)`; ctx.fillRect(o.x, o.y, o.w, 4);
      ctx.fillStyle = "rgba(255,255,255,.75)"; ctx.font = "11px sans-serif"; ctx.textAlign = "center"; ctx.fillText("SAFE", o.x + o.w / 2, o.y + 14);
    } else if (o.k === "spikyslab") {
      ctx.shadowColor = `hsl(${hue},100%,60%)`; ctx.shadowBlur = 8;
      ctx.fillStyle = `hsl(${(hue + 200) % 360},60%,38%)`; ctx.fillRect(o.x, o.y, o.w, o.h);
      ctx.shadowBlur = 0;
      const nc = `hsl(${(hue + 150) % 360},95%,58%)`;
      ctx.fillStyle = nc;
      for (let sx = o.x + 4; sx < o.x + o.w - 8; sx += 22) {
        ctx.beginPath(); ctx.moveTo(sx, o.y); ctx.lineTo(sx + 9, o.y - 16); ctx.lineTo(sx + 18, o.y); ctx.closePath(); ctx.fill();
      }
      ctx.fillStyle = `hsl(${hue},100%,65%)`; ctx.fillRect(o.x, o.y + o.h - 4, o.w, 4);
    } else if (o.k === "block") {
      ctx.shadowColor = `hsl(${hue},100%,60%)`; ctx.shadowBlur = 10;
      drawGDBlock(o.x, o.y, o.w, o.h, hue);
      ctx.shadowBlur = 0;
    } else if (o.k === "hang") {
      ctx.shadowColor = "#f43f5e"; ctx.shadowBlur = 10;
      drawGDBlock(o.x, CEIL - 6, o.w, o.h, hue);
      ctx.shadowBlur = 0;
      const nc = `hsl(${(hue + 150) % 360},95%,58%)`;
      ctx.fillStyle = nc; ctx.shadowColor = nc; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.moveTo(o.x + 4, CEIL + o.h - 6); ctx.lineTo(o.x + o.w / 2, CEIL + o.h + 22); ctx.lineTo(o.x + o.w - 4, CEIL + o.h - 6); ctx.closePath(); ctx.fill();
      ctx.shadowBlur = 0;
    } else if (o.k === "pillar") {
      const pc = `hsl(${(hue + 110) % 360},90%,55%)`;
      ctx.shadowColor = pc; ctx.shadowBlur = 12; ctx.fillStyle = pc;
      ctx.fillRect(o.x, CEIL - 40, 60, (o.gy - o.gap / 2) - (CEIL - 40));
      ctx.fillRect(o.x, o.gy + o.gap / 2, 60, GROUND - (o.gy + o.gap / 2));
      ctx.shadowBlur = 0; ctx.fillStyle = "#fff";
      ctx.fillRect(o.x, o.gy - o.gap / 2 - 8, 60, 8); ctx.fillRect(o.x, o.gy + o.gap / 2, 60, 8);
    } else if (o.k === "saw") {
      const cx = o.x + 20, cy = o.y + 20;
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(o.a || 0);
      ctx.shadowColor = "#f43f5e"; ctx.shadowBlur = 14; ctx.fillStyle = "#e11d48";
      ctx.beginPath();
      for (let i = 0; i < 8; i++) { const a0 = i * Math.PI / 4, a1 = a0 + Math.PI / 8; ctx.lineTo(Math.cos(a0) * 22, Math.sin(a0) * 22); ctx.lineTo(Math.cos(a1) * 13, Math.sin(a1) * 13); }
      ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0;
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(0, 0, 6, 0, 7); ctx.fill();
      ctx.restore();
    }
  }
  for (const m of meteors) {
    ctx.fillStyle = "rgba(239,68,68,.25)"; ctx.beginPath(); ctx.ellipse(m.x, GROUND, m.r * 1.4, 6, 0, 0, 7); ctx.fill();
    ctx.shadowColor = "#f97316"; ctx.shadowBlur = 14;
    const mg = ctx.createRadialGradient(m.x - 4, m.y - 4, 2, m.x, m.y, m.r);
    mg.addColorStop(0, "#fef3c7"); mg.addColorStop(.5, "#f97316"); mg.addColorStop(1, "#7c2d12");
    ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
  }
  for (const tr of trail) { tr.life--; ctx.fillStyle = `hsla(${hue},100%,62%,${tr.life / 24})`; ctx.fillRect(tr.x - 6, tr.y - 8, 12, 16); }
  trail = trail.filter(x => x.life > 0);
  if (!dead) {
    if (mode === "balloon") {
      const bx = B.x, by = B.y;
      ctx.strokeStyle = "rgba(255,255,255,.65)"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(bx - 13, by + 14); ctx.lineTo(bx - 8, by + 30); ctx.moveTo(bx + 13, by + 14); ctx.lineTo(bx + 8, by + 30); ctx.stroke();
      ctx.fillStyle = "#92400e"; ctx.fillRect(bx - 9, by + 30, 18, 11);
      ctx.fillStyle = "rgba(0,0,0,.25)";
      for (let wy = 0; wy < 3; wy++) ctx.fillRect(bx - 9, by + 33 + wy * 3, 18, 1.4);
      const bg = ctx.createLinearGradient(bx - 22, by - 28, bx + 22, by + 18);
      bg.addColorStop(0, `hsl(${hue},95%,68%)`); bg.addColorStop(1, `hsl(${(hue + 60) % 360},90%,48%)`);
      ctx.shadowColor = `hsl(${hue},100%,60%)`; ctx.shadowBlur = 18; ctx.fillStyle = bg;
      ctx.beginPath(); ctx.ellipse(bx, by - 4, 23, 27, 0, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
      ctx.save(); ctx.beginPath(); ctx.ellipse(bx, by - 4, 23, 27, 0, 0, 7); ctx.clip();
      ctx.fillStyle = "rgba(255,255,255,.22)";
      ctx.fillRect(bx - 14, by - 31, 7, 54); ctx.fillRect(bx + 7, by - 31, 7, 54);
      ctx.fillStyle = "rgba(0,0,0,.12)";
      ctx.fillRect(bx - 3.5, by - 31, 7, 54);
      ctx.restore();
      ctx.fillStyle = `hsl(${(hue + 60) % 360},90%,40%)`;
      ctx.beginPath(); ctx.moveTo(bx - 5, by + 22); ctx.lineTo(bx + 5, by + 22); ctx.lineTo(bx, by + 28); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,.55)"; ctx.beginPath(); ctx.ellipse(bx - 10, by - 16, 5.5, 9, -.35, 0, 7); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(bx - 6, by - 6, 4.2, 0, 7); ctx.arc(bx + 6, by - 6, 4.2, 0, 7); ctx.fill();
      ctx.fillStyle = "#000"; ctx.beginPath(); ctx.arc(bx - 5, by - 6, 2.1, 0, 7); ctx.arc(bx + 7, by - 6, 2.1, 0, 7); ctx.fill();
      ctx.fillStyle = "rgba(244,114,182,.8)"; ctx.beginPath(); ctx.arc(bx - 11, by, 2.6, 0, 7); ctx.arc(bx + 11, by, 2.6, 0, 7); ctx.fill();
      ctx.strokeStyle = "#000"; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(bx, by - 1, 6, .35, Math.PI - .35); ctx.stroke();
    } else if (mode === "ship") {
      // purana ship — hold = vertically up, release = vertically down (tilt ke saath)
      ctx.save(); ctx.translate(P.x + 15, P.y + 15); ctx.rotate(Math.max(-.5, Math.min(.5, P.vy * .07)));
      if (holding) { ctx.fillStyle = "#fb923c"; ctx.beginPath(); ctx.moveTo(-10, -7); ctx.lineTo(-30 - Math.random() * 10, 0); ctx.lineTo(-10, 7); ctx.closePath(); ctx.fill(); }
      ctx.shadowColor = `hsl(${hue},100%,60%)`; ctx.shadowBlur = 16;
      ctx.fillStyle = `hsl(${(hue + 200) % 360},95%,60%)`;
      ctx.beginPath(); ctx.moveTo(17, 0); ctx.lineTo(-10, -12); ctx.lineTo(-4, 0); ctx.lineTo(-10, 12); ctx.closePath(); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(3, -3, 4.5, 0, 7); ctx.fill();
      ctx.fillStyle = "#0ea5e9"; ctx.beginPath(); ctx.arc(3, -3, 2.6, 0, 7); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.fillRect(-13, 8, 8, 3);
      ctx.restore();
    } else {
      // cute plane: body + wings + spinning propeller + smile
      const px = P.x + 15, py = P.y + 15, tilt = Math.max(-.35, Math.min(.35, P.vy * .05));
      ctx.save(); ctx.translate(px, py); ctx.rotate(tilt);
      if (flapT > 0) { ctx.fillStyle = "#fdba74"; ctx.beginPath(); ctx.moveTo(-16, 0); ctx.lineTo(-26 - Math.random() * 7, 0, 0, 0, 7); ctx.fill(); }
      ctx.shadowColor = `hsl(${hue},100%,60%)`; ctx.shadowBlur = 16;
      ctx.fillStyle = `hsl(${(hue + 200) % 360},90%,62%)`;
      ctx.beginPath(); ctx.ellipse(0, 0, 17, 10, 0, 0, 7); ctx.fill();
      ctx.fillStyle = `hsl(${(hue + 200) % 360},80%,45%)`;
      ctx.beginPath(); ctx.ellipse(-2, -11, 9, 4.5, -.25, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.ellipse(-2, 11, 7, 3.5, .25, 0, 7); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "#334155"; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(16, -7); ctx.lineTo(16, 7); ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,.85)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(16, -7 - (t * 40 % 4)); ctx.lineTo(16, 7 + (t * 40 % 4)); ctx.stroke();
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(6, -2, 3.6, 0, 7); ctx.fill();
      ctx.fillStyle = "#000"; ctx.beginPath(); ctx.arc(7, -2, 1.8, 0, 7); ctx.fill();
      ctx.strokeStyle = "#000"; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(9, 3, 4, .4, Math.PI - .7); ctx.stroke();
      ctx.fillStyle = "#fda4af"; ctx.beginPath(); ctx.arc(1, 3, 2.4, 0, 7); ctx.fill();
      ctx.restore();
    }
  }
  for (const p of particles) { p.x += p.vx; p.y += p.vy; p.vy += .2; p.life--; ctx.globalAlpha = Math.max(0, p.life / 45); ctx.fillStyle = p.c; ctx.fillRect(p.x, p.y, p.s, p.s); }
  ctx.globalAlpha = 1; particles = particles.filter(p => p.life > 0);
  ctx.textAlign = "center";
  // attempt + level watermark (GD feel)
  ctx.fillStyle = "rgba(255,255,255,.55)"; ctx.font = "bold 13px Orbitron, sans-serif";
  ctx.fillText("ATTEMPT " + attempts + "  •  " + LEVELS[mode].name, W / 2, 26);
  popups = popups.filter(p => p.life-- > 0);
  popups.forEach((p, i) => { ctx.globalAlpha = Math.min(1, p.life / 30); ctx.fillStyle = p.c; ctx.font = "bold 19px Orbitron, sans-serif"; ctx.fillText(p.txt, W / 2, 120 + i * 28); });
  ctx.globalAlpha = 1;
  ctx.restore();
}
const _k = {};
function keys() {
  let x = 0, y = 0;
  if (_k.ArrowLeft || _k.KeyA) x -= 1;
  if (_k.ArrowRight || _k.KeyD) x += 1;
  if (_k.ArrowUp || _k.KeyW) y -= 1;
  if (_k.ArrowDown || _k.KeyS) y += 1;
  return { x, y };
}
loop();
document.addEventListener("keydown", e => {
  if (["Space", "ArrowUp", "ArrowLeft", "ArrowRight", "ArrowDown"].includes(e.code)) e.preventDefault();
  if (e.code === "Escape" || e.code === "KeyP") { setPaused(!paused); return; }
  if (e.code === "KeyR") { if (running) restartRun(); return; }
  if (e.code === "KeyM") { toggleMute(); return; }
  if (e.repeat) return; _k[e.code] = true;
  if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") press();
});
document.addEventListener("keyup", e => { _k[e.code] = false; if (["Space", "ArrowUp", "KeyW"].includes(e.code)) release(); });
cv.addEventListener("pointerdown", e => { e.preventDefault(); press(e); });
window.addEventListener("pointerup", release);
window.addEventListener("pointermove", e => { if (mode === "balloon" && (e.buttons || e.pointerType === "touch")) setTarget(e); });
cv.addEventListener("touchmove", e => { const tt = e.touches[0]; if (tt) setTarget(tt); }, { passive: true });
function goFS(auto) {
  const w = document.querySelector(".wrap");
  if (document.fullscreenElement) { if (!auto && document.exitFullscreen) document.exitFullscreen(); return; }
  if (w && w.requestFullscreen) { const p = w.requestFullscreen(); if (p && p.catch) p.catch(() => {}); }
}
const fsBtn = document.getElementById("fsBtn");
if (fsBtn) fsBtn.onclick = (e) => { e.stopPropagation(); goFS(false); };
const fsMini = document.getElementById("fsMini");
if (fsMini) fsMini.onclick = (e) => { e.stopPropagation(); goFS(false); };
const pauseBtn = document.getElementById("pauseBtn");
if (pauseBtn) pauseBtn.onclick = (e) => { e.stopPropagation(); setPaused(true); };
const btnResume = document.getElementById("btnResume");
if (btnResume) btnResume.onclick = (e) => { e.stopPropagation(); setPaused(false); };
const btnRestart = document.getElementById("btnRestart");
if (btnRestart) btnRestart.onclick = (e) => { e.stopPropagation(); restartRun(); };
const btnQuit = document.getElementById("btnQuit");
if (btnQuit) btnQuit.onclick = (e) => { e.stopPropagation(); try { localStorage.setItem("ucw-best", best); } catch (err) {} window.location.href = "index.html"; };
/* sliders */
const musicVolEl = document.getElementById("musicVol"), sfxVolEl = document.getElementById("sfxVol");
const musicLbl = document.getElementById("musicLbl"), sfxLbl = document.getElementById("sfxLbl");
function toggleMute() {
  muted = !muted;
  popup(muted ? "🔇 MUTED (M)" : "🔊 SOUND ON", muted ? "#f87171" : "#4ade80");
}
function wireSliders() {
  if (musicVolEl) {
    musicVolEl.value = musicVol; if (musicLbl) musicLbl.textContent = musicVol;
    musicVolEl.oninput = () => { musicVol = +musicVolEl.value; if (musicLbl) musicLbl.textContent = musicVol; localStorage.setItem("ucw-music", musicVol); if (musicGain && AC) musicGain.gain.value = musicVol / 100 * 0.5; if (musicVol > 0) muted = false; };
  }
  if (sfxVolEl) {
    sfxVolEl.value = sfxVol; if (sfxLbl) sfxLbl.textContent = sfxVol;
    sfxVolEl.oninput = () => { sfxVol = +sfxVolEl.value; if (sfxLbl) sfxLbl.textContent = sfxVol; localStorage.setItem("ucw-sfx", sfxVol); if (sfxGain && AC) sfxGain.gain.value = sfxVol / 100 * 0.9; sfx(660, .08); };
  }
}
wireSliders();
syncHudLevel();
