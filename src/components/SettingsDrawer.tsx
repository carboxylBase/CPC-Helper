import { useState, useEffect } from 'react';
// import { XIcon } from './Icons'; // 如果你没有这个组件，可以注释掉

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cardColor: string;
  setCardColor: (color: string) => void;
  cardOpacity: number;
  setCardOpacity: (opacity: number) => void;
  defaultConfig: { cardColor: string; cardOpacity: number };
}

const SettingsDrawer = ({
  isOpen,
  onClose,
  cardColor,
  setCardColor,
  cardOpacity,
  setCardOpacity,
  defaultConfig,
}: SettingsDrawerProps) => {
  const [ncCookie, setNcCookie] = useState('');
  const [cookieStatus, setCookieStatus] = useState('');

  // 组件加载时读取保存的 Cookie
  useEffect(() => {
    const saved = localStorage.getItem('nowcoder_cookie');
    console.log('[SettingsDrawer] 初始化读取 Cookie:', saved ? '已存在' : '为空');
    if (saved) setNcCookie(saved);
  }, []);

  // 保存 Cookie 到 LocalStorage
  const handleSaveCookie = () => {
    console.log('[SettingsDrawer] 正在保存 Cookie...');
    console.log('[SettingsDrawer] 内容长度:', ncCookie.length);
    
    if (!ncCookie.trim()) {
        alert("Cookie 内容为空，无法保存！");
        return;
    }

    localStorage.setItem('nowcoder_cookie', ncCookie);
    
    // 立即读取验证
    const verify = localStorage.getItem('nowcoder_cookie');
    console.log('[SettingsDrawer] 保存后立即验证:', verify === ncCookie ? '成功' : '失败');

    setCookieStatus('已保存!');
    setTimeout(() => setCookieStatus(''), 2000);
  };

  return (
    <>
      {/* 遮罩层 */}
      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      
      {/* 抽屉面板 */}
      <div className={`fixed top-0 right-0 h-full w-80 bg-[#1a1b23] border-l border-white/10 shadow-2xl z-[70] p-6 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        
        <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-4">
          <h2 className="text-xl font-bold text-white">设置</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-1">
            ✕
          </button>
        </div>

        <div className="space-y-8">
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">外观样式</h3>
            {/* 颜色选择 */}
            <div className="mb-5">
              <label className="block text-sm text-gray-300 mb-2">卡片基底色</label>
              <div className="flex gap-2">
                <input 
                  type="color" 
                  value={cardColor}
                  onChange={(e) => setCardColor(e.target.value)}
                  className="h-9 w-14 bg-transparent border border-white/20 rounded cursor-pointer"
                />
                <input 
                  type="text" 
                  value={cardColor}
                  onChange={(e) => setCardColor(e.target.value)}
                  className="flex-1 bg-black/20 border border-white/10 rounded px-3 text-sm text-gray-300 font-mono focus:border-blue-500/50 outline-none"
                />
              </div>
            </div>

            {/* 透明度 */}
            <div className="mb-6">
              <div className="flex justify-between mb-2">
                <label className="text-sm text-gray-300">磨砂透明度</label>
                <span className="text-xs text-gray-500">{cardOpacity.toFixed(1)}</span>
              </div>
              <input 
                type="range" 
                min="0.1" 
                max="1.0" 
                step="0.1"
                value={cardOpacity}
                onChange={(e) => setCardOpacity(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>

            <button 
              onClick={() => {
                setCardColor(defaultConfig.cardColor);
                setCardOpacity(defaultConfig.cardOpacity);
              }}
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors underline decoration-blue-400/30"
            >
              恢复默认外观
            </button>
          </div>

          {/* Cookie 配置区域 */}
          <div className="border-t border-white/10 pt-6">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">爬虫配置</h3>
            
            <div className="mb-4">
              <label className="block text-sm text-gray-300 mb-2 flex items-center justify-between">
                NowCoder Cookie
                <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded border border-blue-500/20">必填</span>
              </label>
              
              <textarea 
                rows={5}
                value={ncCookie}
                onChange={(e) => setNcCookie(e.target.value)}
                placeholder="粘贴 Cookie..."
                className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-[11px] text-gray-300 font-mono focus:border-blue-500/50 outline-none resize-none"
              />
            </div>

            <div className="flex justify-end items-center gap-3">
              {cookieStatus && <span className="text-xs text-green-400 font-bold animate-pulse">{cookieStatus}</span>}
              <button 
                onClick={handleSaveCookie}
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-2 px-5 rounded-lg transition-all active:scale-95"
              >
                保存配置
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SettingsDrawer;