export const ANON_DAILY_LIMIT = 2;
export const GOOGLE_DAILY_LIMIT = 5;
const STORAGE_KEY = 'videoGenerationUsage';

interface UsageData {
  date: string;
  count: number;
}

const loadData = (): UsageData => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as UsageData;
  } catch {
    // ignore parse errors
  }
  return { date: new Date().toDateString(), count: 0 };
};

export const getRemainingGenerations = (loggedIn: boolean): number => {
  const limit = loggedIn ? GOOGLE_DAILY_LIMIT : ANON_DAILY_LIMIT;
  const data = loadData();
  const today = new Date().toDateString();
  if (data.date !== today) return limit;
  return Math.max(0, limit - data.count);
};

export const recordGeneration = (): void => {
  const today = new Date().toDateString();
  const data = loadData();
  if (data.date !== today) {
    data.date = today;
    data.count = 0;
  }
  data.count += 1;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore storage errors
  }
};
