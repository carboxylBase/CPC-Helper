// 平台颜色映射 - 采用“赤橙黄绿青蓝紫”光谱方案
export const getPlatformColor = (platform: string): string => {
  switch (platform.toLowerCase()) {
    case 'hdu':
      return '#ef4444'; // 赤 (Red-500)
    case 'leetcode':
      return '#f97316'; // 橙 (Orange-500)
    case 'atcoder':
      return '#eab308'; // 黄 (Yellow-500)
    case 'nowcoder':
      return '#22c55e'; // 绿 (Green-500)
    case 'luogu':
      return '#06b6d4'; // 青 (Cyan-500)
    case 'codeforces':
      return '#3b82f6'; // 蓝 (Blue-500)
    case 'daimayuan':
      return '#8b5cf6'; // 紫 (Purple-500)
    default:
      return '#94a3b8'; // 默认 (Slate-400)
  }
};

// 格式化时间显示 (HH:mm)
export const formatTime = (isoString: string): string => {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
};

// 格式化日期显示 (今天/明天/MM-dd)
export const formatDate = (isoString: string): string => {
  const date = new Date(isoString);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const isSameDay = (d1: Date, d2: Date) => {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  };

  if (isSameDay(date, now)) return '今天';
  if (isSameDay(date, tomorrow)) return '明天';

  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${month}-${day}`;
};

// [更新] 获取 Rating 颜色，保持竞赛等级标准颜色不变
export const getRatingColor = (rating?: number, platform: string = 'codeforces'): string => {
  if (!rating) return '#9ca3af'; // gray-400 (Unrated)

  const p = platform.toLowerCase();

  // AtCoder 颜色逻辑
  if (p === 'atcoder') {
    if (rating < 400) return '#808080';   // Gray
    if (rating < 800) return '#804000';   // Brown
    if (rating < 1200) return '#008000';  // Green
    if (rating < 1600) return '#00C0C0';  // Cyan
    if (rating < 2000) return '#0000FF';  // Blue
    if (rating < 2400) return '#C0C000';  // Yellow
    if (rating < 2800) return '#FF8000';  // Orange
    return '#FF0000';                     // Red
  }

  // NowCoder 颜色逻辑
  if (p === 'nowcoder') {
    if (rating < 1200) return '#9ca3af'; // Gray
    if (rating < 1500) return '#3b82f6'; // Blue
    if (rating < 2200) return '#22c55e'; // Green
    if (rating < 2600) return '#fbbf24'; // Gold/Yellow
    return '#ef4444';                    // Red
  }

  // Codeforces / Daimayuan 颜色逻辑
  if (rating < 1200) return '#9ca3af'; // Gray (Newbie)
  if (rating < 1400) return '#22c55e'; // Green (Pupil)
  if (rating < 1600) return '#06b6d4'; // Cyan (Specialist)
  if (rating < 1900) return '#3b82f6'; // Blue (Expert)
  if (rating < 2100) return '#a855f7'; // Purple (Candidate Master)
  if (rating < 2300) return '#fbbf24'; // Orange (Master)
  if (rating < 2400) return '#fbbf24'; // Orange (International Master)
  return '#ef4444'; // Red (Grandmaster+)
};

// 将 Hex 颜色与透明度转换为 RGBA
export const hexToRgba = (hex: string, alpha: number): string => {
  let c: any;
  if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
    c = hex.substring(1).split('');
    if (c.length === 3) c = [c[0], c[0], c[1], c[1], c[2], c[2]];
    c = '0x' + c.join('');
    // eslint-disable-next-line no-bitwise
    return 'rgba(' + [(c >> 16) & 255, (c >> 8) & 255, c & 255].join(',') + ',' + alpha + ')';
  }
  return `rgba(31, 41, 55, ${alpha})`; 
};