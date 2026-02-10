import { useState, useEffect } from 'react';

interface SettingsProps {
  // 继承 App.tsx 里控制卡片样式的 props
  cardStyle: any;
  setCardStyle: (style: any) => void;
}

const Settings = ({ cardStyle, setCardStyle }: SettingsProps) => {
  const [ncCookie, setNcCookie] = useState('');
  const [saveStatus, setSaveStatus] = useState('');

  // 加载保存的 Cookie
  useEffect(() => {
    const savedCookie = localStorage.getItem('nowcoder_cookie');
    if (savedCookie) {
      setNcCookie(savedCookie);
    }
  }, []);

  // 保存 Cookie
  const handleSaveCookie = () => {
    localStorage.setItem('nowcoder_cookie', ncCookie);
    setSaveStatus('Cookie 已保存！');
    setTimeout(() => setSaveStatus(''), 2000);
  };

  return (
    <div className="animate-fade-in p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">设置</h2>

      {/* 1. 外观设置 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-200">外观样式</h3>
        
        <div className="grid grid-cols-1 gap-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    卡片背景透明度 (0.1 - 1.0)
                </label>
                <input 
                    type="range" 
                    min="0.1" 
                    max="1.0" 
                    step="0.1"
                    value={cardStyle?.opacity || 0.9}
                    onChange={(e) => setCardStyle({ ...cardStyle, opacity: parseFloat(e.target.value) })}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="text-right text-sm text-gray-500">{cardStyle?.opacity || 0.9}</div>
            </div>

            {/* 如果你有其他颜色设置，可以在这里添加，例如：
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">主题色</label>
                <input type="color" ... />
            </div> 
            */}
        </div>
      </div>

      {/* 2. 爬虫配置 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-200">爬虫配置 (Cookie)</h3>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            NowCoder (牛客网) Cookie
          </label>
          <p className="text-xs text-gray-500 mb-2">
            {/* 修复：使用 → 符号代替 -> 以避免 JSX 语法错误 */}
            请在浏览器登录牛客网，按 F12 → Network → 刷新 → 复制请求头中的 Cookie。
          </p>
          <textarea
            rows={5}
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm font-mono"
            placeholder="粘贴 Cookie 字符串到这里..."
            value={ncCookie}
            onChange={(e) => setNcCookie(e.target.value)}
          />
        </div>

        <div className="flex items-center justify-between">
            <button
                onClick={handleSaveCookie}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors"
            >
                保存配置
            </button>
            {saveStatus && <span className="text-green-600 text-sm font-medium animate-pulse">{saveStatus}</span>}
        </div>
      </div>
    </div>
  );
};

export default Settings;