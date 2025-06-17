export interface UsageInfo {
  date: string;
  count: number;
}

const STORAGE_KEY = 'videoGenUsage';

const today = () => new Date().toISOString().slice(0, 10);

export const getUsageInfo = (): UsageInfo => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as UsageInfo;
      if (parsed.date === today()) return parsed;
    } catch {
      /* ignore */
    }
  }
  return { date: today(), count: 0 };
};

export const incrementUsage = () => {
  const info = getUsageInfo();
  const updated = { date: today(), count: info.count + 1 };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
};

export const remainingQuota = (limit: number) => {
  const info = getUsageInfo();
  if (info.date !== today()) return limit;
  return Math.max(0, limit - info.count);
};
