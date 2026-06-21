"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useI18n } from "@/components/providers/I18nProvider";
import {
  Settings,
  Home,
  Circle,
  Square,
  Play,
  Trash2,
  Download,
  Music,
  Loader2,
} from "lucide-react";
import BegenaVisual from "@/features/virtual-begena/components/BegenaVisual";
import SettingsPanel from "@/features/virtual-begena/components/SettingsPanel";
import InfoPanel from "@/features/virtual-begena/components/InfoPanel";
import StringTuner from "@/features/virtual-begena/components/StringTuner";
import {
  soundManager,
  PLAYABLE_STRINGS,
  ALL_STRINGS,
} from "@/features/virtual-begena/lib/sound";
import { recorder } from "@/features/virtual-begena/lib/recorder";
import {
  exportToWAV,
  downloadAudio,
} from "@/features/virtual-begena/lib/audioExport";

// Keyboard mapping using event.code for reliability
// New mapping: Space→1, F→4 (String 2, lowest), D→6 (String 3), S→8 (String 4, highest), A→10 (String 5)
const KEY_CODE_TO_STRING: Record<string, number> = {
  Space: 1,  // String 1 (middle pitch)
  KeyF: 4,   // String 2 (lowest sound, physical string 4)
  KeyD: 6,   // String 3 (second lowest, physical string 6)
  KeyS: 8,   // String 4 (highest sound, physical string 8)
  KeyA: 10,  // String 5 (second highest, physical string 10)
};

export default function VirtualBegenaExperience() {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const { t } = useI18n();
  const [pressedStrings, setPressedStrings] = useState<Set<number>>(new Set());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasRecording, setHasRecording] = useState(false);
  const [isTunerOpen, setIsTunerOpen] = useState(false);
  const [samplerReady, setSamplerReady] = useState(false);

  // Initialize audio and poll until real samples are loaded
  useEffect(() => {
    soundManager.initialize().catch(console.error);
    const interval = setInterval(() => {
      if (soundManager.isReady()) {
        setSamplerReady(true);
        clearInterval(interval);
      }
    }, 200);
    return () => clearInterval(interval);
  }, []);

  const isDark = resolvedTheme === "dark";
  const toggleDarkMode = () => {
    setTheme(isDark ? "light" : "dark");
  };

  const playString = useCallback(
    (physicalStringNumber: number, record = true) => {
      // Play the physical string number (1, 4, 6, 8, or 10)
      soundManager.playString(physicalStringNumber);

      // Record if recording is active (record physical string number)
      if (isRecording && record) {
        recorder.recordNote(physicalStringNumber);
      }

      // Visual feedback
      setPressedStrings((prev) => new Set([...prev, physicalStringNumber]));

      setTimeout(() => {
        setPressedStrings((prev) => {
          const next = new Set(prev);
          next.delete(physicalStringNumber);
          return next;
        });
      }, 300);
    },
    [isRecording]
  );

  // Keyboard event handling using event.code
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Escape") {
        setIsSettingsOpen(false);
        return;
      }

      const physicalStringNumber = KEY_CODE_TO_STRING[e.code];
      if (
        physicalStringNumber !== undefined &&
        !pressedStrings.has(physicalStringNumber)
      ) {
        e.preventDefault();
        playString(physicalStringNumber);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const physicalStringNumber = KEY_CODE_TO_STRING[e.code];
      if (physicalStringNumber !== undefined) {
        setPressedStrings((prev) => {
          const next = new Set(prev);
          next.delete(physicalStringNumber);
          return next;
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [playString, pressedStrings]);

  // Recording handlers
  const handleStartRecording = () => {
    recorder.startRecording();
    setIsRecording(true);
    setHasRecording(false);
  };

  const handleStopRecording = () => {
    recorder.stopRecording();
    setIsRecording(false);
    setHasRecording(recorder.getRecording().length > 0);
  };

  const handlePlayRecording = () => {
    if (isPlaying) return;

    setIsPlaying(true);
    const notes = recorder.getRecording();

    notes.forEach((note) => {
      setTimeout(() => {
        playString(note.stringIndex, false); // Note: recorder stores physical string number
      }, note.timestamp);
    });

    setTimeout(
      () => {
        setIsPlaying(false);
      },
      notes.length > 0 ? notes[notes.length - 1].timestamp + 500 : 0
    );
  };

  const handleClearRecording = () => {
    recorder.clearRecording();
    setHasRecording(false);
    setIsPlaying(false);
  };

  const handleExportRecording = async () => {
    const notes = recorder.getRecording();
    if (notes.length === 0) return;

    try {
      const blob = await exportToWAV(notes);
      if (blob) {
        const qinitInfo = soundManager.getQinitInfo();
        const filename = `begena_${qinitInfo.mode}_${qinitInfo.root}_${Date.now()}.wav`;
        downloadAudio(blob, filename);
      }
    } catch (error) {
      console.error("Failed to export recording:", error);
    }
  };

  const stringLabel = (value: number | string) =>
    t("virtualExperience.labels.string", "String {{number}}").replace(
      "{{number}}",
      String(value),
    );

  const keyboardGuide = [
    { key: "Space", string: 1, finger: t("virtualExperience.fingers.thumb", "Thumb"), label: t("virtualExperience.strings.string1", "String 1") },
    { key: "F", string: 4, finger: t("virtualExperience.fingers.index", "Index"), label: t("virtualExperience.strings.string2", "String 2 (Lowest)") },
    { key: "D", string: 6, finger: t("virtualExperience.fingers.middle", "Middle"), label: t("virtualExperience.strings.string3", "String 3") },
    { key: "S", string: 8, finger: t("virtualExperience.fingers.ring", "Ring"), label: t("virtualExperience.strings.string4", "String 4 (Highest)") },
    { key: "A", string: 10, finger: t("virtualExperience.fingers.little", "Little"), label: t("virtualExperience.strings.string5", "String 5") },
  ];

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8 relative">
      {/* Background decorative Orthodox crosses (very subtle) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-20 left-10 text-begena-gold/5 text-8xl font-serif">✝</div>
        <div className="absolute top-40 right-20 text-begena-gold/5 text-6xl font-serif">✝</div>
        <div className="absolute bottom-40 left-20 text-begena-gold/5 text-7xl font-serif">✝</div>
        <div className="absolute bottom-20 right-10 text-begena-gold/5 text-8xl font-serif">✝</div>
      </div>

      {/* Header - Fixed position to avoid overlap */}
      <div className="sticky top-0 z-50 bg-background/90 dark:bg-background/80 backdrop-blur-lg border-b border-border mb-4 md:mb-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 md:px-6 md:py-4">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-begena-brown/20 dark:bg-begena-cream/20 hover:bg-begena-brown/30 dark:hover:bg-begena-cream/30 transition-all text-begena-brown dark:text-begena-cream border border-begena-brown/20 dark:border-begena-cream/20 hover:border-begena-gold/40"
          >
            <Home className="w-5 h-5" />
            <span className="hidden sm:inline">
              {t("virtualExperience.header.home", "Home")}
            </span>
          </button>

        <div className="flex-1 text-center">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-begena-gold drop-shadow-lg">
            {t("virtualExperience.header.title", "Virtual Begena")}
          </h1>
          <p className="text-xs sm:text-sm text-begena-brown/70 dark:text-begena-cream/70 italic font-serif">
            {t("virtualExperience.header.subtitle", "በገና · Harp of David")}
          </p>
        </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsTunerOpen(true)}
              className="flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg bg-begena-gold hover:bg-begena-gold/90 text-begena-darkBrown font-semibold transition-all shadow-md hover:shadow-lg border-2 border-begena-gold"
            >
              <Music className="w-4 h-4 md:w-5 md:h-5" />
              <span className="hidden sm:inline">
                {t("virtualExperience.tune", "Tune")}
              </span>
            </button>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg bg-begena-brown/20 dark:bg-begena-cream/20 hover:bg-begena-brown/30 dark:hover:bg-begena-cream/30 transition-all text-begena-brown dark:text-begena-cream border-2 border-begena-brown/20 dark:border-begena-cream/20 hover:border-begena-gold/40"
            >
              <Settings className="w-4 h-4 md:w-5 md:h-5" />
              <span className="hidden sm:inline">
                {t("virtualExperience.settings", "Settings")}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Sample loading indicator */}
      {!samplerReady && (
        <div className="flex justify-center mb-4 relative z-10">
          <div className="flex items-center gap-2 px-5 py-2 rounded-full bg-begena-gold/10 border border-begena-gold/30 text-begena-gold text-sm font-semibold">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading begena samples…
          </div>
        </div>
      )}

      {/* Quote with Orthodox styling */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-6 md:mb-8 relative z-10"
      >
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="h-px w-8 md:w-16 bg-begena-gold/40"></div>
          <div className="text-begena-gold/60 text-xl">✝</div>
          <div className="h-px w-8 md:w-16 bg-begena-gold/40"></div>
        </div>
        <p className="text-sm md:text-base lg:text-lg text-begena-brown/80 dark:text-begena-cream/80 italic font-serif px-4">
          {t(
            "virtualExperience.quote.text",
            "“The Begena soothes the soul and brings peace to the heart.”",
          )}
        </p>
        <p className="text-xs md:text-sm text-begena-brown/60 dark:text-begena-cream/60 italic mt-1">
          {t(
            "virtualExperience.quote.attribution",
            "— Ethiopian Orthodox Tradition",
          )}
        </p>
      </motion.div>

      {/* Main Content - Ensure proper spacing to avoid InfoPanel overlap */}
      <div className="flex flex-col lg:flex-row gap-6 md:gap-8 items-center justify-center relative z-10 pb-24 md:pb-28">
        {/* Begena Visualization - Center stage */}
        <div className="flex-1 max-w-full lg:max-w-3xl w-full">
          <BegenaVisual
            stringNumbers={ALL_STRINGS}
            playableStrings={PLAYABLE_STRINGS}
            pressedStrings={pressedStrings}
            onStringPress={(stringNum) => playString(stringNum)}
          />
        </div>
      </div>

      {/* Recording Controls */}
      <div className="mt-6 md:mt-8 flex flex-col items-center gap-4 relative z-10">
        <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4">
          {!isRecording ? (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleStartRecording}
              className="flex items-center gap-2 px-6 py-3 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors"
            >
              <Circle className="w-5 h-5 fill-current" />
              {t("virtualExperience.controls.record", "Record")}
            </motion.button>
          ) : (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleStopRecording}
              className="flex items-center gap-2 px-6 py-3 rounded-lg bg-gray-600 hover:bg-gray-700 text-white font-semibold transition-colors"
            >
              <Square className="w-5 h-5" />
              {t("virtualExperience.controls.stop", "Stop")}
            </motion.button>
          )}

          {hasRecording && (
            <>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handlePlayRecording}
                disabled={isPlaying}
                className="flex items-center gap-2 px-6 py-3 rounded-lg bg-begena-gold hover:bg-begena-gold/90 text-begena-darkBrown font-semibold transition-colors disabled:opacity-50"
              >
                <Play className="w-5 h-5" />
                {t("virtualExperience.controls.play", "Play")}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleExportRecording}
                className="flex items-center gap-2 px-6 py-3 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold transition-colors"
              >
                <Download className="w-5 h-5" />
                {t("virtualExperience.controls.export", "Export WAV")}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleClearRecording}
                className="flex items-center gap-2 px-6 py-3 rounded-lg bg-gray-600 hover:bg-gray-700 text-white font-semibold transition-colors"
              >
                <Trash2 className="w-5 h-5" />
                {t("virtualExperience.controls.clear", "Clear")}
              </motion.button>
            </>
          )}
        </div>

        {isRecording && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 text-red-600 font-semibold"
          >
            <Circle className="w-3 h-3 fill-current animate-pulse" />
            {t("virtualExperience.controls.recording", "Recording...")}
          </motion.div>
        )}
      </div>

      {/* Keyboard Guide */}
      <div className="mt-6 md:mt-8 text-center relative z-10 bg-surface backdrop-blur-sm rounded-xl p-4 md:p-6 border border-border">
        <p className="text-xs md:text-sm text-begena-brown/80 dark:text-begena-cream/80 mb-4 font-semibold">
          {t(
            "virtualExperience.keyboard.instructions",
            "Use your keyboard to play (10 strings total, 5 playable):",
          )}
        </p>
        <div className="flex justify-center gap-2 md:gap-3 flex-wrap">
          {keyboardGuide.map(({ key, string, finger, label }) => (
            <div
              key={key}
              className="px-4 py-2 rounded-lg bg-begena-brown/20 dark:bg-begena-cream/20 text-begena-brown dark:text-begena-cream"
            >
              <div className="font-mono font-bold text-lg">{key}</div>
              <div className="text-xs opacity-75">{label || stringLabel(string)}</div>
              <div className="text-xs opacity-75">{finger}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Settings Panel */}
      <SettingsPanel
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        darkMode={isDark}
        onToggleDarkMode={toggleDarkMode}
      />

      {/* Info Panel */}
      <InfoPanel />

      {/* String Tuner */}
      <StringTuner isOpen={isTunerOpen} onClose={() => setIsTunerOpen(false)} />
    </div>
  );
}
