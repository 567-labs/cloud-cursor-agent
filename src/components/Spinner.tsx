/**
 * Spinner component
 * Animated loading spinner for terminal output
 */

import React, { useEffect, useState } from "react";
import { Text } from "ink";

interface SpinnerProps {
  /** Text to display after spinner */
  text?: string;
  /** Color of the spinner (default: gray) */
  color?: string;
}

const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

export function Spinner({ text = "Loading", color = "gray" }: SpinnerProps) {
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % SPINNER_FRAMES.length);
    }, 100); // Update every 100ms for smooth animation

    return () => clearInterval(interval);
  }, []);

  return (
    <Text color={color}>
      {SPINNER_FRAMES[frameIndex]} {text}...
    </Text>
  );
}
