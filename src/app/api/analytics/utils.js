export function dayKey(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export function dayRangeUtc(dateStr) {
  const start = dayKey(dateStr);
  if (!start) return null;
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
  return { start, end };
}

