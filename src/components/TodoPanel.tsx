import React, { useState, useEffect, useCallback } from 'react';
// [保留] 引入 DatePicker
import DatePicker from './DatePicker';

// --- 工具函数 (保留业务相关的日期计算) ---
const getLocalDateStr = (date: Date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const addDays = (dateStr: string, days: number) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return getLocalDateStr(date);
};

// --- 类型定义 ---
export interface TodoItem {
  id: string;
  title: string;
  link: string;
  note: string;
  completed: boolean;
  targetDate: string; // YYYY-MM-DD
  createdAt: number;
}

interface TodoPanelProps {
  cardStyle: React.CSSProperties;
}

const TodoPanel: React.FC<TodoPanelProps> = ({ cardStyle }) => {
  const [items, setItems] = useState<TodoItem[]>([]);
  const [viewDate, setViewDate] = useState(getLocalDateStr()); 
  
  const [newItem, setNewItem] = useState({ 
    title: '', 
    link: '', 
    note: '',
    targetDate: getLocalDateStr()
  });
  
  const [showCompleted, setShowCompleted] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // [新增] 提取加载逻辑为独立函数
  const loadItems = useCallback(() => {
    const saved = localStorage.getItem('cpc_todo_pool');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const migrated = parsed.map((item: any) => ({
          ...item,
          targetDate: item.targetDate || getLocalDateStr()
        }));
        setItems(migrated);
      } catch (e) { console.error(e); }
    }
  }, []);

  // [修改] 初始化 & 监听自定义事件
  useEffect(() => {
    loadItems(); // 首次加载

    // 监听来自 ContestList 的更新事件
    const handleUpdate = () => {
        loadItems();
    };
    window.addEventListener('cpc_todo_update', handleUpdate);

    return () => {
        window.removeEventListener('cpc_todo_update', handleUpdate);
    };
  }, [loadItems]);

  // [修改] 保存逻辑 (增加防抖或直接保存)
  // 注意：当 items 变更时，写入 storage。
  // 但如果 items 变更是因为 loadItems() 读取 storage 导致的，这里再次写入其实是多余的但无害。
  // 为了防止死循环 (load -> set -> effect -> save -> load)，我们需要小心。
  // 这里的依赖是 [items]，只有当用户操作导致 items 变化时，我们才保存。
  // 为了避免"监听事件更新了items -> 触发此effect -> 再次保存"，其实问题不大，因为数据是一致的。
  useEffect(() => {
    if (items.length > 0) { // 简单防止初始空数组覆盖（虽通常不会）
        localStorage.setItem('cpc_todo_pool', JSON.stringify(items));
    }
  }, [items]);

  // 同步添加栏日期
  useEffect(() => {
    setNewItem(prev => ({ ...prev, targetDate: viewDate }));
  }, [viewDate]);

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.title.trim()) return;

    const task: TodoItem = {
      id: crypto.randomUUID(),
      title: newItem.title,
      link: newItem.link,
      note: newItem.note,
      completed: false,
      targetDate: newItem.targetDate,
      createdAt: Date.now(),
    };

    setItems(prev => [task, ...prev]);
    setNewItem({ ...newItem, title: '', link: '', note: '' }); 
  };

  const toggleComplete = (id: string) => {
    setItems(items.map(item => item.id === id ? { ...item, completed: !item.completed } : item));
  };
  const requestDelete = (id: string) => setDeletingId(id);
  const confirmDelete = () => {
    if (deletingId) { setItems(items.filter(item => item.id !== deletingId)); setDeletingId(null); }
  };
  const cancelDelete = () => setDeletingId(null);

  // 筛选逻辑
  const todayStr = getLocalDateStr();
  const isViewToday = viewDate === todayStr;
  const visibleItems = items.filter(item => {
    if (item.targetDate === viewDate) return true;
    if (isViewToday && !item.completed && item.targetDate < todayStr) return true;
    return false;
  });
  const activeItems = visibleItems.filter(i => !i.completed);
  const completedItems = visibleItems.filter(i => i.completed);
  activeItems.sort((a, b) => a.targetDate.localeCompare(b.targetDate));

  return (
    <div className="grid grid-cols-1 gap-6 relative pb-20">
      
      {/* --- 日期导航栏 --- */}
      <div className="flex items-center justify-between bg-white/5 p-2 rounded-lg border border-white/10 backdrop-blur-sm z-20 relative">
        <button 
          onClick={() => setViewDate(addDays(viewDate, -1))}
          className="p-2 hover:bg-white/10 rounded-md text-gray-400 hover:text-white transition-colors"
        >
          ← Prev Day
        </button>
        
        {/* 使用提取出的 DatePicker */}
        <DatePicker 
          value={viewDate}
          onChange={(d) => setViewDate(d)}
          triggerContent={
            <div className="flex items-center gap-2 hover:bg-white/5 px-4 py-2 rounded-lg transition-colors group cursor-pointer">
               <span className="text-lg font-bold text-white group-hover:text-blue-300 transition-colors select-none">
                 {isViewToday ? 'Today' : viewDate}
               </span>
               <span className="text-xs text-gray-500 group-hover:text-blue-400">▼</span>
            </div>
          }
        />

        <div className="flex items-center gap-2">
           {!isViewToday && (
              <button 
                onClick={() => setViewDate(todayStr)}
                className="text-xs bg-blue-600/80 px-2 py-1 rounded text-white hover:bg-blue-500 absolute left-1/2 transform -translate-x-1/2 -bottom-6 shadow-lg"
              >
                Return to Today
              </button>
           )}
           <button 
             onClick={() => setViewDate(addDays(viewDate, 1))}
             className="p-2 hover:bg-white/10 rounded-md text-gray-400 hover:text-white transition-colors"
           >
             Next Day →
           </button>
        </div>
      </div>

      {/* --- 输入区域 --- */}
      <div 
        className="rounded-xl p-6 shadow-lg border border-white/5 relative z-10"
        style={cardStyle}
      >
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <span>📅</span> Plan for {isViewToday ? 'Today' : viewDate}
        </h2>
        
        <form onSubmit={handleAddItem} className="flex flex-col gap-3">
          <div className="flex gap-3">
            <div className="w-40 flex-shrink-0">
               <DatePicker 
                 value={newItem.targetDate}
                 onChange={(d) => setNewItem({...newItem, targetDate: d})}
               />
            </div>

            <input
              type="text"
              placeholder="Title / ID"
              className="flex-1 bg-black/20 border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition-colors placeholder-gray-500 text-white"
              value={newItem.title}
              onChange={e => setNewItem({...newItem, title: e.target.value})}
              required
            />
          </div>
          
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Problem Link (Optional)"
              className="flex-1 bg-black/20 border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition-colors placeholder-gray-500 text-white"
              value={newItem.link}
              onChange={e => setNewItem({...newItem, link: e.target.value})}
            />
            <input
              type="text"
              placeholder="Notes"
              className="flex-1 bg-black/20 border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition-colors placeholder-gray-500 text-white"
              value={newItem.note}
              onChange={e => setNewItem({...newItem, note: e.target.value})}
            />
            <button 
              type="submit"
              className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded font-medium text-sm transition-colors whitespace-nowrap shadow-lg shadow-blue-500/20"
            >
              Add Task
            </button>
          </div>
        </form>
      </div>

      {/* --- 列表区域 --- */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-gray-300 flex items-center gap-2">
          🎯 Active Tasks
          <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full text-gray-400">{activeItems.length}</span>
        </h3>
        
        {activeItems.length === 0 && (
          <div className="text-center py-12 border-2 border-dashed border-white/5 rounded-xl text-gray-500 select-none">
             No tasks for {viewDate}. <br/>
             <span className="text-sm opacity-70">Enjoy your free time!</span>
          </div>
        )}

        {activeItems.map(item => {
          const isOverdue = item.targetDate < todayStr;
          return (
            <div 
              key={item.id}
              className={`group relative rounded-lg p-4 border flex items-start gap-4 transition-all hover:bg-white/5 ${
                isOverdue 
                  ? 'border-red-500/40 bg-red-500/5 shadow-[0_0_15px_-5px_rgba(239,68,68,0.3)]' 
                  : 'border-white/5'
              }`}
              style={!isOverdue ? cardStyle : undefined}
            >
              <button
                type="button"
                onClick={() => toggleComplete(item.id)}
                className={`mt-1 w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                  isOverdue ? 'border-red-400 hover:border-red-300' : 'border-gray-500 hover:border-blue-400'
                }`}
                title="Mark as Solved"
              >
                <div className="w-2.5 h-2.5 bg-transparent" />
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <div className="flex flex-col gap-1 min-w-0 pr-4">
                    <a 
                      href={item.link} 
                      target="_blank" 
                      rel="noreferrer"
                      className={`font-medium hover:underline text-lg truncate block ${
                         isOverdue ? 'text-red-200 hover:text-white' : 'text-blue-300 hover:text-blue-200'
                      }`}
                      onClick={e => !item.link && e.preventDefault()}
                      style={{ cursor: item.link ? 'pointer' : 'default' }}
                    >
                      {item.title}
                    </a>
                    {isOverdue && (
                      <div className="flex items-center gap-2 text-xs font-bold text-red-400 animate-pulse">
                        <span>⚠ Overdue from {item.targetDate}</span>
                      </div>
                    )}
                  </div>
                  <button 
                    type="button"
                    onClick={() => requestDelete(item.id)}
                    className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-opacity px-2 flex-shrink-0"
                  >
                    ×
                  </button>
                </div>
                {item.link && <div className="text-xs text-gray-500 truncate mt-1 max-w-full font-mono opacity-70">{item.link}</div>}
                {item.note && <div className="mt-2 text-sm text-gray-400 bg-black/20 inline-block px-2 py-1 rounded max-w-full truncate">{item.note}</div>}
              </div>
            </div>
          );
        })}
      </div>

      {/* --- 已完成列表 --- */}
      {completedItems.length > 0 && (
        <div className="mt-8 border-t border-white/10 pt-4">
          <button 
            type="button"
            onClick={() => setShowCompleted(!showCompleted)}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm font-medium mb-4"
          >
            <span>{showCompleted ? '▼' : '▶'}</span>
            Done in {viewDate} ({completedItems.length})
          </button>

          {showCompleted && (
            <div className="space-y-2 opacity-75">
              {completedItems.map(item => (
                <div key={item.id} className="rounded-lg p-3 border border-white/5 flex items-center gap-3 bg-black/20">
                  <button type="button" onClick={() => toggleComplete(item.id)} className="w-5 h-5 rounded border border-green-500 bg-green-500/20 flex items-center justify-center text-green-500">✓</button>
                  <div className="flex flex-col flex-1 min-w-0">
                      <span className="text-gray-500 line-through truncate">{item.title}</span>
                      {item.targetDate !== viewDate && <span className="text-xs text-gray-600">Plan: {item.targetDate}</span>}
                  </div>
                  <button type="button" onClick={() => requestDelete(item.id)} className="text-gray-600 hover:text-red-400 px-2">×</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* --- 确认弹窗 (保留) --- */}
      {deletingId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-xl border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" style={{ ...cardStyle, backgroundColor: 'rgba(30, 41, 59, 0.95)' }}>
            <div className="p-6">
              <h3 className="text-xl font-bold text-white mb-2">Confirm Deletion</h3>
              <p className="text-gray-400 text-sm">Are you sure you want to remove this problem from your list?</p>
            </div>
            <div className="flex border-t border-white/10">
              <button type="button" onClick={cancelDelete} className="flex-1 px-4 py-3 text-gray-300 hover:bg-white/5 hover:text-white transition-colors text-sm font-medium">Cancel</button>
              <div className="w-px bg-white/10"></div>
              <button type="button" onClick={confirmDelete} className="flex-1 px-4 py-3 text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors text-sm font-medium">Delete</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default TodoPanel;