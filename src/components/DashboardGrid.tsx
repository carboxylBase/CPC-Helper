import { useRef, useState, useMemo, useEffect } from 'react';
import PlatformCard, { PlatformCardRef } from './PlatformCard';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Sector } from 'recharts';
import { getPlatformColor } from '../utils';

interface DashboardGridProps {
  cardStyle: any;
}

interface ChartData {
  name: string;
  value: number;
  color: string;
}

// ----------------------------------------------------------------------------
// 动画组件：PopOutActiveSector
// ----------------------------------------------------------------------------
const PopOutActiveSector = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, midAngle } = props;
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const rafId = requestAnimationFrame(() => {
        setIsMounted(true);
    });
    return () => cancelAnimationFrame(rafId);
  }, []);

  const RADIAN = Math.PI / 180;
  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);
  
  const mx = 12 * cos;
  const my = 12 * sin;

  return (
    <g>
      {/* 幽灵判定层 */}
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill="transparent" 
        stroke="none"
      />

      {/* 视觉动画层 */}
      <g
        style={{
          transformBox: 'fill-box',
          transformOrigin: 'center',
          transition: 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          transform: isMounted 
            ? `translate(${mx}px, ${my}px) scale(1.05)` 
            : `translate(0px, 0px) scale(1)`
        }}
        pointerEvents="none" 
      >
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
          cornerRadius={6}
          className="filter drop-shadow-xl"
        />
      </g>
    </g>
  );
};


const DashboardGrid = ({ cardStyle }: DashboardGridProps) => {
  // Refs to child components
  const cfRef = useRef<PlatformCardRef>(null);
  const acRef = useRef<PlatformCardRef>(null);
  const ncRef = useRef<PlatformCardRef>(null);
  const lcRef = useRef<PlatformCardRef>(null);
  const luoguRef = useRef<PlatformCardRef>(null);
  const hduRef = useRef<PlatformCardRef>(null);

  // UI State
  const [isGlobalRefreshing, setIsGlobalRefreshing] = useState(false);
  const [solvedStats, setSolvedStats] = useState<Record<string, number>>({});
  const [activeIndex, setActiveIndex] = useState<number>(-1);

  // Logic Refs
  const isBatchingUpdateRef = useRef(false);
  const pendingStatsRef = useRef<Record<string, number>>({});

  const handleStatsUpdate = (platformKey: string, count: number) => {
    if (isBatchingUpdateRef.current) {
      pendingStatsRef.current[platformKey] = count;
    } else {
      setSolvedStats(prev => ({
        ...prev,
        [platformKey]: count
      }));
    }
  };

  const handleRefreshAll = async () => {
    setIsGlobalRefreshing(true);
    isBatchingUpdateRef.current = true;
    pendingStatsRef.current = {}; 

    const refs = [cfRef, acRef, ncRef, lcRef, luoguRef];
    
    await Promise.allSettled(
      refs.map(ref => ref.current?.triggerSearch())
    );

    setSolvedStats(prev => ({
      ...prev,
      ...pendingStatsRef.current
    }));

    isBatchingUpdateRef.current = false;
    setIsGlobalRefreshing(false);
  };

  // --------------------------------------------------------------------------
  // 新增：组件挂载（软件启动）时自动触发一次查询
  // --------------------------------------------------------------------------
  useEffect(() => {
    // 延迟极短的时间执行，确保子组件 ref 已完全挂载
    const timer = setTimeout(() => {
      handleRefreshAll();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const chartData: ChartData[] = useMemo(() => {
    const data = [
      { key: 'codeforces', name: 'Codeforces', value: solvedStats['codeforces'] || 0 },
      { key: 'leetcode', name: 'LeetCode', value: solvedStats['leetcode'] || 0 },
      { key: 'atcoder', name: 'AtCoder', value: solvedStats['atcoder'] || 0 },
      { key: 'nowcoder', name: 'NowCoder', value: solvedStats['nowcoder'] || 0 },
      { key: 'luogu', name: 'Luogu', value: solvedStats['luogu'] || 0 },
    ];
    
    return data
      .filter(item => item.value > 0)
      .map(item => ({
        name: item.name,
        value: item.value,
        color: getPlatformColor(item.name)
      }));
  }, [solvedStats]);

  const totalSolved = chartData.reduce((acc, curr) => acc + curr.value, 0);

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };
  
  const onPieLeave = () => {
     setActiveIndex(-1);
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-gray-900/90 backdrop-blur-md border border-white/10 p-3 rounded-lg shadow-xl z-[9999]">
          <p className="font-bold text-white mb-1">{data.name}</p>
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: data.color }} />
            <span>Solved: <span className="text-white font-mono font-bold">{data.value}</span></span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {((data.value / totalSolved) * 100).toFixed(1)}% of total
          </p>
        </div>
      );
    }
    return null;
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
        
        <PlatformCard 
          ref={cfRef}
          platformName="Codeforces" 
          platformKey="codeforces"
          cardStyle={cardStyle}
          isEnabled={true} 
          onStatsUpdate={handleStatsUpdate}
        />

        <PlatformCard 
          ref={lcRef}
          platformName="LeetCode" 
          platformKey="leetcode"
          cardStyle={cardStyle}
          isEnabled={true} 
          onStatsUpdate={handleStatsUpdate}
        />

        <PlatformCard 
          ref={acRef}
          platformName="AtCoder" 
          platformKey="atcoder"
          cardStyle={cardStyle}
          isEnabled={true} 
          onStatsUpdate={handleStatsUpdate}
        />

        <PlatformCard 
          ref={ncRef}
          platformName="NowCoder" 
          platformKey="nowcoder"
          cardStyle={cardStyle}
          isEnabled={true} 
          onStatsUpdate={handleStatsUpdate}
        />
          
        <PlatformCard 
          ref={luoguRef}
          platformName="Luogu" 
          platformKey="luogu"
          cardStyle={cardStyle}
          isEnabled={true} 
          onStatsUpdate={handleStatsUpdate}
        />
          
        <PlatformCard 
          ref={hduRef}
          platformName="HDU" 
          platformKey="hdu"
          cardStyle={cardStyle}
          isEnabled={false} 
        />
      </div>

      {/* 统计饼图区域 */}
      <div 
        className={`transition-all duration-700 ease-out transform ${totalSolved > 0 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 h-0 overflow-hidden'}`}
      >
        <div 
          className="rounded-2xl p-6 border border-white/5 relative overflow-hidden"
          style={cardStyle}
        >
          <h3 className="text-lg font-bold text-white/90 mb-4 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-400"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path><path d="M22 12A10 10 0 0 0 12 2v10z"></path></svg>
            刷题分布概览
          </h3>
          
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 h-[300px]">
            {/* 左侧：图表 */}
            <div className="w-full h-full md:w-1/2 relative" onMouseLeave={onPieLeave}>
                <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    cornerRadius={4}
                    dataKey="value"
                    stroke="none"
                    // @ts-ignore: Recharts type definition mismatch
                    activeIndex={activeIndex}
                    activeShape={PopOutActiveSector} 
                    onMouseEnter={onPieEnter}
                    // 关闭默认动画以完全接管 active 态
                    isAnimationActive={true}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="none"/>
                    ))}
                  </Pie>
                  
                  <Tooltip 
                    content={<CustomTooltip />} 
                    wrapperStyle={{ zIndex: 1000, outline: 'none' }}
                    allowEscapeViewBox={{ x: true, y: true }}
                    cursor={false}
                  />
                </PieChart>
              </ResponsiveContainer>
              
              {/* 中心文字：总数 */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                <div className="text-3xl font-bold text-white">{totalSolved}</div>
                <div className="text-xs text-gray-400 uppercase tracking-widest">Total</div>
              </div>
            </div>

            {/* 右侧：图例 */}
            <div className="w-full md:w-auto grid grid-cols-2 md:grid-cols-1 gap-3">
              {chartData.map((entry, index) => (
                <div 
                  key={entry.name} 
                  className={`flex items-center gap-3 p-2 rounded-lg border border-white/5 min-w-[140px] transition-all duration-300 ${
                    activeIndex === index ? 'bg-white/10 scale-105' : 'bg-white/5'
                  }`}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(-1)}
                >
                  <div className="w-3 h-3 rounded-full shadow-lg shadow-black/50" style={{ backgroundColor: entry.color }}></div>
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-400 font-medium">{entry.name}</span>
                    <span className="text-sm font-bold text-white">{entry.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default DashboardGrid;