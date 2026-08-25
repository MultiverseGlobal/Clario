// ─── Studio Voice DSP Audio Engine (Client-Side Web Audio) ─────────────────────
// Transforms raw mobile / microphone recordings into warm, broadcast-grade audio:
// 1. High-Pass Filter (80Hz rumble / AC hum removal)
// 2. Parametric Presence EQ (3.2kHz vocal intelligibility boost)
// 3. Dynamic Compression / Broadcast Leveler (evens whispers and peaks)
// 4. Soft High-Frequency De-Esser / Air Shelf (12kHz smooth clarity)

export interface StudioVoiceSettings {
  enabled: boolean;
  rumbleCut: boolean;     // 80Hz HPF
  presenceBoost: number;  // dB boost at 3.2kHz (0 to 6dB)
  warmth: number;         // dB boost at 250Hz (0 to 4dB)
  leveling: boolean;      // Dynamic compressor
  outputGain: number;     // 1.0 = normal
}

export const DEFAULT_STUDIO_VOICE_SETTINGS: StudioVoiceSettings = {
  enabled: true,
  rumbleCut: true,
  presenceBoost: 3.5,
  warmth: 2.0,
  leveling: true,
  outputGain: 1.15,
};

/**
 * Processes an AudioBuffer through the Studio Voice DSP chain
 * and returns a new enhanced AudioBuffer using OfflineAudioContext.
 */
export async function enhanceVoiceAudio(
  audioBuffer: AudioBuffer,
  settings: StudioVoiceSettings = DEFAULT_STUDIO_VOICE_SETTINGS
): Promise<AudioBuffer> {
  if (!settings.enabled) return audioBuffer;

  const offlineCtx = new OfflineAudioContext(
    audioBuffer.numberOfChannels,
    audioBuffer.length,
    audioBuffer.sampleRate
  );

  // Source
  const source = offlineCtx.createBufferSource();
  source.buffer = audioBuffer;

  let lastNode: AudioNode = source;

  // 1. High-Pass Rumble Filter (80Hz, 18dB/octave slope via cascaded biquad)
  if (settings.rumbleCut) {
    const hpf1 = offlineCtx.createBiquadFilter();
    hpf1.type = 'highpass';
    hpf1.frequency.value = 80;
    hpf1.Q.value = 0.707;

    const hpf2 = offlineCtx.createBiquadFilter();
    hpf2.type = 'highpass';
    hpf2.frequency.value = 65;
    hpf2.Q.value = 0.707;

    lastNode.connect(hpf1);
    hpf1.connect(hpf2);
    lastNode = hpf2;
  }

  // 2. Vocal Warmth (250Hz subtle peaking EQ)
  if (settings.warmth > 0) {
    const warmthEq = offlineCtx.createBiquadFilter();
    warmthEq.type = 'peaking';
    warmthEq.frequency.value = 240;
    warmthEq.Q.value = 1.0;
    warmthEq.gain.value = settings.warmth;

    lastNode.connect(warmthEq);
    lastNode = warmthEq;
  }

  // 3. Speech Presence & Clarity (3.2kHz peaking EQ for cinematic intelligibility)
  if (settings.presenceBoost > 0) {
    const presenceEq = offlineCtx.createBiquadFilter();
    presenceEq.type = 'peaking';
    presenceEq.frequency.value = 3200;
    presenceEq.Q.value = 1.2;
    presenceEq.gain.value = settings.presenceBoost;

    lastNode.connect(presenceEq);
    lastNode = presenceEq;
  }

  // 4. Air Shelf (10kHz gentle high-shelf for expensive studio sound)
  const airEq = offlineCtx.createBiquadFilter();
  airEq.type = 'highshelf';
  airEq.frequency.value = 10000;
  airEq.gain.value = 1.8;
  lastNode.connect(airEq);
  lastNode = airEq;

  // 5. Broadcast Dynamics Compressor (gentle leveling for vocal consistency)
  if (settings.leveling) {
    const comp = offlineCtx.createDynamicsCompressor();
    comp.threshold.value = -22; // dB
    comp.knee.value = 12;       // soft knee
    comp.ratio.value = 3.5;     // 3.5:1 ratio
    comp.attack.value = 0.008;  // 8ms fast attack
    comp.release.value = 0.18;  // 180ms smooth release

    lastNode.connect(comp);
    lastNode = comp;
  }

  // 6. Master Output Gain
  const masterGain = offlineCtx.createGain();
  masterGain.gain.value = settings.outputGain;
  lastNode.connect(masterGain);
  masterGain.connect(offlineCtx.destination);

  source.start(0);
  return await offlineCtx.startRendering();
}

/**
 * Converts an AudioBuffer into an encoded WAV Blob.
 */
export function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const out = new DataView(new ArrayBuffer(length));
  const channels: Float32Array[] = [];
  let sampleRate = buffer.sampleRate;
  let offset = 0;
  let pos = 0;

  function setUint16(data: number) {
    out.setUint16(pos, data, true);
    pos += 2;
  }
  function setUint32(data: number) {
    out.setUint32(pos, data, true);
    pos += 4;
  }

  // write WAVE header
  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8);  // file length - 8
  setUint32(0x45564157); // "WAVE"

  setUint32(0x20746d66); // "fmt " chunk
  setUint32(16);         // length = 16
  setUint16(1);          // PCM (uncompressed)
  setUint16(numOfChan);
  setUint32(sampleRate);
  setUint32(sampleRate * 2 * numOfChan); // avg. bytes/sec
  setUint16(numOfChan * 2);              // block-align
  setUint16(16);                         // 16-bit

  setUint32(0x61746164); // "data" chunk
  setUint32(length - pos - 4); // chunk length

  for (let i = 0; i < buffer.numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  while (pos < length) {
    for (let i = 0; i < numOfChan; i++) {
      let sample = Math.max(-1, Math.min(1, channels[i][offset]));
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
      out.setInt16(pos, sample, true);
      pos += 2;
    }
    offset++;
  }

  return new Blob([out], { type: 'audio/wav' });
}
