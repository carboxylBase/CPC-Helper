// 平台颜色映射
export const getPlatformColor = (platform: string): string => {
  switch (platform.toLowerCase()) {
    case 'codeforces':
      return '#3182ce'; // Blue-600
    case 'atcoder':
      return '#d69e2e'; // Yellow-600 (原牛客颜色)
    case 'nowcoder':
      return '#16a34a'; // Green-600 (新牛客颜色)
    case 'leetcode':
      return '#d97706'; // Amber-600
    case 'hdu':
      return '#e53e3e'; // Red-600 for HDU
    default:
      return '#718096'; // Gray-600
  }
};

// 格式化时间显示 (HH:mm)
export const formatTime = (isoString: string): string => {
  const date = new Date(isoString);
  // 使用原生 Intl 格式化，确保补零
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

  // 格式化为 MM-dd
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${month}-${day}`;
};

// 计算倒计时或状态文本
export const getStatusText = (isoString: string): string => {
  const now = new Date();
  const start = new Date(isoString);
  const diffMs = start.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours < 0) return '进行中/已结束';
  if (diffHours < 1) return '即将开始';
  if (diffHours < 24) return `${Math.floor(diffHours)}小时后`;

  // 超过24小时显示完整日期 MM-dd HH:mm
  const month = (start.getMonth() + 1).toString().padStart(2, '0');
  const day = start.getDate().toString().padStart(2, '0');
  const hours = start.getHours().toString().padStart(2, '0');
  const minutes = start.getMinutes().toString().padStart(2, '0');
  return `${month}-${day} ${hours}:${minutes}`;
};

// 将 Hex 颜色与透明度转换为 RGBA，用于动态样式绑定
export const hexToRgba = (hex: string, alpha: number): string => {
  let c: any;
  if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
    c = hex.substring(1).split('');
    if (c.length === 3) c = [c[0], c[0], c[1], c[1], c[2], c[2]];
    c = '0x' + c.join('');
    // eslint-disable-next-line no-bitwise
    return 'rgba(' + [(c >> 16) & 255, (c >> 8) & 255, c & 255].join(',') + ',' + alpha + ')';
  }
  return `rgba(31, 41, 55, ${alpha})`; // Fallback
};