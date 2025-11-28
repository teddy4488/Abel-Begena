"use client";

import { motion } from "framer-motion";

interface HandAnimationProps {
  pressedFinger: number | null;
}

/**
 * Hand Animation Component
 * Visual representation of left hand with finger highlighting
 * Finger mapping: 0=Little, 1=Ring, 2=Middle, 3=Index, 4=Thumb
 */
export default function HandAnimation({ pressedFinger }: HandAnimationProps) {
  const fingers = [
    { name: "Little", key: "A", color: "#D4AF37" },
    { name: "Ring", key: "S", color: "#D4AF37" },
    { name: "Middle", key: "D", color: "#D4AF37" },
    { name: "Index", key: "F", color: "#D4AF37" },
    { name: "Thumb", key: "Space", color: "#D4AF37" },
  ];

  return (
    <div className="flex flex-col items-center gap-4">
      <h3 className="text-lg font-semibold text-begena-gold mb-2">
        Left Hand Position
      </h3>
      <div className="relative">
        {/* Palm */}
        <motion.div
          className="w-32 h-20 bg-begena-brown/30 dark:bg-begena-cream/20 rounded-lg"
          animate={
            pressedFinger !== null
              ? { scale: [1, 1.02, 1] }
              : { scale: 1 }
          }
          transition={{ duration: 0.2 }}
        />

        {/* Fingers */}
        <div className="absolute -top-24 left-0 right-0 flex justify-around px-2">
          {fingers.map((finger, index) => {
            const isPressed = pressedFinger === index;
            return (
              <motion.div
                key={index}
                className="relative"
                initial={false}
                animate={
                  isPressed
                    ? {
                        scale: [1, 1.2, 1.1],
                        y: [0, -5, 0],
                      }
                    : { scale: 1, y: 0 }
                }
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                {/* Finger */}
                <div
                  className={`w-3 h-16 rounded-full ${
                    isPressed
                      ? "bg-begena-gold"
                      : "bg-begena-brown/40 dark:bg-begena-cream/40"
                  } transition-colors duration-200`}
                  style={
                    isPressed
                      ? {
                          boxShadow: `0 0 20px ${finger.color}, 0 0 40px ${finger.color}`,
                          filter: "brightness(1.3)",
                        }
                      : {}
                  }
                />
                {/* Finger tip */}
                {isPressed && (
                  <motion.div
                    className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-begena-gold"
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0 }}
                  />
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Key labels */}
        <div className="absolute -bottom-8 left-0 right-0 flex justify-around px-2 text-xs">
          {fingers.map((finger, index) => (
            <div
              key={index}
              className={`px-1.5 py-0.5 rounded ${
                pressedFinger === index
                  ? "bg-begena-gold text-begena-darkBrown font-bold"
                  : "text-begena-brown/60 dark:text-begena-cream/60"
              } transition-all duration-200`}
            >
              {finger.key === "Space" ? "⌨" : finger.key}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
