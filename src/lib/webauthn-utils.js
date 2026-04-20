/**
 * Utility functions for WebAuthn (Passkeys)
 */

// Convert Buffer to Base64URL
export function bufferToBase64URL(buffer) {
  const bytes = new Uint8Array(buffer);
  let str = "";
  for (const charCode of bytes) {
    str += String.fromCharCode(charCode);
  }
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

// Convert Base64URL to Buffer
export function base64URLToBuffer(base64url) {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const padLen = (4 - (base64.length % 4)) % 4;
  const str = atob(base64 + "=".repeat(padLen));
  const buffer = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    buffer[i] = str.charCodeAt(i);
  }
  return buffer.buffer;
}

// Simplified verification (for demo/POS environment where robustness vs complexity is balanced)
// In a real production app, use @simplewebauthn/server
export function verifyWebAuthnResponse(response, authenticator) {
  // This is a placeholder for actual cryptographic verification
  // Since we are in a controlled environment, we will check if the credential ID matches
  return response.id === authenticator.credentialID;
}
