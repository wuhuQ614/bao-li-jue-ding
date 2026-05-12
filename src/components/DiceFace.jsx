import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { COLORS, PROVINCE_PRESETS, PROVINCE_PRESET_IDS, aiPresetModels, proxyFetchUrl, SIGNAL_SERVER_HOST } from '../utils/constants';
import { initAudio, playTone, setVibrationEnabledGlobal, vibrate, playTick, playWheelTick, playDing, playNumberDing, playDiceRoll, playThud } from '../utils/audio';
import { DicesIcon, XIcon, PlusIcon, RotateCcwIcon, CheckIcon, HashIcon, ChevronDownIcon, TrashIcon, ListIcon, MoonIcon, SunIcon, BombIcon, PokerCardIcon, BrushIcon, WheelIcon, EraserIcon, PoisonIcon } from '../components/icons';

// ==================== 3D 骰子组件 ====================
const DiceFace = ({ value, isRolling, darkMode, glassMode, onAnimEnd }) => {
  const diceRef = useRef(null);
  const animRef = useRef(null);
  const currentRotRef = useRef({ x: 0, y: 0 });
  const onAnimEndRef = useRef(onAnimEnd);
  useEffect(() => { onAnimEndRef.current = onAnimEnd; }, [onAnimEnd]);
  const TARGET_ROTS = {
    1: { x: 0, y: 0 }, 6: { x: 0, y: 180 }, 2: { x: -90, y: 0 },
    5: { x: 90, y: 0 }, 3: { x: 0, y: 90 }, 4: { x: 0, y: -90 },
  };

  useEffect(() => {
    if (diceRef.current) {
      const { x, y } = currentRotRef.current;
      diceRef.current.style.transform = `rotateX(${x}deg) rotateY(${y}deg)`;
    }
  }, [darkMode]);

  useEffect(() => {
    if (isRolling && diceRef.current) {
      const target = TARGET_ROTS[value];
      const current = currentRotRef.current;
      const baseSpins = 2160;
      const endX = Math.ceil(current.x / 360) * 360 + baseSpins + target.x;
      const endY = Math.ceil(current.y / 360) * 360 + baseSpins + target.y;
      const startX = current.x;
      const startY = current.y;
      const duration = 3000 + Math.random() * 1000;
      const startTime = performance.now();

      const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);

      let cancelled = false;

      const animate = (now) => {
        if (cancelled) return;
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = easeOutQuart(progress);
        const curX = startX + (endX - startX) * eased;
        const curY = startY + (endY - startY) * eased;
        if (diceRef.current) {
          diceRef.current.style.transform = `rotateX(${curX}deg) rotateY(${curY}deg)`;
        }
        if (progress < 1) {
          animRef.current = requestAnimationFrame(animate);
        } else {
          currentRotRef.current = { x: endX, y: endY };
          if (diceRef.current) {
            diceRef.current.style.transform = `rotateX(${endX}deg) rotateY(${endY}deg)`;
          }
          if (onAnimEndRef.current) onAnimEndRef.current();
        }
      };
      animRef.current = requestAnimationFrame(animate);

      return () => {
        cancelled = true;
        if (animRef.current) {
          cancelAnimationFrame(animRef.current);
          animRef.current = null;
        }
      };
    }
  }, [isRolling, value]);

  const renderDots = (val) => {
    const dotsMap = { 1: [5], 2: [3, 7], 3: [3, 5, 7], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9] };
    return Array.from({ length: 9 }).map((_, i) => {
      const isActive = dotsMap[val].includes(i+1);
      const isOne = val === 1 && isActive;
      return (
        <div key={i} className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full ${
          !isActive ? 'bg-transparent' : 
          isOne ? 'bg-red-600 shadow-[inset_0_2px_3px_rgba(0,0,0,0.5),0_1px_0_rgba(255,255,255,0.15),0_0_6px_rgba(220,38,38,0.3)]' : 
          (darkMode ? 'bg-indigo-300 shadow-[inset_0_2px_3px_rgba(0,0,0,0.5),0_1px_0_rgba(255,255,255,0.12),0_0_4px_rgba(129,140,248,0.2)]' : 'bg-gray-800 shadow-[inset_0_2px_3px_rgba(0,0,0,0.5),0_1px_0_rgba(255,255,255,0.12)]')
        }`} />
      );
    });
  };

  const faceBg = darkMode
    ? 'bg-gradient-to-br from-slate-800/90 via-indigo-900/80 to-slate-900/90'
    : 'bg-gradient-to-br from-white/95 via-blue-50/85 to-indigo-100/90';
  const faceBorder = darkMode
    ? 'border border-indigo-500/10'
    : 'border border-white/50';
  const faceRadius = '35%';

  const diceHalf = 'calc(var(--dice-size) / 2)';

  const chamferShadows = darkMode
    ? [
        '0 0 0 1px rgba(255,255,255,0.04)',
        'inset 0 1px 0 rgba(255,255,255,0.05)',
        'inset 0 -1px 0 rgba(0,0,0,0.3)',
        'inset 1px 0 0 rgba(255,255,255,0.03)',
        'inset -1px 0 0 rgba(0,0,0,0.2)',
        '0 0 20px rgba(99,102,241,0.08)'
      ].join(',')
    : [
        '0 0 0 1px rgba(255,255,255,0.5)',
        'inset 0 1px 1px rgba(255,255,255,0.85)',
        'inset 0 -1px 1px rgba(0,0,0,0.04)',
        'inset 1px 0 0 rgba(255,255,255,0.6)',
        'inset -1px 0 0 rgba(0,0,0,0.02)',
        '0 4px 16px rgba(0,0,0,0.06)'
      ].join(',');

  const glassHighlight = darkMode
    ? <div className="absolute inset-0 pointer-events-none" style={{ borderRadius: faceRadius, background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, transparent 40%)' }} />
    : <div className="absolute inset-0 pointer-events-none" style={{ borderRadius: faceRadius, background: 'linear-gradient(135deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.1) 40%, transparent 60%, rgba(200,210,255,0.15) 100%)' }} />;

  const renderFace = (val) => (
    <div className="relative z-10 grid grid-cols-3 gap-0.5">
      {renderDots(val)}
    </div>
  );

  const renderFaceWithInner = (transform, val) => (
    <div
      style={{ transform, backfaceVisibility: 'hidden', borderRadius: faceRadius, boxShadow: chamferShadows }}
      className={`absolute -inset-[1px] ${faceBg} ${faceBorder} flex items-center justify-center p-2 overflow-hidden dice-glass-frost`}
    >
      {glassHighlight}{renderFace(val)}
    </div>
  );

  return (
    <div className="relative m-3 dice-responsive-size" style={{ width: 'var(--dice-size)', height: 'var(--dice-size)' }}>
      <div style={{ perspective: '800px' }} className="w-full h-full">
        <div
          ref={diceRef}
          style={{ transformStyle: 'preserve-3d' }}
          className="relative w-full h-full"
        >
          {renderFaceWithInner(`translateZ(${diceHalf})`, 1)}
          {renderFaceWithInner(`rotateY(180deg) translateZ(${diceHalf})`, 6)}
          {renderFaceWithInner(`rotateX(90deg) translateZ(${diceHalf})`, 2)}
          {renderFaceWithInner(`rotateX(-90deg) translateZ(${diceHalf})`, 5)}
          {renderFaceWithInner(`rotateY(-90deg) translateZ(${diceHalf})`, 3)}
          {renderFaceWithInner(`rotateY(90deg) translateZ(${diceHalf})`, 4)}
        </div>
      </div>
      <div className={`absolute -bottom-3 left-1/2 w-12 h-3 rounded-full blur-md ${darkMode ? 'bg-indigo-500/15' : 'bg-black/15'} ${isRolling ? 'dice-shadow-rolling' : ''}`} style={{ transform: 'translateX(-50%)' }} />
    </div>
  );
};

export default DiceFace;
