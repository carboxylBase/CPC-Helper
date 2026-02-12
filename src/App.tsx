import { useEffect, useState, useRef } from 'react';
import { hexToRgba } from './utils';
import { SettingsIcon } from './components/Icons';
import ContestList from './components/ContestList';
import DashboardGrid from './components/DashboardGrid';
import SettingsDrawer from './components/SettingsDrawer';
import TodoPanel from './components/TodoPanel';

import { check } from '@tauri-apps/plugin-updater';
import { ask } from '@tauri-apps/plugin-dialog';
import { relaunch } from '@tauri-apps/plugin-process';

const DEFAULT_CONFIG = {
  cardColor: '#1f2937', 
  cardOpacity: 0.6,
};

type Tab = 'contests' | 'profile' | 'todo';

function App() {
  // --- Global State ---
  const [activeTab, setActiveTab] = useState<Tab>('contests');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [cardColor, setCardColor] = useState(DEFAULT_CONFIG.cardColor);
  const [cardOpacity, setCardOpacity] = useState(DEFAULT_CONFIG.cardOpacity);

  // --- Animation Refs & State ---
  const tabsRef = useRef<{ [key in Tab]?: HTMLButtonElement | null }>({});
  const [tabIndicatorStyle, setTabIndicatorStyle] = useState({ left: 0, width: 0 });

  // --- Automatic Update Check ---
  useEffect(() => {
    const initCheckUpdate = async () => {
      try {
        const update = await check();
        if (update?.available) {
          const yes = await ask(
            `Discover new version v${update.version}!\n\nRelease Notes:\n${update.body}`, 
            {
              title: 'Update Available',
              kind: 'info',
              okLabel: 'Update Now',
              cancelLabel: 'Later'
            }
          );

          if (yes) {
            await update.downloadAndInstall();
            await relaunch();
          }
        }
      } catch (error) {
        console.error('Failed to check for updates:', error);
      }
    };

    initCheckUpdate();
  }, []);

  // --- Persistence Logic ---
  useEffect(() => {
    const savedColor = localStorage.getItem('cpc_card_color');
    const savedOpacity = localStorage.getItem('cpc_card_opacity');
    if (savedColor) setCardColor(savedColor);
    if (savedOpacity) setCardOpacity(parseFloat(savedOpacity));
  }, []);

  useEffect(() => {
    localStorage.setItem('cpc_card_color', cardColor);
    localStorage.setItem('cpc_card_opacity', cardOpacity.toString());
  }, [cardColor, cardOpacity]);

  // --- Tab Animation Logic ---
  useEffect(() => {
    const currentTabElement = tabsRef.current[activeTab];
    if (currentTabElement) {
      setTabIndicatorStyle({
        left: currentTabElement.offsetLeft,
        width: currentTabElement.offsetWidth
      });
    }
  }, [activeTab]);

  const cardStyle = {
    backgroundColor: hexToRgba(cardColor, cardOpacity),
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
  };

  return (
    <div className="min-h-screen text-slate-200">
      
      {/* 1. Main Content Wrapper */}
      <div className={`transition-all duration-500 ease-out ${isSettingsOpen ? 'blur-sm scale-[0.98] opacity-60' : ''}`}>
        <div className="container mx-auto p-6 max-w-4xl">
          
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                CPC Helper
              </h1>
              <p className="text-gray-400 text-sm mt-1">
                {activeTab === 'contests' && 'Upcoming Algorithms Contests'}
                {activeTab === 'profile' && 'Multi-Platform Solver Tracker'}
                {activeTab === 'todo' && 'Problem Solving Queue'}
              </p>
            </div>
            
            <div className="flex gap-2">
              <button 
                onClick={() => setIsSettingsOpen(true)}
                className={`p-2 rounded-full transition-all duration-300 z-50 relative ${isSettingsOpen ? 'bg-white/20 text-white rotate-90' : 'hover:bg-white/10 text-gray-300'}`}
                title="Appearance Settings"
              >
                <SettingsIcon />
              </button>
            </div>
          </div>

          {/* Navigation Tabs (Order: Contests -> Profile -> Todo) */}
          <div className="relative flex gap-6 mb-6 border-b border-white/10 pb-0">
            <button
              ref={(el) => { tabsRef.current['contests'] = el; }}
              onClick={() => setActiveTab('contests')}
              className={`pb-3 px-2 text-sm font-medium transition-colors ${
                activeTab === 'contests' ? 'text-blue-400' : 'text-gray-400 hover:text-white'
              }`}
            >
              Contest Calendar
            </button>
            
            <button
              ref={(el) => { tabsRef.current['profile'] = el; }}
              onClick={() => setActiveTab('profile')}
              className={`pb-3 px-2 text-sm font-medium transition-colors ${
                activeTab === 'profile' ? 'text-blue-400' : 'text-gray-400 hover:text-white'
              }`}
            >
              My Stats Dashboard
            </button>

            <button
              ref={(el) => { tabsRef.current['todo'] = el; }}
              onClick={() => setActiveTab('todo')}
              className={`pb-3 px-2 text-sm font-medium transition-colors ${
                activeTab === 'todo' ? 'text-blue-400' : 'text-gray-400 hover:text-white'
              }`}
            >
              Problem Pool
            </button>

            {/* Sliding Blue Bar */}
            <div 
              className="absolute bottom-0 h-0.5 bg-blue-400 rounded-t-full transition-all duration-300 ease-[cubic-bezier(0.25,0.8,0.25,1)]"
              style={{ 
                left: tabIndicatorStyle.left, 
                width: tabIndicatorStyle.width 
              }}
            />
          </div>

          {/* === Main Content Area === */}
          
          <div style={{ display: activeTab === 'contests' ? 'block' : 'none' }}>
            <ContestList cardStyle={cardStyle} />
          </div>

          <div style={{ display: activeTab === 'profile' ? 'block' : 'none' }}>
            <DashboardGrid cardStyle={cardStyle} />
          </div>

          <div style={{ display: activeTab === 'todo' ? 'block' : 'none' }}>
            <TodoPanel cardStyle={cardStyle} />
          </div>

        </div>
      </div>

      {/* 2. Settings Drawer */}
      <SettingsDrawer 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)}
        cardColor={cardColor}
        setCardColor={setCardColor}
        cardOpacity={cardOpacity}
        setCardOpacity={setCardOpacity}
        defaultConfig={DEFAULT_CONFIG}
      />
    </div>
  );
}

export default App;