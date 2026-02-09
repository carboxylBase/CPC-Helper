export interface Contest {
  name: string;
  start_time: string; // ISO 8601 string
  url: string;
  platform: string;
}

export type PlatformType = 'Codeforces' | 'AtCoder' | 'NowCoder' | 'LeetCode';