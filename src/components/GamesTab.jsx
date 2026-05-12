import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Peer } from 'peerjs';
import { COLORS, PROVINCE_PRESETS, PROVINCE_PRESET_IDS, aiPresetModels, proxyFetchUrl, SIGNAL_SERVER_HOST, PEERJS_API_BASE, PEER_SERVER_CONFIG } from '../utils/constants';
import { initAudio, playTone, setVibrationEnabledGlobal, vibrate, playTick, playWheelTick, playDing, playNumberDing, playDiceRoll, playThud } from '../utils/audio';
import { DicesIcon, XIcon, PlusIcon, RotateCcwIcon, CheckIcon, HashIcon, ChevronDownIcon, TrashIcon, ListIcon, MoonIcon, SunIcon, BombIcon, PokerCardIcon, BrushIcon, WheelIcon, EraserIcon, PoisonIcon } from '../components/icons';
import WitchPoisonTab from './WitchPoisonTab';
import MarioGame from '../MarioGame';
import HandheldTetris from '../HandheldTetris';

const GamesTab = ({ darkMode, glassMode, onSwitchToDrawingGuess, onGameModeChange }) => {
  const [activeGame, setActiveGame] = useState(null);
  const [gameFading, setGameFading] = useState(false);
  const gamePendingRef = useRef(null);
  const gameFadeTimerRef = useRef(null);
  const gameFadingVersionRef = useRef(0);
  const SOLO_SHAPES = useMemo(() => [
    { shape: [[1,1,1,1]], color: '#60a5fa' },
    { shape: [[1,1],[1,1]], color: '#4ade80' },
    { shape: [[0,1,0],[1,1,1]], color: '#f472b6' },
    { shape: [[0,1,1],[1,1,0]], color: '#4ade80' },
    { shape: [[1,1,0],[0,1,1]], color: '#4ade80' },
    { shape: [[1,0,0],[1,1,1]], color: '#f472b6' },
    { shape: [[0,0,1],[1,1,1]], color: '#f472b6' },
  ], []);
  const [soloBoard, setSoloBoard] = useState(() => Array.from({ length: 20 }, () => Array(10).fill(null)));
  const [soloCurrentPiece, setSoloCurrentPiece] = useState(null);
  const [soloNextPieces, setSoloNextPieces] = useState([]);
  const [soloScore, setSoloScore] = useState(0);
  const [soloLevel, setSoloLevel] = useState(1);
  const [soloLines, setSoloLines] = useState(0);
  const [soloGameOver, setSoloGameOver] = useState(false);
  const [soloIsPlaying, setSoloIsPlaying] = useState(false);
  const [soloIsPaused, setSoloIsPaused] = useState(false);
  const soloIsPausedRef = useRef(false);
  const [soloIsFastDropping, setSoloIsFastDropping] = useState(false);
  const [soloHighScore, setSoloHighScore] = useState(() => { try { return parseInt(localStorage.getItem('tetrisSoloHighScore') || '0', 10); } catch(e) { return 0; } });
  const [soloShowSettings, setSoloShowSettings] = useState(false);
  const [soloShowGhost, setSoloShowGhost] = useState(() => { try { return localStorage.getItem('tetrisSoloGhost') !== 'false'; } catch(e) { return true; } });
  const [soloLevelSpeed, setSoloLevelSpeed] = useState(() => { try { return localStorage.getItem('tetrisSoloLevelSpeed') !== 'false'; } catch(e) { return true; } });
  const soloLevelSpeedRef = useRef(true);
  const soloBoardRef = useRef(Array.from({ length: 20 }, () => Array(10).fill(null)));
  const soloCurrentPieceRef = useRef(null);
  const soloNextPiecesRef = useRef([]);
  const soloScoreRef = useRef(0);
  const soloLevelRef = useRef(1);
  const soloLinesRef = useRef(0);
  const soloGameOverRef = useRef(false);
  const soloIsFastDroppingRef = useRef(false);
  const soloBaseDropIntervalRef = useRef(1000);
  const soloDropIntervalRef = useRef(1000);
  const soloLastTimeRef = useRef(0);
  const soloDropCounterRef = useRef(0);
  const soloAnimFrameRef = useRef(null);
  const soloAudioCtxRef = useRef(null);
  const soloTouchActiveRef = useRef(false);
  const soloPlaySfx = useCallback((type) => {
    try {
      if (!soloAudioCtxRef.current) soloAudioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const ctx = soloAudioCtxRef.current;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      switch (type) {
        case 'rotate':
          osc.type = 'sine'; osc.frequency.setValueAtTime(400, now); osc.frequency.linearRampToValueAtTime(520, now + 0.06);
          gain.gain.setValueAtTime(0.025, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
          osc.start(now); osc.stop(now + 0.08); break;
        case 'move':
          osc.type = 'sine'; osc.frequency.value = 200;
          gain.gain.setValueAtTime(0.03, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
          osc.start(now); osc.stop(now + 0.04); break;
        case 'drop':
          osc.type = 'triangle'; osc.frequency.setValueAtTime(400, now); osc.frequency.linearRampToValueAtTime(100, now + 0.12);
          gain.gain.setValueAtTime(0.06, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
          osc.start(now); osc.stop(now + 0.15); break;
        case 'lock':
          osc.type = 'sine'; osc.frequency.setValueAtTime(220, now); osc.frequency.linearRampToValueAtTime(140, now + 0.08);
          gain.gain.setValueAtTime(0.03, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
          osc.start(now); osc.stop(now + 0.1); break;
        case 'gameover':
          osc.type = 'sine'; osc.frequency.setValueAtTime(330, now); osc.frequency.linearRampToValueAtTime(110, now + 0.8);
          gain.gain.setValueAtTime(0.03, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
          osc.start(now); osc.stop(now + 0.9); break;
        default: osc.start(now); osc.stop(now + 0.01);
      }
    } catch(e) {}
  }, []);
  const soloCanvasRef = useRef(null);
  const soloParticlesRef = useRef([]);
  const soloParticleAnimRef = useRef(null);
  const soloPlayClearSound = useCallback((cleared) => {
    try {
      if (!soloAudioCtxRef.current) soloAudioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const ctx = soloAudioCtxRef.current;
      const now = ctx.currentTime;
      if (cleared >= 4) {
        [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(0, now + i * 0.1);
          gain.gain.linearRampToValueAtTime(0.06, now + i * 0.1 + 0.03);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.35);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + i * 0.1);
          osc.stop(now + i * 0.1 + 0.35);
        });
      } else {
        const baseFreq = cleared === 1 ? 440 : cleared === 2 ? 523.25 : 659.25;
        for (let i = 0; i < cleared; i++) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.value = baseFreq * (1 + i * 0.2);
          gain.gain.setValueAtTime(0, now + i * 0.08);
          gain.gain.linearRampToValueAtTime(0.05, now + i * 0.08 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.25);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + i * 0.08);
          osc.stop(now + i * 0.08 + 0.25);
        }
      }
    } catch(e) {}
  }, []);
  const TETRIS_COLS = 20;
  const TETRIS_ROWS = 35;
  const [tetrisBoard, setTetrisBoard] = useState(() => Array.from({ length: TETRIS_ROWS }, () => Array(TETRIS_COLS).fill(0)));
  const [tetrisCurrentPiece, setTetrisCurrentPiece] = useState(null);
  const [tetrisP2Piece, setTetrisP2Piece] = useState(null);
  const [tetrisNextPiece, setTetrisNextPiece] = useState(null);
  const [tetrisP2NextPiece, setTetrisP2NextPiece] = useState(null);
  const [tetrisScore, setTetrisScore] = useState(0);
  const [tetrisLevel, setTetrisLevel] = useState(1);
  const [tetrisLines, setTetrisLines] = useState(0);
  const [tetrisGameOver, setTetrisGameOver] = useState(false);
  const [tetrisIsPlaying, setTetrisIsPlaying] = useState(false);
  const [tetrisIsPaused, setTetrisIsPaused] = useState(false);
  const tetrisPeerRef = useRef(null);
  const tetrisConnRef = useRef(null);
  const [tetrisIsHost, setTetrisIsHost] = useState(false);
  const [tetrisRoomId, setTetrisRoomId] = useState('');
  const [tetrisInputRoomId, setTetrisInputRoomId] = useState('');
  const [tetrisNickname, setTetrisNickname] = useState(() => { try { return localStorage.getItem('violentTetrisNickname') || ''; } catch(e) { return ''; } });
  const [tetrisOpponentNickname, setTetrisOpponentNickname] = useState('');
  const [tetrisConnected, setTetrisConnected] = useState(false);
  const [tetrisDevMode, setTetrisDevMode] = useState(false);
  const [tetrisDevView, setTetrisDevView] = useState('full');
  const [tetrisDiscoveredRooms, setTetrisDiscoveredRooms] = useState([]);
  const [tetrisIsScanningLan, setTetrisIsScanningLan] = useState(false);
  const [tetrisIsScanningLobby, setTetrisIsScanningLobby] = useState(false);
  const [tetrisHallMsg, setTetrisHallMsg] = useState('');
  const [serverConnected, setServerConnected] = useState(false);
  const [serverLatency, setServerLatency] = useState(null);
  const [localIP, setLocalIP] = useState('');

  const tetrisBoardRef = useRef(Array.from({ length: TETRIS_ROWS }, () => Array(TETRIS_COLS).fill(0)));
  const tetrisCurrentPieceRef = useRef(null);
  const tetrisP2PieceRef = useRef(null);
  const tetrisNextPieceRef = useRef(null);
  const tetrisP2NextPieceRef = useRef(null);
  const tetrisScoreRef = useRef(0);
  const tetrisLevelRef = useRef(1);
  const tetrisLinesRef = useRef(0);
  const tetrisGameOverRef = useRef(false);
  const tetrisDropCounterRef = useRef(0);
  const tetrisP2DropCounterRef = useRef(0);
  const tetrisP1FastDropRef = useRef(false);
  const tetrisP2FastDropRef = useRef(false);
  const tetrisBoardContainerRef = useRef(null);
  const [tetrisBoardSize, setTetrisBoardSize] = useState({ w: 0, h: 0 });
  const tetrisLastTimeRef = useRef(0);
  const tetrisAnimFrameRef = useRef(null);
  const tetrisHeartbeatRef = useRef(null);
  const tetrisLobbyPeerRef = useRef(null);
  const tetrisLobbyConnsRef = useRef([]);
  const tetrisRoomListRef = useRef([]);
  const TETRIS_SHAPES = { I: { shape: [[1,1,1,1]], color: '#5eead4' }, O: { shape: [[1,1],[1,1]], color: '#f472b6' }, T: { shape: [[0,1,0],[1,1,1]], color: '#93c5fd' }, S: { shape: [[0,1,1],[1,1,0]], color: '#f9a8d4' }, Z: { shape: [[1,1,0],[0,1,1]], color: '#7dd3fc' }, L: { shape: [[1,0],[1,0],[1,1]], color: '#2dd4bf' }, J: { shape: [[0,1],[0,1],[1,1]], color: '#a5b4fc' } };
  const TETRIS_PIECE_KEYS = Object.keys(TETRIS_SHAPES);
  const tetrisCreatePiece = useCallback((playerNum) => { const key = TETRIS_PIECE_KEYS[Math.floor(Math.random() * TETRIS_PIECE_KEYS.length)]; const def = TETRIS_SHAPES[key]; const startX = playerNum === 1 ? Math.floor((10 - def.shape[0].length) / 2) : 10 + Math.floor((10 - def.shape[0].length) / 2); return { shape: def.shape.map(r => [...r]), color: def.color, x: startX, y: 0, player: playerNum }; }, []);
  const tetrisCanPlace = useCallback((board, piece, otherPiece, offsetX = 0, offsetY = 0) => { if (!piece) return false; for (let r = 0; r < piece.shape.length; r++) { for (let c = 0; c < piece.shape[r].length; c++) { if (piece.shape[r][c]) { const nx = piece.x + c + offsetX; const ny = piece.y + r + offsetY; if (nx < 0 || nx >= TETRIS_COLS || ny >= TETRIS_ROWS) return false; if (ny >= 0 && board[ny][nx]) return false; if (otherPiece && ny >= 0) { for (let or = 0; or < otherPiece.shape.length; or++) { for (let oc = 0; oc < otherPiece.shape[or].length; oc++) { if (otherPiece.shape[or][oc] && otherPiece.x + oc === nx && otherPiece.y + or === ny) return false; } } } } } } return true; }, []);
  const tetrisPlacePiece = useCallback((board, piece) => { const newBoard = board.map(r => [...r]); if (!piece) return newBoard; for (let r = 0; r < piece.shape.length; r++) { for (let c = 0; c < piece.shape[r].length; c++) { if (piece.shape[r][c]) { const nx = piece.x + c; const ny = piece.y + r; if (ny >= 0 && ny < TETRIS_ROWS && nx >= 0 && nx < TETRIS_COLS) newBoard[ny][nx] = piece.color; } } } return newBoard; }, []);
  const tetrisClearLines = useCallback((board) => { let cleared = 0; const newBoard = board.filter(row => { if (row.every(cell => cell !== 0)) { cleared++; return false; } return true; }); while (newBoard.length < TETRIS_ROWS) newBoard.unshift(Array(TETRIS_COLS).fill(0)); return { board: newBoard, cleared }; }, []);
  const tetrisRotate = useCallback((piece) => { if (!piece) return null; const rows = piece.shape.length; const cols = piece.shape[0].length; const rotated = Array.from({ length: cols }, (_, c) => Array.from({ length: rows }, (_, r) => piece.shape[rows - 1 - r][c])); return { ...piece, shape: rotated }; }, []);
  const tetrisSyncToClient = useCallback(() => { if (!tetrisConnRef.current) return; tetrisConnRef.current.send({ type: 'tetris-sync', board: tetrisBoardRef.current, score: tetrisScoreRef.current, lines: tetrisLinesRef.current, level: tetrisLevelRef.current, p1Piece: tetrisCurrentPieceRef.current, p2Piece: tetrisP2PieceRef.current, p1Next: tetrisNextPieceRef.current, p2Next: tetrisP2NextPieceRef.current }); }, []);
  const tetrisTryRotate = useCallback((playerNum) => { const piece = playerNum === 1 ? tetrisCurrentPieceRef.current : tetrisP2PieceRef.current; const otherPiece = playerNum === 1 ? tetrisP2PieceRef.current : tetrisCurrentPieceRef.current; if (!piece) return; const rotated = tetrisRotate(piece); const kicks = [0, -1, 1, -2, 2, -3, 3]; for (const kick of kicks) { if (tetrisCanPlace(tetrisBoardRef.current, { ...rotated, x: rotated.x + kick }, otherPiece)) { rotated.x += kick; if (playerNum === 1) { tetrisCurrentPieceRef.current = rotated; setTetrisCurrentPiece({ ...rotated }); } else { tetrisP2PieceRef.current = rotated; setTetrisP2Piece({ ...rotated }); } tetrisSyncToClient(); return; } } }, [tetrisCanPlace, tetrisRotate, tetrisSyncToClient]);
  const tetrisMoveDownPiece = useCallback((playerNum) => { const piece = playerNum === 1 ? tetrisCurrentPieceRef.current : tetrisP2PieceRef.current; const otherPiece = playerNum === 1 ? tetrisP2PieceRef.current : tetrisCurrentPieceRef.current; if (!piece || tetrisGameOverRef.current) return; if (tetrisCanPlace(tetrisBoardRef.current, piece, otherPiece, 0, 1)) { piece.y += 1; if (playerNum === 1) { tetrisCurrentPieceRef.current = piece; setTetrisCurrentPiece({ ...piece }); } else { tetrisP2PieceRef.current = piece; setTetrisP2Piece({ ...piece }); } } else { const newBoard = tetrisPlacePiece(tetrisBoardRef.current, piece); const { board: clearedBoard, cleared } = tetrisClearLines(newBoard); tetrisBoardRef.current = clearedBoard; setTetrisBoard(clearedBoard.map(r => [...r])); const newLines = tetrisLinesRef.current + cleared; const newLevel = Math.floor(newLines / 10) + 1; const newScore = tetrisScoreRef.current + [0, 100, 300, 500, 800][cleared] * newLevel; tetrisLinesRef.current = newLines; tetrisScoreRef.current = newScore; tetrisLevelRef.current = newLevel; setTetrisLines(newLines); setTetrisScore(newScore); setTetrisLevel(newLevel); const nextRef = playerNum === 1 ? tetrisNextPieceRef : tetrisP2NextPieceRef; const next = nextRef.current || tetrisCreatePiece(playerNum); const otherP = playerNum === 1 ? tetrisP2PieceRef.current : tetrisCurrentPieceRef.current; if (!tetrisCanPlace(clearedBoard, next, otherP)) { tetrisGameOverRef.current = true; tetrisIsPlayingRef.current = false; setTetrisGameOver(true); setTetrisIsPlaying(false); if (tetrisAnimFrameRef.current) { cancelAnimationFrame(tetrisAnimFrameRef.current); tetrisAnimFrameRef.current = null; } if (tetrisConnRef.current) tetrisConnRef.current.send({ type: 'tetris-gameover' }); return; } const newNext = tetrisCreatePiece(playerNum); if (playerNum === 1) { tetrisCurrentPieceRef.current = next; tetrisNextPieceRef.current = newNext; setTetrisCurrentPiece({ ...next }); setTetrisNextPiece({ ...newNext }); } else { tetrisP2PieceRef.current = next; tetrisP2NextPieceRef.current = newNext; setTetrisP2Piece({ ...next }); setTetrisP2NextPiece({ ...newNext }); } } }, [tetrisCanPlace, tetrisPlacePiece, tetrisClearLines, tetrisCreatePiece]);
  const tetrisMoveLeft = useCallback((playerNum) => { const piece = playerNum === 1 ? tetrisCurrentPieceRef.current : tetrisP2PieceRef.current; const otherPiece = playerNum === 1 ? tetrisP2PieceRef.current : tetrisCurrentPieceRef.current; if (!piece || tetrisGameOverRef.current) return; if (tetrisCanPlace(tetrisBoardRef.current, piece, otherPiece, -1, 0)) { piece.x -= 1; if (playerNum === 1) { tetrisCurrentPieceRef.current = piece; setTetrisCurrentPiece({ ...piece }); } else { tetrisP2PieceRef.current = piece; setTetrisP2Piece({ ...piece }); } tetrisSyncToClient(); } }, [tetrisCanPlace, tetrisSyncToClient]);
  const tetrisMoveRight = useCallback((playerNum) => { const piece = playerNum === 1 ? tetrisCurrentPieceRef.current : tetrisP2PieceRef.current; const otherPiece = playerNum === 1 ? tetrisP2PieceRef.current : tetrisCurrentPieceRef.current; if (!piece || tetrisGameOverRef.current) return; if (tetrisCanPlace(tetrisBoardRef.current, piece, otherPiece, 1, 0)) { piece.x += 1; if (playerNum === 1) { tetrisCurrentPieceRef.current = piece; setTetrisCurrentPiece({ ...piece }); } else { tetrisP2PieceRef.current = piece; setTetrisP2Piece({ ...piece }); } tetrisSyncToClient(); } }, [tetrisCanPlace, tetrisSyncToClient]);
  const tetrisHardDrop = useCallback((playerNum) => { const piece = playerNum === 1 ? tetrisCurrentPieceRef.current : tetrisP2PieceRef.current; const otherPiece = playerNum === 1 ? tetrisP2PieceRef.current : tetrisCurrentPieceRef.current; if (!piece || tetrisGameOverRef.current) return; let dropDist = 0; while (tetrisCanPlace(tetrisBoardRef.current, piece, otherPiece, 0, dropDist + 1)) dropDist++; piece.y += dropDist; if (playerNum === 1) { tetrisCurrentPieceRef.current = piece; setTetrisCurrentPiece({ ...piece }); } else { tetrisP2PieceRef.current = piece; setTetrisP2Piece({ ...piece }); } tetrisMoveDownPiece(playerNum); }, [tetrisCanPlace, tetrisMoveDownPiece]);
  const tetrisIsPlayingRef = useRef(false);
  const tetrisStartGame = useCallback(() => { const emptyBoard = Array.from({ length: TETRIS_ROWS }, () => Array(TETRIS_COLS).fill(0)); tetrisBoardRef.current = emptyBoard; setTetrisBoard(emptyBoard.map(r => [...r])); const p1 = tetrisCreatePiece(1); const p1Next = tetrisCreatePiece(1); const p2 = tetrisCreatePiece(2); const p2Next = tetrisCreatePiece(2); tetrisCurrentPieceRef.current = p1; tetrisNextPieceRef.current = p1Next; tetrisP2PieceRef.current = p2; tetrisP2NextPieceRef.current = p2Next; setTetrisCurrentPiece({ ...p1 }); setTetrisNextPiece({ ...p1Next }); setTetrisP2Piece({ ...p2 }); setTetrisP2NextPiece({ ...p2Next }); tetrisScoreRef.current = 0; tetrisLevelRef.current = 1; tetrisLinesRef.current = 0; tetrisGameOverRef.current = false; tetrisDropCounterRef.current = 0; tetrisP2DropCounterRef.current = 0; tetrisLastTimeRef.current = 0; tetrisIsPlayingRef.current = true; setTetrisScore(0); setTetrisLevel(1); setTetrisLines(0); setTetrisGameOver(false); setTetrisIsPlaying(true); setTetrisIsPaused(false); if (tetrisAnimFrameRef.current) cancelAnimationFrame(tetrisAnimFrameRef.current); const gameLoop = (time) => { if (tetrisGameOverRef.current || !tetrisIsPlayingRef.current) return; if (tetrisLastTimeRef.current === 0) tetrisLastTimeRef.current = time; const delta = time - tetrisLastTimeRef.current; tetrisLastTimeRef.current = time; const speed = Math.max(100, 1000 - (tetrisLevelRef.current - 1) * 80); const p1Speed = tetrisP1FastDropRef.current ? 40 : speed; const p2Speed = tetrisP2FastDropRef.current ? 40 : speed; tetrisDropCounterRef.current += delta; tetrisP2DropCounterRef.current += delta; if (tetrisDropCounterRef.current >= p1Speed) { tetrisDropCounterRef.current -= p1Speed; tetrisMoveDownPiece(1); } if (tetrisP2DropCounterRef.current >= p2Speed) { tetrisP2DropCounterRef.current -= p2Speed; tetrisMoveDownPiece(2); } tetrisSyncToClient(); tetrisAnimFrameRef.current = requestAnimationFrame(gameLoop); }; tetrisAnimFrameRef.current = requestAnimationFrame(gameLoop); if (tetrisConnRef.current) tetrisConnRef.current.send({ type: 'tetris-start' }); }, [tetrisCreatePiece, tetrisMoveDownPiece, tetrisSyncToClient]);
  useEffect(() => { return () => { if (tetrisAnimFrameRef.current) cancelAnimationFrame(tetrisAnimFrameRef.current); }; }, []);
  useEffect(() => { const handleKey = (e) => { if (activeGame !== 'tetris' || !tetrisIsPlaying || tetrisGameOver || tetrisIsPaused) return; const isLocalDevMode = tetrisDevMode && !tetrisConnected; const isHost = tetrisIsHost || isLocalDevMode; const devP1Only = isLocalDevMode && tetrisDevView === 'p1'; const devP2Only = isLocalDevMode && tetrisDevView === 'p2'; const send = (action) => { if (tetrisConnRef.current && !tetrisDevMode) tetrisConnRef.current.send({ type: 'tetris-move', player: 2, action }); }; if (isHost) { switch (e.key) { case 'ArrowLeft': e.preventDefault(); if (!devP2Only) tetrisMoveLeft(1); break; case 'ArrowRight': e.preventDefault(); if (!devP2Only) tetrisMoveRight(1); break; case 'ArrowDown': e.preventDefault(); if (!devP2Only) { tetrisP1FastDropRef.current = true; tetrisDropCounterRef.current = 0; } break; case 'ArrowUp': e.preventDefault(); if (!devP2Only) tetrisTryRotate(1); break; case ' ': e.preventDefault(); if (!devP2Only) tetrisHardDrop(1); break; case 'a': case 'A': e.preventDefault(); if (!devP1Only) tetrisMoveLeft(2); break; case 'd': case 'D': e.preventDefault(); if (!devP1Only) tetrisMoveRight(2); break; case 's': case 'S': e.preventDefault(); if (!devP1Only) { tetrisP2FastDropRef.current = true; tetrisP2DropCounterRef.current = 0; } break; case 'w': case 'W': e.preventDefault(); if (!devP1Only) tetrisTryRotate(2); break; case 'q': case 'Q': e.preventDefault(); if (!devP1Only) tetrisHardDrop(2); break; } } else { switch (e.key) { case 'ArrowLeft': e.preventDefault(); send('left'); break; case 'ArrowRight': e.preventDefault(); send('right'); break; case 'ArrowDown': e.preventDefault(); send('fastdrop-start'); break; case 'ArrowUp': e.preventDefault(); send('rotate'); break; case ' ': e.preventDefault(); send('harddrop'); break; } } }; const handleKeyUp = (e) => { if (activeGame !== 'tetris') return; const isLocalDevMode = tetrisDevMode && !tetrisConnected; const isHost = tetrisIsHost || isLocalDevMode; if (isHost) { if (e.key === 'ArrowDown') tetrisP1FastDropRef.current = false; if (e.key === 's' || e.key === 'S') tetrisP2FastDropRef.current = false; } else { if (e.key === 'ArrowDown' && tetrisConnRef.current && !isLocalDevMode) tetrisConnRef.current.send({ type: 'tetris-move', player: 2, action: 'fastdrop-stop' }); } }; window.addEventListener('keydown', handleKey); window.addEventListener('keyup', handleKeyUp); return () => { window.removeEventListener('keydown', handleKey); window.removeEventListener('keyup', handleKeyUp); }; }, [activeGame, tetrisIsPlaying, tetrisGameOver, tetrisIsPaused, tetrisIsHost, tetrisDevMode, tetrisDevView, tetrisMoveLeft, tetrisMoveRight, tetrisMoveDownPiece, tetrisTryRotate, tetrisHardDrop]);
  useEffect(() => {
    const update = () => {
      const el = tetrisBoardContainerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const availH = rect.height - 50;
      const availW = rect.width - 16;
      const cellFromH = Math.floor(availH / TETRIS_ROWS);
      const cellFromW = Math.floor(availW / TETRIS_COLS);
      const cell = Math.min(cellFromH, cellFromW);
      if (cell > 0) {
        const nw = cell * TETRIS_COLS;
        const nh = cell * TETRIS_ROWS;
        setTetrisBoardSize(prev => (prev.w === nw && prev.h === nh) ? prev : { w: nw, h: nh });
      }
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  useEffect(() => {
    let mounted = true;
    let pingPeer = null;
    let timerRef = null;
    const connectServer = () => {
      if (pingPeer) { try { pingPeer.destroy(); } catch(e) {} }
      const connectStart = Date.now();
      pingPeer = new Peer(undefined, PEER_SERVER_CONFIG);
      let connected = false;
      timerRef = setTimeout(() => {
        if (!connected && mounted) {
          setServerConnected(false);
          setServerLatency(null);
          try { pingPeer.destroy(); } catch(e) {}
          setTimeout(() => { if (mounted) connectServer(); }, 5000);
        }
      }, 8000);
      pingPeer.on('open', () => {
        connected = true;
        if (timerRef) { clearTimeout(timerRef); timerRef = null; }
        if (!mounted) return;
        const latency = Date.now() - connectStart;
        setServerLatency(latency);
        setServerConnected(true);
      });
      pingPeer.on('disconnected', () => {
        if (!mounted) return;
        setServerConnected(false);
        setServerLatency(null);
        setTimeout(() => { if (mounted) connectServer(); }, 3000);
      });
      pingPeer.on('error', () => {
        if (!mounted) return;
        setServerConnected(false);
        setServerLatency(null);
        if (pingPeer) { try { pingPeer.destroy(); } catch(e) {} }
        setTimeout(() => { if (mounted) connectServer(); }, 5000);
      });
    };
    connectServer();
    return () => { mounted = false; if (timerRef) clearTimeout(timerRef); if (pingPeer) { try { pingPeer.destroy(); } catch(e) {} } };
  }, []);
  useEffect(() => {
    try {
      const pc = new RTCPeerConnection({ iceServers: [] });
      pc.createDataChannel('');
      pc.createOffer().then(offer => pc.setLocalDescription(offer));
      pc.onicecandidate = (e) => {
        if (!e || !e.candidate || !e.candidate.candidate) return;
        const parts = e.candidate.candidate.split(' ');
        const ip = parts[4];
        if (ip && /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(ip)) {
          setLocalIP(ip);
          pc.close();
        }
      };
    } catch {}
  }, []);
  const tetrisScanLanRooms = () => {
    setTetrisIsScanningLan(true);
    setTetrisDiscoveredRooms([]);
    setTetrisHallMsg('');
    const scanPeer = new Peer();
    let timeoutId = null;
    scanPeer.on('open', () => {
      const lobbyConn = scanPeer.connect('tetris-lobby', { metadata: { type: 'scan' } });
      lobbyConn.on('open', () => { lobbyConn.send({ type: 'scan' }); });
      lobbyConn.on('data', (data) => {
        if (data.type === 'room-list') {
          setTetrisDiscoveredRooms(data.rooms || []);
          setTetrisIsScanningLan(false);
          if (timeoutId) clearTimeout(timeoutId);
          scanPeer.destroy();
        }
      });
      lobbyConn.on('error', () => { setTetrisIsScanningLan(false); if (timeoutId) clearTimeout(timeoutId); scanPeer.destroy(); });
      timeoutId = setTimeout(() => { setTetrisIsScanningLan(false); scanPeer.destroy(); setTetrisHallMsg('搜索超时，当前无在线房间'); setTimeout(() => setTetrisHallMsg(''), 3000); }, 12000);
    });
    scanPeer.on('error', () => { setTetrisIsScanningLan(false); if (timeoutId) clearTimeout(timeoutId); });
  };

  const tetrisScanLobbyRooms = async () => {
    setTetrisIsScanningLobby(true);
    setTetrisDiscoveredRooms([]);
    setTetrisHallMsg('');
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(`${PEERJS_API_BASE}/peerjs/peers`, { signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const peerData = await res.json();
      let peerIds = [];
      if (Array.isArray(peerData)) { peerIds = peerData; }
      else if (peerData && typeof peerData === 'object' && !Array.isArray(peerData)) { peerIds = Object.keys(peerData); }
      else if (Array.isArray(peerData?.peers)) { peerIds = peerData.peers; }
      const roomPeers = peerIds.filter(id => typeof id === 'string' && id.startsWith('tetris-'));
      const foundRooms = roomPeers.map(id => ({ roomId: String(id).replace('tetris-', '') }));
      if (foundRooms.length > 0) { setTetrisDiscoveredRooms(foundRooms); }
      else { setTetrisDiscoveredRooms([]); setTetrisHallMsg('大厅无在线房间'); setTimeout(() => setTetrisHallMsg(''), 3000); }
    } catch (err) {
      if (err.name === 'AbortError') { setTetrisHallMsg('搜索超时，请检查网络'); }
      else { setTetrisHallMsg('无法连接服务器，请检查网络'); }
      setTimeout(() => setTetrisHallMsg(''), 3000);
    } finally { setTetrisIsScanningLobby(false); }
  };

  const tetrisCreateRoom = useCallback(() => { if (!tetrisNickname.trim()) return; const roomId = Math.random().toString(36).substring(2, 7).toUpperCase(); setTetrisRoomId(roomId); setTetrisIsHost(true); const peer = new Peer('tetris-' + roomId, PEER_SERVER_CONFIG); tetrisPeerRef.current = peer; peer.on('open', () => { setTetrisConnected(true); setTetrisHallMsg('房间已创建，等待对手加入...'); setTimeout(() => setTetrisHallMsg(''), 3000); peer.on('connection', (conn) => { conn.on('open', () => { tetrisConnRef.current = conn; setTetrisConnected(true); setTetrisOpponentNickname(conn.metadata?.nickname || '对手'); conn.send({ type: 'tetris-welcome', nickname: tetrisNickname }); if (tetrisIsPlayingRef.current) { conn.send({ type: 'tetris-start' }); } }); conn.on('data', (data) => { if (data.type === 'tetris-move') { const p = data.player; const a = data.action; if (a === 'left') tetrisMoveLeft(p); else if (a === 'right') tetrisMoveRight(p); else if (a === 'down') tetrisMoveDownPiece(p); else if (a === 'rotate') tetrisTryRotate(p); else if (a === 'harddrop') tetrisHardDrop(p); else if (a === 'fastdrop-start') { if (p === 2) { tetrisP2FastDropRef.current = true; tetrisP2DropCounterRef.current = 0; } else if (p === 1) { tetrisP1FastDropRef.current = true; tetrisDropCounterRef.current = 0; } } else if (a === 'fastdrop-stop') { if (p === 2) tetrisP2FastDropRef.current = false; else if (p === 1) tetrisP1FastDropRef.current = false; } } else if (data.type === 'tetris-welcome') { setTetrisOpponentNickname(data.nickname); } }); conn.on('close', () => { setTetrisConnected(false); tetrisConnRef.current = null; if (tetrisAnimFrameRef.current) { cancelAnimationFrame(tetrisAnimFrameRef.current); tetrisAnimFrameRef.current = null; } setTetrisIsPlaying(false); setTetrisHallMsg('对手已断开连接'); setTimeout(() => setTetrisHallMsg(''), 3000); }); conn.on('error', () => { setTetrisConnected(false); tetrisConnRef.current = null; if (tetrisAnimFrameRef.current) { cancelAnimationFrame(tetrisAnimFrameRef.current); tetrisAnimFrameRef.current = null; } setTetrisIsPlaying(false); }); }); const lobbyPeer = new Peer('tetris-lobby', PEER_SERVER_CONFIG); lobbyPeer.on('open', () => { tetrisLobbyPeerRef.current = lobbyPeer; tetrisRoomListRef.current = [{ roomId, hostName: tetrisNickname, playerCount: 1, createdAt: Date.now() }]; lobbyPeer.on('connection', (lc) => { lc.on('open', () => { tetrisLobbyConnsRef.current.push(lc); }); lc.on('data', (d) => { if (d.type === 'register') { const ex = tetrisRoomListRef.current.find(r => r.roomId === d.roomId); if (!ex) tetrisRoomListRef.current = [...tetrisRoomListRef.current, { roomId: d.roomId, hostName: d.hostName || d.nickname, playerCount: 1, createdAt: Date.now() }]; tetrisLobbyConnsRef.current.forEach(c => { try { c.send({ type: 'room-list', rooms: tetrisRoomListRef.current }); } catch(e) {} }); } else if (d.type === 'scan') { lc.send({ type: 'room-list', rooms: tetrisRoomListRef.current }); } else if (d.type === 'unregister') { tetrisRoomListRef.current = tetrisRoomListRef.current.filter(r => r.roomId !== d.roomId); tetrisLobbyConnsRef.current.forEach(c => { try { c.send({ type: 'room-list', rooms: tetrisRoomListRef.current }); } catch(e) {} }); } }); lc.on('close', () => { tetrisLobbyConnsRef.current = tetrisLobbyConnsRef.current.filter(c => c !== lc); }); }); }); lobbyPeer.on('error', () => { const regPeer = new Peer(undefined, PEER_SERVER_CONFIG); regPeer.on('open', () => { const regConn = regPeer.connect('tetris-lobby', { metadata: { type: 'register', roomId, nickname: tetrisNickname } }); regConn.on('open', () => { regConn.send({ type: 'register', roomId, nickname: tetrisNickname, hostName: tetrisNickname }); tetrisLobbyConnsRef.current.push(regConn); }); regConn.on('error', () => { regPeer.destroy(); }); }); regPeer.on('error', () => {}); }); }); peer.on('error', (err) => { console.error('Tetris peer error:', err); setTetrisHallMsg('连接失败，请检查网络'); setTimeout(() => setTetrisHallMsg(''), 3000); }); peer.on('disconnected', () => { setTetrisConnected(false); setTetrisHallMsg('与信令服务器断开连接，尝试重连...'); if (tetrisPeerRef.current) tetrisPeerRef.current.reconnect(); }); }, [tetrisNickname, tetrisMoveLeft, tetrisMoveRight, tetrisMoveDownPiece, tetrisTryRotate, tetrisHardDrop]);
  const tetrisJoinRoom = useCallback(() => {
    if (!tetrisNickname.trim() || !tetrisInputRoomId.trim()) return;
    setTetrisHallMsg('正在加入房间...');
    let retries = 0;
    const maxRetries = 3;
    let peer = null, conn = null;

    const attemptJoin = () => {
      if (peer) { try { peer.destroy(); } catch(e) {} }
      peer = new Peer(undefined, PEER_SERVER_CONFIG);
      tetrisPeerRef.current = peer;

      peer.on('open', () => {
        const targetId = 'tetris-' + tetrisInputRoomId.toUpperCase();
        conn = peer.connect(targetId, { metadata: { nickname: tetrisNickname }, reliable: true });
        const connectTimeout = setTimeout(() => {
          if (retries < maxRetries) {
            retries++;
            setTetrisHallMsg(`连接超时，正在重试(${retries}/${maxRetries})...`);
            setTimeout(() => attemptJoin(), 1000);
          } else {
            setTetrisHallMsg('无法连接到房间，请确认房间号正确且房主在线');
            setTimeout(() => setTetrisHallMsg(''), 4000);
            try { peer.destroy(); } catch(e) {}
          }
        }, 12000);

        conn.on('open', () => {
          clearTimeout(connectTimeout);
          tetrisConnRef.current = conn;
          setTetrisConnected(true);
          setTetrisRoomId(tetrisInputRoomId.toUpperCase());
          setTetrisIsHost(false);
          setTetrisHallMsg('已加入房间！');
          setTimeout(() => setTetrisHallMsg(''), 2000);
        });
        conn.on('data', (data) => {
          if (data.type === 'tetris-sync') {
            tetrisBoardRef.current = data.board; setTetrisBoard(data.board.map(r => [...r])); setTetrisScore(data.score); setTetrisLines(data.lines); setTetrisLevel(data.level);
            tetrisScoreRef.current = data.score; tetrisLinesRef.current = data.lines; tetrisLevelRef.current = data.level;
            if (data.p1Piece) { tetrisCurrentPieceRef.current = data.p1Piece; setTetrisCurrentPiece(data.p1Piece); }
            if (data.p2Piece) { tetrisP2PieceRef.current = data.p2Piece; setTetrisP2Piece(data.p2Piece); }
            if (data.p1Next) { tetrisNextPieceRef.current = data.p1Next; setTetrisNextPiece(data.p1Next); }
            if (data.p2Next) { tetrisP2NextPieceRef.current = data.p2Next; setTetrisP2NextPiece(data.p2Next); }
          } else if (data.type === 'tetris-start') { setTetrisIsPlaying(true); setTetrisGameOver(false); }
          else if (data.type === 'tetris-gameover') { setTetrisGameOver(true); setTetrisIsPlaying(false); }
          else if (data.type === 'tetris-welcome') { setTetrisOpponentNickname(data.nickname); }
        });
        conn.on('close', () => { setTetrisConnected(false); tetrisConnRef.current = null; setTetrisIsPlaying(false); setTetrisHallMsg('对手已断开连接'); setTimeout(() => setTetrisHallMsg(''), 3000); });
        conn.on('error', () => { setTetrisConnected(false); tetrisConnRef.current = null; setTetrisIsPlaying(false); });
      });
      peer.on('error', (err) => {
        console.error('Tetris join error:', err.message || err);
        if (retries < maxRetries) {
          retries++;
          setTetrisHallMsg(`连接失败，正在重试(${retries}/${maxRetries})...`);
          setTimeout(() => attemptJoin(), 1500);
        } else {
          setTetrisHallMsg('无法连接，请确认信令服务器在线且房间号正确');
          setTimeout(() => setTetrisHallMsg(''), 4000);
        }
      });
      peer.on('disconnected', () => { setTetrisConnected(false); setTetrisHallMsg('与信令服务器断开连接，尝试重连...'); if (tetrisPeerRef.current) tetrisPeerRef.current.reconnect(); });
    };
    attemptJoin();
  }, [tetrisNickname, tetrisInputRoomId]);
  const tetrisLeaveRoom = useCallback(() => { if (tetrisAnimFrameRef.current) { cancelAnimationFrame(tetrisAnimFrameRef.current); tetrisAnimFrameRef.current = null; } if (tetrisHeartbeatRef.current) { clearInterval(tetrisHeartbeatRef.current); tetrisHeartbeatRef.current = null; } if (tetrisLobbyPeerRef.current) { tetrisLobbyPeerRef.current.destroy(); tetrisLobbyPeerRef.current = null; } tetrisLobbyConnsRef.current = []; tetrisRoomListRef.current = []; if (tetrisConnRef.current) { tetrisConnRef.current.close(); tetrisConnRef.current = null; } if (tetrisPeerRef.current) { tetrisPeerRef.current.destroy(); tetrisPeerRef.current = null; } tetrisP1FastDropRef.current = false; tetrisP2FastDropRef.current = false; tetrisDropCounterRef.current = 0; tetrisP2DropCounterRef.current = 0; tetrisScoreRef.current = 0; tetrisLevelRef.current = 1; tetrisLinesRef.current = 0; tetrisGameOverRef.current = false; tetrisIsPlayingRef.current = false; tetrisLastTimeRef.current = 0; tetrisBoardRef.current = Array.from({ length: TETRIS_ROWS }, () => Array(TETRIS_COLS).fill(0)); tetrisCurrentPieceRef.current = null; tetrisNextPieceRef.current = null; tetrisP2PieceRef.current = null; tetrisP2NextPieceRef.current = null; setTetrisConnected(false); setTetrisIsPlaying(false); setTetrisGameOver(false); setTetrisRoomId(''); setTetrisIsHost(false); setTetrisOpponentNickname(''); setTetrisBoard(Array.from({ length: TETRIS_ROWS }, () => Array(TETRIS_COLS).fill(0))); setTetrisCurrentPiece(null); setTetrisNextPiece(null); setTetrisP2Piece(null); setTetrisP2NextPiece(null); setTetrisScore(0); setTetrisLevel(1); setTetrisLines(0); setTetrisIsPaused(false); }, []);
  useEffect(() => { try { localStorage.setItem('violentTetrisNickname', tetrisNickname); } catch(e) {} }, [tetrisNickname]);
  useEffect(() => { return () => { if (tetrisAnimFrameRef.current) cancelAnimationFrame(tetrisAnimFrameRef.current); if (tetrisHeartbeatRef.current) { clearInterval(tetrisHeartbeatRef.current); tetrisHeartbeatRef.current = null; } if (tetrisLobbyPeerRef.current) { tetrisLobbyPeerRef.current.destroy(); tetrisLobbyPeerRef.current = null; } tetrisLobbyConnsRef.current = []; tetrisRoomListRef.current = []; if (tetrisPeerRef.current) tetrisPeerRef.current.destroy(); }; }, []);
  const tetrisRenderBoard = useCallback((board, p1Piece, p2Piece) => { const displayBoard = board.map(r => [...r]); const toGhost = (hex) => { if (!hex || !hex.startsWith('#') || hex.length < 7) return hex; const r = parseInt(hex.slice(1,3),16); const g = parseInt(hex.slice(3,5),16); const b = parseInt(hex.slice(5,7),16); return `rgba(${r},${g},${b},0.25)`; }; [p1Piece, p2Piece].forEach(piece => { if (!piece) return; const otherPiece = piece === p1Piece ? p2Piece : p1Piece; let ghostY = piece.y; while (tetrisCanPlace(board, { ...piece, y: ghostY + 1 }, otherPiece)) ghostY++; if (ghostY !== piece.y) { for (let r = 0; r < piece.shape.length; r++) { for (let c = 0; c < piece.shape[r].length; c++) { if (piece.shape[r][c]) { const nx = piece.x + c; const ny = ghostY + r; if (ny >= 0 && ny < TETRIS_ROWS && nx >= 0 && nx < TETRIS_COLS && !displayBoard[ny][nx]) displayBoard[ny][nx] = toGhost(piece.color); } } } } for (let r = 0; r < piece.shape.length; r++) { for (let c = 0; c < piece.shape[r].length; c++) { if (piece.shape[r][c]) { const nx = piece.x + c; const ny = piece.y + r; if (ny >= 0 && ny < TETRIS_ROWS && nx >= 0 && nx < TETRIS_COLS) displayBoard[ny][nx] = piece.color; } } } }); return displayBoard; }, [tetrisCanPlace]);
  const startSoloParticles = useCallback((rows, boardSnapshot) => {
    const canvas = soloCanvasRef.current;
    if (!canvas) return;
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    const cw = canvas.width;
    const ch = canvas.height;
    const cellW = cw / 10;
    const cellH = ch / 20;
    const particles = [];
    rows.forEach(r => {
      for (let c = 0; c < 10; c++) {
        const color = boardSnapshot[r][c];
        if (!color) continue;
        const cx = (c + 0.5) * cellW;
        const cy = (r + 0.5) * cellH;
        const pieceCount = 3 + Math.floor(Math.random() * 3);
        for (let i = 0; i < pieceCount; i++) {
          particles.push({
            x: cx + (Math.random() - 0.5) * cellW * 0.4,
            y: cy + (Math.random() - 0.5) * cellH * 0.4,
            vx: (Math.random() - 0.5) * cellW * 0.06,
            vy: -(Math.random() * cellH * 0.06 + cellH * 0.03),
            size: Math.min(cellW, cellH) * (0.15 + Math.random() * 0.2),
            color,
            rotation: Math.random() * Math.PI * 2,
            angularVel: (Math.random() - 0.5) * 0.15,
            opacity: 1,
            gravity: cellH * 0.0015 + Math.random() * cellH * 0.001,
            life: 0,
            maxLife: 55 + Math.floor(Math.random() * 25),
          });
        }
      }
    });
    if (particles.length === 0) return;
    soloParticlesRef.current = particles;
    if (soloParticleAnimRef.current) cancelAnimationFrame(soloParticleAnimRef.current);
    const ctx = canvas.getContext('2d');
    let lastTime = null;
    const animate = (ts) => {
      if (!lastTime) lastTime = ts;
      lastTime = ts;
      ctx.clearRect(0, 0, cw, ch);
      let allDone = true;
      soloParticlesRef.current.forEach(p => {
        if (p.life < 0) return;
        p.life++;
        if (p.life < 8) {
          ctx.globalAlpha = p.opacity;
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = p.color;
          ctx.shadowBlur = cellW * 0.4;
          const s = p.size * (1 + p.life * 0.03);
          ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
        } else if (p.life < 18) {
          p.vy += p.gravity;
          p.x += p.vx;
          p.y += p.vy;
          ctx.globalAlpha = p.opacity;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          p.rotation += p.angularVel;
          ctx.fillStyle = p.color;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = cellW * 0.2;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          ctx.restore();
        } else if (p.life < p.maxLife) {
          p.vy += p.gravity;
          p.x += p.vx;
          p.y += p.vy;
          p.opacity = Math.max(0, p.opacity - 0.02);
          ctx.globalAlpha = p.opacity;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          p.rotation += p.angularVel;
          ctx.fillStyle = p.color;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = cellW * 0.1;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          ctx.restore();
        } else {
          return;
        }
        allDone = false;
      });
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      if (!allDone) {
        soloParticleAnimRef.current = requestAnimationFrame(animate);
      } else {
        soloParticlesRef.current = [];
        ctx.clearRect(0, 0, cw, ch);
      }
    };
    soloParticleAnimRef.current = requestAnimationFrame(animate);
  }, []);
  const soloCreatePiece = useCallback(() => {
    const base = SOLO_SHAPES[Math.floor(Math.random() * SOLO_SHAPES.length)];
    return { shape: base.shape.map(r => [...r]), color: base.color, x: Math.floor((10 - base.shape[0].length) / 2), y: 0 };
  }, [SOLO_SHAPES]);
  const soloSpawnPiece = useCallback(() => {
    const np = [...soloNextPiecesRef.current];
    while (np.length < 4) {
      np.push(soloCreatePiece());
    }
    const next = np.shift();
    soloCurrentPieceRef.current = next;
    soloNextPiecesRef.current = np;
    setSoloCurrentPiece({ ...next });
    setSoloNextPieces([...np]);
    if (soloCollide()) soloGameOverFn();
  }, [soloCreatePiece]);
  const soloCollide = useCallback(() => {
    const piece = soloCurrentPieceRef.current;
    if (!piece) return false;
    for (let r = 0; r < piece.shape.length; r++) {
      for (let c = 0; c < piece.shape[r].length; c++) {
        if (piece.shape[r][c]) {
          const ny = piece.y + r;
          const nx = piece.x + c;
          if (ny >= 20 || nx < 0 || nx >= 10 || (ny >= 0 && soloBoardRef.current[ny][nx])) return true;
        }
      }
    }
    return false;
  }, []);
  const soloMerge = useCallback(() => {
    const piece = soloCurrentPieceRef.current;
    if (!piece) return;
    const board = soloBoardRef.current.map(r => [...r]);
    piece.shape.forEach((row, r) => {
      row.forEach((v, c) => {
        if (v) {
          const ny = piece.y + r;
          const nx = piece.x + c;
          if (ny >= 0 && ny < 20 && nx >= 0 && nx < 10) board[ny][nx] = piece.color;
        }
      });
    });
    const clearedRows = [];
    const boardCopy = board.map(r => [...r]);
    let cleared = 0;
    for (let r = 19; r >= 0; r--) {
      if (board[r].every(v => v !== null)) {
        clearedRows.push(r);
        board.splice(r, 1);
        board.unshift(Array(10).fill(null));
        cleared++;
        r++;
      }
    }
    if (cleared === 0) {}
    if (cleared > 0) {
      startSoloParticles(clearedRows, boardCopy);
      soloPlayClearSound(cleared);
      const newLines = soloLinesRef.current + cleared;
      const newLevel = Math.floor(newLines / 10) + 1;
      const baseScore = cleared <= 5 ? [0, 10, 30, 50, 80, 100][cleared] : 100 + (cleared - 5) * 10;
      const newScore = soloScoreRef.current + baseScore;
      soloLinesRef.current = newLines;
      soloScoreRef.current = newScore;
      soloLevelRef.current = newLevel;
      setSoloLines(newLines);
      setSoloScore(newScore);
      setSoloLevel(newLevel);
      if (soloLevelSpeedRef.current) {
        soloBaseDropIntervalRef.current = Math.max(100, 1000 - (newLevel - 1) * 100);
      }
      if (!soloIsFastDroppingRef.current) soloDropIntervalRef.current = soloBaseDropIntervalRef.current;
    }
    soloBoardRef.current = board;
    setSoloBoard(board.map(r => [...r]));
    soloSpawnPiece();
  }, [soloSpawnPiece, soloPlayClearSound, startSoloParticles]);
  const soloRotateFn = useCallback(() => {
    const piece = soloCurrentPieceRef.current;
    if (!piece) return;
    const s = piece.shape;
    const rotated = s[0].map((_, i) => s.map(row => row[i]).reverse());
    const oldShape = piece.shape;
    const oldX = piece.x;
    piece.shape = rotated;
    if (!soloCollide()) { soloCurrentPieceRef.current = piece; setSoloCurrentPiece({ ...piece }); soloPlaySfx('rotate'); return; }
    for (const dx of [-1, 1, -2, 2, -3, 3]) {
      piece.x = oldX + dx;
      if (!soloCollide()) { soloCurrentPieceRef.current = piece; setSoloCurrentPiece({ ...piece }); soloPlaySfx('rotate'); return; }
    }
    piece.shape = oldShape; piece.x = oldX;
  }, [soloCollide]);

  const soloMoveLeft = useCallback(() => {
    const piece = soloCurrentPieceRef.current;
    if (!piece || soloGameOverRef.current) return;
    piece.x--;
    if (soloCollide()) piece.x++;
    else { soloCurrentPieceRef.current = piece; setSoloCurrentPiece({ ...piece }); }
  }, [soloCollide]);
  const soloMoveRight = useCallback(() => {
    const piece = soloCurrentPieceRef.current;
    if (!piece || soloGameOverRef.current) return;
    piece.x++;
    if (soloCollide()) piece.x--;
    else { soloCurrentPieceRef.current = piece; setSoloCurrentPiece({ ...piece }); }
  }, [soloCollide]);
  const soloStartFastDrop = useCallback(() => {
    if (soloIsFastDroppingRef.current || !soloIsPlaying || soloGameOverRef.current) return;
    soloIsFastDroppingRef.current = true;
    setSoloIsFastDropping(true);
    soloDropIntervalRef.current = 40;
    soloDropCounterRef.current = 40;
  }, [soloIsPlaying]);
  const soloStopFastDrop = useCallback(() => {
    if (!soloIsFastDroppingRef.current) return;
    soloIsFastDroppingRef.current = false;
    setSoloIsFastDropping(false);
    soloDropIntervalRef.current = soloBaseDropIntervalRef.current;
  }, []);
  const soloHardDropFn = useCallback(() => {
    const piece = soloCurrentPieceRef.current;
    if (!piece || soloGameOverRef.current || soloIsPausedRef.current) return;
    while (!soloCollide()) piece.y++;
    piece.y--;
    soloMerge();
    soloPlaySfx('drop');
  }, [soloCollide, soloMerge, soloPlaySfx]);
  const soloGameLoop = useCallback((time) => {
    if (!soloIsPlaying || soloGameOverRef.current || soloIsPausedRef.current) {
      soloLastTimeRef.current = time;
      soloDropCounterRef.current = 0;
      soloAnimFrameRef.current = requestAnimationFrame(soloGameLoop);
      return;
    }
    const delta = time - soloLastTimeRef.current;
    soloLastTimeRef.current = time;
    soloDropCounterRef.current += delta;
    if (soloDropCounterRef.current > soloDropIntervalRef.current) {
      const piece = soloCurrentPieceRef.current;
      if (piece) {
        piece.y++;
        if (soloCollide()) {
          piece.y--;
          soloMerge();
          if (soloIsFastDroppingRef.current) soloDropCounterRef.current = -150;
        } else {
          soloDropCounterRef.current = 0;
          setSoloCurrentPiece({ ...piece });
          soloCurrentPieceRef.current = piece;
        }
      }
    }
    soloAnimFrameRef.current = requestAnimationFrame(soloGameLoop);
  }, [soloIsPlaying, soloCollide, soloMerge]);
  const soloStartGame = useCallback(() => {
    const emptyBoard = Array.from({ length: 20 }, () => Array(10).fill(null));
    soloBoardRef.current = emptyBoard;
    setSoloBoard(emptyBoard.map(r => [...r]));
    soloNextPiecesRef.current = [];
    soloCurrentPieceRef.current = null;
    soloScoreRef.current = 0;
    soloLevelRef.current = 1;
    soloLinesRef.current = 0;
    soloGameOverRef.current = false;
    soloIsFastDroppingRef.current = false;
    soloLevelSpeedRef.current = soloLevelSpeed;
    soloBaseDropIntervalRef.current = 1000;
    soloDropIntervalRef.current = 1000;
    soloDropCounterRef.current = 0;
    setSoloScore(0);
    setSoloLevel(1);
    setSoloLines(0);
    setSoloGameOver(false);
    setSoloIsPlaying(true);
    setSoloIsPaused(false);
    soloIsPausedRef.current = false;
    setSoloIsFastDropping(false);
    for (let i = 0; i < 3; i++) soloNextPiecesRef.current.push(soloCreatePiece());
    setSoloNextPieces([...soloNextPiecesRef.current]);
    soloSpawnPiece();
    if (soloAnimFrameRef.current) cancelAnimationFrame(soloAnimFrameRef.current);
    soloLastTimeRef.current = 0;
    soloDropCounterRef.current = 0;
    soloAnimFrameRef.current = requestAnimationFrame(soloGameLoop);
  }, [soloCreatePiece, soloSpawnPiece, soloGameLoop]);
  const soloGameOverFn = useCallback(() => {
    soloGameOverRef.current = true;
    setSoloGameOver(true);
    setSoloIsPlaying(false);
    setSoloIsFastDropping(false);
    soloPlaySfx('gameover');
    if (soloAnimFrameRef.current) cancelAnimationFrame(soloAnimFrameRef.current);
    if (soloScoreRef.current > soloHighScore) {
      setSoloHighScore(soloScoreRef.current);
      try { localStorage.setItem('tetrisSoloHighScore', String(soloScoreRef.current)); } catch(e) {}
    }
  }, [soloHighScore, soloPlaySfx]);
  useEffect(() => {
    if (activeGame === 'tetris-solo') {
      soloLastTimeRef.current = 0;
      soloDropCounterRef.current = 0;
      if (soloAnimFrameRef.current) cancelAnimationFrame(soloAnimFrameRef.current);
      soloAnimFrameRef.current = requestAnimationFrame(soloGameLoop);
    }
    return () => {
      if (soloAnimFrameRef.current) cancelAnimationFrame(soloAnimFrameRef.current);
    };
  }, [activeGame, soloGameLoop]);
  useEffect(() => { const handleKey = (e) => { if (activeGame !== 'tetris-solo') return; if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') { e.preventDefault(); if (soloIsPlaying && !soloGameOverRef.current) { const np = !soloIsPausedRef.current; soloIsPausedRef.current = np; setSoloIsPaused(np); } return; } if (!soloIsPlaying || soloGameOverRef.current || soloIsPausedRef.current) return; switch (e.key) { case 'ArrowLeft': e.preventDefault(); soloMoveLeft(); break; case 'ArrowRight': e.preventDefault(); soloMoveRight(); break; case 'ArrowDown': e.preventDefault(); soloStartFastDrop(); break; case 'ArrowUp': e.preventDefault(); soloRotateFn(); break; case ' ': e.preventDefault(); soloHardDropFn(); break; } }; const handleKeyUp = (e) => { if (activeGame !== 'tetris-solo') return; if (e.key === 'ArrowDown') soloStopFastDrop(); }; window.addEventListener('keydown', handleKey); window.addEventListener('keyup', handleKeyUp); return () => { window.removeEventListener('keydown', handleKey); window.removeEventListener('keyup', handleKeyUp); }; }, [activeGame, soloIsPlaying, soloMoveLeft, soloMoveRight, soloStartFastDrop, soloRotateFn, soloStopFastDrop, soloHardDropFn]);
  useEffect(() => { if (onGameModeChange) onGameModeChange(!!activeGame); }, [activeGame, onGameModeChange]);
  useEffect(() => {
    if (!gameFading) return;
    const version = gameFadingVersionRef.current;
    if (gameFadeTimerRef.current) clearTimeout(gameFadeTimerRef.current);
    gameFadeTimerRef.current = setTimeout(() => {
      if (gameFadingVersionRef.current !== version) return;
      setActiveGame(gamePendingRef.current);
      gamePendingRef.current = null;
      requestAnimationFrame(() => {
        if (gameFadingVersionRef.current !== version) return;
        setGameFading(false);
      });
    }, 300);
    return () => { if (gameFadeTimerRef.current) clearTimeout(gameFadeTimerRef.current); };
  }, [gameFading]);
  const switchGame = useCallback((game) => {
    if (soloAnimFrameRef.current) {
      cancelAnimationFrame(soloAnimFrameRef.current);
      soloAnimFrameRef.current = null;
    }
    gameFadingVersionRef.current += 1;
    gamePendingRef.current = game;
    if (gameFading) {
      setActiveGame(game);
      gamePendingRef.current = null;
      setGameFading(false);
      requestAnimationFrame(() => setGameFading(true));
    } else {
      setGameFading(true);
    }
  }, [gameFading]);
  const gt = useMemo(() => { if (glassMode) return { bg: 'aurora-glass-bg', card: 'aurora-glass-card', title: 'text-slate-800', sub: 'text-slate-500', btn1: 'from-cyan-500 to-blue-600', btn2: 'from-purple-500 to-pink-600', btn1shadow: 'shadow-cyan-500/30', btn2shadow: 'shadow-purple-500/30', border: 'border-white/30', input: 'aurora-glass-input text-slate-800 placeholder-slate-400', icon: 'text-slate-600', iconHover: 'hover:bg-white/30' }; if (darkMode) return { bg: 'bg-gray-900', card: 'bg-gray-800', title: 'text-white', sub: 'text-gray-400', btn1: 'from-cyan-500 to-blue-600', btn2: 'from-purple-500 to-pink-600', btn1shadow: 'shadow-cyan-500/30', btn2shadow: 'shadow-purple-500/30', border: 'border-gray-700', input: 'bg-gray-700 text-white placeholder-gray-400', icon: 'text-gray-400', iconHover: 'hover:bg-gray-700' }; return { bg: 'bg-gray-50', card: 'bg-white', title: 'text-gray-900', sub: 'text-gray-500', btn1: 'from-cyan-500 to-blue-600', btn2: 'from-purple-500 to-pink-600', btn1shadow: 'shadow-cyan-500/30', btn2shadow: 'shadow-purple-500/30', border: 'border-gray-200', input: 'bg-gray-100 text-gray-900 placeholder-gray-400', icon: 'text-gray-600', iconHover: 'hover:bg-gray-100' }; }, [darkMode, glassMode]);

  if (activeGame === 'tetris') {
    return (
      <div className={`flex flex-col h-full ${gt.bg} transition-all duration-300 ease-out ${gameFading ? 'opacity-0 translate-y-3' : 'opacity-100 translate-y-0'}`}>
        <div className="flex items-center justify-between px-4 py-2.5 shrink-0">
          <button onClick={() => { tetrisLeaveRoom(); switchGame(null); }} className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-700 transition-colors active:scale-95">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m15 18-6-6 6-6"/></svg>
            <span className="text-xs">返回</span>
          </button>
          <div className="flex items-center gap-2">
            <h2 className={`text-sm font-black ${gt.title}`}>俄罗斯方块</h2>
            {tetrisConnected && <span className="text-[9px] font-mono bg-green-100 text-green-600 px-1.5 py-0 rounded">已连接</span>}
            {tetrisDevMode && !tetrisConnected && <span className="text-[9px] font-mono bg-amber-100 text-amber-600 px-1.5 py-0 rounded">开发者</span>}
          </div>
          <button onClick={() => switchGame('witchpoison')} className="w-8 h-8 rounded-full bg-white/10 text-gray-400 hover:text-purple-400 flex items-center justify-center active:scale-90 transition-all" title="切换到女巫毒药">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10 2h4v4l2 5v7a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-7l2-5z"/><circle cx="12" cy="14" r="1.5" fill="currentColor" opacity="0.5"/></svg>
          </button>
        </div>
        {!(tetrisConnected || tetrisDevMode) ? (
        <div className="flex-1 flex min-h-0 overflow-y-auto px-6 pb-6">
          <div className="flex-1 max-w-lg mx-auto w-full pt-4">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-blue-500/30 mb-3">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="8" height="8" rx="1.5" fill="white" opacity="0.9"/><rect x="14" y="2" width="8" height="8" rx="1.5" fill="white" opacity="0.6"/><rect x="2" y="14" width="8" height="8" rx="1.5" fill="white" opacity="0.6"/><rect x="14" y="14" width="8" height="8" rx="1.5" fill="white" opacity="0.3"/></svg>
              </div>
              <h1 className={`text-2xl font-black ${gt.title}`}>俄罗斯方块</h1>
              <p className={`text-xs ${gt.sub} mt-1`}>联机双人对战</p>
            </div>
            <div className={`${gt.card} backdrop-blur rounded-2xl p-3 shadow-lg ${gt.border} border`}>
              <div><label className={`text-[10px] font-semibold ${gt.sub} block mb-1`}>昵称</label><input type="text" value={tetrisNickname} onChange={(e)=>setTetrisNickname(e.target.value)} placeholder="输入你的昵称" className={`w-full px-3 py-2 ${gt.input} rounded-xl text-sm outline-none transition-all`}/></div>
            </div>
            <div className="space-y-3">
              <div className={`${gt.card} backdrop-blur rounded-2xl p-4 shadow-lg ${gt.border} border`}>
                <div className="flex items-center gap-3 mb-3"><div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gt.btn1} flex items-center justify-center shadow-md`}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg></div><div><h3 className={`text-sm font-bold ${gt.title}`}>创建房间</h3><p className={`text-[10px] ${gt.sub}`}>等待对手加入</p></div></div>
                <div className="space-y-2.5">
                  <button onClick={tetrisCreateRoom} disabled={!tetrisNickname.trim()} className={`w-full py-2 rounded-xl font-bold text-sm text-white bg-gradient-to-r ${gt.btn1} disabled:opacity-35 active:scale-[0.98] transition-all shadow-md ${gt.btn1shadow}`}>创建房间</button>
                </div>
                {tetrisRoomId && tetrisIsHost && !tetrisConnected && (
                  <div className="mt-3 text-center p-3 rounded-xl bg-green-50 border border-green-200">
                    <p className="text-[10px] text-green-600 font-medium">房间号</p>
                    <p className="text-2xl font-black font-mono text-green-700 tracking-[0.3em]">{tetrisRoomId}</p>
                    <p className="text-[10px] text-green-500 mt-1">分享给朋友加入</p>
                  </div>
                )}
              </div>
              <div className={`${gt.card} backdrop-blur rounded-2xl p-4 shadow-lg ${gt.border} border`}>
                <div className="flex items-center gap-3 mb-3"><div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gt.btn2} flex items-center justify-center shadow-md`}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg></div><div><h3 className={`text-sm font-bold ${gt.title}`}>加入房间</h3><p className={`text-[10px] ${gt.sub}`}>输入房间号加入</p></div></div>
                <div className="space-y-2.5">
                  <div><label className={`text-[10px] font-semibold ${gt.sub} block mb-1`}>房间号</label><input type="text" value={tetrisInputRoomId} onChange={(e)=>setTetrisInputRoomId(e.target.value.toUpperCase())} placeholder="输入 5 位房间号" maxLength={5} className={`w-full px-3 py-2 ${gt.input} rounded-xl text-sm outline-none tracking-[0.25em] text-center font-mono transition-all uppercase`}/></div>
                  <button onClick={tetrisJoinRoom} disabled={!tetrisNickname.trim()||!tetrisInputRoomId.trim()} className={`w-full py-2 rounded-xl font-bold text-sm text-white bg-gradient-to-r ${gt.btn2} disabled:opacity-35 active:scale-[0.98] transition-all shadow-md ${gt.btn2shadow}`}>加入房间</button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className={`${gt.card} backdrop-blur rounded-2xl p-3.5 shadow-lg ${gt.border} border`}>
                  <div className="flex items-center gap-2.5 mb-2.5"><div className="w-9 h-9 rounded-xl bg-gradient-to-br from-green-400 to-teal-600 flex items-center justify-center shadow-md shadow-teal-500/20 shrink-0"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10"/></svg></div><div className="min-w-0"><h3 className={`text-xs font-bold ${gt.title} truncate`}>局域网寻房</h3><p className={`text-[9px] ${gt.sub}`}>身边房间</p></div></div>
                  <button onClick={tetrisScanLanRooms} disabled={!tetrisNickname.trim()||tetrisIsScanningLan} className="w-full py-2 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-green-400 to-teal-600 disabled:opacity-35 active:scale-[0.98] transition-all shadow-md">{tetrisIsScanningLan ? '正在扫描...' : '搜索房间'}</button>
                </div>
                <div className={`${gt.card} backdrop-blur rounded-2xl p-3.5 shadow-lg ${gt.border} border`}>
                  <div className="flex items-center gap-2.5 mb-2.5"><div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-md shrink-0"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg></div><div className="min-w-0"><h3 className={`text-xs font-bold ${gt.title} truncate`}>大厅寻房</h3><p className={`text-[9px] ${gt.sub}`}>服务器房间</p></div></div>
                  <button onClick={tetrisScanLobbyRooms} disabled={!tetrisNickname.trim()||tetrisIsScanningLobby} className="w-full py-2 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-purple-500 to-pink-500 disabled:opacity-35 active:scale-[0.98] transition-all shadow-md">{tetrisIsScanningLobby ? '正在搜索...' : '搜索房间'}</button>
                </div>
              </div>
              <div className={`${gt.card} backdrop-blur rounded-2xl p-4 shadow-lg ${gt.border} border`}>
                {tetrisHallMsg && <div className="text-center text-xs py-2 text-red-400 animate-pulse">{tetrisHallMsg}</div>}
                {tetrisDiscoveredRooms.length > 0 && (
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {tetrisDiscoveredRooms.map(room => (
                      <button key={room.roomId} onClick={() => { setTetrisInputRoomId(room.roomId); }} className={`w-full flex items-center justify-between px-3 py-2 rounded-xl ${gt.card} ${gt.border} border hover:shadow-md transition-all active:scale-[0.98]`}>
                        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /><span className={`text-xs font-bold font-mono ${gt.title}`}>{room.roomId}</span></div>
                        <span className="text-[10px] text-cyan-500 font-bold">加入</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="mt-4 p-3 rounded-xl bg-blue-50/80 border border-blue-200/60">
              <p className="text-[10px] font-bold text-blue-600 mb-1">操作说明</p>
              <div className="text-[9px] text-blue-500 space-y-1">
                <div><span className="font-bold text-cyan-600">玩家1</span>：← → 移动 / ↑ 旋转 / ↓ 加速 / 空格 硬降</div>
                <div><span className="font-bold text-purple-600">玩家2</span>：A D 移动 / W 旋转 / S 加速 / Q 硬降</div>
                <div className="text-[8px] text-blue-400">两人共享20×35大棋盘，共同得分</div>
              </div>
            </div>
            <div className="mt-3 p-3 rounded-xl bg-amber-50/80 border border-amber-200/60">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-amber-600">开发者模式</p>
                  <p className="text-[9px] text-amber-500">无需连接即可预览棋盘</p>
                </div>
                <button onClick={() => setTetrisDevMode(!tetrisDevMode)} className={`relative w-10 h-5 rounded-full transition-colors ${tetrisDevMode ? 'bg-amber-400' : 'bg-gray-300'}`}>
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${tetrisDevMode ? 'left-5.5 translate-x-0.5' : 'left-0.5'}`} />
                </button>
              </div>
              {tetrisDevMode && (
                <div className="mt-3">
                  <div className="grid grid-cols-20 gap-px p-2 bg-gray-900 rounded-lg">
                    {tetrisBoard.map((row, ri) => row.map((cell, ci) => {
                      const isEmpty = !cell;
                      const isRgba = typeof cell === 'string' && cell.startsWith('rgba');
                      return <div key={`dev-${ri}-${ci}`} className="aspect-square w-full" style={{ backgroundColor: isEmpty ? 'rgba(15,23,42,0.8)' : cell, border: isEmpty ? '0.5px solid rgba(30,41,59,0.4)' : (isRgba ? '0.5px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.4)'), borderRadius: isEmpty ? '0' : '1px' }} />;
                    }))}
                  </div>
                  <div className="mt-2 flex gap-2">
                    <button onClick={() => { const b = tetrisBoardRef.current; for (let r = 30; r < 35; r++) for (let c = 0; c < TETRIS_COLS; c++) b[r][c] = ['#60a5fa','#4ade80','#f472b6','#34d399','#fb923c'][Math.floor(Math.random()*5)]; setTetrisBoard(b.map(r=>[...r])); }} className="flex-1 py-1.5 rounded-lg text-[9px] font-bold text-amber-700 bg-amber-100 active:scale-95">填充测试行</button>
                    <button onClick={() => { const e = Array.from({length:TETRIS_ROWS},()=>Array(TETRIS_COLS).fill(0)); tetrisBoardRef.current = e; setTetrisBoard(e.map(r=>[...r])); }} className="flex-1 py-1.5 rounded-lg text-[9px] font-bold text-gray-600 bg-gray-100 active:scale-95">清空棋盘</button>
                  </div>
                  <div className="mt-1.5 text-[8px] text-amber-500 text-center">20×35 共享棋盘预览</div>
                </div>
              )}
            </div>
          </div>
        </div>
        ) : (
        <div className="flex-1 flex flex-col items-center min-h-0 px-2 pb-1">
          <div ref={tetrisBoardContainerRef} className="flex-1 flex items-start justify-center min-h-0 w-full">
            <div className="flex flex-col items-center">
              <div className="relative bg-gray-900/90 rounded-lg border-2 border-cyan-500/30 shadow-lg shadow-cyan-500/10 overflow-hidden" style={{ width: tetrisBoardSize.w || 400, height: tetrisBoardSize.h || 630 }}>
                <div className="w-full h-full" style={{ display: 'grid', gridTemplateColumns: `repeat(${TETRIS_COLS}, 1fr)`, gridTemplateRows: `repeat(${TETRIS_ROWS}, 1fr)` }}>
                  {tetrisRenderBoard(tetrisBoard, tetrisCurrentPiece, tetrisP2Piece).map((row, ri) => row.map((cell, ci) => {
                    const isEmpty = !cell;
                    const isRgba = typeof cell === 'string' && cell.startsWith('rgba');
                    return <div key={`${ri}-${ci}`} style={{ backgroundColor: isEmpty ? 'rgba(15,23,42,0.8)' : cell, border: isEmpty ? '0.5px solid rgba(30,41,59,0.4)' : (isRgba ? '0.5px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.4)'), borderRadius: isEmpty ? '0' : '1px' }} />;
                  }))}
                </div>
                {tetrisDevView !== 'p2' && tetrisNextPiece && (
                  <div className="absolute top-1 left-1 bg-black/50 backdrop-blur-sm rounded-md p-1 border border-white/10">
                    <div className="grid grid-cols-4 gap-px justify-items-center">
                      {(() => { const s = tetrisNextPiece.shape; const offR = Math.floor((4 - s.length) / 2); const offC = Math.floor((4 - s[0].length) / 2); return Array.from({ length: 4 }, (_, ri) => Array.from({ length: 4 }, (_, ci) => { const sr = ri - offR; const sc = ci - offC; const hasBlock = sr >= 0 && sr < s.length && sc >= 0 && sc < s[sr].length && s[sr][sc]; return <div key={`n1-${ri}-${ci}`} className="w-2.5 h-2.5" style={{ backgroundColor: hasBlock ? tetrisNextPiece.color : 'transparent', borderRadius: '1px', border: hasBlock ? '0.5px solid rgba(255,255,255,0.15)' : 'none' }} />; })).flat(); })()}
                    </div>
                  </div>
                )}
                {tetrisDevView !== 'p1' && tetrisP2NextPiece && (
                  <div className="absolute top-1 right-1 bg-black/50 backdrop-blur-sm rounded-md p-1 border border-white/10">
                    <div className="grid grid-cols-4 gap-px justify-items-center">
                      {(() => { const s = tetrisP2NextPiece.shape; const offR = Math.floor((4 - s.length) / 2); const offC = Math.floor((4 - s[0].length) / 2); return Array.from({ length: 4 }, (_, ri) => Array.from({ length: 4 }, (_, ci) => { const sr = ri - offR; const sc = ci - offC; const hasBlock = sr >= 0 && sr < s.length && sc >= 0 && sc < s[sr].length && s[sr][sc]; return <div key={`n2-${ri}-${ci}`} className="w-2.5 h-2.5" style={{ backgroundColor: hasBlock ? tetrisP2NextPiece.color : 'transparent', borderRadius: '1px', border: hasBlock ? '0.5px solid rgba(255,255,255,0.15)' : 'none' }} />; })).flat(); })()}
                    </div>
                  </div>
                )}
                {tetrisGameOver && <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg"><span className="text-white font-black text-lg">GAME OVER</span></div>}
              </div>
              <div className="flex items-start gap-2 mt-1.5 w-full">
                <div className="flex gap-3 text-center">
                  <div><div className={`text-[7px] ${gt.sub}`}>分数</div><div className={`text-sm font-black ${gt.title}`}>{tetrisScore}</div></div>
                  <div><div className={`text-[7px] ${gt.sub}`}>等级</div><div className={`text-sm font-black ${gt.title}`}>{tetrisLevel}</div></div>
                  <div><div className={`text-[7px] ${gt.sub}`}>行数</div><div className={`text-sm font-black ${gt.title}`}>{tetrisLines}</div></div>
                </div>
                {!tetrisIsPlaying && !tetrisGameOver && (
                  <button onClick={tetrisStartGame} className={`px-2 py-1.5 rounded-lg font-bold text-[9px] text-white bg-gradient-to-r ${tetrisDevMode && !tetrisConnected ? 'from-amber-500 to-orange-500' : gt.btn1} active:scale-95 transition-all shadow-md`}>
                    {tetrisDevMode && !tetrisConnected ? '开发者开始' : (tetrisIsHost ? '开始游戏' : '等待开始')}
                  </button>
                )}
                {tetrisGameOver && (
                  <button onClick={tetrisStartGame} className={`px-2 py-1.5 rounded-lg font-bold text-[9px] text-white bg-gradient-to-r ${gt.btn1} active:scale-95 transition-all shadow-md`}>
                    再来一局
                  </button>
                )}
                {tetrisDevMode && !tetrisConnected && (
                  <div className="flex items-center gap-1">
                    <span className="text-[7px] font-bold text-amber-600">🛠</span>
                    <button onClick={() => { const b = tetrisBoardRef.current; for (let r = 30; r < 35; r++) for (let c = 0; c < TETRIS_COLS; c++) b[r][c] = ['#60a5fa','#4ade80','#f472b6','#34d399','#fb923c'][Math.floor(Math.random()*5)]; setTetrisBoard(b.map(r=>[...r])); }} className="px-1 py-0.5 rounded text-[7px] font-bold text-amber-700 bg-amber-100 active:scale-95">填充行</button>
                    <button onClick={() => { const e = Array.from({length:TETRIS_ROWS},()=>Array(TETRIS_COLS).fill(0)); tetrisBoardRef.current = e; setTetrisBoard(e.map(r=>[...r])); }} className="px-1 py-0.5 rounded text-[7px] font-bold text-gray-600 bg-gray-100 active:scale-95">清空</button>
                    <button onClick={() => setTetrisDevMode(false)} className="px-1 py-0.5 rounded text-[7px] font-bold text-red-600 bg-red-100 active:scale-95">退出</button>
                    <div className="flex gap-0.5">
                      <button onClick={() => setTetrisDevView('full')} className={`px-1 py-0.5 rounded text-[7px] font-bold active:scale-95 ${tetrisDevView === 'full' ? 'bg-amber-400 text-white' : 'bg-amber-100 text-amber-700'}`}>完整</button>
                      <button onClick={() => setTetrisDevView('p1')} className={`px-1 py-0.5 rounded text-[7px] font-bold active:scale-95 ${tetrisDevView === 'p1' ? 'bg-cyan-500 text-white' : 'bg-cyan-100 text-cyan-700'}`}>P1</button>
                      <button onClick={() => setTetrisDevView('p2')} className={`px-1 py-0.5 rounded text-[7px] font-bold active:scale-95 ${tetrisDevView === 'p2' ? 'bg-purple-500 text-white' : 'bg-purple-100 text-purple-700'}`}>P2</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="shrink-0 pb-2 pt-1">
            {(() => {
              const myPlayer = tetrisIsHost ? 1 : 2;
              const isLocalMode = tetrisDevMode && !tetrisConnected;
              const showP1 = (isLocalMode && tetrisDevView !== 'p2') || (!isLocalMode && tetrisIsHost);
              const showP2 = (isLocalMode && tetrisDevView !== 'p1') || (!isLocalMode && !tetrisIsHost);
              const doAction = (playerNum, actionFn, actionName) => {
                if (tetrisIsHost || isLocalMode) { actionFn(); }
                if (tetrisConnRef.current && !isLocalMode) { tetrisConnRef.current.send({ type: 'tetris-move', player: playerNum, action: actionName }); }
              };
              const Gamepad = ({ playerNum, color, label, accent }) => (
                <div className="flex-1 flex flex-col items-stretch">
                  <div className="relative bg-gray-800/90 rounded-2xl p-1 border border-gray-700/50 shadow-lg w-full">
                    <div className="flex items-center justify-between mb-0 px-0.5">
                      <span className={`text-[9px] font-black ${color}`}>{label}</span>
                      <div className="flex gap-1">
                        <div className={`w-1.5 h-1.5 rounded-full ${accent}/50`} />
                        <div className={`w-1.5 h-1.5 rounded-full ${accent}/50`} />
                      </div>
                    </div>
                    <div className="flex items-center px-1 pb-0.5">
                      <div className="relative shrink-0 ml-4" style={{ width: '189px', height: '189px' }}>
                        <button onTouchStart={(e) => { e.preventDefault(); doAction(playerNum, () => tetrisMoveLeft(playerNum), 'left'); }} className="absolute left-0 top-1/2 -translate-y-1/2 w-[70px] h-[70px] rounded-full bg-gray-600 active:bg-gray-500 flex items-center justify-center shadow-md border border-gray-500/50">
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M15 18l-6-6 6-6"/></svg>
                        </button>
                        <button onTouchStart={(e) => { e.preventDefault(); doAction(playerNum, () => tetrisMoveRight(playerNum), 'right'); }} className="absolute right-0 top-1/2 -translate-y-1/2 w-[70px] h-[70px] rounded-full bg-gray-600 active:bg-gray-500 flex items-center justify-center shadow-md border border-gray-500/50">
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M9 18l6-6-6-6"/></svg>
                        </button>
                        <button onTouchStart={(e) => { e.preventDefault(); doAction(playerNum, () => { if (playerNum === 1) { tetrisP1FastDropRef.current = true; tetrisDropCounterRef.current = 0; } else { tetrisP2FastDropRef.current = true; tetrisP2DropCounterRef.current = 0; } }, 'fastdrop-start'); }} onTouchEnd={(e) => { e.preventDefault(); doAction(playerNum, () => { if (playerNum === 1) tetrisP1FastDropRef.current = false; else tetrisP2FastDropRef.current = false; }, 'fastdrop-stop'); }} onTouchCancel={(e) => { e.preventDefault(); doAction(playerNum, () => { if (playerNum === 1) tetrisP1FastDropRef.current = false; else tetrisP2FastDropRef.current = false; }, 'fastdrop-stop'); }} className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[70px] h-[70px] rounded-full bg-gray-600 active:bg-gray-500 flex items-center justify-center shadow-md border border-gray-500/50">
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M9 6l6 6-6 6"/></svg>
                        </button>
                      </div>
                      <div className="w-[40px] shrink-0"></div>
                      <div className="flex flex-col items-center gap-2 shrink-0 mr-0">
                        <button onTouchStart={(e) => { e.preventDefault(); doAction(playerNum, () => tetrisTryRotate(playerNum), 'rotate'); }} className={`w-[71px] h-[71px] rounded-full ${playerNum === 1 ? 'bg-cyan-600 active:bg-cyan-400 border-cyan-400/50' : 'bg-purple-600 active:bg-purple-400 border-purple-400/50'} border-2 shadow-lg flex items-center justify-center`}>
                          <span className="text-white text-[11px] font-black">旋转</span>
                        </button>
                        <button onTouchStart={(e) => { e.preventDefault(); doAction(playerNum, () => tetrisHardDrop(playerNum), 'harddrop'); }} className={`w-[71px] h-[71px] rounded-full ${playerNum === 1 ? 'bg-cyan-700 active:bg-cyan-500 border-cyan-300/50' : 'bg-purple-700 active:bg-purple-500 border-purple-300/50'} border-2 shadow-lg flex items-center justify-center`}>
                          <span className="text-white text-[11px] font-black">硬降</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
              return (
                <div className="flex gap-0 w-full">
                  {showP1 && <Gamepad playerNum={1} color="text-cyan-500" label={isLocalMode ? 'P1 ←→↑↓空格' : tetrisNickname} accent="bg-cyan-500" />}
                  {showP2 && <Gamepad playerNum={2} color="text-purple-500" label={isLocalMode ? 'P2 WASD+Q' : (tetrisOpponentNickname || '对手')} accent="bg-purple-500" />}
                </div>
              );
            })()}
          </div>
        </div>
        )}
      </div>
    );
  }

  if (activeGame === 'witchpoison') {
    return (
      <div className={`flex flex-col h-full ${gt.bg} transition-all duration-300 ease-out ${gameFading ? 'opacity-0 translate-y-3' : 'opacity-100 translate-y-0'}`}>
        <div className="flex items-center justify-between px-4 py-2.5 shrink-0">
          <button onClick={() => switchGame(null)} className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-700 transition-colors active:scale-95">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m15 18-6-6 6-6"/></svg>
            <span className="text-xs">返回</span>
          </button>
          <span className="text-[11px] font-bold text-purple-400">🧪 女巫的毒药</span>
          <button onClick={() => switchGame('tetris')} className="w-8 h-8 rounded-full bg-white/10 text-gray-400 hover:text-cyan-400 flex items-center justify-center active:scale-90 transition-all" title="切换到俄罗斯方块">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="7" height="7" rx="1" fill="currentColor" opacity="0.9"/><rect x="14" y="3" width="7" height="7" rx="1" fill="currentColor" opacity="0.6"/><rect x="3" y="14" width="7" height="7" rx="1" fill="currentColor" opacity="0.6"/><rect x="14" y="14" width="7" height="7" rx="1" fill="currentColor" opacity="0.3"/></svg>
          </button>
        </div>
        <WitchPoisonTab darkMode={darkMode} glassMode={glassMode} />
      </div>
    );
  }

  if (activeGame === 'mario') {
    return (
      <div className={`flex flex-col h-full transition-all duration-300 ease-out ${gameFading ? 'opacity-0 translate-y-3' : 'opacity-100 translate-y-0'}`}>
        <MarioGame onBack={() => switchGame(null)} darkMode={darkMode} />
      </div>
    );
  }

  if (activeGame === 'tetris-handheld') {
    return <div className={`fixed inset-0 z-50 transition-all duration-300 ease-out ${gameFading ? 'opacity-0 translate-y-3' : 'opacity-100'}`}><HandheldTetris onBack={() => switchGame(null)} onGameModeChange={onGameModeChange} /></div>;
  }

  if (activeGame === 'tetris-solo') {
    const displayBoard = soloBoard.map(r => [...r]);
    if (soloCurrentPiece) {
      soloCurrentPiece.shape.forEach((row, r) => {
        row.forEach((v, c) => {
          if (v) {
            const ny = soloCurrentPiece.y + r;
            const nx = soloCurrentPiece.x + c;
            if (ny >= 0 && ny < 20 && nx >= 0 && nx < 10) displayBoard[ny][nx] = soloCurrentPiece.color;
          }
        });
      });
      if (soloShowGhost) {
        let ghostY = soloCurrentPiece.y;
        const ghostPiece = { ...soloCurrentPiece, y: soloCurrentPiece.y };
        let valid = false;
        for (let gy = soloCurrentPiece.y + 1; gy <= 20; gy++) {
          let collide = false;
          for (let r = 0; r < soloCurrentPiece.shape.length; r++) {
            for (let c = 0; c < soloCurrentPiece.shape[r].length; c++) {
              if (soloCurrentPiece.shape[r][c]) {
                const ny = gy + r;
                const nx = soloCurrentPiece.x + c;
                if (ny >= 20 || (ny >= 0 && soloBoard[ny][nx])) { collide = true; break; }
              }
            }
            if (collide) break;
          }
          if (collide) break;
          ghostY = gy;
          valid = true;
        }
        if (valid && ghostY !== soloCurrentPiece.y) {
          soloCurrentPiece.shape.forEach((row, r) => {
            row.forEach((v, c) => {
              if (v) {
                const ny = ghostY + r;
                const nx = soloCurrentPiece.x + c;
                if (ny >= 0 && ny < 20 && nx >= 0 && nx < 10 && !displayBoard[ny][nx]) {
                  displayBoard[ny][nx] = 'ghost';
                }
              }
            });
          });
        }
      }
    }
    return (
      <div className={`fixed inset-0 z-50 flex flex-col bg-[#0f172a] transition-all duration-300 ease-out ${gameFading ? 'opacity-0 translate-y-3' : 'opacity-100 translate-y-0'}`}>
        <div className="flex items-center justify-between px-4 py-2.5 shrink-0">
          <button onClick={() => switchGame(null)} className="w-9 h-9 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 text-slate-400 hover:text-slate-200 active:scale-90 transition-all flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setSoloShowSettings(true)} className="w-9 h-9 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 text-slate-400 hover:text-slate-200 active:scale-90 transition-all flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            </button>
            <button onClick={() => { if (soloIsPlaying && !soloGameOverRef.current) { const np = !soloIsPausedRef.current; soloIsPausedRef.current = np; setSoloIsPaused(np); } }} className="w-9 h-9 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 text-slate-400 hover:text-slate-200 active:scale-90 transition-all flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
            </button>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center min-h-0 px-3">
          <div className="flex items-center gap-3 h-full">
            <div className="shrink-0 w-[72px] invisible" aria-hidden="true" />
            <div className="flex flex-col items-center h-full">
              <div className="flex items-center gap-3 mb-1 px-1">
                <div className="flex items-baseline gap-1"><span className="text-[8px] text-slate-400">得分</span><span className="text-xs font-black text-white">{soloScore}</span></div>
                <div className="flex items-baseline gap-1"><span className="text-[8px] text-slate-400">行数</span><span className="text-xs font-black text-white">{soloLines}</span></div>
                <div className="flex items-baseline gap-1"><span className="text-[8px] text-slate-400">等级</span><span className="text-xs font-black text-white">{soloLevel}</span></div>
                <div className="flex items-baseline gap-1"><span className="text-[8px] text-slate-400">最高</span><span className="text-xs font-black text-amber-400">{soloHighScore}</span></div>
              </div>
            <div className="h-[90%] relative rounded-2xl overflow-hidden border-2 border-slate-700/60 shadow-lg shadow-black/40" style={{ aspectRatio: '1/2', contain: 'strict' }}>
              <div className="absolute inset-0 bg-[#0a0e17]">
                  {displayBoard.map((row, ri) => row.map((cell, ci) => (
                  <div key={`${ri}-${ci}`} style={{ position: 'absolute', left: `${ci * 10}%`, top: `${ri * 5}%`, width: '10%', height: '5%', padding: 1 }}>
                      {cell === 'ghost' ? (
                        <div className="w-full h-full rounded-[3px] border-2 border-dashed border-white/25" />
                      ) : cell ? (
                        <div className="w-full h-full rounded-[3px]" style={{ background: `linear-gradient(135deg, ${cell}dd, ${cell})`, boxShadow: `inset 0 1px 0 rgba(255,255,255,0.2), 0 0 6px ${cell}40` }} />
                      ) : (
                        <div className="w-full h-full border-b border-r border-gray-600/20" />
                      )}
                    </div>
                  )))}
                </div>
                <canvas
                  ref={soloCanvasRef}
                  className="absolute inset-0 pointer-events-none z-10"
                  style={{ width: '100%', height: '100%' }}
                />
                {soloGameOver && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 backdrop-blur-sm gap-3">
                    <span className="text-white font-black text-xl tracking-wide">GAME OVER</span>
                    <span className="text-emerald-300 text-sm font-bold">得分: {soloScore}</span>
                    <button onClick={soloStartGame} className="px-6 py-2 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-pink-500 to-violet-500 active:scale-95 transition-all shadow-lg shadow-pink-500/25">再来一局</button>
                  </div>
                )}
                {soloIsPaused && !soloGameOver && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm gap-3">
                    <span className="text-white font-black text-lg">已暂停</span>
                    <button onClick={() => { soloIsPausedRef.current = false; setSoloIsPaused(false); }} className="px-6 py-2 rounded-xl font-bold text-sm text-white bg-white/15 active:scale-95 transition-all">继续</button>
                    <span className="text-white/40 text-[10px]">按 P / Esc 继续</span>
                  </div>
                )}
              </div>
            </div>
            <div className="shrink-0 w-[72px] flex flex-col gap-1.5 -ml-2">
              <div className="flex flex-col items-start gap-0">
                {soloNextPieces.slice(0, 3).map((piece, i) => {
                    const s = piece.shape;
                    const minR = s.findIndex(r => r.some(c => c));
                    const maxR = s.length - 1 - [...s].reverse().findIndex(r => r.some(c => c));
                    const minC = s[0].findIndex((_, ci) => s.some(r => r[ci]));
                    const maxC = s[0].length - 1 - [...s[0]].reverse().findIndex((_, ci) => s.some(r => r[ci]));
                    const cropRows = maxR - minR + 1;
                    const cropCols = maxC - minC + 1;
                    return (
                      <div key={i} className={`w-full ${i > 0 ? 'opacity-50 border-t border-cyan-500/40 pt-1 mt-1' : ''}`}>
                        <div className="inline-grid" style={{ gridTemplateColumns: `repeat(${cropCols}, 9px)`, gridTemplateRows: `repeat(${cropRows}, 9px)` }}>
                          {Array.from({ length: cropRows * cropCols }, (_, idx) => {
                            const ri = Math.floor(idx / cropCols) + minR;
                            const ci = (idx % cropCols) + minC;
                            const has = s[ri][ci];
                            return <div key={idx} className="rounded-[1.5px]" style={{ backgroundColor: has ? piece.color : 'transparent', boxShadow: has ? `0 0 3px ${piece.color}50` : 'none', border: has ? '0.5px solid rgba(255,255,255,0.15)' : 'none' }} />;
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
            </div>
          </div>
        </div>
        {!soloIsPlaying && !soloGameOver && (
          <div className="flex justify-center py-2 shrink-0">
            <button onClick={soloStartGame} className="px-8 py-2.5 rounded-2xl font-bold text-sm text-white bg-gradient-to-r from-pink-500 to-violet-500 active:scale-95 transition-all shadow-lg shadow-pink-500/25">开始游戏</button>
          </div>
        )}
        <div className="shrink-0 pb-5 pt-8 md:hidden">
          <div className="flex items-center justify-center gap-3 pl-0">
            <div className="flex items-center gap-2">
              <button
                onTouchStart={(e) => { e.preventDefault(); soloTouchActiveRef.current = true; soloMoveLeft(); }}
                onMouseDown={(e) => { e.preventDefault(); if (soloTouchActiveRef.current) { soloTouchActiveRef.current = false; return; } soloMoveLeft(); }}
                className="w-[68px] h-[68px] rounded-2xl bg-slate-800/80 backdrop-blur-sm border border-slate-700/50 text-slate-300 active:bg-slate-700 active:scale-95 transition-all flex items-center justify-center shadow-lg"
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              </button>
              <button
                onTouchStart={(e) => { e.preventDefault(); soloTouchActiveRef.current = true; soloStartFastDrop(); }}
                onTouchEnd={(e) => { e.preventDefault(); soloStopFastDrop(); }}
                onTouchCancel={(e) => { e.preventDefault(); soloStopFastDrop(); }}
                onMouseDown={() => { if (soloTouchActiveRef.current) { soloTouchActiveRef.current = false; return; } soloStartFastDrop(); }}
                onMouseUp={() => soloStopFastDrop()}
                onMouseLeave={() => soloStopFastDrop()}
                className="w-[68px] h-[68px] rounded-2xl bg-slate-800/80 backdrop-blur-sm border border-slate-700/50 text-slate-300 active:bg-slate-700 active:scale-95 transition-all flex items-center justify-center shadow-lg"
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </button>
              <button
                onTouchStart={(e) => { e.preventDefault(); soloTouchActiveRef.current = true; soloMoveRight(); }}
                onMouseDown={(e) => { e.preventDefault(); if (soloTouchActiveRef.current) { soloTouchActiveRef.current = false; return; } soloMoveRight(); }}
                className="w-[68px] h-[68px] rounded-2xl bg-slate-800/80 backdrop-blur-sm border border-slate-700/50 text-slate-300 active:bg-slate-700 active:scale-95 transition-all flex items-center justify-center shadow-lg"
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
              </button>
            </div>
            <div className="flex flex-col items-center gap-2">
              <button
                onTouchStart={(e) => { e.preventDefault(); soloTouchActiveRef.current = true; soloRotateFn(); }}
                onMouseDown={(e) => { e.preventDefault(); if (soloTouchActiveRef.current) { soloTouchActiveRef.current = false; return; } soloRotateFn(); }}
                className="w-[68px] h-[68px] rounded-2xl bg-slate-800/80 backdrop-blur-sm border border-slate-700/50 text-slate-300 active:bg-slate-700 active:scale-95 transition-all flex items-center justify-center shadow-lg"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
              </button>
              <button
                onTouchStart={(e) => { e.preventDefault(); soloTouchActiveRef.current = true; soloHardDropFn(); }}
                onMouseDown={(e) => { e.preventDefault(); if (soloTouchActiveRef.current) { soloTouchActiveRef.current = false; return; } soloHardDropFn(); }}
                className="w-[68px] h-[68px] rounded-2xl bg-indigo-600/80 backdrop-blur-sm border border-indigo-500/50 text-white active:bg-indigo-500 active:scale-95 transition-all flex items-center justify-center shadow-lg shadow-indigo-500/20"
              >
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg>
              </button>
            </div>
          </div>
        </div>
        <div className="hidden md:flex justify-center items-center gap-4 px-4 pb-4 pt-1">
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span><kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-slate-800/60 rounded border border-slate-700/50 text-slate-300">← →</kbd> 移动</span>
            <span><kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-slate-800/60 rounded border border-slate-700/50 text-slate-300">↑</kbd> 旋转</span>
            <span><kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-slate-800/60 rounded border border-slate-700/50 text-slate-300">↓</kbd> 按住加速</span>
            <span><kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-slate-800/60 rounded border border-slate-700/50 text-slate-300">空格</kbd> 硬降</span>
          </div>
        </div>
        {soloShowSettings && (
          <div className="absolute inset-0 z-20" onClick={() => setSoloShowSettings(false)}>
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <div className="absolute inset-x-0 bottom-0 bg-[#1e293b]/95 backdrop-blur-xl border-t border-slate-700/50 rounded-t-3xl p-5 max-h-[50vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="w-10 h-1 bg-slate-600 rounded-full mx-auto mb-4" />
              <h3 className="text-white font-bold text-sm mb-4">设置</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5eead4" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    <span className="text-sm text-slate-300">辅助模式</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={soloShowGhost} onChange={(e) => { setSoloShowGhost(e.target.checked); try { localStorage.setItem('tetrisSoloGhost', String(e.target.checked)); } catch(err) {} }} className="sr-only peer" />
                    <div className="w-11 h-6 bg-slate-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>
                <p className="text-xs text-slate-500">开启后显示当前方块的落点预览（虚线框）</p>
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                    <span className="text-sm text-slate-300">等级提速</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={soloLevelSpeed} onChange={(e) => { const v = e.target.checked; setSoloLevelSpeed(v); soloLevelSpeedRef.current = v; if (v) { soloBaseDropIntervalRef.current = Math.max(100, 1000 - (soloLevelRef.current - 1) * 100); } else { soloBaseDropIntervalRef.current = 1000; } if (!soloIsFastDroppingRef.current) soloDropIntervalRef.current = soloBaseDropIntervalRef.current; try { localStorage.setItem('tetrisSoloLevelSpeed', String(v)); } catch(err) {} }} className="sr-only peer" />
                    <div className="w-11 h-6 bg-slate-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>
                <p className="text-xs text-slate-500">关闭后下落速度始终不变，不受等级影响</p>
                <div className="border-t border-slate-700/50 pt-4">
                  <div className="text-sm text-slate-300 font-medium mb-2">操作说明</div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
                    <div><kbd className="px-1 py-0.5 bg-slate-800/60 rounded border border-slate-700/50 text-slate-300 mr-1">←→</kbd>移动</div>
                    <div><kbd className="px-1 py-0.5 bg-slate-800/60 rounded border border-slate-700/50 text-slate-300 mr-1">↑</kbd>旋转</div>
                    <div><kbd className="px-1 py-0.5 bg-slate-800/60 rounded border border-slate-700/50 text-slate-300 mr-1">↓</kbd>按住加速</div>
                    <div><kbd className="px-1 py-0.5 bg-slate-800/60 rounded border border-slate-700/50 text-slate-300 mr-1">空格</kbd>硬降</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${gt.bg} transition-all duration-300 ease-out ${gameFading ? 'opacity-0 translate-y-3' : 'opacity-100 translate-y-0'}`}>
      <div className="shrink-0 px-5 pt-5 pb-3 flex items-center justify-between">
        <h1 className={`text-2xl font-black ${gt.title}`}>游戏大厅</h1>
        <div className="text-xs flex items-center gap-1.5">
          {serverConnected ? (
            <>
              <span className={`inline-block w-2 h-2 rounded-full animate-pulse ${serverLatency >= 200 ? 'bg-red-500' : serverLatency >= 100 ? 'bg-yellow-500' : 'bg-green-500'}`} />
              <span className={`font-medium ${serverLatency >= 200 ? 'text-red-500' : serverLatency >= 100 ? 'text-yellow-500 dark:text-yellow-400' : 'text-green-600 dark:text-green-400'}`}>华东 {serverLatency}ms</span>
            </>
          ) : (
            <>
              <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
              <span className="text-red-500 font-medium">未连接服务器</span>
            </>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-5 pb-6">
        <div className="grid grid-cols-1 gap-4 max-w-lg mx-auto">
          <button onClick={() => onSwitchToDrawingGuess?.()} className={`group relative overflow-hidden rounded-2xl p-5 text-left transition-all active:scale-[0.98] shadow-lg ${gt.border} border ${gt.card}`}>
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-orange-400/20 to-transparent rounded-bl-full" />
            <div className="relative flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center shadow-md shrink-0">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className={`text-base font-black ${gt.title}`}>你画我猜</h3>
                <p className={`text-[11px] ${gt.sub} mt-0.5`}>局域网联机，和朋友一起画画猜词</p>
                <div className="flex items-center gap-1 mt-2">
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-600 font-medium">多人</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600 font-medium">画板</span>
                </div>
              </div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={`shrink-0 ${gt.sub} group-hover:translate-x-1 transition-transform`}><path d="m9 18 6-6-6-6"/></svg>
            </div>
          </button>
          <button onClick={() => switchGame('tetris')} className={`group relative overflow-hidden rounded-2xl p-5 text-left transition-all active:scale-[0.98] shadow-lg ${gt.border} border ${gt.card}`}>
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-cyan-400/20 to-transparent rounded-bl-full" />
            <div className="relative flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-md shrink-0">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="8" height="8" rx="1.5" fill="white" opacity="0.9"/><rect x="14" y="2" width="8" height="8" rx="1.5" fill="white" opacity="0.6"/><rect x="2" y="14" width="8" height="8" rx="1.5" fill="white" opacity="0.6"/><rect x="14" y="14" width="8" height="8" rx="1.5" fill="white" opacity="0.3"/></svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className={`text-base font-black ${gt.title}`}>俄罗斯方块OL</h3>
                <p className={`text-[11px] ${gt.sub} mt-0.5`}>合作游玩2X地图</p>
                <div className="flex items-center gap-1 mt-2">
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-cyan-100 text-cyan-600 font-medium">双人</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-600 font-medium">对战</span>
                </div>
              </div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={`shrink-0 ${gt.sub} group-hover:translate-x-1 transition-transform`}><path d="m9 18 6-6-6-6"/></svg>
            </div>
          </button>
          <button onClick={() => switchGame('tetris-solo')} className={`group relative overflow-hidden rounded-2xl p-5 text-left transition-all active:scale-[0.98] shadow-lg ${gt.border} border ${gt.card}`}>
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-emerald-400/20 to-transparent rounded-bl-full" />
            <div className="relative flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md shrink-0">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="8" height="8" rx="1.5" fill="white" opacity="0.9"/><rect x="14" y="2" width="8" height="8" rx="1.5" fill="white" opacity="0.6"/><rect x="2" y="14" width="8" height="8" rx="1.5" fill="white" opacity="0.6"/><rect x="14" y="14" width="8" height="8" rx="1.5" fill="white" opacity="0.3"/></svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className={`text-base font-black ${gt.title}`}>俄罗斯方块</h3>
                <p className={`text-[11px] ${gt.sub} mt-0.5`}>经典单机模式，挑战最高分</p>
                <div className="flex items-center gap-1 mt-2">
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-600 font-medium">单人</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-600 font-medium">经典</span>
                </div>
              </div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={`shrink-0 ${gt.sub} group-hover:translate-x-1 transition-transform`}><path d="m9 18 6-6-6-6"/></svg>
            </div>
          </button>
          <button onClick={() => switchGame('tetris-handheld')} className={`group relative overflow-hidden rounded-2xl p-5 text-left transition-all active:scale-[0.98] shadow-lg ${gt.border} border ${gt.card}`}>
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-yellow-400/20 to-transparent rounded-bl-full" />
            <div className="relative flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center shadow-md shrink-0">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="3" fill="white" opacity="0.9"/><rect x="6" y="8" width="12" height="8" rx="1" fill="#d4a017" opacity="0.7"/><circle cx="12" cy="12" r="2" fill="white" opacity="0.5"/></svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className={`text-base font-black ${gt.title}`}>俄罗斯方块掌机</h3>
                <p className={`text-[11px] ${gt.sub} mt-0.5`}>掌机复刻版，经典绿屏体验</p>
                <div className="flex items-center gap-1 mt-2">
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-600 font-medium">单人</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-lime-100 text-lime-600 font-medium">怀旧</span>
                </div>
              </div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={`shrink-0 ${gt.sub} group-hover:translate-x-1 transition-transform`}><path d="m9 18 6-6-6-6"/></svg>
            </div>
          </button>
          <button onClick={() => switchGame('witchpoison')} className={`group relative overflow-hidden rounded-2xl p-5 text-left transition-all active:scale-[0.98] shadow-lg ${gt.border} border ${gt.card}`}>
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-purple-400/20 to-transparent rounded-bl-full" />
            <div className="relative flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-md shrink-0">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M10 2h4v4l2 5v7a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-7l2-5z"/><circle cx="12" cy="14" r="1.5" fill="white" opacity="0.5"/></svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className={`text-base font-black ${gt.title}`}>女巫的毒药</h3>
                <p className={`text-[11px] ${gt.sub} mt-0.5`}>翻牌冒险，避开毒药寻找宝藏</p>
                <div className="flex items-center gap-1 mt-2">
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-600 font-medium">单人</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-600 font-medium">策略</span>
                </div>
              </div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={`shrink-0 ${gt.sub} group-hover:translate-x-1 transition-transform`}><path d="m9 18 6-6-6-6"/></svg>
            </div>
          </button>
          <button onClick={() => switchGame('mario')} className={`group relative overflow-hidden rounded-2xl p-5 text-left transition-all active:scale-[0.98] shadow-lg ${gt.border} border ${gt.card}`}>
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-red-400/20 to-transparent rounded-bl-full" />
            <div className="relative flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-amber-500 flex items-center justify-center shadow-md shrink-0">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><rect x="4" y="8" width="16" height="12" rx="2"/><circle cx="8" cy="6" r="2" fill="white"/><circle cx="16" cy="6" r="2" fill="white"/><path d="M5 14h14"/></svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className={`text-base font-black ${gt.title}`}>超级马里奥</h3>
                <p className={`text-[11px] ${gt.sub} mt-0.5`}>经典1-1关卡，冒险闯关跳跃</p>
                <div className="flex items-center gap-1 mt-2">
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 font-medium">单人</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-600 font-medium">经典</span>
                </div>
              </div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={`shrink-0 ${gt.sub} group-hover:translate-x-1 transition-transform`}><path d="m9 18 6-6-6-6"/></svg>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default GamesTab;
