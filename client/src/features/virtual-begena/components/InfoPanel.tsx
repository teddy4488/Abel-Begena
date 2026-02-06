"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Info, Music2, ChevronUp, ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import { useI18n } from "@/components/providers/I18nProvider";
import {
  soundManager,
  PLAYABLE_STRINGS,
} from "@/features/virtual-begena/lib/sound";

/**
 * Collapsible Info Panel Component
 * Displays current scale, octave, and the 5 active playable strings with their frequencies
 */
export default function InfoPanel() {
  const { t } = useI18n();
  const [qinitInfo, setQinitInfo] = useState(soundManager.getQinitInfo());
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setQinitInfo(soundManager.getQinitInfo());
    }, 200);

    return () => clearInterval(interval);
  }, []);

  const qinitLabels: Record<string, string> = {
    tizita: "Tizita (ትዝታ)",
    bati: "Bati (ባቲ)",
    ambassel: "Ambassel (አምባሰል)",
    anchihoye: "Anchihoye (አንቺሆዬ)",
    custom: "Custom Tuning",
  };

  const stringLabel = (value: number | string) =>
    t("virtualExperience.labels.string", "String {{number}}").replace(
      "{{number}}",
      String(value),
    );

  const formatHz = (value: number) =>
    t("virtualExperience.labels.frequencyHz", "{{value}} Hz").replace(
      "{{value}}",
      value.toFixed(2),
    );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-4 left-4 right-4 md:right-auto md:w-80 lg:w-96 z-[100]"
    >
      <motion.div
        className="bg-background dark:bg-begena-darkBrown/95 backdrop-blur-lg rounded-xl shadow-2xl border-2 border-begena-gold/40 overflow-hidden"
        animate={{ height: isExpanded ? "auto" : "60px" }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        {/* Collapsible Header */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between p-4 hover:bg-begena-brown/10 dark:hover:bg-begena-cream/10 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Info className="w-5 h-5 text-begena-gold flex-shrink-0" />
            <h3 className="font-serif font-bold text-begena-gold text-lg md:text-xl">
              {t("virtualExperience.info.title", "Current Settings")}
            </h3>
          </div>
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.3 }}
          >
            {isExpanded ? (
              <ChevronDown className="w-5 h-5 text-begena-gold" />
            ) : (
              <ChevronUp className="w-5 h-5 text-begena-gold" />
            )}
          </motion.div>
        </button>

        {/* Collapsible Content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 space-y-4">
                {/* Orthodox cross decoration */}
                <div className="flex items-center justify-center py-2">
                  <div className="text-begena-gold/30 text-xl">✝</div>
                </div>

                {/* Scale */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-begena-brown/10 to-begena-brown/5 dark:from-begena-cream/10 dark:to-begena-cream/5 border border-begena-gold/20">
                  <Music2 className="w-5 h-5 text-begena-gold flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-begena-brown/70 dark:text-begena-cream/70 mb-1 uppercase tracking-wide">
                      {t("virtualExperience.info.scaleLabel", "Scale / Mode")}
                    </div>
                    <div className="font-semibold text-begena-brown dark:text-begena-cream truncate">
                      {qinitLabels[qinitInfo.mode] || qinitInfo.mode}
                    </div>
                  </div>
                </div>

                {/* Octave */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-begena-brown/10 to-begena-brown/5 dark:from-begena-cream/10 dark:to-begena-cream/5 border border-begena-gold/20">
                  <div className="w-5 h-5 flex items-center justify-center text-begena-gold flex-shrink-0">
                    <span className="font-bold">C</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-begena-brown/70 dark:text-begena-cream/70 mb-1 uppercase tracking-wide">
                      {t("virtualExperience.info.octaveLabel", "Octave")}
                    </div>
                    <div className="font-semibold text-begena-brown dark:text-begena-cream">
                      C{qinitInfo.octave} ({qinitInfo.rootFreq.toFixed(2)} Hz)
                    </div>
                  </div>
                </div>

                {/* Active Strings */}
                <div className="pt-3 border-t border-begena-brown/20 dark:border-begena-cream/20">
                  <div className="text-xs text-begena-brown/70 dark:text-begena-cream/70 mb-3 font-semibold uppercase tracking-wide">
                    {t(
                      "virtualExperience.info.activeStrings",
                      "5 Active Playable Strings",
                    )}
                  </div>
                  <div className="space-y-2">
                    {PLAYABLE_STRINGS.map((stringNum, index) => {
                      const keyLabel =
                        stringNum === 1
                          ? "Space"
                          : stringNum === 4
                          ? "F"
                          : stringNum === 6
                          ? "D"
                          : stringNum === 8
                          ? "S"
                          : stringNum === 10
                          ? "A"
                          : "";

                      return (
                        <motion.div
                          key={stringNum}
                          className="flex items-center justify-between text-sm p-2 rounded-lg bg-gradient-to-r from-begena-brown/5 to-transparent dark:from-begena-cream/5 hover:from-begena-brown/10 dark:hover:from-begena-cream/10 transition-colors"
                          whileHover={{ scale: 1.02, x: 2 }}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-begena-gold w-10 text-right">
                              {keyLabel}
                            </span>
                            <span className="text-begena-brown dark:text-begena-cream">
                              {stringLabel(stringNum)}
                            </span>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-begena-brown dark:text-begena-cream text-xs md:text-sm">
                              {qinitInfo.noteNames[index]}
                            </div>
                            <div className="text-xs text-begena-brown/60 dark:text-begena-cream/60">
                              {formatHz(qinitInfo.frequencies[index])}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>

                {/* Decorative bottom element */}
                <div className="flex items-center justify-center pt-3 border-t border-begena-gold/20">
                  <div className="text-begena-gold/20 text-sm">✝</div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
