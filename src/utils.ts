// 平台颜色映射
export const getPlatformColor = (platform: string): string => {
  switch (platform.toLowerCase()) {
    case 'codeforces':
      return '#3182ce'; // Blue-600
    case 'atcoder':
      return '#d69e2e'; // AtCoder logo uses black/white, but let's use Dark Gray for card header
    case 'nowcoder':
      return '#16a34a'; // Green-600
    case 'leetcode':
      return '#d97706'; // Amber-600
    case 'hdu':
      return '#e53e3e'; // Red-600
    default:
      return '#718096'; // Gray-600
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

// [更新] 获取 Rating 颜色，支持多平台
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

  // Codeforces 颜色逻辑 (默认)
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