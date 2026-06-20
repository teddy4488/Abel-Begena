import * as Tone from "tone";

/**
 * Authentic Begena Sound Manager
 * Implements Karplus-Strong synthesis with buzz layer for realistic Begena sound
 * Supports four Ethiopian qiñit (modes): Tizita, Bati, Ambassel, Anchihoye
 */

export type QinitMode = "tizita" | "bati" | "ambassel" | "anchihoye" | "custom";

// All 12 semitones in an octave
export type NoteName = "C" | "C#" | "Db" | "D" | "D#" | "Eb" | "E" | "F" | "F#" | "Gb" | "G" | "G#" | "Ab" | "A" | "A#" | "Bb" | "B";

// Simplified note names (use sharp names)
export const NOTE_NAMES: NoteName[] = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

// Map note names to semitone offset (0-11)
export const NOTE_TO_SEMITONE: Record<string, number> = {
  "C": 0, "C#": 1, "Db": 1,
  "D": 2, "D#": 3, "Eb": 3,
  "E": 4,
  "F": 5, "F#": 6, "Gb": 6,
  "G": 7, "G#": 8, "Ab": 8,
  "A": 9, "A#": 10, "Bb": 10,
  "B": 11,
};

export interface SoundSettings {
  volume: number;
  qinit: QinitMode;
  root: RootNote; // Tonic/key — one of 8 supported roots (A1 through E2)
  stringNotes: Record<number, NoteName>; // per-string note name (custom mode only)
  muted: boolean;
  buzzEnabled: boolean;
  buzzLevel: number; // 0-1
  reverbMix: number; // 0-1
  warmth: number; // EQ low-frequency boost, 0-1
  ambienceEnabled: boolean;
  ambienceVolume: number;
}

// Physical string numbers: All 10 strings (1-10), but only 5 are playable
// Playable strings: 1, 4, 6, 8, 10 (mapped to keys: Space, F, D, S, A)
// Sound order (increasing pitch): 2-3-1-5-4
//   String 2 (F, physical 4) = lowest sound
//   String 3 (D, physical 6) = second lowest
//   String 1 (Space, physical 1) = middle
//   String 5 (A, physical 10) = second highest
//   String 4 (S, physical 8) = highest sound
export const ALL_STRINGS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]; // All 10 strings
export const PLAYABLE_STRINGS = [1, 4, 6, 8, 10]; // Physical string numbers that are playable
export const STRING_TO_INDEX: Record<number, number> = {
  1: 0, 4: 1, 6: 2, 8: 3, 10: 4,
};

// Keyboard mapping: Key -> Physical String Number
export const KEY_TO_STRING: Record<string, number> = {
  Space: 1,  // String 1 (middle pitch)
  KeyF: 4,   // String 2 (lowest sound, physical string 4)
  KeyD: 6,   // String 3 (second lowest, physical string 6)
  KeyS: 8,   // String 4 (highest sound, physical string 8)
  KeyA: 10,  // String 5 (second highest, physical string 10)
};

// Sound order mapping: playable index -> physical string number (in pitch order)
// Order: 2-3-1-5-4 (increasing pitch)
export const SOUND_ORDER: number[] = [4, 6, 1, 10, 8]; // Physical strings in pitch order

// 8 supported root notes — each gives a different transposition of any qiñit mode.
// Every required note across all 4 modes × 8 roots falls within our 17 real samples
// (30/32 combinations are 100% authentic; Bati@D#2 and Bati@E2 each need 1 pitch-shifted note).
export const ROOT_NOTES = ["A1", "A#1", "B1", "C2", "C#2", "D2", "D#2", "E2"] as const;
export type RootNote = (typeof ROOT_NOTES)[number];

// Default note assignments matching Tizita scale
// Note: The sound order is 2-3-1-5-4, so we assign notes accordingly
// String 2 (physical 4) = lowest = C
// String 3 (physical 6) = second lowest = D
// String 1 (physical 1) = middle = E
// String 5 (physical 10) = second highest = G
// String 4 (physical 8) = highest = A
const DEFAULT_STRING_NOTES: Record<number, NoteName> = {
  1: "E",  // String 1 (middle pitch, Space key)
  4: "C",  // String 2 (lowest sound, F key)
  6: "D",  // String 3 (second lowest, D key)
  8: "A",  // String 4 (highest sound, S key)
  10: "G", // String 5 (second highest, A key)
};

const DEFAULT_SETTINGS: SoundSettings = {
  volume: 0.8,
  qinit: "tizita",
  root: "C2",
  stringNotes: { ...DEFAULT_STRING_NOTES },
  muted: false,
  buzzEnabled: false, // Real samples already have authentic begena buzz
  buzzLevel: 0.3,
  reverbMix: 0.35,
  warmth: 0.5,
  ambienceEnabled: false,
  ambienceVolume: 0.3,
};

/**
 * Ethiopian Pentatonic Qiñit (Mode) Tuning Presets
 * 
 * Based on authentic Ethiopian modal system (qiñit), using pentatonic scales.
 * 
 * Interval notation:
 * - St = Semitone (1 semitone)
 * - T = Tone (2 semitones)
 * - TS = Tone + Semitone (3 semitones)
 * - DT = Double Tone (4 semitones)
 * 
 * Tizita (ትዝታ): T – T – TS – T – TS
 *   Example: C – D – E – G – A – C
 *   Semitones: 0, 2, 4, 7, 9
 * 
 * Bati (ባቲ): DT – St – T – DT – St
 *   Example: C – E – F – G – B – C
 *   Semitones: 0, 4, 5, 7, 11
 * 
 * Ambassel (አምባሰል): St – DT – T – St – DT
 *   Example: C – Db – F – G – Ab – C
 *   Semitones: 0, 1, 5, 7, 8
 * 
 * Anchihoye (አንቺሆዬ): St – DT – St – TS – TS
 *   Example: C – Db – F – Gb – A – C
 *   Semitones: 0, 1, 5, 6, 9
 * 
 * Note: The 1st degree (Tonic/Root/Key) is the tonal center - the final resolution tone.
 * 
 * Octave Support: Root note frequency is calculated from selected octave (C0-C8)
 */

// Frequency table for reference (all octaves)
const NOTE_FREQUENCIES: Record<string, number[]> = {
  C: [16.35, 32.70, 65.41, 130.81, 261.63, 523.25, 1046.50, 2093.00, 4186.01],
  "C#": [17.32, 34.65, 69.30, 138.59, 277.18, 554.37, 1108.73, 2217.46, 4434.92],
  Db: [17.32, 34.65, 69.30, 138.59, 277.18, 554.37, 1108.73, 2217.46, 4434.92],
  D: [18.35, 36.71, 73.42, 146.83, 293.66, 587.33, 1174.66, 2349.32, 4698.63],
  "D#": [19.45, 38.89, 77.78, 155.56, 311.13, 622.25, 1244.51, 2489.02, 4978.03],
  Eb: [19.45, 38.89, 77.78, 155.56, 311.13, 622.25, 1244.51, 2489.02, 4978.03],
  E: [20.60, 41.20, 82.41, 164.81, 329.63, 659.25, 1318.51, 2637.02, 5274.04],
  F: [21.83, 43.65, 87.31, 174.61, 349.23, 698.46, 1396.91, 2793.83, 5587.65],
  "F#": [23.12, 46.25, 92.50, 185.00, 369.99, 739.99, 1479.98, 2959.96, 5919.91],
  Gb: [23.12, 46.25, 92.50, 185.00, 369.99, 739.99, 1479.98, 2959.96, 5919.91],
  G: [24.50, 48.99, 97.99, 195.99, 391.99, 783.99, 1567.98, 3135.96, 6271.93],
  "G#": [25.96, 51.91, 103.83, 207.65, 415.30, 830.61, 1661.22, 3322.44, 6644.88],
  Ab: [25.96, 51.91, 103.83, 207.65, 415.30, 830.61, 1661.22, 3322.44, 6644.88],
  A: [27.50, 55.00, 110.00, 220.00, 440.00, 880.00, 1760.00, 3520.00, 7040.00],
  "A#": [29.14, 58.27, 116.54, 233.08, 466.16, 932.33, 1864.66, 3729.31, 7458.62],
  Bb: [29.14, 58.27, 116.54, 233.08, 466.16, 932.33, 1864.66, 3729.31, 7458.62],
  B: [30.87, 61.74, 123.47, 246.94, 493.88, 987.77, 1975.53, 3951.07, 7902.13],
};

/**
 * Get root frequency for a given octave (C0 = 16.35 Hz, C1 = 32.70 Hz, ..., C8 = 4186.01 Hz)
 */
function getOctaveRootFreq(octave: number): number {
  return NOTE_FREQUENCIES.C[octave];
}

function semitonesToFrequency(semitones: number, rootOctave: number): number {
  const rootFreq = getOctaveRootFreq(rootOctave);
  return rootFreq * Math.pow(2, semitones / 12);
}

// Parse "C#2" → { noteName: "C#", octave: 2 }
function parseRoot(root: RootNote): { noteName: NoteName; octave: number } {
  const octave = parseInt(root.at(-1)!);
  const noteName = root.slice(0, -1) as NoteName;
  return { noteName, octave };
}

function getRootFrequency(root: RootNote): number {
  const { noteName, octave } = parseRoot(root);
  return getNoteFrequency(noteName, octave);
}

// Root expressed as total semitones above C0
function rootSemitoneOffset(root: RootNote): number {
  const { noteName, octave } = parseRoot(root);
  return octave * 12 + (NOTE_TO_SEMITONE[noteName] ?? 0);
}

// Convert absolute semitone count to display string e.g. 25 → "C#2"
function noteNameFromSemitone(total: number): string {
  const SHARP_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  return `${SHARP_NAMES[total % 12]}${Math.floor(total / 12)}`;
}

/**
 * Authentic Ethiopian pentatonic intervals (in semitones from root C)
 * 
 * Sound order: 2-3-1-5-4 (increasing pitch)
 * Physical strings: 4, 6, 1, 10, 8
 * 
 * Tizita: T – T – TS – T – TS = C – D – E – G – A
 *   In sound order (2-3-1-5-4): String 2=C, String 3=D, String 1=E, String 5=G, String 4=A
 *   Intervals: 0, 2, 4, 7, 9 semitones
 * 
 * Bati: DT – St – T – DT – St = C – E – F – G – B
 *   In sound order: String 2=C, String 3=E, String 1=F, String 5=G, String 4=B
 *   Intervals: 0, 4, 5, 7, 11 semitones
 * 
 * Ambassel: St – DT – T – St – DT = C – Db – F – G – Ab
 *   In sound order: String 2=C, String 3=Db, String 1=F, String 5=G, String 4=Ab
 *   Intervals: 0, 1, 5, 7, 8 semitones
 * 
 * Anchihoye: St – DT – St – TS – TS = C – Db – F – Gb – A
 *   In sound order: String 2=C, String 3=Db, String 1=F, String 5=Gb, String 4=A
 *   Intervals: 0, 1, 5, 6, 9 semitones
 * 
 * Note: Intervals are stored in sound order: 2-3-1-5-4 (physical strings: 4, 6, 1, 10, 8)
 */
const QINIT_INTERVALS: Record<QinitMode, number[]> = {
  tizita: [0, 2, 4, 7, 9], // Sound order 2-3-1-5-4: C – D – E – G – A
  bati: [0, 4, 5, 7, 11], // Sound order 2-3-1-5-4: C – E – F – G – B
  ambassel: [0, 1, 5, 7, 8], // Sound order 2-3-1-5-4: C – Db – F – G – Ab
  anchihoye: [0, 1, 5, 6, 9], // Sound order 2-3-1-5-4: C – Db – F – Gb – A
  custom: [], // Custom uses stringNotes, not fixed intervals
};

// Frequencies in sound order (2-3-1-5-4) for a qiñit mode at a given root
function getQinitFrequencies(qinit: QinitMode, root: RootNote): number[] {
  const rootFreq = getRootFrequency(root);
  return QINIT_INTERVALS[qinit].map(s => rootFreq * Math.pow(2, s / 12));
}

/**
 * Get frequency for a specific note in a specific octave
 */
function getNoteFrequency(noteName: NoteName, octave: number): number {
  const semitones = NOTE_TO_SEMITONE[noteName] || 0;
  return semitonesToFrequency(semitones, octave);
}

// Custom mode: derive frequencies using root's octave for all string note names
function getCustomFrequencies(stringNotes: Record<number, NoteName>, root: RootNote): number[] {
  const { octave } = parseRoot(root);
  return [4, 6, 1, 10, 8].map(n => getNoteFrequency(stringNotes[n] || "C", octave));
}

// Note names in sound order (2-3-1-5-4) for display
function getNoteNames(qinit: QinitMode, root: RootNote): string[] {
  const rs = rootSemitoneOffset(root);
  return QINIT_INTERVALS[qinit].map(s => noteNameFromSemitone(rs + s));
}

// Derive per-string note names from a qiñit preset at the given root (used in custom mode display)
function applyQinitPreset(qinit: QinitMode, root: RootNote): Record<number, NoteName> {
  const SHARP_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const rs = rootSemitoneOffset(root);
  const soundOrderStrings = [4, 6, 1, 10, 8];
  const result: Record<number, NoteName> = {};
  QINIT_INTERVALS[qinit].forEach((s, i) => {
    result[soundOrderStrings[i]] = SHARP_NAMES[(rs + s) % 12] as NoteName;
  });
  return result;
}

// Sample URLs mapping Tone.js note names to the extracted MP3 files
const BEGENA_SAMPLES: Record<string, string> = {
  "A1":  "A1.mp3",
  "A#1": "Asharp1.mp3",
  "B1":  "B1.mp3",
  "C2":  "C2.mp3",
  "C#2": "Csharp2.mp3",
  "D2":  "D2.mp3",
  "D#2": "Dsharp2.mp3",
  "E2":  "E2.mp3",
  "F2":  "F2.mp3",
  "F#2": "Fsharp2.mp3",
  "G2":  "G2.mp3",
  "G#2": "Gsharp2.mp3",
  "A2":  "A2.mp3",
  "A#2": "Asharp2.mp3",
  "B2":  "B2.mp3",
  "C3":  "C3.mp3",
  "C#3": "Csharp3.mp3",
};

class SoundManager {
  private sampler: Tone.Sampler | null = null;
  private samplerLoaded: boolean = false;
  private settings: SoundSettings = DEFAULT_SETTINGS;
  private reverb: Tone.Reverb | null = null;
  private lowPassFilter: Tone.Filter | null = null;
  private masterChain: Tone.Channel | null = null;
  private ambienceSynth: Tone.Synth | null = null;
  private initialized: boolean = false;
  private frequencies: number[] = getQinitFrequencies("tizita", "C2");

  constructor() {
    this.initialize();
  }

  async initialize() {
    if (this.initialized) return;

    try {
      if (Tone.context.state !== "running") {
        await Tone.start();
      }

      // Signal chain: sampler → lowPassFilter → reverb → masterChain → destination
      this.lowPassFilter = new Tone.Filter({
        frequency: 900,
        type: "lowpass",
        Q: 0.8,
      });

      this.reverb = new Tone.Reverb({ decay: 2.5, wet: DEFAULT_SETTINGS.reverbMix });
      await this.reverb.generate();

      this.masterChain = new Tone.Channel({
        volume: Tone.gainToDb(DEFAULT_SETTINGS.volume),
      });

      this.lowPassFilter.connect(this.reverb);
      this.reverb.connect(this.masterChain);
      this.masterChain.toDestination();

      // Real begena samples — Tone.Sampler pitch-shifts the nearest sample
      // to cover any note requested outside the recorded set
      this.sampler = new Tone.Sampler({
        urls: BEGENA_SAMPLES,
        baseUrl: "/samples/begena/",
        release: 1.5,
        onload: () => {
          this.samplerLoaded = true;
        },
        onerror: (err) => {
          console.error("Begena sample load error:", err);
        },
      }).connect(this.lowPassFilter);

      this.ambienceSynth = new Tone.Synth({
        oscillator: { type: "sine" },
        envelope: { attack: 3, decay: 0.5, sustain: 1, release: 3 },
      }).connect(this.masterChain);

      this.initialized = true;
      this.loadSettings();
    } catch (error) {
      console.error("Failed to initialize audio:", error);
    }
  }

  // Buzz layer kept as an optional additive effect on top of real samples
  private createBuzzLayer(frequency: number): Tone.ToneAudioNode {
    const noise = new Tone.Noise("pink");
    
    // Bandpass filter tuned to buzz frequency (proportional to string pitch)
    // Higher pitch strings have slightly higher buzz frequency
    const bandpass = new Tone.Filter({
      type: "bandpass",
      frequency: Math.max(80, Math.min(400, frequency * 0.2)), // 80-400 Hz range
      Q: 8,
    });

    // AM modulation for buzz timbre (4-12 Hz range) - simulates leather vibration
    const lfo = new Tone.LFO({
      frequency: 4 + Math.random() * 8, // 4-12 Hz variation
      min: 0.3,
      max: 1,
    }).start();

    const buzzGain = new Tone.Gain(this.settings.buzzLevel * 0.3); // Scale down
    const buzzEnvelope = new Tone.Envelope({
      attack: 0.005, // Very quick attack
      decay: 0.15,
      sustain: 0.05,
      release: 0.4,
    });

    // Processing chain: noise → bandpass → AM modulation → envelope → gain → master
    noise.connect(bandpass);
    bandpass.connect(buzzGain);
    lfo.connect(buzzGain.gain); // AM modulation
    buzzEnvelope.connect(buzzGain.gain); // Envelope control
    
    buzzGain.connect(this.masterChain!);

    // Start noise and trigger envelope
    noise.start();
    buzzEnvelope.triggerAttackRelease(0.5); // Short burst

    // Clean up after buzz finishes
    setTimeout(() => {
      noise.stop();
      noise.dispose();
      bandpass.dispose();
      lfo.dispose();
      buzzEnvelope.dispose();
      buzzGain.dispose();
    }, 600);

    return buzzGain;
  }

  private loadSettings() {
    if (typeof window === "undefined") return;

    try {
      const saved = localStorage.getItem("begena-sound-settings");
      if (saved) {
        const parsed = JSON.parse(saved);
        this.settings = {
          ...DEFAULT_SETTINGS,
          ...parsed,
          // Ensure saved root is valid; fall back to default if not
          root: ROOT_NOTES.includes(parsed.root) ? parsed.root : DEFAULT_SETTINGS.root,
          stringNotes: {
            ...DEFAULT_STRING_NOTES,
            ...(parsed.stringNotes || {}),
          },
        };
      } else {
        this.settings.stringNotes = { ...DEFAULT_STRING_NOTES };
      }
      this.applySettings();
    } catch (error) {
      console.error("Failed to load settings:", error);
      this.settings.stringNotes = { ...DEFAULT_STRING_NOTES };
      this.applySettings();
    }
  }

  private saveSettings() {
    if (typeof window === "undefined") return;
    
    try {
      localStorage.setItem("begena-sound-settings", JSON.stringify(this.settings));
    } catch (error) {
      console.error("Failed to save settings:", error);
    }
  }

  private applySettings() {
    // Update master volume
    if (this.masterChain) {
      this.masterChain.volume.value = Tone.gainToDb(
        this.settings.muted ? 0 : this.settings.volume
      );
    }

    // Update reverb mix
    if (this.reverb) {
      this.reverb.wet.value = this.settings.reverbMix;
    }

    // Update low-pass filter (warmth)
    if (this.lowPassFilter) {
      const warmthFreq = 400 + this.settings.warmth * 600; // 400-1000 Hz
      this.lowPassFilter.frequency.value = warmthFreq;
    }

    // Recalculate frequencies for current mode + root
    if (this.settings.qinit === "custom") {
      this.frequencies = getCustomFrequencies(this.settings.stringNotes, this.settings.root);
    } else {
      this.frequencies = getQinitFrequencies(this.settings.qinit, this.settings.root);
    }

    if (!this.frequencies || this.frequencies.length !== 5) {
      this.frequencies = getCustomFrequencies(this.settings.stringNotes, this.settings.root);
    }

    // Update ambience
    if (this.ambienceSynth) {
      if (this.settings.ambienceEnabled && !this.settings.muted) {
        this.ambienceSynth.volume.value = Tone.gainToDb(this.settings.ambienceVolume);
        this.ambienceSynth.triggerAttack("C1");
      } else {
        this.ambienceSynth.triggerRelease();
      }
    }
  }

  /**
   * Play a physical string number (1, 4, 6, 8, or 10)
   */
  async playString(physicalStringNumber: number) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.sampler || !this.samplerLoaded) return;

    const playableIndex = STRING_TO_INDEX[physicalStringNumber];
    if (playableIndex === undefined || playableIndex < 0 || playableIndex >= 5) return;

    if (this.settings.muted) return;

    // Resolve frequency for current tuning mode
    let frequency: number;
    if (this.settings.qinit === "custom") {
      const noteName = this.settings.stringNotes[physicalStringNumber] || "C";
      const { octave } = parseRoot(this.settings.root);
      frequency = getNoteFrequency(noteName, octave);
    } else {
      if (!this.frequencies || this.frequencies.length !== 5) {
        this.frequencies = getQinitFrequencies(this.settings.qinit, this.settings.root);
      }
      const soundOrderIndex = SOUND_ORDER.indexOf(physicalStringNumber);
      frequency = soundOrderIndex >= 0 ? this.frequencies[soundOrderIndex] : this.frequencies[0];
    }

    if (!frequency || isNaN(frequency) || frequency <= 0) {
      frequency = getRootFrequency(this.settings.root);
    }

    const finalFreq = frequency * (0.995 + Math.random() * 0.01);

    try {
      // Roots in octave 1 (A1/A#1/B1) use some pitch-shifted samples — cap at 1 s
      // so the artificial decay doesn't linger when comparing against real voices.
      const { octave } = parseRoot(this.settings.root);
      const duration = octave === 1 ? 1 : 4;
      this.sampler.triggerAttackRelease(finalFreq, duration);

      if (this.settings.buzzEnabled) {
        this.createBuzzLayer(finalFreq);
      }
    } catch (error) {
      console.error("Failed to play string:", error);
    }
  }

  updateSettings(newSettings: Partial<SoundSettings>) {
    // Validate root if being changed
    if (newSettings.root !== undefined && !ROOT_NOTES.includes(newSettings.root)) {
      newSettings.root = DEFAULT_SETTINGS.root;
    }
    this.settings = { ...this.settings, ...newSettings };

    // When switching to a preset qiñit, derive string notes from current root
    if (newSettings.qinit && newSettings.qinit !== "custom") {
      this.settings.stringNotes = applyQinitPreset(newSettings.qinit, this.settings.root);
    }

    // When root changes, recalculate frequencies immediately
    if (newSettings.root !== undefined) {
      if (this.settings.qinit === "custom") {
        this.frequencies = getCustomFrequencies(this.settings.stringNotes, this.settings.root);
      } else {
        this.frequencies = getQinitFrequencies(this.settings.qinit, this.settings.root);
      }
    }

    this.applySettings();
    this.saveSettings();
  }

  /**
   * Update note for a specific string
   */
  updateStringNote(stringNumber: number, noteName: NoteName) {
    // Ensure stringNotes object exists
    if (!this.settings.stringNotes) {
      this.settings.stringNotes = { ...DEFAULT_STRING_NOTES };
    }
    
    // Update the specific string's note
    this.settings.stringNotes[stringNumber] = noteName;
    this.settings.qinit = "custom"; // Switch to custom mode
    
    // Immediately recalculate frequencies for custom mode
    this.frequencies = getCustomFrequencies(this.settings.stringNotes, this.settings.root);

    this.applySettings();
    this.saveSettings();

    const { octave } = parseRoot(this.settings.root);
    console.log(`String ${stringNumber} tuned to ${noteName}${octave} (${getNoteFrequency(noteName, octave).toFixed(2)} Hz)`);
  }

  getSettings(): SoundSettings {
    return { ...this.settings };
  }

  getFrequencies(): number[] {
    return [...this.frequencies];
  }

  getNoteNames(): string[] {
    return getNoteNames(this.settings.qinit, this.settings.root);
  }

  getQinitInfo(): { mode: QinitMode; root: RootNote; frequencies: number[]; noteNames: string[]; rootFreq: number; stringNotes: Record<number, NoteName> } {
    let noteNames: string[];
    if (this.settings.qinit === "custom") {
      const { octave } = parseRoot(this.settings.root);
      noteNames = [4, 6, 1, 10, 8].map(n => `${this.settings.stringNotes[n] || "C"}${octave}`);
    } else {
      noteNames = getNoteNames(this.settings.qinit, this.settings.root);
    }

    return {
      mode: this.settings.qinit,
      root: this.settings.root,
      frequencies: this.frequencies,
      noteNames,
      rootFreq: getRootFrequency(this.settings.root),
      stringNotes: this.settings.stringNotes,
    };
  }

  async toggleMute() {
    this.updateSettings({
      muted: !this.settings.muted,
    });
  }

  async toggleAmbience() {
    this.updateSettings({
      ambienceEnabled: !this.settings.ambienceEnabled,
    });
  }

  async toggleBuzz() {
    this.updateSettings({
      buzzEnabled: !this.settings.buzzEnabled,
    });
  }

  isReady(): boolean {
    return this.initialized && this.samplerLoaded;
  }
}

// Singleton instance
export const soundManager = new SoundManager();