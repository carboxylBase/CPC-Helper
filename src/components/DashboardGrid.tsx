import { useRef, useState } from 'react';
import PlatformCard, { PlatformCardRef } from './PlatformCard';

interface DashboardGridProps {
  cardStyle: any;
}

const DashboardGrid = ({ cardStyle }: DashboardGridProps) => {
  // 定义 Refs 以调用子组件的方法
  const cfRef = useRef<PlatformCardRef>(null);
  const acRef = useRef<PlatformCardRef>(null);
  const ncRef = useRef<PlatformCardRef>(null);
  // LeetCode 和 HDU 目前禁用，暂不需要 ref，或者预留
  const lcRef = useRef<PlatformCardRef>(null);
  const hduRef = useRef<PlatformCardRef>(null);

  const [isGlobalRefreshing, setIsGlobalRefreshing] = useState(false);

  const handleRefreshAll = async () => {
    setIsGlobalRefreshing(true);
    // 并发触发所有已启用平台的搜索
    // 即使某个失败，allSettled 也会等待所有完成
    const refs = [cfRef, acRef, ncRef];
    
    await Promise.allSettled(
      refs.map(ref => ref.current?.triggerSearch())
    );
    
    setIsGlobalRefreshing(false);
  };

  return (
    <div className="animate-fade-in pb-20">
      
      {/* 头部控制区 */}
      <div className="flex justify-between items-center mb-6 px-1">
        <h2 className="text-xl font-bold text-white/90 tracking-tight">我的战绩</h2>
        <button 
          onClick={handleRefreshAll}
          disabled={isGlobalRefreshing}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-sm font-medium rounded-xl border border-blue-500/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGlobalRefreshing ? (
             <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
              <path d="M3 3v5h5"/>
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
              <path d="M16 21h5v-5"/>
            </svg>
          )}
          <span>一键查询</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        
        {/* 1. Codeforces (Enabled) */}
        <PlatformCard 
          ref={cfRef}
          platformName="Codeforces" 
          platformKey="codeforces"
          cardStyle={cardStyle}
          isEnabled={true} 
        />

        {/* 2. LeetCode (Placeholder) */}
        <PlatformCard 
          ref={lcRef}
          platformName="LeetCode" 
          platformKey="leetcode"
          cardStyle={cardStyle}
          isEnabled={false} 
        />

        {/* 3. AtCoder (Enabled) */}
        <PlatformCard 
          ref={acRef}
          platformName="AtCoder" 
          platformKey="atcoder"
          cardStyle={cardStyle}
          isEnabled={true} 
        />

          {/* 4. NowCoder (Enabled) */}
          <PlatformCard 
          ref={ncRef}
          platformName="NowCoder" 
          platformKey="nowcoder"
          cardStyle={cardStyle}
          isEnabled={true} 
        />
          
          {/* 5. HDU (Placeholder) */}
          <PlatformCard 
          ref={hduRef}
          platformName="HDU" 
          platformKey="hdu"
          cardStyle={cardStyle}
          isEnabled={false} 
        />
      </div>
    </div>
  );
};

export default DashboardGrid;