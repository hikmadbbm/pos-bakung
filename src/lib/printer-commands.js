/**
 * ESC/POS Command Utility for 58mm Thermal Printers
 * Optimized for ~32 characters per line width.
 */
export const ESC_POS = {
  // Commands
  INIT: '\x1B\x40',
  FEED_PAPER: (lines) => `\x1B\x64${String.fromCharCode(lines)}`,
  ALIGN_LEFT: '\x1B\x61\x00',
  ALIGN_CENTER: '\x1B\x61\x01',
  ALIGN_RIGHT: '\x1B\x61\x02',
  BOLD_ON: '\x1B\x45\x01',
  BOLD_Off: '\x1B\x45\x00',
  DOUBLE_HEIGHT_ON: '\x1B\x21\x10',
  DOUBLE_WIDTH_ON: '\x1B\x21\x20',
  DOUBLE_SIZE_ON: '\x1B\x21\x30',
  RESET_SIZE: '\x1B\x21\x00',
  
  // Helpers
  LINE_WIDTH: 32,
  
  separator: () => "-".repeat(32) + "\n",
  
  formatTwoColumns: (left, right) => {
    const leftWidth = 20;
    const rightWidth = 12;
    const truncatedLeft = left.substring(0, leftWidth - 1).padEnd(leftWidth);
    const formattedRight = right.toString().substring(0, rightWidth).padStart(rightWidth);
    return truncatedLeft + formattedRight + "\n";
  },
  
  centerText: (text) => {
    const padding = Math.max(0, Math.floor((32 - text.length) / 2));
    return " ".repeat(padding) + text + "\n";
  }
};
