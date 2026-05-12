import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { COLORS, PROVINCE_PRESETS, PROVINCE_PRESET_IDS, aiPresetModels, proxyFetchUrl, SIGNAL_SERVER_HOST } from '../utils/constants';
import { initAudio, playTone, setVibrationEnabledGlobal, vibrate, playTick, playWheelTick, playDing, playNumberDing, playDiceRoll, playThud } from '../utils/audio';
import { DicesIcon, XIcon, PlusIcon, RotateCcwIcon, CheckIcon, HashIcon, ChevronDownIcon, TrashIcon, ListIcon, MoonIcon, SunIcon, BombIcon, PokerCardIcon, BrushIcon, WheelIcon, EraserIcon, PoisonIcon } from '../components/icons';

// ==================== 女巫的毒药标签页====================
const WitchPoisonTab = ({ darkMode, glassMode }) => {
  const GRID_SIZE = 5;
  const POISON_COUNT = 4;

  const CARD_TYPES = {
    POISON: { id: 'poison', emoji: '💀', label: '致命毒药', color: 'from-red-600 to-rose-800', score: 0 },
    HERB_10: { id: 'herb_10', emoji: '🌿', label: '草药', color: 'from-green-500 to-emerald-700', score: 10 },
    HERB_20: { id: 'herb_20', emoji: '🍄', label: '蘑菇', color: 'from-amber-500 to-orange-700', score: 20 },
    HERB_30: { id: 'herb_30', emoji: '💎', label: '宝石', color: 'from-blue-500 to-indigo-700', score: 30 },
    HERB_50: { id: 'herb_50', emoji: '🔮', label: '水晶球', color: 'from-purple-500 to-violet-700', score: 50 },
    MULTI_2X: { id: 'multi_2x', emoji: '✨', label: '2x 倍率', color: 'from-yellow-400 to-amber-600', score: 0, multiplier: 2 },
    MULTI_3X: { id: 'multi_3x', emoji: '🌟', label: '3x 倍率', color: 'from-pink-400 to-rose-600', score: 0, multiplier: 3 },
    SHIELD: { id: 'shield', emoji: '🛡️', label: '护盾', color: 'from-cyan-500 to-teal-700', score: 0, shield: true },
  };

  const generateGrid = () => {
    const total = GRID_SIZE * GRID_SIZE;
    const cards = [];
    for (let i = 0; i < POISON_COUNT; i++) cards.push(CARD_TYPES.POISON);
    cards.push(CARD_TYPES.MULTI_2X, CARD_TYPES.MULTI_2X);
    cards.push(CARD_TYPES.MULTI_3X);
    cards.push(CARD_TYPES.SHIELD);
    cards.push(CARD_TYPES.HERB_50, CARD_TYPES.HERB_50);
    for (let i = 0; i < 3; i++) cards.push(CARD_TYPES.HERB_30);
    for (let i = 0; i < 4; i++) cards.push(CARD_TYPES.HERB_20);
    while (cards.length < total) cards.push(CARD_TYPES.HERB_10);
    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    return cards.map((type, idx) => ({
      id: idx,
      type,
      flipped: false,
      matched: false,
    }));
  };

  const [grid, setGrid] = useState(() => generateGrid());
  const [score, setScore] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [shieldCount, setShieldCount] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [cashedOut, setCashedOut] = useState(false);
  const [screenShake, setScreenShake] = useState(false);
  const [redFlash, setRedFlash] = useState(false);
  const [lastFlipped, setLastFlipped] = useState(null);
  const [highScore, setHighScore] = useState(() => {
    try { return parseInt(localStorage.getItem('witchPoisonHighScore') || '0', 10); } catch(e) { return 0; }
  });
  const [flippingIds, setFlippingIds] = useState(new Set());

  const safeCards = grid.filter(c => !c.flipped && c.type.id !== 'poison').length;
  const poisonRemaining = grid.filter(c => !c.flipped && c.type.id === 'poison').length;
  const flippedCount = grid.filter(c => c.flipped).length;
  const totalCards = GRID_SIZE * GRID_SIZE;

  useEffect(() => {
    if ((gameOver || cashedOut || gameWon) && score > highScore) {
      setHighScore(score);
      try { localStorage.setItem('witchPoisonHighScore', String(score)); } catch(e) {}
    }
  }, [gameOver, cashedOut, gameWon, score, highScore]);

  const handleCardClick = (cardId) => {
    if (gameOver || cashedOut || gameWon) return;
    const card = grid[cardId];
    if (card.flipped) return;

    initAudio();
    setFlippingIds(prev => new Set(prev).add(cardId));

    setTimeout(() => {
      const newGrid = [...grid];
      newGrid[cardId] = { ...newGrid[cardId], flipped: true };
      setGrid(newGrid);
      setLastFlipped(cardId);

      const cardType = card.type;

      if (cardType.id === 'poison') {
        if (shieldCount > 0) {
          setShieldCount(s => s - 1);
          playTick();
          vibrate(30);
          setFlippingIds(prev => { const n = new Set(prev); n.delete(cardId); return n; });
        } else {
          playThud();
          vibrate([100, 50, 100, 50, 100]);
          setScreenShake(true);
          setRedFlash(true);
          setTimeout(() => { setScreenShake(false); }, 600);
          setTimeout(() => { setRedFlash(false); }, 800);
          setGameOver(true);
          setFlippingIds(prev => { const n = new Set(prev); n.delete(cardId); return n; });
        }
        return;
      }

      playTick();
      vibrate(15);

      if (cardType.score > 0) {
        setScore(s => s + cardType.score * multiplier);
      }
      if (cardType.multiplier) {
        setMultiplier(m => m * cardType.multiplier);
      }
      if (cardType.shield) {
        setShieldCount(s => s + 1);
      }

      const allSafeFlipped = newGrid.every(c => c.flipped || c.type.id === 'poison');
      if (allSafeFlipped) {
        setGameWon(true);
      }

      setFlippingIds(prev => { const n = new Set(prev); n.delete(cardId); return n; });
    }, 300);
  };

  const handleCashOut = () => {
    if (gameOver || gameWon || flippedCount === 0) return;
    playTick();
    vibrate(20);
    setCashedOut(true);
  };

  const resetGame = () => {
    playTick();
    vibrate(10);
    setGrid(generateGrid());
    setScore(0);
    setMultiplier(1);
    setShieldCount(0);
    setGameOver(false);
    setGameWon(false);
    setCashedOut(false);
    setScreenShake(false);
    setRedFlash(false);
    setLastFlipped(null);
    setFlippingIds(new Set());
  };

  const isFinished = gameOver || cashedOut || gameWon;

  return (
    <div className={`flex flex-col items-center justify-center h-full p-3 space-y-3 transition-all ${screenShake ? 'animate-wp-shake' : ''}`}>
      {redFlash && (
        <div className="fixed inset-0 z-50 bg-red-600/30 pointer-events-none animate-wp-redflash" />
      )}

      <div className="w-full max-w-sm flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-xl text-xs font-black"
            style={glassMode
              ? { background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.2)', color: '#7c3aed' }
              : { background: darkMode ? '#1f2937' : '#f3f4f6', color: darkMode ? '#a78bfa' : '#7c3aed' }}
          >
            🪙 {score}
          </div>
          {multiplier > 1 && (
            <div className="px-2 py-1.5 rounded-xl text-[10px] font-black bg-gradient-to-r from-yellow-400 to-amber-500 text-amber-900 shadow-sm">
              {multiplier}x
            </div>
          )}
          {shieldCount > 0 && (
            <div className="px-2 py-1.5 rounded-xl text-[10px] font-black bg-gradient-to-r from-cyan-400 to-teal-500 text-teal-900 shadow-sm">
              🛡️ ×{shieldCount}
            </div>
          )}
        </div>
        <div className="px-3 py-1.5 rounded-xl text-[10px] font-bold"
          style={glassMode
            ? { background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.15)', color: '#94a3b8' }
            : { background: darkMode ? '#111827' : '#e5e7eb', color: darkMode ? '#9ca3af' : '#6b7280' }}
        >
          👑 {highScore}
        </div>
      </div>

      {!isFinished && (
        <div className="w-full max-w-sm flex items-center justify-center gap-4 px-2">
          <span className={`text-[10px] font-bold ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            💀 ×{poisonRemaining}
          </span>
          <span className={`text-[10px] ${darkMode ? 'text-gray-600' : 'text-gray-300'}`}>|</span>
          <span className={`text-[10px] font-bold ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            🌿 ×{safeCards}
          </span>
          <span className={`text-[10px] ${darkMode ? 'text-gray-600' : 'text-gray-300'}`}>|</span>
          <span className={`text-[10px] font-bold ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            📋 {flippedCount}/{totalCards}
          </span>
        </div>
      )}

      {isFinished && (
        <div className="w-full max-w-sm text-center animate-fade-in">
          {gameOver && (
            <div className="space-y-1">
              <div className="text-3xl">💀</div>
              <p className="text-sm font-black text-red-500">中毒了！游戏结束</p>
              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>最终得分: <span className="font-black text-purple-600">{score}</span></p>
              {score >= highScore && score > 0 && <p className="text-[10px] font-bold text-amber-500">🎉 新纪录！</p>}
            </div>
          )}
          {cashedOut && (
            <div className="space-y-1">
              <div className="text-3xl">🏃</div>
              <p className="text-sm font-black text-amber-500">见好就收！</p>
              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>带走得分: <span className="font-black text-purple-600">{score}</span></p>
              {score >= highScore && score > 0 && <p className="text-[10px] font-bold text-amber-500">🎉 新纪录！</p>}
            </div>
          )}
          {gameWon && (
            <div className="space-y-1">
              <div className="text-3xl">🏆</div>
              <p className="text-sm font-black text-green-500">完美通关！</p>
              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>最终得分: <span className="font-black text-purple-600">{score}</span></p>
              {score >= highScore && score > 0 && <p className="text-[10px] font-bold text-amber-500">🎉 新纪录！</p>}
            </div>
          )}
        </div>
      )}

      <div
        className="grid gap-2 w-full max-w-sm p-3 rounded-3xl"
        style={{
          gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
          ...(glassMode
            ? { background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.12)' }
            : { background: darkMode ? 'rgba(17,24,39,0.6)' : 'rgba(249,250,251,0.8)', border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}` })
        }}
      >
        {grid.map((card) => {
          const isFlipping = flippingIds.has(card.id);
          const isRevealed = card.flipped || (isFinished && !card.flipped);
          const isPoisonReveal = isFinished && !card.flipped && card.type.id === 'poison';

          return (
            <div
              key={card.id}
              className="wp-card-container"
              style={{ perspective: '600px' }}
            >
              <div
                className={`wp-card w-full aspect-square rounded-2xl flex items-center justify-center cursor-pointer transition-transform duration-500 ${isFlipping ? 'wp-card-flipping' : ''} ${isRevealed ? 'wp-card-flipped' : ''} ${isPoisonReveal ? 'wp-card-poison-reveal' : ''}`}
                style={{
                  transformStyle: 'preserve-3d',
                  position: 'relative',
                }}
                onClick={() => !isRevealed && handleCardClick(card.id)}
              >
                <div
                  className="wp-card-face wp-card-back absolute inset-0 rounded-2xl flex items-center justify-center"
                  style={{
                    backfaceVisibility: 'hidden',
                    ...(glassMode
                      ? { background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)' }
                      : { background: darkMode ? '#1f2937' : '#f9fafb', border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}` }),
                  }}
                >
                  <span className="text-lg opacity-40">🧪</span>
                </div>
                <div
                  className={`wp-card-face wp-card-front absolute inset-0 rounded-2xl flex flex-col items-center justify-center bg-gradient-to-br ${card.type.color} shadow-lg`}
                  style={{
                    backfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                  }}
                >
                  <span className="text-xl leading-none">{card.type.emoji}</span>
                  <span className="text-[7px] font-bold text-white/80 mt-0.5">{card.type.label}</span>
                  {card.type.score > 0 && (
                    <span className="text-[8px] font-black text-white/90">+{card.type.score}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        {!isFinished && flippedCount > 0 && (
          <button
            onClick={handleCashOut}
            className={`px-5 py-2.5 rounded-2xl font-black text-sm shadow-lg flex items-center gap-2 transition-all active:scale-95 ${glassMode ? 'aurora-glass-pill text-amber-700 hover:bg-white/40' : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'}`}
          >
            🏃 见好就收
          </button>
        )}
        {isFinished && (
          <button
            onClick={resetGame}
            className={`px-6 py-3 rounded-2xl font-black text-base shadow-lg flex items-center gap-2 transition-all active:scale-95 ${glassMode ? 'aurora-glass-pill text-slate-700 hover:bg-white/40' : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'}`}
          >
            <RotateCcwIcon size={18} /> 再来一局
          </button>
        )}
      </div>
    </div>
  );
};

export default WitchPoisonTab;
