import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { UserStats } from '../types';
import { fetchUserStats } from '../services/contestService';
import { getPlatformColor, getRatingColor } from '../utils';
import { SearchIcon } from './Icons';

// --- OJ 跳转配置 (已修正代码源与牛客链接) ---
const OJ_LINKS: Record<string, { home: string; profile: string }> = {
  codeforces: { home: 'https://codeforces.com', profile: 'https://codeforces.com/profile/' },
  leetcode: { home: 'https://leetcode.cn', profile: 'https://leetcode.cn/u/' },
  atcoder: { home: 'https://atcoder.jp', profile: 'https://atcoder.jp/users/' },
  nowcoder: { 
    home: 'https://ac.nowcoder.com/acm/home', 
    profile: 'https://ac.nowcoder.com/acm/contest/profile/' 
  },
  luogu: { home: 'https://www.luogu.com.cn', profile: 'https://www.luogu.com.cn/user/' },
  daimayuan: { 
    home: 'https://bs.daimayuan.top', 
    profile: 'https://bs.daimayuan.top/user/' 
  },
  hdu: { home: 'https://acm.hdu.edu.cn', profile: 'https://acm.hdu.edu.cn/userstatus.php?user=' },
};

interface PlatformCardProps {
  platformName: string;
  platformKey: string;
  cardStyle: any;
  isEnabled?: boolean;
  onStatsUpdate?: (platformKey: string, solvedCount: number) => void;
}

export interface PlatformCardRef {
  triggerSearch: () => Promise<void>;
}

const PlatformCard = forwardRef<PlatformCardRef, PlatformCardProps>(
  ({ platformName, platformKey, cardStyle, isEnabled = false, onStatsUpdate }, ref) => {
    const [handle, setHandle] = useState('');
    const [stats, setStats] = useState<UserStats | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
      const saved = localStorage.getItem(`cpc_handle_${platformKey}`);
      if (saved) setHandle(saved);
    }, [platformKey]);

    const handleSearch = async () => {
      if (!isEnabled || !handle.trim()) return;
      
      setLoading(true);
      setError(null);
      setStats(null);
      if (onStatsUpdate) onStatsUpdate(platformKey, 0);

      localStorage.setItem(`cpc_handle_${platformKey}`, handle);

      try {
        const data = await fetchUserStats(platformKey, handle);
        setStats(data);
        if (onStatsUpdate) {
          onStatsUpdate(platformKey, data.solved_count || 0);
        }
      } catch (err: any) {
        setError('Not Found');
      } finally {
        setLoading(false);
      }
    };

    useImperativeHandle(ref, () => ({
      triggerSearch: handleSearch
    }));

    const color = getPlatformColor(platformName);

    const getJumpUrl = () => {
      const config = OJ_LINKS[platformKey];
      if (!config) return '#';
      return handle.trim() ? `${config.profile}${handle.trim()}` : config.home;
    };

    return (
      <div 
        className="relative rounded-2xl p-4 border border-white/5 flex flex-col h-full transition-all duration-300 hover:shadow-lg group"
        style={cardStyle}
      >
        <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl" style={{ backgroundColor: color }}></div>

        <div className="flex justify-between items-center mb-3">
          <a 
            href={getJumpUrl()} 
            target="_blank" 
            rel="noreferrer"
            className="font-bold text-lg text-white/90 hover:text-blue-400 transition-colors flex items-center gap-1.5 group/link"
            title={handle ? `Visit ${handle}'s profile` : `Go to ${platformName}`}
          >
            {platformName}
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="opacity-0 group-hover/link:opacity-100 transition-opacity translate-y-[-1px]">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15 3 21 3 21 9"></polyline>
              <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
          </a>
        </div>

        <div className="flex gap-2 mb-3">
          <input 
            type="text" 
            className="bg-black/20 text-white text-sm rounded-lg px-3 py-1.5 w-full outline-none focus:ring-1 focus:ring-blue-500/50 border border-white/5 placeholder-gray-600" 
            placeholder="Handle / ID" 
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            disabled={!isEnabled}
          />
          <button 
            onClick={handleSearch}
            disabled={!isEnabled || loading}
            className="bg-white/10 hover:bg-white/20 text-white rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <SearchIcon />}
          </button>
        </div>

        <div className="flex-1 min-h-[60px] flex items-center justify-center bg-black/10 rounded-xl p-2 border border-white/5 relative overflow-hidden">
          {!isEnabled ? (
            <span className="text-xs text-gray-600 italic">Coming Soon</span>
          ) : error ? (
            <span className="text-xs text-red-400">{error}</span>
          ) : stats ? (
            <div className="w-full grid grid-cols-2 divide-x divide-white/10">
              <div className="flex flex-col items-center justify-center p-1">
                <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-0.5">Rating</span>
                <span className="text-xl font-bold" style={{ color: getRatingColor(stats.rating) }}>
                  {stats.rating || '-'}
                </span>
              </div>
              <div className="flex flex-col items-center justify-center p-1">
                <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-0.5">Solved</span>
                <span className="text-xl font-bold text-white">
                  {stats.solved_count}
                </span>
              </div>
            </div>
          ) : (
            <span className="text-xs text-gray-600">Enter handle</span>
          )}
        </div>
      </div>
    );
  }
);

export default PlatformCard;