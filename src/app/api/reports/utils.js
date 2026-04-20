export function parseDateRange(searchParams) {
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const timezoneOffset = 7; // WIB (UTC+7)

  let start, end;
  
  if (from) {
    // If from is YYYY-MM-DD, parsing it directly as Date can be impacted by local TZ
    // We force it to be treated as UTC midnight of that literal string date
    const datePart = from.includes('T') ? from.split('T')[0] : from;
    start = new Date(`${datePart}T00:00:00.000Z`);
  } else {
    const nowInJakarta = new Date(Date.now() + (timezoneOffset * 60 * 60 * 1000));
    start = new Date(nowInJakarta.toISOString().split('T')[0] + 'T00:00:00.000Z');
  }

  if (to) {
    const datePart = to.includes('T') ? to.split('T')[0] : to;
    end = new Date(`${datePart}T23:59:59.999Z`);
  } else {
    const nowInJakarta = new Date(Date.now() + (timezoneOffset * 60 * 60 * 1000));
    end = new Date(nowInJakarta.toISOString().split('T')[0] + 'T23:59:59.999Z');
  }

  return { start, end };
}

export function daysBetweenInclusive(start, end) {
  const a = new Date(start);
  a.setUTCHours(0, 0, 0, 0);
  const b = new Date(end);
  b.setUTCHours(0, 0, 0, 0);
  const diff = Math.max(0, b.getTime() - a.getTime());
  return Math.floor(diff / (24 * 60 * 60 * 1000)) + 1;
}

export function getDailyOverhead(fixedCosts) {
  return fixedCosts.reduce((acc, fc) => {
    if (!fc.is_active) return acc;
    if (fc.frequency === 'DAILY') return acc + fc.amount;
    if (fc.frequency === 'WEEKLY') return acc + fc.amount / 7;
    if (fc.frequency === 'MONTHLY') return acc + fc.amount / 30;
    return acc;
  }, 0);
}
