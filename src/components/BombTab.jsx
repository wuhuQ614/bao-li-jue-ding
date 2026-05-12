import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { COLORS, PROVINCE_PRESETS, PROVINCE_PRESET_IDS, aiPresetModels, proxyFetchUrl, SIGNAL_SERVER_HOST } from '../utils/constants';
import { initAudio, playTone, setVibrationEnabledGlobal, vibrate, playTick, playWheelTick, playDing, playNumberDing, playDiceRoll, playThud } from '../utils/audio';
import { DicesIcon, XIcon, PlusIcon, RotateCcwIcon, CheckIcon, HashIcon, ChevronDownIcon, TrashIcon, ListIcon, MoonIcon, SunIcon, BombIcon, PokerCardIcon, BrushIcon, WheelIcon, EraserIcon, PoisonIcon } from '../components/icons';

// ==================== 排雷（翻牌）标签页====================
const BombTab = ({ darkMode, glassMode, bombPlayerCount = 3, saveAll }) => {
  const [playerCount, setPlayerCount] = useState(bombPlayerCount);
  const [showPlayerWheel, setShowPlayerWheel] = useState(false);
  const [hoverPlayerCount, setHoverPlayerCount] = useState(playerCount);
  const hoverPlayerCountRef = useRef(playerCount);
  const playerCountRef = useRef(playerCount);
  const wheelDraggingRef = useRef(false);
  const wheelCenterRef = useRef({ x: 0, y: 0 });
  const lastHoveredPlayerRef = useRef(playerCount);
  const [gameState, setGameState] = useState('setup');
  const [bombIndex, setBombIndex] = useState(-1);
  const [currentPlayer, setCurrentPlayer] = useState(1);
  const [selections, setSelections] = useState({});
  const [resultMessage, setResultMessage] = useState('');
  const [flippedCards, setFlippedCards] = useState({});

  const totalCards = playerCount + 1;

  useEffect(() => {
    if (gameState === 'setup') {
      setSelections({});
      setBombIndex(-1);
      setFlippedCards({});
    }
  }, [playerCount, gameState]);

  useEffect(() => {
    hoverPlayerCountRef.current = hoverPlayerCount;
    playerCountRef.current = playerCount;
  }, [hoverPlayerCount, playerCount]);

  const handlePointerMove = (e) => {
    if (!wheelDraggingRef.current) return;
    if (e.cancelable && e.type.startsWith('touch')) {
      e.preventDefault();
    }
    const cx = wheelCenterRef.current.x;
    const cy = wheelCenterRef.current.y;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const x = clientX - cx;
    const y = clientY - cy;
    const dist = Math.sqrt(x * x + y * y);
    if (dist < 15) return;
    const players = [2,3,4,5,6,7,8];
    let angle = Math.atan2(y, x) + Math.PI / 2;
    if (angle < 0) angle += Math.PI * 2;
    const seg = (Math.PI * 2) / players.length;
    const idx = Math.floor(((angle + seg / 2) % (Math.PI * 2)) / seg);
    const p = players[idx % players.length];
    setHoverPlayerCount(p);
    if (p !== lastHoveredPlayerRef.current) {
      playWheelTick();
      lastHoveredPlayerRef.current = p;
    }
  };

  const handlePointerEnd = () => {
    if (!wheelDraggingRef.current) return;
    wheelDraggingRef.current = false;
    setShowPlayerWheel(false);
    if (hoverPlayerCountRef.current !== playerCountRef.current) {
      playTick();
      setPlayerCount(hoverPlayerCountRef.current);
      saveAll({ bombPlayerCount: hoverPlayerCountRef.current });
    }
  };

  useEffect(() => {
    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerEnd);
    window.addEventListener('touchmove', handlePointerMove, { passive: false });
    window.addEventListener('touchend', handlePointerEnd);
    window.addEventListener('touchcancel', handlePointerEnd);
    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerEnd);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerEnd);
      window.removeEventListener('touchcancel', handlePointerEnd);
    };
  }, []);

  const startGame = () => {
    initAudio();
    playTick();
    setBombIndex(Math.floor(Math.random() * totalCards));
    setCurrentPlayer(1);
    setSelections({});
    setFlippedCards({});
    setGameState('playing');
    setResultMessage('');
  };

  const handleSelectCard = (index) => {
    if (gameState !== 'playing' || selections[index]) return;

    initAudio();
    playWheelTick();
    vibrate(20);

    const newSelections = { ...selections, [index]: currentPlayer };
    setSelections(newSelections);

    if (currentPlayer >= playerCount) {
      setGameState('ready');
    } else {
      setCurrentPlayer(currentPlayer + 1);
    }
  };

  const revealCards = () => {
    initAudio();
    setGameState('revealed');

    const bombVictimId = selections[bombIndex];

    setTimeout(() => {
      const newFlipped = { [bombIndex]: true };
      setFlippedCards(newFlipped);

      setTimeout(() => {
        const allFlipped = { ...newFlipped };
        for (let i = 0; i < totalCards; i++) {
          if (i !== bombIndex) allFlipped[i] = true;
        }
        setFlippedCards(allFlipped);
      }, 400);

      if (bombVictimId) {
        playThud();
        vibrate([100, 100, 200]);
        setResultMessage(`💥 玩家${bombVictimId} 被炸了！`);
      } else {
        playDing();
        vibrate([50, 50, 50]);
        setResultMessage(`🎉无人伤亡，运气爆棚！`);
      }
    }, 300);
  };

  const resetGame = () => {
    initAudio();
    playTick();
    setGameState('setup');
  };

  const playerColors = ['#EF4444', '#3B82F6', '#22C55E', '#F59E0B', '#8B5CF6', '#EC4899'];

  return (
    <div className="flex flex-col items-center h-full p-5 pb-8 gap-2">

      {gameState !== 'setup' && (
      <div className="w-full text-center flex flex-col justify-center">
        {gameState === 'playing' && (
          <div className="space-y-1">
            <div className="text-gray-400 text-xs font-bold uppercase tracking-wider">轮到你了</div>
            <h2 className="text-2xl font-black" style={{ color: playerColors[currentPlayer - 1] }}>
              玩家{currentPlayer} 选一张
            </h2>
          </div>
        )}
        {gameState === 'ready' && (
          <div className="space-y-1">
            <div className="text-gray-400 text-xs font-bold uppercase tracking-wider">全部选好</div>
            <h2 className="text-2xl font-black text-amber-400">点击按钮开牌！</h2>
          </div>
        )}
        {gameState === 'revealed' && (
          <div className="space-y-1">
            <h2 className={`text-2xl font-black ${selections[bombIndex] ? 'text-red-500' : 'text-emerald-400'}`}>
              {resultMessage}
            </h2>
          </div>
        )}
      </div>
      )}

      <div className={`grid gap-2 w-full max-w-xs flex-1 content-center ${totalCards > 4 ? 'grid-cols-3' : 'grid-cols-2'}`}>
        {Array.from({ length: totalCards }).map((_, i) => {
          const isSelected = !!selections[i];
          const selectorId = selections[i];
          const isBomb = i === bombIndex;
          const isRevealed = gameState === 'revealed' && flippedCards[i];

          return (
            <div key={i} className="relative aspect-[4/5]" style={{ perspective: '1000px' }}>
              <button
                onClick={() => handleSelectCard(i)}
                disabled={gameState !== 'playing' || isSelected}
                className="w-full h-full transition-transform duration-700"
                style={{
                  transformStyle: 'preserve-3d',
                  transform: isRevealed ? 'rotateY(180deg)' : 'rotateY(0deg)',
                  transitionDelay: isRevealed ? `${i * 100}ms` : '0ms'
                }}
              >
                <div
                  className={`absolute inset-0 flex flex-col items-center justify-center rounded-2xl border-2 transition-colors duration-300 overflow-hidden ${
                    isSelected
                      ? (glassMode ? 'bg-indigo-200/40 border-indigo-300/60' : darkMode ? 'bg-indigo-900/50 border-indigo-500' : 'bg-indigo-100 border-indigo-400')
                      : (glassMode ? 'border-indigo-300/40' : darkMode ? 'bg-gray-700/60 border-gray-600' : 'border-gray-200')
                  } ${gameState === 'playing' && !isSelected ? 'hover:scale-[1.03] active:scale-95' : ''}`}
                  style={{ 
                    backfaceVisibility: 'hidden',
                    aspectRatio: '4/5',
                    ...(!isSelected && (glassMode ? {
                      background: 'rgba(255,255,255,0.35)',
                      borderColor: 'rgba(99,102,241,0.35)',
                      backgroundImage: 'repeating-linear-gradient(-45deg, transparent, transparent 6px, rgba(147, 197, 253, 0.25) 6px, rgba(147, 197, 253, 0.25) 7px)',
                      backdropFilter: 'blur(16px)',
                      boxShadow: '0 4px 20px rgba(99,102,241,0.15), inset 0 1px 0 rgba(255,255,255,0.4)',
                    } : {
                      background: '#bfdbfe',
                      borderColor: '#93c5fd',
                      backgroundImage: 'repeating-linear-gradient(-45deg, transparent, transparent 6px, rgba(147, 197, 253, 0.6) 6px, rgba(147, 197, 253, 0.6) 7px)',
                    }))
                  }}
                >
                  {isSelected ? (
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-lg" style={{ backgroundColor: playerColors[selectorId - 1] }}>
                        P{selectorId}
                      </div>
                    </div>
                  ) : (
                    <span className="text-6xl font-bold" style={{ color: glassMode ? '#4f46e5' : '#1e40af' }}>?</span>
                  )}
                </div>

                <div
                  className={`absolute inset-0 flex flex-col items-center justify-center rounded-2xl border-2 ${
                    isBomb
                      ? 'bg-gradient-to-br from-red-600 to-red-800 border-red-500'
                      : 'bg-gradient-to-br from-emerald-500 to-emerald-700 border-emerald-400'
                  }`}
                  style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', aspectRatio: '4/5' }}
                >
                  <span className="text-5xl mb-2">{isBomb ? '💣' : '✅'}</span>
                  {isSelected && (
                    <span className="text-sm font-black text-white bg-black/30 px-3 py-1 rounded-full">
                      玩家{selectorId}
                    </span>
                  )}
                </div>
              </button>
            </div>
          );
        })}
      </div>

      <div className="w-full max-w-xs space-y-2 flex flex-col justify-end">
        {gameState === 'setup' && (
          <>
            <div className="relative">
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  const cx = e.clientX;
                  const cy = e.clientY;
                  wheelCenterRef.current = { x: cx, y: cy };
                  wheelDraggingRef.current = true;
                  setShowPlayerWheel(true);
                  lastHoveredPlayerRef.current = playerCount;
                  setHoverPlayerCount(playerCount);
                }}
                onTouchStart={(e) => {
                  e.preventDefault();
                  const t = e.touches[0];
                  wheelCenterRef.current = { x: t.clientX, y: t.clientY };
                  wheelDraggingRef.current = true;
                  setShowPlayerWheel(true);
                  lastHoveredPlayerRef.current = playerCount;
                  setHoverPlayerCount(playerCount);
                }}
                className={`w-full py-3 rounded-2xl font-black text-lg flex items-center justify-center gap-2 active:scale-[0.97] transition-transform shadow-lg cursor-pointer select-none touch-none ${glassMode ? 'aurora-glass-pill text-slate-700 hover:bg-white/40' : 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white'}`}
                style={{ touchAction: 'none' }}
              >
                选择人数：{playerCount} 人
              </button>
              {showPlayerWheel && createPortal(
                <div
                  className="fixed z-[99999] pointer-events-none"
                  style={{ left: wheelCenterRef.current.x, top: wheelCenterRef.current.y, transform: 'translate(-50%, -50%)' }}
                >
                  <div className="relative w-56 h-56 rounded-full overflow-hidden shadow-2xl" style={{ background: 'linear-gradient(135deg, rgba(191,219,254,0.8) 0%, rgba(147,197,253,0.8) 100%)', backdropFilter: 'blur(12px)' }}>
                    <svg viewBox="0 0 200 200" className="w-full h-full" style={{ touchAction: 'none', pointerEvents: 'auto' }}>
                      <defs>
                        <filter id="wheelShadow">
                          <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#6366f1" floodOpacity="0.3"/>
                        </filter>
                      </defs>
                      {(() => {
                        const players = [2,3,4,5,6,7,8];
                        const colors = ['#ef4444','#f97316','#f59e0b','#22c55e','#06b6d4','#3b82f6','#8b5cf6'];
                        const segAngle = (Math.PI * 2) / players.length;
                        const startAngle = -Math.PI / 2 - segAngle / 2;
                        return players.map((p, i) => {
                          const angle = startAngle + segAngle * i;
                          const nextAngle = angle + segAngle;
                          const r1 = 35, r2 = 80;
                          const innerX1 = 100 + r1 * Math.cos(angle), innerY1 = 100 + r1 * Math.sin(angle);
                          const outerX1 = 100 + r2 * Math.cos(angle), outerY1 = 100 + r2 * Math.sin(angle);
                          const innerX2 = 100 + r1 * Math.cos(nextAngle), innerY2 = 100 + r1 * Math.sin(nextAngle);
                          const outerX2 = 100 + r2 * Math.cos(nextAngle), outerY2 = 100 + r2 * Math.sin(nextAngle);
                          const isHovered = hoverPlayerCount === p;
                          const midAngle = angle + segAngle / 2;
                          const labelR = (r1 + r2) / 2;
                          const labelX = 100 + labelR * Math.cos(midAngle);
                          const labelY = 100 + labelR * Math.sin(midAngle);
                          return (
                            <g key={p}>
                              <path
                                d={`M ${innerX1} ${innerY1} L ${outerX1} ${outerY1} A ${r2} ${r2} 0 0 1 ${outerX2} ${outerY2} L ${innerX2} ${innerY2} A ${r1} ${r1} 0 0 0 ${innerX1} ${innerY1} Z`}
                                fill={isHovered ? colors[i] : '#dbeafe'}
                                stroke="#93c5fd"
                                strokeWidth="1.5"
                                style={{ transition: 'fill 0.15s' }}
                              />
                              <text
                                x={labelX} y={labelY}
                                textAnchor="middle" dominantBaseline="middle"
                                fill={isHovered ? 'white' : '#3b82f6'}
                                fontSize="16" fontWeight="bold"
                                style={{ pointerEvents: 'none', transition: 'fill 0.15s' }}
                              >{p}</text>
                            </g>
                          );
                        });
                      })()}
                      <circle cx="100" cy="100" r="32" fill="rgba(255,255,255,0.25)" stroke="rgba(255,255,255,0.5)" strokeWidth="2" style={{ pointerEvents: 'none', backdropFilter: 'blur(10px)', filter: 'url(#wheelShadow)' }}/>
                      <circle cx="100" cy="100" r="32" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="1" style={{ pointerEvents: 'none' }}/>
                      <text x="100" y="95" textAnchor="middle" fill={darkMode ? '#9ca3af' : '#64748b'} fontSize="11" fontWeight="bold" style={{ pointerEvents: 'none' }}>人数</text>
                      <text x="100" y="113" textAnchor="middle" fill={darkMode ? '#60a5fa' : '#3b82f6'} fontSize="20" fontWeight="black" style={{ pointerEvents: 'none' }}>{hoverPlayerCount}</text>
                    </svg>
                  </div>
                </div>,
                document.body
              )}
            </div>
            <button onClick={startGame} className={`w-full py-4 rounded-2xl font-black text-lg shadow-xl flex items-center justify-center gap-2 active:scale-[0.97] transition-transform hover:shadow-2xl ${glassMode ? 'aurora-glass-pill text-black' : 'bg-black text-white'}`}>
              生成炸弹
            </button>
          </>
        )}

        {gameState === 'playing' && (
          <div className={`w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 cursor-not-allowed ${glassMode ? 'aurora-glass-pill text-slate-400' : darkMode ? 'bg-gray-800 text-gray-500' : 'bg-gray-100 text-gray-400'}`}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" className="animate-spin" style={{ animationDuration: '2s' }}>
              <path d="M10 2a8 8 0 017.7 5.8l-1.9-.5A6 6 0 004 10H2a8 8 0 018-8z"/>
            </svg>
            等待玩家选项?..
          </div>
        )}

        {gameState === 'ready' && (
          <button onClick={revealCards} className={`w-full py-4 rounded-2xl font-black text-lg shadow-xl flex items-center justify-center gap-2 active:scale-[0.97] transition-transform hover:shadow-2xl animate-pulse ${glassMode ? 'aurora-glass-pill text-rose-600 hover:bg-white/40' : 'bg-gradient-to-r from-red-600 via-pink-600 to-rose-600 text-white'}`}>
            开牌！
          </button>
        )}

        {gameState === 'revealed' && (
          <button onClick={resetGame} className={`w-full py-4 rounded-2xl font-black text-lg shadow-xl flex items-center justify-center gap-2 active:scale-[0.97] transition-transform hover:shadow-2xl ${glassMode ? 'aurora-glass-pill text-blue-600 hover:bg-white/40' : 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white'}`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/>
              <path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/>
            </svg>
            再来一局
          </button>
        )}
      </div>
    </div>
  );
};

export default BombTab;
