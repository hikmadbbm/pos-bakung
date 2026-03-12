/**
 * Simple in-memory cache for API responses.
 * Provides basic TTL (Time To Live) support.
 */

const cacheStore = new Map();

/**
 * Get item from cache if it exists and hasn't expired.
 * @param {string} key 
 * @returns {any|null}
 */
export function getCache(key) {
  const item = cacheStore.get(key);
  if (!item) return null;

  if (Date.now() > item.expiry) {
    cacheStore.delete(key);
    return null;
  }

  return item.value;
}

/**
 * Set item in cache with a TTL.
 * @param {string} key 
 * @param {any} value 
 * @param {number} ttlSeconds 
 */
export function setCache(key, value, ttlSeconds = 60) {
  const expiry = Date.now() + (ttlSeconds * 1000);
  cacheStore.set(key, { value, expiry });
}

/**
 * Remove specific item from cache.
 * @param {string} key 
 */
export function invalidateCache(key) {
  cacheStore.delete(key);
}

/**
 * Clear all cache items. Useful for debugging or major system changes.
 */
export function flushCache() {
  cacheStore.clear();
}
