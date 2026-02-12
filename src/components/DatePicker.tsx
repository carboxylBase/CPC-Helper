import React, { useState, useEffect, useRef } from 'react';

// --- 内部辅助函数 (仅供日历使用) ---
const getLocalDateStr = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// --- [核心子组件] 日历面板 ---
const CalendarPanel = ({ 
  selectedDate, 
  onSelect, 
  onClose 
}: { 
  selectedDate: string, 
  onSelect: (date: string) => void, 
  onClose: () => void 
}) => {
  const [currentDate, setCurrentDate] = useState(() => {
    // 容错处理：如果 selectedDate 无效，默认今天
    const parts = selectedDate.split('-').map(Number);
    if (parts.length === 3) {
      return new Date(parts[0], parts[1] - 1, parts[2]);
    }
    return new Date();
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); 
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const handleDayClick = (day: number) => {
    // 构造 YYYY-MM-DD
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onSelect(dateStr);
    onClose();
  };

  const isToday = (d: number) => {
    const today = new Date();
    return year === today.getFullYear() && month === today.getMonth() && d === today.getDate();
  };

  const isSelected = (d: number) => {
    const [sy, sm, sd] = selectedDate.split('-').map(Number);
    return year === sy && month + 1 === sm && d === sd;
  };

  return (
    <div className="w-64 p-4 rounded-xl shadow-2xl border border-white/10 backdrop-blur-xl bg-[#1a1b26]/95 animate-in zoom-in-95 duration-200 z-50 select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button type="button" onClick={handlePrevMonth} className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors">←</button>
        <div className="font-bold text-white">
          {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </div>
        <button type="button" onClick={handleNextMonth} className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors">→</button>
      </div>

      {/* Week Days */}
      <div className="grid grid-cols-7 gap-1 mb-2 text-center text-xs text-gray-500 font-medium">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => <div key={d}>{d}</div>)}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
        
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const d = i + 1;
          const selected = isSelected(d);
          const today = isToday(d);
          return (
            <button
              key={d}
              type="button" 
              onClick={(e) => { e.stopPropagation(); handleDayClick(d); }}
              className={`h-8 w-8 rounded-full flex items-center justify-center text-sm transition-all ${
                selected 
                  ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' 
                  : today 
                    ? 'border border-blue-500 text-blue-400' 
                    : 'text-gray-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              {d}
            </button>
          );
        })}
      </div>
      
      {/* Footer Close */}
      <div className="mt-3 pt-3 border-t border-white/10 text-center">
         <button type="button" onClick={onClose} className="text-xs text-gray-500 hover:text-white transition-colors">Close</button>
      </div>
    </div>
  );
};

// --- [主导出组件] DatePicker ---
interface DatePickerProps {
  value: string;             // YYYY-MM-DD
  onChange: (date: string) => void;
  className?: string;        // 允许外部传入样式
  triggerContent?: React.ReactNode; // 允许自定义触发按钮的内容
}

const DatePicker: React.FC<DatePickerProps> = ({ value, onChange, className, triggerContent }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭逻辑
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className={`relative ${className || ''}`} ref={containerRef}>
      {/* Trigger Button */}
      <button 
        type="button" 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-full flex items-center justify-center focus:outline-none"
      >
        {triggerContent || (
          // 默认外观：类似 Input 的按钮
          <div className="flex items-center gap-2 bg-black/20 border border-white/10 rounded px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors w-full">
            <span>📅</span>
            <span>{value || getLocalDateStr(new Date())}</span>
          </div>
        )}
      </button>

      {/* Popup - 绝对定位 */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 z-50">
          <CalendarPanel 
            selectedDate={value} 
            onSelect={(d) => { onChange(d); setIsOpen(false); }} 
            onClose={() => setIsOpen(false)} 
          />
        </div>
      )}
    </div>
  );
};

export default DatePicker;