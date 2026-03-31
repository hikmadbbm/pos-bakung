// Simple memory-based rate limiter
// For production with multiple instances, use Redis or similar.
const rates = new Map();

export function checkRateLimit(userId) {
  const now = Date.now();
  const windowMs = 10 * 60 * 1000; // 10 minutes
  const limit = 5;

  if (!rates.has(userId)) {
    rates.set(userId, []);
  }

  const userRates = rates.get(userId).filter(timestamp => now - timestamp < windowMs);
  
  if (userRates.length >= limit) {
    return false;
  }

  userRates.push(now);
  rates.set(userId, userRates);
  return true;
}
