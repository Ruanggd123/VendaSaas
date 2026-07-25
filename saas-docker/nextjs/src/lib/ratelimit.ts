const rateMap = new Map<string, { count: number; resetAt: number }>();

const WINDOW_MS = 60_000; // 1 minuto

export function rateLimit(key: string, maxRequests: number = 10): boolean {
  const now = Date.now();
  const entry = rateMap.get(key);

  if (!entry || now > entry.resetAt) {
    rateMap.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }

  if (entry.count >= maxRequests) {
    return false;
  }

  entry.count++;
  return true;
}

if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    rateMap.forEach((entry, key) => {
      if (now > entry.resetAt) {
        rateMap.delete(key);
      }
    });
  }, 60_000).unref?.();
}
