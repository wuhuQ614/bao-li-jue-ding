import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { COLORS, PROVINCE_PRESETS, PROVINCE_PRESET_IDS, aiPresetModels, proxyFetchUrl, SIGNAL_SERVER_HOST } from '../utils/constants';
import { initAudio, playTone, setVibrationEnabledGlobal, vibrate, playTick, playWheelTick, playDing, playNumberDing, playDiceRoll, playThud } from '../utils/audio';
import { DicesIcon, XIcon, PlusIcon, RotateCcwIcon, CheckIcon, HashIcon, ChevronDownIcon, TrashIcon, ListIcon, MoonIcon, SunIcon, BombIcon, PokerCardIcon, BrushIcon, WheelIcon, EraserIcon, PoisonIcon } from '../components/icons';
import DiceFace from './DiceFace';

// ==================== 骰子标签页====================
const DiceTab = ({ diceCount, setDiceCount, saveAll, darkMode, glassMode }) => {
  const [diceValues, setDiceValues] = useState(Array(diceCount).fill(1));
  const [isRolling, setIsRolling] = useState(false);
  const finishedCountRef = useRef(0);
  const prevDiceCountRef = useRef(diceCount);
  useEffect(() => {
    if (diceCount !== prevDiceCountRef.current && !isRolling) {
      prevDiceCountRef.current = diceCount;
      setDiceValues(Array(diceCount).fill(1));
    }
  }, [diceCount, isRolling]);

  const roll = () => {
    if (isRolling) return;
    initAudio(); setIsRolling(true); finishedCountRef.current = 0; playDiceRoll(); vibrate([50, 100, 50, 100]);
    const newValues = Array.from({ length: diceCount }, () => Math.floor(Math.random() * 6) + 1);
    setDiceValues(newValues);
  };

  const handleDiceAnimEnd = () => {
    finishedCountRef.current++;
    if (finishedCountRef.current >= diceCount) {
      setIsRolling(false);
      playThud();
      vibrate(70);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-4 space-y-6">
      <div className="text-center">
        <div className={`text-sm font-bold uppercase mb-1 ${glassMode ? 'text-slate-400/70' : 'text-gray-400'}`}>点数总和</div>
        <h2 className={`text-5xl font-black ${glassMode ? 'text-slate-800' : darkMode ? 'text-white' : 'text-gray-800'} ${isRolling ? 'animate-pulse' : ''}`}>{isRolling ? '···' : diceValues.reduce((a, b) => a + b, 0)}</h2>
      </div>
      <div className={`flex flex-wrap justify-center min-h-[240px] max-w-sm items-center content-center rounded-3xl p-4`}>
        {diceValues.map((v, i) => <DiceFace key={i} value={v} isRolling={isRolling} darkMode={darkMode} glassMode={glassMode} onAnimEnd={handleDiceAnimEnd} />)}
      </div>
      <div className="w-full max-w-xs space-y-4">
        <div className={`flex justify-between p-1 rounded-2xl ${glassMode ? 'aurora-glass-pill' : darkMode ? 'bg-gray-800' : 'bg-gray-200'}`}>
          {[1, 2, 3, 4, 5, 6].map(n => (
            <button key={n} onClick={() => { if(!isRolling) { setDiceCount(n); saveAll({ diceCount: n }); } }} className={`w-10 h-10 rounded-xl font-bold transition-all ${diceCount === n ? (glassMode ? 'bg-white/40 text-slate-800 shadow-sm scale-105' : darkMode ? 'bg-indigo-600 text-white' : 'bg-white shadow-md text-blue-600 scale-105') : (glassMode ? 'text-slate-500' : 'text-gray-500')}`}>{n}</button>
          ))}
        </div>
        <button onClick={roll} disabled={isRolling} className={`w-full py-5 rounded-2xl font-black text-xl shadow-xl flex items-center justify-center gap-3 ${isRolling ? 'bg-gray-400 text-white cursor-not-allowed' : glassMode ? 'aurora-glass-pill text-slate-700 hover:bg-white/40 active:scale-95' : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white active:scale-95'}`}><DicesIcon size={24} /> {isRolling ? '暴力翻滚中...' : '暴力投掷'}</button>
      </div>
    </div>
  );
};

export default DiceTab;
