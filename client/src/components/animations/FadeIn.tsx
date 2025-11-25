"use client";

import { motion, type MotionProps } from "framer-motion";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

type FadeInProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: keyof HTMLElementTagNameMap;
} & MotionProps;

export default function FadeIn({
  children,
  className,
  delay = 0,
  ...props
}: FadeInProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.8, ease: "easeOut", delay }}
      className={cn(className)}
      {...props}
    >
      {children}
    </motion.div>
  );
}

