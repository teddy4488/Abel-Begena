"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface BegenaStringProps {
  active: boolean;
  keyBind: string;
  isPressed: boolean;
  onPress?: () => void;
}

/**
 * Individual Begena String Component
 * Represents one of the 10 strings, with visual feedback when played
 */
export default function BegenaString({
  active,
  keyBind,
  isPressed,
  onPress,
}: BegenaStringProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (!isPressed) {
      return;
    }
    const frame = requestAnimationFrame(() => setIsAnimating(true));
    const timer = setTimeout(() => setIsAnimating(false), 300);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, [isPressed]);

  const stringVariants = {
    rest: {
      x: 0,
      opacity: active ? 0.9 : 0.3,
      scale: 1,
    },
    pluck: {
      x: [-2, 2, -1.5, 1.5, -1, 1, 0],
      opacity: active ? 1 : 0.3,
      scale: [1, 1.02, 1.01, 1.02, 1.01, 1, 1],
    },
  };

  return (
    <div className="flex flex-col items-center gap-2 relative">
      <div className="relative w-1 h-full flex items-center justify-center">
        <motion.div
          className={`w-1 h-full ${
            active
              ? "bg-begena-gold"
              : "bg-begena-brown/20 dark:bg-begena-cream/20"
          } rounded-full relative`}
          style={{ minHeight: "300px" }}
          variants={stringVariants}
          initial="rest"
          animate={isAnimating ? "pluck" : "rest"}
          transition={{
            duration: 0.3,
            ease: "easeOut",
          }}
        >
          {/* Glow effect when pressed */}
          {isPressed && active && (
            <motion.div
              className="absolute inset-0 bg-begena-gold rounded-full blur-sm"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 0.8, scale: 1.5 }}
              exit={{ opacity: 0, scale: 1 }}
              transition={{ duration: 0.2 }}
            />
          )}

          {/* String marker */}
          {active && (
            <motion.div
              className="absolute top-1/2 left-1/2 w-3 h-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-begena-gold border-2 border-begena-darkBrown dark:border-begena-cream"
              animate={isPressed ? { scale: [1, 1.5, 1] } : { scale: 1 }}
              transition={{ duration: 0.2 }}
            />
          )}
        </motion.div>
      </div>

      {/* Key label */}
      {active && (
        <motion.div
          className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-all ${
            isPressed
              ? "bg-begena-gold text-begena-darkBrown scale-110"
              : "bg-begena-brown/20 dark:bg-begena-cream/20 text-begena-gold"
          }`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onPress}
        >
          {keyBind === " " ? "SPACE" : keyBind.toUpperCase()}
        </motion.div>
      )}

      {/* Inactive string label */}
      {!active && (
        <div className="px-2 py-1 rounded text-xs text-begena-brown/40 dark:text-begena-cream/30">
          •
        </div>
      )}
    </div>
  );
}
