import { useState, useEffect } from 'react';
import { Contest } from '../types';
import { fetchAllContests } from '../services/contestService';
import { getPlatformColor, formatTime, formatDate } from '../utils';
import { open } from '@tauri-apps/plugin-shell';
import { RefreshIcon, ExternalLinkIcon } from './Icons';

interface ContestListProps {
  cardStyle: any;
}

// 定义部分 TodoItem 接口以确保类型安全 (与 TodoPanel 保持一致)
interface TodoItem {
  id: string;
  title: string;
  link: string;
  note: string;
  completed: boolean;
  targetDate: string; // YYYY-MM-DD
  createdAt: number;
}

const ContestList = ({ cardStyle }: ContestListProps) => {
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  //简单的反馈状态
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  const loadContests = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAllContests();
      setContests(data);
    } catch (err) {
      setError('Failed to fetch contests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContests();
  }, []);

  const handleOpenLink = async (url: string) => {
    try {
      await open(url);
    } catch (err) {
      console.error('Failed to open link:', err);
    }
  };

  // [新增] 添加到日程逻辑
  const handleAddToSchedule = (contest: Contest) => {
    try {
      // 1. 格式化日期 YYYY-MM-DD
      const dateObj = new Date(contest.start_time);
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      const targetDate = `${year}-${month}-${day}`;

      // 2. 构建新条目
      const newItem: TodoItem = {
        id: crypto.randomUUID(),
        title: `[Contest] ${contest.name}`,
        link: contest.url,
        note: `${contest.platform} @ ${formatTime(contest.start_time)}`,
        completed: false,
        targetDate: targetDate,
        createdAt: Date.now(),
      };

      // 3. 读取现有数据并保存
      const saved = localStorage.getItem('cpc_todo_pool');
      const items: TodoItem[] = saved ? JSON.parse(saved) : [];
      
      // 简单查重 (可选): 如果同一天已经有同名比赛，是否还添加？这里允许重复添加，用户自己决定。
      items.unshift(newItem); // 加到最前面
      localStorage.setItem('cpc_todo_pool', JSON.stringify(items));

      // 4. [核心] 触发自定义事件，通知 TodoPanel 刷新
      window.dispatchEvent(new Event('cpc_todo_update'));

      // 5. UI 反馈
      setAddedIds(prev => new Set(prev).add(contest.url)); // 使用 url 作为临时 key
      setTimeout(() => {
        setAddedIds(prev => {
          const next = new Set(prev);
          next.delete(contest.url);
          return next;
        });
      }, 2000);

    } catch (e) {
      console.error("Failed to add contest to schedule", e);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex justify-end mb-4">
        <button 
          onClick={loadContests}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-sm text-gray-300 transition-colors"
        >
          <RefreshIcon /> Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-200 p-4 rounded-lg mb-6 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-20">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl animate-pulse bg-gray-800/50"></div>
          ))
        ) : contests.length === 0 ? (
          <div className="col-span-full text-center py-10 text-gray-500">
            No upcoming contests found.
          </div>
        ) : (
          contests.map((contest, index) => {
             const isAdded = addedIds.has(contest.url);
             return (
              <div 
                key={`${contest.platform}-${index}`}
                className="relative rounded-2xl p-5 transition-all duration-300 hover:scale-[1.01] hover:shadow-lg group border border-white/5 flex flex-col justify-between h-full"
                style={cardStyle}
              >
                <div 
                  className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-2xl"
                  style={{ backgroundColor: getPlatformColor(contest.platform) }}
                />
                
                {/* 内容区域 */}
                <div className="flex justify-between items-start pl-3 mb-2">
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span 
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded text-white/90 shadow-sm uppercase tracking-wide"
                        style={{ backgroundColor: getPlatformColor(contest.platform) }}
                      >
                        {contest.platform}
                      </span>
                      <span className="text-gray-400 text-xs font-mono">
                        {formatDate(contest.start_time)} {formatTime(contest.start_time)}
                      </span>
                    </div>
                    <h3 
                      className="text-base font-semibold text-white/90 leading-tight cursor-pointer hover:text-blue-300 transition-colors line-clamp-2"
                      onClick={() => handleOpenLink(contest.url)}
                      title={contest.name}
                    >
                      {contest.name}
                    </h3>
                  </div>

                  {/* 按钮组 */}
                  <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleOpenLink(contest.url)}
                      className="p-1.5 text-gray-400 hover:text-white rounded hover:bg-white/10 transition-colors"
                      title="Open Link"
                    >
                      <ExternalLinkIcon />
                    </button>
                    {/* [新增] 添加日程按钮 */}
                    <button 
                      onClick={() => handleAddToSchedule(contest)}
                      className={`p-1.5 rounded transition-colors ${
                        isAdded 
                          ? 'text-green-400 hover:text-green-300 bg-green-400/10' 
                          : 'text-gray-400 hover:text-blue-300 hover:bg-white/10'
                      }`}
                      title="Add to Problem Pool"
                      disabled={isAdded}
                    >
                      {isAdded ? (
                         <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                      ) : (
                         <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line><line x1="12" y1="15" x2="12" y2="15"></line></svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ContestList;