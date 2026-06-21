"use client";

import { motion } from "framer-motion";
import { useState } from "react";

interface BegenaVisualProps {
  stringNumbers: number[]; // All physical string numbers [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
  playableStrings: number[]; // Playable physical string numbers [1, 4, 6, 8, 10]
  pressedStrings: Set<number>; // Set of pressed physical string numbers
  onStringPress?: (stringNumber: number) => void;
}

/**
 * Authentic Ethiopian Orthodox Begena Visualization
 * Structure: Box at bottom, two vertical arms diverging in V-shape,
 * top horizontal bar at peak connecting arm tips, strings from top bar to box
 */
export default function BegenaVisual({
  stringNumbers,
  playableStrings,
  pressedStrings,
  onStringPress,
}: BegenaVisualProps) {
  const [hoveredString, setHoveredString] = useState<number | null>(null);

  // All 10 strings, but only 5 are playable
  const allStrings = stringNumbers; // [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
  
  // Calculate string positions on the top bar
  // All 10 strings evenly spaced across the top bar
  const getStringTopPosition = (stringNum: number) => {
    const index = allStrings.indexOf(stringNum);
    if (index === -1) return null;

    // Top bar spans from left arm tip to right arm tip
    // 10 strings evenly spaced
    const topBarLeft = 140; // Left tip of top bar
    const topBarRight = 660; // Right tip of top bar
    const topBarWidth = topBarRight - topBarLeft;
    const spacing = topBarWidth / 9; // 9 gaps between 10 strings
    
    const topX = topBarLeft + index * spacing;
    
    // Bottom attachment is narrower, centered on box
    const boxCenter = 400;
    const bottomBarWidth = 360; // Bottom bar width
    const bottomSpacing = bottomBarWidth / 9;
    const bottomX = boxCenter - bottomBarWidth/2 + index * bottomSpacing;
    
    return { topX, bottomX, index, isPlayable: playableStrings.includes(stringNum) };
  };

  return (
    <div className="relative w-full max-w-5xl mx-auto px-2 md:px-4">
      <svg
        viewBox="0 0 800 1000"
        className="w-full h-auto max-h-[58vh] md:max-h-[65vh]"
        xmlns="http://www.w3.org/2000/svg"
        style={{ filter: "drop-shadow(0 30px 60px rgba(0, 0, 0, 0.55))" }}
      >
        <defs>
          {/* Wood Grain Pattern */}
          <pattern
            id="woodGrain"
            patternUnits="userSpaceOnUse"
            width="200"
            height="200"
          >
            <rect width="200" height="200" fill="#6B4E37" />
            <path
              d="M0,100 Q50,90 100,100 T200,100 
                 M0,120 Q50,110 100,120 T200,120
                 M0,140 Q50,130 100,140 T200,140"
              stroke="#5A3E28"
              strokeWidth="2.5"
              fill="none"
              opacity="0.6"
            />
          </pattern>

          {/* Animal Hide/Parchment Texture for Soundbox */}
          <pattern
            id="hideTexture"
            patternUnits="userSpaceOnUse"
            width="120"
            height="120"
          >
            <rect width="120" height="120" fill="#D4C4A8" opacity="0.97" />
            <circle cx="30" cy="30" r="3.5" fill="#C4B498" opacity="0.45" />
            <circle cx="90" cy="50" r="3" fill="#C4B498" opacity="0.4" />
            <circle cx="60" cy="80" r="3.2" fill="#B4A488" opacity="0.4" />
            <circle cx="100" cy="90" r="2.5" fill="#B4A488" opacity="0.35" />
          </pattern>

          {/* Orthodox Cross Pattern */}
          <pattern
            id="crossPattern"
            patternUnits="userSpaceOnUse"
            width="90"
            height="90"
          >
            <rect width="90" height="90" fill="none" />
            <path
              d="M45,25 L45,65 M25,45 L65,45"
              stroke="#D4AF37"
              strokeWidth="4"
              fill="none"
              opacity="0.75"
            />
            <circle cx="45" cy="45" r="6" fill="#D4AF37" opacity="0.6" />
          </pattern>

          {/* Geometric Ethiopian Motif */}
          <pattern
            id="geometricMotif"
            patternUnits="userSpaceOnUse"
            width="120"
            height="120"
          >
            <rect width="120" height="120" fill="none" />
            <path
              d="M60,25 L70,55 L60,55 Z M60,95 L70,65 L60,65 Z"
              fill="#D4AF37"
              opacity="0.35"
            />
            <circle cx="60" cy="60" r="18" fill="none" stroke="#D4AF37" strokeWidth="2.5" opacity="0.3" />
          </pattern>

          {/* Deep Shadow Filter */}
          <filter id="deepShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="8" />
            <feOffset dx="6" dy="8" result="offsetblur" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.55" />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Gold Glow */}
          <filter id="goldGlow">
            <feGaussianBlur stdDeviation="8" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
            <feColorMatrix values="1 0.85 0 0 0.5
                                   0.85 0.65 0 0 0.4
                                   0 0 0 0 0
                                   0 0 0 1 0" />
          </filter>

          {/* String Glow */}
          <filter id="stringGlow">
            <feGaussianBlur stdDeviation="5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Gradient for Pillars/Arms */}
          <linearGradient id="pillarGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#5D4037" />
            <stop offset="30%" stopColor="#4A3728" />
            <stop offset="60%" stopColor="#3A2518" />
            <stop offset="100%" stopColor="#2A1510" />
          </linearGradient>

          {/* Gold/Brass Gradient */}
          <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F4D03F" />
            <stop offset="50%" stopColor="#D4AF37" />
            <stop offset="100%" stopColor="#B8941F" />
          </linearGradient>

          {/* 3D soundbox gradient (top-lit) */}
          <linearGradient id="soundbox3D" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#E6D9C1" />
            <stop offset="35%" stopColor="#D4C4A8" />
            <stop offset="75%" stopColor="#B59D79" />
            <stop offset="100%" stopColor="#8C6F4A" />
          </linearGradient>

          {/* Floor shadow under instrument */}
          <radialGradient id="floorShadow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(0,0,0,0.45)" />
            <stop offset="60%" stopColor="rgba(0,0,0,0.35)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </radialGradient>
        </defs>

        {/* Main Begena Structure */}
        <motion.g
          initial={{ opacity: 0, rotateX: 15, translateY: 40 }}
          animate={{ opacity: 1, rotateX: 0, translateY: 0 }}
          transition={{ duration: 1.1, ease: "easeOut" }}
        >
          {/* Floor / table shadow */}
          <ellipse
            cx="400"
            cy="930"
            rx="260"
            ry="70"
            fill="url(#floorShadow)"
            opacity="0.85"
          />
          {/* Sound Box - Rectangular base at bottom, with 3D lighting */}
          <motion.g
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: "easeOut" }}
          >
            {/* Main soundbox frame */}
            <rect
              x="100"
              y="800"
              width="600"
              height="180"
              rx="15"
              fill="url(#soundbox3D)"
              stroke="#4A3728"
              strokeWidth="10"
              filter="url(#deepShadow)"
            />
            {/* Subtle hide texture overlay */}
            <rect
              x="110"
              y="808"
              width="580"
              height="160"
              rx="12"
              fill="url(#hideTexture)"
              opacity="0.55"
            />

            {/* Inner frame detail */}
            <rect
              x="125"
              y="820"
              width="550"
              height="140"
              rx="12"
              fill="none"
              stroke="#6B5237"
              strokeWidth="5"
              opacity="0.7"
            />

            {/* Bottom bar on soundbox (where strings attach)
                Size: 360px wide x 14px tall (more realistic) */}
            <g>
              {/* Dark base for depth */}
              <rect
                x="218"
                y="962"
                width="364"
                height="16"
                rx="7"
                fill="#1C0F09"
                opacity="0.95"
                filter="url(#deepShadow)"
              />
              {/* Slightly raised bridge */}
              <rect
                x="222"
                y="958"
                width="356"
                height="14"
                rx="7"
                fill="#3A2518"
                stroke="#2A1510"
                strokeWidth="2.5"
              />
              {/* Top highlight edge */}
              <rect
                x="224"
                y="958"
                width="352"
                height="4"
                rx="2"
                fill="#6B5237"
                opacity="0.85"
              />
            </g>
          </motion.g>

          {/* Left Vertical Arm - Straight line diverging outward
              Size: 40px wide (stroke width), from box to top bar tip
              Starts at box edge, moves away (left), tip connects to top bar left tip */}
          <motion.line
            x1="220"
            y1="800"
            x2="140"
            y2="50"
            stroke="url(#pillarGradient)"
            strokeWidth="40"
            strokeLinecap="round"
            filter="url(#deepShadow)"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.3, delay: 0.3 }}
          />
          {/* Left arm highlight */}
          <line
            x1="225"
            y1="805"
            x2="145"
            y2="55"
            stroke="#6B5237"
            strokeWidth="12"
            strokeLinecap="round"
            opacity="0.8"
          />
          {/* Decorative rings on left arm */}
          <circle cx="185" cy="350" r="16" fill="#3A2518" opacity="0.9" />
          <circle cx="170" cy="200" r="14" fill="#3A2518" opacity="0.9" />

          {/* Right Vertical Arm - Straight line diverging outward
              Size: 40px wide (stroke width), from box to top bar tip
              Starts at box edge, moves away (right), tip connects to top bar right tip */}
          <motion.line
            x1="580"
            y1="800"
            x2="660"
            y2="50"
            stroke="url(#pillarGradient)"
            strokeWidth="40"
            strokeLinecap="round"
            filter="url(#deepShadow)"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.3, delay: 0.5 }}
          />
          {/* Right arm highlight */}
          <line
            x1="575"
            y1="805"
            x2="655"
            y2="55"
            stroke="#6B5237"
            strokeWidth="12"
            strokeLinecap="round"
            opacity="0.8"
          />
          {/* Decorative rings on right arm */}
          <circle cx="615" cy="350" r="16" fill="#3A2518" opacity="0.9" />
          <circle cx="630" cy="200" r="14" fill="#3A2518" opacity="0.9" />

          {/* Top Horizontal Bar - At the peak, connecting arm tips
              Size: 520px wide x 30px tall (more realistic width)
              Left tip at x=140, right tip at x=660 */}
          <motion.g
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 50 }}
            transition={{ duration: 0.9, delay: 0.6 }}
          >
            {/* Main crossbar */}
            <rect
              x="140"
              y="50"
              width="520"
              height="30"
              rx="15"
              fill="#5D4037"
              stroke="#4A3728"
              strokeWidth="6"
              filter="url(#deepShadow)"
            />
            
            {/* Decorative pattern overlay - Orthodox cross pattern */}
            <rect
              x="155"
              y="58"
              width="490"
              height="14"
              fill="url(#crossPattern)"
              opacity="0.85"
            />
            
            {/* Geometric motifs on left end */}
            <rect
              x="145"
              y="54"
              width="80"
              height="22"
              fill="url(#geometricMotif)"
              opacity="0.75"
            />
            {/* Geometric motifs on right end */}
            <rect
              x="575"
              y="54"
              width="80"
              height="22"
              fill="url(#geometricMotif)"
              opacity="0.75"
            />
            
            {/* Top bar highlight */}
            <rect
              x="150"
              y="50"
              width="500"
              height="10"
              rx="5"
              fill="#6B5237"
              opacity="0.9"
            />
            
            {/* Decorative finial on left end (connects to left arm tip) */}
            <path
              d="M 130 65 L 140 50 L 140 80 L 130 80 Z"
              fill="url(#goldGradient)"
              stroke="#B8941F"
              strokeWidth="3"
              filter="url(#goldGlow)"
            />
            <circle cx="135" cy="65" r="10" fill="#F4D03F" opacity="0.9" />
            
            {/* Decorative finial on right end (connects to right arm tip) */}
            <path
              d="M 670 65 L 660 50 L 660 80 L 670 80 Z"
              fill="url(#goldGradient)"
              stroke="#B8941F"
              strokeWidth="3"
              filter="url(#goldGlow)"
            />
            <circle cx="665" cy="65" r="10" fill="#F4D03F" opacity="0.9" />
            
            {/* Additional decorative elements on top bar */}
            {/* Small crosses on left half */}
            <g>
              <path
                d="M 250 58 L 250 72 M 240 65 L 260 65"
                stroke="#D4AF37"
                strokeWidth="2.5"
                fill="none"
                opacity="0.7"
              />
              <circle cx="250" cy="65" r="3.5" fill="#D4AF37" opacity="0.6" />
            </g>
            <g>
              <path
                d="M 320 58 L 320 72 M 310 65 L 330 65"
                stroke="#D4AF37"
                strokeWidth="2.5"
                fill="none"
                opacity="0.7"
              />
              <circle cx="320" cy="65" r="3.5" fill="#D4AF37" opacity="0.6" />
            </g>
            
            {/* Small crosses on right half */}
            <g>
              <path
                d="M 480 58 L 480 72 M 470 65 L 490 65"
                stroke="#D4AF37"
                strokeWidth="2.5"
                fill="none"
                opacity="0.7"
              />
              <circle cx="480" cy="65" r="3.5" fill="#D4AF37" opacity="0.6" />
            </g>
            <g>
              <path
                d="M 550 58 L 550 72 M 540 65 L 560 65"
                stroke="#D4AF37"
                strokeWidth="2.5"
                fill="none"
                opacity="0.7"
              />
              <circle cx="550" cy="65" r="3.5" fill="#D4AF37" opacity="0.6" />
            </g>
            
            {/* Center Orthodox cross ornament on top bar */}
            <g>
              {/* Vertical bar */}
              <rect
                x="395"
                y="40"
                width="10"
                height="10"
                rx="2"
                fill="url(#goldGradient)"
                stroke="#B8941F"
                strokeWidth="2"
                filter="url(#goldGlow)"
              />
              {/* Horizontal bar */}
              <rect
                x="385"
                y="45"
                width="30"
                height="10"
                rx="2"
                fill="url(#goldGradient)"
                stroke="#B8941F"
                strokeWidth="2"
                filter="url(#goldGlow)"
              />
              {/* Decorative circle */}
              <circle cx="400" cy="50" r="5" fill="#F4D03F" opacity="0.95" filter="url(#goldGlow)" />
            </g>
            
            {/* Decorative line patterns along the bar */}
            <line
              x1="200"
              y1="65"
              x2="600"
              y2="65"
              stroke="#D4AF37"
              strokeWidth="2"
              opacity="0.5"
            />
            <line
              x1="230"
              y1="70"
              x2="570"
              y2="70"
              stroke="#B8941F"
              strokeWidth="1.5"
              opacity="0.4"
            />
          </motion.g>

          {/* All 10 Strings - From top bar through center to box */}
          {allStrings.map((stringNum) => {
            const pos = getStringTopPosition(stringNum);
            if (!pos) return null;

            const isPressed = pressedStrings.has(stringNum);
            const isHovered = hoveredString === stringNum;
            const isPlayable = pos.isPlayable;
            const topX = pos.topX; // Already in viewBox coordinates
            const bottomX = pos.bottomX;

            // Get key label for playable strings
            const getKeyLabel = (strNum: number): string => {
              if (strNum === 1) return "Space";
              if (strNum === 4) return "F";
              if (strNum === 6) return "D";
              if (strNum === 8) return "S";
              if (strNum === 10) return "A";
              return "";
            };

            return (
              <g key={stringNum}>
                {/* String - from top bar (y=65 center), through center, to bottom bar (y=967) */}
                <motion.line
                  x1={topX}
                  y1="65"
                  x2={bottomX}
                  y2="967"
                  stroke={isPlayable ? "#D4AF37" : "#6B5237"}
                  strokeWidth={isPlayable ? "5" : "3"}
                  opacity={isPlayable ? (isPressed ? 1 : 0.95) : 0.4}
                  filter={isPlayable && isPressed ? "url(#goldGlow)" : isPlayable && isHovered ? "url(#stringGlow)" : "none"}
                  initial={false}
                  animate={
                    isPressed && isPlayable
                      ? {
                          x1: [topX, topX - 5, topX + 5, topX - 4, topX + 4, topX],
                          x2: [bottomX, bottomX - 5, bottomX + 5, bottomX - 4, bottomX + 4, bottomX],
                          opacity: [0.95, 1, 1, 0.98, 0.98, 0.95],
                        }
                      : {
                          x1: topX,
                          x2: bottomX,
                          opacity: isPlayable ? 0.95 : 0.4,
                        }
                  }
                  transition={{
                    duration: 0.6,
                    ease: "easeOut",
                  }}
                  style={{ cursor: isPlayable ? "pointer" : "default" }}
                  onClick={() => isPlayable && onStringPress?.(stringNum)}
                  onMouseEnter={() => isPlayable && setHoveredString(stringNum)}
                  onMouseLeave={() => setHoveredString(null)}
                />

                {/* U-shaped Leather Buzz Thong at bridge on box (only for playable strings) */}
                {isPlayable && (
                  <motion.g
                    initial={false}
                    animate={
                      isPressed
                        ? {
                            scale: [1, 1.6, 1.3, 1],
                            opacity: [0.9, 1, 0.96, 0.9],
                          }
                        : {
                            scale: 1,
                            opacity: 0.9,
                          }
                    }
                    transition={{ duration: 0.4, ease: "easeOut" }}
                  >
                    {/* U-shaped leather piece */}
                    <path
                      d={`M ${bottomX - 8} 967 
                          Q ${bottomX} 952 ${bottomX + 8} 967
                          Q ${bottomX} 982 ${bottomX - 8} 967`}
                      fill="#2A1510"
                      stroke="#1A0A00"
                      strokeWidth="2.5"
                      opacity="0.95"
                    />
                    {/* Inner highlight */}
                    <path
                      d={`M ${bottomX - 6} 967 
                          Q ${bottomX} 955 ${bottomX + 6} 967`}
                      fill="#3A2518"
                      opacity="0.7"
                    />
                    {/* Buzz vibration indicators */}
                    {isPressed && (
                      <>
                        <circle
                          cx={bottomX - 7}
                          cy={965}
                          r="3"
                          fill="#D4AF37"
                          opacity="0.98"
                        >
                          <animate
                            attributeName="opacity"
                            values="0.98;1;0.75;0.98"
                            dur="0.04s"
                            repeatCount="30"
                          />
                        </circle>
                        <circle
                          cx={bottomX + 7}
                          cy={965}
                          r="3"
                          fill="#D4AF37"
                          opacity="0.98"
                        >
                          <animate
                            attributeName="opacity"
                            values="0.98;1;0.75;0.98"
                            dur="0.04s"
                            repeatCount="30"
                          />
                        </circle>
                      </>
                    )}
                  </motion.g>
                )}

                {/* String anchor on top bar */}
                <circle
                  cx={topX}
                  cy="65"
                  r={isPlayable ? (isPressed ? 8 : 7) : 5}
                  fill={isPlayable ? (isPressed ? "#D4AF37" : "#6B5237") : "#4A3728"}
                  stroke={isPlayable ? (isPressed ? "#F4CF57" : "#4A3728") : "#3A2518"}
                  strokeWidth={isPlayable ? (isPressed ? 3.5 : 3) : 2}
                  opacity={isPlayable ? (isPressed ? 1 : 0.9) : 0.5}
                  filter={isPlayable && isPressed ? "url(#goldGlow)" : "none"}
                />
                
                {/* String anchor on bottom bar */}
                <circle
                  cx={bottomX}
                  cy="967"
                  r={isPlayable ? (isPressed ? 6 : 5) : 4}
                  fill={isPlayable ? (isPressed ? "#D4AF37" : "#6B5237") : "#4A3728"}
                  stroke={isPlayable ? (isPressed ? "#F4CF57" : "#4A3728") : "#3A2518"}
                  strokeWidth={isPlayable ? (isPressed ? 2.5 : 2) : 1.5}
                  opacity={isPlayable ? (isPressed ? 1 : 0.9) : 0.5}
                  filter={isPlayable && isPressed ? "url(#goldGlow)" : "none"}
                />

                {/* String number label above top bar */}
                <text
                  x={topX}
                  y="35"
                  fontSize={isPlayable ? "20" : "16"}
                  fill={isPlayable ? "#D4AF37" : "#6B5237"}
                  textAnchor="middle"
                  fontWeight={isPlayable ? (isPressed ? "bold" : "700") : "500"}
                  fontFamily="serif"
                  opacity={isPlayable ? 1 : 0.6}
                  filter={isPlayable && isPressed ? "url(#goldGlow)" : "none"}
                >
                  {stringNum}
                </text>

                {/* Key label for playable strings */}
                {isPlayable && (
                  <text
                    x={topX}
                    y="25"
                    fontSize="14"
                    fill="#D4AF37"
                    textAnchor="middle"
                    fontWeight="600"
                    fontFamily="mono"
                    opacity={isPressed ? 1 : 0.8}
                    filter={isPressed ? "url(#goldGlow)" : "none"}
                  >
                    {getKeyLabel(stringNum)}
                  </text>
                )}
              </g>
            );
          })}

          {/* Resonance glow on soundbox when string is played */}
          {pressedStrings.size > 0 && (
            <motion.rect
              x="100"
              y="800"
              width="600"
              height="180"
              rx="15"
              fill="none"
              stroke="#D4AF37"
              strokeWidth="6"
              opacity={0}
              animate={{
                opacity: [0, 0.7, 0.5, 0],
                scale: [1, 1.025, 1],
              }}
              transition={{
                duration: 0.8,
                ease: "easeOut",
              }}
            />
          )}
        </motion.g>
      </svg>

      {/* Enhanced Key labels / touch controls below */}
      <div className="flex flex-wrap justify-center gap-3 md:gap-4 mt-6 md:mt-8 px-2">
        {playableStrings.map((stringNum) => {
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
          const isPressed = pressedStrings.has(stringNum);
          
          // Sound order labels
          const soundOrderLabel =
            stringNum === 4
              ? "String 2 (Lowest)"
              : stringNum === 6
              ? "String 3"
              : stringNum === 1
              ? "String 1"
              : stringNum === 10
              ? "String 5"
              : stringNum === 8
              ? "String 4 (Highest)"
              : `String ${stringNum}`;

          const handleTap = () => {
            onStringPress?.(stringNum);
          };

          return (
            <motion.div
              key={stringNum}
              role="button"
              tabIndex={0}
              aria-label={`Play ${soundOrderLabel} (${keyLabel})`}
              onClick={handleTap}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  handleTap();
                }
              }}
              className={`text-center px-4 md:px-5 py-3 md:py-3.5 rounded-xl transition-all border-2 ${
                isPressed
                  ? "bg-gradient-to-br from-begena-gold to-yellow-600 text-begena-darkBrown scale-110 border-begena-gold shadow-xl"
                  : "bg-gradient-to-br from-begena-brown/25 to-begena-brown/15 dark:from-begena-cream/25 dark:to-begena-cream/15 text-begena-gold border-begena-gold/50 hover:border-begena-gold/80 shadow-lg hover:shadow-xl"
              }`}
              whileHover={{ scale: 1.08, y: -2 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="text-xs md:text-sm opacity-80 mb-1 font-semibold">{soundOrderLabel}</div>
              <div className="font-mono font-bold text-lg md:text-xl">{keyLabel}</div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
