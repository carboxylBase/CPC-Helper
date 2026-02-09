import { invoke } from '@tauri-apps/api/core'; // 注意：Tauri v2 使用 core
import { Contest } from '../types';

export const fetchAllContests = async (): Promise<Contest[]> => {
  try {
    // 调用 Rust 后端的命令
    return await invoke<Contest[]>('fetch_all_contests');
  } catch (error) {
    console.error('Failed to fetch contests:', error);
    throw error;
  }
};