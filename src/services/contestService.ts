import { invoke } from '@tauri-apps/api/core';
import { Contest, UserStats } from '../types';

export const fetchAllContests = async (): Promise<Contest[]> => {
  return await invoke('fetch_all_contests');
};

// [新增]
export const fetchUserStats = async (platform: string, handle: string): Promise<UserStats> => {
  return await invoke('fetch_user_stats', { platform, handle });
};