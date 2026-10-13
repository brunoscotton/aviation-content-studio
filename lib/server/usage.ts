const calls = new Map<string, { count: number; started: number }>();
const idempotency = new Map<string, number>();

export function checkUsage(userId: string, operation: "research" | "script") {
  const now = Date.now(); const key = `${userId}:${operation}`; const window = 24 * 60 * 60 * 1000;
  const current = calls.get(key);
  if (!current || now - current.started > window) calls.set(key, { count: 1, started: now });
  else if (current.count >= (operation === "research" ? 10 : 20)) return false;
  else current.count += 1;
  return true;
}

export function isDuplicate(userId: string, key: string) {
  const now = Date.now();
  for (const [storedKey, expires] of idempotency) if (expires < now) idempotency.delete(storedKey);
  const compound = `${userId}:${key}`;
  if (idempotency.has(compound)) return true;
  idempotency.set(compound, now + 10 * 60_000);
  return false;
}
