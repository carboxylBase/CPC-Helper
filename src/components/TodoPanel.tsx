import React, { useState, useEffect, useCallback, useMemo } from 'react';
// [保留] 引入项目自定义的 DatePicker
import DatePicker from './DatePicker';

// --- 工具函数 ---

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

const getTimestampFromStr = (dateStr: string) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).getTime();
};

const isDateInRange = (dateToCheck: string, startDate: string, duration: number) => {
  const startTs = getTimestampFromStr(startDate);
  const checkTs = getTimestampFromStr(dateToCheck);
  const dayMs = 24 * 60 * 60 * 1000;
  const endTs = startTs + (duration * dayMs); 
  return checkTs >= startTs && checkTs < endTs;
};

// --- 类型定义 ---
export interface TodoItem {
  id: string;
  title: string;
  link: string;
  note: string;
  completed: boolean;
  targetDate: string; 
  createdAt: number;
  startDate: string;   
  duration: number;    
}

// 专门为编辑表单定义的类型，支持 duration 为空
interface EditFormState extends Omit<TodoItem, 'duration'> {
  duration: number | '';
}

interface TodoPanelProps {
  cardStyle: React.CSSProperties;
}

const TodoPanel: React.FC<TodoPanelProps> = ({ cardStyle }) => {
  const [items, setItems] = useState<TodoItem[]>([]);
  const [viewDate, setViewDate] = useState(getLocalDateStr()); 
  
  // 新增任务表单状态
  const [newItem, setNewItem] = useState<{
    title: string;
    link: string;
    note: string;
    startDate: string;
    duration: number | '';
  }>({ 
    title: '', 
    link: '', 
    note: '',
    startDate: getLocalDateStr(),
    duration: 1
  });
  
  // 编辑态管理
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditFormState | null>(null);

  const [showCompleted, setShowCompleted] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 3600000);
    return () => clearInterval(timer);
  }, []);

  const loadItems = useCallback(() => {
    const saved = localStorage.getItem('cpc_todo_pool');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const migrated = parsed.map((item: any) => ({
          ...item,
          startDate: item.startDate || item.targetDate || getLocalDateStr(),
          targetDate: item.targetDate || item.startDate || getLocalDateStr(),
          duration: Number(item.duration) || 1
        }));
        setItems(migrated);
      } catch (e) { console.error(e); }
    }
  }, []);

  useEffect(() => {
    loadItems();
    const handleUpdate = () => loadItems();
    window.addEventListener('cpc_todo_update', handleUpdate);
    return () => window.removeEventListener('cpc_todo_update', handleUpdate);
  }, [loadItems]);

  useEffect(() => {
    if (items.length >= 0) {
        localStorage.setItem('cpc_todo_pool', JSON.stringify(items));
    }
  }, [items]);

  useEffect(() => {
    setNewItem(prev => ({ ...prev, startDate: viewDate }));
  }, [viewDate]);

  // --- 核心业务逻辑 ---

  const getProgressStyles = (item: TodoItem) => {
    if (item.completed) return { border: 'border-white/5', text: 'text-blue-300', label: 'Finished' };
    const startTs = getTimestampFromStr(item.startDate);
    const dayMs = 24 * 60 * 60 * 1000;
    const totalMs = item.duration * dayMs;
    const elapsed = now - startTs;
    const progress = elapsed / totalMs;
    if (progress < 0) return { border: 'border-white/10', text: 'text-gray-400', label: 'Scheduled' };
    if (progress < 0.5) return { border: 'border-blue-500/30', text: 'text-blue-300', label: 'Early Stage' };
    if (progress < 0.8) return { border: 'border-yellow-500/40', text: 'text-yellow-400', label: 'In Progress' };
    if (progress < 1.0) return { border: 'border-orange-500/60', text: 'text-orange-400', label: 'Deadline Near' };
    return { border: 'border-red-500/80', text: 'text-red-400', label: 'Overdue' };
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.title.trim()) return;
    const task: TodoItem = {
      id: crypto.randomUUID(),
      title: newItem.title,
      link: newItem.link,
      note: newItem.note,
      completed: false,
      startDate: newItem.startDate,
      targetDate: newItem.startDate, 
      duration: newItem.duration === '' ? 1 : newItem.duration,
      createdAt: Date.now(),
    };
    setItems(prev => [task, ...prev]);
    setNewItem({ ...newItem, title: '', link: '', note: '', duration: 1 }); 
  };

  const toggleComplete = (id: string) => {
    setItems(items.map(item => item.id === id ? { ...item, completed: !item.completed } : item));
  };

  const startEdit = (item: TodoItem) => {
    setEditingId(item.id);
    setEditForm({ ...item });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
  };

  const saveEdit = () => {
    if (!editForm || !editForm.title.trim()) return;
    // 强制转换 duration 为数字，防止空字符串存入
    const updatedItem: TodoItem = {
      ...editForm,
      duration: editForm.duration === '' ? 1 : Number(editForm.duration)
    };
    setItems(prev => prev.map(it => it.id === updatedItem.id ? updatedItem : it));
    setEditingId(null);
    setEditForm(null);
  };

  const requestDelete = (id: string) => setDeletingId(id);
  const confirmDelete = () => {
    if (deletingId) { setItems(items.filter(item => item.id !== deletingId)); setDeletingId(null); }
  };
  const cancelDelete = () => setDeletingId(null);

  const todayStr = getLocalDateStr();
  const isViewToday = viewDate === todayStr;

  const visibleItems = items.filter(item => {
    const inRange = isDateInRange(viewDate, item.startDate, item.duration);
    if (inRange) return true;
    const endTs = getTimestampFromStr(item.startDate) + (item.duration * 24 * 60 * 60 * 1000);
    const isPast = endTs <= getTimestampFromStr(todayStr);
    if (isViewToday && !item.completed && isPast) return true;
    return false;
  });

  const activeItems = visibleItems.filter(i => !i.completed);
  const completedItems = visibleItems.filter(i => i.completed);
  activeItems.sort((a, b) => a.startDate.localeCompare(b.startDate));

  return (
    <div className="grid grid-cols-1 gap-6 relative pb-20">
      
      {/* 1. 日期导航栏 */}
      <div className="flex items-center justify-between bg-white/5 p-2 rounded-lg border border-white/10 backdrop-blur-sm z-20 relative">
        <button onClick={() => setViewDate(addDays(viewDate, -1))} className="p-2 hover:bg-white/10 rounded-md text-gray-400 hover:text-white transition-colors">← Prev Day</button>
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
              <button onClick={() => setViewDate(todayStr)} className="text-xs bg-blue-600/80 px-2 py-1 rounded text-white hover:bg-blue-500 absolute left-1/2 transform -translate-x-1/2 -bottom-6 shadow-lg">Return to Today</button>
           )}
           <button onClick={() => setViewDate(addDays(viewDate, 1))} className="p-2 hover:bg-white/10 rounded-md text-gray-400 hover:text-white transition-colors">Next Day →</button>
        </div>
      </div>

      {/* 2. 快速添加任务区域 */}
      <div className="rounded-xl p-6 shadow-lg border border-white/5 relative z-10" style={cardStyle}>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-white/90">
          <span>📝</span> Create Multi-day Plan
        </h2>
        <form onSubmit={handleAddItem} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-6 flex flex-col gap-1">
              <label className="text-[10px] text-gray-500 uppercase px-1 font-bold">Task Title</label>
              <input
                type="text"
                placeholder="Target problem or topic..."
                className="bg-black/20 border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500 text-white"
                value={newItem.title}
                onChange={e => setNewItem({...newItem, title: e.target.value})}
                required
              />
            </div>
            <div className="md:col-span-3 flex flex-col gap-1">
              <label className="text-[10px] text-gray-500 uppercase px-1 font-bold">Start Date</label>
              <DatePicker 
                value={newItem.startDate}
                onChange={(d) => setNewItem({...newItem, startDate: d})}
              />
            </div>
            <div className="md:col-span-3 flex flex-col gap-1">
              <label className="text-[10px] text-gray-500 uppercase px-1 font-bold">Duration (Days)</label>
              <input
                type="number"
                min="1"
                placeholder="1"
                className="bg-black/20 border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500 text-white"
                value={newItem.duration}
                onChange={e => {
                  const val = e.target.value;
                  setNewItem({...newItem, duration: val === '' ? '' : Number(val)});
                }}
              />
            </div>
          </div>
          <div className="flex flex-col md:flex-row gap-3">
            <input
              type="text"
              placeholder="Link (Optional)"
              className="flex-1 bg-black/20 border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500 placeholder-gray-500 text-white"
              value={newItem.link}
              onChange={e => setNewItem({...newItem, link: e.target.value})}
            />
            <input
              type="text"
              placeholder="Notes"
              className="flex-1 bg-black/20 border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500 placeholder-gray-500 text-white"
              value={newItem.note}
              onChange={e => setNewItem({...newItem, note: e.target.value})}
            />
            <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-2 rounded font-bold text-sm transition-colors shadow-lg shadow-blue-500/20">Add Task</button>
          </div>
        </form>
      </div>

      {/* 3. 活跃任务列表 */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-gray-300 flex items-center gap-2">
          🎯 Active Problems
          <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full text-gray-400">{activeItems.length}</span>
        </h3>
        
        {activeItems.length === 0 && (
          <div className="text-center py-12 border-2 border-dashed border-white/5 rounded-xl text-gray-500">No active tasks for {viewDate}.</div>
        )}

        {activeItems.map(item => {
          const isEditing = editingId === item.id;
          const status = getProgressStyles(item);
          const startTs = getTimestampFromStr(item.startDate);
          const dayMs = 24 * 60 * 60 * 1000;
          const progressPercent = Math.min(Math.max(((now - startTs) / (item.duration * dayMs)) * 100, 0), 100);

          if (isEditing && editForm) {
            // --- 编辑态视图 ---
            return (
              <div 
                key={item.id} 
                className="rounded-lg p-4 border border-blue-500/50 bg-blue-500/5 shadow-lg animate-in zoom-in-95 duration-200 relative z-30" 
                style={cardStyle}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-blue-400 uppercase font-bold px-1">Title</label>
                    <input 
                      className="bg-black/40 border border-white/10 rounded px-2 py-1.5 text-sm text-white focus:border-blue-500 outline-none"
                      value={editForm.title}
                      onChange={e => setEditForm({...editForm, title: e.target.value})}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-blue-400 uppercase font-bold px-1">Link</label>
                    <input 
                      className="bg-black/40 border border-white/10 rounded px-2 py-1.5 text-sm text-white focus:border-blue-500 outline-none"
                      value={editForm.link}
                      onChange={e => setEditForm({...editForm, link: e.target.value})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
                   <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-blue-400 uppercase font-bold px-1">Start Date</label>
                    {/* [修复] DatePicker 在编辑模式下的 z-index 优先级通过父级 z-30 提升 */}
                    <DatePicker value={editForm.startDate} onChange={d => setEditForm({...editForm, startDate: d})} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-blue-400 uppercase font-bold px-1">Duration (Days)</label>
                    <input 
                      type="number"
                      placeholder="1"
                      className="bg-black/40 border border-white/10 rounded px-2 py-1.5 text-sm text-white focus:border-blue-500 outline-none"
                      // [修复] 允许清空
                      value={editForm.duration}
                      onChange={e => {
                        const val = e.target.value;
                        setEditForm({...editForm, duration: val === '' ? '' : Number(val)});
                      }}
                    />
                  </div>
                  <div className="flex flex-col gap-1 col-span-2 md:col-span-1">
                    <label className="text-[10px] text-blue-400 uppercase font-bold px-1">Note</label>
                    <input 
                      className="bg-black/40 border border-white/10 rounded px-2 py-1.5 text-sm text-white focus:border-blue-500 outline-none"
                      value={editForm.note}
                      onChange={e => setEditForm({...editForm, note: e.target.value})}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                   <button onClick={cancelEdit} className="px-3 py-1 text-xs text-gray-400 hover:text-white transition-colors">Cancel</button>
                   <button onClick={saveEdit} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1 rounded text-xs font-bold transition-colors">Save Changes</button>
                </div>
              </div>
            );
          }

          // --- 普通展示视图 ---
          return (
            <div 
              key={item.id}
              onClick={() => startEdit(item)}
              className={`group relative rounded-lg p-4 border flex items-start gap-4 transition-all hover:bg-white/5 cursor-pointer overflow-hidden ${status.border}`}
              style={status.label === 'Early Stage' ? cardStyle : { backgroundColor: 'rgba(15, 23, 42, 0.4)' }}
            >
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); toggleComplete(item.id); }}
                className="mt-1 w-5 h-5 rounded border border-gray-500 hover:border-blue-400 flex items-center justify-center flex-shrink-0"
              >
                <div className="w-2.5 h-2.5 bg-transparent" />
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <div className="flex flex-col gap-1 min-w-0 pr-4">
                    <span className={`font-medium text-lg truncate block ${status.text}`}>
                      {item.title}
                    </span>
                    <div className="flex items-center gap-3 text-[10px] font-bold tracking-wider uppercase">
                      <span className={status.text}>{status.label}</span>
                      <span className="text-gray-500">🗓 {item.duration} Day(s)</span>
                      <span className="text-gray-500">Starts: {item.startDate}</span>
                    </div>
                  </div>
                  <button 
                    type="button" 
                    onClick={(e) => { e.stopPropagation(); requestDelete(item.id); }}
                    className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-opacity px-2"
                  >
                    ×
                  </button>
                </div>
                {(item.link || item.note) && (
                  <div className="mt-2 flex gap-2 flex-wrap">
                    {item.link && <span className="text-xs text-blue-400/70 truncate max-w-[200px]">{item.link}</span>}
                    {item.note && <span className="text-xs text-gray-400 bg-black/30 px-2 py-0.5 rounded truncate max-w-[300px]">{item.note}</span>}
                  </div>
                )}
              </div>

              {/* 进度条 */}
              <div 
                className="absolute bottom-0 left-0 h-[2px] opacity-40 transition-all duration-700"
                style={{ 
                    width: `${progressPercent}%`, 
                    backgroundColor: 'currentColor',
                    color: status.text.includes('red') ? '#ef4444' : (status.text.includes('orange') ? '#f97316' : (status.text.includes('yellow') ? '#eab308' : '#3b82f6'))
                }}
              />
            </div>
          );
        })}
      </div>

      {/* 4. 已完成列表 */}
      {completedItems.length > 0 && (
        <div className="mt-8 border-t border-white/10 pt-4">
          <button 
            type="button"
            onClick={() => setShowCompleted(!showCompleted)}
            className="flex items-center gap-2 text-gray-400 hover:text-white text-sm font-medium mb-4"
          >
            <span>{showCompleted ? '▼' : '▶'}</span>
            Done ({completedItems.length})
          </button>
          {showCompleted && (
            <div className="space-y-2 opacity-75">
              {completedItems.map(item => (
                <div key={item.id} className="rounded-lg p-3 border border-white/5 flex items-center gap-3 bg-black/20">
                  <button type="button" onClick={() => toggleComplete(item.id)} className="w-5 h-5 rounded border border-green-500 bg-green-500/20 flex items-center justify-center text-green-500 flex-shrink-0">✓</button>
                  <div className="flex flex-col flex-1 min-w-0">
                      <span className="text-gray-500 line-through truncate">{item.title}</span>
                      <span className="text-[10px] text-gray-600 uppercase font-bold">Duration: {item.duration}d | Start: {item.startDate}</span>
                  </div>
                  <button type="button" onClick={() => requestDelete(item.id)} className="text-gray-600 hover:text-red-400 px-2">×</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. 确认弹窗 */}
      {deletingId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-white/10 shadow-2xl overflow-hidden" style={{ ...cardStyle, backgroundColor: 'rgba(30, 41, 59, 0.98)' }}>
            <div className="p-6">
              <h3 className="text-xl font-bold text-white mb-2">Delete Task?</h3>
              <p className="text-gray-400 text-sm">This will remove the task from all days in its period.</p>
            </div>
            <div className="flex border-t border-white/10">
              <button type="button" onClick={cancelDelete} className="flex-1 px-4 py-3 text-gray-300 hover:bg-white/5 text-sm font-medium">Cancel</button>
              <div className="w-px bg-white/10"></div>
              <button type="button" onClick={confirmDelete} className="flex-1 px-4 py-3 text-red-400 hover:bg-red-500/10 text-sm font-medium">Delete</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default TodoPanel;