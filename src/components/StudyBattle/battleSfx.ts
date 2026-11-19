export type BattleSfxType =
  | "tick"
  | "lock"
  | "boost"
  | "cut"
  | "correct"
  | "streak"
  | "wrong"
  | "victory"
  | "shoot"
  | "shootCannon"
  | "shootScatter"
  | "shootRail"
  | "hit"
  | "shieldBreak"
  | "damage"
  | "crate"
  | "elim"
  | "bossDown"
  | "buildWall"
  | "rareDrop"
  | "pickup"
  | "potion"
  | "shrine"
  | "dash"
  | "jumppad"
  | "footstep"
  | "waterStep"
  | "bush"
  | "zonePhase"
  | "stormTick";

let sharedCtx: AudioContext | null = null;
let sharedMaster: DynamicsCompressorNode | null = null;
let cachedNoiseBuffer: AudioBuffer | null = null;

function getAudioEngine(): {
  ctx: AudioContext;
  out: AudioNode;
} | null {
  if (typeof window === "undefined") return null;
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioCtx) return null;

  if (!sharedCtx || sharedCtx.state === "closed") {
    sharedCtx = new AudioCtx();
    sharedMaster = sharedCtx.createDynamicsCompressor();
    sharedMaster.threshold.setValueAtTime(-14, sharedCtx.currentTime);
    sharedMaster.knee.setValueAtTime(18, sharedCtx.currentTime);
    sharedMaster.ratio.setValueAtTime(6, sharedCtx.currentTime);
    sharedMaster.attack.setValueAtTime(0.005, sharedCtx.currentTime);
    sharedMaster.release.setValueAtTime(0.15, sharedCtx.currentTime);
    sharedMaster.connect(sharedCtx.destination);
    cachedNoiseBuffer = null;
  }

  if (sharedCtx.state === "suspended") {
    void sharedCtx.resume().catch(() => {});
  }

  return { ctx: sharedCtx, out: sharedMaster || sharedCtx.destination };
}

function getNoiseBuffer(ctx: AudioContext): AudioBuffer {
  if (cachedNoiseBuffer && cachedNoiseBuffer.sampleRate === ctx.sampleRate) {
    return cachedNoiseBuffer;
  }
  const length = Math.floor(ctx.sampleRate * 0.5);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  cachedNoiseBuffer = buffer;
  return buffer;
}

function playTone(
  ctx: AudioContext,
  out: AudioNode,
  opts: {
    type?: OscillatorType;
    freqStart: number;
    freqEnd?: number;
    duration: number;
    delay?: number;
    gainStart: number;
    gainEnd?: number;
  }
) {
  const start = ctx.currentTime + (opts.delay || 0);
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = opts.type || "triangle";
  osc.frequency.setValueAtTime(opts.freqStart, start);
  if (opts.freqEnd && opts.freqEnd !== opts.freqStart) {
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(20, opts.freqEnd),
      start + opts.duration
    );
  }
  gain.gain.setValueAtTime(Math.max(0.0001, opts.gainStart), start);
  gain.gain.exponentialRampToValueAtTime(
    Math.max(0.0001, opts.gainEnd ?? 0.0008),
    start + opts.duration
  );
  osc.connect(gain);
  gain.connect(out);
  osc.start(start);
  osc.stop(start + opts.duration + 0.015);
}

function playFilteredNoise(
  ctx: AudioContext,
  out: AudioNode,
  opts: {
    filterType: BiquadFilterType;
    freqStart: number;
    freqEnd?: number;
    q?: number;
    duration: number;
    delay?: number;
    gainStart: number;
  }
) {
  const start = ctx.currentTime + (opts.delay || 0);
  const src = ctx.createBufferSource();
  src.buffer = getNoiseBuffer(ctx);

  const filter = ctx.createBiquadFilter();
  filter.type = opts.filterType;
  filter.frequency.setValueAtTime(opts.freqStart, start);
  if (opts.freqEnd) {
    filter.frequency.exponentialRampToValueAtTime(
      Math.max(40, opts.freqEnd),
      start + opts.duration
    );
  }
  if (opts.q) filter.Q.setValueAtTime(opts.q, start);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(Math.max(0.0001, opts.gainStart), start);
  gain.gain.exponentialRampToValueAtTime(0.0008, start + opts.duration);

  src.connect(filter);
  filter.connect(gain);
  gain.connect(out);
  src.start(start);
  src.stop(start + opts.duration + 0.01);
}

const lastPlayedAt = new Map<BattleSfxType, number>();

export function playBattleSfx(type: BattleSfxType, muted: boolean): void {
  if (muted || typeof window === "undefined") return;

  const nowPerf = performance.now();
  const minGap =
    type === "footstep" || type === "waterStep"
      ? 230
      : type === "bush"
      ? 280
      : type === "stormTick"
      ? 650
      : 35;
  const prev = lastPlayedAt.get(type) || 0;
  if (nowPerf - prev < minGap) return;
  lastPlayedAt.set(type, nowPerf);

  const engine = getAudioEngine();
  if (!engine) return;
  const { ctx, out } = engine;
  const jitter = 0.96 + Math.random() * 0.08;

  try {
    switch (type) {
      case "tick": {
        playTone(ctx, out, {
          type: "sine",
          freqStart: 780 * jitter,
          duration: 0.055,
          gainStart: 0.045,
        });
        break;
      }

      case "shoot": {
        playTone(ctx, out, {
          type: "triangle",
          freqStart: 640 * jitter,
          freqEnd: 175,
          duration: 0.095,
          gainStart: 0.085,
        });
        playFilteredNoise(ctx, out, {
          filterType: "bandpass",
          freqStart: 2200,
          freqEnd: 900,
          duration: 0.045,
          gainStart: 0.045,
        });
        break;
      }

      case "shootCannon": {
        playTone(ctx, out, {
          type: "sine",
          freqStart: 190 * jitter,
          freqEnd: 48,
          duration: 0.24,
          gainStart: 0.14,
        });
        playFilteredNoise(ctx, out, {
          filterType: "lowpass",
          freqStart: 1600,
          freqEnd: 260,
          duration: 0.18,
          gainStart: 0.1,
        });
        break;
      }

      case "shootScatter": {
        playTone(ctx, out, {
          type: "sawtooth",
          freqStart: 380 * jitter,
          freqEnd: 95,
          duration: 0.13,
          gainStart: 0.09,
        });
        playFilteredNoise(ctx, out, {
          filterType: "lowpass",
          freqStart: 3400,
          freqEnd: 650,
          duration: 0.11,
          gainStart: 0.085,
        });
        break;
      }

      case "shootRail": {
        playTone(ctx, out, {
          type: "sawtooth",
          freqStart: 1280 * jitter,
          freqEnd: 140,
          duration: 0.18,
          gainStart: 0.1,
        });
        playTone(ctx, out, {
          type: "sine",
          freqStart: 220,
          freqEnd: 65,
          duration: 0.2,
          gainStart: 0.11,
        });
        playFilteredNoise(ctx, out, {
          filterType: "highpass",
          freqStart: 1600,
          duration: 0.12,
          gainStart: 0.06,
        });
        break;
      }

      case "buildWall": {
        playTone(ctx, out, {
          type: "square",
          freqStart: 290,
          freqEnd: 520,
          duration: 0.09,
          gainStart: 0.065,
        });
        playTone(ctx, out, {
          type: "triangle",
          freqStart: 620,
          freqEnd: 880,
          duration: 0.1,
          delay: 0.04,
          gainStart: 0.075,
        });
        break;
      }

      case "rareDrop": {
        [587.33, 739.99, 880, 1174.66].forEach((freq, i) => {
          playTone(ctx, out, {
            type: "sine",
            freqStart: freq,
            duration: 0.16,
            delay: i * 0.05,
            gainStart: 0.085,
          });
        });
        break;
      }

      case "bossDown": {
        playTone(ctx, out, {
          type: "sawtooth",
          freqStart: 140,
          freqEnd: 42,
          duration: 0.32,
          gainStart: 0.13,
        });
        [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((freq, i) => {
          playTone(ctx, out, {
            type: "triangle",
            freqStart: freq,
            duration: 0.22,
            delay: 0.06 + i * 0.06,
            gainStart: 0.095,
          });
        });
        break;
      }

      case "hit": {
        playTone(ctx, out, {
          type: "sine",
          freqStart: 1050 * jitter,
          freqEnd: 480,
          duration: 0.055,
          gainStart: 0.085,
        });
        break;
      }

      case "shieldBreak": {
        playTone(ctx, out, {
          type: "triangle",
          freqStart: 1420,
          freqEnd: 340,
          duration: 0.18,
          gainStart: 0.1,
        });
        playFilteredNoise(ctx, out, {
          filterType: "highpass",
          freqStart: 2800,
          duration: 0.16,
          gainStart: 0.08,
        });
        break;
      }

      case "damage": {
        playTone(ctx, out, {
          type: "sine",
          freqStart: 145,
          freqEnd: 52,
          duration: 0.14,
          gainStart: 0.12,
        });
        playFilteredNoise(ctx, out, {
          filterType: "lowpass",
          freqStart: 850,
          duration: 0.08,
          gainStart: 0.055,
        });
        break;
      }

      case "crate": {
        playTone(ctx, out, {
          type: "triangle",
          freqStart: 420,
          freqEnd: 520,
          duration: 0.06,
          gainStart: 0.07,
        });
        playTone(ctx, out, {
          type: "sine",
          freqStart: 660,
          freqEnd: 880,
          duration: 0.11,
          delay: 0.05,
          gainStart: 0.075,
        });
        break;
      }

      case "correct": {
        playTone(ctx, out, {
          type: "triangle",
          freqStart: 523.25,
          duration: 0.1,
          gainStart: 0.09,
        });
        playTone(ctx, out, {
          type: "triangle",
          freqStart: 659.25,
          duration: 0.11,
          delay: 0.07,
          gainStart: 0.095,
        });
        playTone(ctx, out, {
          type: "triangle",
          freqStart: 783.99,
          duration: 0.18,
          delay: 0.14,
          gainStart: 0.105,
        });
        break;
      }

      case "streak": {
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
          playTone(ctx, out, {
            type: "triangle",
            freqStart: freq,
            duration: 0.16,
            delay: i * 0.055,
            gainStart: 0.095,
          });
        });
        break;
      }

      case "wrong": {
        playTone(ctx, out, {
          type: "sawtooth",
          freqStart: 210,
          freqEnd: 115,
          duration: 0.16,
          gainStart: 0.085,
        });
        playTone(ctx, out, {
          type: "sawtooth",
          freqStart: 155,
          freqEnd: 85,
          duration: 0.2,
          delay: 0.1,
          gainStart: 0.08,
        });
        break;
      }

      case "elim": {
        playTone(ctx, out, {
          type: "sine",
          freqStart: 160,
          freqEnd: 65,
          duration: 0.18,
          gainStart: 0.12,
        });
        playTone(ctx, out, {
          type: "triangle",
          freqStart: 440,
          duration: 0.09,
          gainStart: 0.09,
        });
        playTone(ctx, out, {
          type: "triangle",
          freqStart: 660,
          duration: 0.1,
          delay: 0.06,
          gainStart: 0.095,
        });
        playTone(ctx, out, {
          type: "triangle",
          freqStart: 987.77,
          duration: 0.22,
          delay: 0.12,
          gainStart: 0.11,
        });
        break;
      }

      case "pickup": {
        playTone(ctx, out, {
          type: "sine",
          freqStart: 680 * jitter,
          duration: 0.06,
          gainStart: 0.065,
        });
        playTone(ctx, out, {
          type: "sine",
          freqStart: 1020 * jitter,
          duration: 0.09,
          delay: 0.045,
          gainStart: 0.075,
        });
        break;
      }

      case "potion":
      case "shrine": {
        [440, 554.37, 659.25, 880].forEach((freq, i) => {
          playTone(ctx, out, {
            type: "sine",
            freqStart: freq,
            duration: 0.14,
            delay: i * 0.045,
            gainStart: 0.065,
          });
        });
        break;
      }

      case "boost":
      case "lock":
      case "cut": {
        playTone(ctx, out, {
          type: "triangle",
          freqStart: 480,
          freqEnd: 780,
          duration: 0.12,
          gainStart: 0.08,
        });
        break;
      }

      case "dash": {
        playFilteredNoise(ctx, out, {
          filterType: "bandpass",
          freqStart: 1800,
          freqEnd: 380,
          q: 1.5,
          duration: 0.16,
          gainStart: 0.085,
        });
        playTone(ctx, out, {
          type: "sine",
          freqStart: 260,
          freqEnd: 110,
          duration: 0.12,
          gainStart: 0.07,
        });
        break;
      }

      case "jumppad": {
        playTone(ctx, out, {
          type: "sine",
          freqStart: 240,
          freqEnd: 980,
          duration: 0.26,
          gainStart: 0.1,
        });
        playTone(ctx, out, {
          type: "triangle",
          freqStart: 480,
          freqEnd: 1320,
          duration: 0.22,
          delay: 0.04,
          gainStart: 0.065,
        });
        break;
      }

      case "footstep": {
        playFilteredNoise(ctx, out, {
          filterType: "lowpass",
          freqStart: 520 * jitter,
          duration: 0.045,
          gainStart: 0.028,
        });
        break;
      }

      case "waterStep": {
        playFilteredNoise(ctx, out, {
          filterType: "bandpass",
          freqStart: 1400 * jitter,
          freqEnd: 520,
          q: 2.2,
          duration: 0.11,
          gainStart: 0.05,
        });
        break;
      }

      case "bush": {
        playFilteredNoise(ctx, out, {
          filterType: "bandpass",
          freqStart: 2600 * jitter,
          freqEnd: 1200,
          q: 1.4,
          duration: 0.12,
          gainStart: 0.042,
        });
        break;
      }

      case "zonePhase": {
        playTone(ctx, out, {
          type: "sawtooth",
          freqStart: 220,
          freqEnd: 165,
          duration: 0.32,
          gainStart: 0.075,
        });
        playTone(ctx, out, {
          type: "sine",
          freqStart: 330,
          freqEnd: 245,
          duration: 0.35,
          delay: 0.12,
          gainStart: 0.065,
        });
        break;
      }

      case "stormTick": {
        playFilteredNoise(ctx, out, {
          filterType: "highpass",
          freqStart: 3200,
          duration: 0.055,
          gainStart: 0.03,
        });
        break;
      }

      case "victory": {
        const notes = [440, 554.37, 659.25, 880, 1108.73];
        notes.forEach((freq, i) => {
          playTone(ctx, out, {
            type: "triangle",
            freqStart: freq,
            duration: i === notes.length - 1 ? 0.48 : 0.16,
            delay: i * 0.09,
            gainStart: 0.11,
          });
        });
        break;
      }
    }
  } catch {
    // Ignore browser audio autoplay restrictions
  }
}
