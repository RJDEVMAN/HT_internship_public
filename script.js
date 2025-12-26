const ACCESS_KEY = "8jMvtCvLYAqzWilJdEZArkz6G4uJnBCCegjoVWzxSOuGiGIAgtn7gw=="; // REQUIRED
const CONTEXT_URL = "./pizza.rhn"; // served as a static file

let rhino = null;
let audioContext = null;
let mediaStream = null;
let processor = null;
let source = null;

const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const statusEl = document.getElementById("status");
const intentEl = document.getElementById("intent");
const slotsEl = document.getElementById("slots");

function setStatus(text) {
  statusEl.textContent = text;
}

function inferenceCallback(inference) {
  if (!inference.isUnderstood) {
    setStatus("Heard but not understood");
    return;
  }

  setStatus("Command recognized");
  intentEl.textContent = inference.intent;
  slotsEl.textContent = JSON.stringify(inference.slots, null, 2);
}

async function startListening() {
  setStatus("Initializing...");

  rhino = await window.Rhino.create(
    ACCESS_KEY,
    { publicPath: CONTEXT_URL },
    inferenceCallback
  );

  mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  audioContext = new AudioContext({ sampleRate: 16000 });

  source = audioContext.createMediaStreamSource(mediaStream);
  processor = audioContext.createScriptProcessor(512, 1, 1);

  processor.onaudioprocess = (event) => {
    const pcm = event.inputBuffer.getChannelData(0);
    const pcm16 = new Int16Array(pcm.length);

    for (let i = 0; i < pcm.length; i++) {
      pcm16[i] = Math.max(-1, Math.min(1, pcm[i])) * 32767;
    }

    rhino.process(pcm16);
  };

  source.connect(processor);
  processor.connect(audioContext.destination);

  startBtn.disabled = true;
  stopBtn.disabled = false;
  setStatus("Listening...");
}

async function stopListening() {
  processor?.disconnect();
  source?.disconnect();
  mediaStream?.getTracks().forEach(t => t.stop());
  await audioContext?.close();
  rhino?.release();

  startBtn.disabled = false;
  stopBtn.disabled = true;
  setStatus("Stopped");
}

startBtn.onclick = startListening;
stopBtn.onclick = stopListening;
