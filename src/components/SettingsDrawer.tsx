import { hexToRgba } from '../utils';
import { CloseIcon } from './Icons';

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
  defaultConfig
}: SettingsDrawerProps) => {
  return (
    <>
      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-500 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      <div 
        className={`fixed top-0 right-0 h-full w-80 bg-[#161f30] border-l border-white/10 shadow-2xl z-50 transform transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="p-6 h-full flex flex-col">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-xl font-bold text-white tracking-wide">Appearance</h2>
            <button 
              onClick={onClose}
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
                  setCardColor(defaultConfig.cardColor);
                  setCardOpacity(defaultConfig.cardOpacity);
              }}
              className="w-full py-3 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors border border-dashed border-gray-700 hover:border-gray-500"
            >
              Reset to Defaults
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default SettingsDrawer;