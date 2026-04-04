/**
 * Utility for preprocessing images for ESC/POS Thermal Printers.
 * Optimized for 58mm printers (384 dots width).
 */

/**
 * Loads a File or Blob into an HTMLImageElement.
 * @param {File|Blob} file 
 * @returns {Promise<HTMLImageElement>}
 */
const loadImage = (file) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      resolve(img);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
};

/**
 * Preprocesses an image for ESC/POS "GS v 0" (Raster Bit Image) printing.
 * @param {File|Blob} file The source image file.
 * @param {number} threshold Black/White threshold (0-255). Default is 128.
 * @returns {Promise<Uint8Array>} ESC/POS ready binary data.
 */
export const processLogo = async (file, threshold = 128) => {
  const img = await loadImage(file);
  
  // 58mm printer width standard is 384 dots
  const targetWidth = 384;
  const targetHeight = Math.floor((img.height / img.width) * targetWidth);
  
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  
  // Fill background with white (removes transparency)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, targetWidth, targetHeight);
  
  // Draw and resize image
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
  
  const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
  const { data } = imageData;
  
  // Calculate GS v 0 parameters
  // xL, xH: Number of bytes in horizontal direction (width / 8)
  const xBytes = targetWidth / 8;
  const xL = xBytes % 256;
  const xH = Math.floor(xBytes / 256);
  
  // yL, yH: Number of dots in vertical direction (height)
  const yL = targetHeight % 256;
  const yH = Math.floor(targetHeight / 256);
  
  // GS v 0 Command Header: [GS, v, 0, m, xL, xH, yL, yH]
  const header = new Uint8Array([0x1D, 0x76, 0x30, 0x00, xL, xH, yL, yH]);
  const pixelData = new Uint8Array(xBytes * targetHeight);
  
  let byteIndex = 0;
  for (let y = 0; y < targetHeight; y++) {
    for (let x = 0; x < xBytes; x++) {
      let byte = 0;
      for (let bit = 0; bit < 8; bit++) {
        const pixelX = x * 8 + bit;
        const rgbaIndex = (y * targetWidth + pixelX) * 4;
        
        const r = data[rgbaIndex];
        const g = data[rgbaIndex + 1];
        const b = data[rgbaIndex + 2];
        const a = data[rgbaIndex + 3];
        
        // Grayscale conversion (0.299R + 0.587G + 0.114B)
        // If alpha is low, treat as white (0)
        let intensity = 255;
        if (a > 127) {
          intensity = 0.299 * r + 0.587 * g + 0.114 * b;
        }
        
        // Thresholding: 1 = Black, 0 = White
        if (intensity < threshold) {
          byte |= (1 << (7 - bit));
        }
      }
      pixelData[byteIndex++] = byte;
    }
  }
  
  // Combine header and pixel data
  const result = new Uint8Array(header.length + pixelData.length);
  result.set(header);
  result.set(pixelData, header.length);
  
  return result;
};
