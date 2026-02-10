import { useEffect, useState } from 'react';
import { hexToRgba } from './utils';
import { SettingsIcon } from './components/Icons';
import ContestList from './components/ContestList';
import DashboardGrid from './components/DashboardGrid';
import SettingsDrawer from './components/SettingsDrawer';

const DEFAULT_CONFIG = {
  cardColor: '#1f2937', 
  cardOpacity: 0.6,
};

type Tab = 'contests' | 'profile';

function App() {
  // --- Global State ---
  const [activeTab, setActiveTab] = useState<Tab>('contests');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [cardColor, setCardColor] = useState(DEFAULT_CONFIG.cardColor);
  const [cardOpacity, setCardOpacity] = useState(DEFAULT_CONFIG.cardOpacity);

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

  // Compute style once here and pass it down
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
                {activeTab === 'contests' ? 'Upcoming Algorithms Contests' : 'Multi-Platform Solver Tracker'}
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

          {/* === Main Content Area === */}
          {activeTab === 'contests' ? (
            <ContestList cardStyle={cardStyle} />
          ) : (
            <DashboardGrid cardStyle={cardStyle} />
          )}

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