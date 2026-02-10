export interface Contest {
  name: string;
  start_time: string; // ISO 8601 string
  url: string;
  platform: string;
}

// [新增]
export interface UserStats {
  platform: string;
  handle: string;
  solved_count: number;
  rank?: string;
  rating?: number;
}