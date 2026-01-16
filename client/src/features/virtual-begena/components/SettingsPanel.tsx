"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Volume2,
  VolumeX,
  Music,
  Sun,
  Moon,
  Settings as SettingsIcon,
  Waves,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useI18n } from "@/components/providers/I18nProvider";
import {
  soundManager,
  SoundSettings,
  QinitMode,
} from "@/features/virtual-begena/lib/sound";

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  showHands: boolean;
  onToggleHands: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

export default function SettingsPanel({
  isOpen,
  onClose,
  showHands,
  onToggleHands,
  darkMode,
  onToggleDarkMode,
}: SettingsPanelProps) {
  const { t } = useI18n();
  const [settings, setSettings] = useState<SoundSettings>(
    soundManager.getSettings()
  );
  const [qinitInfo, setQinitInfo] = useState(soundManager.getQinitInfo());

  const translate = (
    key: string,
    fallback: string,
    vars?: Record<string, string | number>,
  ) => {
    const template = t(key, fallback);
    if (!vars) return template;
    return Object.entries(vars).reduce(
      (acc, [token, value]) => acc.replace(`{{${token}}}`, String(value)),
      template,
    );
  };

  const stringLabel = (value: number | string) =>
    translate("virtualExperience.labels.string", "String {{number}}", {
      number: value,
    });

  const formatHz = (value: number) =>
    translate("virtualExperience.labels.frequencyHz", "{{value}} Hz", {
      value: value.toFixed(2),
    });

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const frame = requestAnimationFrame(() => {
      setSettings(soundManager.getSettings());
      setQinitInfo(soundManager.getQinitInfo());
    });
    return () => cancelAnimationFrame(frame);
  }, [isOpen]);

  const handleVolumeChange = (volume: number) => {
    const newSettings = { ...settings, volume };
    setSettings(newSettings);
    soundManager.updateSettings({ volume });
  };

  const handleBuzzLevelChange = (buzzLevel: number) => {
    const newSettings = { ...settings, buzzLevel };
    setSettings(newSettings);
    soundManager.updateSettings({ buzzLevel });
  };

  const handleReverbMixChange = (reverbMix: number) => {
    const newSettings = { ...settings, reverbMix };
    setSettings(newSettings);
    soundManager.updateSettings({ reverbMix });
  };

  const handleWarmthChange = (warmth: number) => {
    const newSettings = { ...settings, warmth };
    setSettings(newSettings);
    soundManager.updateSettings({ warmth });
  };

  const handleAmbienceVolumeChange = (ambienceVolume: number) => {
    const newSettings = { ...settings, ambienceVolume };
    setSettings(newSettings);
    soundManager.updateSettings({ ambienceVolume });
  };

  const handleQinitChange = (qinit: QinitMode) => {
    const newSettings = { ...settings, qinit };
    setSettings(newSettings);
    soundManager.updateSettings({ qinit });
    setQinitInfo(soundManager.getQinitInfo());
  };

  const handleOctaveChange = (octave: number) => {
    const newSettings = { ...settings, octave };
    setSettings(newSettings);
    soundManager.updateSettings({ octave });
    setQinitInfo(soundManager.getQinitInfo());
  };

  const handleMuteToggle = () => {
    soundManager.toggleMute();
    setSettings(soundManager.getSettings());
  };

  const handleAmbienceToggle = () => {
    soundManager.toggleAmbience();
    setSettings(soundManager.getSettings());
  };

  const handleBuzzToggle = () => {
    soundManager.toggleBuzz();
    setSettings(soundManager.getSettings());
  };

  const qinitPresets: {
    value: QinitMode;
    label: string;
    description: string;
    pattern: string;
  }[] = [
    {
      value: "tizita",
      label: "Tizita (ትዝታ)",
      description: "T – T – TS – T – TS: C – D – E – G – A",
      pattern: "T – T – TS – T – TS",
    },
    {
      value: "bati",
      label: "Bati (ባቲ)",
      description: "DT – St – T – DT – St: C – E – F – G – B",
      pattern: "DT – St – T – DT – St",
    },
    {
      value: "ambassel",
      label: "Ambassel (አምባሰል)",
      description: "St – DT – T – St – DT: C – Db – F – G – Ab",
      pattern: "St – DT – T – St – DT",
    },
    {
      value: "anchihoye",
      label: "Anchihoye (አንቺሆዬ)",
      description: "St – DT – St – TS – TS: C – Db – F – Gb – A",
      pattern: "St – DT – St – TS – TS",
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-20 right-4 bottom-4 w-full max-w-md bg-begena-cream dark:bg-begena-darkBrown z-50 shadow-2xl overflow-y-auto rounded-3xl"
          >
            <div className="p-6 space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <SettingsIcon className="w-6 h-6 text-begena-gold" />
                  <h2 className="text-2xl font-serif font-bold text-begena-gold">
                    {translate("virtualExperience.settingsPanel.title", "Settings")}
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-begena-brown/20 dark:hover:bg-begena-cream/20 transition-colors"
                >
                  <X className="w-5 h-5 text-begena-brown dark:text-begena-cream" />
                </button>
              </div>

              {/* Octave Selector */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-begena-brown dark:text-begena-cream">
                  {translate(
                    "virtualExperience.settingsPanel.octave.title",
                    "Octave Selection",
                  )}
                </h3>
                <div className="space-y-2">
                  <label className="text-sm text-begena-brown dark:text-begena-cream">
                    {translate(
                      "virtualExperience.settingsPanel.octave.label",
                      "Octave: C{{octave}} ({{frequency}} Hz)",
                      {
                        octave: settings.octave,
                        frequency: soundManager.getQinitInfo().rootFreq.toFixed(2),
                      },
                    )}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="8"
                    step="1"
                    value={settings.octave}
                    onChange={(e) =>
                      handleOctaveChange(parseInt(e.target.value))
                    }
                    className="w-full h-2 bg-begena-brown/20 rounded-lg appearance-none cursor-pointer accent-begena-gold"
                  />
                  <div className="flex justify-between text-xs text-begena-brown/60 dark:text-begena-cream/60">
                    <span>C0 (16.35 Hz)</span>
                    <span>C4 (261.63 Hz)</span>
                    <span>C8 (4186 Hz)</span>
                  </div>
                </div>
              </div>

              {/* Qiñit Tuning Presets */}
              <div className="space-y-4 pt-4 border-t border-begena-brown/20 dark:border-begena-cream/20">
                <h3 className="text-lg font-semibold text-begena-brown dark:text-begena-cream">
                  {translate(
                    "virtualExperience.settingsPanel.mode.title",
                    "Ethiopian Qiñit (Mode)",
                  )}
                </h3>
                <div className="flex flex-col gap-2">
                  {qinitPresets.map((preset) => {
                    const isSelected = settings.qinit === preset.value;
                    return (
                      <motion.button
                        key={preset.value}
                        onClick={() => handleQinitChange(preset.value)}
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        className={`p-3 rounded-lg text-left transition-all border-2 ${
                          isSelected
                            ? "bg-gradient-to-br from-begena-gold via-yellow-500 to-begena-gold text-begena-darkBrown border-begena-gold shadow-lg shadow-begena-gold/30"
                            : "bg-begena-brown/10 dark:bg-begena-cream/10 text-begena-brown dark:text-begena-cream border-transparent hover:border-begena-gold/40 hover:bg-begena-brown/15 dark:hover:bg-begena-cream/15"
                        }`}
                        aria-pressed={isSelected}
                      >
                        <div className="flex items-center justify-between">
                          <div className="font-semibold">{preset.label}</div>
                          {isSelected && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="w-5 h-5 rounded-full bg-begena-darkBrown flex items-center justify-center"
                            >
                              <span className="text-begena-gold text-xs">✓</span>
                            </motion.div>
                          )}
                        </div>
                        <div className={`text-xs mt-1 ${isSelected ? "opacity-90" : "opacity-75"}`}>
                          {preset.description}
                        </div>
                        <div className={`text-xs mt-1 font-mono ${isSelected ? "opacity-80" : "opacity-60"}`}>
                          {translate(
                            "virtualExperience.settingsPanel.mode.pattern",
                            "Pattern",
                          )}
                          : {preset.pattern}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>

                {/* Frequency Inspector */}
                {qinitInfo && (
                  <div className="mt-4 p-3 rounded-lg bg-begena-brown/10 dark:bg-begena-cream/10">
                    <div className="text-xs font-semibold text-begena-brown dark:text-begena-cream mb-2">
                      {translate(
                        "virtualExperience.settingsPanel.visual.currentTuning",
                        "Current Tuning ({{mode}}, Octave {{octave}}):",
                        {
                          mode: qinitInfo.mode.toUpperCase(),
                          octave: qinitInfo.octave,
                        },
                      )}
                    </div>
                    <div className="space-y-1 text-xs">
                      {[0, 1, 2, 3, 4].map((i) => {
                        const stringNum = [1, 4, 6, 8, 10][i];
                        return (
                          <div
                            key={i}
                            className="flex justify-between text-begena-brown dark:text-begena-cream"
                          >
                            <span>
                              {stringLabel(stringNum)}: {qinitInfo.noteNames[i]}
                            </span>
                            <span className="opacity-75">
                              {formatHz(qinitInfo.frequencies[i])}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Sound Settings */}
              <div className="space-y-4 pt-4 border-t border-begena-brown/20 dark:border-begena-cream/20">
                <h3 className="text-lg font-semibold text-begena-brown dark:text-begena-cream">
                  {translate("virtualExperience.settingsPanel.sound.title", "Sound")}
                </h3>

                {/* Mute Toggle */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-begena-brown/10 dark:bg-begena-cream/10">
                  <div className="flex items-center gap-2">
                    {settings.muted ? (
                      <VolumeX className="w-5 h-5 text-begena-brown dark:text-begena-cream" />
                    ) : (
                      <Volume2 className="w-5 h-5 text-begena-brown dark:text-begena-cream" />
                    )}
                    <span className="text-begena-brown dark:text-begena-cream">
                      {translate("virtualExperience.settingsPanel.sound.mute", "Mute")}
                    </span>
                  </div>
                  <button
                    onClick={handleMuteToggle}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      settings.muted ? "bg-begena-brown/40" : "bg-begena-gold"
                    }`}
                  >
                    <motion.div
                      className="w-5 h-5 bg-white rounded-full shadow-md"
                      animate={{
                        x: settings.muted ? 2 : 26,
                      }}
                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 30,
                      }}
                    />
                  </button>
                </div>

                {/* Volume Slider */}
                <div className="space-y-2">
                  <label className="text-sm text-begena-brown dark:text-begena-cream">
                    {translate(
                      "virtualExperience.settingsPanel.sound.volume",
                      "Volume: {{value}}%",
                      { value: Math.round(settings.volume * 100) },
                    )}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={settings.volume}
                    onChange={(e) =>
                      handleVolumeChange(parseFloat(e.target.value))
                    }
                    className="w-full h-2 bg-begena-brown/20 rounded-lg appearance-none cursor-pointer accent-begena-gold"
                  />
                </div>

                {/* Buzz Toggle */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-begena-brown/10 dark:bg-begena-cream/10">
                  <div className="flex items-center gap-2">
                    <Waves className="w-5 h-5 text-begena-brown dark:text-begena-cream" />
                    <span className="text-begena-brown dark:text-begena-cream">
                      {translate(
                        "virtualExperience.settingsPanel.sound.buzz",
                        "Buzz (Leather Thong)",
                      )}
                    </span>
                  </div>
                  <button
                    onClick={handleBuzzToggle}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      settings.buzzEnabled
                        ? "bg-begena-gold"
                        : "bg-begena-brown/40"
                    }`}
                  >
                    <motion.div
                      className="w-5 h-5 bg-white rounded-full shadow-md"
                      animate={{
                        x: settings.buzzEnabled ? 26 : 2,
                      }}
                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 30,
                      }}
                    />
                  </button>
                </div>

                {/* Buzz Level */}
                {settings.buzzEnabled && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2"
                  >
                    <label className="text-sm text-begena-brown dark:text-begena-cream">
                      {translate(
                        "virtualExperience.settingsPanel.sound.buzzLevel",
                        "Buzz Level: {{value}}%",
                        { value: Math.round(settings.buzzLevel * 100) },
                      )}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={settings.buzzLevel}
                      onChange={(e) =>
                        handleBuzzLevelChange(parseFloat(e.target.value))
                      }
                      className="w-full h-2 bg-begena-brown/20 rounded-lg appearance-none cursor-pointer accent-begena-gold"
                    />
                  </motion.div>
                )}

                {/* Reverb Mix */}
                <div className="space-y-2">
                  <label className="text-sm text-begena-brown dark:text-begena-cream">
                    {translate(
                      "virtualExperience.settingsPanel.sound.reverb",
                      "Reverb (Resonance): {{value}}%",
                      { value: Math.round(settings.reverbMix * 100) },
                    )}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={settings.reverbMix}
                    onChange={(e) =>
                      handleReverbMixChange(parseFloat(e.target.value))
                    }
                    className="w-full h-2 bg-begena-brown/20 rounded-lg appearance-none cursor-pointer accent-begena-gold"
                  />
                </div>

                {/* Warmth (Low-frequency boost) */}
                <div className="space-y-2">
                  <label className="text-sm text-begena-brown dark:text-begena-cream">
                    {translate(
                      "virtualExperience.settingsPanel.sound.warmth",
                      "Warmth (Low-end): {{value}}%",
                      { value: Math.round(settings.warmth * 100) },
                    )}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={settings.warmth}
                    onChange={(e) =>
                      handleWarmthChange(parseFloat(e.target.value))
                    }
                    className="w-full h-2 bg-begena-brown/20 rounded-lg appearance-none cursor-pointer accent-begena-gold"
                  />
                </div>

                {/* Ambience Toggle */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-begena-brown/10 dark:bg-begena-cream/10">
                  <div className="flex items-center gap-2">
                    <Music className="w-5 h-5 text-begena-brown dark:text-begena-cream" />
                    <span className="text-begena-brown dark:text-begena-cream">
                      {translate(
                        "virtualExperience.settingsPanel.sound.ambience",
                        "Background Ambience",
                      )}
                    </span>
                  </div>
                  <button
                    onClick={handleAmbienceToggle}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      settings.ambienceEnabled
                        ? "bg-begena-gold"
                        : "bg-begena-brown/40"
                    }`}
                  >
                    <motion.div
                      className="w-5 h-5 bg-white rounded-full shadow-md"
                      animate={{
                        x: settings.ambienceEnabled ? 26 : 2,
                      }}
                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 30,
                      }}
                    />
                  </button>
                </div>

                {/* Ambience Volume */}
                {settings.ambienceEnabled && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2"
                  >
                    <label className="text-sm text-begena-brown dark:text-begena-cream">
                      {translate(
                        "virtualExperience.settingsPanel.sound.ambienceVolume",
                        "Ambience Volume: {{value}}%",
                        { value: Math.round(settings.ambienceVolume * 100) },
                      )}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={settings.ambienceVolume}
                      onChange={(e) =>
                        handleAmbienceVolumeChange(parseFloat(e.target.value))
                      }
                      className="w-full h-2 bg-begena-brown/20 rounded-lg appearance-none cursor-pointer accent-begena-gold"
                    />
                  </motion.div>
                )}
              </div>

              {/* Visual Settings */}
              <div className="space-y-4 pt-4 border-t border-begena-brown/20 dark:border-begena-cream/20">
                <h3 className="text-lg font-semibold text-begena-brown dark:text-begena-cream">
                  {translate(
                    "virtualExperience.settingsPanel.visual.title",
                    "Visual",
                  )}
                </h3>

                {/* Show Hands Toggle */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-begena-brown/10 dark:bg-begena-cream/10 hover:bg-begena-brown/15 dark:hover:bg-begena-cream/15 transition-colors">
                  <span className="text-begena-brown dark:text-begena-cream font-medium">
                    {translate(
                      "virtualExperience.settingsPanel.visual.hands",
                      "Show Hand Animation",
                    )}
                  </span>
                  <button
                    onClick={onToggleHands}
                    className={`relative w-14 h-7 rounded-full transition-all duration-300 shadow-inner ${
                      showHands 
                        ? "bg-gradient-to-r from-begena-gold via-yellow-500 to-begena-gold" 
                        : "bg-gradient-to-r from-begena-brown/60 via-begena-brown/40 to-begena-brown/60"
                    } hover:scale-105 focus:outline-none focus:ring-2 focus:ring-begena-gold/50`}
                    aria-label={showHands ? "Hide hand animation" : "Show hand animation"}
                  >
                    <motion.div
                      className="w-6 h-6 bg-white rounded-full shadow-lg absolute top-0.5"
                      animate={{
                        x: showHands ? 28 : 2,
                      }}
                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 30,
                      }}
                    />
                  </button>
                </div>

                {/* Dark Mode Toggle */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-begena-brown/10 dark:bg-begena-cream/10 hover:bg-begena-brown/15 dark:hover:bg-begena-cream/15 transition-colors">
                  <div className="flex items-center gap-2">
                    {darkMode ? (
                      <Moon className="w-5 h-5 text-begena-gold dark:text-begena-gold" />
                    ) : (
                      <Sun className="w-5 h-5 text-begena-gold dark:text-begena-gold" />
                    )}
                    <span className="text-begena-brown dark:text-begena-cream font-medium">
                      {translate(
                        "virtualExperience.settingsPanel.visual.darkMode",
                        "Dark Mode",
                      )}
                    </span>
                  </div>
                  <button
                    onClick={onToggleDarkMode}
                    className={`relative w-14 h-7 rounded-full transition-all duration-300 shadow-inner ${
                      darkMode 
                        ? "bg-gradient-to-r from-begena-gold via-yellow-500 to-begena-gold" 
                        : "bg-gradient-to-r from-begena-brown/60 via-begena-brown/40 to-begena-brown/60"
                    } hover:scale-105 focus:outline-none focus:ring-2 focus:ring-begena-gold/50`}
                    aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
                  >
                    <motion.div
                      className="w-6 h-6 bg-white rounded-full shadow-lg absolute top-0.5 flex items-center justify-center"
                      animate={{
                        x: darkMode ? 28 : 2,
                      }}
                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 30,
                      }}
                    >
                      {darkMode ? (
                        <Moon className="w-3 h-3 text-begena-darkBrown" />
                      ) : (
                        <Sun className="w-3 h-3 text-begena-gold" />
                      )}
                    </motion.div>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
