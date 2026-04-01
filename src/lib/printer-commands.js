/**
 * ESC/POS Command Utility for Thermal Printers
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
  ITALIC_ON: '\x1B\x34',
  ITALIC_OFF: '\x1B\x35',
  DOUBLE_HEIGHT_ON: '\x1B\x21\x10',
  DOUBLE_WIDTH_ON: '\x1B\x21\x20',
  DOUBLE_SIZE_ON: '\x1B\x21\x30',
  RESET_SIZE: '\x1B\x21\x00',
  LINE_SPACING_DEFAULT: '\x1B\x32',
  
  // Helpers
  separator: (width = 31) => "-".repeat(width) + "\n",
  
  formatTwoColumns: (left, right, width = 31) => {
    // Determine how much space the right side needs
    const rightStr = right.toString();
    const rightLen = rightStr.length;
    const availableLeft = width - rightLen - 1; // 1 space gap
    
    if (left.length <= availableLeft) {
      return left.padEnd(availableLeft) + " " + rightStr + "\n";
    } else {
      // If left text is too long, wrap it? 
      // For now, truncate for the receipt line, but in 3-line mode it's okay because the item name has its own line.
      return left.substring(0, availableLeft).padEnd(availableLeft) + " " + rightStr + "\n";
    }
  },
  
  centerText: (text, width = 32) => {
    const padding = Math.max(0, Math.floor((width - text.length) / 2));
    return " ".repeat(padding) + text + "\n";
  }
};
