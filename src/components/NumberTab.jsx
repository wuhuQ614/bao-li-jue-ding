import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { COLORS, PROVINCE_PRESETS, PROVINCE_PRESET_IDS, aiPresetModels, proxyFetchUrl, SIGNAL_SERVER_HOST } from '../utils/constants';
import { initAudio, playTone, setVibrationEnabledGlobal, vibrate, playTick, playWheelTick, playDing, playNumberDing, playDiceRoll, playThud } from '../utils/audio';
import { DicesIcon, XIcon, PlusIcon, RotateCcwIcon, CheckIcon, HashIcon, ChevronDownIcon, TrashIcon, ListIcon, MoonIcon, SunIcon, BombIcon, PokerCardIcon, BrushIcon, WheelIcon, EraserIcon, PoisonIcon } from '../components/icons';

// ==================== 随机数标签页?====================
const NumberTab = ({ darkMode, glassMode }) => {
  const [min, setMin] = useState(1);
  const [max, setMax] = useState(100);
  const [num, setNum] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const generate = () => {
    if (isGenerating) return;
    initAudio(); setIsGenerating(true); playTick(); vibrate(20);
    let count = 0;
    const interval = setInterval(() => {
      setNum(Math.floor(Math.random() * (Number(max) - Number(min) + 1)) + Number(min));
      if (++count > 25) { clearInterval(interval); setIsGenerating(false); playNumberDing(); vibrate([50, 50]); }
    }, 70);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-8 space-y-12">
      <div className={`relative w-48 h-48 flex items-center justify-center rounded-full shadow-2xl border-8 transition-all ${glassMode ? 'aurora-glass-card border-white/30' : darkMode ? 'bg-gray-800 border-purple-900' : 'bg-white border-purple-100'} ${isGenerating ? 'scale-110' : ''}`} style={glassMode ? { borderColor: isGenerating ? 'rgba(168,85,247,0.4)' : 'rgba(255,255,255,0.3)' } : undefined}>
        <span className={`text-7xl font-black tracking-tighter ${glassMode ? 'text-purple-600' : 'text-purple-600'}`}>{num ?? '?'}</span>
      </div>
      <div className="w-full max-w-xs space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className={`text-[10px] font-black ml-1 ${glassMode ? 'text-slate-400/70' : 'text-gray-400'}`}>最小值</label>
            <input type="number" value={min} onChange={e => setMin(e.target.value)} className={`w-full p-4 rounded-2xl font-bold text-center outline-none focus:ring-2 ring-purple-400 border ${glassMode ? 'aurora-glass-input text-slate-800 placeholder-slate-400' : darkMode ? 'bg-gray-800 text-white border-gray-700' : 'bg-gray-100 text-gray-800'}`} />
          </div>
          <div className="space-y-1">
            <label className={`text-[10px] font-black ml-1 ${glassMode ? 'text-slate-400/70' : 'text-gray-400'}`}>最大值</label>
            <input type="number" value={max} onChange={e => setMax(e.target.value)} className={`w-full p-4 rounded-2xl font-bold text-center outline-none focus:ring-2 ring-purple-400 border ${glassMode ? 'aurora-glass-input text-slate-800 placeholder-slate-400' : darkMode ? 'bg-gray-800 text-white border-gray-700' : 'bg-gray-100 text-gray-800'}`} />
          </div>
        </div>
        <button onClick={generate} disabled={isGenerating} className={`w-full py-5 rounded-2xl font-black text-xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 ${glassMode ? 'aurora-glass-pill text-slate-700 hover:bg-white/40' : 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white'}`}>
          <HashIcon size={24} /> {isGenerating ? '暴力计算中...' : '暴力生成数字'}
        </button>
      </div>
    </div>
  );
};

export default NumberTab;
