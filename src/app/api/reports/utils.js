export function parseDateRange(searchParams) {
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  let start, end;
  
  if (from) {
    start = new Date(from);
    start.setHours(0, 0, 0, 0);
  } else {
    start = new Date();
    start.setHours(0, 0, 0, 0);
  }

  if (to) {
    end = new Date(to);
    end.setHours(23, 59, 59, 999);
  } else {
    end = new Date();
    end.setHours(23, 59, 59, 999);
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

