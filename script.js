const soundBtn  = document.getElementById("soundBtn");
const themeEl   = document.getElementById("theme");
const coinBtn   = document.getElementById("coinBtn");
const coin      = document.getElementById("coin");
const resultEl  = document.getElementById("result");

let soundOn = true;
let flipping = false;
let rotX = 0;

// prefs
function savePrefs(){
  try{
    localStorage.setItem("randomselection:coin:prefs", JSON.stringify({
      theme: themeEl.value,
      soundOn
    }));
  }catch{}
}
function loadPrefs(){
  try{
    const raw = localStorage.getItem("randomselection:coin:prefs");
    if(!raw) return;
    const p = JSON.parse(raw);
    if(p.theme) themeEl.value = p.theme;
    if(typeof p.soundOn === "boolean") soundOn = p.soundOn;
  }catch{}
}
loadPrefs();
document.body.dataset.theme = themeEl.value;
soundBtn.textContent = soundOn ? "🔊" : "🔇";

themeEl.addEventListener("change", () => {
  document.body.dataset.theme = themeEl.value;
  savePrefs();
});

soundBtn.addEventListener("click", () => {
  soundOn = !soundOn;
  soundBtn.textContent = soundOn ? "🔊" : "🔇";
  savePrefs();
});

// audio
const audioCtx = (() => {
  try { return new (window.AudioContext || window.webkitAudioContext)(); }
  catch { return null; }
})();

function ensureAudio(){
  if(audioCtx && audioCtx.state === "suspended"){
    audioCtx.resume().catch(()=>{});
  }
}

// landing sound only
function clink(){
  if(!audioCtx || !soundOn) return;
  const t = audioCtx.currentTime;

  // low thunk + high ring (short, satisfying)
  const freqs = [180, 260, 390, 620, 980, 1400];
  freqs.forEach((f,i)=>{
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = i < 2 ? "sine" : "triangle";
    o.frequency.setValueAtTime(f, t);

    const peak = (i < 2 ? 0.12 : 0.06) / (1 + i*0.85);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22 + i*0.02);

    o.connect(g); g.connect(audioCtx.destination);
    o.start(t); o.stop(t + 0.30 + i*0.02);
  });
}

// helpers
function showResult(text){
  resultEl.textContent = text;
  resultEl.classList.add("show");
  clearTimeout(showResult._t);
  showResult._t = setTimeout(() => resultEl.classList.remove("show"), 900);
}

function setTransform(y=0, x=0, z=0, yRot=0){
  coin.style.transform = `translateY(${y}px) rotateX(${x}deg) rotateY(${yRot}deg) rotateZ(${z}deg)`;
}

function disable(disabled){
  themeEl.disabled = disabled;
  soundBtn.disabled = disabled;
  coinBtn.disabled = disabled;
}

// idle float (gentle)
const t0 = performance.now();
function floatLoop(t){
  if(!flipping){
    const s = (t - t0) / 1000;
    const y = Math.sin(s * 1.15) * -10;
    const z = Math.sin(s * 0.95) * 0.7;
    setTransform(y, rotX, z, 0);
  }
  requestAnimationFrame(floatLoop);
}
requestAnimationFrame(floatLoop);

// flip
coinBtn.addEventListener("click", flip);
window.addEventListener("keydown", (e)=>{
  if(e.code === "Space" || e.code === "Enter") flip();
});

function flip(){
  if(flipping) return;

  flipping = true;
  ensureAudio();
  disable(true);
  resultEl.classList.remove("show");

  const isHeads = Math.random() < 0.5;
  const desired = isHeads ? 0 : 180;

  const mod = ((rotX % 360) + 360) % 360;
  const delta = ((desired - mod) + 360) % 360;

  const spins = 10 + Math.floor(Math.random() * 6);
  const startRot = rotX;
  const target = rotX + spins * 360 + delta;

  const start = performance.now();
  const dur = 1500 + Math.random() * 500;

  const easeOut = (x)=> 1 - Math.pow(1-x, 5);

  function step(now){
    const p = Math.min(1, (now - start) / dur);

    const lift = Math.sin(p * Math.PI);
    const y = (-92 * lift) + (-10 * Math.sin(p * Math.PI * 2) * (1 - p));

    const z = Math.sin(p * 7) * (1 - p) * 1.8;
    const yRot = Math.sin(p * Math.PI) * 12;

    const r = startRot + (target - startRot) * easeOut(p);
    setTransform(y, r, z, yRot);

    if(p < 1){
      requestAnimationFrame(step);
    } else {
      rotX = target;
      const endMod = ((rotX % 360) + 360) % 360;
      rotX = rotX - endMod + desired;

      setTransform(0, rotX, 0, 0);

      // ✅ ONLY landing sound
      clink();
      showResult(isHeads ? "HEADS" : "TAILS");

      flipping = false;
      disable(false);
    }
  }

  requestAnimationFrame(step);
}
