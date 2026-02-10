import { useEffect, useState } from 'react';
import { fetchAllContests, fetchUserStats } from './services/contestService';
import { Contest, UserStats } from './types';
import { getPlatformColor, formatTime, formatDate, hexToRgba, getRatingColor } from './utils';
import { open } from '@tauri-apps/plugin-shell';

// --- Icons ---
const SettingsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.74v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
);

const CloseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
);

const ExternalLinkIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
);

const RefreshIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
);

const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
);

const DEFAULT_CONFIG = {
  cardColor: '#1f2937', 
  cardOpacity: 0.6,
};

type Tab = 'contests' | 'profile';

// --- Sub-Component: Platform Stats Card ---
// 每一个平台的独立卡片组件
interface PlatformCardProps {
  platformName: string;
  platformKey: string; // 用于 API 调用
  cardStyle: any;
  isEnabled?: boolean; // 是否已实现
}

const PlatformCard = ({ platformName, platformKey, cardStyle, isEnabled = false }: PlatformCardProps) => {
  const [handle, setHandle] = useState('');
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load saved handle specific to this platform
  useEffect(() => {
    const saved = localStorage.getItem(`cpc_handle_${platformKey}`);
    if (saved) setHandle(saved);
  }, [platformKey]);

  const handleSearch = async () => {
    if (!isEnabled || !handle.trim()) return;
    
    setLoading(true);
    setError(null);
    setStats(null);
    localStorage.setItem(`cpc_handle_${platformKey}`, handle);

    try {
      const data = await fetchUserStats(platformKey, handle);
      setStats(data);
    } catch (err: any) {
      setError('Not Found');
    } finally {
      setLoading(false);
    }
  };

  const color = getPlatformColor(platformName);

  return (
    <div 
      className="relative rounded-2xl p-4 border border-white/5 flex flex-col h-full transition-all duration-300 hover:shadow-lg"
      style={cardStyle}
    >
      {/* Top Border Color Bar */}
      <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl" style={{ backgroundColor: color }}></div>

      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <span className="font-bold text-lg text-white/90">{platformName}</span>
        {stats && stats.rank && (
          <span className="text-xs font-mono uppercase bg-white/5 px-2 py-0.5 rounded text-gray-400">
            {stats.rank}
          </span>
        )}
      </div>

      {/* Input Area (Compact) */}
      <div className="flex gap-2 mb-3">
        <input 
          type="text" 
          className="bg-black/20 text-white text-sm rounded-lg px-3 py-1.5 w-full outline-none focus:ring-1 focus:ring-blue-500/50 border border-white/5 placeholder-gray-600" 
          placeholder="Handle / ID" 
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          disabled={!isEnabled}
        />
        <button 
          onClick={handleSearch}
          disabled={!isEnabled || loading}
          className="bg-white/10 hover:bg-white/20 text-white rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <SearchIcon />}
        </button>
      </div>

      {/* Result Display Area (Inside the Grid) */}
      <div className="flex-1 min-h-[60px] flex items-center justify-center bg-black/10 rounded-xl p-2 border border-white/5 relative overflow-hidden">
        
        {!isEnabled ? (
          <span className="text-xs text-gray-600 italic">Coming Soon</span>
        ) : error ? (
           <span className="text-xs text-red-400">{error}</span>
        ) : stats ? (
          <div className="w-full grid grid-cols-2 divide-x divide-white/10">
            {/* Rating Section */}
            <div className="flex flex-col items-center justify-center p-1">
              <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-0.5">Rating</span>
              <span className="text-xl font-bold" style={{ color: getRatingColor(stats.rating) }}>
                {stats.rating || '-'}
              </span>
            </div>
            {/* Solved Section */}
            <div className="flex flex-col items-center justify-center p-1">
              <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-0.5">Solved</span>
              <span className="text-xl font-bold text-white">
                {stats.solved_count}
              </span>
            </div>
          </div>
        ) : (
          <span className="text-xs text-gray-600">Enter handle to view stats</span>
        )}
      </div>
    </div>
  );
};


function App() {
  // --- Global State ---
  const [activeTab, setActiveTab] = useState<Tab>('contests');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [cardColor, setCardColor] = useState(DEFAULT_CONFIG.cardColor);
  const [cardOpacity, setCardOpacity] = useState(DEFAULT_CONFIG.cardOpacity);

  // --- Contests State ---
  const [contests, setContests] = useState<Contest[]>([]);
  const [contestsLoading, setContestsLoading] = useState(true);
  const [contestsError, setContestsError] = useState<string | null>(null);

  useEffect(() => {
    loadContests();
    const savedColor = localStorage.getItem('cpc_card_color');
    const savedOpacity = localStorage.getItem('cpc_card_opacity');
    if (savedColor) setCardColor(savedColor);
    if (savedOpacity) setCardOpacity(parseFloat(savedOpacity));
  }, []);

  useEffect(() => {
    localStorage.setItem('cpc_card_color', cardColor);
    localStorage.setItem('cpc_card_opacity', cardOpacity.toString());
  }, [cardColor, cardOpacity]);

  const loadContests = async () => {
    setContestsLoading(true);
    setContestsError(null);
    try {
      const data = await fetchAllContests();
      setContests(data);
    } catch (err) {
      setContestsError('Failed to fetch contests.');
    } finally {
      setContestsLoading(false);
    }
  };

  const handleOpenLink = async (url: string) => {
    try {
      await open(url);
    } catch (err) {
      console.error('Failed to open link:', err);
    }
  };

  const cardStyle = {
    backgroundColor: hexToRgba(cardColor, cardOpacity),
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
  };

  return (
    <div className="min-h-screen text-slate-200">
      
      {/* 1. Main Content */}
      <div className={`transition-all duration-500 ease-out ${isSettingsOpen ? 'blur-sm scale-[0.98] opacity-60' : ''}`}>
        <div className="container mx-auto p-6 max-w-4xl"> {/* Increased max-width for grid */}
          
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                CPC Helper
              </h1>
              <p className="text-gray-400 text-sm mt-1">
                {activeTab === 'contests' ? 'Upcoming Algorithms Contests' : 'Multi-Platform Solver Tracker'}
              </p>
            </div>
            
            <div className="flex gap-2">
              <button 
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                className={`p-2 rounded-full transition-all duration-300 z-50 relative ${isSettingsOpen ? 'bg-white/20 text-white rotate-90' : 'hover:bg-white/10 text-gray-300'}`}
                title="Appearance Settings"
              >
                <SettingsIcon />
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-4 mb-6 border-b border-white/10 pb-2">
            <button
              onClick={() => setActiveTab('contests')}
              className={`pb-2 px-1 text-sm font-medium transition-colors relative ${
                activeTab === 'contests' ? 'text-blue-400' : 'text-gray-400 hover:text-white'
              }`}
            >
              Contest Calendar
              {activeTab === 'contests' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-400 rounded-t-full" />}
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`pb-2 px-1 text-sm font-medium transition-colors relative ${
                activeTab === 'profile' ? 'text-blue-400' : 'text-gray-400 hover:text-white'
              }`}
            >
              My Stats Dashboard
              {activeTab === 'profile' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-400 rounded-t-full" />}
            </button>
          </div>

          {/* === Tab Content: Contests === */}
          {activeTab === 'contests' && (
            <div className="animate-fade-in">
               <div className="flex justify-end mb-4">
                 <button 
                  onClick={loadContests}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-sm text-gray-300 transition-colors"
                >
                  <RefreshIcon /> Refresh
                </button>
               </div>

              {contestsError && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-200 p-4 rounded-lg mb-6 text-sm">
                  {contestsError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-20">
                {contestsLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-28 rounded-2xl animate-pulse bg-gray-800/50"></div>
                  ))
                ) : contests.length === 0 ? (
                  <div className="col-span-full text-center py-10 text-gray-500">
                    No upcoming contests found.
                  </div>
                ) : (
                  contests.map((contest, index) => (
                    <div 
                      key={`${contest.platform}-${index}`}
                      className="relative rounded-2xl p-5 transition-all duration-300 hover:scale-[1.01] hover:shadow-lg group border border-white/5 flex flex-col justify-between h-full"
                      style={cardStyle}
                    >
                      <div 
                        className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-2xl"
                        style={{ backgroundColor: getPlatformColor(contest.platform) }}
                      />
                      <div className="flex justify-between items-start pl-3 mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span 
                              className="text-[10px] font-bold px-1.5 py-0.5 rounded text-white/90 shadow-sm uppercase tracking-wide"
                              style={{ backgroundColor: getPlatformColor(contest.platform) }}
                            >
                              {contest.platform}
                            </span>
                            <span className="text-gray-400 text-xs font-mono">
                              {formatDate(contest.start_time)} {formatTime(contest.start_time)}
                            </span>
                          </div>
                          <h3 
                            className="text-base font-semibold text-white/90 leading-tight cursor-pointer hover:text-blue-300 transition-colors line-clamp-2"
                            onClick={() => handleOpenLink(contest.url)}
                            title={contest.name}
                          >
                            {contest.name}
                          </h3>
                        </div>
                        <button 
                          onClick={() => handleOpenLink(contest.url)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-gray-400 hover:text-white"
                        >
                          <ExternalLinkIcon />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* === Tab Content: Profile (GRID DASHBOARD) === */}
          {activeTab === 'profile' && (
            <div className="animate-fade-in pb-20">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                
                {/* 1. Codeforces (Enabled) */}
                <PlatformCard 
                  platformName="Codeforces" 
                  platformKey="codeforces"
                  cardStyle={cardStyle}
                  isEnabled={true} 
                />

                {/* 2. LeetCode (Placeholder) */}
                <PlatformCard 
                  platformName="LeetCode" 
                  platformKey="leetcode"
                  cardStyle={cardStyle}
                  isEnabled={false} 
                />

                {/* 3. AtCoder (Placeholder) */}
                <PlatformCard 
                  platformName="AtCoder" 
                  platformKey="atcoder"
                  cardStyle={cardStyle}
                  isEnabled={false} 
                />

                 {/* 4. NowCoder (Placeholder) */}
                 <PlatformCard 
                  platformName="NowCoder" 
                  platformKey="nowcoder"
                  cardStyle={cardStyle}
                  isEnabled={false} 
                />
                 
                 {/* 5. HDU (Placeholder) */}
                 <PlatformCard 
                  platformName="HDU" 
                  platformKey="hdu"
                  cardStyle={cardStyle}
                  isEnabled={false} 
                />

              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. Drawer Panel (Settings) */}
      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-500 ${
          isSettingsOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsSettingsOpen(false)}
        aria-hidden="true"
      />

      <div 
        className={`fixed top-0 right-0 h-full w-80 bg-[#161f30] border-l border-white/10 shadow-2xl z-50 transform transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          isSettingsOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="p-6 h-full flex flex-col">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-xl font-bold text-white tracking-wide">Appearance</h2>
            <button 
              onClick={() => setIsSettingsOpen(false)}
              className="text-gray-400 hover:text-white transition-colors p-2 rounded hover:bg-white/10"
            >
              <CloseIcon />
            </button>
          </div>

          <div className="space-y-8 flex-1">
            <div className="space-y-3">
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                Card Background
              </label>
              <div className="flex items-center gap-4 bg-black/20 p-3 rounded-lg border border-white/5">
                <input 
                  type="color" 
                  value={cardColor}
                  onChange={(e) => setCardColor(e.target.value)}
                  className="h-8 w-8 rounded cursor-pointer bg-transparent border-0 p-0"
                />
                <div className="flex flex-col">
                    <span className="text-white font-mono text-sm">{cardColor}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between">
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Opacity</label>
                <span className="text-sm text-blue-400 font-mono font-bold">{Math.round(cardOpacity * 100)}%</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.05"
                value={cardOpacity}
                onChange={(e) => setCardOpacity(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400"
              />
            </div>
            
            <div className="pt-6 border-t border-white/10">
              <p className="text-xs text-gray-500 mb-3 uppercase tracking-wider">Live Preview</p>
              <div 
                className="rounded-xl p-4 border border-white/5 transition-colors duration-200"
                style={{ 
                  backgroundColor: hexToRgba(cardColor, cardOpacity),
                  backdropFilter: 'blur(12px)'
                }}
              >
                <div className="h-4 w-3/4 bg-gray-200/20 rounded mb-2"></div>
                <div className="h-3 w-1/2 bg-gray-400/20 rounded"></div>
              </div>
            </div>
          </div>

          <div className="mt-auto">
            <button 
              onClick={() => {
                  setCardColor(DEFAULT_CONFIG.cardColor);
                  setCardOpacity(DEFAULT_CONFIG.cardOpacity);
              }}
              className="w-full py-3 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors border border-dashed border-gray-700 hover:border-gray-500"
            >
              Reset to Defaults
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;