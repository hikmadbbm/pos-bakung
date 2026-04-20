import { prisma } from './prisma';

/**
 * Checks if the store is operational at the given time.
 * @param {Date} date - Time to check
 * @returns {Promise<{isOpen: boolean, reason: string}>}
 */
export async function getStoreStatus(date = new Date()) {
  const config = await prisma.storeConfig.findFirst();
  if (!config) return { isOpen: true, reason: 'Config not found' };

  // 1. Manual Toggle
  if (!config.is_open) {
    return { isOpen: false, reason: 'Manual Closure' };
  }

  // Timezone adjustment (WIB = UTC+7)
  const timezoneOffset = 7;
  const localDate = new Date(date.getTime() + (timezoneOffset * 60 * 60 * 1000));
  const dateStr = localDate.toISOString().split('T')[0];
  const dayOfWeek = localDate.getUTCDay(); // 0=Sun, 1=Mon...
  const timeStr = localDate.getUTCHours().toString().padStart(2, '0') + ':' + localDate.getUTCMinutes().toString().padStart(2, '0');

  // 2. Special Closures (Supports single date or range)
  const closures = config.special_closures || [];
  const activeClosure = closures.find(c => {
    if (c.startDate && c.endDate) {
      return dateStr >= c.startDate && dateStr <= c.endDate;
    }
    return c.date === dateStr;
  });

  if (activeClosure) {
    return { isOpen: false, reason: activeClosure.note || 'Holiday/Special Closure' };
  }

  // 3. Regular Business Hours
  const bhours = config.business_hours || {};
  const todayHours = bhours[dayOfWeek.toString()];

  if (!todayHours || todayHours.closed) {
    return { isOpen: false, reason: 'Scheduled Closure (Day)' };
  }

  if (todayHours.open && todayHours.close) {
    if (timeStr < todayHours.open || timeStr > todayHours.close) {
      return { isOpen: false, reason: 'Outside Business Hours' };
    }
  }

  return { isOpen: true, reason: 'Operational' };
}

/**
 * Checks if the store was open at any point during a specific day.
 * Used for Consignment calculation.
 */
export async function wasStoreOpenOnDay(date = new Date()) {
  const config = await prisma.storeConfig.findFirst();
  if (!config) return true;
  if (!config.is_open) return false;

  const timezoneOffset = 7;
  const d = new Date(date.getTime() + (timezoneOffset * 60 * 60 * 1000));
  const dateStr = d.toISOString().split('T')[0];
  const dayOfWeek = d.getUTCDay();

  // Special Closure check (Supports single date or range)
  const closures = config.special_closures || [];
  const isSpecialClosed = closures.some(c => {
    if (c.startDate && c.endDate) {
      return dateStr >= c.startDate && dateStr <= c.endDate;
    }
    return c.date === dateStr;
  });
  if (isSpecialClosed) return false;

  // Regular Hours check
  const bhours = config.business_hours || {};
  const dayConfig = bhours[dayOfWeek.toString()];
  if (!dayConfig || dayConfig.closed) return false;

  return true;
}
