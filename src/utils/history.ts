// 定义历史记录的数据结构: { "YYYY-MM-DD": 总题数 }
export interface ActivityHistory {
  [date: string]: number;
}

// 定义每日增量数据: { date: "YYYY-MM-DD", count: 今日做题数, level: 热力等级 }
export interface DailyActivity {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

const HISTORY_KEY = 'cpc_activity_history';

// 获取本地日期字符串 YYYY-MM-DD
export const getTodayStr = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// 核心逻辑：更新今日快照
export const updateActivitySnapshot = (currentTotalSolved: number) => {
  if (currentTotalSolved === 0) return; // 忽略无效数据

  const today = getTodayStr();
  const saved = localStorage.getItem(HISTORY_KEY);
  let history: ActivityHistory = saved ? JSON.parse(saved) : {};

  // 如果今天的记录比现在的少（或者不存在），或者现在的更多（说明刚做了一题），则更新
  // 注意：我们只记录"最大值"，防止API偶尔失败返回0导致数据回滚
  const recordedToday = history[today] || 0;
  if (currentTotalSolved > recordedToday) {
    history[today] = currentTotalSolved;
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }
  
  return history;
};

// 核心逻辑：计算增量 (热力图数据)
export const calculateDailyActivity = (): DailyActivity[] => {
  const saved = localStorage.getItem(HISTORY_KEY);
  if (!saved) return [];

  const history: ActivityHistory = JSON.parse(saved);
  // 按日期排序
  const sortedDates = Object.keys(history).sort();
  
  const activities: DailyActivity[] = [];
  
  // 生成过去 365 天的空档，填补中间缺失的日期
  const today = new Date();
  const oneYearAgo = new Date();
  oneYearAgo.setDate(today.getDate() - 365);

  // 我们需要构建一个完整的日期映射
  const dateMap = new Map<string, number>();
  
  // 计算每一天的增量
  for (let i = 0; i < sortedDates.length; i++) {
    const dateStr = sortedDates[i];
    const total = history[dateStr];
    
    // 寻找前一个有效记录
    let prevTotal = 0;
    if (i > 0) {
      prevTotal = history[sortedDates[i-1]];
    } else {
      // 如果是第一条记录，且记录时间就在最近，我们假设增量就是当日所有的（或者0，视策略而定）
      // 为了避免初次使用时显示 "+2000题"，我们通常把第一天增量设为 0，除非数据长期存在
      prevTotal = total; // 策略：第一天不算增量
    }

    const delta = Math.max(0, total - prevTotal);
    dateMap.set(dateStr, delta);
  }

  // 填充过去365天的数据
  for (let d = new Date(oneYearAgo); d <= today; d.setDate(d.getDate() + 1)) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const isoDate = `${year}-${month}-${day}`;

    const count = dateMap.get(isoDate) || 0;
    
    // 计算热力等级
    let level: 0 | 1 | 2 | 3 | 4 = 0;
    if (count > 0) level = 1;
    if (count > 2) level = 2;
    if (count > 5) level = 3;
    if (count > 9) level = 4;

    activities.push({ date: isoDate, count, level });
  }

  return activities;
};

// 统计最近 N 天的总数
export const getRecentSum = (days: number): number => {
  const activities = calculateDailyActivity();
  // 取最后 N 个元素
  return activities.slice(-days).reduce((acc, curr) => acc + curr.count, 0);
};