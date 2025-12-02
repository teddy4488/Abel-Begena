"use client";

import { motion } from "framer-motion";
import { Music, ChevronDown } from "lucide-react";
import { useState, useEffect } from "react";
import { useI18n } from "@/components/providers/I18nProvider";
import {
  soundManager,
  NOTE_NAMES,
  NoteName,
  PLAYABLE_STRINGS,
} from "@/features/virtual-begena/lib/sound";

interface StringTunerProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * String Tuner Component
 * Allows individual tuning of each playable string
 */
export default function StringTuner({ isOpen, onClose }: StringTunerProps) {
  const { t } = useI18n();
  const [selectedOctave, setSelectedOctave] = useState(
    soundManager.getSettings().octave
  );
  const [stringNotes, setStringNotes] = useState(
    soundManager.getSettings().stringNotes
  );
  const [qinitInfo, setQinitInfo] = useState(soundManager.getQinitInfo());

  // Update state when tuner opens or settings change
  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const frame = requestAnimationFrame(() => {
      const settings = soundManager.getSettings();
      setSelectedOctave(settings.octave);
      setStringNotes(settings.stringNotes);
      setQinitInfo(soundManager.getQinitInfo());
    });
    return () => cancelAnimationFrame(frame);
  }, [isOpen]);

  const playableStrings = PLAYABLE_STRINGS;
  const keyLabels: Record<number, string> = {
    1: "Space",
    4: "F",
    6: "D",
    8: "S",
    10: "A",
  };

  const handleOctaveChange = (octave: number) => {
    setSelectedOctave(octave);
    soundManager.updateSettings({ octave });
    // Refresh to show updated frequencies after octave change
    setTimeout(() => {
      const settings = soundManager.getSettings();
      const qinitInfo = soundManager.getQinitInfo();
      setStringNotes(settings.stringNotes);
      setQinitInfo(qinitInfo);
    }, 100);
  };

  const handleNoteChange = (stringNumber: number, noteName: NoteName) => {
    // Update in sound manager FIRST (this switches to custom mode and saves)
    soundManager.updateStringNote(stringNumber, noteName);

    // Immediately refresh state to reflect changes
    setTimeout(() => {
      const settings = soundManager.getSettings();
      const qinitInfo = soundManager.getQinitInfo();
      setStringNotes(settings.stringNotes);
      setQinitInfo(qinitInfo);
      // Also refresh selectedOctave in case it changed
      setSelectedOctave(settings.octave);
    }, 100);
  };

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-begena-cream dark:bg-begena-darkBrown rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border-2 border-begena-gold/30"
      >
        <div className="p-4 md:p-6 space-y-4 md:space-y-6">
          {/* Header with Orthodox cross */}
          <div className="flex items-center justify-center mb-2">
            <div className="text-begena-gold/30 text-xl">✝</div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 md:gap-3">
              <Music className="w-5 h-5 md:w-6 md:h-6 text-begena-gold" />
              <h2 className="text-xl md:text-2xl font-serif font-bold text-begena-gold">
                {translate("virtualExperience.tuner.title", "String Tuner")}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-begena-brown/20 dark:hover:bg-begena-cream/20 transition-colors"
              aria-label={translate(
                "virtualExperience.tuner.close",
                "Close tuner",
              )}
            >
              <ChevronDown className="w-5 h-5 text-begena-brown dark:text-begena-cream rotate-180" />
            </button>
          </div>

          {/* Octave Selector */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-begena-brown dark:text-begena-cream">
              {translate("virtualExperience.tuner.octave", "Select Octave")}
            </h3>
            <div className="space-y-2">
              <label className="text-sm text-begena-brown dark:text-begena-cream">
                {translate(
                  "virtualExperience.tuner.octaveLabel",
                  "Octave: C{{octave}} ({{frequency}} Hz)",
                  {
                    octave: selectedOctave,
                    frequency: soundManager.getQinitInfo().rootFreq.toFixed(2),
                  },
                )}
              </label>
              <input
                type="range"
                min="0"
                max="8"
                step="1"
                value={selectedOctave}
                onChange={(e) => handleOctaveChange(parseInt(e.target.value))}
                className="w-full h-2 bg-begena-brown/20 rounded-lg appearance-none cursor-pointer accent-begena-gold"
              />
              <div className="flex justify-between text-xs text-begena-brown/60 dark:text-begena-cream/60">
                <span>C0 (16.35 Hz)</span>
                <span>C4 (261.63 Hz)</span>
                <span>C8 (4186 Hz)</span>
              </div>
            </div>
          </div>

          {/* String Note Selectors */}
          <div className="space-y-4 pt-4 border-t border-begena-brown/20 dark:border-begena-cream/20">
            <h3 className="text-lg font-semibold text-begena-brown dark:text-begena-cream">
              {translate(
                "virtualExperience.tuner.tuneStrings",
                "Tune Each String",
              )}
            </h3>
            <p className="text-sm text-begena-brown/70 dark:text-begena-cream/70">
              {translate(
                "virtualExperience.tuner.instructions",
                "Select the note for each playable string in octave {{octave}}",
                { octave: selectedOctave },
              )}
            </p>

            <div className="space-y-3">
              {playableStrings.map((stringNum) => {
                const currentNote = stringNotes[stringNum] || "C";
                return (
                  <div
                    key={stringNum}
                    className="flex items-center gap-4 p-3 rounded-lg bg-begena-brown/10 dark:bg-begena-cream/10"
                  >
                    {/* String Info */}
                    <div className="flex-shrink-0 w-20 md:w-24">
                      <div className="font-mono font-bold text-begena-gold text-base md:text-lg">
                        {keyLabels[stringNum]}
                      </div>
                      <div className="text-xs text-begena-brown/70 dark:text-begena-cream/70">
                        {stringLabel(stringNum)}
                      </div>
                    </div>

                    {/* Note Selector */}
                    <div className="flex-1">
                      <label className="block text-xs text-begena-brown dark:text-begena-cream mb-1">
                        {translate("virtualExperience.tuner.note", "Note")}
                      </label>
                      <select
                        value={currentNote}
                        onChange={(e) =>
                          handleNoteChange(
                            stringNum,
                            e.target.value as NoteName
                          )
                        }
                        className="w-full px-2 md:px-3 py-2 rounded-lg bg-begena-cream dark:bg-begena-darkBrown border-2 border-begena-gold text-begena-brown dark:text-begena-cream font-semibold focus:outline-none focus:ring-2 focus:ring-begena-gold shadow-sm hover:shadow-md transition-shadow"
                      >
                        {NOTE_NAMES.map((note) => (
                          <option key={note} value={note}>
                            {note}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Frequency Display */}
                    <div className="flex-shrink-0 w-24 md:w-32 text-right">
                      <div className="font-semibold text-begena-brown dark:text-begena-cream text-sm md:text-base">
                        {translate("virtualExperience.tuner.frequencyLabel", "{{note}}{{octave}}", {
                          note: currentNote,
                          octave: selectedOctave,
                        })}
                      </div>
                      <div className="text-xs text-begena-brown/70 dark:text-begena-cream/70">
                        {translate(
                          "virtualExperience.labels.frequencyHz",
                          "{{value}} Hz",
                          {
                            value: qinitInfo.frequencies[
                              playableStrings.indexOf(stringNum)
                            ].toFixed(2),
                          },
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Presets */}
          <div className="space-y-3 pt-4 border-t border-begena-brown/20 dark:border-begena-cream/20">
            <h3 className="text-sm font-semibold text-begena-brown dark:text-begena-cream">
              {translate("virtualExperience.tuner.quickPresets", "Quick Presets")}
            </h3>
            <div className="flex flex-wrap gap-2">
              {(["tizita", "bati", "ambassel", "anchihoye"] as const).map(
                (preset) => (
                  <button
                    key={preset}
                    onClick={() => {
                      soundManager.updateSettings({ qinit: preset });
                      // Refresh state after preset is applied
                      setTimeout(() => {
                        const settings = soundManager.getSettings();
                        setStringNotes(settings.stringNotes);
                        setSelectedOctave(settings.octave);
                        setQinitInfo(soundManager.getQinitInfo());
                      }, 50);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-begena-brown/20 dark:bg-begena-cream/20 hover:bg-begena-gold hover:text-begena-darkBrown transition-colors text-sm font-medium text-begena-brown dark:text-begena-cream"
                  >
                    {preset.charAt(0).toUpperCase() + preset.slice(1)}
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
