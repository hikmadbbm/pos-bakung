/**
 * CRC16 CCITT (0x1021) implementation
 * Polynomial: 0x1021, Initial: 0xFFFF, Final XOR: 0x0000
 */
export function crc16(data) {
  let crc = 0xFFFF;
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc <<= 1;
      }
    }
  }
  return (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, "0");
}

/**
 * Parses EMV QRIS string into a Map of Tags
 */
export function parseQRIS(qrisData) {
  const tags = new Map();
  let offset = 0;
  
  try {
    while (offset < qrisData.length) {
      const tag = qrisData.substring(offset, offset + 2);
      const length = parseInt(qrisData.substring(offset + 2, offset + 4));
      const value = qrisData.substring(offset + 4, offset + 4 + length);
      
      if (isNaN(length)) break;
      
      tags.set(tag, value);
      offset += 4 + length;
    }
  } catch (e) {
    console.error("Error parsing QRIS data:", e);
  }
  
  return tags;
}

/**
 * Packs a Map of Tags back into a QRIS string
 */
export function packQRIS(tags) {
  let result = "";
  // The tags should be sorted by key (00 to 63)
  const sortedKeys = Array.from(tags.keys()).sort();
  
  for (const key of sortedKeys) {
    if (key === "63") continue; // We'll add CRC last
    const value = tags.get(key);
    const length = value.length.toString().padStart(2, "0");
    result += key + length + value;
  }
  
  // Tag 63 is special
  result += "6304";
  return result + crc16(result);
}

/**
 * Parses EMV QRIS and injects/updates Tag 54 (Amount)
 * @param {string} qrisData Original QRIS string
 * @param {number} amount Amount to inject
 * @returns {string} Dynamic QRIS string
 */
export function generateDynamicQRIS(qrisData, amount) {
  if (!qrisData) return "";

  try {
    const tags = parseQRIS(qrisData);
    
    // Set Transaction Amount (Tag 54)
    tags.set("54", amount.toString());
    
    // Set Point of Initiation Method to 12 (Dynamic)
    // Tag 01: 11 is Static, 12 is Dynamic
    tags.set("01", "12");

    return packQRIS(tags);
  } catch (e) {
    console.error("Error generating dynamic QRIS:", e);
    return qrisData; // Fallback to original
  }
}
