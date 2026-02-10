import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { UserStats } from '../types';
import { fetchUserStats } from '../services/contestService';
import { getPlatformColor, getRatingColor } from '../utils';
import { SearchIcon } from './Icons';

interface PlatformCardProps {
  platformName: string;
  platformKey: string;
  cardStyle: any;
  isEnabled?: boolean;
}

// 定义暴露给父组件的方法接口
export interface PlatformCardRef {
  triggerSearch: () => Promise<void>;
}

// 使用 forwardRef 包裹组件
const PlatformCard = forwardRef<PlatformCardRef, PlatformCardProps>(
  ({ platformName, platformKey, cardStyle, isEnabled = false }, ref) => {
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
      localStorage.setItem(`cpc_handle_${platformKey}`, handle);

      try {
        const data = await fetchUserStats(platformKey, handle);
        setStats(data);
      } catch (err: any) {
        setError('Not Found');
      } finally {
        setLoading(false);
      }
    };

    // 暴露方法给父组件
    useImperativeHandle(ref, () => ({
      triggerSearch: handleSearch
    }));

    const color = getPlatformColor(platformName);

    return (
      <div 
        className="relative rounded-2xl p-4 border border-white/5 flex flex-col h-full transition-all duration-300 hover:shadow-lg"
        style={cardStyle}
      >
        <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl" style={{ backgroundColor: color }}></div>

        <div className="flex justify-between items-center mb-3">
          <span className="font-bold text-lg text-white/90">{platformName}</span>
          {stats && stats.rank && (
            <span className="text-xs font-mono uppercase bg-white/5 px-2 py-0.5 rounded text-gray-400">
              {stats.rank}
            </span>
          )}
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