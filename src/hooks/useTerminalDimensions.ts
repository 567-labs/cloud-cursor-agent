/**
 * Terminal dimensions hook
 *
 * Provides real-time terminal width and height tracking with resize handling.
 * This hook listens to terminal resize events and updates dimensions accordingly.
 *
 * @module hooks/useTerminalDimensions
 */

import { useEffect, useState } from "react";
import { useStdout } from "ink";

/**
 * Returns the current terminal dimensions and updates them on resize.
 *
 * Uses Ink's useStdout hook to listen for resize events. Falls back to
 * process.stdout if useStdout is not available.
 *
 * @returns Object containing terminalWidth and terminalHeight
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { terminalWidth, terminalHeight } = useTerminalDimensions();
 *
 *   return (
 *     <Box width={terminalWidth}>
 *       <Text>Width: {terminalWidth}, Height: {terminalHeight}</Text>
 *     </Box>
 *   );
 * }
 * ```
 */
export function useTerminalDimensions(): {
  terminalWidth: number;
  terminalHeight: number;
} {
  const { stdout } = useStdout();
  const [terminalWidth, setTerminalWidth] = useState<number>(
    stdout?.columns || process.stdout.columns || 80
  );
  const [terminalHeight, setTerminalHeight] = useState<number>(
    stdout?.rows || process.stdout.rows || 24
  );

  useEffect(() => {
    const handleResize = () => {
      const newWidth = stdout?.columns || process.stdout.columns || 80;
      const newHeight = stdout?.rows || process.stdout.rows || 24;
      setTerminalWidth(newWidth);
      setTerminalHeight(newHeight);
    };

    // Initial sync
    handleResize();

    // Listen to resize events on stdout
    if (stdout) {
      stdout.on("resize", handleResize);
      return () => {
        stdout.off("resize", handleResize);
      };
    }

    // Fallback to process.stdout if stdout is not available
    process.stdout.on("resize", handleResize);
    return () => {
      process.stdout.off("resize", handleResize);
    };
  }, [stdout]);

  return { terminalWidth, terminalHeight };
}
