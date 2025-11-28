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
  octave: number; // 0-8 (C0 to C8)
  // Custom tuning: note selection for each playable string (strings 1, 4, 6, 8, 10)
  stringNotes: Record<number, NoteName>; // e.g., {1: "C", 4: "E", 6: "G", 8: "A", 10: "C"}
  muted: boolean;
  buzzEnabled: boolean;
  buzzLevel: number; // 0-1
  reverbMix: number; // 0-1
  warmth: number; // EQ low-frequency boost, 0-1
  ambienceEnabled: boolean;
  ambienceVolume: number;
}

// Physical string numbers mapped to playable indices
// Strings 1, 4, 6, 8, 10 are playable (0-indexed: 0, 3, 5, 7, 9)
export const PLAYABLE_STRINGS = [1, 4, 6, 8, 10]; // Physical string numbers
export const STRING_TO_INDEX: Record<number, number> = {
  1: 0, 4: 1, 6: 2, 8: 3, 10: 4,
};

// Default note assignments matching Tizita scale
const DEFAULT_STRING_NOTES: Record<number, NoteName> = {
  1: "C",  // String 1
  4: "D",  // String 4
  6: "E",  // String 6
  8: "G",  // String 8
  10: "A", // String 10
};

const DEFAULT_SETTINGS: SoundSettings = {
  volume: 0.8,
  qinit: "tizita",
  octave: 2, // Default to C2 for deep, majestic sound
  stringNotes: { ...DEFAULT_STRING_NOTES },
  muted: false,
  buzzEnabled: true,
  buzzLevel: 0.3,
  reverbMix: 0.4,
  warmth: 0.6,
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
  // Get the root frequency for the selected octave
  const rootFreq = getOctaveRootFreq(rootOctave);
  // Calculate frequency using equal temperament: f = root * 2^(semitones/12)
  return rootFreq * Math.pow(2, semitones / 12);
}

/**
 * Authentic Ethiopian pentatonic intervals (in semitones from root C)
 * 
 * Tizita: T – T – TS – T – TS = C – D – E – G – A
 *   Intervals: 0, 2, 4, 7, 9 semitones
 * 
 * Bati: DT – St – T – DT – St = C – E – F – G – B
 *   Intervals: 0, 4, 5, 7, 11 semitones
 * 
 * Ambassel: St – DT – T – St – DT = C – Db – F – G – Ab
 *   Intervals: 0, 1, 5, 7, 8 semitones
 * 
 * Anchihoye: St – DT – St – TS – TS = C – Db – F – Gb – A
 *   Intervals: 0, 1, 5, 6, 9 semitones
 */
const QINIT_INTERVALS: Record<QinitMode, number[]> = {
  tizita: [0, 2, 4, 7, 9], // T – T – TS – T – TS: C – D – E – G – A
  bati: [0, 4, 5, 7, 11], // DT – St – T – DT – St: C – E – F – G – B
  ambassel: [0, 1, 5, 7, 8], // St – DT – T – St – DT: C – Db – F – G – Ab
  anchihoye: [0, 1, 5, 6, 9], // St – DT – St – TS – TS: C – Db – F – Gb – A
  custom: [], // Custom uses stringNotes, not fixed intervals
};

/**
 * Calculate frequencies for each qiñit mode based on selected octave
 */
function getQinitFrequencies(qinit: QinitMode, octave: number): number[] {
  const intervals = QINIT_INTERVALS[qinit];
  return intervals.map(semitones => semitonesToFrequency(semitones, octave));
}

/**
 * Get frequency for a specific note in a specific octave
 */
function getNoteFrequency(noteName: NoteName, octave: number): number {
  const semitones = NOTE_TO_SEMITONE[noteName] || 0;
  return semitonesToFrequency(semitones, octave);
}

/**
 * Calculate frequencies based on custom string note assignments
 */
function getCustomFrequencies(stringNotes: Record<number, NoteName>, octave: number): number[] {
  const playableStrings = [1, 4, 6, 8, 10];
  return playableStrings.map(stringNum => {
    const noteName = stringNotes[stringNum] || "C";
    return getNoteFrequency(noteName, octave);
  });
}

/**
 * Get note names for display based on authentic Ethiopian scale examples
 * Returns note names with the selected octave
 */
function getNoteNames(qinit: QinitMode, octave: number): string[] {
  // Base note names without octave
  const baseNoteNames: Record<QinitMode, string[]> = {
    tizita: ["C", "D", "E", "G", "A"],
    bati: ["C", "E", "F", "G", "B"],
    ambassel: ["C", "Db", "F", "G", "Ab"],
    anchihoye: ["C", "Db", "F", "Gb", "A"],
    custom: [], // Custom will be built from stringNotes
  };
  
  // Add octave number to each note
  return baseNoteNames[qinit].map(note => `${note}${octave}`);
}

/**
 * Apply a qinit preset to string notes
 */
function applyQinitPreset(qinit: QinitMode): Record<number, NoteName> {
  const presetNotes: Record<QinitMode, NoteName[]> = {
    tizita: ["C", "D", "E", "G", "A"],
    bati: ["C", "E", "F", "G", "B"],
    ambassel: ["C", "Db", "F", "G", "Ab"],
    anchihoye: ["C", "Db", "F", "Gb", "A"],
    custom: ["C", "C", "C", "C", "C"], // Default
  };
  
  const playableStrings = [1, 4, 6, 8, 10];
  const notes = presetNotes[qinit] || presetNotes.tizita;
  
  const result: Record<number, NoteName> = {};
  playableStrings.forEach((stringNum, index) => {
    result[stringNum] = notes[index] as NoteName;
  });
  
  return result;
}

// Voice pool for polyphony (support up to 6 simultaneous voices)
interface Voice {
  pluckSynth: Tone.PluckSynth;
  buzzOsc: Tone.Oscillator | null;
  buzzGain: Tone.Gain | null;
  isActive: boolean;
  stringIndex: number;
}

class SoundManager {
  private voices: Voice[] = [];
  private settings: SoundSettings = DEFAULT_SETTINGS;
  private reverb: Tone.Reverb | Tone.Convolver | null = null;
  private lowPassFilter: Tone.Filter | null = null;
  private masterChain: Tone.Channel | null = null;
  private ambienceSynth: Tone.Synth | null = null;
  private initialized: boolean = false;
  private frequencies: number[] = getQinitFrequencies("tizita", 2);

  constructor() {
    this.initialize();
  }

  async initialize() {
    if (this.initialized) return;
    
    try {
      // Start Tone.js context
      if (Tone.context.state !== "running") {
        await Tone.start();
      }

      // Create master processing chain
      this.lowPassFilter = new Tone.Filter({
        frequency: 800,
        type: "lowpass",
        Q: 1,
      });

      // TODO: Load real wooden room impulse response when available
      // For now, use a synthetic reverb with short decay
      // Once IR is available, replace with:
      // this.reverb = new Tone.Convolver("/samples/ir/wood_room_small.wav");
      this.reverb = new Tone.Reverb(2.0); // 2 second decay for small wooden room
      // Generate synthetic IR (async)
      await this.reverb.generate();

      this.masterChain = new Tone.Channel({
        volume: Tone.gainToDb(DEFAULT_SETTINGS.volume),
      });

      // Connect processing chain: voices → lowpass → reverb (parallel) → master → destination
      this.lowPassFilter.connect(this.masterChain);
      this.reverb.connect(this.masterChain);
      this.masterChain.toDestination();

      // Create voice pool (6 voices for polyphony)
      for (let i = 0; i < 6; i++) {
        const voice = this.createVoice();
        this.voices.push(voice);
      }

      // Create ambience synth
      this.ambienceSynth = new Tone.Synth({
        oscillator: {
          type: "sine",
        },
        envelope: {
          attack: 3,
          decay: 0.5,
          sustain: 1,
          release: 3,
        },
      }).connect(this.masterChain);

      this.initialized = true;
      this.loadSettings();
    } catch (error) {
      console.error("Failed to initialize audio:", error);
    }
  }

  private createVoice(): Voice {
    // Karplus-Strong synthesis using PluckSynth for realistic string sound
    // Long sustain (2-5+ seconds) with resonance for majestic feel
    const pluckSynth = new Tone.PluckSynth({
      attackNoise: 1,
      resonance: 0.98, // Very long sustain (majestic, slow decay)
      dampening: 3000, // Lower dampening = longer sustain
      release: 4, // 4 second release for long sustain
    });

    // Connect pluck to processing chain (lowpass filter for warmth)
    pluckSynth.connect(this.lowPassFilter!);

    // Buzz layer will be created per-note (in createBuzzLayer)
    return {
      pluckSynth,
      buzzOsc: null, // Not used in current implementation
      buzzGain: null, // Created per-note
      isActive: false,
      stringIndex: -1,
    };
  }

  /**
   * Create buzz layer for a specific string
   * Implements the characteristic buzzing timbre from leather U-shaped thongs
   * 
   * TODO: Replace with recorded buzz samples when available:
   * - Use Tone.Player with `/samples/buzz/string${stringNumber}_buzz.wav`
   * - Or use generalized buzz loop with pitch matching
   */
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
          // Ensure stringNotes exists and has all required strings
          stringNotes: {
            ...DEFAULT_STRING_NOTES,
            ...(parsed.stringNotes || {}),
          },
        };
      } else {
        // Initialize with defaults if no saved settings
        this.settings.stringNotes = { ...DEFAULT_STRING_NOTES };
      }
      // Recalculate frequencies after loading
      this.applySettings();
    } catch (error) {
      console.error("Failed to load settings:", error);
      // Fallback to defaults on error
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
      if (this.reverb instanceof Tone.Reverb) {
        this.reverb.wet.value = this.settings.reverbMix;
      } else if (this.reverb instanceof Tone.Convolver) {
        // Convolver doesn't have wet parameter, use send/return pattern if needed
        // For now, we'll skip this if using Convolver
      }
    }

    // Update low-pass filter (warmth)
    if (this.lowPassFilter) {
      const warmthFreq = 400 + this.settings.warmth * 600; // 400-1000 Hz
      this.lowPassFilter.frequency.value = warmthFreq;
    }

    // Update frequencies based on tuning mode - ALWAYS recalculate
    if (this.settings.qinit === "custom") {
      // Use custom note assignments
      this.frequencies = getCustomFrequencies(this.settings.stringNotes, this.settings.octave);
    } else {
      // Use qinit preset intervals
      this.frequencies = getQinitFrequencies(this.settings.qinit, this.settings.octave);
    }
    
    // Ensure frequencies array is always valid
    if (!this.frequencies || this.frequencies.length !== 5) {
      this.frequencies = getCustomFrequencies(this.settings.stringNotes, this.settings.octave);
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

    // Map physical string to playable index
    const playableIndex = STRING_TO_INDEX[physicalStringNumber];
    if (playableIndex === undefined || playableIndex < 0 || playableIndex >= 5) {
      return;
    }

    if (this.settings.muted) {
      return;
    }

    // Find available voice
    let voice = this.voices.find(v => !v.isActive);
    if (!voice) {
      // Use oldest active voice (voice stealing)
      voice = this.voices[0];
    }

    // Get frequency based on current tuning mode
    // Always get fresh frequency in case settings changed
    let frequency: number;
    if (this.settings.qinit === "custom") {
      // Use custom note assignment for this string
      const noteName = this.settings.stringNotes[physicalStringNumber] || "C";
      frequency = getNoteFrequency(noteName, this.settings.octave);
    } else {
      // Use preset frequencies (recalculate if needed)
      if (!this.frequencies || this.frequencies.length !== 5) {
        this.frequencies = getQinitFrequencies(this.settings.qinit, this.settings.octave);
      }
      frequency = this.frequencies[playableIndex];
    }
    
    // Safety check - ensure frequency is valid
    if (!frequency || isNaN(frequency) || frequency <= 0) {
      console.warn(`Invalid frequency for string ${physicalStringNumber}, using default C${this.settings.octave}`);
      frequency = getNoteFrequency("C", this.settings.octave);
    }
    
    // Add slight pitch variation for realism
    const variation = 0.995 + Math.random() * 0.01; // ±0.5%
    const finalFreq = frequency * variation;

    try {
      voice.isActive = true;
      voice.stringIndex = physicalStringNumber;

      // Play pluck using Karplus-Strong synthesis (majestic, slow, spiritual)
      // Long sustain (4-5 seconds) with natural decay
      const sustainDuration = 4.5; // Seconds
      voice.pluckSynth.triggerAttackRelease(finalFreq, sustainDuration);

      // Add buzz layer if enabled (characteristic leather thong buzzing)
      if (this.settings.buzzEnabled) {
        this.createBuzzLayer(finalFreq);
      }

      // Reset voice after release (slightly longer than note duration)
      setTimeout(() => {
        voice.isActive = false;
        voice.stringIndex = -1;
      }, sustainDuration * 1000 + 500); // Duration in ms + buffer
    } catch (error) {
      console.error("Failed to play string:", error);
      voice.isActive = false;
    }
  }

  updateSettings(newSettings: Partial<SoundSettings>) {
    this.settings = { ...this.settings, ...newSettings };
    
    // If qinit preset is selected (not custom), apply preset notes
    if (newSettings.qinit && newSettings.qinit !== "custom") {
      this.settings.stringNotes = applyQinitPreset(newSettings.qinit);
    }
    
    // If octave changed, recalculate frequencies immediately
    if (newSettings.octave !== undefined) {
      if (this.settings.qinit === "custom") {
        // Recalculate custom frequencies for new octave
        this.frequencies = getCustomFrequencies(this.settings.stringNotes, this.settings.octave);
      } else {
        // Recalculate preset frequencies for new octave
        this.frequencies = getQinitFrequencies(this.settings.qinit, this.settings.octave);
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
    this.frequencies = getCustomFrequencies(this.settings.stringNotes, this.settings.octave);
    
    // Apply all settings (volume, reverb, etc.)
    this.applySettings();
    
    // Save to localStorage
    this.saveSettings();
    
    // Debug log for verification
    console.log(`String ${stringNumber} tuned to ${noteName}${this.settings.octave} (${getNoteFrequency(noteName, this.settings.octave).toFixed(2)} Hz)`);
  }

  getSettings(): SoundSettings {
    return { ...this.settings };
  }

  getFrequencies(): number[] {
    return [...this.frequencies];
  }

  getNoteNames(): string[] {
    return getNoteNames(this.settings.qinit, this.settings.octave);
  }

  getQinitInfo(): { mode: QinitMode; octave: number; frequencies: number[]; noteNames: string[]; rootFreq: number; stringNotes: Record<number, NoteName> } {
    // Build note names from custom tuning or qinit preset
    let noteNames: string[];
    if (this.settings.qinit === "custom") {
      const playableStrings = [1, 4, 6, 8, 10];
      noteNames = playableStrings.map(stringNum => {
        const noteName = this.settings.stringNotes[stringNum] || "C";
        return `${noteName}${this.settings.octave}`;
      });
    } else {
      noteNames = getNoteNames(this.settings.qinit, this.settings.octave);
    }
    
    return {
      mode: this.settings.qinit,
      octave: this.settings.octave,
      frequencies: this.frequencies,
      noteNames,
      rootFreq: getOctaveRootFreq(this.settings.octave),
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
}

// Singleton instance
export const soundManager = new SoundManager();