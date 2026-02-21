import React, { useMemo } from 'react';
import { DailyActivity } from '../utils/history';

interface ActivityHeatmapProps {
  data: DailyActivity[];
  cardStyle: any;
}

const ActivityHeatmap: React.FC<ActivityHeatmapProps> = ({ data, cardStyle }) => {
  
  // --- 统计数据计算 (基于传入的 data 数组) ---

  // 0. 今日做题数
  const todayCount = useMemo(() => {
    if (data.length < 1) return 0;
    // data 数组按日期升序排列，最后一个是今天
    return data[data.length - 1].count;
  }, [data]);

  // 1. 昨日做题数
  const yesterdayCount = useMemo(() => {
    if (data.length < 2) return 0;
    // data 数组按日期升序排列，最后一个是今天，倒数第二个是昨天
    return data[data.length - 2].count;
  }, [data]);

  // 2. 最近 7 天做题数
  const lastWeekCount = useMemo(() => {
    return data.slice(-7).reduce((acc, curr) => acc + curr.count, 0);
  }, [data]);

  // 3. 最近 30 天做题数
  const lastMonthCount = useMemo(() => {
    return data.slice(-30).reduce((acc, curr) => acc + curr.count, 0);
  }, [data]);

  // 4. 最近一年做题数
  const lastYearCount = useMemo(() => {
    return data.slice(-365).reduce((acc, curr) => acc + curr.count, 0);
  }, [data]);

  // --- 热力图数据处理 ---
  // 将数据按周分组（为了纵向排列：周日->周六）
  const weeks = useMemo(() => {
    const result: DailyActivity[][] = [];
    let currentWeek: DailyActivity[] = [];

    data.forEach((day) => {
      const dateObj = new Date(day.date);
      // 如果是周日且当前周不为空，开启新的一周
      if (dateObj.getDay() === 0 && currentWeek.length > 0) {
        result.push(currentWeek);
        currentWeek = [];
      }
      currentWeek.push(day);
    });
    if (currentWeek.length > 0) result.push(currentWeek);
    
    // 截取最近的 52 周用于显示
    return result.slice(-52); 
  }, [data]);

  // 颜色映射
  const getLevelColor = (level: number) => {
    switch (level) {
      case 1: return '#0e4429'; // 少量 (深绿)
      case 2: return '#006d32'; // 中等
      case 3: return '#26a641'; // 较多
      case 4: return '#39d353'; // 很多 (亮绿)
      default: return 'rgba(255, 255, 255, 0.05)'; // 无数据 (灰色)
    }
  };

  // 统计卡片组件
  const StatCard = ({ label, value, highlight = false }: { label: string, value: number, highlight?: boolean }) => (
    <div className={`px-3 py-2 rounded-lg border flex flex-col items-center justify-center min-w-[80px] transition-colors ${
      highlight 
        ? "bg-green-500/10 border-green-500/20" 
        : "bg-black/20 border-white/5"
    }`}>
      <span className={`text-[10px] uppercase tracking-wider mb-0.5 ${highlight ? "text-green-400" : "text-gray-400"}`}>{label}</span>
      <div className="flex items-baseline gap-1">
        <span className={`text-lg font-bold ${highlight ? "text-green-400" : "text-white"}`}>{value}</span>
        <span className="text-[10px] text-gray-500">problems</span>
      </div>
    </div>
  );

  return (
    <div className="rounded-2xl p-6 border border-white/5 mt-6" style={cardStyle}>
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 gap-6">
        <h3 className="text-lg font-bold text-white/90 flex items-center gap-2">
          <span>🔥</span> Activity Heatmap
        </h3>
        
        {/* 统计概览 - 调整为 5 列布局，在小屏幕上自动折行 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 w-full xl:w-auto">
           <StatCard label="Today" value={todayCount} highlight={todayCount > 0} />
           <StatCard label="Yesterday" value={yesterdayCount} />
           <StatCard label="Last 7 Days" value={lastWeekCount} />
           <StatCard label="Last 30 Days" value={lastMonthCount} />
           <StatCard label="Last Year" value={lastYearCount} />
        </div>
      </div>

      {/* 热力图滚动容器 */}
      <div className="overflow-x-auto pb-2 custom-scrollbar">
        <div className="flex gap-1 min-w-max">
          {weeks.map((week, wIndex) => (
            <div key={wIndex} className="flex flex-col gap-1">
              {week.map((day) => (
                <div
                  key={day.date}
                  className="w-3 h-3 rounded-[2px] transition-all hover:ring-1 hover:ring-white relative group"
                  style={{ backgroundColor: getLevelColor(day.level) }}
                >
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 whitespace-nowrap bg-gray-900 text-xs text-white px-2 py-1 rounded border border-white/10 shadow-xl pointer-events-none">
                    {day.count} problems on {day.date}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* 图例 */}
      <div className="flex items-center justify-end gap-2 mt-4 text-xs text-gray-500">
        <span>Less</span>
        <div className="w-3 h-3 rounded-[2px]" style={{ background: 'rgba(255, 255, 255, 0.05)' }}></div>
        <div className="w-3 h-3 rounded-[2px]" style={{ background: '#0e4429' }}></div>
        <div className="w-3 h-3 rounded-[2px]" style={{ background: '#006d32' }}></div>
        <div className="w-3 h-3 rounded-[2px]" style={{ background: '#26a641' }}></div>
        <div className="w-3 h-3 rounded-[2px]" style={{ background: '#39d353' }}></div>
        <span>More</span>
      </div>
    </div>
  );
};

export default ActivityHeatmap;