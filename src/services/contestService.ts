import { invoke } from '@tauri-apps/api/core';
import { Contest, UserStats } from '../types';

export const fetchAllContests = async (): Promise<Contest[]> => {
  return await invoke('fetch_all_contests');
};

export const fetchUserStats = async (platform: string, handle: string): Promise<UserStats> => {
  // [Debug 1] 打印调用信息
  console.log(`%c[Frontend Debug] 准备查询: ${platform} - ${handle}`, "color: #00ff00; font-weight: bold;");

  let cookie: string | null = null;

  if (platform.toLowerCase() === 'nowcoder') {
    cookie = localStorage.getItem('nowcoder_cookie');
    
    // [Debug 2] 打印 Cookie 读取状态
    if (cookie) {
        console.log(`%c[Frontend Debug] 读取到 Cookie (长度: ${cookie.length})`, "color: #00ff00;");
        console.log(`[Frontend Debug] Cookie 前20字符: ${cookie.substring(0, 20)}...`);
    } else {
        console.error(`[Frontend Debug] ❌ 未找到 Cookie! LocalStorage 为空。`);
        throw new Error("请先在设置页配置 Cookie");
    }
    
    if (!cookie || !cookie.trim()) {
       throw new Error("Cookie 为空，请检查设置");
    }
  }

  // [Debug 3] 准备调用 Rust
  console.log(`[Frontend Debug] 正在调用 Tauri invoke('fetch_user_stats')...`);
  
  try {
      const result = await invoke<UserStats>('fetch_user_stats', { 
        platform, 
        handle, 
        cookie 
      });
      console.log(`[Frontend Debug] ✅ Rust 返回成功:`, result);
      return result;
  } catch (e) {
      console.error(`[Frontend Debug] ❌ Rust 调用失败:`, e);
      throw e;
  }
};